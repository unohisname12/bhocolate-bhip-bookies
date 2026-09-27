import { describe, expect, it } from 'vitest';
import { createMiniLesson, GAME_LESSON_TEMPLATES, skillLessonSource } from './model';
import { skillsForGrade } from '../skill-challenge/catalog';
import { DEFAULT_LEARNING, generateLearningProblem, GRADE_TOPICS } from '../../services/game/curriculum';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { engineReducer } from '../../engine/state/engineReducer';
import { scanEvidence, newScanMemo } from '../play-time/evidence';
import { validEvidence } from '../../services/game/validWoodland';
import { holdMiniLesson, miniLessonActive } from './pause';
import { GameEngine } from '../../engine/core/GameEngine';
const random = () => { let seed = 19731; return () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; }; };

describe('mini-lessons across the complete supported catalog', () => {
  it('provides a same-skill example, guided task and different fresh task for every objective at every challenge level', () => {
    const skills = Array.from({ length: 13 }, (_, grade) => skillsForGrade(grade)).flat();
    expect(skills).toHaveLength(132);
    for (const skill of skills) for (const challenge of ['support', 'standard', 'stretch'] as const) {
      const settings = { ...DEFAULT_LEARNING, grade: skill.grade, topic: skill.topic, challenge };
      const source = skillLessonSource(skill.id, settings), l = createMiniLesson(source, settings, random());
      expect(l.title, skill.id).toBe(skill.name);
      expect(l.example.steps.length, skill.id).toBeGreaterThan(1);
      expect(l.guided.problem.skillId, skill.id).toBe(skill.id);
      expect(l.fresh.problem.skillId, skill.id).toBe(skill.id);
      expect(new Set([source.question, l.guided.problem.question, l.fresh.problem.question]).size, skill.id).toBe(3);
      expect(l.guided.problem.id).not.toBe(l.fresh.problem.id);
      expect(Number.isFinite(l.fresh.problem.answer), skill.id).toBe(true);
      expect(l.fresh.problem.reward).toBe(0);
    }
  });
  it('covers every ordinary practice strand without switching the assigned topic', () => {
    const rng = random();
    for (let grade = 0; grade < GRADE_TOPICS.length; grade++) for (const topic of GRADE_TOPICS[grade]) {
      const settings = { ...DEFAULT_LEARNING, grade, topic };
      const source = generateLearningProblem(settings, rng), l = createMiniLesson(source, settings, rng);
      expect(l.fresh.problem.topic).toBe(topic);
      expect(l.fresh.problem.grade).toBe(grade);
    }
  });
  it('covers the game-specific relationships using separate practice quantities and IDs', () => {
    for (const templateId of GAME_LESSON_TEMPLATES) {
      const source = { ...generateLearningProblem(DEFAULT_LEARNING), id: 'actual-game-plan', templateId, question: 'The actual game state', answer: 10 };
      const before = structuredClone(source), l = createMiniLesson(source, DEFAULT_LEARNING, random());
      expect(source).toEqual(before);
      expect(l.fresh.problem.templateId).toBe(templateId);
      expect(l.fresh.problem.id).toMatch(/^mini:/);
      expect(l.fresh.problem.question).not.toBe(l.guided.problem.question);
    }
  });
  it('fails explicitly for future unsupported question families instead of choosing an unrelated lesson', () => {
    expect(() => createMiniLesson({ id: 'future', question: 'New objective', answer: 1, difficulty: 1, reward: 0 }, DEFAULT_LEARNING)).toThrow(/matching lesson/);
  });
});

describe('supported evidence, rewards and pausing', () => {
  it('keeps wrong attempts, does not award coins or mastery, and only claims support time after the complete path', () => {
    const initial = createInitialEngineState();
    const l = createMiniLesson(skillLessonSource('g8-s0', DEFAULT_LEARNING), DEFAULT_LEARNING, random());
    const a = { problem: l.guided.problem, correct: false, revealed: false }, b = { problem: l.fresh.problem, correct: true, revealed: false };
    const first = engineReducer(initial, { type: 'RECORD_MINI_LESSON_ATTEMPT', ...a });
    expect(first.learningEvidence?.at(-1)).toMatchObject({ correct: false, support: 'hint', attempts: 1, firstAttemptCorrect: false });
    const helped = engineReducer(first, { type: 'RECORD_MINI_LESSON_HELP', problem: a.problem });
    expect(helped.learningEvidence?.at(-1)).toMatchObject({ answerRevealed: true, source: 'mini-lesson', attempts: 1 });
    expect(scanEvidence(first.learningEvidence, helped.learningEvidence, newScanMemo(), true, Date.now()).floor).toBe(false);
    const second = engineReducer(first, { type: 'RECORD_MINI_LESSON_ATTEMPT', ...b });
    expect(scanEvidence(first.learningEvidence, second.learningEvidence, newScanMemo(), true, Date.now())).toMatchObject({ attempts: [], floor: false });
    const done = engineReducer(second, { type: 'COMPLETE_MINI_LESSON', attempts: [a, b] });
    expect(done.player).toEqual(initial.player);
    expect(done.pet).toEqual(initial.pet);
    expect(done.arcade).toEqual(initial.arcade);
    expect(done.skillReviews?.every(r => r.independentChecks === 0)).toBe(true);
    expect(validEvidence(done.learningEvidence!)).toBe(true);
    expect(scanEvidence(second.learningEvidence, done.learningEvidence, newScanMemo(), true, Date.now())).toMatchObject({ attempts: [], floor: true });
    const replay = engineReducer(done, { type: 'COMPLETE_MINI_LESSON', attempts: [a, b] });
    expect(scanEvidence(done.learningEvidence, replay.learningEvidence, newScanMemo(), true, Date.now())).toMatchObject({ attempts: [], floor: false });
    expect(scanEvidence(second.learningEvidence, done.learningEvidence, newScanMemo(), false, Date.now()).floor).toBe(false);
    expect(engineReducer(initial, { type: 'COMPLETE_MINI_LESSON', attempts: [a, b] })).toBe(initial);
  });
  it('keeps a pause active until every open lesson closes and tolerates duplicate cleanup', () => {
    const a = holdMiniLesson(), b = holdMiniLesson();
    expect(miniLessonActive()).toBe(true); a(); a(); expect(miniLessonActive()).toBe(true);
    b(); expect(miniLessonActive()).toBe(false);
  });
  it('blocks solo simulation ticks during a lesson and restores them without restarting a paused game', () => {
    const engine = new GameEngine();
    const release = holdMiniLesson();
    try {
      engine.dispatchDirect({ type: 'TICK', deltaMs: 1000 });
      engine.dispatchDirect({ type: 'ARCADE_TICK' });
      expect(engine.getActionLog()).toEqual([]);
    } finally { release(); }
    engine.dispatchDirect({ type: 'TICK', deltaMs: 1000 });
    expect(engine.getActionLog().map(a => a.type)).toEqual(['TICK']);
  });
});
