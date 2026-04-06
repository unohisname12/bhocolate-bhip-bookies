export const PVP_CONFIG = {
  // Ticket earning
  mathProblemsPerTicket: 3,

  // Ticket limits
  maxTickets: 5,
  maxTicketsPerDay: 4,
  maxTicketsUsedPerDay: 3,

  // Token stakes
  minStake: 5,
  maxStakePercent: 0.10,
  tokenFloor: 20,

  // Anti-farming
  maxWinsVsSameOpponent: 2,
  cooldownAfterMaxWinsHours: 4,
  sameOpponentCooldownMs: 3600000,
  levelGapForReducedRewards: 3,
  reducedRewardMultiplier: 0.5,

  // Flee penalty
  fleePenaltyPercent: 0.5,

  // XP rewards
  winXPMultiplier: 10,
  lossXPMultiplier: 5,
  drawXPMultiplier: 3,

  // Happiness changes
  winHappinessBonus: 20,
  lossHappinessPenalty: 10,

  // NPC classroom
  minClassmates: 8,
  maxClassmates: 12,
  npcLevelVarianceStdDev: 3,
} as const;

export const TROPHY_ICONS: Record<string, string> = {
  common: '/assets/generated/final/reward_trophy_bronze.png',
  uncommon: '🥈',
  rare: '/assets/generated/final/reward_trophy_gold.png',
  epic: '/assets/generated/final/reward_trophy_diamond.png',
};

export const TROPHY_DISPLAY_CONFIGS: Record<string, { spriteKey: string; width: number; height: number }> = {
  common:   { spriteKey: 'trophy_bronze',  width: 1, height: 1 },
  uncommon: { spriteKey: 'trophy_silver',  width: 1, height: 1 },
  rare:     { spriteKey: 'trophy_gold',    width: 1, height: 2 },
  epic:     { spriteKey: 'trophy_diamond', width: 2, height: 2 },
};
