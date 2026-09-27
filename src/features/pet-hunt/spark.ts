import { generateLearningProblem, normalizeLearning } from '../../services/game/curriculum';

/**
 * Spark checks: quick three-choice math pop-ups while a runner charges a beacon.
 * The server makes them and keeps the answer; players only ever see the prompt and choices.
 * Questions come from the learner's own grade so every kid gets something they can do fast.
 */
export type CheckKind = 'facts' | 'missing' | 'compare';
export interface SparkCheck { id: number; kind: CheckKind; prompt: string; choices: string[]; answer: number; left: number; total: number }

export const CHECK_TIME = 5, RELAXED_CHECK_TIME = 9, CHECK_BONUS = .08, CHECK_SETBACK = .03, CHECK_GAP: [number, number] = [4, 6];
const MAX_PROMPT = 30;

export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const fmt = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);

/** Two nearby wrong answers, never negative for the youngest grades, never duplicates. */
function distractors(answer: number, grade: number, random: () => number): number[] {
  const step = Number.isInteger(answer) ? 1 : .1, out = new Set<string>([fmt(answer)]), picks: number[] = [];
  for (let tries = 0; picks.length < 2 && tries < 40; tries++) {
    const off = (1 + Math.floor(random() * 3)) * step * (random() < .5 ? -1 : 1), v = Math.round((answer + off) * 100) / 100;
    if (grade < 6 && v < 0) continue;
    if (!out.has(fmt(v))) { out.add(fmt(v)); picks.push(v); }
  }
  while (picks.length < 2) picks.push(answer + picks.length + 2);
  return picks;
}
function shuffle(correct: string, wrong: string[], random: () => number) {
  const choices = [correct, ...wrong];
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  return { choices, answer: choices.indexOf(correct) };
}

export function makeCheck(id: number, grade: number, random: () => number, relaxed = false): SparkCheck {
  const g = Math.max(0, Math.min(12, Math.round(grade))), int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const kinds: CheckKind[] = g <= 1 ? ['facts', 'missing', 'compare'] : ['facts', 'facts', 'missing', 'compare'];
  const kind = kinds[Math.floor(random() * kinds.length)], time = relaxed ? RELAXED_CHECK_TIME : CHECK_TIME;
  const build = (prompt: string, answer: number) => { const s = shuffle(fmt(answer), distractors(answer, g, random).map(fmt), random); return { id, kind, prompt, ...s, left: time, total: time }; };
  if (kind === 'missing') {
    if (g <= 2) { const a = int(1, 9), b = int(1, 9); return build(`${a} + ? = ${a + b}`, b); }
    if (g <= 5) { const a = int(2, 9), b = int(2, 9); return build(`${a} × ? = ${a * b}`, b); }
    const a = int(2, 12), b = int(-9, 9); return build(`? − ${a} = ${b}`, a + b);
  }
  if (kind === 'compare') {
    // "Pick the biggest": three different values; fractions and decimals from grade 3 up.
    const pool = g <= 2 ? [int(1, 20), int(1, 20), int(1, 20)] : g <= 5 ? [int(1, 3) / 4, int(1, 4) / 5, int(1, 2) / 3] : [int(-9, 9) / 2, int(-9, 9) / 4, int(-9, 9) / 5];
    const values = Array.from(new Set(pool.map(v => Math.round(v * 100) / 100)));
    while (values.length < 3) values.push(Math.round((Math.max(...values) + int(1, 4) / (g <= 2 ? 1 : 10)) * 100) / 100);
    const label = (v: number) => g >= 3 && g <= 5 ? fraction(v) : fmt(v), best = Math.max(...values);
    const s = shuffle(label(best), values.filter(v => v !== best).map(label), random);
    return { id, kind, prompt: 'Pick the biggest', ...s, left: time, total: time };
  }
  const problem = generateLearningProblem(normalizeLearning({ grade: g, topic: 'mixed', challenge: 'support' }), random);
  // Word problems and long prompts don't fit a five-second pop-up; fall back to a plain fact for the grade.
  if (problem.question.length <= MAX_PROMPT && Number.isFinite(problem.answer)) return build(problem.question.replace(/\s*\(.*\)\s*$/, ''), problem.answer);
  const a = int(2, g <= 2 ? 9 : 12), b = int(2, 9);
  return g <= 2 ? build(`${a} + ${b}`, a + b) : build(`${a} × ${b}`, a * b);
}

const FRACTIONS: [number, string][] = [[.25, '1/4'], [.5, '1/2'], [.75, '3/4'], [.2, '1/5'], [.4, '2/5'], [.6, '3/5'], [.8, '4/5'], [1 / 3, '1/3'], [2 / 3, '2/3']];
function fraction(v: number) { return FRACTIONS.find(([n]) => Math.abs(n - v) < .01)?.[1] ?? fmt(v); }
