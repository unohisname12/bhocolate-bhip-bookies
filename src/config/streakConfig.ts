export const DAILY_REWARDS = [10, 15, 20, 25, 30, 50, 100] as const;

export const STREAK_MILESTONES: { streak: number; label: string; color: string }[] = [
  { streak: 5, label: 'Bronze', color: 'text-orange-400' },
  { streak: 10, label: 'Silver', color: 'text-slate-300' },
  { streak: 25, label: 'Gold', color: 'text-yellow-400' },
  { streak: 50, label: 'Platinum', color: 'text-cyan-400' },
];

export const getMasteryLevel = (
  score: number,
): 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' => {
  if (score >= 96) return 'master';
  if (score >= 81) return 'expert';
  if (score >= 51) return 'journeyman';
  if (score >= 21) return 'apprentice';
  return 'novice';
};
