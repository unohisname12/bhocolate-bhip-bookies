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
import { RANK_ENERGY } from '../../config/momentumConfig';
import { computeValidMoves } from './MomentumSystem';

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
  const maxEnergy = RANK_ENERGY[piece.rank]?.max ?? piece.rank * 2;
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
): { pieceId: string; moveIndex: number } | null {
  const enemyPieces = state.pieces.filter(p => p.team === 'enemy');

  let bestScore = -Infinity;
  let bestAction: { pieceId: string; moveIndex: number } | null = null;

  for (const piece of enemyPieces) {
    const moves = computeValidMoves(piece, state.pieces);
    for (let i = 0; i < moves.length; i++) {
      const score = scoreMove(piece, moves[i], state.pieces);
      if (score > bestScore) {
        bestScore = score;
        bestAction = { pieceId: piece.id, moveIndex: i };
      }
    }
  }

  return bestAction;
}
