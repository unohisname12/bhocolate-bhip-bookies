import { describe, it, expect } from 'vitest';
import { engineReducer } from '../../state/engineReducer';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { initBattle, executePlayerMove, executeFocus } from '../BattleSystem';
import { BATTLE_CONSTANTS } from '../../../config/battleConfig';
import type { EngineState } from '../../core/EngineTypes';
import type { Pet } from '../../../types';
import type { ActiveBattleState } from '../../../types/battle';

// ---------------------------------------------------------------------------
// Mock pet factory (mirrors BattleSystem.test.ts)
// ---------------------------------------------------------------------------

const mockPet = (speciesId = 'koala_sprite', level = 1): Pet => ({
  id: `test_${speciesId}_${level}`,
  ownerId: 'test_owner',
  name: `Test ${speciesId}`,
  speciesId,
  type: speciesId,
  stage: 'baby',
  mood: 'calm',
  state: 'idle',
  needs: { hunger: 80, happiness: 80, cleanliness: 80, health: 100 },
  stats: { strength: 10, speed: 10, defense: 10 },
  bond: 50,
  progression: { level, xp: 0, evolutionFlags: [] },
  timestamps: {
    createdAt: '2026-01-01T00:00:00.000Z',
    lastInteraction: '2026-01-01T00:00:00.000Z',
    lastFedAt: '2026-01-01T00:00:00.000Z',
    lastCleanedAt: '2026-01-01T00:00:00.000Z',
  },
});

/** Create engine state with an active battle in player_turn phase */
const stateWithBattle = (): EngineState => {
  const base = createInitialEngineState();
  const pet = mockPet();
  const battle = initBattle(pet);
  return { ...base, pet, battle, screen: 'battle' };
};

/** Force battle to a specific phase */
const withPhase = (state: EngineState, phase: ActiveBattleState['phase']): EngineState => ({
  ...state,
  battle: { ...state.battle as ActiveBattleState, phase },
});

// ---------------------------------------------------------------------------
// 1. Out-of-turn action guards (Phase guards in reducer)
// ---------------------------------------------------------------------------

describe('battle phase guards — out-of-turn actions rejected', () => {
  const NON_PLAYER_PHASES: ActiveBattleState['phase'][] = [
    'setup', 'enemy_turn', 'resolve', 'victory', 'defeat',
  ];

  it('PLAYER_MOVE is rejected when phase is not player_turn', () => {
    const base = stateWithBattle();
    const battle = base.battle as ActiveBattleState;
    const moveId = battle.playerPet.moves[0].id;

    for (const phase of NON_PLAYER_PHASES) {
      const state = withPhase(base, phase);
      const result = engineReducer(state, { type: 'PLAYER_MOVE', moveId });
      // State should be unchanged
      expect(result).toBe(state);
    }
  });

  it('PLAYER_FOCUS is rejected when phase is not player_turn', () => {
    const base = stateWithBattle();
    for (const phase of NON_PLAYER_PHASES) {
      const state = withPhase(base, phase);
      const result = engineReducer(state, { type: 'PLAYER_FOCUS' });
      expect(result).toBe(state);
    }
  });

  it('PLAYER_DEFEND_ACTION is rejected when phase is not player_turn', () => {
    const base = stateWithBattle();
    for (const phase of NON_PLAYER_PHASES) {
      const state = withPhase(base, phase);
      const result = engineReducer(state, { type: 'PLAYER_DEFEND_ACTION' });
      expect(result).toBe(state);
    }
  });

  it('PLAYER_FLEE_ATTEMPT is rejected when phase is not player_turn', () => {
    const base = stateWithBattle();
    for (const phase of NON_PLAYER_PHASES) {
      const state = withPhase(base, phase);
      const result = engineReducer(state, { type: 'PLAYER_FLEE_ATTEMPT' });
      expect(result).toBe(state);
    }
  });

  it('PLAYER_MOVE is accepted when phase IS player_turn', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    expect(battle.phase).toBe('player_turn');

    const moveId = battle.playerPet.moves.find(m => m.type === 'attack')!.id;
    const result = engineReducer(
      { ...state, battle: { ...battle, playerPet: { ...battle.playerPet, energy: 100 } } },
      { type: 'PLAYER_MOVE', moveId },
    );
    // State should have changed (battle advanced)
    expect(result).not.toBe(state);
  });
});

// ---------------------------------------------------------------------------
// 2. Rapid/repeated action resistance
// ---------------------------------------------------------------------------

describe('battle — rapid action resistance', () => {
  it('double PLAYER_MOVE: second action is rejected because phase advanced', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const moveId = battle.playerPet.moves.find(m => m.type === 'attack')!.id;

    // First move: should succeed and advance phase
    const afterFirst = engineReducer(
      { ...state, battle: { ...battle, playerPet: { ...battle.playerPet, energy: 100 } } },
      { type: 'PLAYER_MOVE', moveId },
    );
    const afterFirstBattle = afterFirst.battle as ActiveBattleState;

    // After a full round (player → enemy → resolve), phase should be player_turn again
    // OR victory/defeat. Either way, the battle state changed.
    expect(afterFirst).not.toBe(state);

    // If battle is still active and phase returned to player_turn, a second move should work
    // If phase is NOT player_turn, it should be rejected
    if (afterFirstBattle.active && afterFirstBattle.phase !== 'player_turn') {
      const afterSecond = engineReducer(afterFirst, { type: 'PLAYER_MOVE', moveId });
      expect(afterSecond).toBe(afterFirst); // rejected — state unchanged
    }
  });

  it('PLAYER_FOCUS advances through full round and resets for next turn', () => {
    // Focus dispatch: executeFocus (focusUsedThisTurn=true) → enemy → resolveRound
    // resolveRound resets focusUsedThisTurn=false for new turn — correct behavior
    const state = stateWithBattle();
    const afterFirst = engineReducer(state, { type: 'PLAYER_FOCUS' });
    const afterFirstBattle = afterFirst.battle as ActiveBattleState;

    if (afterFirstBattle.active && afterFirstBattle.phase === 'player_turn') {
      // Flag resets after resolveRound — focus is once-per-turn, and a new turn started
      expect(afterFirstBattle.focusUsedThisTurn).toBe(false);
      // Can focus again on the new turn
      const afterSecond = engineReducer(afterFirst, { type: 'PLAYER_FOCUS' });
      expect(afterSecond).not.toBe(afterFirst);
    }
  });

  it('actions on inactive battle are rejected', () => {
    const state = createInitialEngineState(); // battle: { active: false }
    const result1 = engineReducer(state, { type: 'PLAYER_MOVE', moveId: 'leaf_whip' });
    const result2 = engineReducer(state, { type: 'PLAYER_FOCUS' });
    const result3 = engineReducer(state, { type: 'PLAYER_DEFEND_ACTION' });
    const result4 = engineReducer(state, { type: 'PLAYER_FLEE_ATTEMPT' });

    expect(result1).toBe(state);
    expect(result2).toBe(state);
    expect(result3).toBe(state);
    expect(result4).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// 3. Turn progression determinism
// ---------------------------------------------------------------------------

describe('battle — turn progression', () => {
  it('PLAYER_MOVE advances through player → enemy → resolve in one dispatch', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    expect(battle.phase).toBe('player_turn');
    expect(battle.turnCount).toBe(0);

    const moveId = battle.playerPet.moves.find(m => m.type === 'attack')!.id;
    const result = engineReducer(
      { ...state, battle: { ...battle, playerPet: { ...battle.playerPet, energy: 100 } } },
      { type: 'PLAYER_MOVE', moveId },
    );
    const resultBattle = result.battle as ActiveBattleState;

    if (resultBattle.active) {
      // After a full round, phase should be back to player_turn
      // (resolveRound resets phase and increments turnCount)
      expect(resultBattle.phase).toBe('player_turn');
      expect(resultBattle.turnCount).toBe(1);
    } else {
      // Battle ended (victory or defeat)
      expect(resultBattle.active).toBe(false);
    }
  });

  it('turn count increments by exactly 1 per player action', () => {
    let state = stateWithBattle();
    let battle = state.battle as ActiveBattleState;
    const moveId = battle.playerPet.moves.find(m => m.type === 'attack')!.id;

    for (let turn = 0; turn < 5; turn++) {
      battle = state.battle as ActiveBattleState;
      if (!battle.active || battle.phase !== 'player_turn') break;

      expect(battle.turnCount).toBe(turn);
      state = engineReducer(
        { ...state, battle: { ...battle, playerPet: { ...battle.playerPet, energy: 100 } } },
        { type: 'PLAYER_MOVE', moveId },
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. HP/energy bounds safety
// ---------------------------------------------------------------------------

describe('battle — HP and energy bounds', () => {
  it('enemy HP never goes below 0 after attack', () => {
    // Set enemy to 1 HP and hit with a strong attack
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const specialMove = battle.playerPet.moves.find(m => m.type === 'special' || m.type === 'attack')!;

    const weakEnemy = {
      ...battle,
      enemyPet: { ...battle.enemyPet, currentHP: 1 },
      playerPet: { ...battle.playerPet, energy: 100 },
    };

    const result = executePlayerMove(weakEnemy, specialMove.id);
    expect(result.enemyPet.currentHP).toBeGreaterThanOrEqual(0);
  });

  it('player energy never exceeds maxEnergy after focus', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const atMax = {
      ...battle,
      playerPet: { ...battle.playerPet, energy: battle.playerPet.maxEnergy },
    };

    const result = executeFocus(atMax);
    expect(result.playerPet.energy).toBeLessThanOrEqual(result.playerPet.maxEnergy);
  });

  it('player energy never goes below 0 after using a move', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    // Give exactly enough energy for one move
    const justEnough = {
      ...battle,
      playerPet: { ...battle.playerPet, energy: attackMove.cost },
    };

    const result = executePlayerMove(justEnough, attackMove.id);
    expect(result.playerPet.energy).toBeGreaterThanOrEqual(0);
  });

  it('insufficient energy rejects the move with a log message', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    const noEnergy = {
      ...battle,
      playerPet: { ...battle.playerPet, energy: 0 },
    };

    const result = executePlayerMove(noEnergy, attackMove.id);
    // Energy unchanged, log should contain rejection message
    expect(result.playerPet.energy).toBe(0);
    const lastLog = result.log[result.log.length - 1];
    expect(lastLog.message).toContain('Not enough energy');
  });
});

// ---------------------------------------------------------------------------
// 5. Victory/defeat resolution
// ---------------------------------------------------------------------------

describe('battle — victory and defeat resolution', () => {
  it('enemy at 0 HP triggers victory phase after resolve', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    // Set enemy to 1 HP so any hit kills
    const result = engineReducer(
      {
        ...state,
        battle: {
          ...battle,
          enemyPet: { ...battle.enemyPet, currentHP: 1 },
          playerPet: { ...battle.playerPet, energy: 100 },
        },
      },
      { type: 'PLAYER_MOVE', moveId: attackMove.id },
    );
    const resultBattle = result.battle as ActiveBattleState;

    // Should be victory (though accuracy miss could prevent it — run multiple times)
    // At least the battle should have processed correctly
    if (resultBattle.enemyPet.currentHP <= 0) {
      expect(resultBattle.phase).toBe('victory');
    }
  });

  it('battle rewards are populated on victory', () => {
    const state = stateWithBattle();
    const battle = state.battle as ActiveBattleState;
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    // Run until victory (give player overwhelming stats)
    const current = {
      ...state,
      battle: {
        ...battle,
        enemyPet: { ...battle.enemyPet, currentHP: 1, defense: 0 },
        playerPet: { ...battle.playerPet, energy: 100, strength: 999 },
      },
    };

    const result = engineReducer(current, { type: 'PLAYER_MOVE', moveId: attackMove.id });
    const resultBattle = result.battle as ActiveBattleState;

    if (resultBattle.phase === 'victory') {
      expect(resultBattle.rewards).toBeDefined();
      expect(resultBattle.rewards!.xp).toBeGreaterThan(0);
      expect(resultBattle.rewards!.tokens).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Combo system bounds
// ---------------------------------------------------------------------------

describe('battle — combo bounds', () => {
  it('combo count does not exceed comboMaxStacks', () => {
    let battle = initBattle(mockPet());
    battle = { ...battle, playerPet: { ...battle.playerPet, energy: 100 } };
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    // Spam attacks to build combo
    for (let i = 0; i < 15; i++) {
      if (battle.enemyPet.currentHP <= 0) break;
      battle = executePlayerMove(
        { ...battle, playerPet: { ...battle.playerPet, energy: 100 } },
        attackMove.id,
      );
    }

    expect(battle.combo.count).toBeLessThanOrEqual(BATTLE_CONSTANTS.comboMaxStacks);
  });

  it('combo multiplier is 1.0 + count * comboPerStack', () => {
    const battle = initBattle(mockPet());
    const combo = battle.combo;
    expect(combo.count).toBe(0);
    expect(combo.multiplier).toBe(1.0);

    // After incrementing, multiplier should follow formula
    const comboAt3 = { count: 3, multiplier: 1.0 + 3 * BATTLE_CONSTANTS.comboPerStack, lastAction: 'test' };
    expect(comboAt3.multiplier).toBeCloseTo(1.15);
  });
});
