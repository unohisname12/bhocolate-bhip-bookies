import { describe, it, expect } from 'vitest';
import { applyPostPlayerAttack, applyPostEnemyAttack, applyTurnStartEffects, applyFortifiedReduction, checkPhaseShift } from '../RunPassiveEffects';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { createEmptyBonuses } from '../../../types/run';
import type { EngineState } from '../../../types/engine';
import type { ActiveBattleState } from '../../../types/battle';
import type { ActiveRunState, FractureModifierId } from '../../../types/run';

/** Build an EngineState with active run + active battle for a specific enemy. */
function buildRunBattleState(opts: {
  enemyId: string;
  playerHP?: number;
  playerMaxHP?: number;
  playerEnergy?: number;
  playerMaxEnergy?: number;
  playerStr?: number;
  playerDef?: number;
  playerSpd?: number;
  enemyHP?: number;
  enemyMaxHP?: number;
  enemyStr?: number;
  enemyDef?: number;
  enemySpd?: number;
  turnCount?: number;
  bonuses?: Partial<ReturnType<typeof createEmptyBonuses>>;
  fractureModifier?: FractureModifierId;
  instability?: number;
  bossState?: ActiveRunState['bossState'];
}): EngineState {
  const base = createInitialEngineState();
  const bonuses = { ...createEmptyBonuses(), ...opts.bonuses };

  const battle: ActiveBattleState = {
    active: true,
    phase: 'player_turn',
    turnCount: opts.turnCount ?? 1,
    log: [],
    mathBuffActive: false,
    traceBuffs: { mathTraceTier: null, shieldTier: null, runeBoostTier: null },
    combo: { count: 0, multiplier: 1.0, lastAction: '' },
    enemyIntent: null,
    focusUsedThisTurn: false,
    playerPet: {
      petId: 'test-player',
      name: 'Test Pet',
      speciesId: 'koala_sprite',
      level: 5,
      currentHP: opts.playerHP ?? 100,
      maxHP: opts.playerMaxHP ?? 100,
      energy: opts.playerEnergy ?? 50,
      maxEnergy: opts.playerMaxEnergy ?? 50,
      strength: opts.playerStr ?? 20,
      defense: opts.playerDef ?? 15,
      speed: opts.playerSpd ?? 10,
      moves: [],
      buffs: [],
    },
    enemyPet: {
      petId: 'test-enemy',
      name: 'Test Enemy',
      speciesId: 'subtrak',
      level: 5,
      currentHP: opts.enemyHP ?? 80,
      maxHP: opts.enemyMaxHP ?? 80,
      energy: 50,
      maxEnergy: 50,
      strength: opts.enemyStr ?? 18,
      defense: opts.enemyDef ?? 12,
      speed: opts.enemySpd ?? 10,
      moves: [],
      buffs: [],
    },
  };

  const run: ActiveRunState = {
    active: true,
    currentEncounter: 0,
    phase: 'in_battle',
    playerHPPercent: 1.0,
    bonuses,
    rewardsChosen: [],
    currentEnemyId: opts.enemyId,
    encountersWon: 0,
    map: { nodes: [], currentPath: [] },
    currentNodeId: null,
    seed: 42,
    instability: opts.instability ?? 0,
    fractureModifier: opts.fractureModifier ?? 'volatile',
    mpEarnedThisRun: 0,
    bossState: opts.bossState ?? {},
  };

  return { ...base, battle, run };
}

describe('applyPostPlayerAttack', () => {
  it('reflects damage back to player for damage_reflect enemy', () => {
    // null_fragment: damage_reflect, value 0.15
    const state = buildRunBattleState({ enemyId: 'null_fragment', playerHP: 100, playerMaxHP: 100 });
    const result = applyPostPlayerAttack(state, 20);
    if (!result.battle.active) throw new Error('battle should be active');
    // Reflect: floor(20 * 0.15) = 3
    expect(result.battle.playerPet.currentHP).toBe(97);
  });

  it('applies thorns when player has thornsFraction', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime', // frenzy, no reflect
      enemyHP: 80,
      bonuses: { thornsFraction: 0.10 },
    });
    const result = applyPostPlayerAttack(state, 30);
    if (!result.battle.active) throw new Error('battle should be active');
    // Thorns: floor(30 * 0.10) = 3
    expect(result.battle.enemyPet.currentHP).toBe(77);
  });

  it('does nothing for non-run battle', () => {
    const base = createInitialEngineState();
    const result = applyPostPlayerAttack(base, 20);
    expect(result).toBe(base);
  });
});

describe('applyPostEnemyAttack', () => {
  it('drains energy for energy_drain enemy', () => {
    // voltage_remnant: energy_drain, value 3
    const state = buildRunBattleState({ enemyId: 'voltage_remnant', playerEnergy: 30 });
    const result = applyPostEnemyAttack(state, 10);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.playerPet.energy).toBe(27);
  });

  it('triggers adaptive shield on first big hit', () => {
    // 20% of maxHP 100 = 20. Damage of 25 > 20 → triggers
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerHP: 60,
      playerMaxHP: 100,
      bonuses: { adaptiveShieldUsed: false },
    });
    const result = applyPostEnemyAttack(state, 25);
    if (!result.battle.active) throw new Error('battle should be active');
    // Reduction: floor(25 * 0.30) = 7 → heal from 60 to 67
    expect(result.battle.playerPet.currentHP).toBe(67);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bonuses.adaptiveShieldUsed).toBe(true);
  });

  it('does not trigger adaptive shield twice', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerHP: 60,
      playerMaxHP: 100,
      bonuses: { adaptiveShieldUsed: true },
    });
    const result = applyPostEnemyAttack(state, 25);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.playerPet.currentHP).toBe(60); // no heal
  });

  it('applies glass cannon extra damage', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerHP: 80,
      playerMaxHP: 100,
      bonuses: { glassCannon: true },
    });
    const result = applyPostEnemyAttack(state, 20);
    if (!result.battle.active) throw new Error('battle should be active');
    // Glass cannon: floor(20 * 0.15) = 3 extra → 80 - 3 = 77
    expect(result.battle.playerPet.currentHP).toBe(77);
  });
});

describe('applyTurnStartEffects', () => {
  it('applies enemy scaling every 2 turns', () => {
    // recursion_knight: scaling, value 0.08
    const state = buildRunBattleState({ enemyId: 'recursion_knight', turnCount: 2, enemyStr: 20 });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // Boost: floor(20 * 0.08) = 1 → 21
    expect(result.battle.enemyPet.strength).toBe(21);
  });

  it('does not scale on odd turns', () => {
    const state = buildRunBattleState({ enemyId: 'recursion_knight', turnCount: 1, enemyStr: 20 });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.enemyPet.strength).toBe(20);
  });

  it('applies enemy regen', () => {
    // fractured_sprout: regen, value 0.05
    const state = buildRunBattleState({ enemyId: 'fractured_sprout', enemyHP: 70, enemyMaxHP: 80 });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // Heal: floor(80 * 0.05) = 4 → 74
    expect(result.battle.enemyPet.currentHP).toBe(74);
  });

  it('does not overheal enemy regen', () => {
    const state = buildRunBattleState({ enemyId: 'fractured_sprout', enemyHP: 79, enemyMaxHP: 80 });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.enemyPet.currentHP).toBe(80);
  });

  it('applies void_pulse every 3 turns', () => {
    const state = buildRunBattleState({
      enemyId: 'void_subtrak',
      playerHP: 100,
      playerMaxHP: 100,
      bossState: { turnsSinceLastPulse: 2 }, // next turn = 3 → triggers
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // Pulse: floor(100 * 0.08) = 8 → 92
    expect(result.battle.playerPet.currentHP).toBe(92);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bossState.turnsSinceLastPulse).toBe(0);
  });

  it('does not fire void_pulse before interval', () => {
    const state = buildRunBattleState({
      enemyId: 'void_subtrak',
      playerHP: 100,
      playerMaxHP: 100,
      bossState: { turnsSinceLastPulse: 0 },
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.playerPet.currentHP).toBe(100);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bossState.turnsSinceLastPulse).toBe(1);
  });

  it('applies fracture_shell phase transition at 50% HP', () => {
    const state = buildRunBattleState({
      enemyId: 'fracture_core',
      enemyHP: 40,
      enemyMaxHP: 100,
      enemyStr: 20,
      bossState: { phaseShifted: false },
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bossState.phaseShifted).toBe(true);
    // Enrage: floor(20 * 1.30) = 26
    expect(result.battle.enemyPet.strength).toBe(26);
  });

  it('applies player regen per turn', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerHP: 80,
      playerMaxHP: 100,
      bonuses: { regenPerTurn: 0.05 },
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // Heal: floor(100 * 0.05) = 5 → 85
    expect(result.battle.playerPet.currentHP).toBe(85);
  });

  it('applies player energy regen bonus', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerEnergy: 30,
      playerMaxEnergy: 50,
      bonuses: { energyRegenBonus: 3 },
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    expect(result.battle.playerPet.energy).toBe(33);
  });

  it('applies overcharge HP drain', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerHP: 50,
      playerMaxHP: 100,
      bonuses: { overchargeActive: true },
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // Drain: floor(100 * 0.02) = 2 → 48 (clamped to min 1)
    expect(result.battle.playerPet.currentHP).toBe(48);
  });

  it('applies draining fracture energy loss', () => {
    const state = buildRunBattleState({
      enemyId: 'shard_slime',
      playerEnergy: 20,
      fractureModifier: 'draining',
    });
    const result = applyTurnStartEffects(state);
    if (!result.battle.active) throw new Error('battle should be active');
    // RUN_BALANCE.DRAINING_ENERGY_LOSS = 2 → 18
    expect(result.battle.playerPet.energy).toBe(18);
  });
});

describe('applyFortifiedReduction', () => {
  it('reduces damage for fortified enemy', () => {
    // structural_anomaly: fortified, value 0.25
    const state = buildRunBattleState({ enemyId: 'structural_anomaly' });
    const result = applyFortifiedReduction(state, 20);
    // Reduced: floor(20 * (1 - 0.25)) = floor(20 * 0.75) = 15
    expect(result).toBe(15);
  });

  it('reduces damage for fracture_shell phase 1', () => {
    // fracture_core: fracture_shell, shell reduction 0.40
    const state = buildRunBattleState({
      enemyId: 'fracture_core',
      bossState: { phaseShifted: false },
    });
    const result = applyFortifiedReduction(state, 20);
    // Reduced: floor(20 * (1 - 0.40)) = floor(20 * 0.60) = 12
    expect(result).toBe(12);
  });

  it('does not reduce damage for fracture_shell phase 2', () => {
    const state = buildRunBattleState({
      enemyId: 'fracture_core',
      bossState: { phaseShifted: true },
    });
    const result = applyFortifiedReduction(state, 20);
    expect(result).toBe(20);
  });

  it('returns full damage for non-fortified enemy', () => {
    const state = buildRunBattleState({ enemyId: 'shard_slime' });
    const result = applyFortifiedReduction(state, 20);
    expect(result).toBe(20);
  });

  it('ensures minimum 1 damage', () => {
    const state = buildRunBattleState({ enemyId: 'structural_anomaly' });
    const result = applyFortifiedReduction(state, 1);
    expect(result).toBeGreaterThanOrEqual(1);
  });
});

describe('checkPhaseShift', () => {
  it('returns boolean for phase_shift enemy', () => {
    // phase_crawler: phase_shift, value 0.3
    const state = buildRunBattleState({ enemyId: 'phase_crawler', turnCount: 1 });
    const result = checkPhaseShift(state);
    expect(typeof result).toBe('boolean');
  });

  it('returns false for non-phase_shift enemy', () => {
    const state = buildRunBattleState({ enemyId: 'shard_slime' });
    expect(checkPhaseShift(state)).toBe(false);
  });

  it('returns false for non-run state', () => {
    const base = createInitialEngineState();
    expect(checkPhaseShift(base)).toBe(false);
  });

  it('deterministic based on turnCount', () => {
    const state1 = buildRunBattleState({ enemyId: 'phase_crawler', turnCount: 5 });
    const state2 = buildRunBattleState({ enemyId: 'phase_crawler', turnCount: 5 });
    expect(checkPhaseShift(state1)).toBe(checkPhaseShift(state2));
  });
});
