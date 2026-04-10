export const NUMBER_MERGE_ROWS = 6;
export const NUMBER_MERGE_COLS = 6;
export const NUMBER_MERGE_START_VALUES = [1, 2, 3, 4, 5] as const;
export const NUMBER_MERGE_MAX_CORRUPTION = 100;

export type NumberMergePetType = string | null;
export type NumberMergeDifficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type NumberMergeTileKind = 'number' | 'corrupt' | 'broken';
export type NumberMergeOverseerActionType = 'warning' | 'claim_gap' | 'corrupt_tile' | 'seal_cell' | 'break_tile' | 'life_loss';
export type NumberMergeGamePhase = 'playing' | 'chain_window' | 'overseer_strike' | 'lost' | 'won';
export type NumberMergeFeedbackTone = 'neutral' | 'success' | 'warning' | 'danger';
export type NumberMergeResolveAction = 'merge' | 'slide';

export interface NumberMergeTile {
  id: string;
  kind: NumberMergeTileKind;
  value: number;
  lockedTurns?: number;
}

export type NumberMergeCell = NumberMergeTile | null;
export type NumberMergeBoard = NumberMergeCell[][];

export interface NumberMergePosition {
  row: number;
  col: number;
}

export interface NumberMergeMove {
  from: NumberMergePosition;
  to: NumberMergePosition;
}

export interface NumberMergePetBonus {
  label: string;
  description: string;
  affectedTileId: string | null;
}

export interface NumberMergeOverseerEvent {
  type: NumberMergeOverseerActionType;
  description: string;
  positions: NumberMergePosition[];
  corruptionDelta: number;
}

export interface NumberMergeFeedback {
  tone: NumberMergeFeedbackTone;
  message: string;
}

export interface NumberMergeResolveResult {
  action: NumberMergeResolveAction;
  board: NumberMergeBoard;
  scoreDelta: number;
  mergeValue: number;
  comboCount: number;
  turnUsed: number;
  createdTileId: string | null;
  createdTileValue: number;
  removedTileIds: string[];
  petBonus: NumberMergePetBonus | null;
  nextPassiveReadyTurn: number | null;
  emptyCells: NumberMergePosition[];
}

export interface NumberMergeGameSnapshot {
  board: NumberMergeBoard;
  score: number;
  turns: number;
  combo: number;
  petType: NumberMergePetType;
  difficulty: NumberMergeDifficulty;
  passiveReadyTurn: number | null;
  lastMove: NumberMergeResolveResult | null;
  phase: NumberMergeGamePhase;
  pressureLevel: number;
  corruption: number;
  chainExpiresAt: number | null;
  chainDurationMs: number;
  unstableCells: NumberMergePosition[];
  lastOverseerEvent: NumberMergeOverseerEvent | null;
  lives: number;
  maxLives: number;
  goalStars: number;
  maxGoalStars: number;
  warningCount: number;
  searchTarget: number;
  turnsRemaining: number | null;
  feedback: NumberMergeFeedback | null;
}
