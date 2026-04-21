import type {
  CatchChoice,
  CatchConfig,
  CatchResolution,
  CatchRound,
  EquationStepSession,
  LinearEquation,
} from './types';
import {
  defaultRng,
  generateRound,
  nextStepFor,
  type Rng,
} from './problemGenerator';

/** Apply a step choice to an equation — always applied to both sides. */
function applyStep(eq: LinearEquation, choice: Extract<CatchChoice, { kind: 'step' }>): LinearEquation {
  const { op, amount } = choice;
  switch (op) {
    case '+':
      return { a: eq.a, b: eq.b + amount, c: eq.c + amount };
    case '-':
      return { a: eq.a, b: eq.b - amount, c: eq.c - amount };
    case '×':
      return { a: eq.a * amount, b: eq.b * amount, c: eq.c * amount };
    case '÷':
      return { a: eq.a / amount, b: eq.b / amount, c: eq.c / amount };
  }
}

export interface ResolveArgs {
  round: CatchRound;
  choice: CatchChoice;
  config: CatchConfig;
  /** For equation-step rounds — the current session being advanced. */
  session: EquationStepSession | null;
  rng?: Rng;
}

export function resolveThrow(args: ResolveArgs): {
  resolution: CatchResolution;
  nextSession: EquationStepSession | null;
} {
  const { round, choice, config, session, rng = defaultRng } = args;
  const isCorrect = choice.id === round.correct.id
    ? true
    : sameChoice(choice, round.correct);

  // Non-equation modes: just build a fresh round on success, keep same round
  // on failure (UI can re-enable choices + nudge pet).
  if (round.mode !== 'equation_step') {
    if (!isCorrect) {
      return {
        resolution: { correct: false, nextRound: null, explanation: wrongExplanation(round, choice) },
        nextSession: null,
      };
    }
    const next = generateRound(config, undefined, rng).round;
    return { resolution: { correct: true, nextRound: next }, nextSession: null };
  }

  // Equation step:
  if (!isCorrect || !session || choice.kind !== 'step') {
    return {
      resolution: {
        correct: false,
        nextRound: null,
        explanation: wrongExplanation(round, choice),
      },
      nextSession: session,
    };
  }
  // Advance equation state.
  const advanced = applyStep(session.current, choice);
  const nextStepInfo = nextStepFor(advanced);
  const newSession: EquationStepSession = {
    ...session,
    current: advanced,
    stepIndex: session.stepIndex + 1,
    solved: nextStepInfo === null,
  };

  if (newSession.solved) {
    // Done — next round restarts a fresh equation.
    const freshSession = {
      ...newSession,
      solved: false,
      stepIndex: 0,
    };
    const { round: nextRound, session: reshapedSession } = generateRound(config, undefined, rng);
    return {
      resolution: { correct: true, nextRound },
      nextSession: reshapedSession ?? freshSession,
    };
  }
  // Still solving — next round uses the advanced equation.
  const { round: nextRound } = generateRound(config, newSession, rng);
  return {
    resolution: { correct: true, nextRound },
    nextSession: newSession,
  };
}

function sameChoice(a: CatchChoice, b: CatchChoice): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'number' && b.kind === 'number') return a.value === b.value;
  if (a.kind === 'step' && b.kind === 'step') return a.op === b.op && a.amount === b.amount;
  return false;
}

function wrongExplanation(round: CatchRound, choice: CatchChoice): string {
  const label = choice.kind === 'number' ? `${choice.value}` : `${choice.op}${choice.amount}`;
  const correctLabel =
    round.correct.kind === 'number'
      ? `${round.correct.value}`
      : `${round.correct.op}${round.correct.amount}`;
  return `Threw ${label}; wanted ${correctLabel}.`;
}
