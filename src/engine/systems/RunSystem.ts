import type { EngineState } from '../../types/engine';
import type { ActiveRunState } from '../../types/run';
import type { ActiveBattleState, ComboState } from '../../types/battle';
import type { TraceBuffState } from '../../types/trace';
import { createEmptyBonuses } from '../../types/run';
import { getEnemyById } from '../../config/runEnemyConfig';
import { generateRewardChoices } from '../../config/runRewardConfig';
import { RUN_LENGTH, getEnemyForEncounter, getRewardsForEncounter, RUN_BALANCE } from '../../config/runConfig';
import { getEventById } from '../../config/runEventConfig';
import { generateRunMap, pickFractureModifier, getSelectableNodes, getNodeById } from './RunMapGenerator';
import { buildRunPlayerPet, buildRunEnemy } from './RunBattleAdapter';
import { selectEnemyIntent } from './BattleAI';
import { createCombatFeelState } from './CombatFeelSystem';
import { addXP } from '../../services/game/evolutionEngine';

const INITIAL_COMBO: ComboState = { count: 0, multiplier: 1.0, lastAction: '' };
const INITIAL_TRACE_BUFFS: TraceBuffState = { shieldTier: null, runeBoostTier: null, mathTraceTier: null };

// --- V1 backward-compat reward effects (used when run has no map) ---

const REWARD_EFFECTS: Record<string, (bonuses: ActiveRunState['bonuses']) => ActiveRunState['bonuses']> = {
  energy_5: (b) => ({ ...b, maxEnergyBonus: b.maxEnergyBonus + 5 }),
  energy_8: (b) => ({ ...b, maxEnergyBonus: b.maxEnergyBonus + 8 }),
  stat_3: (b) => ({ ...b, statBonus: b.statBonus + 3 }),
  stat_5: (b) => ({ ...b, statBonus: b.statBonus + 5 }),
  lifesteal: (b) => ({ ...b, utilityEffects: [...b.utilityEffects, 'lifesteal'] }),
  shield_start: (b) => ({ ...b, utilityEffects: [...b.utilityEffects, 'shield_start'] }),
};

// --- V2 reward effects ---

const V2_REWARD_EFFECTS: Record<string, (bonuses: ActiveRunState['bonuses'], hpPct: number) => { bonuses: ActiveRunState['bonuses']; hpDelta: number }> = {
  energy_5: (b) => ({ bonuses: { ...b, maxEnergyBonus: b.maxEnergyBonus + 5 }, hpDelta: 0 }),
  energy_8: (b) => ({ bonuses: { ...b, maxEnergyBonus: b.maxEnergyBonus + 8 }, hpDelta: 0 }),
  stat_3: (b) => ({ bonuses: { ...b, statBonus: b.statBonus + 3 }, hpDelta: 0 }),
  stat_5: (b) => ({ bonuses: { ...b, statBonus: b.statBonus + 5 }, hpDelta: 0 }),
  lifesteal: (b) => ({ bonuses: { ...b, utilityEffects: [...b.utilityEffects, 'lifesteal'] }, hpDelta: 0 }),
  shield_start: (b) => ({ bonuses: { ...b, utilityEffects: [...b.utilityEffects, 'shield_start'] }, hpDelta: 0 }),
  focus_mastery: (b) => ({ bonuses: { ...b, focusMastery: true }, hpDelta: 0 }),
  trace_focus: (b) => ({ bonuses: { ...b, traceRadiusBonus: b.traceRadiusBonus * 1.25 }, hpDelta: 0 }),
  glass_cannon: (b) => ({ bonuses: { ...b, glassCannon: true }, hpDelta: 0 }),
  echo_strike: (b) => ({ bonuses: { ...b, echoStrikeCounter: 0 }, hpDelta: 0 }), // activates tracking
  fracture_drain: (b) => ({ bonuses: { ...b, fractureDrain: true }, hpDelta: 0 }),
  adaptive_shield: (b) => ({ bonuses: { ...b, adaptiveShieldUsed: false }, hpDelta: 0 }),
  energy_regen: (b) => ({ bonuses: { ...b, energyRegenBonus: b.energyRegenBonus + 2 }, hpDelta: 0 }),
  combo_surge: (b) => ({ bonuses: { ...b, comboGrowthBonus: b.comboGrowthBonus * 1.5 }, hpDelta: 0 }),
  desperate_power: (b) => ({ bonuses: { ...b, desperatePower: true }, hpDelta: 0 }),
  overcharge: (b) => ({ bonuses: { ...b, overchargeActive: true, maxEnergyBonus: b.maxEnergyBonus + 20 }, hpDelta: 0 }),
  recovery_15: (b, hp) => ({ bonuses: b, hpDelta: 0.15 }),
  recovery_25: (b, hp) => ({ bonuses: b, hpDelta: 0.25 }),
};

// Mark echo_strike as active by checking if the reward was chosen
function hasEchoStrike(bonuses: ActiveRunState['bonuses'], rewardsChosen: string[]): boolean {
  return rewardsChosen.includes('echo_strike');
}

// --- State transitions ---

export const startRun = (state: EngineState): EngineState => {
  if (!state.pet || state.pet.state === 'sick' || state.pet.state === 'dead') return state;

  const seed = Date.now();
  const map = generateRunMap(seed);
  const fractureModifier = pickFractureModifier(seed);
  const startInstability = fractureModifier === 'unstable' ? 2 : 0;

  const run: ActiveRunState = {
    active: true,
    currentEncounter: 0,
    phase: 'map_select',
    playerHPPercent: 1.0,
    bonuses: createEmptyBonuses(),
    rewardsChosen: [],
    currentEnemyId: null,
    encountersWon: 0,
    map,
    currentNodeId: null,
    seed,
    instability: startInstability,
    fractureModifier,
    mpEarnedThisRun: 0,
    bossState: {},
  };

  return { ...state, run, screen: 'run_map' };
};

export const selectMapNode = (state: EngineState, nodeId: string): EngineState => {
  if (!state.run.active || state.run.phase !== 'map_select') return state;

  const run = state.run;
  const selectable = getSelectableNodes(run.map, run.currentNodeId);
  const node = selectable.find(n => n.id === nodeId);
  if (!node) return state;

  // Mark node as visited
  const updatedNodes = run.map.nodes.map(n =>
    n.id === nodeId ? { ...n, visited: true } : n
  );
  const updatedMap = { ...run.map, nodes: updatedNodes, currentPath: [...run.map.currentPath, nodeId] };

  if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
    const enemyId = node.enemyId ?? null;
    const updatedRun: ActiveRunState = {
      ...run,
      map: updatedMap,
      currentNodeId: nodeId,
      currentEnemyId: enemyId,
      phase: 'encounter_preview',
    };
    return { ...state, run: updatedRun, screen: 'run_encounter' };
  }

  if (node.type === 'rest') {
    const updatedRun: ActiveRunState = {
      ...run,
      map: updatedMap,
      currentNodeId: nodeId,
      phase: 'rest_node',
    };
    return { ...state, run: updatedRun, screen: 'run_rest' };
  }

  if (node.type === 'event') {
    const updatedRun: ActiveRunState = {
      ...run,
      map: updatedMap,
      currentNodeId: nodeId,
      phase: 'event_choice',
    };
    return { ...state, run: updatedRun, screen: 'run_event' };
  }

  return state;
};

export const startRunBattle = (state: EngineState): EngineState => {
  if (!state.run.active || state.run.phase !== 'encounter_preview') return state;
  if (!state.pet) return state;

  const run = state.run;
  const enemyId = run.currentEnemyId;
  const template = enemyId ? getEnemyById(enemyId) : null;

  // Fallback to V1 enemy lookup if no V2 enemy found
  if (!template) {
    const v1Template = getEnemyForEncounter(run.currentEncounter);
    return startRunBattleWithTemplate(state, run, v1Template);
  }

  return startRunBattleWithTemplate(state, run, template);
};

function startRunBattleWithTemplate(
  state: EngineState,
  run: ActiveRunState,
  template: Parameters<typeof buildRunEnemy>[0],
): EngineState {
  const playerLevel = state.pet!.progression.level;

  const playerPet = buildRunPlayerPet(state.pet!, run.bonuses, run.playerHPPercent, run.fractureModifier, run.instability);
  const enemyPet = buildRunEnemy(template, playerLevel, run.fractureModifier, run.instability);

  const battle: ActiveBattleState = {
    active: true,
    phase: 'player_turn',
    playerPet,
    enemyPet,
    turnCount: 0,
    log: [{ turn: 0, actor: 'player', action: 'battle_start', message: `${enemyPet.name} blocks your path!` }],
    mathBuffActive: false,
    traceBuffs: { ...INITIAL_TRACE_BUFFS },
    combo: { ...INITIAL_COMBO },
    enemyIntent: selectEnemyIntent(enemyPet, playerPet),
    focusUsedThisTurn: false,
    combatFeel: createCombatFeelState(),
  };

  // Reset per-battle flags
  const updatedBonuses = { ...run.bonuses, adaptiveShieldUsed: false, echoStrikeCounter: 0 };
  const updatedRun: ActiveRunState = { ...run, phase: 'in_battle', bonuses: updatedBonuses, bossState: {} };

  return { ...state, battle, run: updatedRun, screen: 'battle' };
}

export const handleRunVictory = (state: EngineState): EngineState => {
  if (!state.run.active) return state;
  if (!state.battle.active) return state;

  const run = state.run;
  const battle = state.battle;

  // Capture HP percent from battle result
  let hpPercent = battle.playerPet.currentHP / battle.playerPet.maxHP;

  // Lifesteal: heal 15% of enemy's max HP
  if (run.bonuses.utilityEffects.includes('lifesteal')) {
    hpPercent = Math.min(1, hpPercent + (battle.enemyPet.maxHP * 0.15) / battle.playerPet.maxHP);
  }

  // Fracture drain: heal 8% of maxHP on win
  if (run.bonuses.fractureDrain) {
    hpPercent = Math.min(1, hpPercent + 0.08);
  }

  const encountersWon = run.encountersWon + 1;
  const instability = run.instability + 1; // +1 per combat completed

  // Check if boss was beaten
  const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
  const isBossBeaten = currentNode?.type === 'boss' || run.currentEncounter >= RUN_LENGTH - 1;

  if (isBossBeaten) {
    const updatedRun: ActiveRunState = {
      ...run,
      phase: 'run_victory',
      playerHPPercent: hpPercent,
      encountersWon,
      instability,
    };
    return { ...state, battle: { active: false }, run: updatedRun, screen: 'run_over' };
  }

  // Determine reward tier from current node
  const rewardTier = currentNode?.rewardTier ?? 'common';

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'reward_pick',
    playerHPPercent: hpPercent,
    encountersWon,
    instability,
    currentEncounter: run.currentEncounter + 1,
  };
  return { ...state, battle: { active: false }, run: updatedRun, screen: 'run_reward' };
};

export const handleRunDefeat = (state: EngineState): EngineState => {
  if (!state.run.active) return state;

  const updatedRun: ActiveRunState = {
    ...state.run,
    phase: 'run_defeat',
  };
  return { ...state, battle: { active: false }, run: updatedRun, screen: 'run_over' };
};

export const selectRunReward = (state: EngineState, rewardId: string): EngineState => {
  if (!state.run.active || state.run.phase !== 'reward_pick') return state;

  const run = state.run;

  // Try V2 reward effect first
  const v2Effect = V2_REWARD_EFFECTS[rewardId];
  let newBonuses = run.bonuses;
  let hpDelta = 0;

  if (v2Effect) {
    const result = v2Effect(run.bonuses, run.playerHPPercent);
    newBonuses = result.bonuses;
    hpDelta = result.hpDelta;
  } else {
    // Fallback to V1 reward effect
    const v1Effect = REWARD_EFFECTS[rewardId];
    if (v1Effect) {
      newBonuses = v1Effect(run.bonuses);
    }
  }

  const newHpPercent = Math.min(1, run.playerHPPercent + hpDelta);

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'map_select',
    bonuses: newBonuses,
    rewardsChosen: [...run.rewardsChosen, rewardId],
    playerHPPercent: newHpPercent,
  };

  return { ...state, run: updatedRun, screen: 'run_map' };
};

export const handleRestLight = (state: EngineState): EngineState => {
  if (!state.run.active || state.run.phase !== 'rest_node') return state;

  const run = state.run;
  const newHpPercent = Math.min(1, run.playerHPPercent + RUN_BALANCE.REST_SAFE_HEAL);
  const instability = Math.max(0, run.instability - 1);

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'map_select',
    playerHPPercent: newHpPercent,
    instability,
  };

  return { ...state, run: updatedRun, screen: 'run_map' };
};

export const handleRestStabilize = (state: EngineState, tier: string): EngineState => {
  if (!state.run.active || state.run.phase !== 'rest_node') return state;

  const run = state.run;
  const healAmount = RUN_BALANCE.STABILIZE_TIERS[tier as keyof typeof RUN_BALANCE.STABILIZE_TIERS] ?? RUN_BALANCE.STABILIZE_TIERS.miss;
  const newHpPercent = Math.min(1, run.playerHPPercent + healAmount);
  const instability = Math.max(0, run.instability - 1);

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'map_select',
    playerHPPercent: newHpPercent,
    instability,
  };

  return { ...state, run: updatedRun, screen: 'run_map' };
};

export const handleRestFortify = (state: EngineState): EngineState => {
  if (!state.run.active || state.run.phase !== 'rest_node') return state;

  const run = state.run;
  const instability = Math.max(0, run.instability - 1);

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'map_select',
    bonuses: {
      ...run.bonuses,
      nextFightDefenseBuff: 2,
      nextFightEnergyBonus: 10,
    },
    instability,
  };

  return { ...state, run: updatedRun, screen: 'run_map' };
};

export const handleEventChoice = (state: EngineState, choiceIndex: number): EngineState => {
  if (!state.run.active || state.run.phase !== 'event_choice') return state;

  const run = state.run;
  const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
  const eventId = currentNode?.eventId;
  if (!eventId) return state;

  const event = getEventById(eventId);
  if (!event || choiceIndex < 0 || choiceIndex >= event.choices.length) return state;

  const effect = event.resolve(choiceIndex, run.seed);

  let newBonuses = run.bonuses;
  if (effect.bonusMod) {
    newBonuses = effect.bonusMod(newBonuses);
  }

  const newHpPercent = Math.max(0, Math.min(1, run.playerHPPercent + effect.hpDelta));

  const updatedRun: ActiveRunState = {
    ...run,
    phase: 'map_select',
    bonuses: newBonuses,
    playerHPPercent: newHpPercent,
  };

  return { ...state, run: updatedRun, screen: 'run_map' };
};

export const endRun = (state: EngineState): EngineState => {
  if (!state.run.active) return { ...state, run: { active: false }, battle: { active: false }, screen: 'home' };

  const run = state.run;
  const playerLevel = state.pet?.progression.level ?? 1;

  // Rewards scale with encounters won and player level
  const tokenReward = run.encountersWon * playerLevel * 5;
  const xpReward = run.encountersWon * playerLevel * 8;

  let pet = state.pet;
  if (pet && xpReward > 0) {
    pet = addXP(pet, xpReward);
  }

  return {
    ...state,
    run: { active: false },
    battle: { active: false },
    screen: 'home',
    pet,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        tokens: state.player.currencies.tokens + tokenReward,
      },
    },
  };
};
