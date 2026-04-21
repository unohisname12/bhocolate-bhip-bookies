export type ShopItemCategory = 'food' | 'toy' | 'medicine' | 'cosmetic' | 'care_tool';

export interface ItemEffect {
  type: 'feed' | 'play' | 'heal' | 'clean' | 'buff';
  value: number;
  duration?: number;
}

/**
 * How a shop item gets unlocked. Every rule is evaluated against the live
 * `PlayerProgressSnapshot` built in `ShopScreen.tsx` from existing engine
 * state (so no save migration is needed).
 *
 * `undefined` / absent = item is always unlocked from level 1.
 */
export type ShopUnlockRule =
  | { kind: 'level'; threshold: number }
  | { kind: 'battlesWon'; threshold: number }
  | { kind: 'mpTier'; tier: 'silver' | 'gold' }
  | { kind: 'bond'; threshold: number };

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: { tokens?: number; coins?: number };
  category: ShopItemCategory;
  stackable: boolean;
  effect: ItemEffect;
  /** Legacy alias for `{ kind: 'mpTier', tier: 'silver' }` — kept for backward compat with existing saves. */
  requiredMPTier?: 'silver';
  /** New unified unlock rule. If set, this takes precedence over `requiredMPTier`. */
  unlockRule?: ShopUnlockRule;
  /** Short hint shown to the player while the item is locked. */
  unlockHint?: string;
}

export interface PlayerProgressSnapshot {
  level: number;
  battlesWon: number;
  mpTier: 'bronze' | 'silver' | 'gold';
  bond: number;
}

const matchesRule = (rule: ShopUnlockRule, progress: PlayerProgressSnapshot): boolean => {
  switch (rule.kind) {
    case 'level':
      return progress.level >= rule.threshold;
    case 'battlesWon':
      return progress.battlesWon >= rule.threshold;
    case 'mpTier':
      if (rule.tier === 'gold') return progress.mpTier === 'gold';
      return progress.mpTier === 'silver' || progress.mpTier === 'gold';
    case 'bond':
      return progress.bond >= rule.threshold;
  }
};

export const isShopItemUnlocked = (item: ShopItem, progress: PlayerProgressSnapshot): boolean => {
  if (item.unlockRule) return matchesRule(item.unlockRule, progress);
  if (item.requiredMPTier === 'silver') return progress.mpTier === 'silver' || progress.mpTier === 'gold';
  return true;
};

export const describeUnlockRule = (item: ShopItem): string => {
  if (item.unlockHint) return item.unlockHint;
  if (item.unlockRule) {
    switch (item.unlockRule.kind) {
      case 'level':
        return `Unlock at L${item.unlockRule.threshold}`;
      case 'battlesWon':
        return `Win ${item.unlockRule.threshold} battles`;
      case 'mpTier':
        return `Reach ${item.unlockRule.tier} MP tier`;
      case 'bond':
        return `Reach bond ${item.unlockRule.threshold}`;
    }
  }
  if (item.requiredMPTier === 'silver') return 'Reach silver MP tier';
  return 'Locked';
};

export const SHOP_ITEMS: ShopItem[] = [
  // ── Food (always available / early unlocks) ───────────────────────────────
  { id: 'apple', name: 'Apple', description: 'A crisp apple. +15 hunger.', icon: '/assets/generated/final/item_apple.png', cost: { tokens: 5 }, category: 'food', stackable: true, effect: { type: 'feed', value: 15 } },
  { id: 'meat', name: 'Meat', description: 'Juicy protein. +30 hunger.', icon: '🥩', cost: { tokens: 12 }, category: 'food', stackable: true, effect: { type: 'feed', value: 30 } },
  { id: 'cake', name: 'Cake', description: 'Sweet treat. +50 hunger +10 happiness.', icon: '/assets/generated/final/item_cake.png', cost: { tokens: 28 }, category: 'food', stackable: true, effect: { type: 'feed', value: 50 } },
  { id: 'potion', name: 'Potion', description: 'Max hunger restore.', icon: '/assets/generated/final/item_potion.png', cost: { tokens: 60 }, category: 'food', stackable: true, effect: { type: 'feed', value: 100 }, unlockRule: { kind: 'level', threshold: 3 } },
  { id: 'golden_apple', name: 'Golden Apple', description: 'Premium apple. +40 hunger +10 happiness.', icon: '/assets/generated/final/item_apple.png', cost: { tokens: 120 }, category: 'food', stackable: true, effect: { type: 'feed', value: 40 }, requiredMPTier: 'silver' as const, unlockHint: 'Reach silver MP tier' },
  { id: 'feast_platter', name: 'Feast Platter', description: 'A lavish spread. +80 hunger +20 happiness.', icon: '🍱', cost: { tokens: 180 }, category: 'food', stackable: true, effect: { type: 'feed', value: 80 }, unlockRule: { kind: 'level', threshold: 6 } },
  { id: 'elixir', name: 'Elixir', description: 'Restores all needs to full.', icon: '🧪', cost: { tokens: 500 }, category: 'food', stackable: true, effect: { type: 'feed', value: 100 }, unlockRule: { kind: 'level', threshold: 10 } },

  // ── Toys ──────────────────────────────────────────────────────────────────
  { id: 'ball', name: 'Ball', description: 'A bouncy ball. +40 happiness.', icon: '⚽', cost: { tokens: 18 }, category: 'toy', stackable: true, effect: { type: 'play', value: 40 } },
  { id: 'teddy', name: 'Teddy Bear', description: 'Snuggly companion. +60 happiness.', icon: '/assets/generated/final/item_teddy_bear.png', cost: { tokens: 45 }, category: 'toy', stackable: true, effect: { type: 'play', value: 60 } },
  { id: 'puzzle_cube', name: 'Puzzle Cube', description: 'Stimulating brain-teaser. +75 happiness.', icon: '🧩', cost: { tokens: 90 }, category: 'toy', stackable: true, effect: { type: 'play', value: 75 }, unlockRule: { kind: 'battlesWon', threshold: 3 } },
  { id: 'kite', name: 'Kite', description: 'Soars on the wind. +100 happiness.', icon: '🪁', cost: { tokens: 180 }, category: 'toy', stackable: true, effect: { type: 'play', value: 100 }, unlockRule: { kind: 'level', threshold: 5 } },

  // ── Medicine ──────────────────────────────────────────────────────────────
  { id: 'bandage', name: 'Bandage', description: 'Basic first aid. +25 health.', icon: '/assets/generated/final/item_bandage.png', cost: { tokens: 20 }, category: 'medicine', stackable: true, effect: { type: 'heal', value: 25 } },
  { id: 'medicine', name: 'Medicine', description: 'Full health restore.', icon: '/assets/generated/final/item_pill.png', cost: { tokens: 75 }, category: 'medicine', stackable: true, effect: { type: 'heal', value: 100 } },
  { id: 'revive_scroll', name: 'Revive Scroll', description: 'Ancient healing magic. +150 health.', icon: '📜', cost: { tokens: 250 }, category: 'medicine', stackable: true, effect: { type: 'heal', value: 100 }, unlockRule: { kind: 'battlesWon', threshold: 5 } },
  { id: 'phoenix_tear', name: 'Phoenix Tear', description: 'Legendary restorative.', icon: '💧', cost: { tokens: 800 }, category: 'medicine', stackable: true, effect: { type: 'heal', value: 100 }, unlockRule: { kind: 'level', threshold: 8 } },

  // ── Cosmetic ──────────────────────────────────────────────────────────────
  { id: 'hat', name: 'Party Hat', description: 'Festive head wear.', icon: '🎩', cost: { coins: 5 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 5 } },
  { id: 'crown', name: 'Royal Crown', description: 'A mark of mastery.', icon: '👑', cost: { coins: 25 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 10 }, unlockRule: { kind: 'battlesWon', threshold: 10 } },
  { id: 'wings', name: 'Ethereal Wings', description: 'Shimmering cosmetic wings.', icon: '🦋', cost: { coins: 50 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 15 }, unlockRule: { kind: 'level', threshold: 7 } },
  { id: 'silver_halo', name: 'Silver Halo', description: 'A quiet ring of light. Silver scholars only.', icon: '😇', cost: { coins: 40 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 20 }, unlockRule: { kind: 'mpTier', tier: 'silver' }, unlockHint: 'Reach silver math tier' },
  { id: 'golden_crown', name: 'Golden Crown', description: 'Legendary regalia for gold-tier masters.', icon: '🏅', cost: { coins: 120 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 30 }, unlockRule: { kind: 'mpTier', tier: 'gold' }, unlockHint: 'Reach gold math tier' },
  { id: 'prism_aura', name: 'Prism Aura', description: 'Shimmering field only gold minds can sustain.', icon: '🌈', cost: { coins: 200 }, category: 'cosmetic', stackable: false, effect: { type: 'buff', value: 40 }, unlockRule: { kind: 'mpTier', tier: 'gold' }, unlockHint: 'Reach gold math tier' },

  // ── Care Tools (unlock / upgrade pet interactions) ──────────────────────────
  { id: 'soap_kit', name: 'Soap Kit', description: 'Unlocks the Wash interaction.', icon: '/assets/generated/final/icon_clean.png', cost: { tokens: 25 }, category: 'care_tool', stackable: false, effect: { type: 'clean', value: 0 }, unlockRule: { kind: 'level', threshold: 2 }, unlockHint: 'Reach level 2' },
  { id: 'brush_set', name: 'Brush Set', description: 'Unlocks the Brush interaction.', icon: '/assets/generated/final/icon_clean.png', cost: { tokens: 30 }, category: 'care_tool', stackable: false, effect: { type: 'clean', value: 0 }, unlockRule: { kind: 'bond', threshold: 10 }, unlockHint: 'Reach bond level 10' },
  { id: 'training_manual', name: 'Training Manual', description: 'Unlocks Training interaction.', icon: '/assets/generated/final/icon_energy.png', cost: { tokens: 40 }, category: 'care_tool', stackable: false, effect: { type: 'buff', value: 0 }, unlockRule: { kind: 'level', threshold: 3 }, unlockHint: 'Reach level 3' },
  { id: 'premium_soap', name: 'Premium Soap', description: '1.5x wash effectiveness.', icon: '/assets/generated/final/icon_clean.png', cost: { tokens: 60 }, category: 'care_tool', stackable: false, effect: { type: 'clean', value: 0 }, unlockRule: { kind: 'level', threshold: 4 }, unlockHint: 'Reach level 4' },
  { id: 'grooming_kit', name: 'Grooming Kit', description: '1.5x brush effectiveness.', icon: '/assets/generated/final/icon_clean.png', cost: { tokens: 80 }, category: 'care_tool', stackable: false, effect: { type: 'clean', value: 0 }, unlockRule: { kind: 'battlesWon', threshold: 5 }, unlockHint: 'Win 5 battles' },
  { id: 'training_weights', name: 'Training Weights', description: '1.5x discipline gain.', icon: '/assets/generated/final/icon_energy.png', cost: { tokens: 100 }, category: 'care_tool', stackable: false, effect: { type: 'buff', value: 0 }, unlockRule: { kind: 'level', threshold: 5 }, unlockHint: 'Reach level 5' },
  { id: 'comfort_blanket', name: 'Comfort Blanket', description: '2x stress reduction.', icon: '/assets/generated/final/icon_heart.png', cost: { tokens: 45 }, category: 'care_tool', stackable: false, effect: { type: 'buff', value: 0 }, unlockRule: { kind: 'level', threshold: 3 }, unlockHint: 'Reach level 3' },
  { id: 'deluxe_toy', name: 'Deluxe Toy', description: '1.5x play happiness.', icon: '/assets/generated/final/item_teddy_bear.png', cost: { tokens: 65 }, category: 'care_tool', stackable: false, effect: { type: 'play', value: 0 }, unlockRule: { kind: 'bond', threshold: 20 }, unlockHint: 'Reach bond level 20' },
];

export const STREAK_THRESHOLDS: { streak: number; label: string }[] = [];
