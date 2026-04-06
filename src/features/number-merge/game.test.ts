import { describe, expect, it } from 'vitest';
import {
  applyOverseerStrike,
  applyResolvedMove,
  canResolveMove,
  collapseBoardAfterStrike,
  createInitialNumberMergeGame,
  resolveMove,
} from './game';
import type { NumberMergeBoard, NumberMergeGameSnapshot } from './types';

const makeNumberTile = (id: string, value: number) => ({ id, kind: 'number' as const, value });
const makeCorruptTile = (id: string, lockedTurns = 0) => ({ id, kind: 'corrupt' as const, value: 0, lockedTurns });

const createEmptyBoard = (): NumberMergeBoard =>
  Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => null));

const createFilledBoard = (): NumberMergeBoard =>
  Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 6 }, (_, col) => makeNumberTile(`t-${row}-${col}`, ((row + col) % 5) + 1)));

const createSnapshot = (
  board: NumberMergeBoard,
  difficulty: NumberMergeGameSnapshot['difficulty'],
): NumberMergeGameSnapshot => ({
  ...createInitialNumberMergeGame(null, difficulty, () => 0),
  board,
});

describe('number merge difficulty architecture', () => {
  it('easy mode uses a short turn window and loses a heart on expiry', () => {
    const board = createFilledBoard();
    board[5][0] = makeNumberTile('a', 2);
    board[5][1] = makeNumberTile('b', 3);

    const snapshot = {
      ...createSnapshot(board, 'easy'),
      searchTarget: 9,
      turnsRemaining: 1,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    }, () => 0);

    const next = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(next.lives).toBe(snapshot.lives - 1);
    expect(next.turnsRemaining).toBe(2);
    expect(next.feedback?.tone).toBe('warning');
  });

  it('leaves the moved-from spot empty after a normal merge', () => {
    const board = createFilledBoard();
    board[5][0] = makeNumberTile('a', 2);
    board[5][1] = makeNumberTile('b', 3);

    const snapshot = {
      ...createSnapshot(board, 'easy'),
      searchTarget: 12,
      turnsRemaining: 2,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    }, () => 0);

    const next = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(next.board[5][0]).toBeNull();
    expect(next.board[5][1]?.kind).toBe('number');
    expect(next.board[5][1]?.value).toBe(5);
  });

  it('normal mode uses a fixed search window and penalizes expiry', () => {
    const board = createFilledBoard();
    board[5][0] = makeNumberTile('a', 2);
    board[5][1] = makeNumberTile('b', 3);

    const snapshot = {
      ...createSnapshot(board, 'normal'),
      searchTarget: 12,
      turnsRemaining: 1,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    }, () => 0);

    const next = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(next.lives).toBe(snapshot.lives - 1);
    expect(next.turnsRemaining).toBe(2);
  });

  it('hard mode opens a chain window and overseer strike injects corruption', () => {
    const board = createFilledBoard();
    board[5][0] = makeNumberTile('a', 2);
    board[5][1] = makeNumberTile('b', 3);

    const snapshot = {
      ...createSnapshot(board, 'hard'),
      searchTarget: 10,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    }, () => 0);

    const advanced = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(advanced.phase).toBe('chain_window');
    expect(advanced.unstableCells).toEqual([{ row: 5, col: 0 }]);

    const struck = applyOverseerStrike(advanced, () => 0);
    expect(struck.lastOverseerEvent?.type).toBe('claim_gap');
    expect(struck.board[5][0]?.kind).toBe('corrupt');
    expect(struck.corruption).toBeGreaterThan(0);
  });

  it('corrupt tiles remain mergeable when unlocked', () => {
    const board = createEmptyBoard();
    board[5][0] = makeNumberTile('a', 4);
    board[5][1] = makeCorruptTile('x', 0);

    expect(canResolveMove(board, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    })).toBe(true);
  });

  it('number tiles can slide into adjacent empty spots as a full turn', () => {
    const board = createEmptyBoard();
    board[5][0] = makeNumberTile('a', 4);

    expect(canResolveMove(board, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    })).toBe(true);

    const snapshot = {
      ...createSnapshot(board, 'easy'),
      searchTarget: 9,
      turnsRemaining: 2,
      goalStars: 3,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 5, col: 1 },
    }, () => 0);

    const next = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(resolved?.action).toBe('slide');
    expect(next.turnsRemaining).toBe(2);
    expect(next.board[5][0]).toBeNull();
    expect(next.board[5][1]?.kind).toBe('number');
  });

  it('rerolls an impossible goal and removes half a star', () => {
    const board = createEmptyBoard();
    board[5][0] = makeNumberTile('a', 2);

    const snapshot = {
      ...createSnapshot(board, 'easy'),
      searchTarget: 9,
      turnsRemaining: 2,
      goalStars: 3,
    };

    const resolved = resolveMove(snapshot, {
      from: { row: 5, col: 0 },
      to: { row: 4, col: 0 },
    }, () => 0);

    const next = applyResolvedMove(snapshot, resolved!, 1000, () => 0);
    expect(next.goalStars).toBe(2.5);
    expect(next.searchTarget).not.toBe(9);
    expect(next.feedback?.message).toContain('Lost half a star');
  });

  it('collapse after an overseer strike keeps open cells instead of refilling', () => {
    const board = createEmptyBoard();
    board[5][0] = makeCorruptTile('x', 0);

    const snapshot: NumberMergeGameSnapshot = {
      ...createSnapshot(board, 'hard'),
      phase: 'overseer_strike',
      lastOverseerEvent: {
        type: 'claim_gap',
        description: 'test',
        positions: [{ row: 5, col: 0 }],
        corruptionDelta: 10,
      },
    };

    const collapsed = collapseBoardAfterStrike(snapshot);
    expect(collapsed.phase).toBe('playing');
    expect(collapsed.board[5][0]?.kind).toBe('corrupt');
    expect(collapsed.board.flat().filter((tile) => tile === null).length).toBeGreaterThan(0);
  });
});
