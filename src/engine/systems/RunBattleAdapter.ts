import type { Pet } from '../../types';
import type { BattlePet } from '../../types/battle';
import type { RunBonuses, RunEnemyTemplate, FractureModifierId } from '../../types/run';
import { petToBattlePet, speciesIdToBattlePet } from './BattleSystem';
import { RUN_BALANCE } from '../../config/runConfig';

/**
 * Build a run-modified player BattlePet.
 * Applies run bonuses, fracture modifier, and instability on top of the standard petToBattlePet conversion.
 */
export const buildRunPlayerPet = (
  pet: Pet,
  bonuses: RunBonuses,
  hpPercent: number,
  fractureModifier?: FractureModifierId,
  _instability?: number,
): BattlePet => {
  const base = petToBattlePet(pet);

  let maxEnergy = base.maxEnergy + bonuses.maxEnergyBonus;
  let startEnergy = base.energy + bonuses.nextFightEnergyBonus;
  let strength = base.strength + bonuses.statBonus;
  let defense = base.defense + bonuses.statBonus;
  const currentHP = Math.max(1, Math.floor(base.maxHP * Math.min(1, hpPercent)));

  // Desperate power: bonus STR based on missing HP
  if (bonuses.desperatePower) {
    const missingHpPercent = 1 - Math.min(1, hpPercent);
    strength += Math.floor(missingHpPercent * 100 / 5);
  }

  // Glass cannon: +30% STR, -15% DEF (applied to incoming damage in reducer)
  if (bonuses.glassCannon) {
    strength = Math.floor(strength * 1.30);
  }

  // Draining fracture: reduce starting energy
  if (fractureModifier === 'draining') {
    startEnergy = Math.max(0, startEnergy - RUN_BALANCE.DRAINING_ENERGY_LOSS);
  }

  const buffs = [...base.buffs];

  // Shield start
  if (bonuses.utilityEffects.includes('shield_start')) {
    buffs.push({ stat: 'defense', multiplier: 1.5, turnsRemaining: 1 });
  }

  // Fortify rest buff
  if (bonuses.nextFightDefenseBuff > 0) {
    buffs.push({ stat: 'defense', multiplier: 1.5, turnsRemaining: bonuses.nextFightDefenseBuff });
  }

  return {
    ...base,
    maxEnergy,
    energy: Math.min(startEnergy, maxEnergy),
    strength,
    defense,
    currentHP,
    buffs,
  };
};

/**
 * Build a run enemy BattlePet from a template.
 * Behavior is expressed through stat distribution, not AI changes.
 * Fracture modifiers and instability applied as multipliers.
 */
export const buildRunEnemy = (
  template: RunEnemyTemplate,
  playerLevel: number,
  fractureModifier?: FractureModifierId,
  instability?: number,
): BattlePet => {
  const base = speciesIdToBattlePet(template.speciesId, playerLevel);

  // Apply template scaling
  let strength = Math.max(1, Math.floor(base.strength * template.statScale));
  let speed = Math.max(1, Math.floor(base.speed * template.statScale));
  let defense = Math.max(1, Math.floor(base.defense * template.statScale));
  let maxHP = Math.max(1, Math.floor(base.maxHP * template.hpScale));

  // Behavior-based stat tweaks (baked into stats, no AI changes)
  if (template.behavior === 'aggressive') {
    strength = Math.floor(strength * 1.15);
    defense = Math.floor(defense * 0.9);
  } else if (template.behavior === 'defensive') {
    defense = Math.floor(defense * 1.15);
    strength = Math.floor(strength * 0.9);
  }

  // Fracture modifier adjustments
  if (fractureModifier === 'volatile') {
    maxHP = Math.max(1, Math.floor(maxHP * RUN_BALANCE.VOLATILE_HP_MULT));
    strength = Math.max(1, Math.floor(strength * RUN_BALANCE.VOLATILE_STR_MULT));
  } else if (fractureModifier === 'resilient') {
    maxHP = Math.max(1, Math.floor(maxHP * RUN_BALANCE.RESILIENT_HP_MULT));
    strength = Math.max(1, Math.floor(strength * RUN_BALANCE.RESILIENT_STR_MULT));
  }

  // Instability: boost enemy STR
  const inst = instability ?? 0;
  if (inst >= RUN_BALANCE.INSTABILITY_THRESHOLD_SEVERE) {
    strength = Math.max(1, Math.floor(strength * (1 + RUN_BALANCE.INSTABILITY_STR_SEVERE)));
  } else if (inst >= RUN_BALANCE.INSTABILITY_THRESHOLD_MILD) {
    strength = Math.max(1, Math.floor(strength * (1 + RUN_BALANCE.INSTABILITY_STR_MILD)));
  }

  // Fortified enemies take reduced damage — expressed by boosting their defense
  // (actual 25% reduction is handled in reducer, but we also bump their visual DEF)
  if (template.passiveEffect === 'fortified') {
    defense = Math.floor(defense * 1.2);
  }

  return {
    ...base,
    petId: `run_enemy_${template.id}_${Date.now()}`,
    name: template.name,
    strength,
    speed,
    defense,
    maxHP,
    currentHP: maxHP,
  };
};
