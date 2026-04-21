import type { GameEventType } from './events';

export type QuestCadence = 'daily' | 'weekly';

export type QuestGoalKind =
  | { kind: 'event_count'; eventType: GameEventType }
  | { kind: 'math_streak_at_least' }
  | { kind: 'bond_reach' }
  | { kind: 'level_reach' }
  | { kind: 'distinct_foods_fed' }
  | { kind: 'distinct_interactions' };

export interface QuestTemplate {
  id: string;
  cadence: QuestCadence;
  title: string;
  blurb: string;
  icon: string;
  target: number;
  goal: QuestGoalKind;
  reward: { tokens?: number; seasonPoints?: number; shards?: number };
  /**
   * Higher = more prestigious / harder. Daily generator picks a mix.
   */
  weight?: number;
}

export interface QuestProgress {
  templateId: string;
  current: number;
  target: number;
  claimed: boolean;
  /** ISO date the quest was rolled — used to expire dailies at midnight. */
  rolledOn: string;
}

export interface QuestState {
  /** YYYY-MM-DD — when the last daily roll happened. */
  lastDailyRollDate: string;
  /** ISO week number (YYYY-W##) — when the last weekly roll happened. */
  lastWeeklyRollWeek: string;
  daily: QuestProgress[];
  weekly: QuestProgress[];
}
