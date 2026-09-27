import { answerMatches, normalizeLearning, parseMathAnswer, type LearningSettings } from '../../services/game/curriculum';
import { skillsForGrade, type Subskill } from '../skill-challenge/catalog';
import { learningProblem, type LearningProblem } from '../skill-challenge/lessons';

export type Cadence = 'play' | 'weekly' | 'daily' | 'teacher';
export type Outcome = 'correct' | 'needs-practice' | 'not-learned';
export interface CheckItem {
  id: string; skillId: string; skillName: string; grade?: number; problem: LearningProblem;
  response?: string; outcome?: Outcome; answeredAt?: number;
}
export interface CheckRound {
  id: string; activity?: string; learning: LearningSettings; startedAt: number; completedAt: number | null; items: CheckItem[];
}
export interface SkillGap { skillId: string; skillName: string; grade: number; at: number }
// gaps is optional because checks saved before gap tracking have no field.
export interface CheckState { round: CheckRound | null; history: CheckRound[]; waivedUntil: number; required: boolean; gaps?: SkillGap[] }
export const emptyCheck = (): CheckState => ({ round: null, history: [], waivedUntil: 0, required: false, gaps: [] });
export const CHECK_SIZE = 3;
export const DAY = 86400000;
export const CHECK_ACTIVITIES = ['math', 'catch_math', 'number_merge', 'dash', 'guard', 'cafe', 'momentum', 'battle', 'dungeon', 'delivery', 'woodland', 'first_adventure', 'classroom'] as const;
export const learningKey = (s: LearningSettings) => `${s.grade}:${s.topic}:${s.challenge}`;
export const eligibleSkills = (s: LearningSettings) => skillsForGrade(s.grade).filter(skill => s.topic === 'mixed' || skill.topic === s.topic);

/** Skills a learner said they haven't learned are skipped until the teacher clears them.
 * When the assigned grade runs short, earlier grades fill in and the teacher is told. */
export function checkPool(state: CheckState, learning: LearningSettings) {
  const gapIds = new Set((state.gaps ?? []).map(g => g.skillId));
  const own = eligibleSkills(learning).filter(s => !gapIds.has(s.id));
  const fallback: Subskill[] = [];
  for (let grade = learning.grade - 1; grade >= 0 && own.length + fallback.length < CHECK_SIZE; grade--)
    fallback.push(...skillsForGrade(grade).filter(s => !gapIds.has(s.id)));
  return { own, fallback, exhausted: own.length < CHECK_SIZE };
}

// The check is a weekly diagnostic, not a toll per game; 'play' is kept only for stored policies.
export function checkDue(state: CheckState, learning: LearningSettings, cadence: Cadence, now: number): boolean {
  if (state.waivedUntil > now) return false;
  if (state.round && !state.round.completedAt) return true;
  const pool = checkPool(state, learning);
  if (!pool.own.length && !pool.fallback.length) return false;
  if (state.required) return true;
  if (cadence === 'teacher') return false;
  const last = state.round;
  return !last?.completedAt || learningKey(last.learning) !== learningKey(learning)
    || now >= last.completedAt + (cadence === 'daily' ? DAY : 7 * DAY);
}

export function startCheck(state: CheckState, settings: LearningSettings, now: number, random: () => number, id: () => string, activity?: string): CheckState {
  if (state.round && !state.round.completedAt) return state;
  const learning = normalizeLearning(settings);
  const history = [...state.history, ...(state.round ? [state.round] : [])].filter(r => r.completedAt && r.completedAt >= now - 180 * DAY).slice(-59);
  // Sample the least recently checked objectives first; interleave all supported topics.
  // An incorrect or untaught response is evidence of a need, never a placement decision.
  const seen = new Map<string, number>();
  for (const round of history.filter(r => r.learning.grade === learning.grade && r.learning.challenge === learning.challenge)) for (const item of round.items) if (item.answeredAt) seen.set(item.skillId, Math.max(seen.get(item.skillId) ?? 0, item.answeredAt));
  const count = skillsForGrade(learning.grade).length;
  const order = Array.from({ length: 3 }, (_, offset) => Array.from({ length: count / 3 }, (_, group) => group * 3 + offset)).flat();
  const pool = checkPool(state, learning);
  const own = pool.own.sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0) || order.indexOf(a.variant) - order.indexOf(b.variant));
  const fallback = pool.fallback.sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0) || b.grade - a.grade);
  const skills = [...own, ...fallback].slice(0, CHECK_SIZE);
  if (!skills.length) return { ...state, required: false };
  const round: CheckRound = { id: id(), ...(activity ? { activity } : {}), learning, startedAt: now, completedAt: null, items: skills.map((s, index) => ({
    id: id(), skillId: s.id, skillName: s.name, grade: s.grade, problem: learningProblem(s.id, learning.challenge, 'baseline', index, random),
  })) };
  return { ...state, history, round, required: true };
}

export function answerCheck(state: CheckState, questionId: string, response: string, notLearned: boolean, now: number): CheckState {
  const round = state.round;
  if (!round) throw new Error('Start your check first.');
  const recorded = round.items.find(item => item.id === questionId);
  if (recorded?.outcome) return state; // Lost-response retries cannot change an answer.
  const current = round.items.find(item => !item.outcome);
  if (!current || current.id !== questionId) throw new Error('Refresh to continue your current question.');
  if (response.length > 80 || (!notLearned && !Number.isFinite(parseMathAnswer(response)))) throw new Error('Enter a number or fraction, or choose “I haven’t learned this yet”.');
  const result: CheckItem = { ...current, response: notLearned ? '' : response.trim(), answeredAt: now,
    outcome: notLearned ? 'not-learned' : answerMatches(response, current.problem.answer, current.problem.text) ? 'correct' : 'needs-practice' };
  const items = round.items.map(item => item.id === questionId ? result : item);
  const completedAt = items.every(item => item.outcome) ? now : null;
  const gaps = notLearned && !(state.gaps ?? []).some(g => g.skillId === current.skillId)
    ? [...(state.gaps ?? []), { skillId: current.skillId, skillName: current.skillName, grade: current.grade ?? round.learning.grade, at: now }] : state.gaps ?? [];
  return { ...state, gaps, required: !completedAt, round: { ...round, items, completedAt } };
}

export function clearGap(state: CheckState, skillId: string): CheckState {
  if (!(state.gaps ?? []).some(g => g.skillId === skillId)) throw new Error('That skill gap was already cleared.');
  return { ...state, gaps: (state.gaps ?? []).filter(g => g.skillId !== skillId) };
}

export function coverage(state: CheckState, learning: LearningSettings) {
  const rounds = [...state.history, ...(state.round ? [state.round] : [])].filter(r => r.learning.grade === learning.grade && r.learning.challenge === learning.challenge);
  return eligibleSkills(learning).map(skill => {
    const last = rounds.flatMap(r => r.items).filter(i => i.skillId === skill.id && i.outcome).sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0))[0];
    return { id: skill.id, name: skill.name, outcome: last?.outcome ?? 'not-checked' as const, at: last?.answeredAt ?? null };
  });
}

export function publicCheck(state: CheckState, learning: LearningSettings, cadence: Cadence, revision: number, now: number, activity?: string) {
  const r = state.round, current = r?.items.find(i => !i.outcome);
  const pool = checkPool(state, learning);
  return { revision, cadence, serverNow: now, activity: activity ?? r?.activity, due: checkDue(state, learning, cadence, now), waivedUntil: state.waivedUntil,
    learning, coverage: coverage(state, learning), gaps: state.gaps ?? [], exhausted: pool.exhausted, outOfQuestions: !pool.own.length && !pool.fallback.length,
    round: r ? { id: r.id, activity: r.activity, learning: r.learning, startedAt: r.startedAt, completedAt: r.completedAt,
      answered: r.items.filter(i => i.outcome).length, total: r.items.length,
      current: current ? { id: current.id, skillId: current.skillId, skillName: current.skillName, text: current.problem.text, visual: current.problem.visual } : null,
      // Keep solutions private until the whole small check is complete.
      results: r.completedAt ? r.items.map(i => ({ id: i.id, skillId: i.skillId, skillName: i.skillName, text: i.problem.text, response: i.response, outcome: i.outcome!, expected: i.problem.answer, explanation: i.problem.explanation })) : [],
    } : null };
}
export type CheckView = ReturnType<typeof publicCheck>;
export interface TeacherChecks { cadence: Cadence; students: { id: string; alias: string; active: boolean; check: CheckView }[] }
