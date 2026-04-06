import type { RunRewardOption } from '../types/run';

const F = '/assets/generated/final';

// --- Common rewards ---

const COMMON_REWARDS: RunRewardOption[] = [
  {
    id: 'energy_5',
    category: 'energy',
    name: 'Equation Shard',
    description: '+5 max energy.',
    icon: `${F}/icon_energy.png`,
    tier: 'common',
  },
  {
    id: 'stat_3',
    category: 'stat',
    name: 'Structural Fragment',
    description: '+3 STR and +3 DEF.',
    icon: `${F}/effect_hit.png`,
    tier: 'common',
  },
  {
    id: 'recovery_15',
    category: 'recovery',
    name: 'Mending Pulse',
    description: 'Immediately heal 15% HP.',
    icon: `${F}/effect_heal.png`,
    tier: 'common',
  },
];

// --- Rare rewards ---

const RARE_REWARDS: RunRewardOption[] = [
  {
    id: 'energy_8',
    category: 'energy',
    name: 'Resonance Core',
    description: '+8 max energy.',
    icon: `${F}/icon_energy.png`,
    tier: 'rare',
  },
  {
    id: 'stat_5',
    category: 'stat',
    name: 'Hardened Fragment',
    description: '+5 STR and +5 DEF.',
    icon: `${F}/effect_hit.png`,
    tier: 'rare',
  },
  {
    id: 'lifesteal',
    category: 'utility',
    name: 'Siphon Link',
    description: 'Heal 15% of damage dealt each attack.',
    icon: `${F}/effect_heal.png`,
    tier: 'rare',
  },
  {
    id: 'shield_start',
    category: 'utility',
    name: 'Pre-emptive Guard',
    description: 'Start each battle with a 1-turn 1.5x DEF buff.',
    icon: `${F}/effect_shield_flash.png`,
    tier: 'rare',
  },
  {
    id: 'focus_mastery',
    category: 'utility',
    name: "Channeler's Focus",
    description: 'Focus grants +15 energy and buffs next attack +15%.',
    icon: `${F}/icon_energy.png`,
    tier: 'rare',
  },
  {
    id: 'trace_focus',
    category: 'trace',
    name: 'Equation Clarity',
    description: 'Trace hit radius +25% for rest of run.',
    icon: `${F}/effect_energy_burst.png`,
    tier: 'rare',
  },
];

// --- Elite rewards ---

const ELITE_REWARDS: RunRewardOption[] = [
  {
    id: 'glass_cannon',
    category: 'keystone',
    name: "Fracture's Edge",
    description: '+30% damage dealt, +15% damage taken.',
    icon: `${F}/effect_hit.png`,
    tier: 'elite',
  },
  {
    id: 'echo_strike',
    category: 'keystone',
    name: 'Recursive Blow',
    description: 'Every 3rd attack deals 1.5x damage.',
    icon: `${F}/effect_hit.png`,
    tier: 'elite',
  },
  {
    id: 'fracture_drain',
    category: 'keystone',
    name: 'Structural Siphon',
    description: 'Heal 8% of max HP when you win a battle.',
    icon: `${F}/effect_heal.png`,
    tier: 'elite',
  },
  {
    id: 'adaptive_shield',
    category: 'utility',
    name: 'Reflex Barrier',
    description: 'First big hit each battle is auto-reduced by 30%.',
    icon: `${F}/effect_shield_flash.png`,
    tier: 'elite',
  },
  {
    id: 'energy_regen',
    category: 'energy',
    name: 'Constant Flow',
    description: '+2 energy per turn.',
    icon: `${F}/icon_energy.png`,
    tier: 'elite',
  },
  {
    id: 'combo_surge',
    category: 'utility',
    name: 'Momentum Cascade',
    description: 'Combo multiplier gains +50% faster.',
    icon: `${F}/effect_energy_burst.png`,
    tier: 'elite',
  },
  {
    id: 'recovery_25',
    category: 'recovery',
    name: 'Deep Mend',
    description: 'Immediately heal 25% HP.',
    icon: `${F}/effect_heal.png`,
    tier: 'elite',
  },
  {
    id: 'desperate_power',
    category: 'keystone',
    name: 'Fracture Resonance',
    description: 'Gain bonus STR based on missing HP. Lower HP = stronger.',
    icon: `${F}/effect_energy_burst.png`,
    tier: 'elite',
  },
  {
    id: 'overcharge',
    category: 'keystone',
    name: 'Volatile Core',
    description: 'Max energy +20, but lose 2% max HP per turn in combat.',
    icon: `${F}/icon_energy.png`,
    tier: 'elite',
  },
];

// --- All rewards ---

export const ALL_REWARDS = [...COMMON_REWARDS, ...RARE_REWARDS, ...ELITE_REWARDS];

export const getRewardById = (id: string): RunRewardOption | undefined =>
  ALL_REWARDS.find(r => r.id === id);

/** Simple seeded random number generator (Mulberry32). */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate reward choices for a given reward tier.
 * Returns `count` rewards from the appropriate pools, avoiding already-chosen rewards.
 */
export const generateRewardChoices = (
  rewardTier: 'common' | 'rare' | 'elite',
  count: number,
  alreadyChosen: string[],
  seed: number,
  generous: boolean = false,
): RunRewardOption[] => {
  const rng = seededRandom(seed);
  const actualCount = generous ? count + 1 : count;

  let pool: RunRewardOption[];
  if (rewardTier === 'common') {
    pool = [...COMMON_REWARDS, ...RARE_REWARDS];
  } else if (rewardTier === 'rare') {
    pool = [...RARE_REWARDS, ...ELITE_REWARDS];
  } else {
    pool = [...ELITE_REWARDS];
  }

  // Filter out already-chosen rewards
  pool = pool.filter(r => !alreadyChosen.includes(r.id));

  // Shuffle with seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(actualCount, pool.length));
};
