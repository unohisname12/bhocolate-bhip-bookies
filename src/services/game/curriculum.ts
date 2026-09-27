import { MIDDLE_TOPICS, middleSkills } from '../../features/middle-school/catalog';
import { middleProblem } from '../../features/middle-school/content';
import type { MathProblem } from '../../types';

export type Challenge = 'support' | 'standard' | 'stretch';
export interface LearningSettings {
  grade: number;
  topic: string;
  challenge: Challenge;
  timedWarmup: boolean;
  /** Older profiles default to help enabled. */
  learningHelp?: boolean;
  /** Classroom default: no passive decay or absence penalties. */
  schoolSafe?: boolean;
  /** Teacher override: show every game and system from day one instead of unlocking them as the student plays. */
  showAllGames?: boolean;
}
export const DEFAULT_LEARNING: LearningSettings = { grade: 2, topic: 'mixed', challenge: 'standard', timedWarmup: false, learningHelp: true, schoolSafe: true };

/** Representative practice strands, not a complete standards-aligned curriculum. */
export const GRADE_TOPICS = [
  ['Counting', 'Addition within 10'],
  ['Addition within 20', 'Subtraction within 20'],
  ['Two-digit addition', 'Two-digit subtraction'],
  ['Multiplication facts', 'Division facts'],
  ['Multi-digit multiplication', 'Factors'],
  ['Decimals', 'Fraction of a quantity'],
  ['Ratios', 'Signed integers', ...MIDDLE_TOPICS[6]],
  ['Percentages', 'One-step equations', ...MIDDLE_TOPICS[7]],
  ['Linear equations', 'Pythagorean theorem', ...MIDDLE_TOPICS[8]],
  ['Quadratic equations', 'Slope'],
  ['Systems of equations', 'Quadratic vertex'],
  ['Exponents and logarithms', 'Arithmetic sequences'],
  ['Derivatives', 'Probability'],
] as const;
export const gradeLabel = (grade: number) => grade === 0 ? 'Kindergarten' : `Grade ${grade}`;

export function normalizeLearning(value: Partial<LearningSettings> | undefined): LearningSettings {
  const grade = Number.isInteger(value?.grade) ? Math.max(0, Math.min(12, value!.grade!)) : DEFAULT_LEARNING.grade;
  const topic = value?.topic && (GRADE_TOPICS[grade] as readonly string[]).includes(value.topic) ? value.topic : 'mixed';
  const challenge = value?.challenge && ['support', 'standard', 'stretch'].includes(value.challenge) ? value.challenge : 'standard';
  return { grade, topic, challenge, timedWarmup: value?.timedWarmup === true, learningHelp: value?.learningHelp !== false, schoolSafe: value?.schoolSafe !== false,
    ...(value?.showAllGames === true ? { showAllGames: true } : {}) };
}

export function generateLearningProblem(settings: LearningSettings, random: () => number = Math.random): MathProblem {
  const s = normalizeLearning(settings);
  const topics = GRADE_TOPICS[s.grade];
  const topic = s.topic === 'mixed' ? topics[Math.floor(random() * topics.length)] : s.topic;
  const extra = middleSkills(s.grade).filter(skill => skill.topic === topic);
  if (extra.length) {
    const skill = extra[Math.floor(random() * extra.length)], q = middleProblem(skill.id, s.challenge, 'check', 0, random);
    return { practiceSettings: s, skillId: skill.id, templateId: q.templateId, context: 'practice', id: `learn_${Date.now()}_${random().toString(36).slice(2)}`, question: withAnswerFormat(q.text, q.answer), answer: q.answer, hint: q.hint, explanation: [q.hint, q.explanation, `Numeric value${Number.isInteger(q.answer)?'':' (decimal may be approximate)'}: ${q.answer}.`], difficulty: s.challenge === 'stretch' ? 3 : s.challenge === 'support' ? 1 : 2, reward: 10, type: topic, topic, grade: s.grade };
  }
  const limit = s.challenge === 'support' ? 4 : s.challenge === 'stretch' ? 12 : 8;
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const a = int(1, limit), b = int(1, limit);
  let question = '', answer = 0, hint = '';
  let explanation: string[] = [];
  switch (topic) {
    case 'Counting': answer = Math.min(a, 10); question = `How many stars? ${'★ '.repeat(answer).trim()}`; hint = 'Point to each star and count once.'; explanation = ['Touch one star for each counting number.', `Count: ${Array.from({ length: answer }, (_, i) => i + 1).join(', ')}. The last number tells how many stars there are.`]; break;
    case 'Addition within 10': { const x = int(0, 5), y = int(0, 5); question = `${x} + ${y}`; answer = x + y; hint = 'Count on from the first number.'; explanation = [`Start at ${x}. Move forward ${y} counting steps.`, `${x} + ${y} = ${answer}.`]; break; }
    case 'Addition within 20': question = `${a} + ${Math.min(b, 20 - a)}`; answer = a + Math.min(b, 20 - a); hint = 'Make a ten, then add what is left.'; explanation = [`Start at ${a}. Count forward ${Math.min(b, 20 - a)} more.`, `${question} = ${answer}.`]; break;
    case 'Subtraction within 20': { const total = Math.min(20, a + b); question = `${total} − ${a}`; answer = total - a; hint = 'Count back, or think of the missing addend.'; explanation = [`Start with ${total}. Take away ${a}.`, `${total} − ${a} = ${answer}. Check: ${answer} + ${a} = ${total}.`]; break; }
    case 'Two-digit addition': { const max = s.challenge === 'support' ? 24 : s.challenge === 'stretch' ? 99 : 49; const x = int(10, max), y = int(10, max); question = `${x} + ${y}`; answer = x + y; hint = 'Add ones, then tens. Regroup if needed.'; explanation = [`Split into tens and ones: ${x} = ${x - x % 10} + ${x % 10}; ${y} = ${y - y % 10} + ${y % 10}.`, `Tens: ${x - x % 10} + ${y - y % 10} = ${x + y - x % 10 - y % 10}. Ones: ${x % 10} + ${y % 10} = ${x % 10 + y % 10}.`, `Combine: ${x + y - x % 10 - y % 10} + ${x % 10 + y % 10} = ${answer}.`]; break; }
    case 'Two-digit subtraction': { const x = int(20, s.challenge === 'support' ? 39 : 99), y = int(10, x); question = `${x} − ${y}`; answer = x - y; hint = 'Subtract ones and tens; exchange a ten if needed.'; explanation = [`Split what you take away: ${y} = ${y - y % 10} + ${y % 10}.`, `Take away the tens first: ${x} − ${y - y % 10} = ${x - y + y % 10}.`, `Then the ones: ${x - y + y % 10} − ${y % 10} = ${answer}. Check: ${answer} + ${y} = ${x}.`]; break; }
    case 'Multiplication facts': question = `${a} × ${b}`; answer = a * b; hint = `Think of ${a} equal groups of ${b}.`; explanation = [`Multiplication means equal groups: ${a} groups of ${b}.`, `${Array.from({ length: a }, () => b).join(' + ')} = ${answer}.`]; break;
    case 'Division facts': question = `${a * b} ÷ ${b}`; answer = a; hint = 'Use the related multiplication fact.'; explanation = [`How many groups of ${b} fit into ${a * b}?`, `${a} × ${b} = ${a * b}, so ${a * b} ÷ ${b} = ${answer}.`]; break;
    case 'Multi-digit multiplication': question = `${a + 10} × ${b}`; answer = (a + 10) * b; hint = 'Split the two-digit number into tens and ones.'; explanation = [`Split ${a + 10} into 10 + ${a}. Multiply both parts by ${b}.`, `10 × ${b} = ${10 * b}; ${a} × ${b} = ${a * b}.`, `Add the partial products: ${10 * b} + ${a * b} = ${answer}.`]; break;
    case 'Factors': question = `${b} × ? = ${a * b}`; answer = a; hint = 'Divide the product by the known factor.'; explanation = [`Undo multiplication by dividing both sides by ${b}.`, `? = ${a * b} ÷ ${b} = ${answer}. Check: ${b} × ${answer} = ${a * b}.`]; break;
    case 'Decimals': question = `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)}`; answer = (a + b) / 10; hint = 'Add the tenths. Enter a decimal.'; explanation = [`These numbers are ${a} tenths and ${b} tenths.`, `${a} + ${b} = ${a + b} tenths. Divide by 10 to write this as a decimal: ${answer}.`]; break;
    case 'Fraction of a quantity': question = `What is 1/${b + 1} of ${a * (b + 1)}?`; answer = a; hint = 'Divide the quantity by the denominator.'; explanation = [`One/${b + 1} means one of ${b + 1} equal shares.`, `Share ${a * (b + 1)} equally: ${a * (b + 1)} ÷ ${b + 1} = ${answer}.`]; break;
    case 'Ratios': question = `${b} packs hold ${a * b} pencils. How many pencils in 1 pack?`; answer = a; hint = 'Find the unit rate by dividing.'; explanation = [`The packs have equal numbers of pencils. Divide the total by the number of packs.`, `${a * b} ÷ ${b} = ${answer} pencils per pack.`]; break;
    case 'Signed integers': question = `−${a} + ${b}`; answer = b - a; hint = 'Start left of zero and move right.'; explanation = [`Start at −${a} on a number line. Adding ${b} moves ${b} places right.`, `${question} = ${answer}.`]; break;
    case 'Percentages': question = `What is ${a * 5}% of ${b * 20}?`; answer = a * b; hint = 'Divide the percent by 100, then multiply by the quantity.'; explanation = [`Percent means out of 100: ${a * 5}% = ${a * 5}/100 = ${a * 5 / 100}.`, `Multiply by the whole: ${a * 5 / 100} × ${b * 20} = ${answer}.`]; break;
    case 'One-step equations': question = `Solve: x + ${b} = ${a + b}`; answer = a; hint = 'Subtract the same number from both sides.'; explanation = [`Keep both sides equal: subtract ${b} from each side.`, `x = ${a + b} − ${b} = ${answer}.`]; break;
    case 'Linear equations': question = `Solve: ${b + 1}x + ${b} = ${a * (b + 1) + b}`; answer = a; hint = 'Undo addition first, then undo multiplication.'; explanation = [`Subtract ${b} from both sides: ${b + 1}x = ${a * (b + 1)}.`, `Divide both sides by ${b + 1}: x = ${a * (b + 1)} ÷ ${b + 1} = ${answer}.`]; break;
    case 'Pythagorean theorem': question = `A right triangle has legs ${3 * a} and ${4 * a}. Find the hypotenuse.`; answer = 5 * a; hint = 'Use c² = a² + b², then take the positive square root.'; explanation = [`For a right triangle, c² is the sum of the squared legs.`, `c² = ${3 * a}² + ${4 * a}² = ${9 * a * a} + ${16 * a * a} = ${25 * a * a}.`, `A length is positive, so c = √${25 * a * a} = ${answer}.`]; break;
    case 'Quadratic equations': question = `Find the positive solution: x² = ${a * a}`; answer = a; hint = 'Which positive number squared gives the right side?'; explanation = [`Take square roots: x = ±√${a * a} = ±${a}.`, `The question asks for the positive solution, so x = ${answer}.`]; break;
    case 'Slope': question = `Find the slope through (0, ${b}) and (${a}, ${a * b + b}).`; answer = b; hint = 'Divide the change in y by the change in x.'; explanation = [`Slope = change in y ÷ change in x.`, `Change in y: ${a * b + b} − ${b} = ${a * b}. Change in x: ${a} − 0 = ${a}.`, `Slope = ${a * b} ÷ ${a} = ${answer}.`]; break;
    case 'Systems of equations': question = `Find x: x + y = ${a + b}; 2x + y = ${2 * a + b}.`; answer = a; hint = 'Subtract the first equation from the second.'; explanation = [`Subtract the first equation from the second; the y terms cancel.`, `(2x + y) − (x + y) = ${2 * a + b} − ${a + b}.`, `x = ${answer}.`]; break;
    case 'Quadratic vertex': question = `What is the x-coordinate of the vertex of y = (x − ${a})² + ${b}?`; answer = a; hint = 'In vertex form y = (x − h)² + k, the vertex is (h, k).'; explanation = [`Vertex form is y = (x − h)² + k, with vertex (h, k).`, `Here h = ${a} and k = ${b}. The square is zero at x = ${a}.`, `The vertex is (${a}, ${b}), so its x-coordinate is ${answer}.`]; break;
    case 'Exponents and logarithms': { const exp = int(1, s.challenge === 'support' ? 3 : 6); question = `log₂(${2 ** exp}) = ?`; answer = exp; hint = 'What power of 2 equals the number inside the logarithm?'; explanation = [`A base-2 logarithm asks which exponent on 2 gives ${2 ** exp}.`, `${Array.from({ length: exp }, () => 2).join(' × ')} = ${2 ** exp}, so 2^${exp} = ${2 ** exp}.`, `log₂(${2 ** exp}) = ${answer}.`]; break; }
    case 'Arithmetic sequences': question = `A sequence starts at ${a} and adds ${b} each term. What is term 5?`; answer = a + 4 * b; hint = 'The fifth term is the first term plus four common differences.'; explanation = [`Term 1 is ${a}. Reaching term 5 takes four additions of ${b}.`, `Terms: ${Array.from({ length: 5 }, (_, i) => a + i * b).join(', ')}.`, `Term 5 = ${a} + 4 × ${b} = ${answer}.`]; break;
    case 'Derivatives': question = `If f(x) = ${a}x², what is f′(${b})?`; answer = 2 * a * b; hint = 'Use the power rule, then substitute the given x value.'; explanation = [`The power rule gives d/dx(x²) = 2x. Keep the coefficient ${a}.`, `f′(x) = ${2 * a}x.`, `Substitute x = ${b}: f′(${b}) = ${2 * a} × ${b} = ${answer}.`]; break;
    case 'Probability': { const flips = int(2, s.challenge === 'support' ? 3 : 5); question = `A fair coin is flipped ${flips} times. What is P(exactly 1 head), as a decimal?`; answer = flips / 2 ** flips; hint = `There are 2^${flips} equally likely sequences. Count the sequences with exactly one head.`; explanation = [`Assuming independent fair flips, there are 2^${flips} = ${2 ** flips} equally likely sequences.`, `Exactly one head can be in any of ${flips} positions, so ${flips} sequences work.`, `Probability = favorable ÷ total = ${flips}/${2 ** flips} = ${answer}.`]; break; }
  }
  return { practiceSettings: s, skillId: `${s.grade}:${topic}`, templateId: `practice:${topic}:v1`, context: 'practice', id: `learn_${Date.now()}_${random().toString(36).slice(2)}`, question: withAnswerFormat(question, answer), answer, hint, explanation, difficulty: s.challenge === 'stretch' ? 3 : s.challenge === 'support' ? 1 : 2, reward: 10, type: topic, topic, grade: s.grade };
}

// toPrecision drops float noise so 0.1 + 0.2 counts as one decimal place, not seventeen.
const decimalPlaces = (n: number) => (String(Number(n.toPrecision(12))).split('e')[0].split('.')[1] ?? '').length;
export const ROUNDING_NOTE = 'Round your decimal to the hundredths place (2 digits after the point).';
export const FRACTION_NOTE = 'Type your answer as a fraction, like 2/7.';
const asksForDecimal = (text: string) => /as a decimal|enter a decimal/i.test(text);
/** Long answers need a stated format. Fraction math stays exact (2/7, not 0.28); rounding is allowed
 * only where the question itself asks for a decimal. */
export function withAnswerFormat(text: string, answer: number): string {
  if (!Number.isFinite(answer) || decimalPlaces(answer) <= 2 || text.includes(ROUNDING_NOTE) || text.includes(FRACTION_NOTE)) return text;
  return `${text} ${asksForDecimal(text) ? ROUNDING_NOTE : FRACTION_NOTE}`;
}
/** Exact value (fraction, equivalent fraction, or exact decimal). A correctly rounded decimal counts
 * only when the prompt carries ROUNDING_NOTE; truncation never counts. */
export function answerMatches(input: string | number, expected: number, prompt = ''): boolean {
  const text = String(input).trim(), value = typeof input === 'number' ? input : parseMathAnswer(text);
  if (!Number.isFinite(value) || !Number.isFinite(expected)) return false;
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-7, Math.abs(b) * 1e-9);
  if (close(value, expected)) return true;
  if (!prompt.includes(ROUNDING_NOTE)) return false;
  const places = /^[+-]?\d*\.(\d+)$/.exec(text)?.[1].length ?? 0;
  if (places < 2 || places >= decimalPlaces(expected)) return false;
  const f = 10 ** places;
  return close(value, Math.round(expected * f) / f);
}

/** Strict numeric or fraction input; never accept a truncated answer such as "3abc". */
export function parseMathAnswer(input: string): number {
  const text = input.trim();
  if (!text) return NaN;
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  if (new RegExp(`^${number}$`).test(text)) return Number(text);
  if (new RegExp(`^${number}\\s*/\\s*${number}$`).test(text)) {
    const [a, b] = text.split('/').map(Number);
    return b === 0 ? NaN : a / b;
  }
  return NaN;
}
