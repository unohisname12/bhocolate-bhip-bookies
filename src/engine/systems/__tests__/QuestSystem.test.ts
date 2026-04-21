import { describe, it, expect } from 'vitest';
import {
  rollQuestsIfNeeded,
  progressOnEvent,
  progressOnSnapshot,
  claimQuest,
  todayKey,
} from '../QuestSystem';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import type { EngineState } from '../../../types/engine';

const baseState = (): EngineState => ({ ...createInitialEngineState() });

describe('QuestSystem', () => {
  it('rolls 3 daily quests on first run', () => {
    const s = rollQuestsIfNeeded(baseState());
    expect(s.quests.daily.length).toBe(3);
    expect(s.quests.lastDailyRollDate).toBe(todayKey());
  });

  it('does not re-roll dailies within the same day', () => {
    const first = rollQuestsIfNeeded(baseState());
    const firstIds = first.quests.daily.map((p) => p.templateId);
    const second = rollQuestsIfNeeded(first);
    expect(second.quests.daily.map((p) => p.templateId)).toEqual(firstIds);
  });

  it('bumps event_count quests on matching events', () => {
    let s = rollQuestsIfNeeded(baseState());
    // Force a deterministic daily to test bump
    s = {
      ...s,
      quests: {
        ...s.quests,
        daily: [
          { templateId: 'daily_feed_3', current: 0, target: 3, claimed: false, rolledOn: todayKey() },
        ],
      },
    };
    s = progressOnEvent(s, 'pet_fed');
    s = progressOnEvent(s, 'pet_fed');
    expect(s.quests.daily[0].current).toBe(2);
  });

  it('claims a completed quest and pays tokens + seasonPoints', () => {
    let s = baseState();
    s = {
      ...s,
      quests: {
        ...s.quests,
        daily: [
          { templateId: 'daily_feed_3', current: 3, target: 3, claimed: false, rolledOn: todayKey() },
        ],
        lastDailyRollDate: todayKey(),
        lastWeeklyRollWeek: '2026-W01',
        weekly: [],
      },
    };
    const before = s.player.currencies;
    s = claimQuest(s, 'daily_feed_3');
    expect(s.player.currencies.tokens).toBe(before.tokens + 25);
    expect(s.player.currencies.seasonPoints).toBe(before.seasonPoints + 20);
    expect(s.quests.daily[0].claimed).toBe(true);
  });

  it('refuses to claim an incomplete quest', () => {
    let s = baseState();
    s = {
      ...s,
      quests: {
        ...s.quests,
        daily: [
          { templateId: 'daily_feed_3', current: 1, target: 3, claimed: false, rolledOn: todayKey() },
        ],
      },
    };
    const before = s.player.currencies.tokens;
    s = claimQuest(s, 'daily_feed_3');
    expect(s.player.currencies.tokens).toBe(before);
    expect(s.quests.daily[0].claimed).toBe(false);
  });

  it('updates bond_reach quests from state snapshot', () => {
    let s = baseState();
    s = {
      ...s,
      pet: { ...(s.pet ?? ({} as never)), bond: 22 } as typeof s.pet,
      quests: {
        ...s.quests,
        weekly: [
          { templateId: 'weekly_bond_25', current: 0, target: 25, claimed: false, rolledOn: todayKey() },
        ],
      },
    };
    s = progressOnSnapshot(s);
    expect(s.quests.weekly[0].current).toBe(22);
  });
});
