import type {
  TracePoint,
  TraceSegment,
  TracePathDef,
  TraceTier,
  TraceShapeId,
} from '../../types/trace';
import type { TraceEventConfig } from '../../types/trace';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Euclidean distance between two normalised points */
export function distance(a: TracePoint, b: TracePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linearly interpolate between two points */
function lerp(a: TracePoint, b: TracePoint, t: number): TracePoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------------------------------------------------------------------------
// Segment building
// ---------------------------------------------------------------------------

/**
 * Build validation segments by interpolating along the path polyline.
 * Each segment gets a center point and a scaled hit radius.
 */
export function buildSegments(
  pathDef: TracePathDef,
  hitRadiusMultiplier: number,
): TraceSegment[] {
  const { points, segmentCount, hitRadiusBase } = pathDef;
  if (points.length < 2) return [];

  // Compute cumulative arc lengths
  const arcLengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    arcLengths.push(arcLengths[i - 1] + distance(points[i - 1], points[i]));
  }
  const totalLength = arcLengths[arcLengths.length - 1];
  if (totalLength === 0) return [];

  const segments: TraceSegment[] = [];
  for (let s = 0; s < segmentCount; s++) {
    const targetDist = (s / (segmentCount - 1)) * totalLength;

    // Find which line segment contains this distance
    let segIdx = 0;
    for (let i = 1; i < arcLengths.length; i++) {
      if (arcLengths[i] >= targetDist) { segIdx = i - 1; break; }
    }

    const segLen = arcLengths[segIdx + 1] - arcLengths[segIdx];
    const t = segLen > 0 ? (targetDist - arcLengths[segIdx]) / segLen : 0;
    const center = lerp(points[segIdx], points[segIdx + 1], t);

    segments.push({
      index: s,
      center,
      hitRadius: hitRadiusBase * hitRadiusMultiplier,
      visited: false,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/**
 * Given a pointer position, check if any unvisited segments in the tolerance
 * window around the furthest-visited segment are within hit radius.
 *
 * Returns updated segments + how many new segments were visited + average distance.
 */
export function updateSegmentProgress(
  segments: TraceSegment[],
  pointerPos: TracePoint,
  toleranceWindow = 4,
): { segments: TraceSegment[]; newVisits: number; distanceSum: number } {
  // Find furthest visited index
  let furthestVisited = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].visited) { furthestVisited = i; break; }
  }

  const windowStart = Math.max(0, furthestVisited - 1);
  const windowEnd = Math.min(segments.length - 1, furthestVisited + toleranceWindow + 1);

  let newVisits = 0;
  let distanceSum = 0;
  const updated = segments.map((seg, i) => {
    if (seg.visited) return seg;
    if (i < windowStart || i > windowEnd) return seg;

    const dist = distance(pointerPos, seg.center);
    if (dist <= seg.hitRadius) {
      newVisits++;
      distanceSum += dist;
      return { ...seg, visited: true };
    }
    return seg;
  });

  return { segments: updated, newVisits, distanceSum };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Calculate completion percentage from segments (0–100) */
export function calcCompletion(segments: TraceSegment[]): number {
  if (segments.length === 0) return 0;
  const visited = segments.filter((s) => s.visited).length;
  return Math.round((visited / segments.length) * 100);
}

/** Determine tier from completion percentage */
export function determineTier(
  completionPct: number,
  thresholds: TraceEventConfig['thresholds'],
): TraceTier {
  if (completionPct >= thresholds.perfect) return 'perfect';
  if (completionPct >= thresholds.good) return 'good';
  if (completionPct >= thresholds.basic) return 'basic';
  return 'miss';
}

// ---------------------------------------------------------------------------
// Math helpers (for future Phase 5 — included now so the engine is complete)
// ---------------------------------------------------------------------------

/** Convert a numeric answer to an array of digit shape IDs */
export function answerToShapeIds(answer: number): TraceShapeId[] {
  const digits = Math.abs(Math.round(answer)).toString();
  return digits.split('').map((d) => `digit_${d}` as TraceShapeId);
}

/** Generate a simple missing-digit problem with a single-digit answer (0–9) */
export function generateMissingDigitProblem(difficulty: number): {
  question: string;
  answer: number;
  shapeId: TraceShapeId;
} {
  const maxNum = Math.min(9, 3 + difficulty * 2);
  const answer = Math.floor(Math.random() * (maxNum + 1));
  const b = Math.floor(Math.random() * (maxNum + 1));
  const sum = answer + b;
  const question = `_ + ${b} = ${sum}`;
  return { question, answer, shapeId: `digit_${answer}` as TraceShapeId };
}
