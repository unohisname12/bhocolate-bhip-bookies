import type { BattleMove } from '../types/battle';
import type { EnemyIntentType } from '../types/battle';

export const SPECIES_MOVES: Record<string, BattleMove[]> = {
  koala_sprite: [
    { id: 'leaf_whip', name: 'Leaf Whip', type: 'attack', power: 60, accuracy: 95, cost: 10, description: 'Lash out with a flurry of swirling leaves.', effectId: 'slash' },
    { id: 'bubble_guard', name: 'Bubble Guard', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Form a protective bubble of energy.', effectId: 'shield' },
    { id: 'nature_heal', name: 'Nature Heal', type: 'heal', power: 30, accuracy: 100, cost: 15, description: 'Channel nature energy to restore HP.', effectId: 'absorb' },
    { id: 'tidal_splash', name: 'Tidal Splash', type: 'special', power: 120, accuracy: 80, cost: 22, description: 'Leap up and crash down with a wave of water!', effectId: 'slam' },
  ],
  slime_baby: [
    { id: 'slime_toss', name: 'Slime Toss', type: 'attack', power: 55, accuracy: 90, cost: 8, description: 'Throw a glob of slime.', effectId: 'splash' },
    { id: 'absorb', name: 'Absorb', type: 'heal', power: 25, accuracy: 100, cost: 12, description: 'Absorb enemy energy to heal.', effectId: 'absorb' },
    { id: 'harden', name: 'Harden', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Harden your body to resist damage.', effectId: 'shield' },
    { id: 'acid_splash', name: 'Acid Splash', type: 'special', power: 110, accuracy: 85, cost: 20, description: 'Splash corrosive acid on the foe.', effectId: 'splash' },
  ],
  mech_bot: [
    { id: 'laser', name: 'Laser Beam', type: 'attack', power: 70, accuracy: 90, cost: 12, description: 'Fire a precision laser.', effectId: 'zap' },
    { id: 'shield', name: 'Energy Shield', type: 'defend', power: 0, accuracy: 100, cost: 8, description: 'Deploy an energy shield.', effectId: 'shield' },
    { id: 'repair', name: 'Self Repair', type: 'heal', power: 40, accuracy: 100, cost: 15, description: 'Run repair protocols.', effectId: 'repair' },
    { id: 'overcharge', name: 'Overcharge', type: 'special', power: 130, accuracy: 75, cost: 25, description: 'Overcharge systems for a massive blast!', effectId: 'zap' },
  ],
  subtrak: [
    { id: 'null_strike', name: 'Null Strike', type: 'attack', power: 55, accuracy: 95, cost: 9, description: 'A precise strike that removes energy from the target.', effectId: 'slash' },
    { id: 'stabilize', name: 'Stabilize', type: 'defend', power: 0, accuracy: 100, cost: 6, description: 'Compress inward, reducing incoming damage.', effectId: 'shieldFlash' },
    { id: 'rebalance', name: 'Rebalance', type: 'heal', power: 35, accuracy: 100, cost: 14, description: 'Remove imbalance to restore HP.', effectId: 'absorb' },
    { id: 'void_drain', name: 'Void Drain', type: 'special', power: 100, accuracy: 85, cost: 20, description: 'Drain the opponent\'s power into the void.', effectId: 'critical' },
  ],
  default: [
    { id: 'tackle', name: 'Tackle', type: 'attack', power: 55, accuracy: 95, cost: 8, description: 'A basic tackle.', effectId: 'tackle' },
    { id: 'guard', name: 'Guard', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Take a defensive stance.', effectId: 'shield' },
    { id: 'rest', name: 'Rest', type: 'heal', power: 20, accuracy: 100, cost: 10, description: 'Rest to recover HP.', effectId: 'absorb' },
    { id: 'burst', name: 'Energy Burst', type: 'special', power: 90, accuracy: 80, cost: 18, description: 'Release pent-up energy.', effectId: 'burst' },
  ],
};

export const BATTLE_CONSTANTS = {
  maxTurns: 30,
  energyPerTurn: 4,          // passive regen (was 2, before that 10)
  energyOnHitTaken: 0,        // removed: Focus is primary recovery method
  focusEnergyGain: 12,       // focus action (was 15 — slightly tuned down)
  mathBonusEnergy: 8,        // math gives energy bonus
  defenseEnergyGain: 6,      // defend also restores energy
  baseHPMultiplier: 2.5,
  maxEnergy: 100,
  startingEnergy: 30,        // start with 30 instead of 100
  critChance: 0.08,          // 8% base crit
  critMultiplier: 1.5,
  comboPerStack: 0.05,       // +5% damage per combo stack
  comboMaxStacks: 8,         // cap combo at 8 stacks (1.4x max)
  comboFocusBonus: 2,        // focus grants +2 combo (was 3)
  defenseReduction: 0.5,     // defend halves incoming damage
  fleeBaseChance: 0.4,       // 40% base flee chance
  fleeSpeedBonus: 0.02,      // +2% per speed point above enemy
} as const;

/** Maps each move ID to an action bar category for sub-menus */
export const MOVE_CATEGORIES: Record<string, 'attack' | 'skill'> = {
  // koala_sprite
  leaf_whip: 'attack',
  bubble_guard: 'skill',
  nature_heal: 'skill',
  tidal_splash: 'attack',
  // slime_baby
  slime_toss: 'attack',
  absorb: 'skill',
  harden: 'skill',
  acid_splash: 'attack',
  // mech_bot
  laser: 'attack',
  shield: 'skill',
  repair: 'skill',
  overcharge: 'attack',
  // subtrak
  null_strike: 'attack',
  stabilize: 'skill',
  rebalance: 'skill',
  void_drain: 'attack',
  // default
  tackle: 'attack',
  guard: 'skill',
  rest: 'skill',
  burst: 'attack',
};

/** Display labels and icons for enemy intent types */
export const ENEMY_INTENT_LABELS: Record<EnemyIntentType, { label: string; icon: string }> = {
  ATTACK:       { label: 'Attack',       icon: '/assets/generated/final/effect_hit.png' },
  HEAVY_ATTACK: { label: 'Heavy Attack', icon: '/assets/generated/final/effect_fire.png' },
  DEFEND:       { label: 'Defend',       icon: '/assets/generated/final/effect_shield_flash.png' },
  BUFF:         { label: 'Power Up',     icon: '/assets/generated/final/icon_energy.png' },
  HEAL:         { label: 'Heal',         icon: '/assets/generated/final/effect_heal.png' },
};

export const ENEMY_SCALING = {
  levelVariance: 2,
  statMultiplier: 0.9,
} as const;

export const SPECIES_BASE_STATS: Record<string, { str: number; spd: number; def: number }> = {
  koala_sprite: { str: 11, spd: 10, def: 12 },
  slime_baby:   { str: 11, spd: 15, def: 8 },
  mech_bot:     { str: 14, spd: 9,  def: 16 },
};

export const STAGE_MULTIPLIERS: Record<string, number> = {
  baby: 1.0,
  juvenile: 1.3,
  adult: 1.8,
  elder: 2.4,
};

export const MOOD_HINT_MULTIPLIERS: Record<string, number> = {
  thriving: 1.1,
  okay: 1.0,
  struggling: 0.85,
};
