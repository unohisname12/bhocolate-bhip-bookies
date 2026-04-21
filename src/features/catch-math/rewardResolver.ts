import type { CatchRound, CatchDifficulty } from './types';

const DIFF_MATH_SCALE: Record<CatchDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/** Translate a Catch-mode round + streak into a `SOLVE_MATH` payload so we
 *  ride the existing math reward pipeline (MP, tokens, streak milestones). */
export interface CatchRewardPayload {
  /** Passed as `difficulty` on the `SOLVE_MATH` action. Scaled to 1–5 to line
   *  up with the existing adaptive-difficulty ladder. */
  solveMathDifficulty: number;
  /** Passed as `reward` on `SOLVE_MATH`. */
  reward: number;
  /** Passed as `correct` on `SOLVE_MATH`. */
  correct: boolean;
}

export function computeReward(round: CatchRound, correct: boolean, streak: number): CatchRewardPayload {
  const base = round.basePoints;
  // 10% bonus per streak tier (capped at 5×).
  const streakMult = 1 + Math.min(5, Math.floor(streak / 5)) * 0.1;
  const reward = correct ? Math.round(base * streakMult) : 0;
  const solveMathDifficulty = Math.min(5, DIFF_MATH_SCALE[round.difficulty] + (round.mode === 'equation_step' ? 1 : 0));
  return { solveMathDifficulty, reward, correct };
}
