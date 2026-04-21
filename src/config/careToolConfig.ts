import type { ShopUnlockRule } from './shopConfig';

/**
 * Care tool items purchasable from the shop.
 *
 * "Unlock" tools gate access to an interaction mode.
 * "Upgrade" tools increase an already-unlocked mode's effectiveness.
 */
export interface CareToolItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: { tokens?: number; coins?: number };
  /** Which interaction mode this tool affects. */
  targetMode: 'wash' | 'brush' | 'train' | 'comfort' | 'play' | 'pet';
  /** 'unlock' = gates access, 'upgrade' = boosts existing. */
  toolType: 'unlock' | 'upgrade';
  /** For upgrades: the tier this item grants (1, 2, etc.). */
  upgradeTier?: number;
  /** Stat multiplier when this tier is equipped (applied on top of base). */
  effectMultiplier: number;
  /** Shop unlock rule (level, battles, etc.). */
  unlockRule?: ShopUnlockRule;
  unlockHint?: string;
}

export const CARE_TOOL_ITEMS: CareToolItem[] = [
  // ── Unlock tools (gate interaction access) ──────────────────────
  {
    id: 'soap_kit',
    name: 'Soap Kit',
    description: 'Basic soap and sponge. Unlocks the Wash interaction.',
    icon: '/assets/generated/final/icon_clean.png',
    cost: { tokens: 25 },
    targetMode: 'wash',
    toolType: 'unlock',
    effectMultiplier: 1.0,
    unlockRule: { kind: 'level', threshold: 2 },
    unlockHint: 'Reach level 2',
  },
  {
    id: 'brush_set',
    name: 'Brush Set',
    description: 'A soft-bristle brush. Unlocks the Brush interaction.',
    icon: '/assets/generated/final/icon_clean.png',
    cost: { tokens: 30 },
    targetMode: 'brush',
    toolType: 'unlock',
    effectMultiplier: 1.0,
    unlockHint: 'Reach bond level 10',
  },
  {
    id: 'training_manual',
    name: 'Training Manual',
    description: 'A beginner\'s guide to pet training. Unlocks Training.',
    icon: '/assets/generated/final/icon_energy.png',
    cost: { tokens: 40 },
    targetMode: 'train',
    toolType: 'unlock',
    effectMultiplier: 1.0,
    unlockRule: { kind: 'level', threshold: 3 },
    unlockHint: 'Reach level 3',
  },

  // ── Upgrade tools (enhance existing interactions) ───────────────
  {
    id: 'premium_soap',
    name: 'Premium Soap',
    description: 'Luxury suds. 1.5x cleanliness gain from washing.',
    icon: '/assets/generated/final/icon_clean.png',
    cost: { tokens: 60 },
    targetMode: 'wash',
    toolType: 'upgrade',
    upgradeTier: 1,
    effectMultiplier: 1.5,
    unlockRule: { kind: 'level', threshold: 4 },
    unlockHint: 'Reach level 4',
  },
  {
    id: 'grooming_kit',
    name: 'Grooming Kit',
    description: 'Professional grooming tools. 1.5x brush effectiveness.',
    icon: '/assets/generated/final/icon_clean.png',
    cost: { tokens: 80 },
    targetMode: 'brush',
    toolType: 'upgrade',
    upgradeTier: 1,
    effectMultiplier: 1.5,
    unlockRule: { kind: 'battlesWon', threshold: 5 },
    unlockHint: 'Win 5 battles',
  },
  {
    id: 'training_weights',
    name: 'Training Weights',
    description: 'Heavier gear for serious training. 1.5x discipline gain.',
    icon: '/assets/generated/final/icon_energy.png',
    cost: { tokens: 100 },
    targetMode: 'train',
    toolType: 'upgrade',
    upgradeTier: 1,
    effectMultiplier: 1.5,
    unlockRule: { kind: 'level', threshold: 5 },
    unlockHint: 'Reach level 5',
  },
  {
    id: 'comfort_blanket',
    name: 'Comfort Blanket',
    description: 'A cozy blanket. 2x stress reduction from comforting.',
    icon: '/assets/generated/final/icon_heart.png',
    cost: { tokens: 45 },
    targetMode: 'comfort',
    toolType: 'upgrade',
    upgradeTier: 1,
    effectMultiplier: 2.0,
    unlockRule: { kind: 'level', threshold: 3 },
    unlockHint: 'Reach level 3',
  },
  {
    id: 'deluxe_toy',
    name: 'Deluxe Toy',
    description: 'Premium play equipment. 1.5x happiness from playing.',
    icon: '/assets/generated/final/item_teddy_bear.png',
    cost: { tokens: 65 },
    targetMode: 'play',
    toolType: 'upgrade',
    upgradeTier: 1,
    effectMultiplier: 1.5,
    unlockHint: 'Reach bond level 20',
  },
];

/** Look up a care tool by id. */
export const getCareToolById = (id: string): CareToolItem | undefined =>
  CARE_TOOL_ITEMS.find(t => t.id === id);
