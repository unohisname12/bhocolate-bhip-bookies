import type { CatchConfig, CatchDifficulty, CatchMode } from './types';

/** Choice-count scaling per difficulty. */
export const CHOICE_COUNT: Record<CatchDifficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 8,
};

/** Throw animation duration (ms) — slower on Easy so kids can track it. */
export const THROW_DURATION_MS: Record<CatchDifficulty, number> = {
  easy: 650,
  medium: 500,
  hard: 400,
};

/** Default teacher-configurable config per (mode, difficulty). Narrow enough
 *  to feel coherent, wide enough to be useful without extra tuning. */
export function defaultCatchConfig(mode: CatchMode, difficulty: CatchDifficulty): CatchConfig {
  const base: CatchConfig = {
    mode,
    difficulty,
    operations: ['addition', 'subtraction'],
    numberRange: [1, 10],
    maxSteps: 1,
    allowNegative: false,
    algebraicVariables: false,
    rewardMultiplier: 1,
  };

  if (difficulty === 'medium') {
    base.operations = ['addition', 'subtraction', 'multiplication'];
    base.numberRange = [1, 15];
  }
  if (difficulty === 'hard') {
    base.operations = ['addition', 'subtraction', 'multiplication', 'division'];
    base.numberRange = [1, 20];
    base.maxSteps = 2;
    base.allowNegative = true;
  }

  if (mode === 'solve_for_x') {
    base.algebraicVariables = true;
  }
  if (mode === 'equation_step') {
    base.algebraicVariables = true;
    base.maxSteps = difficulty === 'hard' ? 2 : 1;
  }

  return base;
}

/** Base MP/token reward per round before streak and difficulty multiplier. */
export const BASE_POINTS: Record<CatchDifficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 25,
};
