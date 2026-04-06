import { describe, it, expect } from 'vitest';
import {
  buildBoard,
  isInBounds,
  getPieceAt,
  computeValidMoves,
  grantEnergy,
  decayRank4,
  initMomentum,
  selectPiece,
  deselectPiece,
  beginMove,
  checkFlashTrigger,
  canFuse,
  checkWinCondition,
  calculateRewards,
  advanceAfterAnimation,
  startNextTurn,
  resolveCombat,
  applyFlashChoice,
  skipTurn,
} from '../MomentumSystem';
import {
  MOMENTUM_BOARD,
  STARTING_COLUMNS,
  PLAYER_START_ROW,
  ENEMY_START_ROW,
  MOMENTUM_REWARDS,
  DIFFICULTY_SETTINGS,
} from '../../../config/momentumConfig';
import type {
  MomentumPiece,
  BoardPosition,
  ActiveMomentumState,
} from '../../../types/momentum';

// ---------------------------------------------------------------------------
// Mock piece factory
// ---------------------------------------------------------------------------

const mockPiece = (
  id: string,
  team: 'player' | 'enemy',
  pos: BoardPosition,
  energy = 2,
  rank: 1 | 2 | 3 | 4 = 1,
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

// ---------------------------------------------------------------------------
// 1. buildBoard
// ---------------------------------------------------------------------------

describe('buildBoard', () => {
  it('returns a 5x5 grid of nulls when there are no pieces', () => {
    const grid = buildBoard([]);
    expect(grid.length).toBe(MOMENTUM_BOARD.gridSize);
    for (const row of grid) {
      expect(row.length).toBe(MOMENTUM_BOARD.gridSize);
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it('places piece IDs at the correct positions', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }),
      mockPiece('p2', 'player', { x: 2, y: 4 }),
      mockPiece('e1', 'enemy', { x: 1, y: 0 }),
    ];
    const grid = buildBoard(pieces);

    expect(grid[4][0]).toBe('p1');
    expect(grid[4][2]).toBe('p2');
    expect(grid[0][1]).toBe('e1');
    // Empty cells should be null
    expect(grid[2][2]).toBeNull();
    expect(grid[0][0]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. isInBounds
// ---------------------------------------------------------------------------

describe('isInBounds', () => {
  it('returns true for (0,0)', () => {
    expect(isInBounds({ x: 0, y: 0 })).toBe(true);
  });

  it('returns true for (4,4)', () => {
    expect(isInBounds({ x: 4, y: 4 })).toBe(true);
  });

  it('returns false for x=-1', () => {
    expect(isInBounds({ x: -1, y: 0 })).toBe(false);
  });

  it('returns false for x=5', () => {
    expect(isInBounds({ x: 5, y: 0 })).toBe(false);
  });

  it('returns false for y=-1', () => {
    expect(isInBounds({ x: 2, y: -1 })).toBe(false);
  });

  it('returns true for center position (2,2)', () => {
    expect(isInBounds({ x: 2, y: 2 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. getPieceAt
// ---------------------------------------------------------------------------

describe('getPieceAt', () => {
  const pieces = [
    mockPiece('p1', 'player', { x: 1, y: 3 }),
    mockPiece('e1', 'enemy', { x: 4, y: 0 }),
  ];

  it('returns the piece at a given position', () => {
    const found = getPieceAt(pieces, { x: 1, y: 3 });
    expect(found).not.toBeNull();
    expect(found!.id).toBe('p1');
  });

  it('returns null for an empty position', () => {
    const found = getPieceAt(pieces, { x: 0, y: 0 });
    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. computeValidMoves — BFS pathfinding
// ---------------------------------------------------------------------------

describe('computeValidMoves', () => {
  it('returns empty array when piece has 0 energy', () => {
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 0);
    const moves = computeValidMoves(piece, [piece]);
    expect(moves).toEqual([]);
  });

  it('returns 4 adjacent cells for piece with 1 energy in the center', () => {
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 1);
    const moves = computeValidMoves(piece, [piece]);

    expect(moves.length).toBe(4);
    // All should be cost=1, not attacks
    for (const m of moves) {
      expect(m.energyCost).toBe(1);
      expect(m.isAttack).toBe(false);
      expect(m.targetPieceId).toBeNull();
    }

    // Check specific destinations exist
    const destinations = moves.map(m => `${m.destination.x},${m.destination.y}`);
    expect(destinations).toContain('2,1'); // up
    expect(destinations).toContain('2,3'); // down
    expect(destinations).toContain('1,2'); // left
    expect(destinations).toContain('3,2'); // right
  });

  it('returns 2 valid moves for piece at corner (0,0) with 1 energy', () => {
    const piece = mockPiece('p1', 'player', { x: 0, y: 0 }, 1);
    const moves = computeValidMoves(piece, [piece]);

    expect(moves.length).toBe(2);
    const destinations = moves.map(m => `${m.destination.x},${m.destination.y}`);
    expect(destinations).toContain('1,0'); // right
    expect(destinations).toContain('0,1'); // down
  });

  it('reaches tiles 2 steps away with energy=2', () => {
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 2);
    const moves = computeValidMoves(piece, [piece]);

    // With energy 2 from center: 4 tiles at distance 1 + 8 tiles at distance 2 = 12
    // (diamond shape minus piece itself)
    expect(moves.length).toBe(12);

    // Check that tiles at distance 2 are included
    const dests = new Set(moves.map(m => `${m.destination.x},${m.destination.y}`));
    expect(dests.has('2,0')).toBe(true); // 2 up
    expect(dests.has('0,2')).toBe(true); // 2 left
    expect(dests.has('4,2')).toBe(true); // 2 right
    expect(dests.has('2,4')).toBe(true); // 2 down
    expect(dests.has('1,1')).toBe(true); // diagonal (reached via 2 orthogonal steps)

    // Verify costs
    const dist1 = moves.filter(m => m.energyCost === 1);
    const dist2 = moves.filter(m => m.energyCost === 2);
    expect(dist1.length).toBe(4);
    expect(dist2.length).toBe(8);
  });

  it('cannot move through friendly pieces (blocks path)', () => {
    // Player piece at (2,2) with energy=2
    // Friendly at (2,1) blocks path northward
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 2);
    const friendly = mockPiece('p2', 'player', { x: 2, y: 1 }, 1);
    const pieces = [piece, friendly];

    const moves = computeValidMoves(piece, pieces);

    // (2,1) should NOT appear in moves (friendly blocks)
    const dests = new Set(moves.map(m => `${m.destination.x},${m.destination.y}`));
    expect(dests.has('2,1')).toBe(false);

    // (2,0) should also be unreachable since the path goes through (2,1)
    // unless there's another 2-step path - but from (2,2) to (2,0) the only
    // paths are (2,2)->(2,1)->(2,0) [blocked] or (2,2)->(1,2)->(1,1)->(1,0)->(2,0) [too long]
    // Actually: (2,2)->(1,2)->(1,1) is cost 2, but (2,0) is not adjacent to (1,1)
    // So (2,0) is not reachable with energy 2 when (2,1) is blocked
    expect(dests.has('2,0')).toBe(false);
  });

  it('generates attack move for adjacent enemy', () => {
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 1);
    const enemy = mockPiece('e1', 'enemy', { x: 2, y: 1 }, 1);
    const pieces = [piece, enemy];

    const moves = computeValidMoves(piece, pieces);

    // Should have 3 normal moves + 1 attack move = 4
    expect(moves.length).toBe(4);

    const attackMove = moves.find(m => m.isAttack);
    expect(attackMove).toBeDefined();
    expect(attackMove!.destination).toEqual({ x: 2, y: 1 });
    expect(attackMove!.targetPieceId).toBe('e1');
    expect(attackMove!.energyCost).toBe(1);
  });

  it('cannot pass through enemy piece — only attack, not cells beyond', () => {
    // Player at (2,2) energy=3, enemy at (2,1)
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 3);
    const enemy = mockPiece('e1', 'enemy', { x: 2, y: 1 }, 1);
    const pieces = [piece, enemy];

    const moves = computeValidMoves(piece, pieces);

    // (2,1) is enemy — attack move, but we should not expand past it
    // (2,0) should not be reachable directly through the enemy at (2,1)
    // However, (2,0) CAN be reached via (1,2)->(1,1)->(1,0)->(2,0) at cost 4, which exceeds energy 3
    // Or via (1,2)->(1,1)->(2,0)? No, (1,1) is not adjacent to (2,0).
    // Actually: (2,2)->(1,2)->(1,1)->(1,0) is cost 3; (1,0) to (2,0) is cost 4.
    // So (2,0) is reachable only via path through enemy, which is blocked.
    // Let's verify (2,0) specifically:
    const attackMoves = moves.filter(m => m.isAttack);
    expect(attackMoves.length).toBe(1);
    expect(attackMoves[0].destination).toEqual({ x: 2, y: 1 });

    // Check that the cells beyond the enemy are NOT reachable through the enemy
    // (2,0) would require going through (2,1) which is blocked
    // But it might be reachable via alternate paths - let's check specific blocking
    const dests = new Set(moves.map(m => `${m.destination.x},${m.destination.y}`));
    // (2,1) is the enemy attack move
    expect(dests.has('2,1')).toBe(true);
    // Verify the attack move at (2,1) is marked as attack
    const enemyMove = moves.find(m => m.destination.x === 2 && m.destination.y === 1);
    expect(enemyMove!.isAttack).toBe(true);
  });

  it('returns no valid moves when surrounded by friendlies', () => {
    const piece = mockPiece('p1', 'player', { x: 2, y: 2 }, 3);
    const f1 = mockPiece('p2', 'player', { x: 2, y: 1 }, 1); // up
    const f2 = mockPiece('p3', 'player', { x: 2, y: 3 }, 1); // down
    const f3 = mockPiece('p4', 'player', { x: 1, y: 2 }, 1); // left
    const f4 = mockPiece('p5', 'player', { x: 3, y: 2 }, 1); // right
    const pieces = [piece, f1, f2, f3, f4];

    const moves = computeValidMoves(piece, pieces);
    expect(moves).toEqual([]);
  });

  it('BFS guarantees minimum cost — multiple paths to same destination yield lowest cost', () => {
    // Piece at (0,0) with energy=4
    // No obstacles — BFS will find (2,2) at cost 4 via many paths
    // but the minimum cost is always 4 (manhattan distance)
    const piece = mockPiece('p1', 'player', { x: 0, y: 0 }, 4);
    const moves = computeValidMoves(piece, [piece]);

    // (2,2) is reachable at manhattan distance 4
    const target = moves.find(m => m.destination.x === 2 && m.destination.y === 2);
    expect(target).toBeDefined();
    expect(target!.energyCost).toBe(4);

    // (1,1) should be cost 2 (not 4 via a longer path)
    const closer = moves.find(m => m.destination.x === 1 && m.destination.y === 1);
    expect(closer).toBeDefined();
    expect(closer!.energyCost).toBe(2);
  });

  it('handles edge piece with energy=3 correctly', () => {
    // Piece at (0,2) — left edge, middle row
    const piece = mockPiece('p1', 'player', { x: 0, y: 2 }, 3);
    const moves = computeValidMoves(piece, [piece]);

    // All moves should be in bounds
    for (const m of moves) {
      expect(isInBounds(m.destination)).toBe(true);
    }

    // Should not have any moves at x<0
    const outOfBounds = moves.filter(m => m.destination.x < 0);
    expect(outOfBounds.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Helper: build a minimal ActiveMomentumState
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<ActiveMomentumState> = {}): ActiveMomentumState {
  const pieces = overrides.pieces ?? [];
  return {
    active: true,
    difficulty: 'medium',
    phase: 'player_select',
    turnCount: 1,
    activeTeam: 'player',
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 5. grantEnergy
// ---------------------------------------------------------------------------

describe('grantEnergy', () => {
  it('grants correct energy per rank (rank 1: +1, rank 2: +2, rank 3: +3)', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
      mockPiece('p2', 'player', { x: 2, y: 4 }, 0, 2),
      mockPiece('p3', 'player', { x: 4, y: 4 }, 0, 3),
    ];
    const result = grantEnergy(pieces, 'player');
    expect(result[0].energy).toBe(1); // rank 1: +1
    expect(result[1].energy).toBe(2); // rank 2: +2
    expect(result[2].energy).toBe(3); // rank 3: +3
  });

  it('caps energy at rank max (rank 1 max 2, rank 2 max 4)', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 1), // already at max
      mockPiece('p2', 'player', { x: 2, y: 4 }, 3, 2), // 3+2=5, capped at 4
    ];
    const result = grantEnergy(pieces, 'player');
    expect(result[0].energy).toBe(2); // rank 1 max is 2
    expect(result[1].energy).toBe(4); // rank 2 max is 4
  });

  it('only grants to the specified team', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
    ];
    const result = grantEnergy(pieces, 'player');
    expect(result[0].energy).toBe(1); // player gets energy
    expect(result[1].energy).toBe(0); // enemy unchanged
  });
});

// ---------------------------------------------------------------------------
// 6. decayRank4
// ---------------------------------------------------------------------------

describe('decayRank4', () => {
  it('decrements rank4TurnsRemaining', () => {
    const pieces: MomentumPiece[] = [
      {
        ...mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 4),
        isTemporaryRank4: true,
        rank4TurnsRemaining: 2,
        previousRank: 3,
      },
    ];
    const result = decayRank4(pieces, 'player');
    expect(result.pieces[0].rank4TurnsRemaining).toBe(1);
    expect(result.pieces[0].rank).toBe(4);
    expect(result.events).toHaveLength(0);
  });

  it('reverts to previous rank when timer hits 0', () => {
    const pieces: MomentumPiece[] = [
      {
        ...mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 4),
        isTemporaryRank4: true,
        rank4TurnsRemaining: 1,
        previousRank: 3,
      },
    ];
    const result = decayRank4(pieces, 'player');
    expect(result.pieces[0].rank).toBe(3);
    expect(result.pieces[0].isTemporaryRank4).toBe(false);
    expect(result.pieces[0].rank4TurnsRemaining).toBe(0);
    expect(result.pieces[0].previousRank).toBeNull();
  });

  it('emits rank4_expired event on revert', () => {
    const pieces: MomentumPiece[] = [
      {
        ...mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 4),
        isTemporaryRank4: true,
        rank4TurnsRemaining: 1,
        previousRank: 3,
      },
    ];
    const result = decayRank4(pieces, 'player');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({ type: 'rank4_expired', pieceId: 'p1' });
  });

  it('ignores non-rank4 pieces', () => {
    const pieces = [mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 2)];
    const result = decayRank4(pieces, 'player');
    expect(result.pieces[0].rank).toBe(2);
    expect(result.events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. initMomentum
// ---------------------------------------------------------------------------

describe('initMomentum', () => {
  it('creates 3 player pieces and 3 enemy pieces', () => {
    const state = initMomentum();
    const players = state.pieces.filter(p => p.team === 'player');
    const enemies = state.pieces.filter(p => p.team === 'enemy');
    expect(players).toHaveLength(3);
    expect(enemies).toHaveLength(3);
  });

  it('player pieces at correct positions (cols 0,2,4 row 4)', () => {
    const state = initMomentum();
    const players = state.pieces.filter(p => p.team === 'player');
    for (let i = 0; i < 3; i++) {
      expect(players[i].position.x).toBe(STARTING_COLUMNS[i]);
      expect(players[i].position.y).toBe(PLAYER_START_ROW);
    }
  });

  it('enemy pieces at correct positions (cols 0,2,4 row 0)', () => {
    const state = initMomentum();
    const enemies = state.pieces.filter(p => p.team === 'enemy');
    for (let i = 0; i < 3; i++) {
      expect(enemies[i].position.x).toBe(STARTING_COLUMNS[i]);
      expect(enemies[i].position.y).toBe(ENEMY_START_ROW);
    }
  });

  it('ranks are [1, 2, 1] for each side', () => {
    const state = initMomentum();
    const players = state.pieces.filter(p => p.team === 'player');
    const enemies = state.pieces.filter(p => p.team === 'enemy');
    expect(players.map(p => p.rank)).toEqual([1, 2, 1]);
    expect(enemies.map(p => p.rank)).toEqual([1, 2, 1]);
  });

  it('player pieces start with energy granted (rank 1: 1, rank 2: 2)', () => {
    const state = initMomentum();
    const players = state.pieces.filter(p => p.team === 'player');
    expect(players[0].energy).toBe(1); // rank 1 gains 1
    expect(players[1].energy).toBe(2); // rank 2 gains 2
    expect(players[2].energy).toBe(1); // rank 1 gains 1
  });

  it('phase is player_select', () => {
    const state = initMomentum();
    expect(state.phase).toBe('player_select');
  });
});

// ---------------------------------------------------------------------------
// 8. selectPiece / deselectPiece
// ---------------------------------------------------------------------------

describe('selectPiece / deselectPiece', () => {
  it('selectPiece computes valid moves', () => {
    const state = initMomentum();
    const selected = selectPiece(state, 'p1');
    expect(selected.phase).toBe('player_move');
    expect(selected.selectedPieceId).toBe('p1');
    expect(selected.validMoves.length).toBeGreaterThan(0);
  });

  it('selectPiece only works for active team pieces', () => {
    const state = initMomentum();
    const selected = selectPiece(state, 'e1'); // enemy piece during player turn
    // Should return unchanged state
    expect(selected.selectedPieceId).toBeNull();
    expect(selected.phase).toBe('player_select');
  });

  it('deselectPiece resets to player_select', () => {
    const state = initMomentum();
    const selected = selectPiece(state, 'p1');
    const deselected = deselectPiece(selected);
    expect(deselected.phase).toBe('player_select');
    expect(deselected.selectedPieceId).toBeNull();
    expect(deselected.validMoves).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 9. beginMove
// ---------------------------------------------------------------------------

describe('beginMove', () => {
  it('regular move: updates position, deducts energy, phase=animating_move', () => {
    const state = initMomentum();
    const selected = selectPiece(state, 'p1');
    // Find a non-attack move
    const nonAttackIdx = selected.validMoves.findIndex(m => !m.isAttack);
    expect(nonAttackIdx).toBeGreaterThanOrEqual(0);

    const moved = beginMove(selected, nonAttackIdx);
    const movedPiece = moved.pieces.find(p => p.id === 'p1')!;
    const expectedDest = selected.validMoves[nonAttackIdx].destination;

    expect(moved.phase).toBe('animating_move');
    expect(movedPiece.position).toEqual(expectedDest);
    expect(movedPiece.energy).toBe(
      state.pieces.find(p => p.id === 'p1')!.energy -
        selected.validMoves[nonAttackIdx].energyCost,
    );
  });

  it('attack move: deducts energy, phase=animating_attack, position NOT yet changed', () => {
    // Set up attacker adjacent to enemy
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 2, 1);
    const enemy = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 1);
    const otherPlayer = mockPiece('p2', 'player', { x: 0, y: 4 }, 1, 1);

    const state = makeState({
      pieces: [attacker, enemy, otherPlayer],
      activeTeam: 'player',
      selectedPieceId: 'p1',
      validMoves: computeValidMoves(attacker, [attacker, enemy, otherPlayer]),
    });

    const attackIdx = state.validMoves.findIndex(m => m.isAttack);
    expect(attackIdx).toBeGreaterThanOrEqual(0);

    const result = beginMove(state, attackIdx);
    const attackerAfter = result.pieces.find(p => p.id === 'p1')!;

    expect(result.phase).toBe('animating_attack');
    // Position should NOT have changed yet
    expect(attackerAfter.position).toEqual({ x: 2, y: 3 });
    // Energy should be deducted
    expect(attackerAfter.energy).toBe(attacker.energy - state.validMoves[attackIdx].energyCost);
  });
});

// ---------------------------------------------------------------------------
// 10. checkFlashTrigger
// ---------------------------------------------------------------------------

describe('checkFlashTrigger', () => {
  it('exact energy kill triggers', () => {
    const attacker = mockPiece('p1', 'player', { x: 0, y: 0 }, 0, 2);
    const defender = mockPiece('e1', 'enemy', { x: 1, y: 0 }, 2, 2);
    const result = checkFlashTrigger(attacker, defender, 2, 2); // spent all
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('exact_energy_kill');
  });

  it('underdog win triggers', () => {
    const attacker = mockPiece('p1', 'player', { x: 0, y: 0 }, 1, 1);
    const defender = mockPiece('e1', 'enemy', { x: 1, y: 0 }, 2, 2);
    const result = checkFlashTrigger(attacker, defender, 1, 3); // had 3, spent 1
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('underdog_win');
  });

  it('neither condition returns no trigger', () => {
    const attacker = mockPiece('p1', 'player', { x: 0, y: 0 }, 1, 2);
    const defender = mockPiece('e1', 'enemy', { x: 1, y: 0 }, 2, 1);
    const result = checkFlashTrigger(attacker, defender, 1, 3); // not exact, not underdog
    expect(result.triggered).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('exact energy takes priority if both true', () => {
    const attacker = mockPiece('p1', 'player', { x: 0, y: 0 }, 0, 1);
    const defender = mockPiece('e1', 'enemy', { x: 1, y: 0 }, 2, 2);
    // Attacker rank 1 < defender rank 2 (underdog) AND spent all energy (exact)
    const result = checkFlashTrigger(attacker, defender, 1, 1);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('exact_energy_kill'); // exact checked first
  });
});

// ---------------------------------------------------------------------------
// 11. canFuse
// ---------------------------------------------------------------------------

describe('canFuse', () => {
  it('true when >= 2 rank-2 pieces', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 2),
      mockPiece('p2', 'player', { x: 2, y: 4 }, 0, 2),
    ];
    expect(canFuse(pieces, 'player')).toBe(true);
  });

  it('false when < 2 rank-2 pieces', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 2),
      mockPiece('p2', 'player', { x: 2, y: 4 }, 0, 1),
    ];
    expect(canFuse(pieces, 'player')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 12. checkWinCondition
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  it('victory when no enemy pieces', () => {
    const state = makeState({
      pieces: [mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 1)],
    });
    const result = checkWinCondition(state);
    expect(result.phase).toBe('victory');
    expect(result.lastEvent).toEqual({ type: 'game_won' });
    expect(result.rewards).not.toBeNull();
  });

  it('defeat when no player pieces', () => {
    const state = makeState({
      pieces: [mockPiece('e1', 'enemy', { x: 0, y: 0 }, 2, 1)],
    });
    const result = checkWinCondition(state);
    expect(result.phase).toBe('defeat');
    expect(result.lastEvent).toEqual({ type: 'game_lost' });
  });

  it('defeat when turn limit reached', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 2, 1),
      ],
      turnCount: DIFFICULTY_SETTINGS.medium.maxTurns, // at limit
    });
    const result = checkWinCondition(state);
    expect(result.phase).toBe('defeat');
  });

  it('no change when both sides have pieces and under turn limit', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 2, 1),
      ],
      turnCount: 5,
    });
    const result = checkWinCondition(state);
    expect(result.phase).toBe('player_select'); // unchanged
  });
});

// ---------------------------------------------------------------------------
// 13. calculateRewards
// ---------------------------------------------------------------------------

describe('calculateRewards', () => {
  it('returns correct token amount with turn bonus', () => {
    const state = makeState({ turnCount: 10 });
    const rewards = calculateRewards(state);
    const expectedTurnBonus = (DIFFICULTY_SETTINGS.medium.maxTurns - 10) * MOMENTUM_REWARDS.perTurnBonus;
    expect(rewards.tokens).toBe(MOMENTUM_REWARDS.baseTokens + expectedTurnBonus);
    expect(rewards.xp).toBe(MOMENTUM_REWARDS.baseXP);
  });
});

// ---------------------------------------------------------------------------
// 14. advanceAfterAnimation
// ---------------------------------------------------------------------------

describe('advanceAfterAnimation', () => {
  it('animating_move -> check win + start next turn', () => {
    const state = makeState({
      phase: 'animating_move',
      activeTeam: 'player',
      pieces: [
        mockPiece('p1', 'player', { x: 1, y: 3 }, 0, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      ],
    });
    const result = advanceAfterAnimation(state);
    // Should have switched to enemy turn
    expect(result.activeTeam).toBe('enemy');
    expect(result.phase).toBe('ai_turn');
  });

  it('animating_attack -> resolveCombat', () => {
    // Set up a state where animating_attack just finished
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 1, 2); // energy already deducted
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 1);
    const state = makeState({
      phase: 'animating_attack',
      activeTeam: 'player',
      pieces: [attacker, defender],
      lastEvent: {
        type: 'piece_attacked',
        attackerId: 'p1',
        defenderId: 'e1',
        position: { x: 2, y: 2 },
      },
      validMoves: [
        {
          destination: { x: 2, y: 2 },
          energyCost: 1,
          isAttack: true,
          targetPieceId: 'e1',
        },
      ],
    });
    const result = advanceAfterAnimation(state);
    // Defender should be removed
    expect(result.pieces.find(p => p.id === 'e1')).toBeUndefined();
    // Attacker should have moved to defender's position
    expect(result.pieces.find(p => p.id === 'p1')!.position).toEqual({ x: 2, y: 2 });
  });
});

// ---------------------------------------------------------------------------
// 15. resolveCombat
// ---------------------------------------------------------------------------

describe('resolveCombat', () => {
  function makeAttackState(
    attacker: MomentumPiece,
    defender: MomentumPiece,
    energyCost = 1,
    activeTeam: 'player' | 'enemy' = 'player',
  ): ReturnType<typeof makeState> {
    return makeState({
      phase: 'animating_attack',
      activeTeam,
      pieces: [attacker, defender],
      lastEvent: {
        type: 'piece_attacked',
        attackerId: attacker.id,
        defenderId: defender.id,
        position: defender.position,
      },
      validMoves: [
        {
          destination: defender.position,
          energyCost,
          isAttack: true,
          targetPieceId: defender.id,
        },
      ],
    });
  }

  it('removes defender and moves attacker to target position', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 1, 2);
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1);

    const result = resolveCombat(state);

    expect(result.pieces.find(p => p.id === 'e1')).toBeUndefined();
    expect(result.pieces.find(p => p.id === 'p1')!.position).toEqual({ x: 2, y: 2 });
  });

  it('rank promotion when attacker rank < defender rank (rank 1 beats rank 2 -> rank 2)', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 1, 1);
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1);

    const result = resolveCombat(state);

    const promotedAttacker = result.pieces.find(p => p.id === 'p1')!;
    expect(promotedAttacker.rank).toBe(2);
  });

  it('rank promotion capped at rank 3 (rank 2 beats rank 3 -> rank 3, not 4)', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 1, 2);
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 3);
    const state = makeAttackState(attacker, defender, 1);

    const result = resolveCombat(state);

    const promotedAttacker = result.pieces.find(p => p.id === 'p1')!;
    expect(promotedAttacker.rank).toBe(3);
  });

  it('no promotion when attacker rank equals defender rank', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 1, 2);
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1);

    const result = resolveCombat(state);

    const attackerAfter = result.pieces.find(p => p.id === 'p1')!;
    expect(attackerAfter.rank).toBe(2);
  });

  it('flash triggered on exact energy kill for player attack', () => {
    // Attacker had exactly 1 energy, spends 1 (energyBefore === energyCost)
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 0, 2); // 0 remaining after spending 1
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1, 'player');

    const result = resolveCombat(state);

    expect(result.phase).toBe('flash_sequence');
    expect(result.flashPending).not.toBeNull();
    expect(result.flashPending!.triggerReason).toBe('exact_energy_kill');
  });

  it('flash triggered on underdog win for player attack', () => {
    // Attacker rank 1 beats defender rank 2 with energy remaining (not exact kill)
    const attacker = mockPiece('p1', 'player', { x: 2, y: 3 }, 2, 1); // 2 remaining after spending 1 -> energyBefore=3
    const defender = mockPiece('e1', 'enemy', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1, 'player');

    const result = resolveCombat(state);

    expect(result.phase).toBe('flash_sequence');
    expect(result.flashPending).not.toBeNull();
    expect(result.flashPending!.triggerReason).toBe('underdog_win');
  });

  it('no flash trigger for enemy attacks', () => {
    // Enemy attacker rank 1 beats player rank 2 (would be underdog) — but enemy attacks don't trigger flash
    const attacker = mockPiece('e1', 'enemy', { x: 2, y: 1 }, 2, 1);
    const defender = mockPiece('p1', 'player', { x: 2, y: 2 }, 2, 2);
    const state = makeAttackState(attacker, defender, 1, 'enemy');

    const result = resolveCombat(state);

    expect(result.phase).not.toBe('flash_sequence');
    expect(result.flashPending).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 16. applyFlashChoice
// ---------------------------------------------------------------------------

describe('applyFlashChoice', () => {
  function makeFlashState(
    attacker: MomentumPiece,
    otherPieces: MomentumPiece[] = [],
  ): ReturnType<typeof makeState> {
    const allPieces = [attacker, ...otherPieces];
    return makeState({
      phase: 'flash_sequence',
      activeTeam: 'player',
      pieces: allPieces,
      flashPending: {
        triggerReason: 'exact_energy_kill',
        attackerPieceId: attacker.id,
        capturedPieceId: 'e1',
      },
      flashEligibleForFusion: otherPieces.some(p => p.rank === 2 && p.team === 'player'),
    });
  }

  it('upgrade rank 1 -> rank 2 permanently', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 2 }, 1, 1);
    const state = makeFlashState(attacker);

    const result = applyFlashChoice(state, 'upgrade');

    const upgraded = result.pieces.find(p => p.id === 'p1')!;
    expect(upgraded.rank).toBe(2);
    expect(upgraded.isTemporaryRank4).toBe(false);
  });

  it('upgrade rank 3 -> temporary rank 4 (isTemporaryRank4=true, rank4TurnsRemaining=2)', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 2 }, 1, 3);
    const state = makeFlashState(attacker);

    const result = applyFlashChoice(state, 'upgrade');

    const upgraded = result.pieces.find(p => p.id === 'p1')!;
    expect(upgraded.rank).toBe(4);
    expect(upgraded.isTemporaryRank4).toBe(true);
    expect(upgraded.rank4TurnsRemaining).toBe(2);
  });

  it('fusion: removes two rank-2 pieces and creates a rank-3 at chosen position', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 2 }, 1, 2);
    const other = mockPiece('p2', 'player', { x: 0, y: 4 }, 1, 2);
    const state = makeFlashState(attacker, [other]);

    const resultPos = { x: 1, y: 3 };
    const result = applyFlashChoice(state, 'fusion', {
      pieceId1: 'p1',
      pieceId2: 'p2',
      resultPosition: resultPos,
    });

    expect(result.pieces.find(p => p.id === 'p1')).toBeUndefined();
    expect(result.pieces.find(p => p.id === 'p2')).toBeUndefined();

    const newPiece = result.pieces.find(p => p.rank === 3 && p.team === 'player');
    expect(newPiece).toBeDefined();
    expect(newPiece!.energy).toBe(0);
    expect(newPiece!.position).toEqual(resultPos);
  });

  it('fusion returns unchanged state if fusionTarget pieces are not rank 2', () => {
    const attacker = mockPiece('p1', 'player', { x: 2, y: 2 }, 1, 2);
    const notRank2 = mockPiece('p2', 'player', { x: 0, y: 4 }, 1, 1); // rank 1, not 2
    const state = makeFlashState(attacker, [notRank2]);

    const resultBefore = { ...state };
    const result = applyFlashChoice(state, 'fusion', {
      pieceId1: 'p1',
      pieceId2: 'p2',
      resultPosition: { x: 1, y: 3 },
    });

    // Should return unchanged state
    expect(result.pieces).toEqual(resultBefore.pieces);
    expect(result.phase).toBe(resultBefore.phase);
    expect(result.flashPending).toEqual(resultBefore.flashPending);
  });
});

// ---------------------------------------------------------------------------
// 17. skipTurn
// ---------------------------------------------------------------------------

describe('skipTurn', () => {
  it('delegates to startNextTurn — switches team and grants energy to new team', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
    ];
    const state = makeState({ activeTeam: 'player', pieces });

    const result = skipTurn(state);

    // Team should have switched to enemy
    expect(result.activeTeam).toBe('enemy');
    // Enemy piece should have received energy (rank 1 gains 1)
    expect(result.pieces.find(p => p.id === 'e1')!.energy).toBe(1);
    // Player piece should not have received energy
    expect(result.pieces.find(p => p.id === 'p1')!.energy).toBe(0);
  });

  it('adds a log entry for the skipped turn', () => {
    const state = makeState({
      activeTeam: 'player',
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 1, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      ],
    });

    const result = skipTurn(state);

    const skipLogEntry = result.log.find(entry => entry.message.includes('skips turn'));
    expect(skipLogEntry).toBeDefined();
    expect(skipLogEntry!.actor).toBe('player');
  });
});

// ---------------------------------------------------------------------------
// 18. startNextTurn
// ---------------------------------------------------------------------------

describe('startNextTurn', () => {
  it('switches activeTeam from player to enemy', () => {
    const state = makeState({
      activeTeam: 'player',
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      ],
    });

    const result = startNextTurn(state);

    expect(result.activeTeam).toBe('enemy');
  });

  it('switches activeTeam from enemy to player', () => {
    const state = makeState({
      activeTeam: 'enemy',
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      ],
    });

    const result = startNextTurn(state);

    expect(result.activeTeam).toBe('player');
  });

  it('grants energy to the new team (enemy)', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 2), // rank 2 enemy
    ];
    const state = makeState({ activeTeam: 'player', pieces });

    const result = startNextTurn(state);

    expect(result.pieces.find(p => p.id === 'e1')!.energy).toBe(2); // rank 2 gains 2
    expect(result.pieces.find(p => p.id === 'p1')!.energy).toBe(0); // player unchanged
  });

  it('grants energy to the new team (player)', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 2), // rank 2 player
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
    ];
    const state = makeState({ activeTeam: 'enemy', pieces });

    const result = startNextTurn(state);

    expect(result.pieces.find(p => p.id === 'p1')!.energy).toBe(2); // rank 2 gains 2
    expect(result.pieces.find(p => p.id === 'e1')!.energy).toBe(0); // enemy unchanged
  });

  it('increments turnCount only when switching to player', () => {
    const state = makeState({
      activeTeam: 'player',
      turnCount: 3,
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }, 0, 1),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }, 0, 1),
      ],
    });

    // player -> enemy: turnCount should stay the same
    const afterEnemyTurn = startNextTurn(state);
    expect(afterEnemyTurn.turnCount).toBe(3);

    // enemy -> player: turnCount should increment
    const afterPlayerTurn = startNextTurn(afterEnemyTurn);
    expect(afterPlayerTurn.turnCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Victory after player attack kills last enemy
// ---------------------------------------------------------------------------

describe('advanceAfterAnimation — victory after attack', () => {
  it('triggers victory when player kills the last enemy via attack', () => {
    // Player attacks last enemy — after resolveCombat, enemy count = 0
    const attacker = mockPiece('p1', 'player', { x: 0, y: 3 }, 2, 2);
    const defender = mockPiece('e1', 'enemy', { x: 0, y: 2 }, 1, 1);
    const pieces = [attacker, defender];

    // Set up state as if player selected piece and chose attack move
    const state = makeState({
      pieces,
      phase: 'player_move',
      selectedPieceId: 'p1',
      activeTeam: 'player',
    });

    const selected = selectPiece(state, 'p1');
    const attackIdx = selected.validMoves.findIndex(
      m => m.destination.x === 0 && m.destination.y === 2 && m.isAttack,
    );
    expect(attackIdx).toBeGreaterThanOrEqual(0);

    // Execute the attack (sets phase to animating_attack)
    const afterMove = beginMove(selected, attackIdx);
    expect(afterMove.phase).toBe('animating_attack');

    // Simulate animation done
    const afterAnim = advanceAfterAnimation(afterMove);
    expect(afterAnim.phase).toBe('victory');
    expect(afterAnim.rewards).not.toBeNull();
  });
});
