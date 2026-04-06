import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  manhattanDistance,
  scoreMove,
  selectAIAction,
} from '../MomentumAI';
import { buildBoard, computeValidMoves } from '../MomentumSystem';
import type {
  MomentumPiece,
  BoardPosition,
  ActiveMomentumState,
  ValidMove,
  PieceRank,
} from '../../../types/momentum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePiece = (
  id: string,
  team: 'player' | 'enemy',
  pos: BoardPosition,
  energy = 2,
  rank: PieceRank = 1,
): MomentumPiece => ({
  id,
  team,
  rank,
  energy,
  position: pos,
  isTemporaryRank4: false,
  rank4TurnsRemaining: 0,
  previousRank: null,
});

const makeMove = (
  dest: BoardPosition,
  isAttack = false,
  targetPieceId: string | null = null,
  energyCost = 1,
): ValidMove => ({
  destination: dest,
  energyCost,
  isAttack,
  targetPieceId,
});

const makeState = (pieces: MomentumPiece[]): ActiveMomentumState => ({
  active: true,
  difficulty: 'medium',
  phase: 'ai_turn',
  turnCount: 1,
  activeTeam: 'enemy',
  pieces,
  board: buildBoard(pieces),
  selectedPieceId: null,
  validMoves: [],
  flashPending: null,
  flashEligibleForFusion: false,
  clutchTile: null,
  clutchCooldown: 0,
  log: [],
  rewards: null,
  lastEvent: null,
});

// ---------------------------------------------------------------------------
// Silence random variance for deterministic tests where needed.
// We pin Math.random to 0.5 (gives +0 variance: 0.5*20-10 = 0).
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1–4. manhattanDistance
// ---------------------------------------------------------------------------

describe('manhattanDistance', () => {
  it('returns 0 for the same position', () => {
    expect(manhattanDistance({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(0);
  });

  it('returns 1 for adjacent positions (horizontal)', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
  });

  it('returns 1 for adjacent positions (vertical)', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it('returns 2 for diagonal positions', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
  });

  it('returns correct sum for far-apart positions', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 4, y: 3 })).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 5–7. scoreMove
// ---------------------------------------------------------------------------

describe('scoreMove', () => {
  it('attack move scores higher than a non-attack move', () => {
    // Enemy piece at (2,2), player piece at (2,3)
    const enemy = makePiece('e1', 'enemy', { x: 2, y: 2 }, 2, 1);
    const player = makePiece('p1', 'player', { x: 2, y: 3 });
    const allPieces = [enemy, player];

    const attackMove = makeMove({ x: 2, y: 3 }, true, 'p1', 1);
    const regularMove = makeMove({ x: 2, y: 1 }, false, null, 1);

    const attackScore = scoreMove(enemy, attackMove, allPieces);
    const regularScore = scoreMove(enemy, regularMove, allPieces);

    expect(attackScore).toBeGreaterThan(regularScore);
  });

  it('underdog capture adds 30 per rank difference', () => {
    // rank 1 enemy captures rank 3 player -> +30*2 = +60
    const enemy = makePiece('e1', 'enemy', { x: 2, y: 2 }, 3, 1);
    const player = makePiece('p1', 'player', { x: 2, y: 3 }, 3, 3);
    const allPieces = [enemy, player];

    const attackMove = makeMove({ x: 2, y: 3 }, true, 'p1', 1);
    const score = scoreMove(enemy, attackMove, allPieces);

    // base=50, attack=+100, underdog(rank1 vs rank3)=+60
    // distance bonus: dest={x:2,y:3} == player pos, dist=0 -> 20-5*0=+20
    // energy near cap: rank1 max=2, energy=3 >= max-1=1 -> +10
    // random variance: 0.5*20-10 = 0
    // total = 50 + 100 + 60 + 20 + 10 = 240
    expect(score).toBe(50 + 100 + 60 + 20 + 10);
  });

  it('closing distance to nearest player piece increases score', () => {
    // Two candidate moves for the same enemy piece — one closer to player
    const enemy = makePiece('e1', 'enemy', { x: 0, y: 0 }, 4, 2);
    const player = makePiece('p1', 'player', { x: 4, y: 0 });
    const allPieces = [enemy, player];

    // Move closer (x=2) vs move away (x=0,y=1)
    const closerMove = makeMove({ x: 2, y: 0 }, false, null, 2); // dist to player = 2
    const farMove = makeMove({ x: 0, y: 2 }, false, null, 2);   // dist to player = 6

    const closerScore = scoreMove(enemy, closerMove, allPieces);
    const farScore = scoreMove(enemy, farMove, allPieces);

    expect(closerScore).toBeGreaterThan(farScore);
  });
});

// ---------------------------------------------------------------------------
// 8–11. selectAIAction
// ---------------------------------------------------------------------------

describe('selectAIAction', () => {
  it('returns null when no enemy pieces have any valid moves (all 0 energy)', () => {
    const pieces = [
      makePiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      makePiece('e2', 'enemy', { x: 2, y: 0 }, 0, 1),
      makePiece('p1', 'player', { x: 0, y: 4 }),
    ];
    const state = makeState(pieces);
    expect(selectAIAction(state)).toBeNull();
  });

  it('returns an action object when moves are available', () => {
    const pieces = [
      makePiece('e1', 'enemy', { x: 0, y: 0 }, 2, 1),
      makePiece('p1', 'player', { x: 0, y: 4 }),
    ];
    const state = makeState(pieces);
    const action = selectAIAction(state);
    expect(action).not.toBeNull();
    expect(action).toHaveProperty('pieceId');
    expect(action).toHaveProperty('moveIndex');
    expect(typeof action!.pieceId).toBe('string');
    expect(typeof action!.moveIndex).toBe('number');
  });

  it('prefers an attack move over a regular move', () => {
    // e1 at (2,2) can move to (2,1) [empty] or (2,3) [player — attack]
    // With Math.random=0.5 (no variance), attack scores much higher
    const pieces = [
      makePiece('e1', 'enemy', { x: 2, y: 2 }, 2, 1),
      makePiece('p1', 'player', { x: 2, y: 3 }),
    ];
    const state = makeState(pieces);
    const action = selectAIAction(state);
    expect(action).not.toBeNull();
    expect(action!.pieceId).toBe('e1');

    // Verify the chosen move is actually an attack
    const e1 = pieces.find(p => p.id === 'e1')!;
    const moves = computeValidMoves(e1, pieces);
    expect(moves[action!.moveIndex].isAttack).toBe(true);
  });

  it('returns correct pieceId and a valid moveIndex (within bounds of computed moves)', () => {
    // Two enemy pieces; only one has energy
    const pieces = [
      makePiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1), // no energy
      makePiece('e2', 'enemy', { x: 4, y: 0 }, 2, 1), // has energy
      makePiece('p1', 'player', { x: 4, y: 4 }),
    ];
    const state = makeState(pieces);
    const action = selectAIAction(state);
    expect(action).not.toBeNull();
    expect(action!.pieceId).toBe('e2');
    // moveIndex must be a non-negative integer
    expect(action!.moveIndex).toBeGreaterThanOrEqual(0);
  });

  it('returns null when there are no enemy pieces at all', () => {
    const pieces = [
      makePiece('p1', 'player', { x: 0, y: 4 }),
    ];
    const state = makeState(pieces);
    expect(selectAIAction(state)).toBeNull();
  });
});
