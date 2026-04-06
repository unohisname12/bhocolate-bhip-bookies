import type { MathProblem } from '../../types';

export type MathProblemType = 'arithmetic' | 'comparison' | 'missing_number' | 'word_problem';

const generateId = () => Math.random().toString(36).substr(2, 9);

const WORD_TEMPLATES = [
  (a: number, b: number) => ({
    q: `You have ${a} apples and buy ${b} more. How many apples?`,
    answer: a + b,
  }),
  (a: number, b: number) => ({
    q: `There are ${a + b} birds. ${b} fly away. How many remain?`,
    answer: a,
  }),
  (a: number, b: number) => ({
    q: `Each box holds ${b} items. You have ${a} boxes. How many items total?`,
    answer: a * b,
  }),
];

const generateArithmeticProblem = (difficulty: number): { question: string; answer: number; hint: string } => {
  const maxVal = difficulty * 10;
  const ops = ['+'];
  if (difficulty >= 1) ops.push('-');
  if (difficulty >= 2) ops.push('*');
  if (difficulty >= 3) ops.push('/');

  const operator = ops[Math.floor(Math.random() * ops.length)];
  let num1: number, num2: number, answer: number, operatorStr: string, hint: string;

  switch (operator) {
    case '+':
      num1 = Math.floor(Math.random() * maxVal) + 1;
      num2 = Math.floor(Math.random() * maxVal) + 1;
      answer = num1 + num2;
      operatorStr = '+';
      hint = `Count up from ${num1}`;
      break;
    case '-':
      num1 = Math.floor(Math.random() * maxVal) + 1;
      num2 = Math.floor(Math.random() * num1);
      answer = num1 - num2;
      operatorStr = '-';
      hint = `Start at ${num1} and count down ${num2}`;
      break;
    case '*':
      num1 = Math.floor(Math.random() * (difficulty * 5)) + 1;
      num2 = Math.floor(Math.random() * (difficulty * 5)) + 1;
      answer = num1 * num2;
      operatorStr = '×';
      hint = `Add ${num1} together ${num2} times`;
      break;
    case '/':
      num2 = Math.floor(Math.random() * (difficulty * 5)) + 1;
      answer = Math.floor(Math.random() * (difficulty * 5)) + 1;
      num1 = num2 * answer;
      operatorStr = '÷';
      hint = `How many times does ${num2} go into ${num1}?`;
      break;
    default:
      num1 = 1; num2 = 1; answer = 2; operatorStr = '+';
      hint = 'Add the two numbers';
  }

  return { question: `${num1} ${operatorStr} ${num2}`, answer, hint };
};

const generateComparisonProblem = (difficulty: number): { question: string; answer: number; hint: string } => {
  const scale = difficulty * 5;
  const a = Math.floor(Math.random() * scale) + 1;
  const b = Math.floor(Math.random() * scale) + 1;
  const c = Math.floor(Math.random() * scale) + 1;
  const d = Math.floor(Math.random() * scale) + 1;
  const left = a * b;
  const right = c * d;
  const answer = left > right ? 1 : left < right ? 2 : 0;
  return {
    question: `Which is bigger?\n1) ${a}×${b} = ?\n2) ${c}×${d} = ?`,
    answer,
    hint: `Calculate each product: ${a}×${b}=${left}, ${c}×${d}=${right}`,
  };
};

const generateMissingNumberProblem = (difficulty: number): { question: string; answer: number; hint: string } => {
  const maxVal = difficulty * 10;
  const ops = ['+', '-'];
  if (difficulty >= 2) ops.push('*');
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number, question: string, hint: string;

  if (op === '+') {
    b = Math.floor(Math.random() * maxVal) + 1;
    answer = Math.floor(Math.random() * maxVal) + 1;
    a = answer + b;
    question = `_ + ${b} = ${a}`;
    hint = `Subtract: ${a} - ${b}`;
  } else if (op === '-') {
    answer = Math.floor(Math.random() * maxVal) + 1;
    b = Math.floor(Math.random() * maxVal) + 1;
    a = answer + b;
    question = `${a} - _ = ${answer}`;
    hint = `Subtract: ${a} - ${answer}`;
  } else {
    b = Math.floor(Math.random() * (difficulty * 5)) + 2;
    answer = Math.floor(Math.random() * (difficulty * 5)) + 1;
    a = answer * b;
    question = `_ × ${b} = ${a}`;
    hint = `Divide: ${a} ÷ ${b}`;
  }

  return { question, answer, hint };
};

const generateWordProblem = (difficulty: number): { question: string; answer: number; hint: string } => {
  const scale = Math.max(1, difficulty * 3);
  const a = Math.floor(Math.random() * scale) + 1;
  const b = Math.floor(Math.random() * scale) + 1;
  const template = WORD_TEMPLATES[Math.floor(Math.random() * WORD_TEMPLATES.length)];
  const { q, answer } = template(a, b);
  return { question: q, answer, hint: `Think step by step: what operation fits?` };
};

export const generateMathProblem = (
  difficulty: number,
  type: MathProblemType = 'arithmetic',
): MathProblem => {
  let question: string, answer: number, hint: string;

  switch (type) {
    case 'comparison':
      ({ question, answer, hint } = generateComparisonProblem(difficulty));
      break;
    case 'missing_number':
      ({ question, answer, hint } = generateMissingNumberProblem(difficulty));
      break;
    case 'word_problem':
      ({ question, answer, hint } = generateWordProblem(difficulty));
      break;
    default:
      ({ question, answer, hint } = generateArithmeticProblem(difficulty));
  }

  const reward = difficulty * 10;

  return {
    id: generateId(),
    question,
    answer,
    difficulty,
    reward,
    hint,
    type,
  };
};

export const checkAnswer = (problem: MathProblem, userAnswer: number): boolean =>
  problem.answer === userAnswer;

export const getAdaptiveDifficulty = (correctAnswers: number): number =>
  Math.min(5, Math.floor(correctAnswers / 10) + 1);

export const calculateReward = (
  baseProblem: MathProblem,
  timeMs: number,
  usedHint: boolean,
): number => {
  let reward = baseProblem.reward;
  if (timeMs < 3000) reward += 5;
  else if (timeMs < 5000) reward += 3;
  else if (timeMs < 10000) reward += 1;
  if (usedHint) reward = Math.max(1, reward - 5);
  return reward;
};
