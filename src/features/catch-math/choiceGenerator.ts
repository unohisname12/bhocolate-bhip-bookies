import type {
  CatchChoice,
  CatchDifficulty,
  CatchMode,
  CatchOperation,
  LinearEquation,
  StepOperator,
} from './types';
import { CHOICE_COUNT } from './config';
import type { Rng } from './problemGenerator';

// ────────────────────────────────────────────────────────────────────────────
// Number distractors — missing_number and solve_for_x
// ────────────────────────────────────────────────────────────────────────────

interface BuildChoicesArgs {
  correctValue: number;
  difficulty: CatchDifficulty;
  mode: CatchMode;
  operation: CatchOperation;
  allowNegative: boolean;
  rng: Rng;
  /** When mode=solve_for_x, pass the source equation so we can generate
   *  "common-mistake" distractors (e.g., the player picks b instead of x). */
  equation?: LinearEquation;
}

export function buildChoices(args: BuildChoicesArgs): CatchChoice[] {
  const { correctValue, difficulty, mode, rng, equation, allowNegative } = args;
  const count = CHOICE_COUNT[difficulty];
  const pool = new Set<number>([correctValue]);

  const push = (n: number) => {
    if (!Number.isFinite(n)) return;
    if (!allowNegative && n < 0) return;
    pool.add(n);
  };

  // Near-miss distractors (off-by-one / off-by-two) — works for all modes.
  const spread = difficulty === 'hard' ? 1 : difficulty === 'medium' ? 2 : 3;
  for (let i = 1; i <= spread; i += 1) {
    push(correctValue + i);
    push(correctValue - i);
  }

  // Mode-specific common mistakes.
  if (mode === 'solve_for_x' && equation) {
    push(equation.b); // grabbed the constant instead of the solution
    push(equation.c); // grabbed the RHS
    push(equation.c - equation.b); // forgot to divide by `a`
    if (equation.a !== 0) push(Math.round(equation.c / equation.a)); // forgot to subtract b
    push(-correctValue); // sign error
  }
  if (mode === 'missing_number') {
    // Operation confusion — if kid added instead of subtracting, etc.
    push(correctValue * 2);
    push(Math.max(0, Math.abs(correctValue) - 2));
  }

  // Top up with random wide distractors if still short.
  let safety = 40;
  while (pool.size < count + 2 && safety > 0) {
    safety -= 1;
    const shift = rng.int(1, Math.max(5, Math.abs(correctValue) + 5));
    push(correctValue + rng.pick([-1, 1]) * shift);
  }

  // Drop the correct value so we can randomly pick distractors then add it
  // back in a shuffled position.
  const arr = Array.from(pool).filter((n) => n !== correctValue);
  const distractors = rng.shuffle(arr).slice(0, count - 1);
  const ordered = rng.shuffle([correctValue, ...distractors]);

  return ordered.map<CatchChoice>((value, idx) => ({
    kind: 'number',
    id: `c${idx}`,
    label: String(value),
    value,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Step distractors — equation_step
// ────────────────────────────────────────────────────────────────────────────

interface BuildStepChoicesArgs {
  correctOp: StepOperator;
  correctAmount: number;
  difficulty: CatchDifficulty;
  equation: LinearEquation;
  allowNegative: boolean;
  rng: Rng;
}

/** Distractor strategies:
 *   - correct number but wrong sign ("-b" vs "+b")
 *   - correct sign but wrong number (near-miss amount)
 *   - wrong inverse operation (e.g. "÷a" where "-b" was required)
 *   - applied to the wrong value (c instead of b)
 */
export function buildStepChoices(args: BuildStepChoicesArgs): CatchChoice[] {
  const { correctOp, correctAmount, difficulty, equation, rng } = args;
  const count = CHOICE_COUNT[difficulty];
  const seen = new Set<string>();
  const choices: CatchChoice[] = [];

  const push = (op: StepOperator, amount: number) => {
    if (amount <= 0) return;
    const key = `${op}${amount}`;
    if (seen.has(key)) return;
    seen.add(key);
    choices.push({
      kind: 'step',
      id: `s${choices.length}`,
      label: `${op}${amount}`,
      op,
      amount,
    });
  };

  // Always include the correct choice.
  push(correctOp, correctAmount);

  // Sign-swap distractor.
  const flipped: StepOperator =
    correctOp === '+' ? '-' : correctOp === '-' ? '+' : correctOp === '×' ? '÷' : '×';
  push(flipped, correctAmount);

  // Near-miss amount with correct op.
  push(correctOp, correctAmount + 1);
  push(correctOp, Math.max(1, correctAmount - 1));

  // Wrong-target: operate on c or a instead of b.
  if (equation.c !== correctAmount) push(correctOp, Math.abs(equation.c));
  if (equation.a !== correctAmount) push(correctOp, Math.abs(equation.a));

  // Totally different operator.
  const allOps: StepOperator[] = ['+', '-', '×', '÷'];
  for (const op of rng.shuffle(allOps)) {
    if (choices.length >= count) break;
    push(op, correctAmount);
  }

  // Pad with random op/amount combos if needed.
  let safety = 40;
  while (choices.length < count && safety > 0) {
    safety -= 1;
    const op = rng.pick(allOps);
    const amt = rng.int(1, Math.max(5, correctAmount + 3));
    push(op, amt);
  }

  return rng.shuffle(choices.slice(0, count));
}
