import type { PieceRank } from '../../../types/momentum';

export interface TileTheme {
  baseColor: string;
  borderColor: string;
  shadowInset: string;
  highlightMove: string;
  highlightAttack: string;
  texture?: string;
}

export interface PieceTheme {
  bodyGradient: string;
  glowColor: string;
  shadowColor: string;
  sprite?: string;
}

export interface BoardTheme {
  name: string;
  backdrop: string;
  boardBorder: string;
  boardShadow: string;
  boardBg: string;
  gridGap: number;
  tileTypes: Record<string, TileTheme>;
  tileLayout: string[][];
  playerPiece: PieceTheme;
  enemyPiece: PieceTheme;
  rankBadgeColors: Record<PieceRank, string>;
  pieceScales: Record<PieceRank, number>;
}

// Default theme
export const TWILIGHT_ARENA: BoardTheme = {
  name: 'Twilight Arena',
  backdrop: 'radial-gradient(ellipse at 50% 40%, rgba(30, 40, 80, 0.6), rgba(15, 23, 42, 0.95))',
  boardBorder: '1px solid rgba(100, 130, 255, 0.15)',
  boardShadow: '0 0 40px rgba(0, 0, 0, 0.6), 0 0 2px rgba(100, 130, 255, 0.15)',
  boardBg: 'linear-gradient(180deg, rgba(20, 25, 40, 0.9) 0%, rgba(15, 18, 30, 0.95) 100%)',
  gridGap: 2,
  tileTypes: {
    grass: {
      baseColor: 'linear-gradient(135deg, rgba(34, 85, 34, 0.7), rgba(28, 70, 28, 0.8))',
      borderColor: 'rgba(34, 85, 34, 0.3)',
      shadowInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
      highlightMove: 'rgba(34, 197, 94, 0.35)',
      highlightAttack: 'rgba(239, 68, 68, 0.35)',
    },
    stone: {
      baseColor: 'linear-gradient(135deg, rgba(71, 85, 105, 0.7), rgba(51, 65, 85, 0.8))',
      borderColor: 'rgba(71, 85, 105, 0.3)',
      shadowInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.35)',
      highlightMove: 'rgba(34, 197, 94, 0.35)',
      highlightAttack: 'rgba(239, 68, 68, 0.35)',
    },
    crystal: {
      baseColor: 'linear-gradient(135deg, rgba(67, 56, 121, 0.7), rgba(49, 46, 105, 0.8))',
      borderColor: 'rgba(99, 102, 241, 0.25)',
      shadowInset: 'inset 0 1px 3px rgba(99, 102, 241, 0.15)',
      highlightMove: 'rgba(34, 197, 94, 0.35)',
      highlightAttack: 'rgba(239, 68, 68, 0.35)',
    },
    dirt: {
      baseColor: 'linear-gradient(135deg, rgba(87, 65, 40, 0.7), rgba(70, 52, 32, 0.8))',
      borderColor: 'rgba(87, 65, 40, 0.3)',
      shadowInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
      highlightMove: 'rgba(34, 197, 94, 0.35)',
      highlightAttack: 'rgba(239, 68, 68, 0.35)',
    },
  },
  tileLayout: [
    ['dirt',  'grass', 'stone', 'grass', 'dirt'],
    ['grass', 'stone', 'grass', 'stone', 'grass'],
    ['stone', 'grass', 'crystal', 'grass', 'stone'],
    ['grass', 'stone', 'grass', 'stone', 'grass'],
    ['dirt',  'grass', 'stone', 'grass', 'dirt'],
  ],
  playerPiece: {
    bodyGradient: 'radial-gradient(circle at 40% 35%, #67e8f9, #0891b2, #164e63)',
    glowColor: 'rgba(103, 232, 249, 0.6)',
    shadowColor: 'rgba(8, 145, 178, 0.3)',
  },
  enemyPiece: {
    bodyGradient: 'radial-gradient(circle at 40% 35%, #fca5a5, #dc2626, #7f1d1d)',
    glowColor: 'rgba(252, 165, 165, 0.6)',
    shadowColor: 'rgba(220, 38, 38, 0.3)',
  },
  rankBadgeColors: {
    1: 'transparent',
    2: '#facc15',
    3: '#f97316',
    4: '#a855f7',
  },
  pieceScales: {
    1: 36,
    2: 42,
    3: 48,
    4: 52,
  },
};

export const DEFAULT_THEME = TWILIGHT_ARENA;
