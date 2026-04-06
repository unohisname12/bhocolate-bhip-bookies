import { getNumberMergeDifficultyPreset } from './difficulty';
import { getPetModifier } from './pets';
import {
  NUMBER_MERGE_COLS,
  NUMBER_MERGE_MAX_CORRUPTION,
  NUMBER_MERGE_ROWS,
  NUMBER_MERGE_START_VALUES,
  type NumberMergeBoard,
  type NumberMergeCell,
  type NumberMergeDifficulty,
  type NumberMergeFeedback,
  type NumberMergeGameSnapshot,
  type NumberMergeMove,
  type NumberMergeOverseerEvent,
  type NumberMergePetType,
  type NumberMergePosition,
  type NumberMergeResolveResult,
  type NumberMergeTile,
} from './types';

let tileCounter = 0;
const NUMBER_MERGE_MAX_GOAL_STARS = 3;

const createNumberTile = (value: number): NumberMergeTile => ({
  id: `merge-tile-${tileCounter += 1}`,
  kind: 'number',
  value,
});

const createCorruptTile = (): NumberMergeTile => ({
  id: `merge-corrupt-${tileCounter += 1}`,
  kind: 'corrupt',
  value: 0,
  lockedTurns: 0,
});

const createBrokenTile = (): NumberMergeTile => ({
  id: `merge-broken-${tileCounter += 1}`,
  kind: 'broken',
  value: 0,
});

const randomIndex = (length: number, random: () => number): number =>
  Math.max(0, Math.min(length - 1, Math.floor(random() * length)));

const createRandomNumberTile = (random: () => number): NumberMergeTile =>
  createNumberTile(NUMBER_MERGE_START_VALUES[randomIndex(NUMBER_MERGE_START_VALUES.length, random)]);

const cloneBoard = (board: NumberMergeBoard): NumberMergeBoard =>
  board.map((row) => row.map((tile) => (tile ? { ...tile } : null)));

export const isAdjacent = (a: NumberMergePosition, b: NumberMergePosition): boolean =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

export const isInsideBoard = ({ row, col }: NumberMergePosition): boolean =>
  row >= 0 && row < NUMBER_MERGE_ROWS && col >= 0 && col < NUMBER_MERGE_COLS;

export const getTileAt = (
  board: NumberMergeBoard,
  position: NumberMergePosition,
): NumberMergeCell => board[position.row]?.[position.col] ?? null;

export const isNumberTile = (tile: NumberMergeCell): tile is NumberMergeTile =>
  Boolean(tile && tile.kind === 'number');

const isPlayableDestination = (tile: NumberMergeCell): boolean =>
  tile === null || tile.kind === 'number' || (tile.kind === 'corrupt' && tile.lockedTurns === 0);

const createInitialBoard = (random: () => number = Math.random): NumberMergeBoard =>
  Array.from({ length: NUMBER_MERGE_ROWS }, () =>
    Array.from({ length: NUMBER_MERGE_COLS }, () => createRandomNumberTile(random)));

const releaseLocks = (board: NumberMergeBoard): NumberMergeBoard =>
  board.map((row) =>
    row.map((tile) => {
      if (!tile || tile.kind !== 'corrupt' || tile.lockedTurns === undefined) {
        return tile ? { ...tile } : null;
      }

      return { ...tile, lockedTurns: Math.max(0, tile.lockedTurns - 1) };
    }),
  );

const emptyPositionsOf = (board: NumberMergeBoard): NumberMergePosition[] => {
  const positions: NumberMergePosition[] = [];
  for (let row = 0; row < NUMBER_MERGE_ROWS; row += 1) {
    for (let col = 0; col < NUMBER_MERGE_COLS; col += 1) {
      if (!board[row][col]) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
};

const pickRandomTargetValue = (
  difficulty: NumberMergeDifficulty,
  turn: number,
  random: () => number,
): number => {
  const preset = getNumberMergeDifficultyPreset(difficulty);
  const [min, max] = preset.targetRange;
  const growth = Math.min(4, Math.floor(turn / 6));
  const cap = max + (difficulty === 'expert' ? growth : Math.floor(growth / 2));
  const range = Math.max(1, cap - min + 1);
  return min + randomIndex(range, random);
};

const getSearchWindowTurns = (
  difficulty: NumberMergeDifficulty,
  random: () => number,
): number | null => {
  const preset = getNumberMergeDifficultyPreset(difficulty);
  if (preset.variableSearchWindow && preset.variableSearchWindow.length > 0) {
    return preset.variableSearchWindow[randomIndex(preset.variableSearchWindow.length, random)] ?? null;
  }

  return preset.fixedSearchWindowTurns;
};

const createFeedback = (tone: NumberMergeFeedback['tone'], message: string): NumberMergeFeedback => ({
  tone,
  message,
});

const getReachabilityWindow = (
  difficulty: NumberMergeDifficulty,
  turnsRemaining: number | null,
): number => {
  if (turnsRemaining !== null) {
    return Math.max(1, turnsRemaining);
  }

  return Math.max(1, getSearchWindowTurns(difficulty, () => 0) ?? 1);
};

const choosePositions = (
  positions: NumberMergePosition[],
  count: number,
  random: () => number,
): NumberMergePosition[] => {
  const pool = positions.slice();
  const chosen: NumberMergePosition[] = [];

  while (pool.length > 0 && chosen.length < count) {
    const index = randomIndex(pool.length, random);
    const [next] = pool.splice(index, 1);
    chosen.push(next);
  }

  return chosen;
};

const findTilePosition = (board: NumberMergeBoard, tileId: string): NumberMergePosition | null => {
  for (let row = 0; row < NUMBER_MERGE_ROWS; row += 1) {
    for (let col = 0; col < NUMBER_MERGE_COLS; col += 1) {
      if (board[row][col]?.id === tileId) {
        return { row, col };
      }
    }
  }

  return null;
};

const boardSignature = (board: NumberMergeBoard): string =>
  board.map((row) => row.map((tile) => {
    if (!tile) {
      return '_';
    }

    if (tile.kind === 'number') {
      return `n${tile.value}`;
    }

    if (tile.kind === 'corrupt') {
      return `c${tile.lockedTurns ?? 0}`;
    }

    return 'b';
  }).join(',')).join('|');

const getCascadeTarget = (
  board: NumberMergeBoard,
  tileId: string,
): { tile: NumberMergeTile; position: NumberMergePosition } | null => {
  const sourcePosition = findTilePosition(board, tileId);
  if (!sourcePosition) {
    return null;
  }

  const sourceTile = getTileAt(board, sourcePosition);
  if (!isNumberTile(sourceTile)) {
    return null;
  }

  const directions = [
    { row: 1, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: -1 },
    { row: -1, col: 0 },
  ] as const;

  for (const direction of directions) {
    const position = { row: sourcePosition.row + direction.row, col: sourcePosition.col + direction.col };
    if (!isInsideBoard(position)) {
      continue;
    }

    const neighbor = getTileAt(board, position);
    if (isNumberTile(neighbor) && neighbor.value === sourceTile.value) {
      return { tile: neighbor, position };
    }
  }

  return null;
};

const resolveCascade = (
  initialBoard: NumberMergeBoard,
  createdTileId: string,
): {
  board: NumberMergeBoard;
  createdTileId: string | null;
  scoreDelta: number;
  removedTileIds: string[];
  comboCount: number;
} => {
  let board = cloneBoard(initialBoard);
  let activeTileId: string | null = createdTileId;
  let scoreDelta = 0;
  let comboCount = 0;
  const removedTileIds: string[] = [];

  while (activeTileId) {
    const activePosition = findTilePosition(board, activeTileId);
    if (!activePosition) {
      break;
    }

    const activeTile = getTileAt(board, activePosition);
    if (!isNumberTile(activeTile)) {
      break;
    }

    const target = getCascadeTarget(board, activeTileId);
    if (!target) {
      break;
    }

    const nextBoard = cloneBoard(board);
    const nextValue = activeTile.value + target.tile.value;
    nextBoard[target.position.row][target.position.col] = null;
    nextBoard[activePosition.row][activePosition.col] = { ...activeTile, value: nextValue };

    scoreDelta += nextValue * 2;
    comboCount += 1;
    removedTileIds.push(target.tile.id);
    board = nextBoard;
  }

  return { board, createdTileId: activeTileId, scoreDelta, removedTileIds, comboCount };
};

const simulateBoardMove = (
  board: NumberMergeBoard,
  move: NumberMergeMove,
): {
  action: 'merge' | 'slide';
  board: NumberMergeBoard;
  mergeValue: number;
  createdTileId: string | null;
  createdTileValue: number;
  removedTileIds: string[];
  comboCount: number;
  scoreDelta: number;
  emptyCells: NumberMergePosition[];
} | null => {
  if (!isInsideBoard(move.from) || !isInsideBoard(move.to) || !isAdjacent(move.from, move.to)) {
    return null;
  }

  const sourceBoard = releaseLocks(cloneBoard(board));
  const origin = getTileAt(sourceBoard, move.from);
  const destination = getTileAt(sourceBoard, move.to);
  if (!isNumberTile(origin) || !isPlayableDestination(destination)) {
    return null;
  }

  if (destination === null) {
    sourceBoard[move.from.row][move.from.col] = null;
    sourceBoard[move.to.row][move.to.col] = { ...origin };

    return {
      action: 'slide',
      board: sourceBoard,
      mergeValue: 0,
      createdTileId: origin.id,
      createdTileValue: origin.value,
      removedTileIds: [],
      comboCount: 0,
      scoreDelta: 0,
      emptyCells: emptyPositionsOf(sourceBoard),
    };
  }

  const destinationWasCorrupt = destination.kind === 'corrupt';
  const mergedValue = destinationWasCorrupt ? origin.value : origin.value + destination.value;
  const createdTileId = destination.id;

  sourceBoard[move.from.row][move.from.col] = null;
  sourceBoard[move.to.row][move.to.col] = {
    id: createdTileId,
    kind: 'number',
    value: mergedValue,
  };

  const cascaded = destinationWasCorrupt
    ? { board: sourceBoard, createdTileId, scoreDelta: 0, removedTileIds: [destination.id], comboCount: 0 }
    : resolveCascade(sourceBoard, createdTileId);
  const createdTilePosition = cascaded.createdTileId
    ? findTilePosition(cascaded.board, cascaded.createdTileId)
    : null;
  const createdTile = createdTilePosition ? getTileAt(cascaded.board, createdTilePosition) : null;

  return {
    action: 'merge',
    board: cascaded.board,
    mergeValue: mergedValue,
    createdTileId: cascaded.createdTileId,
    createdTileValue: isNumberTile(createdTile) ? createdTile.value : mergedValue,
    removedTileIds: [origin.id, ...cascaded.removedTileIds],
    comboCount: cascaded.comboCount,
    scoreDelta: mergedValue + cascaded.scoreDelta + (destinationWasCorrupt ? 10 : 0),
    emptyCells: emptyPositionsOf(cascaded.board),
  };
};

const listPlayableMoves = (board: NumberMergeBoard): NumberMergeMove[] => {
  const moves: NumberMergeMove[] = [];

  for (let row = 0; row < NUMBER_MERGE_ROWS; row += 1) {
    for (let col = 0; col < NUMBER_MERGE_COLS; col += 1) {
      if (!isNumberTile(board[row][col])) {
        continue;
      }

      const from = { row, col };
      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];

      for (const to of neighbors) {
        if (!isInsideBoard(to)) {
          continue;
        }

        const destination = getTileAt(board, to);
        if (isPlayableDestination(destination)) {
          moves.push({ from, to });
        }
      }
    }
  }

  return moves;
};

const collectReachableMergeValues = (
  board: NumberMergeBoard,
  turns: number,
  memo: Map<string, Set<number>> = new Map(),
): Set<number> => {
  if (turns <= 0) {
    return new Set<number>();
  }

  const key = `${turns}:${boardSignature(board)}`;
  const cached = memo.get(key);
  if (cached) {
    return new Set(cached);
  }

  const reachable = new Set<number>();
  for (const move of listPlayableMoves(board)) {
    const result = simulateBoardMove(board, move);
    if (!result) {
      continue;
    }

    if (result.action === 'merge') {
      reachable.add(result.createdTileValue);
    }

    if (turns > 1) {
      for (const value of collectReachableMergeValues(result.board, turns - 1, memo)) {
        reachable.add(value);
      }
    }
  }

  memo.set(key, new Set(reachable));
  return reachable;
};

const chooseGoalTargetForBoard = (
  board: NumberMergeBoard,
  difficulty: NumberMergeDifficulty,
  turn: number,
  windowTurns: number,
  random: () => number,
): number => {
  const preset = getNumberMergeDifficultyPreset(difficulty);
  const reachableValues = [...collectReachableMergeValues(board, windowTurns)];
  const [min, max] = preset.targetRange;
  const growth = Math.min(6, Math.floor(turn / 5));
  const cap = max + growth * 2;
  const inBand = reachableValues.filter((value) => value >= min && value <= cap);
  const candidates = (inBand.length > 0 ? inBand : reachableValues).sort((a, b) => a - b);

  if (candidates.length === 0) {
    return pickRandomTargetValue(difficulty, turn, random);
  }

  const biasStart = Math.max(0, Math.floor(candidates.length / 2) - 1);
  const preferred = candidates.slice(biasStart);
  return preferred[randomIndex(preferred.length, random)] ?? candidates[candidates.length - 1];
};

const withReachableGoal = (
  snapshot: NumberMergeGameSnapshot,
  random: () => number,
  feedbackOverride?: NumberMergeFeedback | null,
): NumberMergeGameSnapshot => {
  const windowTurns = getReachabilityWindow(snapshot.difficulty, snapshot.turnsRemaining);
  const reachableValues = collectReachableMergeValues(snapshot.board, windowTurns);
  if (reachableValues.has(snapshot.searchTarget)) {
    return feedbackOverride
      ? { ...snapshot, feedback: feedbackOverride }
      : snapshot;
  }

  const nextTurnsRemaining = getSearchWindowTurns(snapshot.difficulty, random);
  const nextTarget = chooseGoalTargetForBoard(
    snapshot.board,
    snapshot.difficulty,
    snapshot.turns,
    getReachabilityWindow(snapshot.difficulty, nextTurnsRemaining),
    random,
  );

  return {
    ...snapshot,
    goalStars: Math.max(0, snapshot.goalStars - 0.5),
    searchTarget: nextTarget,
    turnsRemaining: nextTurnsRemaining,
    feedback: feedbackOverride ?? createFeedback('warning', `That goal was no longer possible. Lost half a star. New goal: ${nextTarget}.`),
    lastOverseerEvent: snapshot.lastOverseerEvent?.type === 'warning'
      ? {
          ...snapshot.lastOverseerEvent,
          description: `That goal collapsed. Lost half a star. New goal: ${nextTarget}.`,
        }
      : snapshot.lastOverseerEvent,
  };
};

const applyBoardBreak = (
  board: NumberMergeBoard,
  count: number,
  random: () => number,
): { board: NumberMergeBoard; positions: NumberMergePosition[] } => {
  if (count <= 0) {
    return { board, positions: [] };
  }

  const nextBoard = cloneBoard(board);
  const candidates: NumberMergePosition[] = [];

  for (let row = 0; row < NUMBER_MERGE_ROWS; row += 1) {
    for (let col = 0; col < NUMBER_MERGE_COLS; col += 1) {
      if (nextBoard[row][col]?.kind === 'number') {
        candidates.push({ row, col });
      }
    }
  }

  const chosen = choosePositions(candidates, count, random);
  for (const position of chosen) {
    nextBoard[position.row][position.col] = createBrokenTile();
  }

  return { board: nextBoard, positions: chosen };
};

const applyCorruptionPenalty = (
  board: NumberMergeBoard,
  count: number,
  random: () => number,
): { board: NumberMergeBoard; positions: NumberMergePosition[] } => {
  if (count <= 0) {
    return { board, positions: [] };
  }

  const nextBoard = cloneBoard(board);
  const candidates: NumberMergePosition[] = [];
  for (let row = 0; row < NUMBER_MERGE_ROWS; row += 1) {
    for (let col = 0; col < NUMBER_MERGE_COLS; col += 1) {
      if (nextBoard[row][col]?.kind === 'number') {
        candidates.push({ row, col });
      }
    }
  }

  const chosen = choosePositions(candidates, count, random);
  for (const position of chosen) {
    nextBoard[position.row][position.col] = createCorruptTile();
  }

  return { board: nextBoard, positions: chosen };
};

const computeChainWindowMs = (
  difficulty: NumberMergeDifficulty,
  pressureLevel: number,
): number => {
  const preset = getNumberMergeDifficultyPreset(difficulty);
  if (!preset.enableChainWindow) {
    return 0;
  }

  return Math.max(
    preset.chainWindowMinMs,
    preset.chainWindowBaseMs - pressureLevel * preset.chainWindowPressureDecayMs,
  );
};

export const createInitialNumberMergeGame = (
  petType: NumberMergePetType,
  difficulty: NumberMergeDifficulty,
  random: () => number = Math.random,
): NumberMergeGameSnapshot => {
  const preset = getNumberMergeDifficultyPreset(difficulty);
  const board = createInitialBoard(random);
  const turnsRemaining = getSearchWindowTurns(difficulty, random);

  return {
    board,
    score: 0,
    turns: 0,
    combo: 0,
    petType,
    difficulty,
    passiveReadyTurn: null,
    lastMove: null,
    phase: 'playing',
    pressureLevel: 0,
    corruption: 0,
    chainExpiresAt: null,
    chainDurationMs: 0,
    unstableCells: [],
    lastOverseerEvent: null,
    lives: preset.lives,
    maxLives: preset.lives,
    goalStars: NUMBER_MERGE_MAX_GOAL_STARS,
    maxGoalStars: NUMBER_MERGE_MAX_GOAL_STARS,
    warningCount: 0,
    searchTarget: chooseGoalTargetForBoard(board, difficulty, 0, getReachabilityWindow(difficulty, turnsRemaining), random),
    turnsRemaining,
    feedback: createFeedback('neutral', 'Match numbers and aim for the target value.'),
  };
};

export const canResolveMove = (board: NumberMergeBoard, move: NumberMergeMove): boolean => {
  if (!isInsideBoard(move.from) || !isInsideBoard(move.to) || !isAdjacent(move.from, move.to)) {
    return false;
  }

  const origin = getTileAt(board, move.from);
  const destination = getTileAt(board, move.to);
  if (!isNumberTile(origin)) {
    return false;
  }

  return isPlayableDestination(destination);
};

export const resolveMove = (
  snapshot: NumberMergeGameSnapshot,
  move: NumberMergeMove,
  random: () => number = Math.random,
): NumberMergeResolveResult | null => {
  const baseResult = simulateBoardMove(snapshot.board, move);
  if (!baseResult) {
    return null;
  }

  const turnUsed = snapshot.turns + 1;
  if (baseResult.action === 'slide') {
    return {
      action: 'slide',
      board: baseResult.board,
      scoreDelta: 0,
      mergeValue: 0,
      comboCount: 0,
      turnUsed,
      createdTileId: baseResult.createdTileId,
      createdTileValue: baseResult.createdTileValue,
      removedTileIds: [],
      petBonus: null,
      nextPassiveReadyTurn: snapshot.passiveReadyTurn,
      emptyCells: baseResult.emptyCells,
    };
  }

  const petModifier = getPetModifier(snapshot.petType);
  const petResult = petModifier.applyPassive({
    board: baseResult.board,
    createdTileId: baseResult.createdTileId,
    createdTileValue: baseResult.createdTileValue,
    turnUsed,
    passiveReadyTurn: snapshot.passiveReadyTurn,
    random,
  });

  return {
    action: 'merge',
    board: petResult.board,
    scoreDelta: baseResult.scoreDelta,
    mergeValue: baseResult.mergeValue,
    comboCount: baseResult.comboCount,
    turnUsed,
    createdTileId: baseResult.createdTileId,
    createdTileValue: baseResult.createdTileValue,
    removedTileIds: baseResult.removedTileIds,
    petBonus: petResult.bonus,
    nextPassiveReadyTurn: petResult.nextPassiveReadyTurn,
    emptyCells: emptyPositionsOf(petResult.board),
  };
};

const applyPenalty = (
  snapshot: NumberMergeGameSnapshot,
  reason: string,
  random: () => number,
): NumberMergeGameSnapshot => {
  const preset = getNumberMergeDifficultyPreset(snapshot.difficulty);
  const afterBreak = applyBoardBreak(snapshot.board, preset.boardBreakOnPenalty, random);
  const afterCorruption = preset.enableCorruption
    ? applyCorruptionPenalty(afterBreak.board, preset.corruptionOnPenalty, random)
    : { board: afterBreak.board, positions: [] as NumberMergePosition[] };
  const nextLives = Math.max(0, snapshot.lives - 1);
  const nextBoard = releaseLocks(cloneBoard(afterCorruption.board));
  const positions = [...afterBreak.positions, ...afterCorruption.positions];

  let description = reason;
  if (afterCorruption.positions.length > 0) {
    description = `${reason} The Overseer injected corruption.`;
  } else if (afterBreak.positions.length > 0) {
    description = `${reason} One tile cracked under pressure.`;
  }

  const nextTurnsRemaining = getSearchWindowTurns(snapshot.difficulty, random);

  return {
    ...snapshot,
    board: nextBoard,
    phase: nextLives === 0 ? 'lost' : 'playing',
    lives: nextLives,
    warningCount: 0,
    pressureLevel: Math.min(10, snapshot.pressureLevel + 1),
    corruption: Math.min(
      NUMBER_MERGE_MAX_CORRUPTION,
      snapshot.corruption + (preset.enableCorruption ? 10 + afterCorruption.positions.length * 8 : 0),
    ),
    chainExpiresAt: null,
    chainDurationMs: 0,
    unstableCells: [],
    lastOverseerEvent: {
      type: afterCorruption.positions.length > 0 ? 'corrupt_tile' : afterBreak.positions.length > 0 ? 'break_tile' : 'life_loss',
      description,
      positions,
      corruptionDelta: preset.enableCorruption ? 10 + afterCorruption.positions.length * 8 : 0,
    },
    searchTarget: chooseGoalTargetForBoard(
      nextBoard,
      snapshot.difficulty,
      snapshot.turns + 1,
      getReachabilityWindow(snapshot.difficulty, nextTurnsRemaining),
      random,
    ),
    turnsRemaining: nextTurnsRemaining,
    feedback: createFeedback(
      nextLives === 0 ? 'danger' : 'warning',
      nextLives === 0 ? 'You ran out of hearts.' : `Lost 1 heart. ${description}`,
    ),
  };
};

export const applyResolvedMove = (
  snapshot: NumberMergeGameSnapshot,
  resolveResult: NumberMergeResolveResult,
  now: number,
  random: () => number = Math.random,
): NumberMergeGameSnapshot => {
  const preset = getNumberMergeDifficultyPreset(snapshot.difficulty);
  const isTargetHit = resolveResult.action === 'merge'
    && (resolveResult.createdTileValue === snapshot.searchTarget || resolveResult.mergeValue === snapshot.searchTarget);
  let nextBoard = resolveResult.board;
  let nextPhase: NumberMergeGameSnapshot['phase'] = 'playing';
  let chainExpiresAt: number | null = null;
  let chainDurationMs = 0;
  let unstableCells: NumberMergePosition[] = [];
  let nextPressure = snapshot.pressureLevel;
  let lastOverseerEvent: NumberMergeOverseerEvent | null = null;

  if (preset.enableChainWindow && resolveResult.emptyCells.length > 0) {
    unstableCells = resolveResult.emptyCells;
    chainDurationMs = computeChainWindowMs(snapshot.difficulty, snapshot.pressureLevel);
    chainExpiresAt = now + chainDurationMs;
    nextPhase = 'chain_window';
    nextPressure = Math.min(10, snapshot.pressureLevel + 1);
  }

  if (isTargetHit) {
    const nextTurnsRemaining = getSearchWindowTurns(snapshot.difficulty, random);
    return withReachableGoal({
      ...snapshot,
      board: nextBoard,
      score: snapshot.score + resolveResult.scoreDelta + snapshot.searchTarget * 3,
      turns: resolveResult.turnUsed,
      combo: Math.max(snapshot.combo, resolveResult.comboCount + 1),
      passiveReadyTurn: resolveResult.nextPassiveReadyTurn,
      lastMove: resolveResult,
      phase: nextPhase,
      pressureLevel: Math.max(0, nextPressure - 1),
      corruption: Math.max(0, snapshot.corruption - (preset.enableCorruption ? 4 : 0)),
      chainExpiresAt,
      chainDurationMs,
      unstableCells,
      lastOverseerEvent,
      warningCount: 0,
      turnsRemaining: nextTurnsRemaining,
      searchTarget: chooseGoalTargetForBoard(
        nextBoard,
        snapshot.difficulty,
        resolveResult.turnUsed,
        getReachabilityWindow(snapshot.difficulty, nextTurnsRemaining),
        random,
      ),
      feedback: createFeedback('success', `Target ${snapshot.searchTarget} found. Nice recovery.`),
    }, random);
  }

  const nextTurnsRemaining = snapshot.turnsRemaining === null
    ? null
    : Math.max(0, snapshot.turnsRemaining - 1);

  if (snapshot.turnsRemaining !== null) {
    if (nextTurnsRemaining === 0) {
      const failedState: NumberMergeGameSnapshot = {
        ...snapshot,
        board: nextBoard,
        turns: resolveResult.turnUsed,
        combo: Math.max(snapshot.combo, resolveResult.comboCount + 1),
        passiveReadyTurn: resolveResult.nextPassiveReadyTurn,
        lastMove: resolveResult,
        phase: nextPhase,
        chainExpiresAt,
        chainDurationMs,
        unstableCells,
        pressureLevel: nextPressure,
        lastOverseerEvent,
      };

      return withReachableGoal(applyPenalty(
        failedState,
        `You missed target ${snapshot.searchTarget} before the search window closed.`,
        random,
      ), random);
    }

    return withReachableGoal({
      ...snapshot,
      board: nextBoard,
      score: snapshot.score + resolveResult.scoreDelta,
      turns: resolveResult.turnUsed,
      combo: Math.max(snapshot.combo, resolveResult.comboCount + 1),
      passiveReadyTurn: resolveResult.nextPassiveReadyTurn,
      lastMove: resolveResult,
      phase: nextPhase,
      pressureLevel: nextPressure,
      chainExpiresAt,
      chainDurationMs,
      unstableCells,
      lastOverseerEvent,
      turnsRemaining: nextTurnsRemaining,
      feedback: createFeedback(
        nextTurnsRemaining === 1 ? 'warning' : 'neutral',
        resolveResult.action === 'slide'
          ? nextTurnsRemaining === 1
            ? `You slid into place. One turn left to make ${snapshot.searchTarget}.`
            : `Slide used a turn. You still need ${snapshot.searchTarget}.`
          : nextTurnsRemaining === 1
            ? `One turn left to make ${snapshot.searchTarget}.`
            : `Still searching for ${snapshot.searchTarget}.`,
      ),
    }, random);
  }

  const nextWarningCount = snapshot.warningCount + 1;
  if (preset.warningBeforePenalty && nextWarningCount < preset.missesBeforeLifeLoss) {
    return withReachableGoal({
      ...snapshot,
      board: nextBoard,
      score: snapshot.score + resolveResult.scoreDelta,
      turns: resolveResult.turnUsed,
      combo: Math.max(snapshot.combo, resolveResult.comboCount + 1),
      passiveReadyTurn: resolveResult.nextPassiveReadyTurn,
      lastMove: resolveResult,
      phase: nextPhase,
      pressureLevel: nextPressure,
      chainExpiresAt,
      chainDurationMs,
      unstableCells,
      lastOverseerEvent: {
        type: 'warning',
        description: `That move did not make ${snapshot.searchTarget}. One more miss costs a heart.`,
        positions: [],
        corruptionDelta: 0,
      },
      warningCount: nextWarningCount,
      feedback: createFeedback('warning', `Warning: you still need ${snapshot.searchTarget}.`),
    }, random);
  }

  const failedState: NumberMergeGameSnapshot = {
    ...snapshot,
    board: nextBoard,
    score: snapshot.score + resolveResult.scoreDelta,
    turns: resolveResult.turnUsed,
    combo: Math.max(snapshot.combo, resolveResult.comboCount + 1),
    passiveReadyTurn: resolveResult.nextPassiveReadyTurn,
    lastMove: resolveResult,
    phase: nextPhase,
    pressureLevel: nextPressure,
    chainExpiresAt,
    chainDurationMs,
    unstableCells,
    lastOverseerEvent,
    warningCount: nextWarningCount,
  };

  return withReachableGoal(applyPenalty(
    failedState,
    `That move did not make ${snapshot.searchTarget}.`,
    random,
  ), random);
};

export const applyOverseerStrike = (
  snapshot: NumberMergeGameSnapshot,
  random: () => number = Math.random,
): NumberMergeGameSnapshot => {
  const preset = getNumberMergeDifficultyPreset(snapshot.difficulty);
  if (!preset.enableChainWindow || snapshot.phase !== 'chain_window' || snapshot.unstableCells.length === 0) {
    return snapshot;
  }

  if (!preset.enableCorruption) {
    return withReachableGoal({
      ...snapshot,
      phase: 'playing',
      chainExpiresAt: null,
      chainDurationMs: 0,
      unstableCells: [],
      board: releaseLocks(cloneBoard(snapshot.board)),
      lastOverseerEvent: {
        type: 'warning',
        description: 'The Overseer forced the board to close up.',
        positions: snapshot.unstableCells,
        corruptionDelta: 0,
      },
      feedback: createFeedback('warning', 'You hesitated. The window snapped shut.'),
    }, random);
  }

  const board = releaseLocks(cloneBoard(snapshot.board));
  const strikeCount = preset.overseerAggression >= 0.95 ? 2 : 1;
  const unstableTargets = choosePositions(snapshot.unstableCells, strikeCount, random);
  for (const target of unstableTargets) {
    board[target.row][target.col] = createCorruptTile();
  }

  return withReachableGoal({
    ...snapshot,
    board,
    phase: 'overseer_strike',
    pressureLevel: Math.min(10, snapshot.pressureLevel + 1),
    corruption: Math.min(NUMBER_MERGE_MAX_CORRUPTION, snapshot.corruption + preset.corruptionPerStrike),
    chainExpiresAt: null,
    chainDurationMs: 0,
    unstableCells: [],
    lastOverseerEvent: {
      type: 'claim_gap',
      description: unstableTargets.length > 1
        ? 'The Overseer flooded your open space with corruption.'
        : 'The Overseer claimed your open space.',
      positions: unstableTargets,
      corruptionDelta: preset.corruptionPerStrike,
    },
    feedback: createFeedback('danger', 'Too slow. The Overseer struck your open lane.'),
  }, random);
};

export const collapseBoardAfterStrike = (
  snapshot: NumberMergeGameSnapshot,
): NumberMergeGameSnapshot => ({
  ...snapshot,
  board: releaseLocks(cloneBoard(snapshot.board)),
  phase: snapshot.lives <= 0 || snapshot.corruption >= NUMBER_MERGE_MAX_CORRUPTION ? 'lost' : 'playing',
});
