import type {
  CatchChoice,
  CatchConfig,
  CatchMode,
  CatchOperation,
  CatchRound,
  LinearEquation,
  EquationStepSession,
} from './types';
import { BASE_POINTS } from './config';
import { buildChoices, buildStepChoices } from './choiceGenerator';

/** Crypto-free random helpers scoped to the feature. Injectable for tests. */
export interface Rng {
  int: (min: number, max: number) => number;
  pick: <T>(arr: T[]) => T;
  shuffle: <T>(arr: T[]) => T[];
}

export const defaultRng: Rng = {
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  shuffle: (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },
};

const OP_SYMBOL: Record<CatchOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function roundBasePoints(cfg: CatchConfig): number {
  return Math.round(BASE_POINTS[cfg.difficulty] * cfg.rewardMultiplier);
}

// ────────────────────────────────────────────────────────────────────────────
// Layer 1 — Missing Number
// ────────────────────────────────────────────────────────────────────────────

function generateMissingNumber(cfg: CatchConfig, rng: Rng): CatchRound {
  const op = rng.pick(cfg.operations);
  const [lo, hi] = cfg.numberRange;
  let a = rng.int(lo, hi);
  let b = rng.int(lo, hi);

  // Ensure clean integer math — and, when allowNegative is false, ensure the
  // answer stays non-negative for subtraction and a clean integer for division.
  let c: number;
  switch (op) {
    case 'addition':
      c = a + b;
      break;
    case 'subtraction':
      if (!cfg.allowNegative && a < b) [a, b] = [b, a];
      c = a - b;
      break;
    case 'multiplication':
      c = a * b;
      break;
    case 'division': {
      // Build a clean division: pick divisor b, quotient q, compute a = b*q.
      const q = rng.int(Math.max(1, lo), Math.max(1, hi));
      b = Math.max(2, rng.int(2, Math.max(2, Math.min(9, hi))));
      a = b * q;
      c = q;
      break;
    }
  }

  // Randomly blank out the FIRST or SECOND operand (never the result, which
  // keeps the prompt readable: "__ + b = c" or "a + __ = c").
  const blankSide: 'left' | 'right' = rng.pick(['left', 'right'] as const);
  const missingValue = blankSide === 'left' ? a : b;
  const shownOperand = blankSide === 'left' ? b : a;

  const variable = cfg.algebraicVariables ? 'x' : '__';
  const prompt =
    blankSide === 'left'
      ? `${variable} ${OP_SYMBOL[op]} ${shownOperand} = ${c}`
      : `${shownOperand} ${OP_SYMBOL[op]} ${variable} = ${c}`;

  const choices = buildChoices({
    correctValue: missingValue,
    difficulty: cfg.difficulty,
    mode: 'missing_number',
    operation: op,
    allowNegative: cfg.allowNegative,
    rng,
  });

  return {
    id: newId('mn'),
    mode: 'missing_number',
    difficulty: cfg.difficulty,
    prompt,
    correct: choices.find((c) => c.kind === 'number' && c.value === missingValue)!,
    choices,
    basePoints: roundBasePoints(cfg),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Layer 2 — Solve for X
// ────────────────────────────────────────────────────────────────────────────

/** Pretty-print a linear equation a·x + b = c for display. */
export function formatEquation(eq: LinearEquation): string {
  const { a, b, c } = eq;
  const aPart = a === 1 ? 'x' : a === -1 ? '−x' : `${a}x`;
  if (b === 0) return `${aPart} = ${c}`;
  const bSign = b >= 0 ? '+' : '−';
  return `${aPart} ${bSign} ${Math.abs(b)} = ${c}`;
}

function generateSolveForX(cfg: CatchConfig, rng: Rng): CatchRound {
  const [lo, hi] = cfg.numberRange;
  // Pick x first (so math stays clean), then pick a + b.
  const x = rng.int(cfg.allowNegative ? -hi : lo, hi);
  // Use only addition/subtraction shape for simple solve, plus a·x for variety.
  const usesMultiply = cfg.operations.includes('multiplication');
  const a = usesMultiply && rng.int(1, 2) === 2 ? rng.int(2, Math.min(6, hi)) : 1;
  let b = rng.int(cfg.allowNegative ? -hi : 0, hi);
  if (!cfg.allowNegative && b === 0) b = rng.int(1, hi);

  const c = a * x + b;
  const eq: LinearEquation = { a, b, c };

  const choices = buildChoices({
    correctValue: x,
    difficulty: cfg.difficulty,
    mode: 'solve_for_x',
    operation: 'addition',
    allowNegative: cfg.allowNegative,
    rng,
    equation: eq,
  });

  return {
    id: newId('sx'),
    mode: 'solve_for_x',
    difficulty: cfg.difficulty,
    prompt: formatEquation(eq),
    correct: choices.find((c) => c.kind === 'number' && c.value === x)!,
    choices,
    basePoints: roundBasePoints(cfg),
    equation: eq,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Layer 3 — Equation Step (multi-round)
// ────────────────────────────────────────────────────────────────────────────

/** Decide the correct next inverse step for `a·x + b = c`.
 *  Order: if b != 0, remove b first; else if a != 1, divide by a. */
export function nextStepFor(eq: LinearEquation): {
  op: '+' | '-' | '×' | '÷';
  amount: number;
  resulting: LinearEquation;
} | null {
  const { a, b, c } = eq;
  if (b !== 0) {
    const inverseOp = b > 0 ? '-' : '+';
    const amount = Math.abs(b);
    const resulting: LinearEquation = { a, b: 0, c: b > 0 ? c - amount : c + amount };
    return { op: inverseOp, amount, resulting };
  }
  if (a !== 1 && a !== 0) {
    // Always divide (keeps integers when equations are well-formed).
    return { op: '÷', amount: a, resulting: { a: 1, b: 0, c: c / a } };
  }
  return null;
}

/** Build an initial 1- or 2-step equation. */
export function buildStepEquation(cfg: CatchConfig, rng: Rng): LinearEquation {
  const [lo, hi] = cfg.numberRange;
  const x = rng.int(cfg.allowNegative ? -hi : 1, hi);
  const wantTwoStep = cfg.maxSteps === 2 && rng.int(0, 1) === 1;
  const a = wantTwoStep ? rng.int(2, Math.min(6, hi)) : 1;
  let b = rng.int(cfg.allowNegative ? -hi : 1, hi);
  // Never allow a trivially-solved starting equation. If a === 1 and b === 0
  // then the "equation" is already `x = c`, which has no step to play.
  if (b === 0) b = rng.pick([-1, 1]) * rng.int(1, hi);
  return { a, b, c: a * x + b };
}

/** Turn an (eq, stepIndex, totalSteps) into a CatchRound. */
export function roundFromEquationState(
  session: EquationStepSession,
  cfg: CatchConfig,
  rng: Rng,
): CatchRound {
  const next = nextStepFor(session.current);
  // Defensive: if already solved, return a trivial round ("x = ?").
  if (!next) {
    const choices: CatchChoice[] = [];
    return {
      id: newId('eq'),
      mode: 'equation_step',
      difficulty: cfg.difficulty,
      prompt: formatEquation(session.current),
      correct: { kind: 'step', id: 'noop', label: 'x', op: '+', amount: 0 },
      choices,
      basePoints: 0,
      equation: session.current,
      stepIndex: session.stepIndex,
      totalSteps: session.totalSteps,
    };
  }
  const choices = buildStepChoices({
    correctOp: next.op === '+' ? '+' : next.op === '-' ? '-' : next.op === '×' ? '×' : '÷',
    correctAmount: next.amount,
    difficulty: cfg.difficulty,
    equation: session.current,
    allowNegative: cfg.allowNegative,
    rng,
  });
  return {
    id: newId('eq'),
    mode: 'equation_step',
    difficulty: cfg.difficulty,
    prompt: formatEquation(session.current),
    correct:
      choices.find(
        (c) => c.kind === 'step' && c.op === (next.op as '+' | '-' | '×' | '÷') && c.amount === next.amount,
      ) ?? choices[0],
    choices,
    basePoints: roundBasePoints(cfg),
    equation: session.current,
    stepIndex: session.stepIndex,
    totalSteps: session.totalSteps,
  };
}

/** Start a fresh equation_step session. */
export function newEquationStepSession(cfg: CatchConfig, rng: Rng = defaultRng): EquationStepSession {
  const eq = buildStepEquation(cfg, rng);
  // Count total steps up front so the UI can show "step X/Y".
  let probe = { ...eq };
  let steps = 0;
  for (let i = 0; i < 3; i += 1) {
    const next = nextStepFor(probe);
    if (!next) break;
    probe = next.resulting;
    steps += 1;
  }
  return { original: eq, current: eq, stepIndex: 0, totalSteps: Math.max(1, steps), solved: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────────────────────

export function generateRound(
  cfg: CatchConfig,
  session?: EquationStepSession,
  rng: Rng = defaultRng,
): { round: CatchRound; session: EquationStepSession | null } {
  switch (cfg.mode) {
    case 'missing_number':
      return { round: generateMissingNumber(cfg, rng), session: null };
    case 'solve_for_x':
      return { round: generateSolveForX(cfg, rng), session: null };
    case 'equation_step': {
      const active = session ?? newEquationStepSession(cfg, rng);
      return { round: roundFromEquationState(active, cfg, rng), session: active };
    }
  }
}

/** Exposed for dev/testing: produce a sample round for a given mode. */
export function sampleRound(mode: CatchMode, difficulty: CatchConfig['difficulty']): CatchRound {
  const cfg: CatchConfig = {
    mode,
    difficulty,
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
    numberRange: [1, 15],
    maxSteps: difficulty === 'hard' ? 2 : 1,
    allowNegative: false,
    algebraicVariables: mode !== 'missing_number',
    rewardMultiplier: 1,
  };
  return generateRound(cfg, undefined, defaultRng).round;
}
