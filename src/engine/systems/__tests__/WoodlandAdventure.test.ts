import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { engineReducer } from '../../state/engineReducer';
import { hatchEgg } from '../../../services/game/evolutionEngine';
import { careProgress } from '../../../services/game/petGrowth';
import { generateLearningProblem } from '../../../services/game/curriculum';
import { recordLearning } from '../../../services/game/learningEvidence';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import { validEvidence, validWoodland } from '../../../services/game/validWoodland';
import { FOOD_ITEMS } from '../../../config/gameConfig';
import { applyPetDecay } from '../PetNeedSystem';
import { checkAchievements } from '../AchievementSystem';
import type { EngineState, MathProblem } from '../../../types';

const now = Date.UTC(2026, 8, 21, 18);
const day = new Date(now).toISOString().slice(0, 10);
function fixture(withPet = false): EngineState {
  const state = createInitialEngineState();
  state.dailyGoals.date = day;
  if (withPet) {
    state.pet = hatchEgg({ id: 'egg', type: 'ember_fox', state: 'ready', progress: 100, createdAt: new Date(now).toISOString() })!;
    state.player.activePetId = state.pet.id;
    state.screen = 'home';
  }
  return checkAchievements(state).state;
}
function plan(state = fixture()) {
  state = engineReducer(state, { type: 'START_BRIDGE_CHAPTER' });
  while (state.woodland!.phase === 'learn') {
    const problem = state.woodland!.problems[state.woodland!.index];
    state = engineReducer(state, { type: 'ANSWER_BRIDGE_QUESTION', questionId: problem.id, answer: String(problem.answer) });
  }
  return state;
}
function catchAnswer(state: EngineState, id: string, correct = true) {
  const problem: MathProblem = { ...generateLearningProblem(state.learning), id };
  return engineReducer(state, { type: 'SOLVE_MATH', correct, difficulty: 1, reward: 5, problem, source: 'catch' });
}
function totalXP(state: EngineState) {
  const { xp, level } = state.pet!.progression;
  return xp + 75 * level * (level - 1);
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe('woodland chapter', () => {
  it('keeps a saved plan, rejects stale answers and records helped retries honestly', () => {
    let state = engineReducer(fixture(), { type: 'START_BRIDGE_CHAPTER' });
    const problem = state.woodland!.problems[0];
    expect(engineReducer(state, { type: 'START_BRIDGE_CHAPTER' }).woodland).toBe(state.woodland);
    state = engineReducer(state, { type: 'ANSWER_BRIDGE_QUESTION', questionId: problem.id, answer: 'wrong' });
    state = engineReducer(state, { type: 'RECORD_LEARNING_HELP', problem, support: 'explanation' });
    expect(state.woodland!.index).toBe(0);
    state = engineReducer(state, { type: 'ANSWER_BRIDGE_QUESTION', questionId: problem.id, answer: String(problem.answer) });
    expect(state.learningEvidence![0]).toMatchObject({ attempts: 2, correct: true, firstAttemptCorrect: false, support: 'explanation', source: 'bridge' });
    expect(engineReducer(state, { type: 'ANSWER_BRIDGE_QUESTION', questionId: problem.id, answer: String(problem.answer) })).toBe(state);
    const serialized = JSON.parse(JSON.stringify(state)) as EngineState;
    expect(validateSave({ version: 16, state: serialized, timestamp: now, checksum: computeChecksum(serialized) }).valid).toBe(true);
    expect(serialized.woodland!.index).toBe(1);
  });

  it('requires three distinct correct route catches, then care, then pays one decoration prize', () => {
    let state = plan();
    const stamps = state.eggDiscovery!.stamps;
    expect(engineReducer(state, { type: 'CLAIM_BRIDGE_REWARD', decoration: 'flowers' })).toBe(state);
    state = engineReducer(state, { type: 'CHOOSE_BRIDGE_ROUTE', route: 'catch' });
    state = catchAnswer(state, 'delivery-1', false);
    expect(state.woodland!.deliveries).toEqual([]);
    state = catchAnswer(state, 'delivery-1');
    expect(catchAnswer(state, 'delivery-1')).toBe(state);
    state = catchAnswer(state, 'delivery-2');
    state = JSON.parse(JSON.stringify(state));
    state = catchAnswer(state, 'delivery-3');
    expect(state.woodland!.phase).toBe('care');
    expect(state.screen).toBe('woodland');
    state = engineReducer(state, { type: 'BRIDGE_CARE_COMPLETE' });
    const tokens = state.player.currencies.tokens;
    state = engineReducer(state, { type: 'CLAIM_BRIDGE_REWARD', decoration: 'flowers' });
    expect(state.player.currencies.tokens).toBe(tokens + 30);
    expect(state.woodland).toMatchObject({ phase: 'complete', decoration: 'flowers', completedAt: now, summary: { questions: 6, independent: 5, supported: 0 } });
    expect(engineReducer(state, { type: 'CLAIM_BRIDGE_REWARD', decoration: 'lanterns' })).toBe(state);
    expect(engineReducer(state, { type: 'START_BRIDGE_CHAPTER' }).woodland).toEqual(state.woodland);
    expect(state.eggDiscovery!.stamps).toEqual(stamps);
    expect(state.pet).toBeNull();
  });

  it('keeps merge separate from math evidence and requires real care for an owned pet', () => {
    let state = plan(fixture(true));
    expect(engineReducer(state, { type: 'BRIDGE_MERGE_COMPLETE' })).toBe(state);
    state = engineReducer(state, { type: 'CHOOSE_BRIDGE_ROUTE', route: 'merge' });
    const evidence = state.learningEvidence;
    state = engineReducer(state, { type: 'BRIDGE_MERGE_COMPLETE' });
    expect(state.woodland!.phase).toBe('care');
    expect(state.learningEvidence).toBe(evidence);
    expect(engineReducer(state, { type: 'BRIDGE_CARE_COMPLETE' })).toBe(state);
    state = engineReducer(state, { type: 'START_PET_INTERACTION', mode: 'pet' });
    state = engineReducer(state, { type: 'CARE_GAME_COMPLETE', mode: 'pet', quality: 1 });
    expect(state.woodland!.phase).toBe('reward');
    const xp = totalXP(state);
    state = engineReducer(state, { type: 'CLAIM_BRIDGE_REWARD', decoration: 'lanterns' });
    expect(totalXP(state)).toBe(xp + 60);
    expect(state.pet!.stage).toBe('baby');
  });

  it('preserves the current question and updates future questions when the teacher changes difficulty', () => {
    let state = engineReducer(fixture(), { type: 'START_BRIDGE_CHAPTER' });
    const original = state.woodland!.problems;
    state = engineReducer(state, { type: 'ANSWER_BRIDGE_QUESTION', questionId: original[0].id, answer: String(original[0].answer) });
    state = engineReducer(state, { type: 'SET_LEARNING_SETTINGS', settings: { ...state.learning, grade: 12, topic: 'Derivatives' } });
    expect(state.woodland!.index).toBe(1);
    expect(state.woodland!.problems[0]).toBe(original[0]);
    expect(state.woodland!.problems[1]).toBe(original[1]);
    expect(state.woodland!.problems[2]).toMatchObject({ grade: 12, topic: 'Derivatives' });
    const updated = state.woodland!.problems;
    state = engineReducer(state, { type: 'SET_LEARNING_SETTINGS', settings: { ...state.learning, schoolSafe: false, learningHelp: false } });
    expect(state.woodland!.problems).toBe(updated);
  });

  it('does not open or advance a chapter during battle', () => {
    const state = fixture(); state.battle.active = true;
    expect(engineReducer(state, { type: 'OPEN_WOODLAND' })).toBe(state);
    expect(engineReducer(state, { type: 'START_BRIDGE_CHAPTER' })).toBe(state);
  });

  it('accepts additive old saves and rejects malformed new progress', () => {
    const state = fixture();
    expect(validateSave({ version: 16, timestamp: now, state, checksum: computeChecksum(state) }).valid).toBe(true);
    const chapter = plan().woodland!;
    expect(validWoodland(chapter)).toBe(true);
    expect(validWoodland({ ...chapter, index: 4 })).toBe(false);
    expect(validWoodland({ ...chapter, deliveries: ['same', 'same'] })).toBe(false);
    expect(validWoodland({ ...chapter, phase: 'complete' })).toBe(false);
    expect(validEvidence([{ ...plan().learningEvidence![0], attempts: -1 }])).toBe(false);
  });
});

describe('school-safe foundations', () => {
  it('initializes quests once and rolls them on the next date', () => {
    let state = engineReducer(fixture(), { type: 'START_ENGINE' });
    expect(state.quests.daily).toHaveLength(3);
    expect(state.quests.weekly).toHaveLength(1);
    expect(engineReducer(state, { type: 'START_ENGINE' }).quests.daily).toBe(state.quests.daily);
    vi.setSystemTime(now + 86400000);
    state = engineReducer(state, { type: 'TICK', deltaMs: 1000 });
    expect(state.quests.lastDailyRollDate).toBe('2026-09-22');
    expect(state.dailyGoals.date).toBe('2026-09-22');
  });

  it('never decays school pets or penalizes a missed day, but permits legacy needs', () => {
    const state = fixture(true);
    state.dailyGoals.date = '2026-09-17';
    state.player.lastLoginDate = '2026-09-17';
    state.player.streaks.login = 4;
    const ticked = engineReducer(state, { type: 'TICK', deltaMs: 3600000 });
    expect(ticked.pet!.needs).toEqual(state.pet!.needs);
    expect(engineReducer(state, { type: 'CHECK_LOGIN_STREAK' }).player.streaks.login).toBe(5);
    expect(engineReducer(state, { type: 'CHECK_LOGIN_STREAK' }).showDailyRitual).toBe(false);
    state.learning.schoolSafe = false;
    expect(engineReducer(state, { type: 'TICK', deltaMs: 3600000 }).pet!.needs.hunger).toBeLessThan(state.pet!.needs.hunger);
    expect(engineReducer(state, { type: 'CHECK_LOGIN_STREAK' }).player.streaks.login).toBe(1);
    expect(applyPetDecay(state.pet!, 60000).needs.health).toBe(state.pet!.needs.health);
    state.pet!.needs.hunger = 10;
    expect(applyPetDecay(state.pet!, 60000).needs.health).toBeLessThan(state.pet!.needs.health);
  });

  it('offers free essentials, one care-day growth award and one care ticket', () => {
    let state = fixture(true);
    state.player.currencies.tokens = 0;
    const xp = totalXP(state);
    for (const task of ['feed', 'clean', 'play'] as const) state = engineReducer(state, { type: 'FREE_SCHOOL_CARE', task });
    expect(careProgress(state.pet!).days).toBe(1);
    expect(totalXP(state)).toBe(xp + 150);
    expect(state.battleTickets.tickets.filter(t => t.source === 'care')).toHaveLength(1);
    const tokens = state.player.currencies.tokens;
    for (const task of ['feed', 'clean', 'play'] as const) state = engineReducer(state, { type: 'FREE_SCHOOL_CARE', task });
    expect(totalXP(state)).toBe(xp + 150);
    expect(state.player.currencies.tokens).toBe(tokens);
    expect(state.battleTickets.tickets.filter(t => t.source === 'care')).toHaveLength(1);
    expect(state.pet!.stage).toBe('baby');
    state.learning.schoolSafe = false;
    expect(engineReducer(state, { type: 'FREE_SCHOOL_CARE', task: 'feed' })).toBe(state);
  });

  it('credits focused care to canonical quests and tickets', () => {
    let state = fixture(true);
    state.quests.daily = [{ templateId: 'daily_play_3', current: 0, target: 3, claimed: false, rolledOn: day }];
    state = engineReducer(state, { type: 'START_PET_INTERACTION', mode: 'pet' });
    state = engineReducer(state, { type: 'CARE_GAME_COMPLETE', mode: 'pet', quality: 1 });
    expect(state.quests.daily[0].current).toBe(1);
    expect(state.battleTickets.careActionsToday.played).toBe(true);
    expect(careProgress(state.pet!).today).toEqual(['play']);
  });

  it('heals with medicine and offers a free recovery for old injured pets', () => {
    const state = fixture(true);
    state.pet!.needs.health = 10; state.pet!.needs.hunger = 30;
    const food = FOOD_ITEMS.find(item => item.id === 'potion')!;
    const healed = engineReducer(state, { type: 'FEED_PET', food });
    expect(healed.pet!.needs.health).toBe(100);
    expect(healed.pet!.needs.hunger).toBe(30);
    expect(careProgress(healed.pet!).today).toEqual([]);
    state.pet!.state = 'dead'; state.pet!.needs.health = 0;
    const rested = engineReducer(state, { type: 'FREE_SCHOOL_CARE', task: 'rest' });
    expect(rested.pet!.state).not.toBe('dead');
    expect(rested.pet!.needs.health).toBe(100);
    expect(rested.player.currencies.tokens).toBe(state.player.currencies.tokens);
  });

  it('awards wrong-answer effort at most once per problem and never replays correct rewards', () => {
    let state = fixture(true);
    const problem = generateLearningProblem(state.learning);
    for (let i = 0; i < 10; i++) state = engineReducer(state, { type: 'SOLVE_MATH', problem, difficulty: 1, correct: false, reward: 5 });
    expect(state.player.currencies.mp).toBe(1);
    expect(state.learningEvidence![0].attempts).toBe(10);
    state = engineReducer(state, { type: 'SOLVE_MATH', problem, difficulty: 1, correct: true, reward: 5 });
    expect(state.learningEvidence![0].firstAttemptCorrect).toBe(false);
    expect(engineReducer(state, { type: 'SOLVE_MATH', problem, difficulty: 1, correct: true, reward: 5 })).toBe(state);
    expect(engineReducer(state, { type: 'SOLVE_MATH', difficulty: 1, correct: false, reward: 5 }).player.currencies.mp).toBe(state.player.currencies.mp);
  });

  it('gives equal XP for all assigned challenges and bounds practice history', () => {
    for (const difficulty of [1, 2, 3]) {
      const state = fixture(true);
      const result = engineReducer(state, { type: 'SOLVE_MATH', problem: generateLearningProblem(state.learning), difficulty, correct: true, reward: 5 });
      expect(totalXP(result) - totalXP(state)).toBe(85);
    }
    let state = fixture();
    const problem = generateLearningProblem(state.learning);
    for (let i = 0; i < 205; i++) state = recordLearning(state, { ...problem, id: String(i) }, 'practice', true);
    expect(state.learningEvidence).toHaveLength(200);
    expect(state.learningEvidence![0].questionId).toBe('5');
    expect(validEvidence(state.learningEvidence!)).toBe(true);
  });
});
