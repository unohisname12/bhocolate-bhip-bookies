import type { EngineState, EconomyProgress } from '../../types/engine';
import type { MathProblem } from '../../types';
import { recordLearning } from './learningEvidence';
import { addXP } from './evolutionEngine';
import { careDate } from './petGrowth';
import { computeForgeBonuses } from '../../config/powerForgeConfig';
import { addMathBuffs, MATH_BUFF_PER_CORRECT } from '../../config/mathBuffConfig';
import { updateMastery, updateMathStreak } from '../../engine/systems/StreakSystem';

export const ECONOMY = { version: 1, tokens: 10, mp: 2, xp: 15, careDayXP: 150, dailyMathXP: 70, dailyAnswers: 5, dailyTokens: 50, mailTokens: 15, protectedTokens: 250 } as const;
export const freshEconomy = (): EconomyProgress => ({ version: ECONOMY.version, receipts: {}, careBonusDay: '', bonusDay: '', bonusAnswers: 0, pendingXP: 0, pendingBond: 0 });

/** One-time stockpile conversion. Never remove possessions, pets, or learning records. */
export function rebalanceEconomy(state: EngineState): EngineState {
  if (state.economy?.version === ECONOMY.version) return state;
  const economy = freshEconomy();
  let excessMP = 0;
  for (const row of state.learningEvidence ?? []) {
    if (!row.attempts) continue;
    if (row.correct || ['practice', 'catch'].includes(row.source)) economy.receipts[row.questionId] = row.correct ? 2 : 1;
    // Only these old routes paid the extra effort MP. Evidence remains untouched.
    if (row.correct && row.attempts > 1 && ['practice', 'catch'].includes(row.source)) excessMP++;
  }
  const c = state.player.currencies;
  const tokens = c.tokens <= ECONOMY.protectedTokens ? c.tokens : ECONOMY.protectedTokens + Math.floor((c.tokens - ECONOMY.protectedTokens) / 2);
  const mpRemoved = Math.min(c.mp, excessMP);
  return { ...state, economy, player: { ...state.player, currencies: { ...c, tokens, mp: c.mp - mpRemoved, mpLifetime: Math.max(c.mp - mpRemoved, c.mpLifetime - mpRemoved) } } };
}

export function validEconomy(e: EconomyProgress | undefined): boolean {
  const natural = (n: number) => Number.isSafeInteger(n) && n >= 0;
  return e === undefined || !!e && e.version === ECONOMY.version && typeof e.receipts === 'object' && e.receipts !== null && !Array.isArray(e.receipts)
    && Object.entries(e.receipts).every(([key, v]) => key.length > 0 && key.length <= 200 && (v === 1 || v === 2))
    && typeof e.careBonusDay === 'string' && (e.careBonusDay === '' || /^\d{4}-\d{2}-\d{2}$/.test(e.careBonusDay))
    && typeof e.bonusDay === 'string' && (e.bonusDay === '' || /^\d{4}-\d{2}-\d{2}$/.test(e.bonusDay))
    && natural(e.bonusAnswers) && e.bonusAnswers <= 5 && natural(e.pendingXP) && natural(e.pendingBond);
}

export function awardDailyGoal(state: EngineState): EngineState {
  const g = state.dailyGoals;
  if (g.rewardClaimed || g.date !== careDate() || !(g.mathSolved >= 5 || g.mathSolved >= 3 && g.battlesWon >= 1)) return state;
  return { ...state, dailyGoals: { ...g, rewardClaimed: true }, player: { ...state.player, currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens + ECONOMY.dailyTokens } },
    notifications: [...state.notifications, { id: `math-goal-${g.date}`, message: 'Daily practice goal complete! +50 tokens. Your next questions still earn rewards.', icon: '✦', timestamp: Date.now() }].slice(-30) };
}

/** Shared payout for practice, discovery, bridge, warmup and growth questions.
 * Receipt history is independent of the bounded teacher evidence window.
 * A completed correction totals 2 MP, including its earlier 1 MP effort credit.
 */
export function rewardMath(state: EngineState, problem: MathProblem, correct: boolean, source: string): EngineState {
  if (!problem.id || problem.id.length > 200) return state;
  const economy = state.economy ?? freshEconomy();
  const receipt = Object.hasOwn(economy.receipts, problem.id) ? economy.receipts[problem.id] : 0;
  if (receipt === 2 || state.learningEvidence?.some(r => r.questionId === problem.id && r.correct)) return state;
  const recorded = recordLearning(state, problem, source, correct);
  const mp = correct ? ECONOMY.mp - receipt : receipt ? 0 : 1;
  const topic = problem.topic ?? '';
  let player = updateMastery(updateMathStreak(recorded.player, correct), /Fraction|Ratio|Percent|Probability/.test(topic) ? 'fractions' : /Pythagorean|Slope/.test(topic) ? 'geometry' : 'arithmetic', correct);
  player = { ...player, currencies: { ...player.currencies, mp: player.currencies.mp + mp, mpLifetime: player.currencies.mpLifetime + mp } };
  let next: EngineState = { ...recorded, player, economy: { ...economy, receipts: { ...economy.receipts, [problem.id]: correct ? 2 : 1 } } };
  if (!correct) return next;
  const day = careDate(), bonusAnswers = economy.bonusDay === day ? economy.bonusAnswers : 0;
  const xp = ECONOMY.xp + (state.learning.schoolSafe !== false && bonusAnswers < 5 ? ECONOMY.dailyMathXP : 0);
  const reward = Math.round(ECONOMY.tokens * computeForgeBonuses(player.powerForge).mathRewardMult);
  const goals = state.dailyGoals.date === day ? state.dailyGoals : { date: day, mathSolved: 0, battlesWon: 0, rewardClaimed: false };
  next = { ...next, economy: { ...next.economy!, bonusDay: day, bonusAnswers: Math.min(5, bonusAnswers + 1), pendingXP: economy.pendingXP + (state.pet ? 0 : xp), pendingBond: economy.pendingBond + (state.pet ? 0 : 1) },
    pet: state.pet ? { ...addXP(state.pet, xp), bond: state.pet.bond + 1 } : null,
    player: { ...player, lifetimeMathCorrect: player.lifetimeMathCorrect + 1, mathBuffs: addMathBuffs(player.mathBuffs, MATH_BUFF_PER_CORRECT), currencies: { ...player.currencies, tokens: player.currencies.tokens + reward } },
    battleTickets: state.dailyGoals.date === day ? state.battleTickets : { ...state.battleTickets, todayEarned: 0, todayUsed: 0, mathForNextTicket: 0, careActionsToday: { fed: false, cleaned: false, played: false } },
    dailyGoals: { ...goals, mathSolved: goals.mathSolved + 1 } };
  return awardDailyGoal(next);
}

export function claimPendingGrowth(state: EngineState): EngineState {
  if (!state.pet || !state.economy || !(state.economy.pendingXP || state.economy.pendingBond)) return state;
  return { ...state, pet: { ...addXP(state.pet, state.economy.pendingXP), bond: state.pet.bond + state.economy.pendingBond }, economy: { ...state.economy, pendingXP: 0, pendingBond: 0 } };
}
