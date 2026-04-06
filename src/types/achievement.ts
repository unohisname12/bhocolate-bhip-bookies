export type AchievementConditionType =
  | 'event_count'
  | 'need_threshold'
  | 'level_reached'
  | 'streak';

export interface AchievementCondition {
  type: AchievementConditionType;
  target: number;
  eventType?: string;
  needKey?: 'hunger' | 'happiness' | 'cleanliness' | 'health';
}

export interface AchievementReward {
  tokens?: number;
  coins?: number;
  itemId?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: AchievementReward;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  unlocked: boolean;
  unlockedAt?: number;
}
