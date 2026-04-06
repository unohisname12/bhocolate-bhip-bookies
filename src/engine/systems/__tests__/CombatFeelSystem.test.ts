import { describe, it, expect } from 'vitest';
import {
  createCombatFeelState,
  getCombatFeel,
  incrementCombo,
  isBigHitActive,
  checkComboReset,
  glitchOnDamage,
  glitchOnTrace,
  glitchPassiveDecay,
  hasTraceFocus,
  consumeTraceFocus,
  regainTraceFocus,
  rollWeakPoint,
  consumeWeakPoint,
  applyReflect,
  shouldTriggerCollapse,
  triggerCollapse,
  resolveCollapse,
  afterPlayerAttack,
  afterEnemyAttack,
  onTurnStart,
  afterTrace,
} from '../CombatFeelSystem';
import {
  COMBO_FEEL,
  GLITCH_METER,
  TRACE_FOCUS,
  REFLECT,
  COLLAPSE,
} from '../../../config/combatFeelConfig';
import type { ActiveBattleState, CombatFeelState } from '../../../types/battle';

/** Build a minimal ActiveBattleState for testing */
function mockBattle(overrides?: Partial<ActiveBattleState>, cfOverrides?: Partial<CombatFeelState>): ActiveBattleState {
  return {
    active: true,
    phase: 'player_turn',
    playerPet: {
      petId: 'p1', name: 'Test', speciesId: 'koala_sprite', level: 5,
      maxHP: 200, currentHP: 160, energy: 50, maxEnergy: 100,
      strength: 20, speed: 15, defense: 18, moves: [], buffs: [],
    },
    enemyPet: {
      petId: 'e1', name: 'Enemy', speciesId: 'slime_baby', level: 5,
      maxHP: 180, currentHP: 140, energy: 40, maxEnergy: 80,
      strength: 18, speed: 12, defense: 14, moves: [], buffs: [],
    },
    turnCount: 3,
    log: [],
    mathBuffActive: false,
    traceBuffs: { shieldTier: null, runeBoostTier: null, mathTraceTier: null },
    combo: { count: 0, multiplier: 1.0, lastAction: '' },
    enemyIntent: null,
    focusUsedThisTurn: false,
    combatFeel: { ...createCombatFeelState(), ...cfOverrides },
    ...overrides,
  } as ActiveBattleState;
}

// ---------------------------------------------------------------------------
// Factory + Helpers
// ---------------------------------------------------------------------------

describe('createCombatFeelState', () => {
  it('returns correct defaults', () => {
    const state = createCombatFeelState();
    expect(state.combo).toBe(0);
    expect(state.glitchMeter).toBe(GLITCH_METER.startValue);
    expect(state.focusCharges).toBe(TRACE_FOCUS.startCharges);
    expect(state.weakPointActive).toBe(false);
    expect(state.collapseUsed).toBe(false);
    expect(state.collapseTriggered).toBe(false);
  });
});

describe('getCombatFeel', () => {
  it('returns existing combatFeel', () => {
    const b = mockBattle({}, { combo: 3 });
    expect(getCombatFeel(b).combo).toBe(3);
  });

  it('returns default when combatFeel is undefined', () => {
    const b = mockBattle({ combatFeel: undefined });
    expect(getCombatFeel(b).combo).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 1. Combo System
// ---------------------------------------------------------------------------

describe('Combo System', () => {
  it('incrementCombo increases combo by 1', () => {
    const b = mockBattle({}, { combo: 2 });
    const result = incrementCombo(b);
    expect(result.combatFeel!.combo).toBe(3);
  });

  it('incrementCombo caps at max', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.max });
    const result = incrementCombo(b);
    expect(result.combatFeel!.combo).toBe(COMBO_FEEL.max);
  });

  it('grants surge energy at threshold', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.surgeThreshold - 1 });
    const result = incrementCombo(b);
    expect(result.combatFeel!.combo).toBe(COMBO_FEEL.surgeThreshold);
    expect(result.playerPet.energy).toBe(b.playerPet.energy + COMBO_FEEL.surgeEnergyBonus);
  });

  it('does not grant surge energy when already past threshold', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.surgeThreshold });
    const result = incrementCombo(b);
    expect(result.playerPet.energy).toBe(b.playerPet.energy);
  });

  it('isBigHitActive returns true at threshold', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.bigHitThreshold });
    expect(isBigHitActive(b)).toBe(true);
  });

  it('isBigHitActive returns false below threshold', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.bigHitThreshold - 1 });
    expect(isBigHitActive(b)).toBe(false);
  });

  it('checkComboReset resets on heavy damage', () => {
    const b = mockBattle({}, { combo: 4 });
    const heavyDmg = b.playerPet.maxHP * COMBO_FEEL.resetDamageThreshold;
    const result = checkComboReset(b, heavyDmg);
    expect(result.combatFeel!.combo).toBe(0);
  });

  it('checkComboReset does not reset on light damage', () => {
    const b = mockBattle({}, { combo: 4 });
    const lightDmg = b.playerPet.maxHP * COMBO_FEEL.resetDamageThreshold - 1;
    const result = checkComboReset(b, lightDmg);
    expect(result.combatFeel!.combo).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 2. Glitch Meter
// ---------------------------------------------------------------------------

describe('Glitch Meter', () => {
  it('glitchOnDamage increases glitch', () => {
    const b = mockBattle({}, { glitchMeter: 10 });
    const result = glitchOnDamage(b);
    expect(result.combatFeel!.glitchMeter).toBe(10 + GLITCH_METER.gainOnDamage);
  });

  it('glitchOnTrace miss increases glitch', () => {
    const b = mockBattle({}, { glitchMeter: 20 });
    const result = glitchOnTrace(b, 'miss');
    expect(result.combatFeel!.glitchMeter).toBe(20 + GLITCH_METER.gainOnTraceMiss);
  });

  it('glitchOnTrace basic increases glitch slightly', () => {
    const b = mockBattle({}, { glitchMeter: 20 });
    const result = glitchOnTrace(b, 'basic');
    expect(result.combatFeel!.glitchMeter).toBe(20 + GLITCH_METER.gainOnTraceBasic);
  });

  it('glitchOnTrace good decreases glitch', () => {
    const b = mockBattle({}, { glitchMeter: 40 });
    const result = glitchOnTrace(b, 'good');
    expect(result.combatFeel!.glitchMeter).toBe(40 - GLITCH_METER.reduceOnTraceGood);
  });

  it('glitchOnTrace perfect decreases glitch significantly', () => {
    const b = mockBattle({}, { glitchMeter: 50 });
    const result = glitchOnTrace(b, 'perfect');
    expect(result.combatFeel!.glitchMeter).toBe(50 - GLITCH_METER.reduceOnTracePerfect);
  });

  it('glitch clamps to 0 minimum', () => {
    const b = mockBattle({}, { glitchMeter: 5 });
    const result = glitchOnTrace(b, 'perfect');
    expect(result.combatFeel!.glitchMeter).toBe(0);
  });

  it('glitch clamps to max', () => {
    const b = mockBattle({}, { glitchMeter: 95 });
    const result = glitchOnDamage(b);
    expect(result.combatFeel!.glitchMeter).toBeLessThanOrEqual(GLITCH_METER.max);
  });

  it('glitchPassiveDecay reduces glitch', () => {
    const b = mockBattle({}, { glitchMeter: 20 });
    const result = glitchPassiveDecay(b);
    expect(result.combatFeel!.glitchMeter).toBe(20 - GLITCH_METER.passiveDecayPerTurn);
  });

  it('glitchPassiveDecay does nothing at 0', () => {
    const b = mockBattle({}, { glitchMeter: 0 });
    const result = glitchPassiveDecay(b);
    expect(result).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// 3. Trace Focus
// ---------------------------------------------------------------------------

describe('Trace Focus', () => {
  it('hasTraceFocus returns true when charges > 0', () => {
    const b = mockBattle({}, { focusCharges: 2 });
    expect(hasTraceFocus(b)).toBe(true);
  });

  it('hasTraceFocus returns false when charges = 0', () => {
    const b = mockBattle({}, { focusCharges: 0 });
    expect(hasTraceFocus(b)).toBe(false);
  });

  it('consumeTraceFocus reduces charges', () => {
    const b = mockBattle({}, { focusCharges: 3 });
    const result = consumeTraceFocus(b);
    expect(result.combatFeel!.focusCharges).toBe(2);
  });

  it('consumeTraceFocus clamps at 0', () => {
    const b = mockBattle({}, { focusCharges: 0 });
    const result = consumeTraceFocus(b);
    expect(result.combatFeel!.focusCharges).toBe(0);
  });

  it('regainTraceFocus on good trace', () => {
    const b = mockBattle({}, { focusCharges: 1 });
    const result = regainTraceFocus(b, 'good');
    expect(result.combatFeel!.focusCharges).toBe(2);
  });

  it('regainTraceFocus on perfect trace', () => {
    const b = mockBattle({}, { focusCharges: 1 });
    const result = regainTraceFocus(b, 'perfect');
    expect(result.combatFeel!.focusCharges).toBe(2);
  });

  it('regainTraceFocus does nothing on miss', () => {
    const b = mockBattle({}, { focusCharges: 1 });
    const result = regainTraceFocus(b, 'miss');
    expect(result).toBe(b);
  });

  it('regainTraceFocus does nothing on basic', () => {
    const b = mockBattle({}, { focusCharges: 1 });
    const result = regainTraceFocus(b, 'basic');
    expect(result).toBe(b);
  });

  it('regainTraceFocus clamps at max', () => {
    const b = mockBattle({}, { focusCharges: TRACE_FOCUS.maxCharges });
    const result = regainTraceFocus(b, 'perfect');
    expect(result.combatFeel!.focusCharges).toBe(TRACE_FOCUS.maxCharges);
  });
});

// ---------------------------------------------------------------------------
// 4. Weak Point
// ---------------------------------------------------------------------------

describe('Weak Point', () => {
  it('rollWeakPoint triggers with low rng', () => {
    const b = mockBattle({}, { weakPointActive: false });
    const result = rollWeakPoint(b, 0.01); // below 0.25 threshold
    expect(result.combatFeel!.weakPointActive).toBe(true);
  });

  it('rollWeakPoint does not trigger with high rng', () => {
    const b = mockBattle({}, { weakPointActive: false });
    const result = rollWeakPoint(b, 0.5);
    expect(result.combatFeel!.weakPointActive).toBe(false);
  });

  it('rollWeakPoint returns same state when no change', () => {
    const b = mockBattle({}, { weakPointActive: false });
    const result = rollWeakPoint(b, 0.99);
    expect(result).toBe(b);
  });

  it('consumeWeakPoint clears and reports active', () => {
    const b = mockBattle({}, { weakPointActive: true });
    const { battle, wasActive } = consumeWeakPoint(b);
    expect(wasActive).toBe(true);
    expect(battle.combatFeel!.weakPointActive).toBe(false);
  });

  it('consumeWeakPoint does nothing when not active', () => {
    const b = mockBattle({}, { weakPointActive: false });
    const { battle, wasActive } = consumeWeakPoint(b);
    expect(wasActive).toBe(false);
    expect(battle).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// 5. Reflect
// ---------------------------------------------------------------------------

describe('Reflect', () => {
  it('applyReflect deals fraction of blocked damage to enemy', () => {
    const b = mockBattle();
    const blocked = 50;
    const result = applyReflect(b, blocked);
    const expectedReflect = Math.floor(blocked * REFLECT.perfectReflectFraction);
    expect(result.enemyPet.currentHP).toBe(b.enemyPet.currentHP - expectedReflect);
  });

  it('applyReflect adds log entry', () => {
    const b = mockBattle();
    const result = applyReflect(b, 50);
    expect(result.log.length).toBe(b.log.length + 1);
    expect(result.log[result.log.length - 1].action).toBe('reflect');
  });

  it('applyReflect does not KO enemy (leaves at 1 HP)', () => {
    const b = mockBattle({
      enemyPet: { ...mockBattle().enemyPet, currentHP: 2 },
    });
    const result = applyReflect(b, 500);
    expect(result.enemyPet.currentHP).toBeGreaterThanOrEqual(1);
  });

  it('applyReflect does nothing with 0 blocked damage', () => {
    const b = mockBattle();
    const result = applyReflect(b, 0);
    expect(result).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// 6. Collapse
// ---------------------------------------------------------------------------

describe('Collapse (Last Stand)', () => {
  it('shouldTriggerCollapse returns true when HP <= 0 and unused', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseUsed: false, collapseTriggered: false },
    );
    expect(shouldTriggerCollapse(b)).toBe(true);
  });

  it('shouldTriggerCollapse returns false when HP > 0', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 10 } },
      { collapseUsed: false },
    );
    expect(shouldTriggerCollapse(b)).toBe(false);
  });

  it('shouldTriggerCollapse returns false when already used', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseUsed: true },
    );
    expect(shouldTriggerCollapse(b)).toBe(false);
  });

  it('shouldTriggerCollapse returns false when already triggered', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseTriggered: true },
    );
    expect(shouldTriggerCollapse(b)).toBe(false);
  });

  it('triggerCollapse marks collapseTriggered', () => {
    const b = mockBattle();
    const result = triggerCollapse(b);
    expect(result.combatFeel!.collapseTriggered).toBe(true);
  });

  it('resolveCollapse perfect: 1 HP + defense buff', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseTriggered: true },
    );
    const result = resolveCollapse(b, 'perfect');
    expect(result.playerPet.currentHP).toBe(COLLAPSE.survivalHP);
    expect(result.combatFeel!.collapseUsed).toBe(true);
    expect(result.combatFeel!.collapseTriggered).toBe(false);
    expect(result.playerPet.buffs).toHaveLength(1);
    expect(result.playerPet.buffs[0].stat).toBe('defense');
    expect(result.playerPet.buffs[0].multiplier).toBe(COLLAPSE.perfectDefenseMultiplier);
  });

  it('resolveCollapse good: 1 HP, no buff', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseTriggered: true },
    );
    const result = resolveCollapse(b, 'good');
    expect(result.playerPet.currentHP).toBe(COLLAPSE.survivalHP);
    expect(result.playerPet.buffs).toHaveLength(0);
    expect(result.combatFeel!.collapseUsed).toBe(true);
  });

  it('resolveCollapse miss: 1 HP + weakness debuff', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseTriggered: true },
    );
    const result = resolveCollapse(b, 'miss');
    expect(result.playerPet.currentHP).toBe(COLLAPSE.survivalHP);
    expect(result.playerPet.buffs).toHaveLength(1);
    expect(result.playerPet.buffs[0].stat).toBe('strength');
    expect(result.playerPet.buffs[0].multiplier).toBe(COLLAPSE.failWeaknessMultiplier);
  });

  it('resolveCollapse basic: same as miss (weakness)', () => {
    const b = mockBattle(
      { playerPet: { ...mockBattle().playerPet, currentHP: 0 } },
      { collapseTriggered: true },
    );
    const result = resolveCollapse(b, 'basic');
    expect(result.playerPet.currentHP).toBe(COLLAPSE.survivalHP);
    expect(result.playerPet.buffs[0].stat).toBe('strength');
  });
});

// ---------------------------------------------------------------------------
// Composite hooks
// ---------------------------------------------------------------------------

describe('afterPlayerAttack', () => {
  it('increments combo on damage', () => {
    const b = mockBattle({}, { combo: 1 });
    const { battle } = afterPlayerAttack(b, 30);
    expect(battle.combatFeel!.combo).toBe(2);
  });

  it('applies weak point bonus multiplier', () => {
    const b = mockBattle({}, { combo: 0, weakPointActive: true });
    const { battle, extraMultiplier } = afterPlayerAttack(b, 30);
    expect(extraMultiplier).toBeGreaterThan(1.0);
    expect(battle.combatFeel!.weakPointActive).toBe(false);
  });

  it('applies big hit multiplier at threshold', () => {
    const b = mockBattle({}, { combo: COMBO_FEEL.bigHitThreshold });
    const { extraMultiplier } = afterPlayerAttack(b, 30);
    expect(extraMultiplier).toBeCloseTo(COMBO_FEEL.bigHitMultiplier, 2);
  });

  it('no extra multiplier normally', () => {
    const b = mockBattle({}, { combo: 0, weakPointActive: false });
    const { extraMultiplier } = afterPlayerAttack(b, 30);
    expect(extraMultiplier).toBe(1.0);
  });
});

describe('afterEnemyAttack', () => {
  it('increases glitch', () => {
    const b = mockBattle({}, { glitchMeter: 10 });
    const result = afterEnemyAttack(b, 20, 0.99);
    expect(result.combatFeel!.glitchMeter).toBeGreaterThan(10);
  });

  it('resets combo on heavy damage', () => {
    const b = mockBattle({}, { combo: 4 });
    const heavyDmg = b.playerPet.maxHP * COMBO_FEEL.resetDamageThreshold;
    const result = afterEnemyAttack(b, heavyDmg, 0.99);
    expect(result.combatFeel!.combo).toBe(0);
  });

  it('rolls weak point', () => {
    const b = mockBattle({}, { weakPointActive: false });
    const result = afterEnemyAttack(b, 10, 0.01); // low rng triggers
    expect(result.combatFeel!.weakPointActive).toBe(true);
  });
});

describe('onTurnStart', () => {
  it('applies glitch passive decay', () => {
    const b = mockBattle({}, { glitchMeter: 20 });
    const result = onTurnStart(b);
    expect(result.combatFeel!.glitchMeter).toBe(20 - GLITCH_METER.passiveDecayPerTurn);
  });
});

describe('afterTrace', () => {
  it('adjusts glitch and regains focus on good', () => {
    const b = mockBattle({}, { glitchMeter: 30, focusCharges: 1 });
    const result = afterTrace(b, 'good');
    expect(result.combatFeel!.glitchMeter).toBe(30 - GLITCH_METER.reduceOnTraceGood);
    expect(result.combatFeel!.focusCharges).toBe(2);
  });

  it('adjusts glitch on miss without regaining focus', () => {
    const b = mockBattle({}, { glitchMeter: 10, focusCharges: 1 });
    const result = afterTrace(b, 'miss');
    expect(result.combatFeel!.glitchMeter).toBe(10 + GLITCH_METER.gainOnTraceMiss);
    expect(result.combatFeel!.focusCharges).toBe(1);
  });
});
