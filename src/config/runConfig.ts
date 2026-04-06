import type { RunEnemyTemplate, RunRewardOption, FractureModifier, FractureModifierId } from '../types/run';

// Re-export from split config files for backward compatibility
export { getEnemyForTier, getBossEnemy, getEnemyById, RUN_ENEMIES_V2 } from './runEnemyConfig';
export { generateRewardChoices, getRewardById, ALL_REWARDS } from './runRewardConfig';

// --- Constants ---

export const RUN_LENGTH = 4; // 3 tiers + 1 boss (kept for backward compat with V1 screens)

// --- V1 backward compatibility ---
// These are still used by existing V1 screens until they're migrated to V2 map system.

export const RUN_ENEMIES: RunEnemyTemplate[] = [
  {
    id: 'wild_slime', name: 'Wild Slime', speciesId: 'slime_baby',
    behavior: 'aggressive', statScale: 0.85, hpScale: 0.9,
    description: 'A feral slime — attacks relentlessly.',
    tier: 1,
  },
  {
    id: 'guard_koala', name: 'Guardian Koala', speciesId: 'koala_sprite',
    behavior: 'defensive', statScale: 0.9, hpScale: 1.0,
    description: 'A stoic guardian — heals and defends patiently.',
    tier: 2,
  },
  {
    id: 'rogue_mech', name: 'Rogue Mech', speciesId: 'mech_bot',
    behavior: 'aggressive', statScale: 0.95, hpScale: 0.95,
    description: 'A haywire robot — powerful but reckless.',
    tier: 3,
  },
  {
    id: 'void_subtrak', name: 'Void Subtrak', speciesId: 'subtrak',
    behavior: 'boss', statScale: 1.3, hpScale: 1.4,
    description: 'A creature from the void — end this quickly.',
    tier: 'boss',
    passiveEffect: 'void_pulse',
    passiveValue: 0.08,
    counterplayHint: 'VOID PULSE — Unavoidable damage every 3 turns.',
  },
];

export const getEnemyForEncounter = (encounter: number): RunEnemyTemplate => {
  if (encounter >= 3) return RUN_ENEMIES[3];
  return RUN_ENEMIES[encounter % 3];
};

export const RUN_REWARD_POOL: RunRewardOption[][] = [
  [
    { id: 'energy_5', category: 'energy', name: '+5 Max Energy', description: 'Increase max energy by 5.', icon: '/assets/generated/final/icon_energy.png', tier: 'common' },
    { id: 'stat_3', category: 'stat', name: '+3 STR/DEF', description: 'Boost strength and defense by 3.', icon: '/assets/generated/final/effect_hit.png', tier: 'common' },
  ],
  [
    { id: 'energy_8', category: 'energy', name: '+8 Max Energy', description: 'Increase max energy by 8.', icon: '/assets/generated/final/icon_energy.png', tier: 'rare' },
    { id: 'lifesteal', category: 'utility', name: 'Lifesteal', description: 'Heal 15% of damage dealt.', icon: '/assets/generated/final/effect_heal.png', tier: 'rare' },
  ],
  [
    { id: 'stat_5', category: 'stat', name: '+5 STR/DEF', description: 'Boost strength and defense by 5.', icon: '/assets/generated/final/effect_hit.png', tier: 'rare' },
    { id: 'shield_start', category: 'utility', name: 'Shield Start', description: 'Start each battle with a defense buff.', icon: '/assets/generated/final/effect_shield_flash.png', tier: 'rare' },
  ],
];

export const getRewardsForEncounter = (encounter: number): RunRewardOption[] => {
  return RUN_REWARD_POOL[encounter] ?? RUN_REWARD_POOL[0];
};

// --- Fracture Modifiers ---

export const FRACTURE_MODIFIERS: Record<FractureModifierId, FractureModifier> = {
  volatile: { id: 'volatile', name: 'Volatile Fracture', description: 'Enemies are fragile but fierce. -15% HP, +20% STR.' },
  resilient: { id: 'resilient', name: 'Resilient Fracture', description: 'Enemies endure longer. +20% HP, -10% STR.' },
  resonant: { id: 'resonant', name: 'Resonant Fracture', description: 'Trace tiers are boosted by one level.' },
  draining: { id: 'draining', name: 'Draining Fracture', description: 'Lose 2 energy at the start of each battle turn.' },
  generous: { id: 'generous', name: 'Generous Fracture', description: 'Reward picks offer 3 choices instead of 2.' },
  unstable: { id: 'unstable', name: 'Unstable Fracture', description: 'Instability starts at 2. Rest is critical.' },
};

export const FRACTURE_MODIFIER_IDS: FractureModifierId[] = [
  'volatile', 'resilient', 'resonant', 'draining', 'generous', 'unstable',
];

// --- Balance Config ---

export const RUN_BALANCE = {
  // Rest
  REST_SAFE_HEAL: 0.20,
  STABILIZE_TIERS: { miss: 0.10, basic: 0.20, good: 0.30, perfect: 0.40 },

  // Instability
  INSTABILITY_THRESHOLD_MILD: 3,
  INSTABILITY_THRESHOLD_SEVERE: 5,
  INSTABILITY_STR_MILD: 0.05,
  INSTABILITY_STR_SEVERE: 0.10,
  INSTABILITY_TRACE_PENALTY: 0.90,

  // Boss: Void Subtrak
  VOID_PULSE_INTERVAL: 3,
  VOID_PULSE_DAMAGE: 0.08,

  // Boss: Fracture Core
  FRACTURE_CORE_PHASE_THRESHOLD: 0.50,
  FRACTURE_CORE_SHELL_REDUCTION: 0.40,
  FRACTURE_CORE_ENRAGE_MULTIPLIER: 1.30,
  FRACTURE_CORE_BLEED: 0.03,

  // Fracture modifiers
  VOLATILE_HP_MULT: 0.85,
  VOLATILE_STR_MULT: 1.20,
  RESILIENT_HP_MULT: 1.20,
  RESILIENT_STR_MULT: 0.90,
  DRAINING_ENERGY_LOSS: 2,
};
