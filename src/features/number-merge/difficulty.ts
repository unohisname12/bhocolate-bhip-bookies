import type { NumberMergeDifficulty } from './types';

export interface NumberMergeDifficultyPreset {
  id: NumberMergeDifficulty;
  label: string;
  description: string;
  lives: number;
  warningBeforePenalty: boolean;
  missesBeforeLifeLoss: number;
  fixedSearchWindowTurns: number | null;
  variableSearchWindow: readonly number[] | null;
  enableChainWindow: boolean;
  enableCorruption: boolean;
  enableTimerMode: boolean;
  boardBreakOnPenalty: number;
  corruptionOnPenalty: number;
  corruptionPerStrike: number;
  overseerAggression: number;
  chainWindowBaseMs: number;
  chainWindowMinMs: number;
  chainWindowPressureDecayMs: number;
  attackAnimationLevel: 'ambient' | 'warning' | 'reactive' | 'aggressive';
  targetRange: readonly [number, number];
  /** Score at which the run is marked 'won' and the player is rewarded. */
  winScore: number;
  /** Tokens awarded on win. */
  winTokenReward: number;
}

export const NUMBER_MERGE_DIFFICULTY_PRESETS: Record<NumberMergeDifficulty, NumberMergeDifficultyPreset> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'School-friendly onboarding. Clear target, short turn window, and a clean board.',
    lives: 10,
    warningBeforePenalty: false,
    missesBeforeLifeLoss: 1,
    fixedSearchWindowTurns: 2,
    variableSearchWindow: null,
    enableChainWindow: false,
    enableCorruption: false,
    enableTimerMode: false,
    boardBreakOnPenalty: 0,
    corruptionOnPenalty: 0,
    corruptionPerStrike: 0,
    overseerAggression: 0.2,
    chainWindowBaseMs: 0,
    chainWindowMinMs: 0,
    chainWindowPressureDecayMs: 0,
    attackAnimationLevel: 'ambient',
    targetRange: [4, 9],
    winScore: 250,
    winTokenReward: 30,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'Introduces turn windows and clearer structure without full chaos.',
    lives: 8,
    warningBeforePenalty: true,
    missesBeforeLifeLoss: 1,
    fixedSearchWindowTurns: 2,
    variableSearchWindow: null,
    enableChainWindow: false,
    enableCorruption: false,
    enableTimerMode: false,
    boardBreakOnPenalty: 1,
    corruptionOnPenalty: 0,
    corruptionPerStrike: 0,
    overseerAggression: 0.4,
    chainWindowBaseMs: 0,
    chainWindowMinMs: 0,
    chainWindowPressureDecayMs: 0,
    attackAnimationLevel: 'warning',
    targetRange: [5, 11],
    winScore: 450,
    winTokenReward: 60,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Variable search windows, corruption, and an Overseer that starts pushing back.',
    lives: 6,
    warningBeforePenalty: false,
    missesBeforeLifeLoss: 1,
    fixedSearchWindowTurns: null,
    variableSearchWindow: [2, 3],
    enableChainWindow: true,
    enableCorruption: true,
    enableTimerMode: false,
    boardBreakOnPenalty: 1,
    corruptionOnPenalty: 1,
    corruptionPerStrike: 12,
    overseerAggression: 0.7,
    chainWindowBaseMs: 2800,
    chainWindowMinMs: 1700,
    chainWindowPressureDecayMs: 160,
    attackAnimationLevel: 'reactive',
    targetRange: [6, 12],
    winScore: 700,
    winTokenReward: 120,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    description: 'Full layered pressure: lives, variable windows, corruption, and active attacks.',
    lives: 4,
    warningBeforePenalty: false,
    missesBeforeLifeLoss: 1,
    fixedSearchWindowTurns: null,
    variableSearchWindow: [2, 2, 3],
    enableChainWindow: true,
    enableCorruption: true,
    enableTimerMode: true,
    boardBreakOnPenalty: 1,
    corruptionOnPenalty: 2,
    corruptionPerStrike: 18,
    overseerAggression: 1,
    chainWindowBaseMs: 2200,
    chainWindowMinMs: 1100,
    chainWindowPressureDecayMs: 180,
    attackAnimationLevel: 'aggressive',
    targetRange: [7, 14],
    winScore: 1000,
    winTokenReward: 220,
  },
};

export const DEFAULT_NUMBER_MERGE_DIFFICULTY: NumberMergeDifficulty = 'easy';

export const getNumberMergeDifficultyPreset = (
  difficulty: NumberMergeDifficulty,
): NumberMergeDifficultyPreset => NUMBER_MERGE_DIFFICULTY_PRESETS[difficulty];
