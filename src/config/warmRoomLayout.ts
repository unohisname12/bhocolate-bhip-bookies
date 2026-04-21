/**
 * Spatial layout data for the warm-tavern home scene.
 *
 * Coordinate system:
 *   x = percent from LEFT of viewport  (0 = left wall, 100 = right wall)
 *   y = percent from BOTTOM of viewport (0 = floor, 100 = ceiling)
 * The pet's "foot anchor" is the (x, y) point reported by the controller;
 * the sprite is rendered centered-above that anchor.
 *
 * Floor plane: the walkable rectangle the pet's foot anchor is clamped to.
 * Object colliders: axis-aligned rectangles in the same coord space that
 * the foot anchor cannot enter.
 * Interaction points: named floor positions pet walks to when the player
 * taps an object (e.g., "stand in front of the bookshelf to Read").
 */

export interface Rect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ObjectCollider {
  id: string;
  rect: Rect;
}

export interface InteractionPoint {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  radius: number;
}

// Pet foot anchor must stay inside this rect.
// yMin keeps pet above the hotbar; yMax keeps pet in front of back-wall props.
export const FLOOR_RECT: Rect = { xMin: 8, xMax: 92, yMin: 9, yMax: 22 };

export const PET_HOME: { x: number; y: number } = { x: 50, y: 12 };

// Footprints of solid objects on the floor plane. Pet cannot enter these.
export const OBJECT_COLLIDERS: ObjectCollider[] = [
  { id: 'bookshelf', rect: { xMin: 2,  xMax: 28, yMin: 22, yMax: 40 } },
  { id: 'log_pile',  rect: { xMin: 26, xMax: 41, yMin: 20, yMax: 28 } },
  { id: 'fireplace', rect: { xMin: 31, xMax: 69, yMin: 22, yMax: 45 } },
  { id: 'stool',     rect: { xMin: 64, xMax: 80, yMin: 20, yMax: 28 } },
  { id: 'plant',     rect: { xMin: 82, xMax: 98, yMin: 20, yMax: 30 } },
];

// Where the pet stands to interact with each object (on the floor plane,
// just in front of the object). Radius controls when the UI hint is shown.
export const INTERACTION_POINTS: InteractionPoint[] = [
  { id: 'bookshelf', label: 'Read',   anchor: { x: 17, y: 18 }, radius: 6 },
  { id: 'fireplace', label: 'Warm',   anchor: { x: 50, y: 18 }, radius: 5 },
  { id: 'stool',     label: 'Sit',    anchor: { x: 71, y: 18 }, radius: 5 },
  { id: 'plant',     label: 'Inspect',anchor: { x: 80, y: 18 }, radius: 5 },
];

export function clampToFloor(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(FLOOR_RECT.xMin, Math.min(FLOOR_RECT.xMax, x)),
    y: Math.max(FLOOR_RECT.yMin, Math.min(FLOOR_RECT.yMax, y)),
  };
}

function insideRect(x: number, y: number, r: Rect): boolean {
  return x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax;
}

export function hitCollider(x: number, y: number): ObjectCollider | null {
  for (const c of OBJECT_COLLIDERS) {
    if (insideRect(x, y, c.rect)) return c;
  }
  return null;
}

/**
 * Resolve a requested floor target to a safe point:
 *   1. Clamp to FLOOR_RECT.
 *   2. If the resulting point lies inside any collider, push it to the
 *      nearest collider edge along the shortest axis — this makes "tap
 *      the bookshelf" drop the pet just in front of it rather than
 *      teleporting into it.
 */
export function resolveTarget(x: number, y: number): { x: number; y: number } {
  const clamped = clampToFloor(x, y);
  const hit = hitCollider(clamped.x, clamped.y);
  if (!hit) return clamped;
  const { xMin, xMax, yMin, yMax } = hit.rect;
  const dxLeft = clamped.x - xMin;
  const dxRight = xMax - clamped.x;
  const dyBot = clamped.y - yMin;
  const dyTop = yMax - clamped.y;
  const m = Math.min(dxLeft, dxRight, dyBot, dyTop);
  let nx = clamped.x;
  let ny = clamped.y;
  if (m === dyBot) ny = yMin - 0.5;
  else if (m === dyTop) ny = yMax + 0.5;
  else if (m === dxLeft) nx = xMin - 0.5;
  else nx = xMax + 0.5;
  return clampToFloor(nx, ny);
}

export function nearestInteraction(x: number, y: number): InteractionPoint | null {
  let best: InteractionPoint | null = null;
  let bestDist = Infinity;
  for (const p of INTERACTION_POINTS) {
    const d = Math.hypot(p.anchor.x - x, p.anchor.y - y);
    if (d <= p.radius && d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
