import type { MathProblem } from '../../types';
import { generateLearningProblem, GRADE_TOPICS, normalizeLearning, type LearningSettings } from '../../services/game/curriculum';
import { generateMathProblem } from '../../services/game/mathEngine';
import { getSkill } from '../skill-challenge/catalog';
import { learningProblem, lesson, type Visual } from '../skill-challenge/lessons';

export interface LessonTask { problem: MathProblem; visual?: Visual }
export interface MiniLesson {
  title: string; example: { question: string; steps: string[]; visual?: Visual };
  guided: LessonTask; fresh: LessonTask;
}
const completeQuestion = (q: { text: string; visual?: Visual }) => q.visual
  ? `${q.visual.rows.map(([label, value]) => `${label}: ${value}`).join('. ')}. ${q.visual.dots ? `Objects: ${q.visual.dots.map(n => '● '.repeat(n).trim()).join(' | ')}. ` : ''}${q.text}` : q.text;

// These are practice copies of the game's relationships, never actions on live supplies.
export const GAME_LESSON_TEMPLATES = ['budget-subtraction-v1', 'budget-missing-addend-v1', 'merge-sum-v1', 'recipe-stock-percent-v1', 'defense-reserve-v1', 'recipe-capacity-v1', 'recipe-proportion-v1', 'recipe-scaling-v1', 'recipe-stock-fraction-v1', 'defense-function-v1'] as const;
function gamePractice(source: MathProblem, random: () => number): MathProblem {
  const a = 2 + Math.floor(random() * 7), b = 2 + Math.floor(random() * 5), total = a * b;
  let question: string, answer: number, hint: string, explanation: string[];
  switch (source.templateId) {
    case 'merge-sum-v1': question = `Two practice tiles have values ${a} and ${b}. What is their sum?`; answer = a + b; hint = 'Combine the two values.'; explanation = [`${a} + ${b} = ${answer}.`]; break;
    case 'budget-missing-addend-v1': question = `Solve x + ${a} = ${total}.`; answer = total - a; hint = 'Subtract the known part from both sides.'; explanation = [`x = ${total} − ${a} = ${answer}.`]; break;
    case 'defense-reserve-v1': question = `A practice budget has ${4 * a + b} energy. Keep ${b} in reserve. Towers cost 4 each. Solve 4x + ${b} = ${4 * a + b}.`; answer = a; hint = 'Subtract the reserve, then divide by the cost of a tower.'; explanation = [`${4 * a + b} − ${b} = ${4 * a}.`, `${4 * a} ÷ 4 = ${a} towers.`]; break;
    case 'defense-function-v1': question = `A practice energy model is E(x) = ${total} − ${a}x. Find E(1).`; answer = total - a; hint = 'Substitute 1 for x, then subtract the cost.'; explanation = [`E(1) = ${total} − ${a} × 1 = ${answer}.`]; break;
    case 'recipe-stock-percent-v1': question = `A practice recipe uses ${a} of ${total} portions. What percent is used? Round to the nearest tenth; enter the percent number.`; answer = Math.round(1000 / b) / 10; hint = 'Divide the part by the whole, then multiply by 100.'; explanation = [`${a} ÷ ${total} × 100 ≈ ${answer}%.`]; break;
    case 'recipe-capacity-v1': question = `A practice serving uses ${a}/${total} of a stock. How many servings can the stock supply? Calculate 1 ÷ (${a}/${total}).`; answer = b; hint = 'Divide by a fraction by multiplying by its reciprocal.'; explanation = [`1 × ${total}/${a} = ${b} servings.`]; break;
    case 'recipe-stock-fraction-v1': question = `A practice recipe uses ${b - 1}/${b} of ${total} portions. How many portions is that?`; answer = a * (b - 1); hint = 'Find one equal share, then take the numerator’s number of shares.'; explanation = [`${total} ÷ ${b} = ${a} per share.`, `${a} × ${b - 1} = ${answer}.`]; break;
    case 'recipe-scaling-v1': case 'recipe-proportion-v1': question = `A practice recipe uses ${a} portions per serving. How many portions for ${b} servings?`; answer = total; hint = 'Scale the serving count and ingredient amount together.'; explanation = [`${a} × ${b} = ${total} portions.`]; break;
    default: question = `A practice supply has ${total} items. Use ${a}. How many remain?`; answer = total - a; hint = 'Subtract the amount used from the starting supply.'; explanation = [`${total} − ${a} = ${answer}.`, `Check: ${answer} + ${a} = ${total}.`];
  }
  return { ...source, question, answer, hint, explanation };
}

const operation = (q: string) => q.includes('×') ? '×' : q.includes('÷') ? '÷' : /[−-]/.test(q) ? '-' : '+';
function generator(source: MathProblem, settings: LearningSettings, random: () => number, guided: boolean): () => LessonTask {
  const skill = source.skillId ? getSkill(source.skillId) : undefined;
  if (skill) return () => {
    const q = learningProblem(skill.id, settings.challenge, guided ? 'practice' : 'check', guided ? 0 : 1, random);
    return { problem: { ...source, question: completeQuestion(q), answer: q.answer, hint: q.hint, explanation: [q.explanation], templateId: q.templateId }, visual: q.visual };
  };
  if (GAME_LESSON_TEMPLATES.includes(source.templateId as typeof GAME_LESSON_TEMPLATES[number])) return () => ({ problem: gamePractice(source, random) });
  const grade = source.grade ?? settings.grade, topic = source.topic ?? source.type;
  if (topic && (GRADE_TOPICS[grade] as readonly string[] | undefined)?.includes(topic)) return () => ({ problem: generateLearningProblem({ ...settings, grade, topic }, random) });
  if (['arithmetic', 'comparison', 'missing_number', 'word_problem'].includes(source.type ?? '')) return () => {
    let p = generateMathProblem(source.difficulty, source.type as 'arithmetic');
    for (let i = 0; i < 50 && operation(p.question) !== operation(source.question); i++) p = generateMathProblem(source.difficulty, source.type as 'arithmetic');
    return { problem: p };
  };
  // An unknown future generator must add a lesson mapping, not silently teach another topic.
  throw new Error('This question needs a matching lesson. You can still use its hint and worked explanation.');
}

export function createMiniLesson(source: MathProblem, settings: LearningSettings, random = Math.random): MiniLesson {
  const actual = normalizeLearning(source.practiceSettings ?? { ...settings, grade: source.grade ?? settings.grade });
  const skill = source.skillId ? getSkill(source.skillId) : undefined;
  const authored = skill ? lesson(skill.id, actual.challenge) : undefined;
  const fresh = (avoid: string[], guided = false) => {
    const make = generator(source, actual, random, guided);
    let task = make();
    for (let i = 0; i < 80 && avoid.includes(task.problem.question); i++) task = make();
    if (avoid.includes(task.problem.question)) throw new Error('Could not make a fresh example. Close and try the lesson again.');
    return { ...task, problem: { ...task.problem, id: `mini:${crypto.randomUUID()}`, reward: 0, context: 'mini-lesson', practiceSettings: actual } };
  };
  const guided = fresh([source.question, authored?.question ?? ''], true);
  const next = fresh([source.question, authored?.question ?? '', guided.problem.question]);
  return { title: authored?.title ?? source.topic ?? 'Work through this math',
    example: authored ? { question: authored.question, steps: authored.steps, visual: authored.visual }
      : { question: source.question, steps: source.explanation?.length ? source.explanation : [source.hint ?? 'Identify what is known and what you need to find.', `The answer for this example is ${source.answer}.`] },
    guided, fresh: next };
}

export function skillLessonSource(id: string, settings: LearningSettings): MathProblem {
  const skill = getSkill(id);
  if (!skill) throw new Error('Unknown lesson skill');
  const q = learningProblem(id, settings.challenge, 'check', 0, Math.random);
  return { id: `mini-entry:${id}`, skillId: id, grade: skill.grade, topic: skill.topic, question: completeQuestion(q), answer: q.answer, hint: q.hint, explanation: [q.explanation], difficulty: 1, reward: 0, practiceSettings: { ...settings, grade: skill.grade, topic: skill.topic } };
}
