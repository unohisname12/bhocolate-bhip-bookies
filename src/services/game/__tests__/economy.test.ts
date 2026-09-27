import { describe, it, expect, vi, afterEach } from 'vitest';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
import { generateLearningProblem } from '../curriculum';
import { rebalanceEconomy, claimPendingGrowth, validEconomy, rewardMath, awardDailyGoal } from '../economy';
import { ACHIEVEMENTS } from '../../../config/achievementConfig';
import { checkLoginStreak } from '../../../engine/systems/StreakSystem';
import { migrate, CURRENT_SAVE_VERSION } from '../../persistence/saveMigrations';
import { computeChecksum, validateSave } from '../../persistence/saveValidation';
import { SHOP_ITEMS } from '../../../config/shopConfig';
import { FOOD_ITEMS } from '../../../config/gameConfig';
import type { EngineState } from '../../../types/engine';

const day = () => new Date().toISOString().slice(0, 10);
function initial(pet = true) {
  const s = createInitialEngineState();
  s.achievements = ACHIEVEMENTS.map(a => ({ achievementId: a.id, current: a.condition.target, unlocked: true }));
  if (pet) {
    s.pet = createTestEngineState().pet;
    s.pet!.progression = { level: 1, xp: 0, evolutionFlags: [] };
    s.pet!.bond = 0;
    s.pet!.growth = { startedAt: Date.now(), stageStartedAt: Date.now(), careDays: [] };
  }
  return s;
}
function solve(s: EngineState, id: string, wrong = false, hint = false) {
  const p = { ...generateLearningProblem(s.learning), id };
  if (hint) s = engineReducer(s, { type: 'RECORD_LEARNING_HELP', problem: p, support: 'hint' });
  if (wrong) s = engineReducer(s, { type: 'SOLVE_MATH', correct: false, reward: 99999, difficulty: 1, problem: p });
  return engineReducer(s, { type: 'SOLVE_MATH', correct: true, reward: 99999, difficulty: 1, problem: p });
}
const xp = (s: EngineState) => s.pet!.progression.xp + 75 * s.pet!.progression.level * (s.pet!.progression.level - 1);
afterEach(() => vi.useRealTimers());

describe('balanced rewards', () => {
  it.each(['support', 'standard', 'stretch'] as const)('gives %s learners equal rewards with hints and corrections', challenge => {
    for (const wrong of [false, true]) {
      let s = initial(); s.learning.challenge = challenge;
      for (let i = 0; i < 5; i++) s = solve(s, `q-${i}`, wrong, true);
      // 200 from math + 15 for the pet's level-up (the old 3 prize medals, now paid in tokens).
      expect(s.player.currencies).toMatchObject({ tokens: 215, mp: 10, mpLifetime: 10 });
      expect(xp(s)).toBe(425); expect(s.pet!.bond).toBe(5);
      expect(s.dailyGoals.rewardClaimed).toBe(true);
      expect(s.arcade?.charges ?? 0).toBe(0);
      s = solve(s, 'sixth'); expect(s.player.currencies.tokens).toBe(225); expect(xp(s)).toBe(440);
    }
  });
  it('keeps the 575 XP care-plus-five pace, without repeated care or pet-switch farming', () => {
    let s = initial();
    for (const task of ['feed', 'clean', 'play'] as const) s = engineReducer(s, { type: 'FREE_SCHOOL_CARE', task });
    expect(xp(s)).toBe(150);
    for (let i = 0; i < 5; i++) s = solve(s, `care-${i}`);
    expect(xp(s)).toBe(575);
    s = engineReducer(s, { type: 'FREE_SCHOOL_CARE', task: 'play' }); expect(xp(s)).toBe(575);
    s.pet = initial().pet;
    for (const task of ['feed', 'clean', 'play'] as const) s = engineReducer(s, { type: 'FREE_SCHOOL_CARE', task });
    expect(xp(s)).toBe(0);
  });
  it('pays only 2 MP total per corrected question even after help and evidence pruning', () => {
    let s = initial(); const p = { ...generateLearningProblem(s.learning), id: 'retry' };
    s = rewardMath(s, p, false, 'practice'); expect(s.player.currencies.mp).toBe(1);
    s.learningEvidence = [];
    s = rewardMath(s, p, false, 'practice'); expect(s.player.currencies.mp).toBe(1);
    s = rewardMath(s, p, true, 'practice'); expect(s.player.currencies.mp).toBe(2);
    for (let i = 0; i < 205; i++) s = solve(s, `later-${i}`);
    expect(s.learningEvidence!.some(r => r.questionId === p.id)).toBe(false);
    expect(rewardMath(s, p, true, 'practice')).toBe(s);
    const data = { version: CURRENT_SAVE_VERSION, timestamp: Date.now(), state: s, checksum: computeChecksum(s) };
    expect(validateSave(data).valid).toBe(true);
    const restored = migrate(JSON.parse(JSON.stringify(data)));
    expect(rewardMath(restored, p, true, 'practice')).toBe(restored);
  });
  it('pays discovery the same base package and keeps the stamp', () => {
    let s = engineReducer(initial(false), { type: 'START_DISCOVERY_MISSION', style: 'explore' });
    for (let i = 0; i < 3; i++) {
      const p = s.eggDiscovery!.mission!.problems[i];
      s = engineReducer(s, { type: 'ANSWER_DISCOVERY_MISSION', questionId: p.id, answer: String(p.answer) });
    }
    expect(s.player.currencies).toMatchObject({ tokens: 130, mp: 6 });
    expect(s.eggDiscovery!.stamps).toHaveLength(1);
    expect(s.economy).toMatchObject({ pendingXP: 255, pendingBond: 3 });
    s.pet = initial().pet; s = claimPendingGrowth(s);
    expect(xp(s)).toBe(255); expect(s.pet!.bond).toBe(3);
    expect(claimPendingGrowth(s)).toBe(s);
  });
  it('pays the daily bonus in either order and only once', () => {
    for (const battleFirst of [false, true]) {
      let s = initial(); s.dailyGoals.date = day();
      if (battleFirst) s.dailyGoals.battlesWon = 1;
      for (let i = 0; i < 3; i++) s = solve(s, `daily-${i}`);
      if (!battleFirst) { s.dailyGoals.battlesWon = 1; s = awardDailyGoal(s); }
      expect(s.player.currencies.tokens).toBe(195); // includes 15 for the level-up
      expect(awardDailyGoal(s)).toBe(s);
      for (let i = 3; i < 5; i++) s = solve(s, `daily-${i}`);
      expect(s.player.currencies.tokens).toBe(215);
    }
  });
  it('resets allowances once on a new day even before the periodic daily check', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-25T18:00:00Z'));
    let s = initial(); for (let i = 0; i < 5; i++) s = solve(s, `day1-${i}`);
    vi.setSystemTime(new Date('2026-09-26T18:00:00Z'));
    s = solve(s, 'day2'); expect(xp(s)).toBe(510); expect(s.dailyGoals.mathSolved).toBe(1);
    expect(s.battleTickets.todayEarned).toBe(0);
    s = engineReducer(s, { type: 'CHECK_DAILY_GOALS' });
    expect(s.dailyGoals.mathSolved).toBe(1); expect(s.economy!.bonusAnswers).toBe(1);
  });
  it('keeps login and mailbox modest and non-repeatable', () => {
    const s = initial(); s.player.streaks.login = 100; s.mailbox.totalClaimed = 100;
    expect(checkLoginStreak(s.player, Date.now(), true).reward).toBe(20);
    const next = engineReducer(s, { type: 'CLAIM_MAILBOX' });
    expect(next.player.currencies.tokens).toBe(115);
    expect(engineReducer(next, { type: 'CLAIM_MAILBOX' })).toBe(next);
  });
  it('uses one price and nutrition definition for goods shared between shops', () => {
    for (const item of SHOP_ITEMS) {
      const food = FOOD_ITEMS.find(f => f.id === item.id);
      if (food) { expect(item.cost.tokens).toBe(food.cost); expect(item.effect.value).toBe(food.nutrition); }
    }
  });
});

describe('existing accounts', () => {
  it.each([0, 100, 250, 251, 400, 1034])('converts a %i-token stockpile once, protecting the first 250', tokens => {
    const old = initial(); delete old.economy; old.player.currencies.tokens = tokens;
    const next = rebalanceEconomy(old);
    expect(next.player.currencies.tokens).toBe(tokens <= 250 ? tokens : 250 + Math.floor((tokens - 250) / 2));
    expect(next.pet).toBe(old.pet); expect(next.eggDiscovery).toBe(old.eggDiscovery);
    expect(next.inventory).toBe(old.inventory); expect(next.learningEvidence).toBe(old.learningEvidence);
    expect(rebalanceEconomy(next)).toBe(next);
    expect(migrate({ version: 17, timestamp: 0, checksum: '', state: old })).toEqual(next);
  });
  it('removes only confirmed unspent extra correction MP without changing learning records', () => {
    let s = initial(); s = solve(s, 'old-retry', true);
    delete s.economy; s.player.currencies.mp = 3; s.player.currencies.mpLifetime = 3;
    const next = rebalanceEconomy(s);
    expect(next.player.currencies.mp).toBe(2); expect(next.player.currencies.mpLifetime).toBe(2);
    expect(next.learningEvidence).toBe(s.learningEvidence);
    expect(next.economy!.receipts['old-retry']).toBe(2);
  });
  it('rejects corrupt ledgers instead of accepting NaN, negative growth, or missing receipts', () => {
    const s = initial(); expect(validEconomy(s.economy)).toBe(true);
    expect(validEconomy({ ...s.economy!, pendingXP: -1 })).toBe(false);
    expect(validEconomy({ ...s.economy!, bonusAnswers: 6 })).toBe(false);
    expect(validEconomy({ ...s.economy!, receipts: { x: NaN } })).toBe(false);
  });
});
