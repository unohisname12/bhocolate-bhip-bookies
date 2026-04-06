export interface BattleMove {
  id: string;
  name: string;
  type: 'attack' | 'defend' | 'special' | 'heal';
  power: number;
  accuracy: number; // 0-100
  cost: number;     // energy cost
  description: string;
  effectId?: string; // optional per-move combat effect (maps to MOVE_EFFECTS in useBattleSequence)
}

export interface Buff {
  stat: 'strength' | 'speed' | 'defense';
  multiplier: number;
  turnsRemaining: number;
}

export interface BattlePet {
  petId: string;
  name: string;
  speciesId: string;
  level: number;
  maxHP: number;
  currentHP: number;
  energy: number;
  maxEnergy: number;
  strength: number;
  speed: number;
  defense: number;
  moves: BattleMove[];
  buffs: Buff[];
}

export interface BattleLogEntry {
  turn: number;
  actor: 'player' | 'enemy';
  action: string;
  damage?: number;
  message: string;
}

export type EnemyIntentType = 'ATTACK' | 'HEAVY_ATTACK' | 'DEFEND' | 'BUFF' | 'HEAL';

export interface EnemyIntent {
  type: EnemyIntentType;
  moveId: string;
  label: string;
  icon?: string;
}

export interface ComboState {
  count: number;
  multiplier: number;    // 1 + (count * comboPerStack)
  lastAction: string;
}

// ---------------------------------------------------------------------------
// Combat Feel State — tracks combo streak, glitch meter, trace focus, etc.
// ---------------------------------------------------------------------------

export interface CombatFeelState {
  /** Persistent combo counter (0-5), separate from BattleSystem's per-turn combo */
  combo: number;
  /** Glitch meter (0-100) — rises on damage/misses, falls on good traces */
  glitchMeter: number;
  /** Trace focus charges (0-3) — spent on traces, regained on good/perfect */
  focusCharges: number;
  /** Whether a weak point is currently exposed on the enemy */
  weakPointActive: boolean;
  /** Whether the one-time collapse (last stand) has been used */
  collapseUsed: boolean;
  /** Whether collapse is currently being resolved (waiting for trace) */
  collapseTriggered: boolean;
}

export interface BattleRewards {
  tokens: number;
  xp: number;
  coins?: number;
  pvpTokensTransferred?: number;
}

export type BattlePhase =
  | 'setup'
  | 'player_turn'
  | 'enemy_turn'
  | 'resolve'
  | 'victory'
  | 'defeat';

export interface ActiveBattleState {
  active: true;
  phase: BattlePhase;
  playerPet: BattlePet;
  enemyPet: BattlePet;
  turnCount: number;
  log: BattleLogEntry[];
  rewards?: BattleRewards;
  mathBuffActive: boolean; // next attack does 1.5x if true
  traceBuffs: import('./trace').TraceBuffState;
  combo: ComboState;
  enemyIntent: EnemyIntent | null;
  focusUsedThisTurn: boolean;
  combatFeel?: CombatFeelState;
  pvpMeta?: {
    opponentId: string;
    opponentDisplayName: string;
    ticketId: string;
    tokenStake: number;
    isNPCSimulated: boolean;
  };
}

export interface InactiveBattleState {
  active: false;
}

export type BattleState = ActiveBattleState | InactiveBattleState;
