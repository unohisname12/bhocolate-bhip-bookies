import type { Arena, Rect, Vec } from './model';

/**
 * Procedural arenas. Server and every client rebuild the same layout from (theme, seed), so a match
 * only ever sends one number instead of the whole map on every tick.
 *
 * Layout: runners start at the bottom, the gate sits on the far top edge, the hunter starts in the
 * middle. Walled buildings with doorways give rooms to explore, loose walls break sight lines, bushes
 * give hiding places, and 7 beacons are spread so a team has to travel. Every layout is checked for
 * reachability before it is used.
 */
export const MAP_W = 2240, MAP_H = 1440, BEACON_COUNT = 7;
const WALL = 36, DOOR = 120, CELL = 40, PAD = 60;

/** What an obstacle is, so the renderer draws the right art at its real size. Collision uses the same rect. */
export type PieceKind = 'wall_h' | 'wall_v' | 'shelf' | 'table' | 'workbench' | 'crate' | 'barrel' | 'hedge_h' | 'hedge_v' | 'bench' | 'pond' | 'flowerbed' | 'planter' | 'potting' | 'fountain';
export interface Piece extends Rect { kind: PieceKind }
/** Floor footprint (collision) of each furniture kind, in world pixels; the sprite rises above it. */
export const FOOTPRINT: Record<Exclude<PieceKind, 'wall_h' | 'wall_v' | 'hedge_h' | 'hedge_v'>, { w: number; h: number }> = {
  shelf: { w: 90, h: 40 }, table: { w: 120, h: 56 }, workbench: { w: 150, h: 44 }, crate: { w: 64, h: 48 }, barrel: { w: 52, h: 36 },
  bench: { w: 88, h: 28 }, pond: { w: 250, h: 150 }, flowerbed: { w: 88, h: 36 }, planter: { w: 130, h: 40 }, potting: { w: 130, h: 40 }, fountain: { w: 170, h: 120 },
};
export interface Layout {
  walls: Rect[]; pieces: Piece[]; bushes: Rect[]; beacons: Vec[]; portal: Vec; runnerSpawn: Vec[]; hunterSpawn: Vec;
  /** Hiding spots, paired crawl vents (pets only), cages for caught pets, and an optional locked door with its key. */
  lockers: Vec[]; vents: [Vec, Vec][]; cages: Vec[]; door: Rect | null; key: Vec | null;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const overlap = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (p: Vec, r: Rect, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clearAt = (walls: Rect[], p: Vec, pad: number) => p.x > pad && p.y > pad && p.x < MAP_W - pad && p.y < MAP_H - pad && !walls.some(w => inside(p, w, pad));

/** A hollow building: four wall runs with doorway gaps, so beacons inside must be walked into. */
function building(r: Rect, doors: ('n' | 's' | 'e' | 'w')[], rand: () => number): { walls: Piece[]; gaps: Rect[] } {
  const out: Piece[] = [], gaps: Rect[] = [];
  const run = (side: 'n' | 's' | 'e' | 'w') => {
    const horizontal = side === 'n' || side === 's', len = horizontal ? r.w : r.h;
    const x0 = side === 'e' ? r.x + r.w - WALL : r.x, y0 = side === 's' ? r.y + r.h - WALL : r.y;
    if (!doors.includes(side)) { out.push(horizontal ? { kind: 'wall_h', x: x0, y: y0, w: len, h: WALL } : { kind: 'wall_v', x: x0, y: y0, w: WALL, h: len }); return; }
    const at = WALL + Math.floor(rand() * (len - DOOR - 2 * WALL));
    const a = at, b = len - at - DOOR;
    if (horizontal) { if (a > 0) out.push({ kind: 'wall_h', x: x0, y: y0, w: a, h: WALL }); if (b > 0) out.push({ kind: 'wall_h', x: x0 + at + DOOR, y: y0, w: b, h: WALL }); gaps.push({ x: x0 + at, y: y0, w: DOOR, h: WALL }); }
    else { if (a > 0) out.push({ kind: 'wall_v', x: x0, y: y0, w: WALL, h: a }); if (b > 0) out.push({ kind: 'wall_v', x: x0, y: y0 + at + DOOR, w: WALL, h: b }); gaps.push({ x: x0, y: y0 + at, w: WALL, h: DOOR }); }
  };
  (['n', 's', 'e', 'w'] as const).forEach(run);
  return { walls: out, gaps };
}

/** Every open cell a runner can reach from the start, walking the same grid the bots path on. */
function reachable(walls: Rect[], from: Vec): Set<number> {
  const cols = Math.ceil(MAP_W / CELL), rows = Math.ceil(MAP_H / CELL), key = (x: number, y: number) => y * cols + x;
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && clearAt(walls, { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 }, 24);
  const start = [Math.floor(from.x / CELL), Math.floor(from.y / CELL)], seen = new Set<number>([key(start[0], start[1])]), queue = [start];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (!seen.has(k) && open(nx, ny)) { seen.add(k); queue.push([nx, ny]); } }
  }
  return seen;
}
const cellOf = (p: Vec) => Math.floor(p.y / CELL) * Math.ceil(MAP_W / CELL) + Math.floor(p.x / CELL);

type Purpose = 'library' | 'workshop' | 'storeroom' | 'walled' | 'shed' | 'greenhouse' | 'potting';
const PURPOSES: Record<string, Purpose[]> = { workshop: ['library', 'workshop', 'storeroom', 'library'], garden: ['walled', 'walled', 'shed', 'walled'], moonhouse: ['greenhouse', 'greenhouse', 'potting', 'greenhouse'] };
const snap = (n: number) => Math.round(n / 16) * 16;
const piece = (kind: keyof typeof FOOTPRINT, x: number, y: number): Piece => ({ kind, x: snap(x), y: snap(y), ...FOOTPRINT[kind] });

/**
 * Furnish a room by its purpose: tall pieces against the back wall, working pieces along the front,
 * rows with walkable aisles. Doorways and the centre (where a beacon may stand) always stay clear.
 */
function furnish(r: Rect, gaps: Rect[], purpose: Purpose, rand: () => number): Piece[] {
  const I = { x: r.x + WALL + 8, y: r.y + WALL + 8, w: r.w - 2 * WALL - 16, h: r.h - 2 * WALL - 16 }, center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const out: Piece[] = [];
  const fits = (p: Piece) => p.x >= I.x && p.y >= I.y && p.x + p.w <= I.x + I.w && p.y + p.h <= I.y + I.h
    && !gaps.some(g => overlap(p, g, 50)) && !overlap(p, { x: center.x - 55, y: center.y - 45, w: 110, h: 90 }) && !out.some(o => overlap(p, o, 10));
  const add = (p: Piece) => { if (fits(p)) out.push(p); };
  const row = (kind: keyof typeof FOOTPRINT, y: number, gap = 6) => { const w = FOOTPRINT[kind].w; for (let x = I.x; x + w <= I.x + I.w; x += w + gap) add(piece(kind, x, y)); };
  const corner = (kind: keyof typeof FOOTPRINT, right: boolean, bottom: boolean) => add(piece(kind, right ? I.x + I.w - FOOTPRINT[kind].w : I.x, bottom ? I.y + I.h - FOOTPRINT[kind].h : I.y));
  if (purpose === 'library') { row('shelf', I.y); add(piece('table', I.x + 8, I.y + I.h - FOOTPRINT.table.h - 8)); }
  else if (purpose === 'workshop') { add(piece('workbench', I.x, I.y + I.h - FOOTPRINT.workbench.h)); corner('barrel', true, false); corner('crate', true, true); add(piece('shelf', I.x, I.y)); }
  else if (purpose === 'storeroom') { row('crate', I.y, 10); row('crate', I.y + I.h - FOOTPRINT.crate.h, 10); }
  else if (purpose === 'walled') { row('flowerbed', I.y, 20); add(piece('bench', I.x + I.w / 2 - FOOTPRINT.bench.w / 2 - 120, I.y + I.h - FOOTPRINT.bench.h)); }
  else if (purpose === 'shed') { corner('crate', false, false); corner('barrel', true, false); corner('barrel', false, true); add(piece('workbench', I.x + I.w - FOOTPRINT.workbench.w, I.y + I.h - FOOTPRINT.workbench.h)); }
  else if (purpose === 'greenhouse') { for (let y = I.y; y + FOOTPRINT.planter.h <= I.y + I.h; y += FOOTPRINT.planter.h + 56) row('planter', y, 40); }
  else { row('potting', I.y, 20); corner('barrel', true, true); }
  void rand;
  return out;
}

function attempt(rand: () => number, theme: string): Layout | null {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const portal = { x: Math.round(between(700, 1540)), y: 70 };
  const spawnCenter = { x: Math.round(between(760, 1480)), y: MAP_H - 90 };
  const runnerSpawn = [-1.5, -0.5, 0.5, 1.5].map(i => ({ x: spawnCenter.x + i * 110, y: spawnCenter.y }));
  const hunterSpawn = { x: Math.round(between(900, 1340)), y: Math.round(between(600, 820)) };
  const reserved: Rect[] = [
    { x: portal.x - 150, y: 0, w: 300, h: 220 }, { x: spawnCenter.x - 260, y: MAP_H - 260, w: 520, h: 260 }, { x: hunterSpawn.x - 90, y: hunterSpawn.y - 90, w: 180, h: 180 },
  ];
  const walls: Piece[] = [], rooms: Rect[] = [], roomGaps: Rect[][] = [], purposes = PURPOSES[theme] ?? PURPOSES.workshop;
  const blocked = (r: Rect, gap: number) => reserved.some(v => overlap(r, v, 20)) || rooms.some(v => overlap(r, v, gap)) || walls.some(v => overlap(r, v, gap));
  for (let tries = 0; rooms.length < 4 && tries < 200; tries++) {
    const r = { x: snap(between(PAD, MAP_W - 560)), y: snap(between(PAD + 120, MAP_H - 460)), w: snap(between(380, 520)), h: snap(between(290, 360)) };
    if (blocked(r, 130)) continue;
    const sides = (['n', 's', 'e', 'w'] as const).filter(() => rand() < 0.5);
    const b = building(r, sides.length ? sides.slice(0, 2) : ['s'], rand);
    rooms.push(r); roomGaps.push(b.gaps); walls.push(...b.walls, ...furnish(r, b.gaps, purposes[(rooms.length) % purposes.length], rand));
  }
  // Outdoor features by theme: they break sight lines like the old loose walls, but read as real places.
  const outdoor = (make: () => Piece[], count: number, gap = 90) => {
    for (let tries = 0, n = 0; n < count && tries < 400; tries++) { const group = make(); if (group.some(p => blocked(p, gap))) continue; walls.push(...group); n++; }
  };
  const spot = () => ({ x: between(PAD, MAP_W - PAD - 300), y: between(PAD + 60, MAP_H - PAD - 260) });
  const line = (kind: keyof typeof FOOTPRINT, n: number, vertical = false, gap = 8) => { const o = spot(), f = FOOTPRINT[kind]; return Array.from({ length: n }, (_, i) => piece(kind, o.x + (vertical ? 0 : i * (f.w + gap)), o.y + (vertical ? i * (f.h + gap + 40) : 0))); };
  const run = (kind: 'hedge_h' | 'wall_h', tiles: number, vertical: boolean): Piece[] => { const o = spot(), len = tiles * 64; return [{ kind: vertical ? (kind === 'hedge_h' ? 'hedge_v' : 'wall_v') : kind, x: snap(o.x), y: snap(o.y), w: vertical ? 40 : len, h: vertical ? len : 40 }]; };
  if (theme === 'garden') {
    outdoor(() => run('hedge_h', 2 + Math.floor(rand() * 3), rand() < .5), 9); outdoor(() => [piece('pond', spot().x, spot().y)], 1, 140);
    outdoor(() => [piece('bench', spot().x, spot().y)], 3); outdoor(() => line('flowerbed', 2), 3);
  } else if (theme === 'moonhouse') {
    outdoor(() => line('planter', 2 + Math.floor(rand() * 2)), 7); outdoor(() => [piece('fountain', spot().x, spot().y)], 1, 140); outdoor(() => [piece('potting', spot().x, spot().y)], 2);
  } else {
    outdoor(() => run('wall_h', 2 + Math.floor(rand() * 2), rand() < .5), 5); outdoor(() => line('crate', 2 + Math.floor(rand() * 2)), 5); outdoor(() => line('barrel', 2, rand() < .5), 4);
  }
  const bushes: Rect[] = [];
  for (let tries = 0; bushes.length < 13 && tries < 400; tries++) {
    const r = { x: Math.round(between(PAD, MAP_W - 190)), y: Math.round(between(PAD + 60, MAP_H - 150)), w: Math.round(between(90, 130)), h: Math.round(between(60, 90)) };
    if (walls.some(w => overlap(r, w, 30)) || bushes.some(b => overlap(r, b, 60)) || reserved.slice(1).some(v => overlap(r, v))) continue;
    bushes.push(r);
  }
  const reach = reachable(walls, runnerSpawn[0]);
  const ok = (p: Vec) => clearAt(walls, p, 50) && reach.has(cellOf(p));
  // Two beacons hide inside buildings; the rest spread out across the map, away from the start and the gate.
  const beacons: Vec[] = [];
  const far = (p: Vec) => beacons.every(b => dist(b, p) >= 380) && dist(p, spawnCenter) >= 420 && dist(p, portal) >= 260 && dist(p, hunterSpawn) >= 200;
  for (const r of rooms) { const c = { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }; if (beacons.length < 2 && ok(c) && far(c)) beacons.push(c); }
  for (let tries = 0; beacons.length < BEACON_COUNT && tries < 800; tries++) {
    const p = { x: Math.round(between(PAD + 40, MAP_W - PAD - 40)), y: Math.round(between(PAD + 100, MAP_H - 200)) };
    if (ok(p) && far(p)) beacons.push(p);
  }
  if (beacons.length < BEACON_COUNT || !ok(portal) || !ok(hunterSpawn) || !runnerSpawn.every(ok)) return null;
  // Lock one single-doorway building that holds a beacon. The key must be reachable with that door shut.
  let door: Rect | null = null, key: Vec | null = null;
  const lockable = rooms.findIndex((r, i) => roomGaps[i].length === 1 && beacons.some(b => inside(b, r)));
  if (lockable >= 0) {
    const plug = roomGaps[lockable][0], shut = [...walls, plug], reachShut = reachable(shut, runnerSpawn[0]);
    const okShut = (p: Vec, pad = 50) => clearAt(shut, p, pad) && reachShut.has(cellOf(p));
    const outside = beacons.filter(b => !inside(b, rooms[lockable]));
    if (outside.every(b => okShut(b)) && okShut(portal) && okShut(hunterSpawn)) {
      for (let tries = 0; !key && tries < 300; tries++) {
        const p = { x: Math.round(between(PAD + 40, MAP_W - PAD - 40)), y: Math.round(between(PAD + 100, MAP_H - 200)) };
        if (okShut(p) && dist(p, { x: plug.x + plug.w / 2, y: plug.y + plug.h / 2 }) >= 500 && dist(p, spawnCenter) >= 300) key = p;
      }
      if (key) door = plug;
    }
  }
  const solid = door ? [...walls, door] : walls, reachNow = reachable(solid, runnerSpawn[0]);
  const free = (p: Vec, pad = 40) => clearAt(solid, p, pad) && reachNow.has(cellOf(p));
  const taken: Vec[] = [...beacons, portal, hunterSpawn, spawnCenter, ...(key ? [key] : [])];
  const place = (count: number, spacing: number, avoid: number, extra: (p: Vec) => boolean = () => true) => {
    const out: Vec[] = [];
    for (let tries = 0; out.length < count && tries < 600; tries++) {
      const p = { x: Math.round(between(PAD + 40, MAP_W - PAD - 40)), y: Math.round(between(PAD + 100, MAP_H - 160)) };
      if (free(p) && extra(p) && [...out, ...taken].every(q => dist(p, q) >= (out.includes(q) ? spacing : avoid))) out.push(p);
    }
    taken.push(...out);
    return out;
  };
  const lockers = place(6, 280, 150);
  const cages = place(2, 700, 300, p => dist(p, spawnCenter) >= 450);
  const ends = place(6, 200, 150);
  const vents: [Vec, Vec][] = [];
  // Pair vent ends far apart so a crawl is a real escape route, not a hop.
  while (ends.length >= 2) {
    const a = ends.shift()!, i = ends.reduce((best, p, j) => dist(a, p) > dist(a, ends[best]) ? j : best, 0), b = ends.splice(i, 1)[0];
    if (dist(a, b) >= 600) vents.push([a, b]);
  }
  if (lockers.length < 4 || cages.length < 2 || vents.length < 2) return null;
  return { walls: walls.map(({ x, y, w, h }) => ({ x, y, w, h })), pieces: walls, bushes, beacons, portal, runnerSpawn, hunterSpawn, lockers, vents, cages, door, key };
}

const cache = new Map<string, Layout>();
/** Deterministic: the same theme and seed always yield the same, fully reachable layout. */
export function generateLayout(theme: string, seed: number): Layout {
  const key = `${theme}:${seed}`, hit = cache.get(key);
  if (hit) return hit;
  let h = seed >>> 0; for (const c of theme) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rand = rng(h);
  let layout: Layout | null = null;
  for (let i = 0; i < 40 && !layout; i++) layout = attempt(rand, theme);
  // Practically unreachable; an empty field is always valid, so a match can never fail to start.
  layout ??= { walls: [], pieces: [], bushes: [], beacons: Array.from({ length: BEACON_COUNT }, (_, i) => ({ x: 200 + i * 300, y: 300 + (i % 2) * 500 })), portal: { x: MAP_W / 2, y: 70 },
    runnerSpawn: [-1.5, -0.5, 0.5, 1.5].map(i => ({ x: MAP_W / 2 + i * 110, y: MAP_H - 90 })), hunterSpawn: { x: MAP_W / 2, y: MAP_H / 2 },
    lockers: [{ x: 300, y: 1100 }, { x: 1900, y: 1100 }], vents: [[{ x: 200, y: 700 }, { x: 2040, y: 700 }]], cages: [{ x: 500, y: 300 }, { x: 1740, y: 300 }], door: null, key: null };
  if (cache.size > 64) cache.clear();
  cache.set(key, layout);
  return layout;
}

export function arenaFromLayout(theme: Pick<Arena, 'id' | 'name' | 'tagline' | 'colors'>, layout: Layout): Arena {
  return { ...theme, walls: layout.walls, pieces: layout.pieces, bushes: layout.bushes, beacons: layout.beacons, portal: layout.portal, lockers: layout.lockers, vents: layout.vents, cages: layout.cages, door: layout.door, key: layout.key };
}
