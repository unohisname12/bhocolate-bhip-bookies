// ---------------------------------------------------------------------------
// Combat Feel Overhaul — Tuning Constants
// ---------------------------------------------------------------------------
// All constants for the 7 new combat systems. Tweak here, not in code.

// ---------------------------------------------------------------------------
// 1. Combo System (persistent streak, separate from BattleSystem combo)
// ---------------------------------------------------------------------------

export const COMBO_FEEL = {
  /** Max combo count */
  max: 5,
  /** Combo threshold for "Surge" (screen flash, bonus energy) */
  surgeThreshold: 3,
  /** Combo threshold for "Big Hit" (guaranteed crit + screen shake) */
  bigHitThreshold: 5,
  /** Bonus energy granted when reaching surge threshold */
  surgeEnergyBonus: 5,
  /** Damage multiplier applied at bigHitThreshold (stacks with existing combo) */
  bigHitMultiplier: 1.3,
  /** Minimum enemy damage (as fraction of player maxHP) to trigger combo reset */
  resetDamageThreshold: 0.2,
} as const;

// ---------------------------------------------------------------------------
// 2. Glitch Meter
// ---------------------------------------------------------------------------

export const GLITCH_METER = {
  /** Maximum glitch value */
  max: 100,
  /** Starting glitch value */
  startValue: 0,
  /** Glitch gained when player takes damage (per hit) */
  gainOnDamage: 8,
  /** Glitch gained on trace miss */
  gainOnTraceMiss: 12,
  /** Glitch gained on basic trace (small penalty) */
  gainOnTraceBasic: 4,
  /** Glitch reduced on good trace */
  reduceOnTraceGood: 10,
  /** Glitch reduced on perfect trace */
  reduceOnTracePerfect: 18,
  /** Glitch reduced per turn passively */
  passiveDecayPerTurn: 2,
  /** Threshold for Low→Medium state */
  mediumThreshold: 34,
  /** Threshold for Medium→High state */
  highThreshold: 67,
} as const;

export type GlitchState = 'low' | 'medium' | 'high';

export const getGlitchState = (value: number): GlitchState => {
  if (value >= GLITCH_METER.highThreshold) return 'high';
  if (value >= GLITCH_METER.mediumThreshold) return 'medium';
  return 'low';
};

// ---------------------------------------------------------------------------
// 3. Trace Focus (charges)
// ---------------------------------------------------------------------------

export const TRACE_FOCUS = {
  /** Maximum focus charges */
  maxCharges: 3,
  /** Starting charges */
  startCharges: 3,
  /** Charges consumed per trace event */
  costPerTrace: 1,
  /** Charges regained on good trace */
  regainOnGood: 1,
  /** Charges regained on perfect trace */
  regainOnPerfect: 1,
  /** Whether miss consumes a charge (yes — you still "used" focus) */
  missConsumesCharge: true,
} as const;

// ---------------------------------------------------------------------------
// 4. Trace Use Cases (Weak Point)
// ---------------------------------------------------------------------------

export const WEAK_POINT = {
  /** Chance (0-1) that a weak point appears after enemy attacks */
  triggerChance: 0.25,
  /** Duration in ms the weak point indicator is visible before fading */
  displayDurationMs: 4000,
  /** Bonus damage multiplier when player attacks during weak point */
  bonusDamageMultiplier: 1.5,
  /** Time limit for the weak point math trace (ms) */
  traceTimeLimitMs: 5000,
} as const;

// ---------------------------------------------------------------------------
// 5. "Send It Back" Reflect
// ---------------------------------------------------------------------------

export const REFLECT = {
  /** Fraction of blocked damage reflected on perfect shield trace */
  perfectReflectFraction: 0.2,
  /** Whether reflect can KO the enemy (no — leave at 1 HP minimum) */
  canKO: false,
} as const;

// ---------------------------------------------------------------------------
// 6. Collapse (Last Stand)
// ---------------------------------------------------------------------------

export const COLLAPSE = {
  /** HP set to on successful collapse (perfect or good) */
  survivalHP: 1,
  /** Defense buff multiplier granted on perfect collapse */
  perfectDefenseMultiplier: 1.5,
  /** Duration (turns) of defense buff on perfect collapse */
  perfectDefenseTurns: 2,
  /** On fail: survive with weakness debuff — strength multiplier */
  failWeaknessMultiplier: 0.7,
  /** Duration (turns) of weakness debuff on fail */
  failWeaknessTurns: 3,
  /** Time limit for collapse trace (ms) — tight, high stakes */
  traceTimeLimitMs: 3000,
} as const;

// ---------------------------------------------------------------------------
// 7. Reality Level (derived from Glitch Meter)
// ---------------------------------------------------------------------------

export type RealityLevel = 'stable' | 'shaky' | 'broken';

export const REALITY_LEVEL = {
  /** Enemy stat multiplier when reality is stable */
  stableEnemyMultiplier: 1.0,
  /** Enemy stat multiplier when reality is shaky */
  shakyEnemyMultiplier: 1.1,
  /** Enemy stat multiplier when reality is broken */
  brokenEnemyMultiplier: 1.25,
  /** Reward multiplier when reality is stable */
  stableRewardMultiplier: 1.0,
  /** Reward multiplier when reality is shaky */
  shakyRewardMultiplier: 1.15,
  /** Reward multiplier when reality is broken */
  brokenRewardMultiplier: 1.35,
} as const;

export const getRealityLevel = (glitchValue: number): RealityLevel => {
  const state = getGlitchState(glitchValue);
  if (state === 'high') return 'broken';
  if (state === 'medium') return 'shaky';
  return 'stable';
};

export const getEnemyMultiplier = (glitchValue: number): number => {
  const level = getRealityLevel(glitchValue);
  return REALITY_LEVEL[`${level}EnemyMultiplier`];
};

export const getRewardMultiplier = (glitchValue: number): number => {
  const level = getRealityLevel(glitchValue);
  return REALITY_LEVEL[`${level}RewardMultiplier`];
};
