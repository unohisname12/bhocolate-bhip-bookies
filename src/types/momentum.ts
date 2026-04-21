export type Team = 'player' | 'enemy';
export type PieceRank = 1 | 2 | 3 | 4;
export type MomentumDifficulty = 'easy' | 'medium' | 'hard';

export interface BoardPosition {
  x: number; // column 0-4
  y: number; // row 0-4 (0=top/enemy, 4=bottom/player)
}

export interface MomentumPiece {
  id: string;
  team: Team;
  rank: PieceRank;
  energy: number;
  position: BoardPosition;
  isTemporaryRank4: boolean;
  rank4TurnsRemaining: number;
  previousRank: PieceRank | null;
}

export type BoardGrid = (string | null)[][]; // [row][col], 5x5

export type FlashTriggerReason = 'exact_energy_kill' | 'underdog_win';

export interface FlashMomentPending {
  triggerReason: FlashTriggerReason;
  attackerPieceId: string;
  capturedPieceId: string;
}

export type FlashChoice = 'upgrade' | 'fusion';

export interface FusionTarget {
  pieceId1: string;
  pieceId2: string;
  resultPosition: BoardPosition;
}

export interface ValidMove {
  destination: BoardPosition;
  energyCost: number;
  isAttack: boolean;
  targetPieceId: string | null;
}

export type MomentumPhase =
  | 'player_select'
  | 'player_move'
  | 'animating_move'
  | 'animating_attack'
  | 'resolve_combat'
  | 'flash_sequence'
  | 'flash_choice'
  | 'animating_flash'
  | 'ai_turn'
  | 'animating_ai'
  | 'victory'
  | 'defeat';

export interface MomentumLogEntry {
  turn: number;
  actor: Team;
  message: string;
}

export interface MomentumRewards {
  tokens: number;
  xp: number;
  shards?: number;
}

export type MomentumGameEvent =
  | { type: 'piece_moved'; pieceId: string; from: BoardPosition; to: BoardPosition }
  | { type: 'piece_attacked'; attackerId: string; defenderId: string; position: BoardPosition }
  | { type: 'piece_captured'; capturedId: string; capturedBy: string }
  | { type: 'piece_promoted'; pieceId: string; fromRank: PieceRank; toRank: PieceRank }
  | { type: 'flash_triggered'; reason: FlashTriggerReason; position: BoardPosition }
  | { type: 'flash_upgrade'; pieceId: string; newRank: PieceRank }
  | { type: 'flash_fusion'; consumed: [string, string]; resultId: string; position: BoardPosition }
  | { type: 'rank4_expired'; pieceId: string }
  | { type: 'turn_skipped'; team: Team }
  | { type: 'clutch_triggered'; position: BoardPosition }
  | { type: 'clutch_claimed'; pieceId: string; newRank: PieceRank }
  | { type: 'game_won' }
  | { type: 'game_lost' };

export interface ActiveMomentumState {
  active: true;
  difficulty: MomentumDifficulty;
  phase: MomentumPhase;
  turnCount: number;
  activeTeam: Team;
  pieces: MomentumPiece[];
  board: BoardGrid;
  selectedPieceId: string | null;
  validMoves: ValidMove[];
  flashPending: FlashMomentPending | null;
  flashEligibleForFusion: boolean;
  clutchTile: BoardPosition | null;
  clutchCooldown: number;
  log: MomentumLogEntry[];
  rewards: MomentumRewards | null;
  lastEvent: MomentumGameEvent | null;
}

export interface InactiveMomentumState {
  active: false;
}

export type MomentumState = ActiveMomentumState | InactiveMomentumState;
