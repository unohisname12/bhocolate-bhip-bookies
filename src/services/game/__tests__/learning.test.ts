import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LEARNING, GRADE_TOPICS, generateLearningProblem, normalizeLearning, parseMathAnswer } from '../curriculum';
import { checkAnswer, generateMathProblem } from '../mathEngine';
import { addXP } from '../evolutionEngine';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
import { defaultCatchConfig } from '../../../features/catch-math/config';
import { generateRound } from '../../../features/catch-math/problemGenerator';
import { resolveThrow } from '../../../features/catch-math/catchResolver';
import { applyLearningSettings } from '../applyLearningSettings';
import { createEggDiscovery } from '../eggDiscovery';

describe('K–12 learning controls', () => {
  for (let grade = 0; grade <= 12; grade++) {
    it(`generates valid, bounded questions for every grade ${grade} topic and challenge`, () => {
      for (const topic of GRADE_TOPICS[grade]) for (const challenge of ['support', 'standard', 'stretch'] as const) {
        for (const random of [0, 0.25, 0.5, 0.999999]) {
          const problem = generateLearningProblem({ ...DEFAULT_LEARNING, grade, topic, challenge }, () => random);
          expect(problem.question.length).toBeGreaterThan(3);
          expect(Number.isFinite(problem.answer)).toBe(true);
          expect(checkAnswer(problem, parseMathAnswer(String(problem.answer)))).toBe(true);
          expect(problem.hint).toBeTruthy();
          expect(problem.explanation!.length).toBeGreaterThanOrEqual(2);
          expect(problem.explanation!.join(' ')).toContain(String(problem.answer));
          expect(problem.explanation!.join(' ')).not.toMatch(/undefined|NaN|Infinity/);
          expect(problem.difficulty).toBeLessThanOrEqual(3);
          if (grade === 0) expect(problem.answer).toBeLessThanOrEqual(10);
          if (grade === 1) expect(problem.answer).toBeLessThanOrEqual(20);
        }
      }
    });
  }
  it('uses real high-school content rather than bigger arithmetic numbers', () => {
    expect(generateLearningProblem({ ...DEFAULT_LEARNING, grade: 12, topic: 'Derivatives' }, () => 0.5)).toMatchObject({ question: 'If f(x) = 5x², what is f′(5)?', answer: 50 });
    expect(generateLearningProblem({ ...DEFAULT_LEARNING, grade: 10, topic: 'Systems of equations' }, () => 0.5)).toMatchObject({ question: 'Find x: x + y = 10; 2x + y = 15.', answer: 5 });
    expect(generateLearningProblem({ ...DEFAULT_LEARNING, grade: 5, topic: 'Decimals' }, () => 0)).toMatchObject({ answer: 0.2 });
  });
  it('sanitizes invalid settings and resets out-of-grade topics', () => {
    expect(normalizeLearning({ grade: -1, topic: 'Derivatives' })).toMatchObject({ grade: 0, topic: 'mixed' });
    expect(normalizeLearning({ grade: NaN })).toEqual(DEFAULT_LEARNING);
  });
  it('defaults old profiles to help on and respects an explicit opt-out', () => {
    expect(normalizeLearning({ timedWarmup: false }).learningHelp).toBe(true);
    expect(normalizeLearning({ learningHelp: false }).learningHelp).toBe(false);
  });
  it('changing help does not reset an active question or rewards', () => {
    const state = createTestEngineState();
    const problems = Array.from({ length: 3 }, () => generateLearningProblem(state.learning));
    state.growthTrial = { petId: state.pet!.id, stage: 'baby', kind: 'evolution', problems, index: 1, feedback: 'Try again.', complete: false };
    state.eggDiscovery = { ...createEggDiscovery(), mission: { day: '2026-09-05', style: 'help', problems, index: 1, feedback: 'Try again!' } };
    const after = applyLearningSettings(state, { ...state.learning, learningHelp: false });
    expect(after.learning.learningHelp).toBe(false);
    expect(after.growthTrial).toBe(state.growthTrial);
    expect(after.eggDiscovery).toBe(state.eggDiscovery);
    expect(after.player).toBe(state.player);
  });
  it('works out borrowing, zero addition, decimals and probability from actual operands', () => {
    const problem = (grade: number, topic: string, random: number) => generateLearningProblem({ ...DEFAULT_LEARNING, grade, topic }, () => random);
    expect(problem(0, 'Addition within 10', 0).explanation).toEqual(['Start at 0. Move forward 0 counting steps.', '0 + 0 = 0.']);
    expect(problem(2, 'Two-digit subtraction', 0.5).explanation).toEqual(['Split what you take away: 35 = 30 + 5.', 'Take away the tens first: 60 − 30 = 30.', 'Then the ones: 30 − 5 = 25. Check: 25 + 35 = 60.']);
    expect(problem(5, 'Decimals', 0).explanation?.join(' ')).toContain('2 tenths. Divide by 10 to write this as a decimal: 0.2');
    expect(problem(12, 'Probability', 0.999999).explanation?.join(' ')).toContain('5/32 = 0.15625');
  });
  it('accepts decimals, negatives and fractions without truncation', () => {
    expect(parseMathAnswer('-1.25')).toBe(-1.25);
    expect(parseMathAnswer('1 / 5')).toBe(0.2);
    for (const bad of ['', ' ', '3abc', '1/0', '1/2/3', 'Infinity', '0x10']) expect(parseMathAnswer(bad)).toBeNaN();
    expect(checkAnswer({ id: 'p', question: '', answer: 0, difficulty: 1, reward: 0 }, parseMathAnswer(''))).toBe(false);
  });
  it('keeps Catch Math on the selected grade across consecutive rounds', () => {
    const config = { ...defaultCatchConfig('missing_number', 'medium'), learning: { ...DEFAULT_LEARNING, grade: 12, topic: 'Derivatives' } };
    const { round } = generateRound(config);
    expect(round.prompt).toContain('f′');
    expect(round.learningProblem?.explanation?.join(' ')).toContain('power rule');
    expect(new Set(round.choices.map(c => c.label)).size).toBe(round.choices.length);
    const next = resolveThrow({ round, choice: round.correct, config, session: null });
    expect(next.resolution.correct).toBe(true);
    expect(next.resolution.nextRound?.prompt).toContain('f′');
  });
});

describe('audit regressions', () => {
  it('marks the missing subtrahend, not the subtraction result, correct', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.75).mockReturnValueOnce(0.2).mockReturnValueOnce(0.6).mockReturnValue(0.4);
    const problem = generateMathProblem(1, 'missing_number');
    expect(problem.question).toBe('10 - _ = 3');
    expect(problem.answer).toBe(7);
    vi.restoreAllMocks();
  });
  it('awards every level crossed by a large XP reward', () => {
    const pet = createTestEngineState().pet!;
    const result = addXP({ ...pet, progression: { ...pet.progression, level: 1, xp: 0 } }, 1000);
    expect(result.progression).toMatchObject({ level: 4, xp: 100 });
    expect(addXP(pet, Infinity)).toBe(pet);
  });
  it('accumulates passive XP across one-second ticks', () => {
    let state = createTestEngineState();
    const xp = state.pet!.progression.xp;
    for (let i = 0; i < 60; i++) state = engineReducer(state, { type: 'TICK', deltaMs: 1000 });
    expect(state.pet!.progression.xp).toBe(xp + 1);
  });
});
