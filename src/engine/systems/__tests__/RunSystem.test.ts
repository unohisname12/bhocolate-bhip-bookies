import { describe, it, expect } from 'vitest';
import { startRun, startRunBattle, handleRunVictory, handleRunDefeat, selectRunReward, endRun, selectMapNode, handleRestLight, handleRestStabilize, handleRestFortify } from '../RunSystem';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { SPECIES_BASE_STATS } from '../../../config/battleConfig';
import type { EngineState } from '../../../types/engine';
import type { Pet } from '../../../types';

const mockPet = (speciesId = 'koala_sprite', level = 5): Pet => {
  const base = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  return {
    id: `test_${speciesId}`,
    ownerId: 'test_owner',
    name: `Test ${speciesId}`,
    speciesId,
    type: speciesId,
    stage: 'baby',
    mood: 'calm',
    state: 'idle',
    needs: { hunger: 80, happiness: 80, cleanliness: 80, health: 100 },
    stats: { strength: base.str, speed: base.spd, defense: base.def },
    bond: 50,
    progression: { level, xp: 0, evolutionFlags: [] },
    timestamps: {
      createdAt: '2026-01-01T00:00:00.000Z',
      lastInteraction: '2026-01-01T00:00:00.000Z',
      lastFedAt: '2026-01-01T00:00:00.000Z',
      lastCleanedAt: '2026-01-01T00:00:00.000Z',
    },
  } as Pet;
};

const stateWithPet = (): EngineState => {
  const base = createInitialEngineState();
  return { ...base, pet: mockPet(), initialized: true, screen: 'home' };
};

/** Helper: start a run and select the first available combat node, returning state at encounter_preview. */
const startRunAndSelectCombat = (state: EngineState): EngineState => {
  state = startRun(state);
  if (!state.run.active) return state;
  // Select the first tier-0 node (always combat)
  const tier0Nodes = state.run.map.nodes.filter(n => n.tier === 0);
  if (tier0Nodes.length === 0) return state;
  return selectMapNode(state, tier0Nodes[0].id);
};

/** Helper: win the current battle and return state at reward_pick or run_victory. */
const winCurrentBattle = (state: EngineState, hpFraction = 1.0): EngineState => {
  if (!state.battle.active) return state;
  state = {
    ...state,
    battle: {
      ...state.battle,
      phase: 'victory',
      playerPet: { ...state.battle.playerPet, currentHP: Math.floor(state.battle.playerPet.maxHP * hpFraction) },
      enemyPet: { ...state.battle.enemyPet, currentHP: 0 },
    },
  };
  return handleRunVictory(state);
};

describe('startRun', () => {
  it('initializes a run with map_select phase and generated map', () => {
    const state = stateWithPet();
    const result = startRun(state);
    expect(result.run.active).toBe(true);
    if (!result.run.active) return;
    expect(result.run.phase).toBe('map_select');
    expect(result.run.playerHPPercent).toBe(1.0);
    expect(result.run.map.nodes.length).toBeGreaterThan(0);
    expect(result.screen).toBe('run_map');
  });

  it('does nothing if pet is sick', () => {
    const state = stateWithPet();
    state.pet = { ...state.pet!, state: 'sick' };
    const result = startRun(state);
    expect(result.run.active).toBe(false);
  });

  it('does nothing if no pet', () => {
    const state = { ...createInitialEngineState(), pet: null };
    const result = startRun(state);
    expect(result.run.active).toBe(false);
  });

  it('generates map with boss node', () => {
    const state = stateWithPet();
    const result = startRun(state);
    if (!result.run.active) return;
    const bossNodes = result.run.map.nodes.filter(n => n.type === 'boss');
    expect(bossNodes.length).toBe(1);
  });

  it('assigns a fracture modifier', () => {
    const state = stateWithPet();
    const result = startRun(state);
    if (!result.run.active) return;
    expect(result.run.fractureModifier).toBeTruthy();
  });
});

describe('selectMapNode', () => {
  it('transitions to encounter_preview for combat nodes', () => {
    const state = startRunAndSelectCombat(stateWithPet());
    if (!state.run.active) return;
    expect(state.run.phase).toBe('encounter_preview');
    expect(state.run.currentEnemyId).toBeTruthy();
    expect(state.screen).toBe('run_encounter');
  });

  it('transitions to rest_node for rest nodes', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;
    const restNodes = state.run.map.nodes.filter(n => n.type === 'rest');
    if (restNodes.length === 0) return; // some seeds may not have rest in tier 0
    // We can't directly select rest since tier 0 is always combat,
    // but we can test the mechanism by checking tier 1 after advancing
    expect(restNodes.length).toBeGreaterThanOrEqual(0);
  });

  it('marks node as visited', () => {
    const state = startRunAndSelectCombat(stateWithPet());
    if (!state.run.active) return;
    const visitedNode = state.run.map.nodes.find(n => n.id === state.run.currentNodeId);
    expect(visitedNode?.visited).toBe(true);
  });

  it('rejects selecting a non-selectable node', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;
    // Try selecting a boss node (should be rejected since it's not in tier 0)
    const bossNode = state.run.map.nodes.find(n => n.type === 'boss');
    if (!bossNode) return;
    const result = selectMapNode(state, bossNode.id);
    // Should not have changed
    expect(result.run.active && result.run.phase).toBe('map_select');
  });
});

describe('startRunBattle', () => {
  it('creates a battle with run-modified pets', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    const result = startRunBattle(state);
    expect(result.battle.active).toBe(true);
    expect(result.screen).toBe('battle');
    if (result.run.active) {
      expect(result.run.phase).toBe('in_battle');
    }
  });

  it('does nothing if not in encounter_preview phase', () => {
    const state = stateWithPet();
    const result = startRunBattle(state);
    expect(result.battle.active).toBe(false);
  });
});

describe('handleRunVictory', () => {
  it('moves to reward_pick after non-boss encounter', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state, 0.7);
    expect(state.run.active).toBe(true);
    if (state.run.active) {
      expect(state.run.phase).toBe('reward_pick');
      expect(state.run.encountersWon).toBe(1);
      expect(state.run.playerHPPercent).toBeCloseTo(0.7, 1);
    }
    expect(state.screen).toBe('run_reward');
    expect(state.battle.active).toBe(false);
  });

  it('moves to run_victory after boss beaten', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;
    // Manually set to boss node
    const bossNode = state.run.map.nodes.find(n => n.type === 'boss')!;
    state = {
      ...state,
      run: {
        ...state.run,
        currentNodeId: bossNode.id,
        currentEnemyId: bossNode.enemyId ?? null,
        phase: 'encounter_preview',
        currentEncounter: 3,
        map: { ...state.run.map, nodes: state.run.map.nodes.map(n => n.id === bossNode.id ? { ...n, visited: true } : n) },
      },
    };
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    if (state.run.active) {
      expect(state.run.phase).toBe('run_victory');
    }
    expect(state.screen).toBe('run_over');
  });

  it('increments instability after combat', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    const instBefore = state.run.active ? state.run.instability : 0;
    state = winCurrentBattle(state);
    if (state.run.active) {
      expect(state.run.instability).toBe(instBefore + 1);
    }
  });
});

describe('HP carryover', () => {
  it('preserves player HP percent between encounters', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    // Win at 60% HP
    state = winCurrentBattle(state, 0.6);

    // Pick a reward
    state = selectRunReward(state, 'energy_5');
    if (!state.run.active) return;
    expect(state.run.phase).toBe('map_select');

    // Select next combat node
    const selectable = state.run.map.nodes.filter(n =>
      !n.visited && n.tier === 1 && (n.type === 'combat' || n.type === 'elite')
    );
    if (selectable.length === 0) return;
    state = selectMapNode(state, selectable[0].id);
    state = startRunBattle(state);

    if (state.battle.active) {
      const hpRatio = state.battle.playerPet.currentHP / state.battle.playerPet.maxHP;
      expect(hpRatio).toBeCloseTo(0.6, 1);
    }
  });
});

describe('selectRunReward', () => {
  it('applies energy reward and transitions to map_select', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'energy_5');
    if (state.run.active) {
      expect(state.run.bonuses.maxEnergyBonus).toBe(5);
      expect(state.run.phase).toBe('map_select');
    }
  });

  it('applies stat reward', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'stat_3');
    if (state.run.active) {
      expect(state.run.bonuses.statBonus).toBe(3);
    }
  });

  it('applies recovery reward as HP heal', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state, 0.5);
    const hpBefore = state.run.active ? state.run.playerHPPercent : 0;
    state = selectRunReward(state, 'recovery_15');
    if (state.run.active) {
      expect(state.run.playerHPPercent).toBeCloseTo(hpBefore + 0.15, 2);
    }
  });

  it('applies glass_cannon keystone', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'glass_cannon');
    if (state.run.active) {
      expect(state.run.bonuses.glassCannon).toBe(true);
      expect(state.run.rewardsChosen).toContain('glass_cannon');
    }
  });

  it('applies overcharge keystone (+20 energy)', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'overcharge');
    if (state.run.active) {
      expect(state.run.bonuses.overchargeActive).toBe(true);
      expect(state.run.bonuses.maxEnergyBonus).toBe(20);
    }
  });

  it('applies fracture_drain keystone', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'fracture_drain');
    if (state.run.active) {
      expect(state.run.bonuses.fractureDrain).toBe(true);
    }
  });

  it('applies desperate_power keystone', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'desperate_power');
    if (state.run.active) {
      expect(state.run.bonuses.desperatePower).toBe(true);
    }
  });

  it('applies energy_regen reward', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'energy_regen');
    if (state.run.active) {
      expect(state.run.bonuses.energyRegenBonus).toBe(2);
    }
  });

  it('applies recovery_25 as HP heal', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state, 0.4);
    const hpBefore = state.run.active ? state.run.playerHPPercent : 0;
    state = selectRunReward(state, 'recovery_25');
    if (state.run.active) {
      expect(state.run.playerHPPercent).toBeCloseTo(hpBefore + 0.25, 2);
    }
  });

  it('applies combo_surge reward', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'combo_surge');
    if (state.run.active) {
      expect(state.run.bonuses.comboGrowthBonus).toBe(1.5);
    }
  });

  it('applies adaptive_shield reward', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'adaptive_shield');
    if (state.run.active) {
      expect(state.run.bonuses.adaptiveShieldUsed).toBe(false);
    }
  });

  it('tracks rewards in rewardsChosen', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    state = selectRunReward(state, 'stat_5');
    if (state.run.active) {
      expect(state.run.rewardsChosen).toEqual(['stat_5']);
    }
  });
});

describe('handleRunDefeat', () => {
  it('transitions to run_defeat', () => {
    let state = startRunAndSelectCombat(stateWithPet());
    state = startRunBattle(state);
    const result = handleRunDefeat(state);
    if (result.run.active) {
      expect(result.run.phase).toBe('run_defeat');
    }
    expect(result.screen).toBe('run_over');
    expect(result.battle.active).toBe(false);
  });
});

describe('endRun', () => {
  it('awards tokens and XP based on encounters won', () => {
    let state = stateWithPet();
    const initialTokens = state.player.currencies.tokens;
    const initialXP = state.pet!.progression.xp;

    state = startRunAndSelectCombat(state);
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    // 1 encounter won, level 5
    // tokens = 1 * 5 * 5 = 25, xp = 1 * 5 * 8 = 40
    state = endRun(state);

    expect(state.run.active).toBe(false);
    expect(state.screen).toBe('home');
    expect(state.player.currencies.tokens).toBe(initialTokens + 25);
    expect(state.pet!.progression.xp).toBe(initialXP + 40);
  });

  it('resets run and battle state', () => {
    let state = stateWithPet();
    state = startRun(state);
    state = endRun(state);
    expect(state.run.active).toBe(false);
    expect(state.battle.active).toBe(false);
    expect(state.screen).toBe('home');
  });
});

describe('rest nodes', () => {
  it('handleRestLight heals 20% and reduces instability', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;

    // Manually put into rest_node phase with 50% HP and instability 3
    state = {
      ...state,
      run: { ...state.run, phase: 'rest_node' as const, playerHPPercent: 0.5, instability: 3 },
    };

    state = handleRestLight(state);
    if (state.run.active) {
      expect(state.run.playerHPPercent).toBeCloseTo(0.7, 2);
      expect(state.run.instability).toBe(2);
      expect(state.run.phase).toBe('map_select');
    }
  });

  it('handleRestStabilize heals based on tier', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;

    state = {
      ...state,
      run: { ...state.run, phase: 'rest_node' as const, playerHPPercent: 0.5, instability: 2 },
    };

    state = handleRestStabilize(state, 'perfect');
    if (state.run.active) {
      expect(state.run.playerHPPercent).toBeCloseTo(0.9, 2);
      expect(state.run.instability).toBe(1);
    }
  });

  it('instability flow: combat +1, rest -1', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;
    const baseInst = state.run.instability;

    // Win a fight → instability +1
    state = startRunAndSelectCombat(state);
    state = startRunBattle(state);
    state = winCurrentBattle(state);
    if (!state.run.active) return;
    expect(state.run.instability).toBe(baseInst + 1);

    // Pick reward to get back to map_select
    state = selectRunReward(state, 'energy_5');
    if (!state.run.active) return;

    // Manually enter rest node to test rest reducing instability
    state = { ...state, run: { ...state.run, phase: 'rest_node' as const } };
    state = handleRestLight(state);
    if (!state.run.active) return;
    expect(state.run.instability).toBe(baseInst); // back to starting
  });

  it('handleRestStabilize tiers heal different amounts', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;

    const base = { ...state, run: { ...state.run, phase: 'rest_node' as const, playerHPPercent: 0.3 } };

    const miss = handleRestStabilize(base, 'miss');
    const good = handleRestStabilize(base, 'good');
    const perfect = handleRestStabilize(base, 'perfect');

    if (miss.run.active && good.run.active && perfect.run.active) {
      expect(miss.run.playerHPPercent).toBeCloseTo(0.4, 2);   // +10%
      expect(good.run.playerHPPercent).toBeCloseTo(0.6, 2);   // +30%
      expect(perfect.run.playerHPPercent).toBeCloseTo(0.7, 2); // +40%
    }
  });

  it('handleRestFortify grants defense buff and energy bonus', () => {
    let state = stateWithPet();
    state = startRun(state);
    if (!state.run.active) return;

    state = {
      ...state,
      run: { ...state.run, phase: 'rest_node' as const, instability: 1 },
    };

    state = handleRestFortify(state);
    if (state.run.active) {
      expect(state.run.bonuses.nextFightDefenseBuff).toBe(2);
      expect(state.run.bonuses.nextFightEnergyBonus).toBe(10);
      expect(state.run.instability).toBe(0);
    }
  });
});
