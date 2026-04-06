import type { PlayerProfile } from '../../types';
import { DAILY_REWARDS } from '../../config/streakConfig';

const toDateString = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const daysBetween = (a: string, b: string): number => {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.floor(Math.abs(msB - msA) / (24 * 60 * 60 * 1000));
};

export const checkLoginStreak = (
  player: PlayerProfile,
  now: number,
): { streak: number; isNewDay: boolean; reward: number } => {
  const todayStr = toDateString(now);
  const lastStr = player.lastLoginDate ?? '';

  if (!lastStr || lastStr === todayStr) {
    return { streak: player.streaks.login, isNewDay: false, reward: 0 };
  }

  const diff = daysBetween(lastStr, todayStr);
  const streak = diff === 1 ? player.streaks.login + 1 : 1;
  const dayIndex = Math.min(streak - 1, DAILY_REWARDS.length - 1);
  const reward = DAILY_REWARDS[dayIndex];

  return { streak, isNewDay: true, reward };
};

export const updateMathStreak = (player: PlayerProfile, correct: boolean): PlayerProfile => {
  if (!correct) {
    return { ...player, streaks: { ...player.streaks, correctAnswers: 0 } };
  }
  return {
    ...player,
    streaks: {
      ...player.streaks,
      correctAnswers: player.streaks.correctAnswers + 1,
    },
  };
};

export const updateMastery = (
  player: PlayerProfile,
  subject: 'arithmetic' | 'geometry' | 'fractions',
  correct: boolean,
): PlayerProfile => {
  const delta = correct ? 2 : -1;
  const current = player.mathMastery[subject];
  const updated = Math.max(0, Math.min(100, current + delta));
  return {
    ...player,
    mathMastery: {
      ...player.mathMastery,
      [subject]: updated,
    },
  };
};
