import type { EngineState } from '../../types/engine';
import type { Cosmetic, CosmeticRarity } from '../../types/cosmetic';
import {
  COSMETICS,
  GACHA_POOL,
  GACHA_PITY_EPIC,
  GACHA_PITY_RARE,
  GACHA_PULL_COST,
  GACHA_PULL_MP_COST,
  GACHA_WEIGHTS,
  SHARD_CRAFT_OPTIONS,
} from '../../config/cosmeticConfig';

/**
 * GachaSystem — "Mystery Egg" pull mechanic. Weighted rarity draw with
 * pity timers to prevent long no-rare streaks. Duplicate pulls convert
 * into shards (craft missing rares later).
 *
 * Deterministic if you pass your own `rand` — tests rely on this.
 */

export interface GachaPullResult {
  cosmetic: Cosmetic;
  isDuplicate: boolean;
  shardsAwarded: number;
}

const pickByRarity = (pool: Cosmetic[], rarity: CosmeticRarity): Cosmetic | null => {
  const bucket = pool.filter((c) => c.rarity === rarity);
  if (!bucket.length) return null;
  return bucket[Math.floor(Math.random() * bucket.length)];
};

const rollRarity = (rand: () => number): CosmeticRarity => {
  const total = Object.values(GACHA_WEIGHTS).reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (const [rarity, weight] of Object.entries(GACHA_WEIGHTS)) {
    r -= weight;
    if (r <= 0) return rarity as CosmeticRarity;
  }
  return 'common';
};

const RARITY_RANK: Record<CosmeticRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

/**
 * Execute a single Mystery Egg pull. Returns the new state + the result.
 * If the player can't afford it, returns the state unchanged + null result.
 *
 * Standard pull costs tokens + MP (math-gate #3). MP is consumed on top of
 * tokens so progress in cosmetics requires recent math training.
 */
export const gachaPull = (
  state: EngineState,
  rand: () => number = Math.random,
): { state: EngineState; result: GachaPullResult | null } => {
  if (state.player.currencies.tokens < GACHA_PULL_COST) {
    return { state, result: null };
  }
  if (state.player.currencies.mp < GACHA_PULL_MP_COST) {
    return { state, result: null };
  }
  if (!GACHA_POOL.length) return { state, result: null };

  // Pity logic: force a minimum rarity when the counter crosses.
  let rarity = rollRarity(rand);
  let pullsSinceRare = state.cosmetics.gachaPullsSinceRare;
  let pullsSinceEpic = state.cosmetics.gachaPullsSinceEpic;

  if (pullsSinceEpic + 1 >= GACHA_PITY_EPIC && rarity !== 'epic' && rarity !== 'legendary') {
    rarity = 'epic';
  } else if (pullsSinceRare + 1 >= GACHA_PITY_RARE && rarity === 'common') {
    rarity = 'rare';
  }

  // Pick a cosmetic of that rarity; if pool is empty, fall back down.
  let pick = pickByRarity(GACHA_POOL, rarity);
  if (!pick) pick = GACHA_POOL[Math.floor(rand() * GACHA_POOL.length)];

  // Update pity counters
  pullsSinceRare = (rarity === 'common') ? pullsSinceRare + 1 : 0;
  pullsSinceEpic = (rarity === 'common' || rarity === 'rare') ? pullsSinceEpic + 1 : 0;

  // Check duplicate
  const existing = state.cosmetics.owned.find((c) => c.cosmeticId === pick!.id);
  const isDuplicate = !!existing;
  const shardsAwarded = isDuplicate ? pick.shardValue : 0;

  const owned = isDuplicate
    ? state.cosmetics.owned.map((c) => c.cosmeticId === pick!.id ? { ...c, count: c.count + 1 } : c)
    : [...state.cosmetics.owned, { cosmeticId: pick.id, count: 1, firstObtainedAt: new Date().toISOString() }];

  const newState: EngineState = {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        tokens: state.player.currencies.tokens - GACHA_PULL_COST,
        mp: state.player.currencies.mp - GACHA_PULL_MP_COST,
        shards: state.player.currencies.shards + shardsAwarded,
      },
    },
    cosmetics: {
      ...state.cosmetics,
      owned,
      gachaPullsSinceRare: pullsSinceRare,
      gachaPullsSinceEpic: pullsSinceEpic,
    },
    notifications: [
      ...state.notifications,
      {
        id: `gacha_${pick.id}_${Date.now()}`,
        message: isDuplicate
          ? `Duplicate ${pick.name} → +${shardsAwarded} shards`
          : `New cosmetic: ${pick.name}!`,
        icon: pick.icon,
        timestamp: Date.now(),
      },
    ],
  };

  return {
    state: newState,
    result: { cosmetic: pick, isDuplicate, shardsAwarded },
  };
};

/**
 * Shard-powered guaranteed pull. Trades shards for a pull with a minimum
 * rarity floor. Never consumes tokens or MP — shards ARE the craft currency.
 */
export const gachaCraftWithShards = (
  state: EngineState,
  craftId: string,
  rand: () => number = Math.random,
): { state: EngineState; result: GachaPullResult | null } => {
  const option = SHARD_CRAFT_OPTIONS.find((o) => o.id === craftId);
  if (!option) return { state, result: null };
  if (state.player.currencies.shards < option.shardCost) return { state, result: null };
  if (!GACHA_POOL.length) return { state, result: null };

  // Roll rarity and floor it at the guaranteed rarity.
  let rarity = rollRarity(rand);
  if (RARITY_RANK[rarity] < RARITY_RANK[option.guaranteedRarity]) {
    rarity = option.guaranteedRarity;
  }

  let pick = pickByRarity(GACHA_POOL, rarity);
  // If no cosmetic of that rarity exists in pool, step down to the first rarity that has one at or above the floor.
  if (!pick) {
    for (const r of ['legendary', 'epic', 'rare', 'common'] as CosmeticRarity[]) {
      if (RARITY_RANK[r] < RARITY_RANK[option.guaranteedRarity]) break;
      const p = pickByRarity(GACHA_POOL, r);
      if (p) { pick = p; break; }
    }
  }
  if (!pick) return { state, result: null };

  const existing = state.cosmetics.owned.find((c) => c.cosmeticId === pick!.id);
  const isDuplicate = !!existing;
  const shardsAwarded = isDuplicate ? pick.shardValue : 0;

  const owned = isDuplicate
    ? state.cosmetics.owned.map((c) => c.cosmeticId === pick!.id ? { ...c, count: c.count + 1 } : c)
    : [...state.cosmetics.owned, { cosmeticId: pick.id, count: 1, firstObtainedAt: new Date().toISOString() }];

  const newState: EngineState = {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        shards: state.player.currencies.shards - option.shardCost + shardsAwarded,
      },
    },
    cosmetics: {
      ...state.cosmetics,
      owned,
    },
    notifications: [
      ...state.notifications,
      {
        id: `craft_${pick.id}_${Date.now()}`,
        message: isDuplicate
          ? `Forged duplicate ${pick.name} → +${shardsAwarded} shards`
          : `Forged ${pick.name}!`,
        icon: pick.icon,
        timestamp: Date.now(),
      },
    ],
  };

  return { state: newState, result: { cosmetic: pick, isDuplicate, shardsAwarded } };
};

/** Equip a cosmetic to the active pet's slot. Pass null id to unequip. */
export const equipCosmetic = (
  state: EngineState,
  petId: string,
  cosmeticId: string | null,
): EngineState => {
  const cosmetic = cosmeticId ? COSMETICS.find((c) => c.id === cosmeticId) : null;
  if (cosmeticId && !cosmetic) return state;
  // Require ownership
  if (cosmetic && !state.cosmetics.owned.some((c) => c.cosmeticId === cosmetic.id)) return state;

  const current = state.cosmetics.equipped[petId] ?? {};
  const slotKey = cosmetic?.slot ?? null;
  if (!slotKey && cosmeticId === null) return state;

  const updated = cosmetic
    ? { ...current, [cosmetic.slot]: cosmetic.id }
    : current;

  return {
    ...state,
    cosmetics: {
      ...state.cosmetics,
      equipped: { ...state.cosmetics.equipped, [petId]: updated },
    },
  };
};

export const unequipSlot = (
  state: EngineState,
  petId: string,
  slot: Cosmetic['slot'],
): EngineState => {
  const current = state.cosmetics.equipped[petId] ?? {};
  return {
    ...state,
    cosmetics: {
      ...state.cosmetics,
      equipped: {
        ...state.cosmetics.equipped,
        [petId]: { ...current, [slot]: null },
      },
    },
  };
};
