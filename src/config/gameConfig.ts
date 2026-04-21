import type { FoodItem, CareActionConfig } from '../types';

export const DECAY_RATES = {
  hunger: 5.5,      // ~90 min to empty — half-day school-friendly pacing
  happiness: 2,     // ~160 min empty — play is meaningful, not urgent
  cleanliness: 3,   // ~250 min empty — 4+ hours
  health: 1,        // unchanged — only decays when hunger/cleanliness critical
  healthMultiplierThreshold: 30,
  healthMultiplierFactor: 2,
} as const;

export const SLEEP_DECAY_MULTIPLIER = 0.3;

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
  // Common — no math gate
  { id: 'apple',   icon: '/assets/generated/final/item_apple.png',   label: 'Apple',   cost: 5,  nutrition: 15, rarity: 'common' },
  { id: 'bread',   icon: '/assets/generated/final/item_bread.png',   label: 'Bread',   cost: 7,  nutrition: 18, rarity: 'common' },
  { id: 'berry',   icon: '/assets/generated/final/item_berry.png',   label: 'Berry',   cost: 4,  nutrition: 10, rarity: 'common' },
  { id: 'carrot',  icon: '/assets/generated/final/item_carrot.png',  label: 'Carrot',  cost: 6,  nutrition: 14, rarity: 'common' },
  { id: 'meat',    icon: '/assets/generated/final/item_meat.png',    label: 'Meat',    cost: 10, nutrition: 30, rarity: 'common' },
  { id: 'cheese',  icon: '/assets/generated/final/item_cheese.png',  label: 'Cheese',  cost: 12, nutrition: 32, rarity: 'common' },
  { id: 'cake',    icon: '/assets/generated/final/item_cake.png',    label: 'Cake',    cost: 20, nutrition: 50, rarity: 'common' },
  // Rare — math-tier gated
  { id: 'golden_apple', icon: '/assets/generated/final/item_golden_apple.png', label: 'Golden Apple', cost: 80,  nutrition: 45, rarity: 'rare', requiredMathTier: 'silver', bondBonus: 2, happinessBonus: 15 },
  { id: 'magic_food',   icon: '/assets/generated/final/item_magic_food.png',   label: 'Magic Food',   cost: 120, nutrition: 60, rarity: 'rare', requiredMathTier: 'silver', bondBonus: 2, happinessBonus: 20 },
  { id: 'honey',        icon: '/assets/generated/final/item_honey.png',        label: 'Honey Jar',    cost: 90,  nutrition: 40, rarity: 'rare', requiredMathTier: 'silver', bondBonus: 1, happinessBonus: 25 },
  { id: 'rare_meat',    icon: '/assets/generated/final/item_rare_meat.png',    label: 'Rare Cut',     cost: 200, nutrition: 80, rarity: 'rare', requiredMathTier: 'gold',   bondBonus: 3, happinessBonus: 15 },
  // Medicine — always available, explicit category for the FeedingScreen filter
  { id: 'potion',       icon: '/assets/generated/final/item_potion.png',       label: 'Potion',       cost: 50,  nutrition: 100, rarity: 'medicine' },
  { id: 'pill',         icon: '/assets/generated/final/item_pill.png',         label: 'Pill',         cost: 35,  nutrition: 70,  rarity: 'medicine' },
  { id: 'healing_kit',  icon: '/assets/generated/final/item_healing_kit.png',  label: 'Healing Kit',  cost: 75,  nutrition: 100, rarity: 'medicine' },
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
