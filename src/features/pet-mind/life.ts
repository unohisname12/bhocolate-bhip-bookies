import type { EngineState } from '../../types/engine';
import type { Pet } from '../../types/pet';
import { createMind, type PetMind } from './memory';

/**
 * Long-term life memory: what happened between this pet and this learner, across days.
 * Working episodes fade; the important ones are promoted to core memories at each day rollover.
 * Everything is bounded so the save stays small and schema-valid.
 */
export const EPISODE_KINDS = ['hatched','fed','care','math','mastered','battle_won','battle_lost','evolved','trophy','reunion','streak','hatchday','together','gift'] as const;
export type EpisodeKind = typeof EPISODE_KINDS[number];
export type Tone = 'good' | 'proud' | 'cozy' | 'tough';
export interface Episode { id: string; kind: EpisodeKind; at: number; subject?: string; tone: Tone; weight: number; count: number; first?: boolean }
export interface Tally { [key: string]: number }
export interface Said { key: string; at: number }
export interface TraitDrift { curiosity: number; playfulness: number; sociability: number; quiet: number; nature: number; comfort: number }
// Keepsakes the pet "finds" for its shelf. Cosmetic memories only: no currency, so they cannot distort the economy.
export const TREASURES = {
  leaf: { icon: '🍂', name: 'crunchy golden leaf' }, pebble: { icon: '🪨', name: 'shiny smooth pebble' }, feather: { icon: '🪶', name: 'soft blue feather' },
  acorn: { icon: '🌰', name: 'perfect little acorn' }, shell: { icon: '🐚', name: 'swirly shell' }, button: { icon: '🔘', name: 'lost silver button' },
  flower: { icon: '🌼', name: 'pressed yellow flower' }, marble: { icon: '🔮', name: 'glowing marble' }, drawing: { icon: '🖍️', name: 'drawing of you and me' },
  star: { icon: '⭐', name: 'paper star' }, key: { icon: '🗝️', name: 'tiny mystery key' }, clover: { icon: '🍀', name: 'four-leaf clover' },
} as const;
export type TreasureId = keyof typeof TREASURES;
export interface Treasure { id: TreasureId; at: number }
export interface PetLife {
  version: 1;
  treasures?: Treasure[];
  episodes: Episode[]; core: Episode[];
  tallies: Tally; today: Tally; firsts: string[];
  visit: { lastSeen: number; lastDay: string; streak: number; days: number };
  drift: TraitDrift; said: Said[];
}
export type Traits = PetMind['traits'];

export const LIMITS = { episodes: 40, core: 12, tallies: 80, today: 40, firsts: 60, said: 40 } as const;
// About one keepsake a week for an average pet on care days, so each one feels like an event.
const GIFT_BASE = 0.08, GIFT_CURIOSITY = 0.14;
const MERGE_MS = 10 * 60000, DRIFT_STEP = 0.004, DRIFT_MAX = 0.25, DRIFT_DAILY_REPEATS = 5, PROMOTE_AT = 70;
const STREAKS = [3, 5, 7, 10, 14, 21, 30, 50, 100];
const HATCH_DAYS = [7, 30, 60, 100, 180, 365];

export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayNumber = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const daysBetween = (a: string, b: string) => dayNumber(b) - dayNumber(a);

export function createLife(now: number): PetLife {
  return { version: 1, episodes: [], core: [], tallies: {}, today: {}, firsts: [],
    visit: { lastSeen: now, lastDay: dayKey(now), streak: 1, days: 1 },
    drift: { curiosity: 0, playfulness: 0, sociability: 0, quiet: 0, nature: 0, comfort: 0 }, said: [] };
}

/** Recover the known hatch date, without inventing previous visits or activities. */
export function visitPet(pet: Pet, now: number): Pet {
  const mind = pet.mind ?? createMind(pet);
  let life = mind.life ?? createLife(now);
  const hatchAt = Date.parse(pet.timestamps.createdAt);
  if (!life.firsts.includes('hatched:') && ![...life.episodes, ...life.core].some(e => e.kind === 'hatched') && Number.isFinite(hatchAt) && hatchAt <= now) {
    life = recordEpisode(life, 'hatched', hatchAt);
  }
  life = rollover(life, pet, now);
  return { ...pet, mind: { ...mind, life } };
}

const bump = (t: Tally, key: string, by = 1, cap: number = LIMITS.tallies): Tally => {
  const next = { ...t, [key]: (t[key] ?? 0) + by };
  const keys = Object.keys(next);
  if (keys.length > cap) { const smallest = keys.filter(k => k !== key).sort((a, b) => next[a] - next[b])[0]; delete next[smallest]; }
  return next;
};

// Which personality trait an experience nudges. Kept small: a pet becomes who it was raised to be over weeks.
const DRIFT_FROM: Partial<Record<string, keyof TraitDrift>> = {
  'care:play': 'playfulness', 'care:fetch': 'playfulness', 'care:dance': 'playfulness',
  'care:comfort': 'comfort', 'care:pet': 'comfort', 'care:cuddle': 'comfort', 'care:brush': 'comfort',
  'preference:plants': 'nature', 'preference:books': 'quiet', 'preference:toys': 'playfulness',
  'care:chat': 'sociability', 'battle': 'sociability',
  'care:train': 'curiosity', 'math': 'curiosity', 'care:visit': 'curiosity',
  'care:wash': 'quiet', 'care:clean': 'quiet', 'care:rest': 'quiet',
  'food:apple': 'nature', 'food:berry': 'nature', 'food:carrot': 'nature', 'food:honey': 'nature',
};

export function effectiveTraits(base: Traits, life?: PetLife): Traits {
  if (!life) return base;
  const out = { ...base };
  for (const k of Object.keys(out) as (keyof Traits)[]) out[k] = Math.max(0, Math.min(1, base[k] + life.drift[k]));
  return out;
}

function drift(life: PetLife, source: string): PetLife {
  const trait = DRIFT_FROM[source];
  if (!trait || (life.today[`drift:${source}`] ?? 0) >= DRIFT_DAILY_REPEATS) return life;
  const value = Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, life.drift[trait] + DRIFT_STEP));
  return { ...life, drift: { ...life.drift, [trait]: Math.round(value * 10000) / 10000 }, today: bump(life.today, `drift:${source}`, 1, LIMITS.today) };
}

const BASE_WEIGHT: Record<EpisodeKind, number> = { gift: 50, hatched: 95, fed: 25, care: 25, math: 20, mastered: 85, battle_won: 55, battle_lost: 35, evolved: 95, trophy: 70, reunion: 60, streak: 65, hatchday: 80, together: 30 };
const TONE: Record<EpisodeKind, Tone> = { gift: 'cozy', hatched: 'proud', fed: 'cozy', care: 'cozy', math: 'proud', mastered: 'proud', battle_won: 'proud', battle_lost: 'tough', evolved: 'proud', trophy: 'proud', reunion: 'good', streak: 'good', hatchday: 'good', together: 'cozy' };
const FIRST_KINDS: EpisodeKind[] = ['hatched', 'fed', 'care', 'math', 'mastered', 'battle_won', 'evolved', 'trophy'];

export function recordEpisode(life: PetLife, kind: EpisodeKind, now: number, subject?: string): PetLife {
  const firstKey = `${kind}:${subject ?? ''}`, first = FIRST_KINDS.includes(kind) && !life.firsts.includes(firstKey);
  const recent = life.episodes.find(e => e.kind === kind && e.subject === subject && now - e.at < MERGE_MS);
  let episodes: Episode[];
  if (recent && !first) episodes = life.episodes.map(e => e === recent ? { ...e, at: now, count: Math.min(99, e.count + 1), weight: Math.min(100, e.weight + 3) } : e);
  else {
    const e: Episode = { id: `${kind}-${now.toString(36)}-${life.episodes.length}`, kind, at: now, tone: TONE[kind], weight: Math.min(100, BASE_WEIGHT[kind] + (first ? 40 : 0)), count: 1, ...(subject ? { subject } : {}), ...(first ? { first: true } : {}) };
    episodes = [e, ...life.episodes].slice(0, LIMITS.episodes);
  }
  return { ...life, episodes, firsts: first ? [...life.firsts, firstKey].slice(-LIMITS.firsts) : life.firsts };
}

/** Runs once per new calendar day: absence, streaks, anniversaries, then memory consolidation. */
export function rollover(life: PetLife, pet: Pick<Pet, 'timestamps'>, now: number): PetLife {
  const today = dayKey(now);
  if (today === life.visit.lastDay) return { ...life, visit: { ...life.visit, lastSeen: now } };
  const gap = Math.max(1, daysBetween(life.visit.lastDay, today));
  const streak = gap === 1 ? life.visit.streak + 1 : 1;
  let next: PetLife = { ...life, today: {}, visit: { lastSeen: now, lastDay: today, streak, days: life.visit.days + 1 } };
  if (gap >= 2) next = recordEpisode(next, 'reunion', now, String(gap));
  if (STREAKS.includes(streak)) next = recordEpisode(next, 'streak', now, String(streak));
  const hatched = Date.parse(pet.timestamps.createdAt);
  if (Number.isFinite(hatched)) {
    const age = daysBetween(dayKey(hatched), today);
    if (HATCH_DAYS.includes(age)) next = recordEpisode(next, 'hatchday', now, String(age));
  }
  return consolidate(next);
}

export function consolidate(life: PetLife): PetLife {
  const promote = life.episodes.filter(e => (e.weight >= PROMOTE_AT || e.first) && !life.core.some(c => c.id === e.id));
  // Firsts outrank ordinary big moments so "the first time" is never forgotten.
  const rank = (e: Episode) => e.weight + (e.first ? 30 : 0);
  const core = [...life.core, ...promote].sort((a, b) => rank(b) - rank(a) || b.at - a.at).slice(0, LIMITS.core);
  const episodes = life.episodes.map(e => ({ ...e, weight: Math.round(e.weight * 0.8) })).filter(e => e.weight >= 10 || e.first);
  return { ...life, core, episodes };
}

const newEvents = (before: EngineState, after: EngineState) => {
  if (after.events === before.events) return [];
  const seen = new Set(before.events.slice(-20).map(e => e.id));
  return after.events.slice(-10).filter(e => !seen.has(e.id));
};

/** Observe what just happened (events, learning evidence, reviews) and fold it into the life memory. */
export function observeLife(before: EngineState, after: EngineState, now = Date.now()): EngineState {
  const pet = after.pet;
  if (!pet || pet.state === 'dead' || after.mode !== 'normal') return after;
  const events = newEvents(before, after);
  if (before.pet?.id !== pet.id) return events.some(e => e.type === 'pet_hatched') ? { ...after, pet: visitPet(pet, now) } : after;
  const shared = (pet.mind?.memories ?? []).filter(m => ['cuddle', 'chat', 'dance', 'fetch'].includes(m.kind) && !(before.pet?.mind?.memories ?? []).some(b => b.kind === m.kind && b.objectId === m.objectId && b.at === m.at));
  const evidence = after.learningEvidence === before.learningEvidence ? [] : (after.learningEvidence ?? []).filter(r => !(before.learningEvidence ?? []).some(b => b.questionId === r.questionId && b.attempts === r.attempts));
  const mastered = after.skillReviews === before.skillReviews ? [] : (after.skillReviews ?? []).filter(r => r.independentChecks >= 2 && !(before.skillReviews ?? []).some(b => b.skillId === r.skillId && b.independentChecks >= 2));
  const mind = pet.mind, existing = mind?.life;
  const newDay = !existing || existing.visit.lastDay !== dayKey(now);
  const happened = events.length || evidence.length || mastered.length || shared.length;
  // A rejected action changes nothing, and a pet only starts a life record once something real happens.
  if (after === before || (!happened && (!newDay || !existing))) return after;
  let life = rollover(existing ?? createLife(now), pet, now);
  for (const m of shared) {
    const source = m.kind === 'chat' && m.objectId ? `preference:${m.objectId}` : `care:${m.kind}`;
    // Repeated clicking cannot inflate a favorite indefinitely in one sitting.
    const cap = m.objectId ? 1 : 5;
    if ((life.today[source] ?? 0) >= cap) continue;
    life = recordEpisode(life, 'together', now, m.objectId ?? m.kind);
    life = { ...life, tallies: bump(life.tallies, source), today: bump(life.today, source, 1, LIMITS.today) };
    life = drift(life, source);
  }
  const hour = new Date(now).getHours();
  for (const e of events) {
    const p = e.payload ?? {};
    if (e.type === 'pet_fed') { const food = typeof p.foodId === 'string' ? p.foodId : 'snack'; life = recordEpisode(life, 'fed', now, food); life = { ...life, tallies: bump(life.tallies, `food:${food}`) }; life = drift(life, `food:${food}`); }
    else if (e.type === 'care_game_complete' && typeof p.mode === 'string') { life = recordEpisode(life, 'care', now, p.mode); life = { ...life, tallies: bump(life.tallies, `care:${p.mode}`) }; life = drift(life, `care:${p.mode}`); }
    else if (e.type === 'pet_played_with' || e.type === 'pet_cleaned') { const mode = e.type === 'pet_played_with' ? 'play' : 'clean'; life = recordEpisode(life, 'care', now, mode); life = { ...life, tallies: bump(life.tallies, `care:${mode}`) }; life = drift(life, `care:${mode}`); }
    else if (e.type === 'battle_won' || e.type === 'pvp_battle_won') { life = recordEpisode(life, 'battle_won', now); life = { ...life, tallies: bump(life.tallies, 'battle:won') }; life = drift(life, 'battle'); }
    else if (e.type === 'battle_lost' || e.type === 'pvp_battle_lost') { life = recordEpisode(life, 'battle_lost', now); life = { ...life, tallies: bump(life.tallies, 'battle:lost') }; }
    else if (e.type === 'pet_evolved') life = recordEpisode(life, 'evolved', now, typeof p.stage === 'string' ? p.stage : undefined);
    else if (e.type === 'pet_hatched') life = recordEpisode(life, 'hatched', now);
    else if (e.type === 'trophy_earned') life = recordEpisode(life, 'trophy', now);
    life = { ...life, tallies: bump(life.tallies, `hour:${hour}`) };
  }
  for (const r of evidence) {
    // Misses are only ever used later to celebrate growth, never to remind a learner of a mistake.
    if (r.correct && r.firstAttemptCorrect && !r.answerRevealed) { life = recordEpisode(life, 'math', now, r.topic); life = { ...life, tallies: bump(life.tallies, `math:${r.topic}`) }; life = drift(life, 'math'); }
    else if (r.attempts > 0) life = { ...life, tallies: bump(life.tallies, `tricky:${r.topic}`) };
  }
  for (const r of mastered) life = recordEpisode(life, 'mastered', now, r.topic);
  const nextMind = { ...(mind ?? createMind(pet)), life };
  if (events.some(e => e.type === 'pet_fed' || e.type === 'care_game_complete' || e.type === 'pet_played_with' || e.type === 'pet_cleaned')) nextMind.life = findTreasure(nextMind.life, pet.id, effectiveTraits(nextMind.traits, nextMind.life).curiosity, now);
  return { ...after, pet: { ...pet, mind: nextMind } };
}

/** What the pet has learned about this learner, derived on demand so it never goes stale in the save. */
export interface KidModel { favoriteFood?: string; favoriteCare?: string; usualHour?: number; masteredTopics: string[]; growthTopics: string[]; wins: number; losses: number; streak: number; days: number; rivals: { name: string; wins: number; losses: number }[] }
const top = (t: Tally, prefix: string, min: number) => {
  const best = Object.entries(t).filter(([k, v]) => k.startsWith(prefix) && v >= min).sort((a, b) => b[1] - a[1])[0];
  return best?.[0].slice(prefix.length);
};
export type LearnerFacts = Partial<Pick<EngineState, 'skillReviews' | 'matchHistory'>>;
export function kidModel(state: LearnerFacts, life: PetLife): KidModel {
  const masteredTopics = Array.from(new Set((state.skillReviews ?? []).filter(r => r.independentChecks >= 2).map(r => r.topic)));
  const rivals = new Map<string, { name: string; wins: number; losses: number }>();
  for (const m of state.matchHistory ?? []) {
    const r = rivals.get(m.opponentPetName) ?? { name: m.opponentPetName, wins: 0, losses: 0 };
    if (m.outcome === 'win') r.wins++; else if (m.outcome === 'loss') r.losses++;
    rivals.set(m.opponentPetName, r);
  }
  const hour = top(life.tallies, 'hour:', 4);
  return {
    favoriteFood: top(life.tallies, 'food:', 3), favoriteCare: top(life.tallies, 'care:', 3), usualHour: hour === undefined ? undefined : Number(hour),
    masteredTopics, growthTopics: masteredTopics.filter(t => (life.tallies[`tricky:${t}`] ?? 0) >= 2),
    wins: life.tallies['battle:won'] ?? 0, losses: life.tallies['battle:lost'] ?? 0, streak: life.visit.streak, days: life.visit.days,
    rivals: Array.from(rivals.values()).sort((a, b) => b.wins + b.losses - a.wins - a.losses).slice(0, 5),
  };
}

export function markSaid(life: PetLife, key: string, now: number): PetLife {
  return { ...life, said: [{ key, at: now }, ...life.said.filter(s => s.key !== key && now - s.at < 30 * 86400000)].slice(0, LIMITS.said) };
}

export function validLife(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const l = value as PetLife, num = (x: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
  const str = (x: unknown, max = 80) => typeof x === 'string' && x.length > 0 && x.length <= max;
  const ep = (e: Episode) => !!e && str(e.id) && EPISODE_KINDS.includes(e.kind) && num(e.at) && num(e.weight, 0, 100) && num(e.count, 1, 99) && (e.subject === undefined || str(e.subject));
  const tally = (t: Tally, max: number) => !!t && typeof t === 'object' && Object.keys(t).length <= max && Object.entries(t).every(([k, v]) => str(k) && num(v));
  return l.version === 1 && Array.isArray(l.episodes) && l.episodes.length <= LIMITS.episodes && l.episodes.every(ep)
    && Array.isArray(l.core) && l.core.length <= LIMITS.core && l.core.every(ep)
    && tally(l.tallies, LIMITS.tallies) && tally(l.today, LIMITS.today) && Array.isArray(l.firsts) && l.firsts.length <= LIMITS.firsts && l.firsts.every(f => str(f))
    && !!l.visit && num(l.visit.lastSeen) && /^\d{4}-\d{2}-\d{2}$/.test(l.visit.lastDay) && num(l.visit.streak, 1) && num(l.visit.days, 1)
    && !!l.drift && Object.values(l.drift).every(v => num(v, -DRIFT_MAX, DRIFT_MAX)) && Object.keys(l.drift).length === 6
    && (l.treasures === undefined || (Array.isArray(l.treasures) && l.treasures.length <= Object.keys(TREASURES).length && l.treasures.every(t => !!t && t.id in TREASURES && num(t.at))))
    && Array.isArray(l.said) && l.said.length <= LIMITS.said && l.said.every(s => !!s && str(s.key, 120) && num(s.at));
}

// FNV-1a plus a murmur3 finalizer: near-identical strings (same pet, consecutive days) must still spread evenly.
const hash = (text: string) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** At most one keepsake a day, only after real care, more often for curious pets. Deterministic per pet and day. */
export function findTreasure(life: PetLife, petId: string, curiosity: number, now: number): PetLife {
  const today = dayKey(now), owned = life.treasures ?? [];
  if (life.today.gift || hash(`${petId}:${today}`) >= GIFT_BASE + curiosity * GIFT_CURIOSITY) return life;
  const ids = Object.keys(TREASURES) as TreasureId[], start = Math.floor(hash(`${today}:${petId}:pick`) * ids.length);
  const id = [...ids.slice(start), ...ids.slice(0, start)].find(t => !owned.some(o => o.id === t));
  if (!id) return life;
  const next = recordEpisode({ ...life, today: bump(life.today, 'gift', 1, LIMITS.today), treasures: [...owned, { id, at: now }] }, 'gift', now, id);
  return next;
}

export type Mood = 'excited' | 'cuddly' | 'sleepy' | 'proud' | 'content';
/** Short-term mood from the last few hours and the clock; it colors behavior, never needs or rewards. */
export function petMood(life: PetLife | undefined, now: number): Mood {
  if (!life) return 'content';
  const within = (kind: EpisodeKind, ms: number) => life.episodes.some(e => e.kind === kind && now - e.at >= 0 && now - e.at < ms);
  if (within('reunion', 6 * 3600000)) return 'cuddly';
  if (within('evolved', 86400000)) return 'proud';
  if (within('battle_won', 2 * 3600000) || within('mastered', 2 * 3600000) || within('gift', 3600000)) return 'excited';
  const hour = new Date(now).getHours();
  return hour >= 20 || hour < 7 ? 'sleepy' : 'content';
}
