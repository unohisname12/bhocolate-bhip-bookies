import type { PieceRank, MomentumDifficulty } from '../types/momentum';

export const MOMENTUM_BOARD = {
  gridSize: 5,
  piecesPerSide: 3,
} as const;

export const DIFFICULTY_SETTINGS: Record<MomentumDifficulty, {
  enemyRanks: PieceRank[];
  maxTurns: number;
  label: string;
}> = {
  easy:   { enemyRanks: [1, 1, 1], maxTurns: 60, label: 'Easy' },
  medium: { enemyRanks: [1, 2, 1], maxTurns: 50, label: 'Medium' },
  hard:   { enemyRanks: [2, 2, 1], maxTurns: 40, label: 'Hard' },
};

export const RANK_ENERGY: Record<number, { gain: number; max: number }> = {
  1: { gain: 1, max: 2 },
  2: { gain: 2, max: 4 },
  3: { gain: 3, max: 6 },
  4: { gain: 4, max: 4 },
};

export const RANK4_DURATION = 2;

export const MOMENTUM_REWARDS = {
  baseTokens: 30,
  perTurnBonus: 2,
  baseXP: 20,
  /** Shards are the dedicated reward — Momentum = shard farm. */
  baseShards: 5,
  /** Harder difficulties give more shards; indexed by MomentumDifficulty. */
  difficultyShardBonus: { easy: 0, medium: 2, hard: 5 } as const,
} as const;

export const STARTING_COLUMNS = [0, 2, 4] as const;
export const STARTING_RANKS: PieceRank[] = [1, 2, 1];
export const PLAYER_START_ROW = 4;
export const ENEMY_START_ROW = 0;

/** Clutch Event — comeback mechanic when player is outnumbered */
export const CLUTCH_EVENT = {
  /** Enemy must have at least this many more pieces than player */
  pieceDeficit: 2,
  /** Turns of cooldown after a clutch tile is claimed */
  cooldownTurns: 3,
  /** Max rank a piece can be to receive the +1 upgrade (caps at rank 4) */
  maxUpgradeRank: 3,
} as const;

export const MOMENTUM_ANIMATION = {
  pieceMoveMsPerTile: 150,
  attackImpactMs: 400,
  boardShakeMs: 300,
  capturedFadeMs: 300,
  fusionMergeMs: 600,
  aiTurnDelayMs: 500,
  flashSequence: {
    freezeMs: 200,
    zoomMs: 300,
    burstMs: 400,
    titleMs: 600,
    resolveMs: 500,
  },
} as const;

/** Advanced adds space and tactical actions without changing school math level. */
export const ADVANCED_COLUMNS = [0, 1, 3, 5, 6];
export const ADVANCED_RANKS: PieceRank[] = [1, 2, 3, 2, 1];
export const ENERGY_STATIONS = [{ x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }];
export const momentumSize = (mode?: string) => mode === 'advanced' || mode === 'powers' ? 7 : 5;
export const momentumTurnLimit = (difficulty: MomentumDifficulty, mode?: string) => mode === 'powers' ? 60 : DIFFICULTY_SETTINGS[difficulty].maxTurns + (mode === 'advanced' ? 30 : 0);
