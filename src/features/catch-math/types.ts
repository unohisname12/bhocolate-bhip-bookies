/**
 * Catch the Missing Number — core types.
 *
 * Three modes share the same screen + round pipeline:
 *  - missing_number: a + __ = c  (player throws a number)
 *  - solve_for_x:    a·x + b = c (player throws the value of x)
 *  - equation_step:  multi-step, player throws the next inverse operation
 *
 * A "round" is one prompt → one throw. An equation_step run can chain
 * multiple rounds that share the same equation until x is isolated.
 */

export type CatchMode = 'missing_number' | 'solve_for_x' | 'equation_step';
export type CatchDifficulty = 'easy' | 'medium' | 'hard';
export type CatchOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

/** Operator tokens used in equation_step choices. */
export type StepOperator = '+' | '-' | '×' | '÷';

/** One choice the player can throw. For missing-number / solve-for-x the
 *  value is a number; for equation-step it's a step operation. */
export type CatchChoice =
  | {
      kind: 'number';
      id: string;
      label: string;
      value: number;
    }
  | {
      kind: 'step';
      id: string;
      label: string;
      op: StepOperator;
      amount: number;
    };

/** Simple equation model: a·x + b = c (a,b,c ∈ ℤ).
 *  Supports the subset needed for 1- and 2-step solving. */
export interface LinearEquation {
  a: number; // coefficient on x (a=1 means just "x"; a=0 is illegal in this mode)
  b: number; // constant on the left
  c: number; // right-hand side
}

export interface CatchRound {
  id: string;
  mode: CatchMode;
  difficulty: CatchDifficulty;
  /** Pretty equation or prompt for display. */
  prompt: string;
  correct: CatchChoice;
  choices: CatchChoice[];
  /** Reward points (pre streak/time bonus). */
  basePoints: number;
  /** Equation-step rounds only. */
  equation?: LinearEquation;
  stepIndex?: number;
  totalSteps?: number;
}

export interface CatchConfig {
  mode: CatchMode;
  difficulty: CatchDifficulty;
  /** Allowed arithmetic operations (missing-number + solve-for-x modes). */
  operations: CatchOperation[];
  /** Inclusive number range for operands & answers. */
  numberRange: [number, number];
  /** Cap on equation_step solving depth. Missing/solve ignore. */
  maxSteps: 1 | 2;
  /** Permit negative answers/intermediate values. */
  allowNegative: boolean;
  /** Enable variable-style prompts (x rather than ___). */
  algebraicVariables: boolean;
  /** Multiplier applied on top of base reward (teacher knob). */
  rewardMultiplier: number;
}

/** Result of resolving a thrown choice. */
export interface CatchResolution {
  correct: boolean;
  /** For equation_step: the next round to play, or null if solved. */
  nextRound: CatchRound | null;
  /** Human-readable reason on wrong throws (surface in dev panel). */
  explanation?: string;
}

/** Tracks an in-progress equation_step solve across rounds. */
export interface EquationStepSession {
  original: LinearEquation;
  current: LinearEquation;
  stepIndex: number;
  totalSteps: number;
  solved: boolean;
}
