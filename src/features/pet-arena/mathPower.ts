import type { EngineState, MathProblem } from '../../types';
import { answerMatches, generateLearningProblem, normalizeLearning, type LearningSettings } from '../../services/game/curriculum';
import { recordLearning } from '../../services/game/learningEvidence';
import type { Fight } from './combat';

export const POWER_NAMES = { strike: 'Power Strike', shield: 'Number Shield', energy: 'Energy Spark' } as const;
export type MathPower = keyof typeof POWER_NAMES;
export interface PowerChallenge {
  id: string;
  power: MathPower;
  question: string;
  learning: LearningSettings;
  attempts: number;
  solved: boolean;
  answerText?: string;
  help?: string[];
}
export interface MathPowerState {
  version: 1;
  used: number;
  lastRound: number;
  challenge: PowerChallenge | null;
  activations: { power: MathPower; method: 'trace' | 'tap'; answer: string }[];
}
export type MathPowerCommand =
  | { kind: 'math-open'; fightId: string; round: number; power: MathPower }
  | { kind: 'math-answer'; fightId: string; round: number; challengeId: string; answer: string }
  | { kind: 'math-help'; fightId: string; round: number; challengeId: string }
  | { kind: 'math-activate'; fightId: string; round: number; challengeId: string; method: 'trace' | 'tap' };

export const freshMathPower = (): MathPowerState => ({ version: 1, used: 0, lastRound: 0, challenge: null, activations: [] });
export const challengeID = (f: Fight) => `arena-math:${f.id}:${f.mathPower?.used ?? 0}`;
export function powerGain(f: Fight, power: MathPower): number {
  const p = f.fighters[0];
  return power === 'shield' ? Math.max(0, Math.min(10, Math.floor(p.maxHP * .4) - p.shield))
    : power === 'energy' ? Math.max(0, Math.min(8, 60 - p.energy)) : p.mathStrike ? 0 : 1;
}
export function powerDescription(f: Fight, power: MathPower): string {
  return power === 'strike' ? 'Next attack +25% damage, up to +8, before enemy protection.'
    : power === 'shield' ? `+${powerGain(f, power)} shield. Protect your pet from the next hits.`
    : `+${powerGain(f, power)} energy. Bring your Signature closer.`;
}

/** Offline questions can be reconstructed after reload. Online callers supply a private server question. */
export function localPowerProblem(f: Fight, learning: LearningSettings): MathProblem {
  let seed = 2166136261;
  for (const c of challengeID(f)) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return { ...generateLearningProblem(learning, random), id: challengeID(f), context: 'arena-math' };
}

/** Mutates only a cloned save. Combat charge, evidence and effect share the existing arena transaction. */
export function applyMathPower(state: EngineState, c: MathPowerCommand, privateProblem?: MathProblem): EngineState {
  const next = structuredClone(state), f = next.petArena?.fight, m = f?.mathPower;
  if (!f || f.phase !== 'active' || f.id !== c.fightId || f.round !== c.round || !m || f.fighters[0].id !== next.pet?.id)
    throw Error('Start a new battle with your pet to use Math Power.');
  if (m.used >= 2 || m.lastRound === f.round) throw Error(m.used >= 2 ? 'Both Math Powers were used this battle.' : 'Choose your battle move before another Math Power.');
  const learning = m.challenge?.learning ?? normalizeLearning(next.learning);
  const problem = privateProblem ?? localPowerProblem(f, learning);
  if (problem.id !== challengeID(f)) throw Error('This question belongs to another battle.');
  if (c.kind === 'math-open') {
    if (!Object.prototype.hasOwnProperty.call(POWER_NAMES, c.power) || !powerGain(f, c.power)) throw Error('Choose a power your pet can use.');
    if (m.challenge) m.challenge.power = c.power;
    else m.challenge = { id: problem.id, question: problem.question, power: c.power, learning: problem.practiceSettings ?? learning, attempts: 0, solved: false };
    return next;
  }
  const q = m.challenge;
  if (!q || q.id !== c.challengeId) throw Error('Open your saved Math Power question first.');
  if (c.kind === 'math-help') {
    if (!q.learning.learningHelp) throw Error('Learning help is turned off for this assignment.');
    if (q.solved) return next;
    q.help = [...(problem.hint ? [problem.hint] : []), ...(problem.explanation ?? [])];
    return recordLearning(next, problem, 'arena-math', undefined, 'explanation');
  }
  if (c.kind === 'math-answer') {
    if (q.solved) return next;
    if (!c.answer.trim() || c.answer.length > 80) throw Error('Enter a number or fraction.');
    const correct = answerMatches(c.answer, problem.answer, problem.question);
    q.attempts = Math.min(10000, q.attempts + 1);
    q.solved = correct;
    if (correct) q.answerText = c.answer.trim();
    return recordLearning(next, problem, 'arena-math', correct);
  }
  if (!q.solved || !q.answerText) throw Error('Solve the question before activating your power.');
  if (!powerGain(f, q.power)) throw Error('Choose a different power; this one is already full.');
  const p = f.fighters[0], gain = powerGain(f, q.power);
  if (q.power === 'strike') p.mathStrike = true;
  else if (q.power === 'shield') p.shield += gain;
  else p.energy += gain;
  f.events = [{ actor: 0, kind: q.power === 'strike' ? 'status' : q.power, power: q.power,
    text: `${p.name}: ${POWER_NAMES[q.power]} ${q.power === 'strike' ? 'ready for the next attack' : `+${gain} ${q.power}`}`,
    ...(q.power === 'strike' ? {} : { amount: gain }) }];
  f.history = [...f.history, ...f.events].slice(-100);
  m.used++;
  m.lastRound = f.round;
  m.activations.push({ power: q.power, method: c.method, answer: q.answerText });
  m.challenge = null;
  return next;
}

export function validMathPower(m: MathPowerState | undefined): boolean {
  if (m === undefined) return true; // Battles saved before this release finish with their original rules.
  const q = m.challenge;
  return m.version === 1 && Number.isInteger(m.used) && m.used >= 0 && m.used <= 2
    && Number.isInteger(m.lastRound) && m.lastRound >= 0 && m.lastRound <= 20
    && Array.isArray(m.activations) && m.activations.length === m.used
    && m.activations.every(a => Object.prototype.hasOwnProperty.call(POWER_NAMES, a.power) && ['trace', 'tap'].includes(a.method) && typeof a.answer === 'string' && a.answer.length <= 80)
    && (!q || typeof q.id === 'string' && q.id.length <= 200 && typeof q.question === 'string' && q.question.length < 4000
      && Object.prototype.hasOwnProperty.call(POWER_NAMES, q.power) && Number.isInteger(q.attempts) && q.attempts >= 0 && q.attempts <= 10000
      && typeof q.solved === 'boolean' && (!q.solved || typeof q.answerText === 'string' && q.answerText.length > 0 && q.answerText.length <= 80)
      && (!q.help || Array.isArray(q.help) && q.help.length <= 30 && q.help.every(s => typeof s === 'string' && s.length < 4000)));
}
