import type { Pet } from '../../types';
import type {
  ActiveBattleState,
  BattlePet,
  BattleMove,
  BattleRewards,
  ComboState,
} from '../../types/battle';
import type { ClassmateProfile } from '../../types/classroom';
import { SPECIES_MOVES, BATTLE_CONSTANTS, ENEMY_SCALING, SPECIES_BASE_STATS, STAGE_MULTIPLIERS, MOOD_HINT_MULTIPLIERS } from '../../config/battleConfig';
import { SPECIES_CONFIG } from '../../config/speciesConfig';
import { TRACE_TIER_MULTIPLIERS } from '../../config/traceConfig';
import { selectEnemyMove, selectEnemyIntent } from './BattleAI';
import type { TraceBuffState } from '../../types/trace';

const INITIAL_TRACE_BUFFS: TraceBuffState = {
  shieldTier: null,
  runeBoostTier: null,
  mathTraceTier: null,
};

const INITIAL_COMBO: ComboState = { count: 0, multiplier: 1.0, lastAction: '' };

const clampHP = (hp: number) => Math.max(0, hp);

/** Returns a 0–100 readiness score based on pet needs. Used by UI and battle init. */
export const getPetReadiness = (pet: import('../../types').Pet): number => {
  const avg = (pet.needs.hunger + pet.needs.happiness + pet.needs.health) / 3;
  return Math.round(avg);
};

const getMoves = (speciesId: string): BattleMove[] =>
  SPECIES_MOVES[speciesId] ?? SPECIES_MOVES.default;

export const petToBattlePet = (pet: Pet, needModifiers = true): BattlePet => {
  let strengthMod = 1.0;
  let speedMod = 1.0;
  let hpMod = 1.0;

  if (needModifiers) {
    if (pet.needs.hunger < 30) strengthMod *= 0.7;
    if (pet.needs.happiness < 30) speedMod *= 0.7;
    if (pet.needs.health < 50) hpMod *= 0.8;
    if (pet.needs.happiness > 80) { strengthMod *= 1.1; speedMod *= 1.1; }
  }

  const maxHP = Math.max(1, Math.floor(pet.needs.health * BATTLE_CONSTANTS.baseHPMultiplier * hpMod));

  return {
    petId: pet.id,
    name: pet.name,
    speciesId: pet.speciesId,
    level: pet.progression.level,
    maxHP,
    currentHP: maxHP,
    energy: BATTLE_CONSTANTS.startingEnergy,
    maxEnergy: BATTLE_CONSTANTS.maxEnergy,
    strength: Math.max(10, Math.floor(pet.stats.strength * strengthMod * (1 + pet.progression.level * 0.15))),
    speed: Math.max(10, Math.floor(pet.stats.speed * speedMod * (1 + pet.progression.level * 0.15))),
    defense: Math.max(8, Math.floor(pet.stats.defense * (1 + pet.progression.level * 0.12))),
    moves: getMoves(pet.speciesId),
    buffs: [],
  };
};

const generateEnemyPet = (playerLevel: number): BattlePet => {
  const level = Math.max(1, playerLevel + Math.floor((Math.random() - 0.5) * ENEMY_SCALING.levelVariance * 2));
  const speciesIds = ['slime_baby', 'mech_bot', 'koala_sprite'];
  const speciesId = speciesIds[Math.floor(Math.random() * speciesIds.length)];

  // Use species base stats + level scaling (same approach as PvP)
  const speciesBase = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  const levelScale = 1 + level * 0.15;
  const str = Math.floor(speciesBase.str * levelScale * ENEMY_SCALING.statMultiplier);
  const spd = Math.floor(speciesBase.spd * levelScale * ENEMY_SCALING.statMultiplier);
  const def = Math.floor(speciesBase.def * levelScale * ENEMY_SCALING.statMultiplier);

  // HP uses same formula as player: base health value * multiplier
  // Enemy "health" is 70 + level*8 (capped at 100), so HP lands in 150-250 range
  const healthValue = Math.min(100, 70 + level * 8);
  const maxHP = Math.max(1, Math.floor(healthValue * BATTLE_CONSTANTS.baseHPMultiplier));

  return {
    petId: `enemy_${Date.now()}`,
    name: `Wild ${SPECIES_CONFIG[speciesId]?.name ?? speciesId}`,
    speciesId,
    level,
    maxHP,
    currentHP: maxHP,
    energy: BATTLE_CONSTANTS.startingEnergy,
    maxEnergy: BATTLE_CONSTANTS.maxEnergy,
    strength: str,
    speed: spd,
    defense: def,
    moves: getMoves(speciesId),
    buffs: [],
  };
};

/**
 * Create a BattlePet from a speciesId alone (no Pet object needed).
 * Used by the DEV pre-combat character picker.
 */
export const speciesIdToBattlePet = (speciesId: string, level = 5): BattlePet => {
  const species = SPECIES_CONFIG[speciesId];
  if (!species) {
    console.warn(`Missing species config for "${speciesId}" — using koala_sprite`);
    return speciesIdToBattlePet('koala_sprite', level);
  }
  const base = species.baseStats;
  const levelScale = 1 + level * 0.15;
  const maxHP = Math.max(1, Math.floor(80 * BATTLE_CONSTANTS.baseHPMultiplier));
  return {
    petId: `dev_${speciesId}_${Date.now()}`,
    name: species.name,
    speciesId,
    level,
    maxHP,
    currentHP: maxHP,
    energy: BATTLE_CONSTANTS.startingEnergy,
    maxEnergy: BATTLE_CONSTANTS.maxEnergy,
    strength: Math.max(10, Math.floor(base.strength * levelScale)),
    speed: Math.max(10, Math.floor(base.speed * levelScale)),
    defense: Math.max(8, Math.floor(base.defense * levelScale * 0.95)),
    moves: getMoves(speciesId),
    buffs: [],
  };
};

export const initBattle = (playerPet: Pet, enemyLevelBonus = 0): ActiveBattleState => {
  const playerBattlePet = petToBattlePet(playerPet);
  const enemyBattlePet = generateEnemyPet(playerPet.progression.level + enemyLevelBonus);

  return {
    active: true,
    phase: 'player_turn',
    playerPet: playerBattlePet,
    enemyPet: enemyBattlePet,
    turnCount: 0,
    log: [{ turn: 0, actor: 'player', action: 'battle_start', message: `A wild ${enemyBattlePet.name} appeared!` }],
    mathBuffActive: false,
    traceBuffs: { ...INITIAL_TRACE_BUFFS },
    combo: { ...INITIAL_COMBO },
    enemyIntent: selectEnemyIntent(enemyBattlePet, playerBattlePet),
    focusUsedThisTurn: false,
  };
};

/**
 * DEV: Start a battle using any speciesId as the player character.
 * The active pet's level is used if available, otherwise defaults to 5.
 */
export const initBattleWithSpecies = (speciesId: string, playerLevel = 5): ActiveBattleState => {
  const playerBattlePet = speciesIdToBattlePet(speciesId, playerLevel);
  const enemyBattlePet = generateEnemyPet(playerLevel);
  return {
    active: true,
    phase: 'player_turn',
    playerPet: playerBattlePet,
    enemyPet: enemyBattlePet,
    turnCount: 0,
    log: [{ turn: 0, actor: 'player', action: 'battle_start', message: `A wild ${enemyBattlePet.name} appeared!` }],
    mathBuffActive: false,
    traceBuffs: { ...INITIAL_TRACE_BUFFS },
    combo: { ...INITIAL_COMBO },
    enemyIntent: selectEnemyIntent(enemyBattlePet, playerBattlePet),
    focusUsedThisTurn: false,
  };
};

export const profileToBattlePet = (profile: ClassmateProfile): BattlePet => {
  const { petSnapshot } = profile;
  const level = petSnapshot.level;

  const speciesBase = SPECIES_BASE_STATS[petSnapshot.speciesId] ?? { str: 10, spd: 10, def: 10 };
  const stageMult = STAGE_MULTIPLIERS[petSnapshot.stage] ?? 1.0;
  const moodMult = MOOD_HINT_MULTIPLIERS[petSnapshot.moodHint] ?? 1.0;

  const baseStr = Math.floor(speciesBase.str * stageMult * moodMult * (1 + level * 0.1));
  const baseSpd = Math.floor(speciesBase.spd * stageMult * moodMult * (1 + level * 0.1));
  const baseDef = Math.floor(speciesBase.def * stageMult * moodMult * (1 + level * 0.1));

  const variance = Math.floor(Math.random() * 3) - 1;

  const maxHP = Math.max(1, Math.floor(level * BATTLE_CONSTANTS.baseHPMultiplier * moodMult * stageMult));

  return {
    petId: `pvp_${profile.id}`,
    name: petSnapshot.name,
    speciesId: petSnapshot.speciesId,
    level,
    maxHP,
    currentHP: maxHP,
    energy: BATTLE_CONSTANTS.startingEnergy,
    maxEnergy: BATTLE_CONSTANTS.maxEnergy,
    strength: baseStr + variance,
    speed: baseSpd + variance,
    defense: baseDef + variance,
    moves: getMoves(petSnapshot.speciesId),
    buffs: [],
  };
};

export const initPvPBattle = (
  playerPet: Pet,
  opponent: ClassmateProfile,
  ticketId: string,
  tokenStake: number,
): ActiveBattleState => {
  const playerBattlePet = petToBattlePet(playerPet);
  const enemyBattlePet = profileToBattlePet(opponent);

  return {
    active: true,
    phase: 'player_turn',
    playerPet: playerBattlePet,
    enemyPet: enemyBattlePet,
    turnCount: 0,
    log: [{
      turn: 0,
      actor: 'player',
      action: 'battle_start',
      message: `${opponent.displayName}'s ${enemyBattlePet.name} wants to battle!`,
    }],
    mathBuffActive: false,
    traceBuffs: { ...INITIAL_TRACE_BUFFS },
    combo: { ...INITIAL_COMBO },
    enemyIntent: selectEnemyIntent(enemyBattlePet, playerBattlePet),
    focusUsedThisTurn: false,
    pvpMeta: {
      opponentId: opponent.id,
      opponentDisplayName: opponent.displayName,
      ticketId,
      tokenStake,
      isNPCSimulated: opponent.isNPC,
    },
  };
};

// --- DAMAGE FORMULA ---

const calcDamage = (
  attacker: BattlePet,
  defender: BattlePet,
  move: BattleMove,
  mathBuff: boolean,
  traceBuffs?: TraceBuffState,
  combo?: ComboState,
): { damage: number; isCrit: boolean } => {
  if (Math.random() * 100 > move.accuracy) return { damage: 0, isCrit: false };

  // Multiplicative formula: ATK * power/40 * (100 / (100 + DEF))
  // - Never produces 0 (no subtractive cliff)
  // - DEF reduces damage asymptotically (100 DEF = 50% reduction, 200 DEF = 33%)
  const atk = attacker.strength;
  const def = defender.defense;
  const raw = (atk * move.power / 40) * (100 / (100 + def));

  // Defense buff reduces incoming damage (defenseReduction = 0.5 → 50% reduction)
  const hasDefBuff = defender.buffs.some(b => b.stat === 'defense');
  const defReduction = hasDefBuff ? (1 - BATTLE_CONSTANTS.defenseReduction) : 1.0;
  const base = Math.max(1, raw * defReduction);

  // Variance: ±10%
  const variance = 0.9 + Math.random() * 0.2;
  let total = base * variance;

  // Crit check
  const isCrit = Math.random() < BATTLE_CONSTANTS.critChance;
  if (isCrit) total *= BATTLE_CONSTANTS.critMultiplier;

  // Combo multiplier
  if (combo && combo.count > 0) {
    total *= combo.multiplier;
  }

  // Trace/math buff multiplier (existing logic preserved)
  let bestMult = 1;
  if (mathBuff && move.type !== 'heal') bestMult = Math.max(bestMult, 1.5);
  if (traceBuffs?.mathTraceTier) bestMult = Math.max(bestMult, TRACE_TIER_MULTIPLIERS[traceBuffs.mathTraceTier]);
  if (traceBuffs?.runeBoostTier) bestMult = Math.max(bestMult, TRACE_TIER_MULTIPLIERS[traceBuffs.runeBoostTier]);
  if (move.type !== 'heal') total *= bestMult;

  return { damage: Math.max(1, Math.floor(total)), isCrit };
};

// --- HELPERS ---

const applyDefend = (pet: BattlePet): BattlePet => ({
  ...pet,
  buffs: [...pet.buffs, { stat: 'defense', multiplier: 1.5, turnsRemaining: 1 }],
});

const tickBuffs = (pet: BattlePet): BattlePet => ({
  ...pet,
  buffs: pet.buffs
    .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
    .filter((b) => b.turnsRemaining > 0),
});

const regenEnergy = (pet: BattlePet): BattlePet => ({
  ...pet,
  energy: Math.min(pet.maxEnergy, pet.energy + BATTLE_CONSTANTS.energyPerTurn),
});

const incrementCombo = (combo: ComboState, action: string): ComboState => {
  const newCount = Math.min(combo.count + 1, BATTLE_CONSTANTS.comboMaxStacks);
  return {
    count: newCount,
    multiplier: 1 + newCount * BATTLE_CONSTANTS.comboPerStack,
    lastAction: action,
  };
};

const resetCombo = (): ComboState => ({ ...INITIAL_COMBO });

// --- PLAYER ACTIONS ---

export const executePlayerMove = (battle: ActiveBattleState, moveId: string): ActiveBattleState => {
  const move = battle.playerPet.moves.find((m) => m.id === moveId);
  if (!move) {
    const logEntry = { turn: battle.turnCount, actor: 'player' as const, action: 'error', message: `Unknown move!` };
    return { ...battle, log: [...battle.log, logEntry].slice(-50) };
  }
  if (battle.playerPet.energy < move.cost) {
    const logEntry = { turn: battle.turnCount, actor: 'player' as const, action: 'fail', message: `Not enough energy for ${move.name}! (need ${move.cost}, have ${battle.playerPet.energy})` };
    return { ...battle, log: [...battle.log, logEntry].slice(-50) };
  }

  let player = { ...battle.playerPet, energy: battle.playerPet.energy - move.cost };
  let enemy = battle.enemyPet;
  let message = '';
  let combo = battle.combo;

  if (move.type === 'defend') {
    player = applyDefend(player);
    player = { ...player, energy: Math.min(player.maxEnergy, player.energy + BATTLE_CONSTANTS.defenseEnergyGain) };
    combo = incrementCombo(combo, move.id);
    message = `${player.name} takes a defensive stance!`;
  } else if (move.type === 'heal') {
    const healBase = move.power + Math.floor(player.defense * 0.3);
    const healVariance = Math.floor(healBase * 0.1);
    const healAmt = Math.max(1, Math.min(Math.floor(player.maxHP * 0.35), healBase + Math.floor(Math.random() * healVariance)));
    player = { ...player, currentHP: Math.min(player.maxHP, player.currentHP + healAmt) };
    // Heals do NOT build combo — only offensive actions do
    message = `${player.name} healed for ${healAmt} HP!`;
  } else {
    const result = calcDamage(player, enemy, move, battle.mathBuffActive, battle.traceBuffs, combo);
    enemy = { ...enemy, currentHP: clampHP(enemy.currentHP - result.damage) };
    if (result.damage === 0) {
      // Miss resets combo
      combo = resetCombo();
      message = `${player.name} used ${move.name} but missed!`;
    } else if (result.isCrit) {
      combo = incrementCombo(combo, move.id);
      message = `CRITICAL! ${player.name} used ${move.name} for ${result.damage} damage!`;
    } else {
      combo = incrementCombo(combo, move.id);
      message = `${player.name} used ${move.name} for ${result.damage} damage!`;
    }
  }

  const logEntry = { turn: battle.turnCount, actor: 'player' as const, action: move.id, damage: undefined as number | undefined, message };

  return {
    ...battle,
    playerPet: player,
    enemyPet: enemy,
    combo,
    mathBuffActive: false,
    traceBuffs: { ...battle.traceBuffs, mathTraceTier: null, runeBoostTier: null },
    log: [...battle.log, logEntry].slice(-50),
    phase: 'enemy_turn',
  };
};

export const executeFocus = (battle: ActiveBattleState): ActiveBattleState => {
  const player = {
    ...battle.playerPet,
    energy: Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + BATTLE_CONSTANTS.focusEnergyGain),
  };
  const newCount = Math.min(battle.combo.count + BATTLE_CONSTANTS.comboFocusBonus, BATTLE_CONSTANTS.comboMaxStacks);
  const combo: ComboState = {
    count: newCount,
    multiplier: 1 + newCount * BATTLE_CONSTANTS.comboPerStack,
    lastAction: 'focus',
  };
  const logEntry = {
    turn: battle.turnCount,
    actor: 'player' as const,
    action: 'focus',
    message: `${player.name} focuses their energy! +${BATTLE_CONSTANTS.focusEnergyGain} EN`,
  };
  return {
    ...battle,
    playerPet: player,
    combo,
    focusUsedThisTurn: true,
    log: [...battle.log, logEntry].slice(-50),
    phase: 'enemy_turn',
  };
};

export const executeDefendAction = (battle: ActiveBattleState): ActiveBattleState => {
  let player = {
    ...battle.playerPet,
    energy: Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + BATTLE_CONSTANTS.defenseEnergyGain),
  };
  player = applyDefend(player);

  const combo = incrementCombo(battle.combo, 'defend');
  const logEntry = {
    turn: battle.turnCount,
    actor: 'player' as const,
    action: 'defend_action',
    message: `${player.name} takes a defensive stance!`,
  };
  return {
    ...battle,
    playerPet: player,
    combo,
    log: [...battle.log, logEntry].slice(-50),
    phase: 'enemy_turn',
  };
};

export const attemptFlee = (battle: ActiveBattleState): { success: boolean; battle: ActiveBattleState } => {
  const speedDiff = battle.playerPet.speed - battle.enemyPet.speed;
  const chance = BATTLE_CONSTANTS.fleeBaseChance + speedDiff * BATTLE_CONSTANTS.fleeSpeedBonus;
  const success = Math.random() < Math.min(0.9, Math.max(0.1, chance));

  if (success) {
    return { success: true, battle };
  }

  const logEntry = {
    turn: battle.turnCount,
    actor: 'player' as const,
    action: 'flee_fail',
    message: `${battle.playerPet.name} couldn't escape!`,
  };
  return {
    success: false,
    battle: {
      ...battle,
      log: [...battle.log, logEntry].slice(-50),
      phase: 'enemy_turn' as const,
    },
  };
};

// --- ENEMY TURN ---

export const executeEnemyTurn = (battle: ActiveBattleState): ActiveBattleState => {
  const move = selectEnemyMove(battle.enemyPet, battle.playerPet);
  if (battle.enemyPet.energy < move.cost) {
    // Enemy can't afford selected move — grant bonus regen (+5) and try cheapest move
    const cheapest = battle.enemyPet.moves.reduce((min, m) => (m.cost < min.cost ? m : min));
    const regenAmount = BATTLE_CONSTANTS.energyPerTurn + 5; // bonus regen when stuck
    const enemy: BattlePet = {
      ...battle.enemyPet,
      energy: Math.min(battle.enemyPet.maxEnergy, battle.enemyPet.energy + regenAmount),
    };

    // If still can't afford even cheapest, do a free weak strike (0 energy cost)
    if (enemy.energy < cheapest.cost) {
      const weakDamage = Math.max(1, Math.floor(enemy.strength * 0.15));
      const player = {
        ...battle.playerPet,
        currentHP: clampHP(battle.playerPet.currentHP - weakDamage),
        energy: Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + BATTLE_CONSTANTS.energyOnHitTaken),
      };
      const intent = selectEnemyIntent(enemy, player);
      return {
        ...battle,
        playerPet: player,
        enemyPet: enemy,
        enemyIntent: intent,
        combo: resetCombo(),
        phase: 'resolve',
        log: [...battle.log, { turn: battle.turnCount, actor: 'enemy', action: 'struggle', message: `${enemy.name} struggles and lashes out for ${weakDamage} damage!` }],
      };
    }

    // Now can afford cheapest — gather and defend
    const defendedEnemy = applyDefend(enemy);
    const intent = selectEnemyIntent(defendedEnemy, battle.playerPet);
    return {
      ...battle,
      enemyPet: defendedEnemy,
      enemyIntent: intent,
      phase: 'resolve',
      log: [...battle.log, { turn: battle.turnCount, actor: 'enemy', action: 'gather', message: `${enemy.name} gathers energy and braces! +${regenAmount} EN` }],
    };
  }

  let enemy = { ...battle.enemyPet, energy: battle.enemyPet.energy - move.cost };
  let player = battle.playerPet;
  let message = '';
  let combo = battle.combo;

  if (move.type === 'defend') {
    enemy = applyDefend(enemy);
    message = `${enemy.name} takes a defensive stance!`;
  } else if (move.type === 'heal') {
    const healAmt = Math.floor(move.power + Math.random() * 10);
    enemy = { ...enemy, currentHP: Math.min(enemy.maxHP, enemy.currentHP + healAmt) };
    message = `${enemy.name} healed for ${healAmt} HP!`;
  } else {
    const result = calcDamage(enemy, player, move, false);
    if (result.damage > 0) {
      player = {
        ...player,
        currentHP: clampHP(player.currentHP - result.damage),
        energy: Math.min(player.maxEnergy, player.energy + BATTLE_CONSTANTS.energyOnHitTaken),
      };
      // Reset player combo when hit
      combo = resetCombo();
      message = result.isCrit
        ? `CRITICAL! ${enemy.name} used ${move.name} for ${result.damage} damage!`
        : `${enemy.name} used ${move.name} for ${result.damage} damage!`;
    } else {
      message = `${enemy.name} used ${move.name} but missed!`;
    }
  }

  const logEntry = { turn: battle.turnCount, actor: 'enemy' as const, action: move.id, message };

  // Select next enemy intent after acting
  const intent = selectEnemyIntent(enemy, player);

  return {
    ...battle,
    playerPet: player,
    enemyPet: enemy,
    combo,
    enemyIntent: intent,
    log: [...battle.log, logEntry].slice(-50),
    phase: 'resolve',
  };
};

// --- ROUND RESOLUTION ---

export const resolveRound = (battle: ActiveBattleState): ActiveBattleState => {
  const playerDead = battle.playerPet.currentHP <= 0;
  const enemyDead = battle.enemyPet.currentHP <= 0;
  const maxTurns = battle.turnCount >= BATTLE_CONSTANTS.maxTurns;

  if (playerDead || maxTurns) {
    return { ...battle, phase: 'defeat' };
  }
  if (enemyDead) {
    const rewards = calculateRewards(battle);
    return { ...battle, phase: 'victory', rewards };
  }

  return {
    ...battle,
    turnCount: battle.turnCount + 1,
    playerPet: regenEnergy(tickBuffs(battle.playerPet)),
    enemyPet: regenEnergy(tickBuffs(battle.enemyPet)),
    traceBuffs: { ...battle.traceBuffs, shieldTier: null },
    focusUsedThisTurn: false,
    phase: 'player_turn',
  };
};

export const calculateRewards = (battle: ActiveBattleState): BattleRewards => {
  if (battle.pvpMeta) {
    return {
      tokens: battle.pvpMeta.tokenStake,
      xp: battle.enemyPet.level * 10,
      coins: battle.turnCount < 5 ? 1 : undefined,
      pvpTokensTransferred: battle.pvpMeta.tokenStake,
    };
  }
  const enemyLevel = battle.enemyPet.level;
  const tokens = enemyLevel * 5;
  const xp = enemyLevel * 10;
  const coins = battle.turnCount < 5 ? 1 : undefined;
  return { tokens, xp, ...(coins !== undefined ? { coins } : {}) };
};
