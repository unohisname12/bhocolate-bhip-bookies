/** 2D point in normalized coordinates (0–1 range, scaled to container) */
export interface TracePoint {
  x: number;
  y: number;
}

/** A segment of the target path used for progress validation */
export interface TraceSegment {
  index: number;
  center: TracePoint;
  hitRadius: number; // normalized 0–1
  visited: boolean;
}

/** The four trace event categories */
export type TraceEventType =
  | 'trace_answer'
  | 'trace_missing_digit'
  | 'trace_shield'
  | 'trace_rune';

/** Shape identifiers for path lookup */
export type TraceShapeId =
  | 'digit_0' | 'digit_1' | 'digit_2' | 'digit_3' | 'digit_4'
  | 'digit_5' | 'digit_6' | 'digit_7' | 'digit_8' | 'digit_9'
  | 'shield_circle'
  | 'rune_zigzag' | 'rune_spiral' | 'rune_line';

/** Accuracy/success tier */
export type TraceTier = 'miss' | 'basic' | 'good' | 'perfect';

/** A target path definition — the ideal path the player should trace */
export interface TracePathDef {
  shapeId: TraceShapeId;
  points: TracePoint[];       // ordered polyline defining ideal stroke
  segmentCount: number;       // how many segments for validation
  hitRadiusBase: number;      // base hit radius per segment (normalized 0–1)
  displayLabel?: string;      // e.g. "7" for digit paths
}

/** Result of a completed trace attempt */
export interface TraceResult {
  eventType: TraceEventType;
  tier: TraceTier;
  completionPct: number;      // 0–100
  accuracyPct: number;        // 0–100
  timeElapsedMs: number;
}

/** Active trace session state (lives in the hook, not the engine) */
export interface TraceSession {
  eventType: TraceEventType;
  paths: TracePathDef[];          // 1 for single shapes, multiple for multi-digit
  currentPathIndex: number;
  segments: TraceSegment[];       // segments for current path
  playerStroke: TracePoint[];
  completionPct: number;
  accuracySum: number;
  accuracyCount: number;
  startedAt: number;
  timeLimitMs: number;
  phase: 'ready' | 'tracing' | 'evaluating' | 'result';
  result: TraceResult | null;
}

/** Config for a specific trace event type */
export interface TraceEventConfig {
  eventType: TraceEventType;
  timeLimitMs: number;
  hitRadiusMultiplier: number;    // scales path hitRadiusBase (1.0 = normal)
  thresholds: {
    basic: number;                // completion % needed for basic tier
    good: number;
    perfect: number;
  };
}

/** Trace buff state stored on ActiveBattleState */
export interface TraceBuffState {
  shieldTier: TraceTier | null;       // retroactive damage mitigation
  runeBoostTier: TraceTier | null;    // next attack boosted
  mathTraceTier: TraceTier | null;    // next attack boosted (like mathBuffActive)
}
