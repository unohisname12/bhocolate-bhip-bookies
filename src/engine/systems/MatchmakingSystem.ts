import type { MatchupTracker } from '../../types/matchResult';
import { PVP_CONFIG } from '../../config/pvpConfig';

export const estimateDifficulty = (
  playerLevel: number,
  opponentLevel: number,
): 'easier' | 'even' | 'harder' => {
  const gap = opponentLevel - playerLevel;
  if (gap <= -3) return 'easier';
  if (gap >= 3) return 'harder';
  return 'even';
};

export const calculateTokenStake = (
  playerLevel: number,
  opponentLevel: number,
  playerTokens: number,
): number => {
  const avgLevel = Math.floor((playerLevel + opponentLevel) / 2);
  const baseStake = avgLevel * 3;
  const maxStake = Math.floor(playerTokens * PVP_CONFIG.maxStakePercent);
  return Math.max(PVP_CONFIG.minStake, Math.min(baseStake, maxStake));
};

export const canChallenge = (
  trackers: MatchupTracker[],
  opponentId: string,
  now: number,
): { allowed: boolean; reason?: string } => {
  const tracker = trackers.find(t => t.opponentId === opponentId);
  if (!tracker) return { allowed: true };

  // Check cooldown
  if (tracker.cooldownUntil && new Date(tracker.cooldownUntil).getTime() > now) {
    const hoursLeft = Math.ceil((new Date(tracker.cooldownUntil).getTime() - now) / 3600000);
    return { allowed: false, reason: `Cooldown: ${hoursLeft}h remaining` };
  }

  // Check daily wins against this opponent
  const today = new Date(now).toISOString().slice(0, 10);
  const todayWins = tracker.recentResults.filter(
    r => r.date.startsWith(today) && r.outcome === 'win'
  ).length;

  if (todayWins >= PVP_CONFIG.maxWinsVsSameOpponent) {
    return { allowed: false, reason: `Already won ${todayWins}x today against this classmate` };
  }

  // Check rematch cooldown
  const lastResult = tracker.recentResults[tracker.recentResults.length - 1];
  if (lastResult) {
    const lastTime = new Date(lastResult.date).getTime();
    if (now - lastTime < PVP_CONFIG.sameOpponentCooldownMs) {
      const minsLeft = Math.ceil((PVP_CONFIG.sameOpponentCooldownMs - (now - lastTime)) / 60000);
      return { allowed: false, reason: `Rematch in ${minsLeft}m` };
    }
  }

  return { allowed: true };
};

export const updateMatchupTracker = (
  trackers: MatchupTracker[],
  opponentId: string,
  outcome: 'win' | 'loss' | 'draw' | 'fled',
  now: number,
): MatchupTracker[] => {
  const today = new Date(now).toISOString().slice(0, 10);
  const entry = { date: today, outcome };
  const existing = trackers.find(t => t.opponentId === opponentId);

  if (!existing) {
    return [...trackers, {
      opponentId,
      recentResults: [entry],
      cooldownUntil: undefined,
    }];
  }

  const updatedResults = [...existing.recentResults, entry].slice(-20);
  const todayWins = updatedResults.filter(r => r.date === today && r.outcome === 'win').length;

  const cooldownUntil = todayWins >= PVP_CONFIG.maxWinsVsSameOpponent
    ? new Date(now + PVP_CONFIG.cooldownAfterMaxWinsHours * 3600000).toISOString()
    : undefined;

  return trackers.map(t => t.opponentId === opponentId
    ? { ...t, recentResults: updatedResults, cooldownUntil }
    : t
  );
};

/** Shuffle an array in place (Fisher-Yates) and return it */
export const shuffleArray = <T>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
