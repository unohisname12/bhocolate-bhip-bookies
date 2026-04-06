import type { EngineState } from '../../types/engine';
import type { ActiveBattleState } from '../../types/battle';
import type { ActiveRunState, EnemyPassiveEffect } from '../../types/run';
import { getEnemyById } from '../../config/runEnemyConfig';
import { RUN_BALANCE } from '../../config/runConfig';

/**
 * Get the current run enemy's passive effect, if any.
 */
function getActivePassive(run: ActiveRunState): { effect: EnemyPassiveEffect; value: number } | null {
  if (!run.currentEnemyId) return null;
  const template = getEnemyById(run.currentEnemyId);
  if (!template?.passiveEffect) return null;
  return { effect: template.passiveEffect, value: template.passiveValue ?? 0 };
}

/**
 * Apply post-player-attack effects (called after player deals damage).
 * Handles: damage_reflect, energy_drain (on enemy counterattack is handled separately),
 * phase_shift (dodge chance), echo_strike counter, fortified damage reduction.
 */
export function applyPostPlayerAttack(state: EngineState, damageDealt: number): EngineState {
  if (!state.run.active || state.run.phase !== 'in_battle') return state;
  if (!state.battle.active) return state;

  const passive = getActivePassive(state.run);
  if (!passive) return state;
  let battle = state.battle;

  // Damage reflect: player takes a fraction of damage dealt back
  if (passive.effect === 'damage_reflect') {
    const reflectDmg = Math.max(1, Math.floor(damageDealt * passive.value));
    const newHP = Math.max(0, battle.playerPet.currentHP - reflectDmg);
    battle = {
      ...battle,
      playerPet: { ...battle.playerPet, currentHP: newHP },
      log: [...battle.log, {
        turn: battle.turnCount,
        actor: 'enemy',
        action: 'passive',
        damage: reflectDmg,
        message: `Structural Mirror reflects ${reflectDmg} damage!`,
      }],
    };
  }

  // Glass cannon incoming damage increase is handled in the damage calc directly

  // Thorns from player bonuses (player has thorns, enemy takes reflected damage)
  if (state.run.bonuses.thornsFraction > 0 && damageDealt > 0) {
    const thornsDmg = Math.max(1, Math.floor(damageDealt * state.run.bonuses.thornsFraction));
    const newEnemyHP = Math.max(0, battle.enemyPet.currentHP - thornsDmg);
    battle = {
      ...battle,
      enemyPet: { ...battle.enemyPet, currentHP: newEnemyHP },
    };
  }

  return { ...state, battle };
}

/**
 * Apply post-enemy-attack effects (called after enemy deals damage).
 * Handles: energy_drain, adaptive_shield.
 */
export function applyPostEnemyAttack(state: EngineState, damageDealt: number): EngineState {
  if (!state.run.active || state.run.phase !== 'in_battle') return state;
  if (!state.battle.active) return state;

  const passive = getActivePassive(state.run);
  let battle = state.battle;
  let run = state.run;

  // Energy drain: reduce player energy after enemy attack
  if (passive?.effect === 'energy_drain') {
    const drainAmount = passive.value;
    const newEnergy = Math.max(0, battle.playerPet.energy - drainAmount);
    battle = {
      ...battle,
      playerPet: { ...battle.playerPet, energy: newEnergy },
      log: [...battle.log, {
        turn: battle.turnCount,
        actor: 'enemy',
        action: 'passive',
        message: `Energy Siphon drains ${drainAmount} energy!`,
      }],
    };
  }

  // Adaptive shield: first big hit is auto-reduced (one-shot per battle)
  if (run.bonuses.adaptiveShieldUsed === false && damageDealt > battle.playerPet.maxHP * 0.20) {
    // This should ideally be applied BEFORE damage, but since we process post-attack,
    // we'll restore a portion of the damage as a heal
    const reduction = Math.floor(damageDealt * 0.30);
    const newHP = Math.min(battle.playerPet.maxHP, battle.playerPet.currentHP + reduction);
    battle = {
      ...battle,
      playerPet: { ...battle.playerPet, currentHP: newHP },
      log: [...battle.log, {
        turn: battle.turnCount,
        actor: 'player',
        action: 'passive',
        message: `Reflex Barrier absorbs ${reduction} damage!`,
      }],
    };
    run = { ...run, bonuses: { ...run.bonuses, adaptiveShieldUsed: true } };
  }

  // Glass cannon: player takes +15% more damage
  if (run.bonuses.glassCannon && damageDealt > 0) {
    const extraDmg = Math.max(1, Math.floor(damageDealt * 0.15));
    const newHP = Math.max(0, battle.playerPet.currentHP - extraDmg);
    battle = {
      ...battle,
      playerPet: { ...battle.playerPet, currentHP: newHP },
    };
  }

  return { ...state, battle, run };
}

/**
 * Apply start-of-turn effects (called at the start of each turn).
 * Handles: scaling, regen, frenzy (handled in attack), glitch, overcharge HP drain,
 * player regen-per-turn, energy regen bonus, void_pulse, fracture_shell, instability pulse.
 */
export function applyTurnStartEffects(state: EngineState): EngineState {
  if (!state.run.active || state.run.phase !== 'in_battle') return state;
  if (!state.battle.active) return state;

  const passive = getActivePassive(state.run);
  let battle = state.battle;
  let run = state.run;

  // --- Enemy passives ---

  // Scaling: enemy gains STR over time
  if (passive?.effect === 'scaling' && battle.turnCount > 0 && battle.turnCount % 2 === 0) {
    const strBoost = Math.max(1, Math.floor(battle.enemyPet.strength * passive.value));
    battle = {
      ...battle,
      enemyPet: { ...battle.enemyPet, strength: battle.enemyPet.strength + strBoost },
      log: [...battle.log, {
        turn: battle.turnCount,
        actor: 'enemy',
        action: 'passive',
        message: `Recursive Growth! Enemy strength increases.`,
      }],
    };
  }

  // Regen: enemy heals each turn
  if (passive?.effect === 'regen') {
    const healAmount = Math.max(1, Math.floor(battle.enemyPet.maxHP * passive.value));
    const newHP = Math.min(battle.enemyPet.maxHP, battle.enemyPet.currentHP + healAmount);
    battle = {
      ...battle,
      enemyPet: { ...battle.enemyPet, currentHP: newHP },
    };
  }

  // Glitch: randomize one stat up and one stat down
  if (passive?.effect === 'glitch') {
    const stats = ['strength', 'defense', 'speed'] as const;
    const turnSeed = battle.turnCount * 7 + 13;
    const upIdx = turnSeed % 3;
    const downIdx = (turnSeed + 1) % 3;
    if (upIdx !== downIdx) {
      const enemy = { ...battle.enemyPet };
      enemy[stats[upIdx]] = Math.floor(enemy[stats[upIdx]] * 1.2);
      enemy[stats[downIdx]] = Math.max(1, Math.floor(enemy[stats[downIdx]] * 0.8));
      battle = { ...battle, enemyPet: enemy };
    }
  }

  // Void Pulse: unavoidable damage every N turns
  if (passive?.effect === 'void_pulse') {
    const bossState = { ...run.bossState };
    const turnsSince = (bossState.turnsSinceLastPulse ?? 0) + 1;
    if (turnsSince >= RUN_BALANCE.VOID_PULSE_INTERVAL) {
      const pulseDmg = Math.max(1, Math.floor(battle.playerPet.maxHP * RUN_BALANCE.VOID_PULSE_DAMAGE));
      const newHP = Math.max(0, battle.playerPet.currentHP - pulseDmg);
      battle = {
        ...battle,
        playerPet: { ...battle.playerPet, currentHP: newHP },
        log: [...battle.log, {
          turn: battle.turnCount,
          actor: 'enemy',
          action: 'passive',
          damage: pulseDmg,
          message: `Void Pulse! ${pulseDmg} unavoidable damage.`,
        }],
      };
      bossState.turnsSinceLastPulse = 0;
    } else {
      bossState.turnsSinceLastPulse = turnsSince;
    }
    run = { ...run, bossState };
  }

  // Fracture shell: phase transition at 50% HP
  if (passive?.effect === 'fracture_shell') {
    const hpFraction = battle.enemyPet.currentHP / battle.enemyPet.maxHP;
    const bossState = { ...run.bossState };
    if (hpFraction <= RUN_BALANCE.FRACTURE_CORE_PHASE_THRESHOLD && !bossState.phaseShifted) {
      bossState.phaseShifted = true;
      // Phase 2: boost enemy attack, apply bleed
      const newStr = Math.floor(battle.enemyPet.strength * RUN_BALANCE.FRACTURE_CORE_ENRAGE_MULTIPLIER);
      battle = {
        ...battle,
        enemyPet: { ...battle.enemyPet, strength: newStr },
        log: [...battle.log, {
          turn: battle.turnCount,
          actor: 'enemy',
          action: 'passive',
          message: 'The shell breaks! Fracture Core enters Phase 2!',
        }],
      };
      run = { ...run, bossState };
    }
    // Phase 2 bleed
    if (bossState.phaseShifted) {
      const bleedDmg = Math.max(1, Math.floor(battle.playerPet.maxHP * RUN_BALANCE.FRACTURE_CORE_BLEED));
      const newHP = Math.max(0, battle.playerPet.currentHP - bleedDmg);
      battle = {
        ...battle,
        playerPet: { ...battle.playerPet, currentHP: newHP },
      };
    }
  }

  // --- Player bonuses ---

  // Player regen per turn
  if (run.bonuses.regenPerTurn > 0) {
    const healAmount = Math.max(1, Math.floor(battle.playerPet.maxHP * run.bonuses.regenPerTurn));
    const newHP = Math.min(battle.playerPet.maxHP, battle.playerPet.currentHP + healAmount);
    battle = { ...battle, playerPet: { ...battle.playerPet, currentHP: newHP } };
  }

  // Player energy regen bonus
  if (run.bonuses.energyRegenBonus > 0) {
    const newEnergy = Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + run.bonuses.energyRegenBonus);
    battle = { ...battle, playerPet: { ...battle.playerPet, energy: newEnergy } };
  }

  // Overcharge: lose 2% HP per turn
  if (run.bonuses.overchargeActive) {
    const drain = Math.max(1, Math.floor(battle.playerPet.maxHP * 0.02));
    const newHP = Math.max(1, battle.playerPet.currentHP - drain);
    battle = { ...battle, playerPet: { ...battle.playerPet, currentHP: newHP } };
  }

  // Draining fracture: lose energy at turn start
  if (run.fractureModifier === 'draining') {
    const newEnergy = Math.max(0, battle.playerPet.energy - RUN_BALANCE.DRAINING_ENERGY_LOSS);
    battle = { ...battle, playerPet: { ...battle.playerPet, energy: newEnergy } };
  }

  return { ...state, battle, run };
}

/**
 * Apply fortified damage reduction (called when player attacks a fortified enemy).
 * Returns the modified damage amount.
 */
export function applyFortifiedReduction(state: EngineState, damage: number): number {
  if (!state.run.active || state.run.phase !== 'in_battle') return damage;
  const passive = getActivePassive(state.run);
  if (passive?.effect === 'fortified') {
    return Math.max(1, Math.floor(damage * (1 - passive.value)));
  }
  // Fracture shell phase 1: reduced damage
  if (passive?.effect === 'fracture_shell') {
    const bossState = state.run.bossState;
    if (!bossState.phaseShifted) {
      return Math.max(1, Math.floor(damage * (1 - RUN_BALANCE.FRACTURE_CORE_SHELL_REDUCTION)));
    }
  }
  return damage;
}

/**
 * Check if phase_shift triggers (enemy dodges).
 * Returns true if the attack should miss.
 */
export function checkPhaseShift(state: EngineState): boolean {
  if (!state.run.active || state.run.phase !== 'in_battle') return false;
  const passive = getActivePassive(state.run);
  if (passive?.effect === 'phase_shift') {
    // Use turn count as pseudo-random source
    const battle = state.battle;
    if (!battle.active) return false;
    const roll = ((battle.turnCount * 17 + 31) % 100) / 100;
    return roll < passive.value;
  }
  return false;
}
