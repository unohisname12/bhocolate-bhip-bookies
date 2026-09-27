/**
 * Class rivals: persistent computer opponents that remember each student across matches.
 * They hold grudges (who escaped, where they hid), adapt to repeated tricks, climb ranks when
 * they win, carry scars when they lose, and taunt from reviewed templates that reference real history.
 *
 * Fairness rules: adaptation and rank are capped so a rival stays beatable, and mastering the
 * rival's weakness skill always takes the edge back. Taunts target the pet, never the child.
 */
export type Vec = { x: number; y: number };
export const RIVAL_SPECIES = ['bramble_hedgehog', 'moss_turtle', 'luna_owl', 'ripple_otter', 'zephyr_dragon'] as const;
export type RivalSpecies = typeof RIVAL_SPECIES[number];
const TITLES = ['Sentinel', 'Warden', 'Stalker', 'Marshal', 'Shadow'] as const;
const BASE_NAMES: Record<RivalSpecies, string> = { bramble_hedgehog: 'Bramble', moss_turtle: 'Moss', luna_owl: 'Luna', ripple_otter: 'Ripple', zephyr_dragon: 'Zephyr' };
export const SCARS = { singed: 'Singed', muddy: 'Muddy', dizzy: 'Dizzy', patched: 'Patched', frosty: 'Frosty' } as const;
export type ScarKind = keyof typeof SCARS;
export const RANKS = ['Rookie', 'Scout', 'Hunter', 'Elite', 'Legend'] as const;

export interface Hotspot extends Vec { weight: number }
export interface Grudge {
  studentId: string; petName: string; encounters: number; caught: number; escaped: number;
  lastOutcome: 'caught' | 'escaped' | 'survived'; lastAt: number;
  /** Where this student tends to be found or hide, per arena. Quantized to a coarse grid. */
  hotspots: Record<string, Hotspot[]>;
  favoriteKit?: string;
}
export interface Adaptations { decoyResistance: number; hearing: number; beaconWatch: number }
export interface Rival {
  id: string; name: string; species: RivalSpecies; weakness: string;
  rank: number; wins: number; losses: number; streak: number;
  scars: { kind: ScarKind; by: string; at: number }[];
  adaptations: Adaptations; grudges: Grudge[]; taunted: { key: string; at: number }[];
}
export interface StudentResult {
  studentId: string; petName: string; caught: boolean; escaped: boolean;
  /** Places the rival spotted or caught this student. */
  spots: Vec[]; kit?: string; fooledByDecoy?: boolean; sneakedPast?: boolean; usedBeacons?: number;
}
export interface MatchResult { arenaId: string; hunterWon: boolean; students: StudentResult[] }

export const LIMITS = { grudges: 40, hotspots: 6, scars: 4, taunted: 30, rank: 5 } as const;
const ADAPT_STEP = 0.08, ADAPT_MAX = 0.6, ADAPT_DECAY = 0.02, CELL = 80, RANK_UP_STREAK = 3;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

export function createRival(index: number, weakness: string): Rival {
  const species = RIVAL_SPECIES[index % RIVAL_SPECIES.length];
  return { id: `rival-${index}`, name: `${BASE_NAMES[species]} ${TITLES[index % TITLES.length]}`, species, weakness,
    rank: 1, wins: 0, losses: 0, streak: 0, scars: [], adaptations: { decoyResistance: 0, hearing: 0, beaconWatch: 0 }, grudges: [], taunted: [] };
}

/** Display name carries the most recent scar, like "Singed Bramble Sentinel". */
export const rivalTitle = (r: Rival) => `${r.scars.length ? `${SCARS[r.scars[r.scars.length - 1].kind]} ` : ''}${r.name}`;
export const rankName = (r: Rival) => RANKS[clamp(r.rank, 1, LIMITS.rank) - 1];

function addHotspots(existing: Hotspot[] = [], spots: Vec[]): Hotspot[] {
  let out = existing.map(h => ({ ...h, weight: round(h.weight * 0.85) }));
  for (const s of spots) {
    const x = Math.round(s.x / CELL) * CELL, y = Math.round(s.y / CELL) * CELL;
    const hit = out.find(h => h.x === x && h.y === y);
    out = hit ? out.map(h => h === hit ? { ...h, weight: round(h.weight + 1) } : h) : [...out, { x, y, weight: 1 }];
  }
  return out.filter(h => h.weight >= 0.2).sort((a, b) => b.weight - a.weight).slice(0, LIMITS.hotspots);
}

const SCAR_FOR = (s: StudentResult): ScarKind => s.fooledByDecoy ? 'dizzy' : s.sneakedPast ? 'muddy' : (s.usedBeacons ?? 0) >= 2 ? 'singed' : s.kit === 'helper' ? 'patched' : 'frosty';

export function recordMatch(rival: Rival, match: MatchResult, now: number): Rival {
  let r: Rival = { ...rival, adaptations: { ...rival.adaptations } };
  // Old lessons fade a little every match, so a trick that stopped being used stops being countered.
  for (const k of Object.keys(r.adaptations) as (keyof Adaptations)[]) r.adaptations[k] = round(clamp(r.adaptations[k] - ADAPT_DECAY, 0, ADAPT_MAX));
  for (const s of match.students) {
    const old = r.grudges.find(g => g.studentId === s.studentId);
    const g: Grudge = {
      studentId: s.studentId, petName: s.petName, encounters: (old?.encounters ?? 0) + 1,
      caught: (old?.caught ?? 0) + (s.caught ? 1 : 0), escaped: (old?.escaped ?? 0) + (s.escaped ? 1 : 0),
      lastOutcome: s.caught ? 'caught' : s.escaped ? 'escaped' : 'survived', lastAt: now,
      hotspots: { ...old?.hotspots, [match.arenaId]: addHotspots(old?.hotspots[match.arenaId], s.spots) },
      ...(s.kit ?? old?.favoriteKit ? { favoriteKit: s.kit ?? old?.favoriteKit } : {}),
    };
    r.grudges = [g, ...r.grudges.filter(x => x.studentId !== s.studentId)].slice(0, LIMITS.grudges);
    if (!s.caught) {
      if (s.fooledByDecoy) r.adaptations.decoyResistance = round(clamp(r.adaptations.decoyResistance + ADAPT_STEP, 0, ADAPT_MAX));
      if (s.sneakedPast) r.adaptations.hearing = round(clamp(r.adaptations.hearing + ADAPT_STEP, 0, ADAPT_MAX));
      if ((s.usedBeacons ?? 0) >= 2) r.adaptations.beaconWatch = round(clamp(r.adaptations.beaconWatch + ADAPT_STEP, 0, ADAPT_MAX));
    }
  }
  if (match.hunterWon) {
    const streak = Math.max(0, r.streak) + 1;
    r = { ...r, wins: r.wins + 1, streak, rank: streak % RANK_UP_STREAK === 0 ? Math.min(LIMITS.rank, r.rank + 1) : r.rank };
  } else {
    const hero = match.students.find(s => s.escaped) ?? match.students[0];
    const scar = hero ? [{ kind: SCAR_FOR(hero), by: hero.petName, at: now }] : [];
    r = { ...r, losses: r.losses + 1, streak: Math.min(0, r.streak) - 1, rank: Math.max(1, r.rank - (r.streak <= -1 ? 1 : 0)), scars: [...r.scars, ...scar].slice(-LIMITS.scars) };
  }
  return r;
}

/** Where to look first: the present students' remembered hotspots in this arena, strongest first. */
export function searchPlan(rival: Rival, arenaId: string, studentIds: string[]): Hotspot[] {
  const all = rival.grudges.filter(g => studentIds.includes(g.studentId)).flatMap(g => g.hotspots[arenaId] ?? []);
  const merged = new Map<string, Hotspot>();
  for (const h of all) { const k = `${h.x},${h.y}`; const m = merged.get(k); merged.set(k, { ...h, weight: round((m?.weight ?? 0) + h.weight) }); }
  return Array.from(merged.values()).sort((a, b) => b.weight - a.weight).slice(0, LIMITS.hotspots);
}

/**
 * The rival's overall edge in a match, as a multiplier on its speed/aim. Rank adds a little;
 * a class that has mastered the rival's weakness skill takes most of it back. Always within [0.85, 1.2].
 */
export function rivalEdge(rival: Rival, masteredTopics: string[]): number {
  const weakened = masteredTopics.some(t => t.toLowerCase() === rival.weakness.toLowerCase());
  return round(clamp(1 + (rival.rank - 1) * 0.05 - (weakened ? 0.15 : 0), 0.85, 1.2));
}

// Taunts: playful, about the pets and the chase, never about the child. Tested for tone.
type TauntMoment = 'intro' | 'spotted' | 'caught' | 'escaped' | 'won' | 'lost';
export interface Taunt { key: string; text: string }
/** `petName` covers a first meeting, before the rival has any grudge on record for that student. */
export function taunt(rival: Rival, moment: TauntMoment, studentId: string | null, pick = 0, petName?: string): Taunt | undefined {
  const g = studentId ? rival.grudges.find(x => x.studentId === studentId) : undefined, me = rivalTitle(rival), pet = g?.petName ?? petName;
  const scar = rival.scars[rival.scars.length - 1];
  const lines: [string, string][] = [];
  const push = (key: string, text: string | false | undefined) => { if (text) lines.push([key, text]); };
  if (moment === 'intro') {
    push(`intro-scar:${scar?.at}`, scar && `${me} is back. ${scar.by} gave me this ${SCARS[scar.kind].toLowerCase()} look last time. Not again.`);
    push(`intro-rank:${rival.rank}`, rival.rank >= 3 && `${me}, ${rankName(rival)} rank. ${rival.wins} catches and counting.`);
    push('intro', `${me} is on the hunt. Hide well, pets!`);
  }
  if (moment === 'spotted' && pet) {
    push(`spotted-habit:${studentId}`, !!g && g.caught >= 2 && `Found you, ${pet}! Same bush as always?`);
    push(`spotted:${studentId}`, `I see you, ${pet}!`);
  }
  if (moment === 'caught' && pet) push(`caught:${studentId}:${g?.caught ?? 0}`, g && g.escaped > g.caught ? `Finally got you, ${pet}! That’s one back for me.` : g ? `Tagged, ${pet}! Good run though.` : `Nice to meet you, ${pet}. Tagged!`);
  if (moment === 'escaped' && pet) push(`escaped:${studentId}:${g?.escaped ?? 0}`, g && g.escaped >= 2 ? `${pet} escaped AGAIN? I’m writing that down.` : `${pet} slipped away! Next time…`);
  if (moment === 'won') push(`won:${rival.wins}`, rival.streak >= 2 ? `${rival.streak} wins in a row! Better practice, pets.` : 'Good hunt, everyone. Rematch anytime!');
  if (moment === 'lost') push(`lost:${rival.losses}`, rival.adaptations.decoyResistance >= 0.3 ? 'Outsmarted again! I’ll be ready for those decoys.' : 'You got me! Well played, pets.');
  const open = lines.filter(([key]) => !rival.taunted.some(t => t.key === key));
  const chosen = open[Math.min(open.length - 1, Math.floor(pick * open.length))] ?? lines[lines.length - 1];
  return chosen && { key: chosen[0], text: chosen[1] };
}
export const markTaunted = (r: Rival, key: string, now: number): Rival => ({ ...r, taunted: [{ key, at: now }, ...r.taunted.filter(t => t.key !== key)].slice(0, LIMITS.taunted) });

export function validRival(value: unknown): value is Rival {
  if (!value || typeof value !== 'object') return false;
  const r = value as Rival, n = (x: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
  const s = (x: unknown, max = 80) => typeof x === 'string' && x.length > 0 && x.length <= max;
  return s(r.id) && s(r.name) && RIVAL_SPECIES.includes(r.species) && s(r.weakness) && n(r.rank, 1, LIMITS.rank) && n(r.wins) && n(r.losses) && n(r.streak, -1e6, 1e6)
    && Array.isArray(r.scars) && r.scars.length <= LIMITS.scars && r.scars.every(x => x && x.kind in SCARS && s(x.by, 40) && n(x.at))
    && !!r.adaptations && (['decoyResistance', 'hearing', 'beaconWatch'] as const).every(k => n(r.adaptations[k], 0, ADAPT_MAX))
    && Array.isArray(r.grudges) && r.grudges.length <= LIMITS.grudges && r.grudges.every(g => g && s(g.studentId) && s(g.petName, 40) && n(g.encounters) && n(g.caught) && n(g.escaped) && n(g.lastAt)
      && !!g.hotspots && Object.values(g.hotspots).every(hs => Array.isArray(hs) && hs.length <= LIMITS.hotspots && hs.every(h => h && n(h.x, 0, 5000) && n(h.y, 0, 5000) && n(h.weight, 0, 1000))))
    && Array.isArray(r.taunted) && r.taunted.length <= LIMITS.taunted;
}
