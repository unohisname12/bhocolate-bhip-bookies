import type { EngineState } from '../../types/engine';
import { CURRENT_SEASON, findSeason } from '../../config/seasonConfig';

/**
 * SeasonSystem — manages the current season pass. Reads cumulative
 * `player.currencies.seasonPoints` and exposes which tiers are earned
 * vs claimed. Claiming a tier pays the reward.
 */

export const getActiveSeason = (state: EngineState) =>
  findSeason(state.season.activeSeasonId) ?? CURRENT_SEASON;

/** Highest tier the player has earned (points-wise), regardless of claim status. */
export const getEarnedTier = (state: EngineState): number => {
  const season = getActiveSeason(state);
  const pts = state.player.currencies.seasonPoints;
  let earned = 0;
  for (const t of season.tiers) {
    if (pts >= t.pointsRequired) earned = t.tier;
  }
  return earned;
};

/** Next tier info for progress-bar UI (pointsNeeded, fraction). */
export const getSeasonProgress = (state: EngineState) => {
  const season = getActiveSeason(state);
  const pts = state.player.currencies.seasonPoints;
  const earned = getEarnedTier(state);
  const next = season.tiers.find((t) => t.tier === earned + 1);
  if (!next) {
    return { earned, nextTier: null, fraction: 1, pointsToNext: 0 };
  }
  const prev = season.tiers.find((t) => t.tier === earned);
  const base = prev ? prev.pointsRequired : 0;
  const span = next.pointsRequired - base;
  const progressedIntoSpan = Math.max(0, pts - base);
  return {
    earned,
    nextTier: next,
    fraction: Math.min(1, progressedIntoSpan / span),
    pointsToNext: Math.max(0, next.pointsRequired - pts),
  };
};

/**
 * Claim a tier reward. The tier must be earned (pts >= required) and
 * not already claimed. Pays the reward and records the claim.
 */
export const claimTier = (state: EngineState, tier: number): EngineState => {
  const season = getActiveSeason(state);
  const def = season.tiers.find((t) => t.tier === tier);
  if (!def) return state;
  if (state.player.currencies.seasonPoints < def.pointsRequired) return state;
  if (state.season.claimedTiers.includes(tier)) return state;

  let player = state.player;
  let cosmeticsAdded = [...state.cosmetics.owned];
  let titlesAdded = [...state.season.titles];
  let backgroundsUnlocked = [...state.player.unlockedRoomItems];

  const reward = def.reward;
  if (reward.kind === 'tokens') {
    player = { ...player, currencies: { ...player.currencies, tokens: player.currencies.tokens + reward.amount } };
  } else if (reward.kind === 'coins') {
    player = { ...player, currencies: { ...player.currencies, coins: player.currencies.coins + reward.amount } };
  } else if (reward.kind === 'shards') {
    player = { ...player, currencies: { ...player.currencies, shards: player.currencies.shards + reward.amount } };
  } else if (reward.kind === 'cosmetic') {
    const existing = cosmeticsAdded.find((c) => c.cosmeticId === reward.cosmeticId);
    if (existing) {
      cosmeticsAdded = cosmeticsAdded.map((c) => c.cosmeticId === reward.cosmeticId ? { ...c, count: c.count + 1 } : c);
    } else {
      cosmeticsAdded = [...cosmeticsAdded, { cosmeticId: reward.cosmeticId, count: 1, firstObtainedAt: new Date().toISOString() }];
    }
  } else if (reward.kind === 'title') {
    if (!titlesAdded.includes(reward.titleId)) titlesAdded = [...titlesAdded, reward.titleId];
  } else if (reward.kind === 'room_bg') {
    if (!backgroundsUnlocked.includes(reward.backgroundId)) backgroundsUnlocked = [...backgroundsUnlocked, reward.backgroundId];
    player = { ...player, unlockedRoomItems: backgroundsUnlocked };
  }

  return {
    ...state,
    player,
    cosmetics: { ...state.cosmetics, owned: cosmeticsAdded },
    season: {
      ...state.season,
      claimedTiers: [...state.season.claimedTiers, tier],
      titles: titlesAdded,
    },
    notifications: [
      ...state.notifications,
      {
        id: `season_tier_${tier}_${Date.now()}`,
        message: `Season tier ${tier} claimed: ${def.label}`,
        icon: '⭐',
        timestamp: Date.now(),
      },
    ],
  };
};

/** Does the season end date lie in the past? (Used to gate a rollover screen.) */
export const isSeasonExpired = (state: EngineState, now: Date = new Date()): boolean => {
  const season = getActiveSeason(state);
  const start = new Date(season.startDate);
  const end = new Date(start.getTime() + season.lengthDays * 86400000);
  return now > end;
};
