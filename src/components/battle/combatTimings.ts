/** Centralized combat animation & feedback timings.
 *  All combat UI components reference these values — no hardcoded durations. */
export const COMBAT_TIMINGS = {
  // Sequence phases (useBattleSequence)
  windup: 150,
  impact: 80,
  reaction: 250,
  resolve: 200,
  interEntryGap: 80,

  // Sprite effects
  damageNumberDuration: 900,
  impactBurstDuration: 650,
  screenShakeDuration: 400,
  hitFlashDuration: 350,
  combatSheetHoldover: 60,

  // HP / Energy bar
  hpDrain: 400,
  energyDrain: 300,

  // Impact feedback
  attackImpact: 120,
  hitPause: 50,
  cameraShake: 120,
  turnDelay: 400,

  // Button feedback
  buttonPress: 150,
  buttonBreatheSpeed: 2500,

  // Phase indicator
  phaseTransition: 500,
  phaseLinger: 800,

  // Enemy intent
  intentReveal: 300,
  intentPulse: 1500,
  intentBounce: 1500,

  // Enemy turn dimming
  enemyTurnDim: 300,
} as const;

export type CombatTimings = typeof COMBAT_TIMINGS;
