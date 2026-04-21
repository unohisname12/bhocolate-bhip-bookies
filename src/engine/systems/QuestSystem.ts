import type { EngineState } from '../../types/engine';
import type { QuestProgress, QuestTemplate } from '../../types/quest';
import type { GameEventType } from '../../types/events';
import { DAILY_QUESTS, WEEKLY_QUESTS } from '../../config/questConfig';

/**
 * QuestSystem — daily/weekly quest generator, progress updater, and
 * reward payer. Pure functions; reducer calls them on action dispatch.
 *
 * Contract:
 *   - progressOnEvent(state, eventType) is called once per game-event
 *     dispatch (pet_fed, battle_won, etc.). Increments any active quest
 *     whose goal is event_count + that eventType.
 *   - progressOnSnapshot(state) is called on any state-derived quest
 *     (bond_reach, level_reach, math streak, distinct foods/interactions).
 *     It reads current values directly from state.
 *   - claimQuest(state, templateId) validates completion, pays the reward,
 *     adds season points, marks claimed.
 */

// ------- Date helpers ------------------------------------------------

export const todayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

export const weekKey = (d: Date = new Date()): string => {
  // ISO-like week key YYYY-W##. Not strictly ISO 8601 but stable enough
  // to detect a week rollover client-side without a date library.
  const onejan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// ------- Daily/weekly roll ------------------------------------------

/**
 * Pick N daily quest templates, weighted by `weight` (higher = more likely).
 * Ensures at least one care, one math, and one battle-ish quest.
 */
const pickDailyQuests = (count: number): QuestTemplate[] => {
  const byTag = {
    care: DAILY_QUESTS.filter((q) => q.goal.kind === 'event_count' && ['pet_fed', 'pet_cleaned', 'pet_played_with'].includes(q.goal.eventType as string)),
    math: DAILY_QUESTS.filter((q) => q.goal.kind === 'math_streak_at_least' || (q.goal.kind === 'event_count' && q.goal.eventType === 'math_solved')),
    battle: DAILY_QUESTS.filter((q) => q.goal.kind === 'event_count' && ['battle_won', 'pvp_battle_won', 'ticket_earned'].includes(q.goal.eventType as string)),
    other: DAILY_QUESTS.filter((q) => q.goal.kind === 'distinct_foods_fed' || q.goal.kind === 'distinct_interactions'
      || (q.goal.kind === 'event_count' && q.goal.eventType === 'item_purchased')),
  };

  const weightedPick = (pool: QuestTemplate[]): QuestTemplate => {
    const total = pool.reduce((s, q) => s + (q.weight ?? 1), 0);
    let r = Math.random() * total;
    for (const q of pool) {
      r -= (q.weight ?? 1);
      if (r <= 0) return q;
    }
    return pool[pool.length - 1];
  };

  const picks: QuestTemplate[] = [];
  const seen = new Set<string>();
  const addUnique = (q: QuestTemplate | undefined) => {
    if (!q || seen.has(q.id)) return;
    picks.push(q);
    seen.add(q.id);
  };

  if (byTag.care.length) addUnique(weightedPick(byTag.care));
  if (byTag.math.length) addUnique(weightedPick(byTag.math));
  if (byTag.battle.length) addUnique(weightedPick(byTag.battle));

  const fill = [...byTag.other, ...DAILY_QUESTS];
  while (picks.length < count) {
    const candidate = weightedPick(fill);
    if (!candidate) break;
    addUnique(candidate);
    if (picks.length >= count) break;
    // Safety: don't spin forever if pool runs out
    if (seen.size >= DAILY_QUESTS.length) break;
  }
  return picks;
};

const toProgress = (t: QuestTemplate, date: string): QuestProgress => ({
  templateId: t.id,
  current: 0,
  target: t.target,
  claimed: false,
  rolledOn: date,
});

/**
 * Roll daily + weekly quests if the day or week has changed. Idempotent
 * within the same day. Returns a new state (does not mutate).
 */
export const rollQuestsIfNeeded = (state: EngineState, now: Date = new Date()): EngineState => {
  const day = todayKey(now);
  const week = weekKey(now);
  let { daily, weekly, lastDailyRollDate, lastWeeklyRollWeek } = state.quests;

  if (day !== lastDailyRollDate) {
    daily = pickDailyQuests(3).map((t) => toProgress(t, day));
    lastDailyRollDate = day;
  }
  if (week !== lastWeeklyRollWeek) {
    // Pick 1 weekly at random, weighted evenly
    const pick = WEEKLY_QUESTS[Math.floor(Math.random() * WEEKLY_QUESTS.length)];
    weekly = pick ? [toProgress(pick, day)] : [];
    lastWeeklyRollWeek = week;
  }

  return {
    ...state,
    quests: { daily, weekly, lastDailyRollDate, lastWeeklyRollWeek },
  };
};

// ------- Lookup helpers ---------------------------------------------

const findTemplate = (id: string): QuestTemplate | undefined =>
  DAILY_QUESTS.find((q) => q.id === id) ?? WEEKLY_QUESTS.find((q) => q.id === id);

// ------- Progress on game events ------------------------------------

/**
 * Called once per GameEvent dispatch. Bumps any quest whose goal is
 * event_count + eventType. Returns a new state.
 */
export const progressOnEvent = (state: EngineState, eventType: GameEventType): EngineState => {
  const bump = (list: QuestProgress[]): QuestProgress[] =>
    list.map((p) => {
      if (p.claimed) return p;
      const tpl = findTemplate(p.templateId);
      if (!tpl) return p;
      // weekly_care_30 is a blended care counter — count all 3 care events.
      if (tpl.id === 'weekly_care_30' && ['pet_fed', 'pet_cleaned', 'pet_played_with'].includes(eventType)) {
        return { ...p, current: Math.min(p.target, p.current + 1) };
      }
      if (tpl.goal.kind !== 'event_count') return p;
      if (tpl.goal.eventType !== eventType) return p;
      return { ...p, current: Math.min(p.target, p.current + 1) };
    });
  return {
    ...state,
    quests: {
      ...state.quests,
      daily: bump(state.quests.daily),
      weekly: bump(state.quests.weekly),
    },
  };
};

// ------- Progress on state snapshot ---------------------------------

/**
 * Called after state mutations that affect snapshot-derived quests.
 * Reads bond, level, math streak, distinct foods/interactions directly
 * from the current state.
 */
export const progressOnSnapshot = (state: EngineState): EngineState => {
  const pet = state.pet;
  const bondNow = pet?.bond ?? 0;
  const levelNow = pet?.progression?.level ?? 0;
  const streakNow = state.player.streaks?.correctAnswers ?? 0;

  // Distinct foods counted from events.payload.foodId
  const distinctFoodsToday = new Set<string>();
  const distinctInteractionsToday = new Set<string>();
  const day = todayKey();
  for (const e of state.events) {
    if (!e.createdAt.startsWith(day)) continue;
    if (e.type === 'pet_fed' && typeof e.payload.foodId === 'string') {
      distinctFoodsToday.add(e.payload.foodId);
    }
    if (e.type === 'pet_fed') distinctInteractionsToday.add('feed');
    if (e.type === 'pet_cleaned') distinctInteractionsToday.add('clean');
    if (e.type === 'pet_played_with') distinctInteractionsToday.add('play');
  }

  const update = (p: QuestProgress): QuestProgress => {
    if (p.claimed) return p;
    const tpl = findTemplate(p.templateId);
    if (!tpl) return p;
    switch (tpl.goal.kind) {
      case 'bond_reach':
        return { ...p, current: Math.min(p.target, bondNow) };
      case 'level_reach':
        return { ...p, current: Math.min(p.target, levelNow) };
      case 'math_streak_at_least':
        return { ...p, current: Math.min(p.target, streakNow) };
      case 'distinct_foods_fed':
        return { ...p, current: Math.min(p.target, distinctFoodsToday.size) };
      case 'distinct_interactions':
        return { ...p, current: Math.min(p.target, distinctInteractionsToday.size) };
      default:
        return p;
    }
  };

  return {
    ...state,
    quests: {
      ...state.quests,
      daily: state.quests.daily.map(update),
      weekly: state.quests.weekly.map(update),
    },
  };
};

// ------- Claim ------------------------------------------------------

/**
 * Claim a completed quest. Pays tokens/seasonPoints/shards, marks claimed.
 * Returns updated state or the same state if claim is invalid.
 */
export const claimQuest = (state: EngineState, templateId: string): EngineState => {
  const tpl = findTemplate(templateId);
  if (!tpl) return state;

  const list = tpl.cadence === 'daily' ? state.quests.daily : state.quests.weekly;
  const progress = list.find((p) => p.templateId === templateId);
  if (!progress || progress.claimed) return state;
  if (progress.current < progress.target) return state;

  const tokensDelta = tpl.reward.tokens ?? 0;
  const spDelta = tpl.reward.seasonPoints ?? 0;
  const shardsDelta = tpl.reward.shards ?? 0;

  const updatedList = list.map((p) => p.templateId === templateId ? { ...p, claimed: true } : p);
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        tokens: state.player.currencies.tokens + tokensDelta,
        seasonPoints: state.player.currencies.seasonPoints + spDelta,
        shards: state.player.currencies.shards + shardsDelta,
      },
    },
    quests: {
      ...state.quests,
      daily: tpl.cadence === 'daily' ? updatedList : state.quests.daily,
      weekly: tpl.cadence === 'weekly' ? updatedList : state.quests.weekly,
    },
    notifications: [
      ...state.notifications,
      {
        id: `quest_${templateId}_${Date.now()}`,
        message: `Quest complete: ${tpl.title}`,
        icon: tpl.icon,
        timestamp: Date.now(),
      },
    ],
  };
};
