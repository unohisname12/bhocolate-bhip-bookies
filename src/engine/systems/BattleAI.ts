import type { BattlePet, BattleMove, EnemyIntent, EnemyIntentType } from '../../types/battle';
import { ENEMY_INTENT_LABELS } from '../../config/battleConfig';

export const selectEnemyMove = (enemy: BattlePet, player: BattlePet): BattleMove => {
  const affordable = enemy.moves.filter((m) => m.cost <= enemy.energy);
  if (affordable.length === 0) {
    return enemy.moves.reduce((min, m) => (m.cost < min.cost ? m : min));
  }

  const hpPct = enemy.currentHP / enemy.maxHP;
  const playerHpPct = player.currentHP / player.maxHP;

  // Score each move with weighted heuristics
  const scored = affordable.map(move => {
    let score = 50;

    if (move.type === 'attack' || move.type === 'special') {
      score += move.power * 0.5;
      if (hpPct < 0.3) score += 20;          // desperate aggression
      if (playerHpPct < 0.25) score += 30;    // finish them off
      if (move.type === 'special') score += 5; // slight preference for specials
    }

    if (move.type === 'heal') {
      if (hpPct < 0.4) score += 60;           // prioritize healing when low
      else if (hpPct > 0.7) score -= 40;      // don't heal when healthy
    }

    if (move.type === 'defend') {
      if (hpPct > 0.5 && hpPct < 0.8) score += 15; // defensive when middling
      if (player.buffs.length > 0) score += 10;      // counter player buffs
      if (hpPct < 0.2) score -= 20;                  // don't waste turns defending when almost dead
    }

    // Random variance: ±15 points
    score += (Math.random() * 30) - 15;

    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
};

/** Predict enemy's next move — shown to player as intent. */
export const selectEnemyIntent = (enemy: BattlePet, player: BattlePet): EnemyIntent => {
  const nextMove = selectEnemyMove(enemy, player);

  let intentType: EnemyIntentType;
  if (nextMove.type === 'defend') {
    intentType = 'DEFEND';
  } else if (nextMove.type === 'heal') {
    intentType = 'HEAL';
  } else if (nextMove.power >= 60) {
    intentType = 'HEAVY_ATTACK';
  } else {
    intentType = 'ATTACK';
  }

  const labels = ENEMY_INTENT_LABELS[intentType];

  return {
    type: intentType,
    moveId: nextMove.id,
    label: labels.label,
    icon: labels.icon,
  };
};
