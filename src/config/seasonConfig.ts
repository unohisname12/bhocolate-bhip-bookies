import type { SeasonDefinition } from '../types/season';

/**
 * Season 1 — "Cozy Beginnings". 20 tiers over 42 days.
 * Every 50 season points = 1 tier. ~100 SP/day is achievable by a kid
 * hitting 3-4 daily quests + 1 weekly share, so they can finish in 3 weeks
 * with engagement, or 6 weeks at a casual pace.
 */

export const SEASON_1: SeasonDefinition = {
  id: 'season_1_cozy',
  name: 'Season 1: Cozy Beginnings',
  theme: 'Warm welcome to the world. Earn points by completing quests.',
  startDate: '2026-04-19',
  lengthDays: 42,
  tiers: [
    { tier: 1,  pointsRequired: 50,   label: 'Warm Welcome',     reward: { kind: 'tokens', amount: 50 } },
    { tier: 2,  pointsRequired: 100,  label: 'First Step',       reward: { kind: 'cosmetic', cosmeticId: 'cos_cozy_cap' } },
    { tier: 3,  pointsRequired: 175,  label: 'Bag of Shards',    reward: { kind: 'shards', amount: 5 } },
    { tier: 4,  pointsRequired: 275,  label: 'Party Time',       reward: { kind: 'cosmetic', cosmeticId: 'cos_party_hat' } },
    { tier: 5,  pointsRequired: 400,  label: 'Coin Drop',        reward: { kind: 'coins', amount: 3 } },
    { tier: 6,  pointsRequired: 550,  label: 'Sunny Shades',     reward: { kind: 'cosmetic', cosmeticId: 'cos_sun_shades' } },
    { tier: 7,  pointsRequired: 700,  label: 'Treasury',         reward: { kind: 'tokens', amount: 150 } },
    { tier: 8,  pointsRequired: 875,  label: 'Collar of Pride',  reward: { kind: 'cosmetic', cosmeticId: 'cos_red_collar' } },
    { tier: 9,  pointsRequired: 1050, label: 'Meadow Backdrop',  reward: { kind: 'room_bg', backgroundId: 'bg_meadow' } },
    { tier: 10, pointsRequired: 1250, label: 'Title Holder',     reward: { kind: 'title', titleId: 'title_devoted' } },
    { tier: 11, pointsRequired: 1450, label: 'Shard Pile',       reward: { kind: 'shards', amount: 10 } },
    { tier: 12, pointsRequired: 1650, label: 'Star Beret',       reward: { kind: 'cosmetic', cosmeticId: 'cos_star_beret' } },
    { tier: 13, pointsRequired: 1900, label: 'Tokens!',          reward: { kind: 'tokens', amount: 250 } },
    { tier: 14, pointsRequired: 2150, label: 'Crystal Monocle',  reward: { kind: 'cosmetic', cosmeticId: 'cos_monocle' } },
    { tier: 15, pointsRequired: 2450, label: 'Coin Tower',       reward: { kind: 'coins', amount: 8 } },
    { tier: 16, pointsRequired: 2750, label: 'Rainbow Aura',     reward: { kind: 'cosmetic', cosmeticId: 'cos_rainbow_aura' } },
    { tier: 17, pointsRequired: 3100, label: 'Castle Backdrop',  reward: { kind: 'room_bg', backgroundId: 'bg_castle' } },
    { tier: 18, pointsRequired: 3450, label: 'Shard Hoard',      reward: { kind: 'shards', amount: 20 } },
    { tier: 19, pointsRequired: 3850, label: 'Crown of Season',  reward: { kind: 'cosmetic', cosmeticId: 'cos_season_crown' } },
    { tier: 20, pointsRequired: 4300, label: 'Founder Title',    reward: { kind: 'title', titleId: 'title_season_1_founder' } },
  ],
};

export const CURRENT_SEASON: SeasonDefinition = SEASON_1;

export const ALL_SEASONS: SeasonDefinition[] = [SEASON_1];

export const findSeason = (id: string): SeasonDefinition | undefined =>
  ALL_SEASONS.find((s) => s.id === id);
