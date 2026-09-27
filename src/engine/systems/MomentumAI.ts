import {applyMathPower,powerTargets,powerEnergy} from './MomentumPowers';
// ---------------------------------------------------------------------------
// MomentumAI — AI move scoring and selection for the Momentum Board mini-game
// ---------------------------------------------------------------------------

import type {
  MomentumPiece,
  ValidMove,
  BoardPosition,
  ActiveMomentumState,
  Team,
} from '../../types/momentum';
import { ENERGY_STATIONS, RANK_ENERGY } from '../../config/momentumConfig';
import { computeValidMoves, grantEnergy, supportTargets } from './MomentumSystem';

// ---------------------------------------------------------------------------
// Distance Helpers
// ---------------------------------------------------------------------------

/** Manhattan distance between two positions */
export function manhattanDistance(a: BoardPosition, b: BoardPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Find the nearest enemy piece to a position (enemy = member of targetTeam) */
function findNearestEnemy(
  pos: BoardPosition,
  pieces: MomentumPiece[],
  targetTeam: Team,
): MomentumPiece | null {
  let nearest: MomentumPiece | null = null;
  let minDist = Infinity;
  for (const p of pieces) {
    if (p.team !== targetTeam) continue;
    const dist = manhattanDistance(pos, p.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}

// ---------------------------------------------------------------------------
// Move Scoring
// ---------------------------------------------------------------------------

/** Score a single move for the AI. Higher = better. */
export function scoreMove(
  piece: MomentumPiece,
  move: ValidMove,
  allPieces: MomentumPiece[],
): number {
  let score = 50; // base score

  // Attack bonus — captures are highest priority
  if (move.isAttack) {
    score += 100;
    // Underdog capture bonus: lower rank capturing higher rank
    const target = allPieces.find(p => p.id === move.targetPieceId);
    if (target && piece.rank < target.rank) {
      score += 30 * (target.rank - piece.rank);
    }
  }

  // Closing distance to nearest player piece
  const nearest = findNearestEnemy(move.destination, allPieces, 'player');
  if (nearest) {
    const dist = manhattanDistance(move.destination, nearest.position);
    score += Math.max(0, 20 - 5 * dist);
  }

  // Use-it-or-lose-it: if energy is near cap, encourage spending
  const maxEnergy = powerEnergy(piece)?.max ?? RANK_ENERGY[piece.rank]?.max ?? piece.rank * 2;
  if (piece.energy >= maxEnergy - 1) {
    score += 10;
  }

  // Random variance ±10
  score += Math.random() * 20 - 10;

  return score;
}

// ---------------------------------------------------------------------------
// Action Selection
// ---------------------------------------------------------------------------

/**
 * Select the best AI action (piece + move index into that piece's valid moves).
 * Returns null if no enemy pieces have any valid moves.
 */
export function selectAIAction(
  state: ActiveMomentumState,
): { pieceId: string; moveIndex: number; tactic?: boolean; targetId?: string } | null {
  const enemyPieces = state.pieces.filter(p => p.team === 'enemy');

  let bestScore = -Infinity;
  let bestAction: { pieceId: string; moveIndex: number; tactic?: boolean; targetId?: string } | null = null;

  for (const piece of enemyPieces) {
    const moves = computeValidMoves(piece, state.pieces, state.mode);
    for (let i = 0; i < moves.length; i++) {
      let score = scoreMove(piece, moves[i], state.pieces);
      if (state.mode === 'advanced' || state.mode === 'powers') {
        const simulated = state.pieces.filter(p => p.id !== moves[i].targetPieceId).map(p => p.id === piece.id ? { ...p, position: moves[i].destination, energy: p.energy - moves[i].energyCost } : p);
        const reply = grantEnergy(simulated, 'player');
        if (reply.some(p => p.team === 'player' && computeValidMoves(p, reply, state.mode).some(m => m.targetPieceId === piece.id))) score -= 65 + piece.rank * 8;
        if (state.mode === 'advanced' && ENERGY_STATIONS.some(t => t.x === moves[i].destination.x && t.y === moves[i].destination.y)) score += 30;
      }
      if (score > bestScore) {
        bestScore = score;
        bestAction = { pieceId: piece.id, moveIndex: i };
      }
    }
  }

  if (state.mode === 'advanced') for (const piece of enemyPieces) {
    const upcoming = grantEnergy(state.pieces, 'player');
    const threatened = upcoming.some(p => p.team === 'player' && computeValidMoves(p, upcoming, state.mode).some(m => m.targetPieceId === piece.id));
    if (piece.energy >= 1 && !piece.guarded && threatened && bestScore < 65) {
      bestScore = 65; bestAction = { pieceId: piece.id, moveIndex: -1, tactic: true };
    }
    for (const target of supportTargets(state, piece)) {
      const supplied = state.pieces.map(p => p.id === target.id ? { ...p, energy: p.energy + 2 } : p);
      if (computeValidMoves(supplied.find(p => p.id === target.id)!, supplied, state.mode).some(m => m.isAttack) && bestScore < 75) {
        bestScore = 75; bestAction = { pieceId: piece.id, moveIndex: -1, tactic: true, targetId: target.id };
      }
    }
  }
  if(state.mode==='powers')for(const piece of enemyPieces)for(const target of powerTargets(state,piece)){
    const powered=applyMathPower({...state,activeTeam:'enemy'},piece.id,target.id);
    let score=25;
    if(piece.mathPower==='subtract'){
      const before=grantEnergy(state.pieces,'player'),after=grantEnergy(powered.pieces,'player');
      const threats=computeValidMoves(before.find(p=>p.id===target.id)!,before,'powers').filter(m=>m.isAttack).length;
      const remaining=computeValidMoves(after.find(p=>p.id===target.id)!,after,'powers').filter(m=>m.isAttack).length;
      score+=50*(threats-remaining);
    }else{
      const p=powered.pieces.find(p=>p.id===target.id)!;
      const attacks=computeValidMoves(p,powered.pieces,'powers').filter(m=>m.isAttack).length;
      score+=attacks*45+(p.energy-target.energy)*3;
    }
    if(score>bestScore){bestScore=score;bestAction={pieceId:piece.id,moveIndex:-1,tactic:true,targetId:target.id};}
  }
  return bestAction;
}
