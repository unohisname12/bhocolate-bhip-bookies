import type { Cosmetic } from '../types/cosmetic';

/**
 * Cosmetic registry. 18 items across 4 slots and 4 rarities.
 * Icons use emoji glyphs as a fast starting point — hand-swap to pixel
 * art sprites (same naming pattern as item_meat.png) when ready.
 */

export const COSMETICS: Cosmetic[] = [
  // --- Hats (slot='hat') --------------------------------------------
  { id: 'cos_cozy_cap',     name: 'Cozy Cap',       slot: 'hat',     rarity: 'common',    icon: '🧢', offsets: { top: -12, left: 0, size: 36 }, source: 'season',      shardValue: 2 },
  { id: 'cos_party_hat',    name: 'Party Hat',      slot: 'hat',     rarity: 'common',    icon: '🎉', offsets: { top: -14, left: 0, size: 36 }, source: 'season',      shardValue: 2 },
  { id: 'cos_star_beret',   name: 'Star Beret',     slot: 'hat',     rarity: 'rare',      icon: '⭐', offsets: { top: -10, left: 0, size: 32 }, source: 'season',      shardValue: 5 },
  { id: 'cos_witch_hat',    name: 'Witch Hat',      slot: 'hat',     rarity: 'rare',      icon: '🧙', offsets: { top: -18, left: 0, size: 44 }, source: 'gacha',       shardValue: 5 },
  { id: 'cos_crown_bronze', name: 'Bronze Crown',   slot: 'hat',     rarity: 'rare',      icon: '👑', offsets: { top: -10, left: 0, size: 32 }, source: 'gacha',       shardValue: 5 },
  { id: 'cos_season_crown', name: 'Crown of Season',slot: 'hat',     rarity: 'legendary', icon: '👑', offsets: { top: -12, left: 0, size: 38 }, source: 'season',      shardValue: 20 },

  // --- Eyewear (slot='eyewear') -------------------------------------
  { id: 'cos_sun_shades',   name: 'Sun Shades',     slot: 'eyewear', rarity: 'common',    icon: '🕶️', offsets: { top: 18, left: 0, size: 30 }, source: 'season',       shardValue: 2 },
  { id: 'cos_3d_glasses',   name: '3D Glasses',     slot: 'eyewear', rarity: 'common',    icon: '👓', offsets: { top: 18, left: 0, size: 30 }, source: 'gacha',        shardValue: 2 },
  { id: 'cos_monocle',      name: 'Crystal Monocle',slot: 'eyewear', rarity: 'epic',      icon: '🔍', offsets: { top: 18, left: 8, size: 20 }, source: 'season',       shardValue: 10 },
  { id: 'cos_eye_patch',    name: 'Eye Patch',      slot: 'eyewear', rarity: 'rare',      icon: '🏴‍☠️', offsets: { top: 18, left: 0, size: 28 }, source: 'gacha',        shardValue: 5 },

  // --- Collars (slot='collar') --------------------------------------
  { id: 'cos_red_collar',   name: 'Red Collar',     slot: 'collar',  rarity: 'common',    icon: '🎀', offsets: { top: 52, left: 0, size: 28 }, source: 'season',       shardValue: 2 },
  { id: 'cos_bell_collar',  name: 'Bell Collar',    slot: 'collar',  rarity: 'rare',      icon: '🔔', offsets: { top: 52, left: 0, size: 28 }, source: 'gacha',        shardValue: 5 },
  { id: 'cos_gold_chain',   name: 'Gold Chain',     slot: 'collar',  rarity: 'epic',      icon: '📿', offsets: { top: 52, left: 0, size: 32 }, source: 'gacha',        shardValue: 10 },

  // --- Aura (slot='aura') — renders behind pet ----------------------
  { id: 'cos_heart_aura',   name: 'Heart Aura',     slot: 'aura',    rarity: 'rare',      icon: '💖', offsets: { top: 0, left: 0, size: 96 }, source: 'gacha',         shardValue: 5 },
  { id: 'cos_fire_aura',    name: 'Fire Aura',      slot: 'aura',    rarity: 'epic',      icon: '🔥', offsets: { top: 0, left: 0, size: 96 }, source: 'gacha',         shardValue: 10 },
  { id: 'cos_rainbow_aura', name: 'Rainbow Aura',   slot: 'aura',    rarity: 'epic',      icon: '🌈', offsets: { top: 0, left: 0, size: 96 }, source: 'season',        shardValue: 10 },
  { id: 'cos_sparkle_aura', name: 'Sparkle Aura',   slot: 'aura',    rarity: 'legendary', icon: '✨', offsets: { top: 0, left: 0, size: 96 }, source: 'gacha',         shardValue: 20 },
  { id: 'cos_galaxy_aura',  name: 'Galaxy Aura',    slot: 'aura',    rarity: 'legendary', icon: '🌌', offsets: { top: 0, left: 0, size: 96 }, source: 'event',         shardValue: 20 },

  // --- Expansion pack (2026-04-20) — new hats, eyewear, collars ----
  { id: 'cos_flower_crown', name: 'Flower Crown',   slot: 'hat',     rarity: 'common',    icon: '🌸', offsets: { top: -10, left: 0, size: 34 }, source: 'season',      shardValue: 2 },
  { id: 'cos_pirate_hat',   name: 'Pirate Hat',     slot: 'hat',     rarity: 'rare',      icon: '🏴‍☠️', offsets: { top: -14, left: 0, size: 42 }, source: 'gacha',       shardValue: 5 },
  { id: 'cos_chef_hat',     name: 'Chef Hat',       slot: 'hat',     rarity: 'rare',      icon: '👨‍🍳', offsets: { top: -14, left: 0, size: 38 }, source: 'season',      shardValue: 5 },
  { id: 'cos_heart_glasses',name: 'Heart Glasses',  slot: 'eyewear', rarity: 'rare',      icon: '😍', offsets: { top: 18, left: 0, size: 30 }, source: 'season',       shardValue: 5 },
  { id: 'cos_scarf_red',    name: 'Red Scarf',      slot: 'collar',  rarity: 'common',    icon: '🧣', offsets: { top: 52, left: 0, size: 32 }, source: 'season',       shardValue: 2 },
  { id: 'cos_cloud_aura',   name: 'Cloud Aura',     slot: 'aura',    rarity: 'rare',      icon: '☁️', offsets: { top: 0, left: 0, size: 96 }, source: 'season',        shardValue: 5 },
];

export const findCosmetic = (id: string): Cosmetic | undefined =>
  COSMETICS.find((c) => c.id === id);

/**
 * Gacha rarity weights (out of 1000). Epic/legendary boosted by pity timers
 * in GachaSystem so kids don't get stuck on common-only pulls.
 */
export const GACHA_WEIGHTS: Record<string, number> = {
  common: 700,
  rare: 230,
  epic: 60,
  legendary: 10,
};

/** Every N pulls without a rare+, force a rare+. */
export const GACHA_PITY_RARE = 8;
/** Every N pulls without an epic+, force an epic+. */
export const GACHA_PITY_EPIC = 30;

/** Mystery Egg cost in tokens. */
export const GACHA_PULL_COST = 200;

/**
 * MP (math point) cost added on top of tokens. Ensures math is the currency
 * of new-pet / cosmetic acquisition — a player who skips math cannot pull.
 * MP only spends when available; tokens always spend.
 */
export const GACHA_PULL_MP_COST = 30;

/** Shards-based craft options — Forge tab inside GachaScreen. */
export interface ShardCraftOption {
  id: string;
  label: string;
  description: string;
  shardCost: number;
  /** Guaranteed minimum rarity for the pull this triggers. */
  guaranteedRarity: 'rare' | 'epic' | 'legendary';
}

export const SHARD_CRAFT_OPTIONS: ShardCraftOption[] = [
  { id: 'craft_rare',      label: 'Forge Rare Pull',      description: 'Guaranteed rare cosmetic.',      shardCost: 50,  guaranteedRarity: 'rare' },
  { id: 'craft_epic',      label: 'Forge Epic Pull',      description: 'Guaranteed epic cosmetic.',      shardCost: 150, guaranteedRarity: 'epic' },
  { id: 'craft_legendary', label: 'Forge Legendary Pull', description: 'Guaranteed legendary cosmetic.', shardCost: 300, guaranteedRarity: 'legendary' },
];

/** Gacha pool — only cosmetics whose source is 'gacha'. */
export const GACHA_POOL: Cosmetic[] = COSMETICS.filter((c) => c.source === 'gacha');
