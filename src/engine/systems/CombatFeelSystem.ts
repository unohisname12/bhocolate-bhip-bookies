// ---------------------------------------------------------------------------
// CombatFeelSystem — Pure post-processing functions for combat feel mechanics
// ---------------------------------------------------------------------------
// These functions are called from the reducer AFTER existing battle logic.
// They never modify BattleSystem.ts, BattleAI.ts, or traceEngine.ts.

import type { ActiveBattleState, CombatFeelState, Buff } from '../../types/battle';
import {
  COMBO_FEEL,
  GLITCH_METER,
  TRACE_FOCUS,
  WEAK_POINT,
  REFLECT,
  COLLAPSE,
  getGlitchState,
  getEnemyMultiplier,
} from '../../config/combatFeelConfig';
import type { TraceTier } from '../../types/trace';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCombatFeelState(): CombatFeelState {
  return {
    combo: 0,
    glitchMeter: GLITCH_METER.startValue,
    focusCharges: TRACE_FOCUS.startCharges,
    weakPointActive: false,
    collapseUsed: false,
    collapseTriggered: false,
  };
}

/** Get or create combatFeel from battle state (backwards-compatible) */
export function getCombatFeel(battle: ActiveBattleState): CombatFeelState {
  return battle.combatFeel ?? createCombatFeelState();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampGlitch(value: number): number {
  return Math.max(0, Math.min(GLITCH_METER.max, value));
}

function clampCombo(value: number): number {
  return Math.max(0, Math.min(COMBO_FEEL.max, value));
}

function clampCharges(value: number): number {
  return Math.max(0, Math.min(TRACE_FOCUS.maxCharges, value));
}

function withCombatFeel(battle: ActiveBattleState, feel: CombatFeelState): ActiveBattleState {
  return { ...battle, combatFeel: feel };
}

// ---------------------------------------------------------------------------
// 1. Combo System
// ---------------------------------------------------------------------------

/** Called after player successfully deals damage (attack/special hit) */
export function incrementCombo(battle: ActiveBattleState): ActiveBattleState {
  const feel = getCombatFeel(battle);
  const newCombo = clampCombo(feel.combo + 1);
  let newBattle = withCombatFeel(battle, { ...feel, combo: newCombo });

  // Surge threshold: grant bonus energy
  if (newCombo === COMBO_FEEL.surgeThreshold && feel.combo < COMBO_FEEL.surgeThreshold) {
    newBattle = {
      ...newBattle,
      playerPet: {
        ...newBattle.playerPet,
        energy: Math.min(newBattle.playerPet.maxEnergy, newBattle.playerPet.energy + COMBO_FEEL.surgeEnergyBonus),
      },
    };
  }

  return newBattle;
}

/** Check if big hit threshold is active (for damage multiplier in reducer) */
export function isBigHitActive(battle: ActiveBattleState): boolean {
  const feel = getCombatFeel(battle);
  return feel.combo >= COMBO_FEEL.bigHitThreshold;
}

/** Called after enemy deals heavy damage to player — resets combo if threshold met */
export function checkComboReset(battle: ActiveBattleState, damageDealt: number): ActiveBattleState {
  const feel = getCombatFeel(battle);
  const threshold = battle.playerPet.maxHP * COMBO_FEEL.resetDamageThreshold;
  if (damageDealt >= threshold) {
    return withCombatFeel(battle, { ...feel, combo: 0 });
  }
  return battle;
}

// ---------------------------------------------------------------------------
// 2. Glitch Meter
// ---------------------------------------------------------------------------

/** Called when player takes damage */
export function glitchOnDamage(battle: ActiveBattleState): ActiveBattleState {
  const feel = getCombatFeel(battle);
  return withCombatFeel(battle, {
    ...feel,
    glitchMeter: clampGlitch(feel.glitchMeter + GLITCH_METER.gainOnDamage),
  });
}

/** Called on trace completion — adjusts glitch based on tier */
export function glitchOnTrace(battle: ActiveBattleState, tier: TraceTier): ActiveBattleState {
  const feel = getCombatFeel(battle);
  let delta = 0;
  switch (tier) {
    case 'miss':
      delta = GLITCH_METER.gainOnTraceMiss;
      break;
    case 'basic':
      delta = GLITCH_METER.gainOnTraceBasic;
      break;
    case 'good':
      delta = -GLITCH_METER.reduceOnTraceGood;
      break;
    case 'perfect':
      delta = -GLITCH_METER.reduceOnTracePerfect;
      break;
  }
  return withCombatFeel(battle, {
    ...feel,
    glitchMeter: clampGlitch(feel.glitchMeter + delta),
  });
}

/** Called at start of each turn — passive glitch decay */
export function glitchPassiveDecay(battle: ActiveBattleState): ActiveBattleState {
  const feel = getCombatFeel(battle);
  if (feel.glitchMeter <= 0) return battle;
  return withCombatFeel(battle, {
    ...feel,
    glitchMeter: clampGlitch(feel.glitchMeter - GLITCH_METER.passiveDecayPerTurn),
  });
}

// ---------------------------------------------------------------------------
// 3. Trace Focus Charges
// ---------------------------------------------------------------------------

/** Called before a trace event — checks if player has charges. Returns false if no charges. */
export function hasTraceFocus(battle: ActiveBattleState): boolean {
  const feel = getCombatFeel(battle);
  return feel.focusCharges > 0;
}

/** Called when a trace event starts — consumes a charge */
export function consumeTraceFocus(battle: ActiveBattleState): ActiveBattleState {
  const feel = getCombatFeel(battle);
  return withCombatFeel(battle, {
    ...feel,
    focusCharges: clampCharges(feel.focusCharges - TRACE_FOCUS.costPerTrace),
  });
}

/** Called after trace completion — regains charge on good/perfect */
export function regainTraceFocus(battle: ActiveBattleState, tier: TraceTier): ActiveBattleState {
  const feel = getCombatFeel(battle);
  if (tier === 'good' || tier === 'perfect') {
    return withCombatFeel(battle, {
      ...feel,
      focusCharges: clampCharges(feel.focusCharges + TRACE_FOCUS.regainOnGood),
    });
  }
  return battle;
}

// ---------------------------------------------------------------------------
// 4. Weak Point
// ---------------------------------------------------------------------------

/** Called after enemy attacks — random chance to expose weak point */
export function rollWeakPoint(battle: ActiveBattleState, rng: number): ActiveBattleState {
  const feel = getCombatFeel(battle);
  const triggered = rng < WEAK_POINT.triggerChance;
  if (triggered === feel.weakPointActive) return battle;
  return withCombatFeel(battle, { ...feel, weakPointActive: triggered });
}

/** Called when player attacks with weak point active — apply bonus + clear */
export function consumeWeakPoint(battle: ActiveBattleState): { battle: ActiveBattleState; wasActive: boolean } {
  const feel = getCombatFeel(battle);
  if (!feel.weakPointActive) return { battle, wasActive: false };
  return {
    battle: withCombatFeel(battle, { ...feel, weakPointActive: false }),
    wasActive: true,
  };
}

// ---------------------------------------------------------------------------
// 5. Reflect (Send It Back)
// ---------------------------------------------------------------------------

/** Called after perfect shield trace — reflects a portion of blocked damage to enemy */
export function applyReflect(battle: ActiveBattleState, blockedDamage: number): ActiveBattleState {
  const reflectDamage = Math.floor(blockedDamage * REFLECT.perfectReflectFraction);
  if (reflectDamage <= 0) return battle;

  const minHP = REFLECT.canKO ? 0 : 1;
  const newEnemyHP = Math.max(minHP, battle.enemyPet.currentHP - reflectDamage);

  return {
    ...battle,
    enemyPet: { ...battle.enemyPet, currentHP: newEnemyHP },
    log: [
      ...battle.log,
      {
        turn: battle.turnCount,
        actor: 'player' as const,
        action: 'reflect',
        damage: reflectDamage,
        message: `Perfect shield! ${reflectDamage} damage reflected back!`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 6. Collapse (Last Stand)
// ---------------------------------------------------------------------------

/** Check if collapse should trigger (player HP <= 0, not yet used) */
export function shouldTriggerCollapse(battle: ActiveBattleState): boolean {
  const feel = getCombatFeel(battle);
  return (
    battle.playerPet.currentHP <= 0 &&
    !feel.collapseUsed &&
    !feel.collapseTriggered
  );
}

/** Mark collapse as triggered (waiting for trace input) */
export function triggerCollapse(battle: ActiveBattleState): ActiveBattleState {
  const feel = getCombatFeel(battle);
  return withCombatFeel(battle, { ...feel, collapseTriggered: true });
}

/** Resolve collapse based on trace tier */
export function resolveCollapse(battle: ActiveBattleState, tier: TraceTier): ActiveBattleState {
  const feel = getCombatFeel(battle);
  const updated: CombatFeelState = { ...feel, collapseUsed: true, collapseTriggered: false };

  if (tier === 'perfect') {
    // Survive at 1 HP + defense buff
    const defenseBuff: Buff = {
      stat: 'defense',
      multiplier: COLLAPSE.perfectDefenseMultiplier,
      turnsRemaining: COLLAPSE.perfectDefenseTurns,
    };
    return {
      ...withCombatFeel(battle, updated),
      playerPet: {
        ...battle.playerPet,
        currentHP: COLLAPSE.survivalHP,
        buffs: [...battle.playerPet.buffs, defenseBuff],
      },
      log: [
        ...battle.log,
        {
          turn: battle.turnCount,
          actor: 'player' as const,
          action: 'collapse_perfect',
          message: 'PERFECT COLLAPSE! Survived with a shield!',
        },
      ],
    };
  }

  if (tier === 'good') {
    // Survive at 1 HP, no buff
    return {
      ...withCombatFeel(battle, updated),
      playerPet: { ...battle.playerPet, currentHP: COLLAPSE.survivalHP },
      log: [
        ...battle.log,
        {
          turn: battle.turnCount,
          actor: 'player' as const,
          action: 'collapse_good',
          message: 'COLLAPSE! Barely survived!',
        },
      ],
    };
  }

  // basic or miss: survive with weakness
  const weaknessBuff: Buff = {
    stat: 'strength',
    multiplier: COLLAPSE.failWeaknessMultiplier,
    turnsRemaining: COLLAPSE.failWeaknessTurns,
  };
  return {
    ...withCombatFeel(battle, updated),
    playerPet: {
      ...battle.playerPet,
      currentHP: COLLAPSE.survivalHP,
      buffs: [...battle.playerPet.buffs, weaknessBuff],
    },
    log: [
      ...battle.log,
      {
        turn: battle.turnCount,
        actor: 'player' as const,
        action: 'collapse_fail',
        message: 'Collapse... survived, but weakened.',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 7. Reality Level — enemy stat scaling (applied in RunBattleAdapter)
// ---------------------------------------------------------------------------
// getRealityLevel, getEnemyMultiplier, getRewardMultiplier are in combatFeelConfig.ts

// ---------------------------------------------------------------------------
// Composite hooks for the reducer
// ---------------------------------------------------------------------------

/** Called after player deals damage (attack/special that hit).
 *  Handles: combo increment, weak point consumption, big hit check.
 *  Returns updated battle and the effective damage multiplier to apply. */
export function afterPlayerAttack(
  battle: ActiveBattleState,
  _damageDealt: number,
): { battle: ActiveBattleState; extraMultiplier: number } {
  let b = battle;
  let extraMultiplier = 1.0;

  // Weak point bonus
  const { battle: afterWP, wasActive } = consumeWeakPoint(b);
  b = afterWP;
  if (wasActive) {
    extraMultiplier *= WEAK_POINT.bonusDamageMultiplier;
  }

  // Big hit bonus (check BEFORE incrementing so threshold=5 means "on the 5th hit")
  if (isBigHitActive(b)) {
    extraMultiplier *= COMBO_FEEL.bigHitMultiplier;
  }

  // Increment combo
  b = incrementCombo(b);

  return { battle: b, extraMultiplier };
}

/** Called after enemy deals damage to player.
 *  Handles: glitch increase, combo reset check, weak point roll. */
export function afterEnemyAttack(
  battle: ActiveBattleState,
  damageDealt: number,
  rng: number,
): ActiveBattleState {
  let b = battle;

  // Glitch rises on damage
  b = glitchOnDamage(b);

  // Heavy hit resets combo
  b = checkComboReset(b, damageDealt);

  // Roll for weak point exposure
  b = rollWeakPoint(b, rng);

  return b;
}

/** Called at start of player turn. Handles: glitch passive decay. */
export function onTurnStart(battle: ActiveBattleState): ActiveBattleState {
  return glitchPassiveDecay(battle);
}

/** Called after any trace completes. Handles: glitch adjust, focus regain. */
export function afterTrace(battle: ActiveBattleState, tier: TraceTier): ActiveBattleState {
  let b = battle;
  b = glitchOnTrace(b, tier);
  b = regainTraceFocus(b, tier);
  return b;
}
