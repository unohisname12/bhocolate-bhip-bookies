import type { RunEnemyTemplate } from '../types/run';

// --- Tier 1: Introductory enemies ---

const TIER_1_ENEMIES: RunEnemyTemplate[] = [
  {
    id: 'shard_slime',
    name: 'Shard Slime',
    speciesId: 'slime_baby',
    behavior: 'aggressive',
    statScale: 0.80,
    hpScale: 0.85,
    description: 'Fragile but vicious.',
    tier: 1,
    passiveEffect: 'frenzy',
    passiveValue: 0.6,
    counterplayHint: 'Attacks in rapid bursts. Shield traces trigger often.',
  },
  {
    id: 'fractured_sprout',
    name: 'Fractured Sprout',
    speciesId: 'koala_sprite',
    behavior: 'defensive',
    statScale: 0.75,
    hpScale: 0.95,
    description: 'Mends what you break.',
    tier: 1,
    passiveEffect: 'regen',
    passiveValue: 0.05,
    counterplayHint: 'Regenerates each turn. End this fight quickly.',
  },
  {
    id: 'glitch_wisp',
    name: 'Glitch Wisp',
    speciesId: 'subtrak',
    behavior: 'aggressive',
    statScale: 0.85,
    hpScale: 0.90,
    description: 'Unpredictable. Even to itself.',
    tier: 1,
    passiveEffect: 'glitch',
    counterplayHint: 'Stats fluctuate wildly. Adapt turn by turn.',
  },
];

// --- Tier 2: Standard enemies ---

const TIER_2_ENEMIES: RunEnemyTemplate[] = [
  {
    id: 'voltage_remnant',
    name: 'Voltage Remnant',
    speciesId: 'mech_bot',
    behavior: 'aggressive',
    statScale: 0.90,
    hpScale: 0.95,
    description: 'Devours your energy.',
    tier: 2,
    passiveEffect: 'energy_drain',
    passiveValue: 3,
    counterplayHint: 'Drains your energy with each hit. Use Focus aggressively.',
  },
  {
    id: 'null_fragment',
    name: 'Null Fragment',
    speciesId: 'subtrak',
    behavior: 'defensive',
    statScale: 0.90,
    hpScale: 1.00,
    description: 'What you give, it returns.',
    tier: 2,
    passiveEffect: 'damage_reflect',
    passiveValue: 0.15,
    counterplayHint: 'Reflects damage. Favor healing moves and smaller attacks.',
  },
  {
    id: 'phase_crawler',
    name: 'Phase Crawler',
    speciesId: 'slime_baby',
    behavior: 'aggressive',
    statScale: 0.95,
    hpScale: 0.90,
    description: 'Vanishes between strikes.',
    tier: 2,
    passiveEffect: 'phase_shift',
    passiveValue: 0.3,
    counterplayHint: 'Sometimes phases out of existence. Persistence wins.',
  },
];

// --- Tier 3 / Elite enemies ---

const TIER_3_ENEMIES: RunEnemyTemplate[] = [
  {
    id: 'recursion_knight',
    name: 'Recursion Knight',
    speciesId: 'mech_bot',
    behavior: 'aggressive',
    statScale: 1.00,
    hpScale: 1.10,
    description: 'Each moment it survives, it grows.',
    tier: 3,
    passiveEffect: 'scaling',
    passiveValue: 0.08,
    counterplayHint: 'Gets stronger over time. End this fast or be overwhelmed.',
  },
  {
    id: 'entropy_shade',
    name: 'Entropy Shade',
    speciesId: 'subtrak',
    behavior: 'aggressive',
    statScale: 1.05,
    hpScale: 1.05,
    description: 'Punishes hesitation.',
    tier: 3,
    passiveEffect: 'entropy_punish',
    passiveValue: 0.3,
    counterplayHint: 'Punishes defensive play. Stay aggressive.',
  },
  {
    id: 'structural_anomaly',
    name: 'Structural Anomaly',
    speciesId: 'koala_sprite',
    behavior: 'defensive',
    statScale: 0.85,
    hpScale: 1.25,
    description: 'An endurance test.',
    tier: 3,
    passiveEffect: 'fortified',
    passiveValue: 0.25,
    counterplayHint: 'Extremely tough. A war of attrition.',
  },
];

// --- Bosses ---

const BOSS_ENEMIES: RunEnemyTemplate[] = [
  {
    id: 'void_subtrak',
    name: 'Void Subtrak',
    speciesId: 'subtrak',
    behavior: 'boss',
    statScale: 1.25,
    hpScale: 1.40,
    description: 'A creature from the void. End this quickly.',
    tier: 'boss',
    passiveEffect: 'void_pulse',
    passiveValue: 0.08,
    counterplayHint: 'VOID PULSE — Unavoidable damage every 3 turns.',
  },
  {
    id: 'fracture_core',
    name: 'Fracture Core',
    speciesId: 'mech_bot',
    behavior: 'boss',
    statScale: 1.20,
    hpScale: 1.50,
    description: 'A wound in reality that fights back.',
    tier: 'boss',
    passiveEffect: 'fracture_shell',
    passiveValue: 0.40,
    counterplayHint: 'PHASE SHIFT — Weakens when damaged, but becomes deadly.',
  },
  {
    id: 'the_unsolved',
    name: 'The Unsolved',
    speciesId: 'koala_sprite',
    behavior: 'boss',
    statScale: 1.15,
    hpScale: 1.35,
    description: 'The deepest fracture. It speaks in equations.',
    tier: 'boss',
    passiveEffect: 'equation_storm',
    counterplayHint: 'EQUATION STORM — Constant trace events. Your accuracy IS your defense.',
  },
];

// --- All enemies ---

export const RUN_ENEMIES_V2 = {
  tier1: TIER_1_ENEMIES,
  tier2: TIER_2_ENEMIES,
  tier3: TIER_3_ENEMIES,
  bosses: BOSS_ENEMIES,
};

/** Pick a random enemy from a tier using a seed-derived index. */
export const getEnemyForTier = (tier: 1 | 2 | 3, index: number): RunEnemyTemplate => {
  const pool = tier === 1 ? TIER_1_ENEMIES : tier === 2 ? TIER_2_ENEMIES : TIER_3_ENEMIES;
  return pool[index % pool.length];
};

/** Pick a random boss using a seed-derived index. */
export const getBossEnemy = (index: number): RunEnemyTemplate => {
  return BOSS_ENEMIES[index % BOSS_ENEMIES.length];
};

/** Look up any enemy by ID across all pools. */
export const getEnemyById = (id: string): RunEnemyTemplate | undefined => {
  const all = [...TIER_1_ENEMIES, ...TIER_2_ENEMIES, ...TIER_3_ENEMIES, ...BOSS_ENEMIES];
  return all.find(e => e.id === id);
};
