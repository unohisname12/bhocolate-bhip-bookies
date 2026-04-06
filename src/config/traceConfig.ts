import type {
  TracePathDef,
  TraceEventConfig,
  TraceEventType,
  TraceShapeId,
  TraceTier,
} from '../types/trace';

// ---------------------------------------------------------------------------
// Path definitions — normalized 0–1 coordinates
// ---------------------------------------------------------------------------

/** Helper to build a circle path of N points centered at (cx, cy) with radius r */
function circlePoints(cx: number, cy: number, r: number, n: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2; // start at top
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

export const TRACE_PATHS: Record<TraceShapeId, TracePathDef> = {
  // --- Digits 0–9 (simple stroke approximations) ---
  digit_0: {
    shapeId: 'digit_0',
    points: circlePoints(0.5, 0.5, 0.35, 20),
    segmentCount: 20,
    hitRadiusBase: 0.08,
    displayLabel: '0',
  },
  digit_1: {
    shapeId: 'digit_1',
    points: [
      { x: 0.4, y: 0.2 }, { x: 0.5, y: 0.15 },
      { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.85 },
    ],
    segmentCount: 10,
    hitRadiusBase: 0.09,
    displayLabel: '1',
  },
  digit_2: {
    shapeId: 'digit_2',
    points: [
      { x: 0.25, y: 0.3 }, { x: 0.35, y: 0.18 }, { x: 0.5, y: 0.15 },
      { x: 0.65, y: 0.18 }, { x: 0.72, y: 0.3 }, { x: 0.65, y: 0.45 },
      { x: 0.5, y: 0.55 }, { x: 0.35, y: 0.65 }, { x: 0.25, y: 0.78 },
      { x: 0.25, y: 0.85 }, { x: 0.5, y: 0.85 }, { x: 0.75, y: 0.85 },
    ],
    segmentCount: 16,
    hitRadiusBase: 0.08,
    displayLabel: '2',
  },
  digit_3: {
    shapeId: 'digit_3',
    points: [
      { x: 0.25, y: 0.2 }, { x: 0.5, y: 0.15 }, { x: 0.68, y: 0.25 },
      { x: 0.65, y: 0.4 }, { x: 0.5, y: 0.48 },
      { x: 0.65, y: 0.58 }, { x: 0.68, y: 0.72 },
      { x: 0.5, y: 0.85 }, { x: 0.25, y: 0.8 },
    ],
    segmentCount: 16,
    hitRadiusBase: 0.08,
    displayLabel: '3',
  },
  digit_4: {
    shapeId: 'digit_4',
    points: [
      { x: 0.6, y: 0.15 }, { x: 0.5, y: 0.35 }, { x: 0.4, y: 0.55 },
      { x: 0.3, y: 0.6 }, { x: 0.5, y: 0.6 }, { x: 0.7, y: 0.6 },
      { x: 0.6, y: 0.6 }, { x: 0.6, y: 0.75 }, { x: 0.6, y: 0.85 },
    ],
    segmentCount: 14,
    hitRadiusBase: 0.08,
    displayLabel: '4',
  },
  digit_5: {
    shapeId: 'digit_5',
    points: [
      { x: 0.7, y: 0.15 }, { x: 0.4, y: 0.15 }, { x: 0.3, y: 0.15 },
      { x: 0.3, y: 0.35 }, { x: 0.3, y: 0.45 }, { x: 0.5, y: 0.42 },
      { x: 0.65, y: 0.5 }, { x: 0.7, y: 0.65 },
      { x: 0.6, y: 0.8 }, { x: 0.4, y: 0.85 }, { x: 0.25, y: 0.78 },
    ],
    segmentCount: 16,
    hitRadiusBase: 0.08,
    displayLabel: '5',
  },
  digit_6: {
    shapeId: 'digit_6',
    points: [
      { x: 0.6, y: 0.18 }, { x: 0.45, y: 0.15 }, { x: 0.32, y: 0.25 },
      { x: 0.25, y: 0.45 }, { x: 0.28, y: 0.62 },
      { x: 0.4, y: 0.75 }, { x: 0.55, y: 0.78 }, { x: 0.68, y: 0.68 },
      { x: 0.68, y: 0.55 }, { x: 0.55, y: 0.45 }, { x: 0.38, y: 0.48 },
    ],
    segmentCount: 16,
    hitRadiusBase: 0.08,
    displayLabel: '6',
  },
  digit_7: {
    shapeId: 'digit_7',
    points: [
      { x: 0.25, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.72, y: 0.15 },
      { x: 0.62, y: 0.35 }, { x: 0.55, y: 0.5 },
      { x: 0.48, y: 0.65 }, { x: 0.42, y: 0.85 },
    ],
    segmentCount: 12,
    hitRadiusBase: 0.08,
    displayLabel: '7',
  },
  digit_8: {
    shapeId: 'digit_8',
    points: [
      { x: 0.5, y: 0.15 }, { x: 0.35, y: 0.2 }, { x: 0.3, y: 0.32 },
      { x: 0.4, y: 0.45 }, { x: 0.5, y: 0.48 },
      { x: 0.65, y: 0.55 }, { x: 0.72, y: 0.68 },
      { x: 0.6, y: 0.82 }, { x: 0.5, y: 0.85 },
      { x: 0.35, y: 0.82 }, { x: 0.28, y: 0.68 },
      { x: 0.35, y: 0.55 }, { x: 0.5, y: 0.48 },
      { x: 0.6, y: 0.45 }, { x: 0.7, y: 0.32 },
      { x: 0.65, y: 0.2 }, { x: 0.5, y: 0.15 },
    ],
    segmentCount: 20,
    hitRadiusBase: 0.08,
    displayLabel: '8',
  },
  digit_9: {
    shapeId: 'digit_9',
    points: [
      { x: 0.62, y: 0.52 }, { x: 0.48, y: 0.42 }, { x: 0.35, y: 0.32 },
      { x: 0.32, y: 0.22 }, { x: 0.45, y: 0.15 },
      { x: 0.6, y: 0.18 }, { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.45 }, { x: 0.65, y: 0.6 },
      { x: 0.55, y: 0.75 }, { x: 0.42, y: 0.85 },
    ],
    segmentCount: 16,
    hitRadiusBase: 0.08,
    displayLabel: '9',
  },

  // --- Shield circle ---
  shield_circle: {
    shapeId: 'shield_circle',
    points: circlePoints(0.5, 0.5, 0.38, 24),
    segmentCount: 24,
    hitRadiusBase: 0.1,
    displayLabel: 'Shield',
  },

  // --- Rune shapes ---
  rune_zigzag: {
    shapeId: 'rune_zigzag',
    points: [
      { x: 0.15, y: 0.2 }, { x: 0.4, y: 0.35 },
      { x: 0.15, y: 0.5 }, { x: 0.4, y: 0.65 },
      { x: 0.15, y: 0.8 }, { x: 0.4, y: 0.85 },
      { x: 0.65, y: 0.65 }, { x: 0.85, y: 0.5 },
    ],
    segmentCount: 14,
    hitRadiusBase: 0.09,
    displayLabel: 'Lightning',
  },
  rune_spiral: {
    shapeId: 'rune_spiral',
    points: [
      { x: 0.5, y: 0.15 },
      { x: 0.72, y: 0.25 }, { x: 0.82, y: 0.5 }, { x: 0.72, y: 0.75 },
      { x: 0.5, y: 0.85 }, { x: 0.28, y: 0.75 }, { x: 0.2, y: 0.5 },
      { x: 0.3, y: 0.32 }, { x: 0.45, y: 0.28 },
      { x: 0.6, y: 0.35 }, { x: 0.65, y: 0.5 },
      { x: 0.58, y: 0.6 }, { x: 0.48, y: 0.58 },
      { x: 0.45, y: 0.48 }, { x: 0.5, y: 0.42 },
    ],
    segmentCount: 18,
    hitRadiusBase: 0.09,
    displayLabel: 'Burst',
  },
  rune_line: {
    shapeId: 'rune_line',
    points: [
      { x: 0.15, y: 0.5 }, { x: 0.3, y: 0.5 },
      { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.5 }, { x: 0.85, y: 0.5 },
    ],
    segmentCount: 8,
    hitRadiusBase: 0.1,
    displayLabel: 'Strike',
  },
};

// ---------------------------------------------------------------------------
// Event configs — timing & thresholds per event type
// ---------------------------------------------------------------------------

export const TRACE_EVENT_CONFIGS: Record<TraceEventType, TraceEventConfig> = {
  trace_shield: {
    eventType: 'trace_shield',
    timeLimitMs: 3000,
    hitRadiusMultiplier: 1.5,     // very generous under pressure
    thresholds: { basic: 60, good: 75, perfect: 90 },
  },
  trace_rune: {
    eventType: 'trace_rune',
    timeLimitMs: 5000,
    hitRadiusMultiplier: 1.0,
    thresholds: { basic: 70, good: 85, perfect: 95 },
  },
  trace_missing_digit: {
    eventType: 'trace_missing_digit',
    timeLimitMs: 6000,
    hitRadiusMultiplier: 1.3,
    thresholds: { basic: 65, good: 80, perfect: 92 },
  },
  trace_answer: {
    eventType: 'trace_answer',
    timeLimitMs: 8000,
    hitRadiusMultiplier: 1.2,
    thresholds: { basic: 70, good: 85, perfect: 95 },
  },
};

// ---------------------------------------------------------------------------
// Reward multipliers by tier
// ---------------------------------------------------------------------------

export const TRACE_TIER_MULTIPLIERS: Record<TraceTier, number> = {
  miss: 1.0,
  basic: 1.3,
  good: 1.5,
  perfect: 2.0,
};

export const TRACE_SHIELD_REDUCTION: Record<TraceTier, number> = {
  miss: 0,
  basic: 0.3,
  good: 0.5,
  perfect: 0.8,
};

// ---------------------------------------------------------------------------
// Rune effect labels
// ---------------------------------------------------------------------------

export const RUNE_EFFECT_LABELS: Record<string, string> = {
  rune_zigzag: 'Lightning Strike',
  rune_spiral: 'AOE Burst',
  rune_line: 'Precision Strike',
};

// Which rune shapes are available for random selection
export const RUNE_SHAPE_IDS: TraceShapeId[] = ['rune_zigzag', 'rune_spiral', 'rune_line'];

// Shield trace activates when enemy damage exceeds this fraction of player max HP
export const SHIELD_DAMAGE_THRESHOLD = 0.25;

// Energy required to use rune trace
export const RUNE_ENERGY_THRESHOLD = 60;
