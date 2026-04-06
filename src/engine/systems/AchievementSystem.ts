import type { EngineState } from '../core/EngineTypes';
import type { Achievement, AchievementProgress } from '../../types/achievement';
import { ACHIEVEMENTS } from '../../config/achievementConfig';

const getEventCount = (state: EngineState, eventType: string): number =>
  state.events.filter((e) => e.type === eventType).length;

export const checkAchievements = (
  state: EngineState,
): { unlocked: Achievement[]; state: EngineState } => {
  const newlyUnlocked: Achievement[] = [];
  let updatedProgress = [...state.achievements];
  let updatedPlayer = state.player;

  for (const achievement of ACHIEVEMENTS) {
    const existing = updatedProgress.find((p) => p.achievementId === achievement.id);
    if (existing?.unlocked) continue;

    const { condition } = achievement;
    let current = existing?.current ?? 0;
    let unlocked = false;

    if (condition.type === 'event_count' && condition.eventType) {
      current = getEventCount(state, condition.eventType);
      unlocked = current >= condition.target;
    } else if (condition.type === 'streak') {
      current = state.player.streaks.correctAnswers;
      unlocked = current >= condition.target;
    } else if (condition.type === 'level_reached') {
      current = state.pet?.progression.level ?? 0;
      unlocked = current >= condition.target;
    }

    const updatedEntry: AchievementProgress = {
      achievementId: achievement.id,
      current,
      unlocked,
      unlockedAt: unlocked ? Date.now() : undefined,
    };

    updatedProgress = updatedProgress.filter((p) => p.achievementId !== achievement.id);
    updatedProgress.push(updatedEntry);

    if (unlocked) {
      newlyUnlocked.push(achievement);
      // Apply reward
      if (achievement.reward.tokens) {
        updatedPlayer = {
          ...updatedPlayer,
          currencies: {
            ...updatedPlayer.currencies,
            tokens: updatedPlayer.currencies.tokens + (achievement.reward.tokens ?? 0),
          },
        };
      }
      if (achievement.reward.coins) {
        updatedPlayer = {
          ...updatedPlayer,
          currencies: {
            ...updatedPlayer.currencies,
            coins: updatedPlayer.currencies.coins + (achievement.reward.coins ?? 0),
          },
        };
      }
    }
  }

  const newState: EngineState = {
    ...state,
    player: updatedPlayer,
    achievements: updatedProgress,
    notifications: [
      ...state.notifications,
      ...newlyUnlocked.map((a) => ({ id: a.id, message: `Achievement: ${a.name}`, icon: a.icon, timestamp: Date.now() })),
    ],
  };

  return { unlocked: newlyUnlocked, state: newState };
};
