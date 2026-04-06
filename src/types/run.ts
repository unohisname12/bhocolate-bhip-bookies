import type { BattleMove } from './battle';

// --- Phases ---

export type RunPhase =
  | 'not_started'
  | 'map_select'
  | 'encounter_preview'
  | 'in_battle'
  | 'reward_pick'
  | 'rest_node'
  | 'event_choice'
  | 'run_victory'
  | 'run_defeat';

// --- Enemy templates ---

export type EnemyBehavior = 'aggressive' | 'defensive' | 'boss';

export type EnemyPassiveEffect =
  | 'energy_drain'
  | 'damage_reflect'
  | 'scaling'
  | 'regen'
  | 'frenzy'
  | 'glitch'
  | 'phase_shift'
  | 'fortified'
  | 'entropy_punish'
  | 'void_pulse'
  | 'fracture_shell'
  | 'equation_storm';

export interface RunEnemyTemplate {
  id: string;
  name: string;
  speciesId: string;
  behavior: EnemyBehavior;
  statScale: number;
  hpScale: number;
  description: string;
  tier: 1 | 2 | 3 | 'boss';
  passiveEffect?: EnemyPassiveEffect;
  passiveValue?: number;
  counterplayHint?: string;
}

// --- Rewards ---

export type RunRewardCategory = 'energy' | 'stat' | 'utility' | 'trace' | 'recovery' | 'keystone';

export interface RunRewardOption {
  id: string;
  category: RunRewardCategory;
  name: string;
  description: string;
  icon: string;
  tier: 'common' | 'rare' | 'elite';
}

// --- Run bonuses ---

export interface RunBonuses {
  maxEnergyBonus: number;
  statBonus: number;
  utilityEffects: string[];
  // V2 additions
  energyRegenBonus: number;     // +N energy per turn
  traceRadiusBonus: number;     // multiplier on hit radius (1.0 = normal)
  comboGrowthBonus: number;     // multiplier on combo stack rate (1.0 = normal)
  regenPerTurn: number;         // HP fraction healed at start of each turn
  thornsFraction: number;       // damage reflection fraction (0 = none)
  glassCannon: boolean;         // +30% dmg dealt, +15% dmg taken
  echoStrikeCounter: number;    // counts attacks, every 3rd = 1.5x
  desperatePower: boolean;      // bonus STR based on missing HP
  overchargeActive: boolean;    // +20 max energy, lose 2% maxHP/turn
  focusMastery: boolean;        // Focus grants +15 energy, buffs next attack
  adaptiveShieldUsed: boolean;  // per-battle flag: first big hit reduced
  fractureDrain: boolean;       // heal 8% maxHP on battle win
  nextFightDefenseBuff: number; // turns of 1.5x DEF from rest fortify
  nextFightEnergyBonus: number; // bonus starting energy from rest fortify
}

// --- Map ---

export type RunNodeType = 'combat' | 'elite' | 'rest' | 'event' | 'boss';

export interface RunMapNode {
  id: string;
  tier: number;           // 0 = tier 1, 1 = tier 2, 2 = tier 3, 3 = boss
  type: RunNodeType;
  enemyId?: string;
  eventId?: string;
  rewardTier: 'common' | 'rare' | 'elite';
  connections: string[];  // node IDs this connects to (next tier)
  visited: boolean;
}

export interface RunMap {
  nodes: RunMapNode[];
  currentPath: string[];  // visited node IDs in order
}

// --- Fracture Modifiers ---

export type FractureModifierId =
  | 'volatile'
  | 'resilient'
  | 'resonant'
  | 'draining'
  | 'generous'
  | 'unstable';

export interface FractureModifier {
  id: FractureModifierId;
  name: string;
  description: string;
}

// --- Run State ---

export interface ActiveRunState {
  active: true;
  currentEncounter: number;
  phase: RunPhase;
  playerHPPercent: number;  // 0-1
  bonuses: RunBonuses;
  rewardsChosen: string[];
  currentEnemyId: string | null;
  encountersWon: number;
  // V2 additions
  map: RunMap;
  currentNodeId: string | null;
  seed: number;
  instability: number;
  fractureModifier: FractureModifierId;
  mpEarnedThisRun: number;
  bossState: {
    turnsSinceLastPulse?: number;
    phaseShifted?: boolean;
    traceCounter?: number;
  };
}

export interface InactiveRunState {
  active: false;
}

export type RunState = ActiveRunState | InactiveRunState;

// --- Default bonuses factory ---

export const createEmptyBonuses = (): RunBonuses => ({
  maxEnergyBonus: 0,
  statBonus: 0,
  utilityEffects: [],
  energyRegenBonus: 0,
  traceRadiusBonus: 1.0,
  comboGrowthBonus: 1.0,
  regenPerTurn: 0,
  thornsFraction: 0,
  glassCannon: false,
  echoStrikeCounter: 0,
  desperatePower: false,
  overchargeActive: false,
  focusMastery: false,
  adaptiveShieldUsed: false,
  fractureDrain: false,
  nextFightDefenseBuff: 0,
  nextFightEnergyBonus: 0,
});
