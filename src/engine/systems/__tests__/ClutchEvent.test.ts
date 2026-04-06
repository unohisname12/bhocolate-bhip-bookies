import { describe, it, expect } from 'vitest';
import {
  buildBoard,
  checkClutchTrigger,
  claimClutchTile,
  initMomentum,
  beginMove,
  selectPiece,
  startNextTurn,
} from '../MomentumSystem';
import { CLUTCH_EVENT } from '../../../config/momentumConfig';
import type {
  MomentumPiece,
  BoardPosition,
  ActiveMomentumState,
} from '../../../types/momentum';

// ---------------------------------------------------------------------------
// Helpers
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
// Clutch Trigger Tests
// ---------------------------------------------------------------------------

describe('Clutch Event — trigger conditions', () => {
  it('triggers when enemy has 2+ more pieces than player', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
        mockPiece('e3', 'enemy', { x: 4, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    expect(result.clutchTile).not.toBeNull();
    expect(result.lastEvent?.type).toBe('clutch_triggered');
  });

  it('does NOT trigger when deficit is less than threshold', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('p2', 'player', { x: 2, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
        mockPiece('e3', 'enemy', { x: 4, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    expect(result.clutchTile).toBeNull();
  });

  it('does NOT trigger when teams are even', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('p2', 'player', { x: 2, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    expect(result.clutchTile).toBeNull();
  });

  it('does NOT trigger while on cooldown', () => {
    const state = makeState({
      clutchCooldown: 2,
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
        mockPiece('e3', 'enemy', { x: 4, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    expect(result.clutchTile).toBeNull();
  });

  it('does NOT trigger when clutch tile already exists', () => {
    const state = makeState({
      clutchTile: { x: 2, y: 2 },
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
        mockPiece('e3', 'enemy', { x: 4, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    // Should keep existing tile, not replace
    expect(result.clutchTile).toEqual({ x: 2, y: 2 });
  });

  it('places clutch tile on an empty cell', () => {
    const state = makeState({
      pieces: [
        mockPiece('p1', 'player', { x: 0, y: 4 }),
        mockPiece('e1', 'enemy', { x: 0, y: 0 }),
        mockPiece('e2', 'enemy', { x: 2, y: 0 }),
        mockPiece('e3', 'enemy', { x: 4, y: 0 }),
      ],
    });

    const result = checkClutchTrigger(state);
    expect(result.clutchTile).not.toBeNull();
    // Tile should not overlap any piece
    const tileOccupied = state.pieces.some(
      p => p.position.x === result.clutchTile!.x && p.position.y === result.clutchTile!.y,
    );
    expect(tileOccupied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clutch Claim Tests
// ---------------------------------------------------------------------------

describe('Clutch Event — claiming', () => {
  it('upgrades piece +1 rank when landing on clutch tile', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 2, y: 2 }, 2, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }),
      mockPiece('e2', 'enemy', { x: 2, y: 0 }),
      mockPiece('e3', 'enemy', { x: 4, y: 0 }),
    ];
    const state = makeState({
      pieces,
      clutchTile: { x: 2, y: 2 },
    });

    const result = claimClutchTile(state, 'p1');
    const upgraded = result.pieces.find(p => p.id === 'p1')!;
    expect(upgraded.rank).toBe(2);
    expect(result.clutchTile).toBeNull();
    expect(result.clutchCooldown).toBe(CLUTCH_EVENT.cooldownTurns);
    expect(result.lastEvent?.type).toBe('clutch_claimed');
  });

  it('rank 3 piece gets temporary rank 4', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 2, y: 2 }, 2, 3),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }),
      mockPiece('e2', 'enemy', { x: 2, y: 0 }),
      mockPiece('e3', 'enemy', { x: 4, y: 0 }),
    ];
    const state = makeState({
      pieces,
      clutchTile: { x: 2, y: 2 },
    });

    const result = claimClutchTile(state, 'p1');
    const upgraded = result.pieces.find(p => p.id === 'p1')!;
    expect(upgraded.rank).toBe(4);
    expect(upgraded.isTemporaryRank4).toBe(true);
    expect(upgraded.previousRank).toBe(3);
  });

  it('does NOT claim if piece is not on the clutch tile', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 2, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }),
    ];
    const state = makeState({
      pieces,
      clutchTile: { x: 2, y: 2 },
    });

    const result = claimClutchTile(state, 'p1');
    expect(result.clutchTile).toEqual({ x: 2, y: 2 }); // unchanged
  });

  it('does NOT claim for enemy pieces', () => {
    const pieces = [
      mockPiece('e1', 'enemy', { x: 2, y: 2 }),
      mockPiece('p1', 'player', { x: 0, y: 4 }),
    ];
    const state = makeState({
      pieces,
      clutchTile: { x: 2, y: 2 },
    });

    const result = claimClutchTile(state, 'e1');
    expect(result.clutchTile).toEqual({ x: 2, y: 2 }); // unchanged
  });
});

// ---------------------------------------------------------------------------
// Cooldown Tests
// ---------------------------------------------------------------------------

describe('Clutch Event — cooldown', () => {
  it('cooldown decrements on player turn start', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 2),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 2),
    ];
    // Simulate enemy turn about to end → player turn starts
    const state = makeState({
      pieces,
      activeTeam: 'enemy',
      clutchCooldown: 3,
    });

    const result = startNextTurn(state);
    expect(result.activeTeam).toBe('player');
    expect(result.clutchCooldown).toBe(2);
  });

  it('cooldown does NOT decrement on enemy turn start', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 0, y: 4 }, 2),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }, 2),
    ];
    const state = makeState({
      pieces,
      activeTeam: 'player',
      clutchCooldown: 3,
    });

    const result = startNextTurn(state);
    expect(result.activeTeam).toBe('enemy');
    expect(result.clutchCooldown).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Integration: clutch tile claimed via beginMove
// ---------------------------------------------------------------------------

describe('Clutch Event — beginMove integration', () => {
  it('claims clutch tile when player piece moves onto it', () => {
    const pieces = [
      mockPiece('p1', 'player', { x: 1, y: 2 }, 2, 1),
      mockPiece('e1', 'enemy', { x: 0, y: 0 }),
      mockPiece('e2', 'enemy', { x: 2, y: 0 }),
      mockPiece('e3', 'enemy', { x: 4, y: 0 }),
    ];
    const state = makeState({
      pieces,
      clutchTile: { x: 2, y: 2 },
    });

    // Select the piece and find the move to clutch tile
    const selected = selectPiece(state, 'p1');
    const moveIdx = selected.validMoves.findIndex(
      m => m.destination.x === 2 && m.destination.y === 2 && !m.isAttack,
    );
    expect(moveIdx).toBeGreaterThanOrEqual(0);

    const result = beginMove(selected, moveIdx);
    // Clutch should be claimed
    expect(result.clutchTile).toBeNull();
    expect(result.clutchCooldown).toBe(CLUTCH_EVENT.cooldownTurns);
    const upgraded = result.pieces.find(p => p.id === 'p1')!;
    expect(upgraded.rank).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// initMomentum includes clutch fields
// ---------------------------------------------------------------------------

describe('Clutch Event — initMomentum', () => {
  it('initializes with no clutch tile and zero cooldown', () => {
    const state = initMomentum();
    expect(state.clutchTile).toBeNull();
    expect(state.clutchCooldown).toBe(0);
  });
});
