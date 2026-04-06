import type { FoodItem, CareActionConfig } from '../types';

export const DECAY_RATES = {
  hunger: 11,       // ~45 min to empty (was 5 → ~100 min)
  happiness: 5,     // ~67 min to empty (was 2 → ~167 min)
  cleanliness: 7,   // ~107 min to empty (was 3 → ~250 min)
  health: 1,        // unchanged — health is the final consequence
  healthMultiplierThreshold: 30,
  healthMultiplierFactor: 2,
} as const;

export const TICK_INTERVAL_MS = 1000 as const;
export const DECAY_INTERVAL_MS = 60000 as const;

export const PET_STATE_THRESHOLDS = {
  dead: 0,
  sick: 25,
  hungry: 30,
  happy: 80,
  sleepStart: 22,
  sleepEnd: 6,
} as const;

export const ANIMATION_DEFAULTS = {
  defaultFrameDuration: 175,
  scale: 2.0,
} as const;

export const HINT_COST = 5 as const;

export const CARE_COOLDOWNS = {
  feed: 30000,    // 30s
  play: 60000,    // 60s
  clean: 45000,   // 45s
  heal: 0,        // no cooldown
} as const;

export const GRACE_PERIOD_MS = 300000 as const; // 5 minutes

export const EGG_CONFIG = {
  maxProgress: 100,
  tapIncrement: 10,
} as const;

export const FOOD_ITEMS: FoodItem[] = [
  { id: 'apple', icon: '/assets/generated/final/item_apple.png', label: 'Apple', cost: 5, nutrition: 15 },
  { id: 'meat', icon: '🥩', label: 'Meat', cost: 10, nutrition: 30 },
  { id: 'cake', icon: '/assets/generated/final/item_cake.png', label: 'Cake', cost: 20, nutrition: 50 },
  { id: 'potion', icon: '/assets/generated/final/item_potion.png', label: 'Potion', cost: 50, nutrition: 100 },
];

export const CARE_ACTIONS: Record<CareActionConfig['id'], CareActionConfig> = {
  feed: {
    id: 'feed',
    label: 'Feed',
    cost: 5,
    impact: 30,
  },
  play: {
    id: 'play',
    label: 'Play',
    cost: 15,
    impact: 40,
  },
  heal: {
    id: 'heal',
    label: 'Heal',
    cost: 50,
    impact: 100,
  },
  clean: {
    id: 'clean',
    label: 'Clean',
    cost: 10,
    impact: 50,
  },
  train: {
    id: 'train',
    label: 'Train',
    cost: 0,
    impact: 0,
  },
};
