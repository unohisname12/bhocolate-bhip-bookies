// ---------------------------------------------------------------------------
// MomentumSystem — Board helpers & BFS pathfinding
// ---------------------------------------------------------------------------

import type {
  MomentumPiece, BoardGrid, BoardPosition, ValidMove, Team,
  ActiveMomentumState, MomentumGameEvent, FlashTriggerReason,
  FlashChoice, FusionTarget, MomentumRewards, PieceRank,
  MomentumDifficulty,
} from '../../types/momentum';
import {
  MOMENTUM_BOARD, RANK_ENERGY, RANK4_DURATION,
  MOMENTUM_REWARDS, STARTING_COLUMNS, STARTING_RANKS,
  PLAYER_START_ROW, ENEMY_START_ROW, CLUTCH_EVENT,
  DIFFICULTY_SETTINGS,
} from '../../config/momentumConfig';

// ---------------------------------------------------------------------------
// Board Helpers
// ---------------------------------------------------------------------------

/** Build a 5x5 grid from pieces. grid[row][col] = pieceId or null */
export function buildBoard(pieces: MomentumPiece[]): BoardGrid {
  const grid: BoardGrid = Array.from({ length: MOMENTUM_BOARD.gridSize }, () =>
    Array(MOMENTUM_BOARD.gridSize).fill(null),
  );
  for (const piece of pieces) {
    grid[piece.position.y][piece.position.x] = piece.id;
  }
  return grid;
}

/** Check if position is within 0..gridSize-1 bounds */
export function isInBounds(pos: BoardPosition): boolean {
  return (
    pos.x >= 0 &&
    pos.x < MOMENTUM_BOARD.gridSize &&
    pos.y >= 0 &&
    pos.y < MOMENTUM_BOARD.gridSize
  );
}

/** Get the piece at a position, or null */
export function getPieceAt(
  pieces: MomentumPiece[],
  pos: BoardPosition,
): MomentumPiece | null {
  return pieces.find((p) => p.position.x === pos.x && p.position.y === pos.y) ?? null;
}

// ---------------------------------------------------------------------------
// BFS Pathfinding
// ---------------------------------------------------------------------------

/** Cardinal direction offsets (up, down, left, right — no diagonals) */
const DIRECTIONS: BoardPosition[] = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 },  // right
];

/**
 * Compute all valid moves for a piece using BFS.
 *
 * Algorithm:
 * - Start at piece's position with cost=0
 * - BFS explores 4 cardinal neighbors at cost+1
 * - For each neighbor:
 *   - Skip if out of bounds or already visited
 *   - Skip if cost+1 > piece.energy (can't afford)
 *   - Friendly piece: mark visited, do NOT add as move, do NOT expand
 *   - Enemy piece: add as ATTACK move, mark visited, do NOT expand
 *   - Empty: add as regular move, mark visited, expand (add to queue)
 * - BFS guarantees minimum-cost paths
 */
export function computeValidMoves(
  piece: MomentumPiece,
  pieces: MomentumPiece[],
): ValidMove[] {
  if (piece.energy <= 0) return [];

  const moves: ValidMove[] = [];
  const size = MOMENTUM_BOARD.gridSize;

  // visited[row][col] = true if already processed
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  // BFS queue: [x, y, cost]
  const queue: Array<[number, number, number]> = [];

  // Start at piece's own position
  visited[piece.position.y][piece.position.x] = true;
  queue.push([piece.position.x, piece.position.y, 0]);

  let head = 0; // manual queue pointer for efficiency

  while (head < queue.length) {
    const [cx, cy, cost] = queue[head++];

    for (const dir of DIRECTIONS) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      const nextCost = cost + 1;

      // Out of bounds
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

      // Already visited
      if (visited[ny][nx]) continue;

      // Too expensive
      if (nextCost > piece.energy) continue;

      // Mark visited
      visited[ny][nx] = true;

      // Check what's at this position
      const occupant = getPieceAt(pieces, { x: nx, y: ny });

      if (occupant === null) {
        // Empty cell — add as regular move, expand
        moves.push({
          destination: { x: nx, y: ny },
          energyCost: nextCost,
          isAttack: false,
          targetPieceId: null,
        });
        queue.push([nx, ny, nextCost]);
      } else if (occupant.team === piece.team) {
        // Friendly piece — blocks path, do NOT add as move, do NOT expand
        // (already marked visited so we won't try again)
      } else {
        // Enemy piece — add as attack move, do NOT expand (can't pass through)
        moves.push({
          destination: { x: nx, y: ny },
          energyCost: nextCost,
          isAttack: true,
          targetPieceId: occupant.id,
        });
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------------------------
// Energy System
// ---------------------------------------------------------------------------

/** Grant energy to all pieces of the given team, capped by rank max */
export function grantEnergy(pieces: MomentumPiece[], team: Team): MomentumPiece[] {
  return pieces.map(p => {
    if (p.team !== team) return p;
    const config = RANK_ENERGY[p.rank];
    const newEnergy = Math.min(p.energy + config.gain, config.max);
    return { ...p, energy: newEnergy };
  });
}

/** Decay rank4 timers for pieces of the given team. Returns updated pieces + events */
export function decayRank4(
  pieces: MomentumPiece[],
  team: Team,
): { pieces: MomentumPiece[]; events: MomentumGameEvent[] } {
  const events: MomentumGameEvent[] = [];
  const updated = pieces.map(p => {
    if (p.team !== team || !p.isTemporaryRank4) return p;
    const remaining = p.rank4TurnsRemaining - 1;
    if (remaining <= 0) {
      events.push({ type: 'rank4_expired', pieceId: p.id });
      return {
        ...p,
        rank: (p.previousRank ?? 3) as PieceRank,
        isTemporaryRank4: false,
        rank4TurnsRemaining: 0,
        previousRank: null,
      };
    }
    return { ...p, rank4TurnsRemaining: remaining };
  });
  return { pieces: updated, events };
}

// ---------------------------------------------------------------------------
// Game Init
// ---------------------------------------------------------------------------

/** Create the initial game state with starting positions */
export function initMomentum(difficulty: MomentumDifficulty = 'medium'): ActiveMomentumState {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const pieces: MomentumPiece[] = [];

  // Player pieces (bottom row)
  for (let i = 0; i < MOMENTUM_BOARD.piecesPerSide; i++) {
    pieces.push({
      id: `p${i + 1}`,
      team: 'player',
      rank: STARTING_RANKS[i],
      energy: 0,
      position: { x: STARTING_COLUMNS[i], y: PLAYER_START_ROW },
      isTemporaryRank4: false,
      rank4TurnsRemaining: 0,
      previousRank: null,
    });
  }

  // Enemy pieces (top row) — ranks vary by difficulty
  for (let i = 0; i < MOMENTUM_BOARD.piecesPerSide; i++) {
    pieces.push({
      id: `e${i + 1}`,
      team: 'enemy',
      rank: settings.enemyRanks[i],
      energy: 0,
      position: { x: STARTING_COLUMNS[i], y: ENEMY_START_ROW },
      isTemporaryRank4: false,
      rank4TurnsRemaining: 0,
      previousRank: null,
    });
  }

  const energized = grantEnergy(pieces, 'player');

  return {
    active: true,
    difficulty,
    phase: 'player_select',
    turnCount: 1,
    activeTeam: 'player',
    pieces: energized,
    board: buildBoard(energized),
    selectedPieceId: null,
    validMoves: [],
    flashPending: null,
    flashEligibleForFusion: false,
    clutchTile: null,
    clutchCooldown: 0,
    log: [],
    rewards: null,
    lastEvent: null,
  };
}

// ---------------------------------------------------------------------------
// Piece Selection
// ---------------------------------------------------------------------------

/** Select a piece and compute its valid moves */
export function selectPiece(
  state: ActiveMomentumState,
  pieceId: string,
): ActiveMomentumState {
  const piece = state.pieces.find(p => p.id === pieceId);
  if (!piece || piece.team !== state.activeTeam) return state;
  const moves = computeValidMoves(piece, state.pieces);
  return {
    ...state,
    phase: 'player_move',
    selectedPieceId: pieceId,
    validMoves: moves,
  };
}

/** Deselect the current piece */
export function deselectPiece(
  state: ActiveMomentumState,
): ActiveMomentumState {
  return {
    ...state,
    phase: 'player_select',
    selectedPieceId: null,
    validMoves: [],
  };
}

// ---------------------------------------------------------------------------
// Move Execution + Combat
// ---------------------------------------------------------------------------

/** Begin moving a piece. For attacks, keeps attacker in place (resolveCombat handles position). */
export function beginMove(
  state: ActiveMomentumState,
  moveIndex: number,
): ActiveMomentumState {
  const move = state.validMoves[moveIndex];
  if (!move) return state;
  const piece = state.pieces.find(p => p.id === state.selectedPieceId);
  if (!piece) return state;

  if (move.isAttack) {
    // Attack: deduct energy, DON'T move yet (resolveCombat handles position + removal)
    const updatedPieces = state.pieces.map(p => {
      if (p.id !== piece.id) return p;
      return { ...p, energy: p.energy - move.energyCost };
    });
    return {
      ...state,
      pieces: updatedPieces,
      phase: 'animating_attack',
      lastEvent: {
        type: 'piece_attacked',
        attackerId: piece.id,
        defenderId: move.targetPieceId!,
        position: move.destination,
      },
    };
  } else {
    // Regular move: update position and deduct energy
    const updatedPieces = state.pieces.map(p => {
      if (p.id !== piece.id) return p;
      return { ...p, position: move.destination, energy: p.energy - move.energyCost };
    });
    let result: ActiveMomentumState = {
      ...state,
      pieces: updatedPieces,
      board: buildBoard(updatedPieces),
      phase: 'animating_move',
      lastEvent: {
        type: 'piece_moved',
        pieceId: piece.id,
        from: piece.position,
        to: move.destination,
      },
      log: [
        ...state.log,
        {
          turn: state.turnCount,
          actor: state.activeTeam,
          message: `${piece.id} moves to (${move.destination.x},${move.destination.y})`,
        },
      ],
    };
    // Check if player piece landed on clutch tile
    if (state.clutchTile && piece.team === 'player' &&
        move.destination.x === state.clutchTile.x && move.destination.y === state.clutchTile.y) {
      result = claimClutchTile(result, piece.id);
    }
    return result;
  }
}

/** Resolve combat after animating_attack. Removes defender, moves attacker, checks promotion + flash. */
export function resolveCombat(state: ActiveMomentumState): ActiveMomentumState {
  if (!state.lastEvent || state.lastEvent.type !== 'piece_attacked') return state;

  const { attackerId, defenderId, position } = state.lastEvent;
  const attacker = state.pieces.find(p => p.id === attackerId);
  const defender = state.pieces.find(p => p.id === defenderId);
  if (!attacker || !defender) return state;

  // Calculate energy before the attack (beginMove already deducted cost)
  const attackMove = state.validMoves.find(m => m.targetPieceId === defenderId);
  const energyCost = attackMove?.energyCost ?? 0;
  const energyBefore = attacker.energy + energyCost;

  // Remove defender, move attacker to target position
  let updatedPieces = state.pieces
    .filter(p => p.id !== defenderId)
    .map(p => {
      if (p.id !== attackerId) return p;
      return { ...p, position };
    });

  // Check rank promotion (underdog: lower rank beats higher -> +1 rank, max 3)
  let promotionEvent: MomentumGameEvent | null = null;
  if (attacker.rank < defender.rank && attacker.rank < 3) {
    const newRank = (attacker.rank + 1) as PieceRank;
    promotionEvent = {
      type: 'piece_promoted',
      pieceId: attackerId,
      fromRank: attacker.rank,
      toRank: newRank,
    };
    updatedPieces = updatedPieces.map(p => {
      if (p.id !== attackerId) return p;
      return { ...p, rank: newRank };
    });
  }

  // Check flash trigger (player attacks only)
  const flash =
    attacker.team === 'player'
      ? checkFlashTrigger(attacker, defender, energyCost, energyBefore)
      : { triggered: false, reason: null };

  const newBoard = buildBoard(updatedPieces);
  const captureEvent: MomentumGameEvent = {
    type: 'piece_captured',
    capturedId: defenderId,
    capturedBy: attackerId,
  };

  const logEntry = {
    turn: state.turnCount,
    actor: state.activeTeam,
    message: `${attackerId} captures ${defenderId}!`,
  };

  if (flash.triggered && flash.reason) {
    // Check if fusion is eligible (>=2 rank 2 player pieces)
    const fusionEligible = canFuse(updatedPieces, 'player');
    return {
      ...state,
      pieces: updatedPieces,
      board: newBoard,
      phase: 'flash_sequence',
      flashPending: {
        triggerReason: flash.reason,
        attackerPieceId: attackerId,
        capturedPieceId: defenderId,
      },
      flashEligibleForFusion: fusionEligible,
      lastEvent: { type: 'flash_triggered', reason: flash.reason, position },
      log: [...state.log, logEntry],
      selectedPieceId: null,
      validMoves: [],
    };
  }

  return {
    ...state,
    pieces: updatedPieces,
    board: newBoard,
    phase: state.activeTeam === 'player' ? 'ai_turn' : 'player_select',
    lastEvent: promotionEvent ?? captureEvent,
    log: [...state.log, logEntry],
    selectedPieceId: null,
    validMoves: [],
  };
}

// ---------------------------------------------------------------------------
// Flash System
// ---------------------------------------------------------------------------

/** Check if a flash moment is triggered */
export function checkFlashTrigger(
  attacker: MomentumPiece,
  defender: MomentumPiece,
  energySpent: number,
  energyBefore: number,
): { triggered: boolean; reason: FlashTriggerReason | null } {
  const exactEnergy = energyBefore === energySpent; // piece used ALL its energy
  const underdog = attacker.rank < defender.rank;

  if (exactEnergy) return { triggered: true, reason: 'exact_energy_kill' };
  if (underdog) return { triggered: true, reason: 'underdog_win' };
  return { triggered: false, reason: null };
}

/** Check if fusion is possible (>=2 rank 2 pieces on team) */
export function canFuse(pieces: MomentumPiece[], team: Team): boolean {
  return pieces.filter(p => p.team === team && p.rank === 2).length >= 2;
}

/** Apply the player's flash choice */
export function applyFlashChoice(
  state: ActiveMomentumState,
  choice: FlashChoice,
  fusionTarget?: FusionTarget,
): ActiveMomentumState {
  if (!state.flashPending) return state;

  let updatedPieces = [...state.pieces];
  let event: MomentumGameEvent;

  if (choice === 'upgrade') {
    // Upgrade the attacker piece
    const attacker = updatedPieces.find(
      p => p.id === state.flashPending!.attackerPieceId,
    );
    if (!attacker) return state;

    if (attacker.rank === 3) {
      // Rank 3 -> temp Rank 4
      updatedPieces = updatedPieces.map(p => {
        if (p.id !== attacker.id) return p;
        return {
          ...p,
          rank: 4 as PieceRank,
          isTemporaryRank4: true,
          rank4TurnsRemaining: RANK4_DURATION,
          previousRank: 3 as PieceRank,
          energy: Math.min(p.energy, RANK_ENERGY[4].max),
        };
      });
      event = {
        type: 'flash_upgrade',
        pieceId: attacker.id,
        newRank: 4 as PieceRank,
      };
    } else {
      // Rank 1->2 or 2->3 (permanent)
      const newRank = (attacker.rank + 1) as PieceRank;
      updatedPieces = updatedPieces.map(p => {
        if (p.id !== attacker.id) return p;
        return { ...p, rank: newRank };
      });
      event = { type: 'flash_upgrade', pieceId: attacker.id, newRank };
    }
  } else {
    // Fusion: combine two rank 2 pieces into one rank 3
    if (!fusionTarget) return state;
    const { pieceId1, pieceId2, resultPosition } = fusionTarget;

    // Verify both pieces exist and are rank 2
    const p1 = updatedPieces.find(p => p.id === pieceId1);
    const p2 = updatedPieces.find(p => p.id === pieceId2);
    if (!p1 || !p2 || p1.rank !== 2 || p2.rank !== 2) return state;

    // Remove both pieces, create new rank 3
    updatedPieces = updatedPieces.filter(
      p => p.id !== pieceId1 && p.id !== pieceId2,
    );
    const newId = `f${Date.now()}`;
    updatedPieces.push({
      id: newId,
      team: 'player',
      rank: 3 as PieceRank,
      energy: 0,
      position: resultPosition,
      isTemporaryRank4: false,
      rank4TurnsRemaining: 0,
      previousRank: null,
    });
    event = {
      type: 'flash_fusion',
      consumed: [pieceId1, pieceId2],
      resultId: newId,
      position: resultPosition,
    };
  }

  return {
    ...state,
    pieces: updatedPieces,
    board: buildBoard(updatedPieces),
    phase: 'animating_flash',
    flashPending: null,
    flashEligibleForFusion: false,
    lastEvent: event,
    log: [
      ...state.log,
      {
        turn: state.turnCount,
        actor: 'player',
        message: choice === 'upgrade' ? 'FLASH UPGRADE!' : 'FLASH FUSION!',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Clutch Event System
// ---------------------------------------------------------------------------

/** Check if a clutch tile should spawn at the start of the player's turn */
export function checkClutchTrigger(state: ActiveMomentumState): ActiveMomentumState {
  // Already has a clutch tile, or on cooldown
  if (state.clutchTile || state.clutchCooldown > 0) return state;

  const playerCount = state.pieces.filter(p => p.team === 'player').length;
  const enemyCount = state.pieces.filter(p => p.team === 'enemy').length;

  if (enemyCount - playerCount < CLUTCH_EVENT.pieceDeficit) return state;

  // Find empty tiles
  const emptyTiles: BoardPosition[] = [];
  for (let y = 0; y < MOMENTUM_BOARD.gridSize; y++) {
    for (let x = 0; x < MOMENTUM_BOARD.gridSize; x++) {
      if (!state.board[y][x]) {
        emptyTiles.push({ x, y });
      }
    }
  }

  if (emptyTiles.length === 0) return state;

  const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];

  return {
    ...state,
    clutchTile: tile,
    lastEvent: { type: 'clutch_triggered', position: tile },
    log: [
      ...state.log,
      { turn: state.turnCount, actor: 'player', message: 'Clutch tile appears!' },
    ],
  };
}

/** Apply clutch reward when a player piece moves onto the clutch tile */
export function claimClutchTile(
  state: ActiveMomentumState,
  pieceId: string,
): ActiveMomentumState {
  if (!state.clutchTile) return state;

  const piece = state.pieces.find(p => p.id === pieceId);
  if (!piece || piece.team !== 'player') return state;

  // Check if piece landed on the clutch tile
  if (piece.position.x !== state.clutchTile.x || piece.position.y !== state.clutchTile.y) {
    return state;
  }

  // Apply +1 rank if eligible
  let updatedPieces = state.pieces;
  let event: MomentumGameEvent;

  if (piece.rank <= CLUTCH_EVENT.maxUpgradeRank) {
    const newRank = (piece.rank + 1) as PieceRank;
    if (piece.rank === 3) {
      // Rank 3 -> temp Rank 4
      updatedPieces = state.pieces.map(p => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          rank: 4 as PieceRank,
          isTemporaryRank4: true,
          rank4TurnsRemaining: RANK4_DURATION,
          previousRank: 3 as PieceRank,
          energy: Math.min(p.energy, RANK_ENERGY[4].max),
        };
      });
      event = { type: 'clutch_claimed', pieceId, newRank: 4 as PieceRank };
    } else {
      updatedPieces = state.pieces.map(p => {
        if (p.id !== pieceId) return p;
        return { ...p, rank: newRank };
      });
      event = { type: 'clutch_claimed', pieceId, newRank };
    }
  } else {
    // Already at max rank — no upgrade, but still consume the tile
    event = { type: 'clutch_claimed', pieceId, newRank: piece.rank };
  }

  return {
    ...state,
    pieces: updatedPieces,
    board: buildBoard(updatedPieces),
    clutchTile: null,
    clutchCooldown: CLUTCH_EVENT.cooldownTurns,
    lastEvent: event,
    log: [
      ...state.log,
      { turn: state.turnCount, actor: 'player', message: `${pieceId} claims clutch tile — rank up!` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Turn Management
// ---------------------------------------------------------------------------

/** Calculate rewards for winning */
export function calculateRewards(state: ActiveMomentumState): MomentumRewards {
  const turnBonus = Math.max(
    0,
    (DIFFICULTY_SETTINGS[state.difficulty].maxTurns - state.turnCount) * MOMENTUM_REWARDS.perTurnBonus,
  );
  const shardBonus = MOMENTUM_REWARDS.difficultyShardBonus[state.difficulty] ?? 0;
  return {
    tokens: MOMENTUM_REWARDS.baseTokens + turnBonus,
    xp: MOMENTUM_REWARDS.baseXP,
    shards: MOMENTUM_REWARDS.baseShards + shardBonus,
  };
}

/** Check win/loss condition */
export function checkWinCondition(
  state: ActiveMomentumState,
): ActiveMomentumState {
  const playerPieces = state.pieces.filter(p => p.team === 'player');
  const enemyPieces = state.pieces.filter(p => p.team === 'enemy');

  if (enemyPieces.length === 0) {
    return {
      ...state,
      phase: 'victory',
      lastEvent: { type: 'game_won' },
      rewards: calculateRewards(state),
    };
  }
  if (playerPieces.length === 0 || state.turnCount >= DIFFICULTY_SETTINGS[state.difficulty].maxTurns) {
    return {
      ...state,
      phase: 'defeat',
      lastEvent: { type: 'game_lost' },
    };
  }
  return state;
}

/** Start the next turn (switch teams, grant energy, decay rank4, check clutch) */
export function startNextTurn(
  state: ActiveMomentumState,
): ActiveMomentumState {
  const nextTeam: Team = state.activeTeam === 'player' ? 'enemy' : 'player';
  const nextTurn = nextTeam === 'player' ? state.turnCount + 1 : state.turnCount;

  let pieces = grantEnergy(state.pieces, nextTeam);
  const decay = decayRank4(pieces, nextTeam);
  pieces = decay.pieces;

  // Decrement clutch cooldown on player turn start
  const clutchCooldown = nextTeam === 'player'
    ? Math.max(0, state.clutchCooldown - 1)
    : state.clutchCooldown;

  let result: ActiveMomentumState = {
    ...state,
    pieces,
    board: buildBoard(pieces),
    activeTeam: nextTeam,
    turnCount: nextTurn,
    phase: nextTeam === 'player' ? 'player_select' : 'ai_turn',
    selectedPieceId: null,
    validMoves: [],
    clutchCooldown,
    lastEvent: decay.events.length > 0 ? decay.events[0] : null,
  };

  // Check clutch trigger at start of player turn
  if (nextTeam === 'player') {
    result = checkClutchTrigger(result);
  }

  return result;
}

/** Skip the current turn */
export function skipTurn(state: ActiveMomentumState): ActiveMomentumState {
  const withLog = {
    ...state,
    lastEvent: { type: 'turn_skipped' as const, team: state.activeTeam },
    log: [
      ...state.log,
      {
        turn: state.turnCount,
        actor: state.activeTeam,
        message: `${state.activeTeam} skips turn`,
      },
    ],
  };
  return startNextTurn(withLog);
}

/** Advance state after an animation phase completes */
export function advanceAfterAnimation(
  state: ActiveMomentumState,
): ActiveMomentumState {
  switch (state.phase) {
    case 'animating_move': {
      // Non-attack move done -> check win, then switch turns
      const afterWin = checkWinCondition(state);
      if (afterWin.phase === 'victory' || afterWin.phase === 'defeat')
        return afterWin;
      return startNextTurn(afterWin);
    }
    case 'animating_attack': {
      // Attack animation done -> resolve combat, then check win
      const afterCombat = resolveCombat(state);
      if (afterCombat.phase === 'flash_sequence') return afterCombat;
      const afterWin = checkWinCondition(afterCombat);
      if (afterWin.phase === 'victory' || afterWin.phase === 'defeat')
        return afterWin;
      return afterCombat;
    }
    case 'animating_flash': {
      // Flash reward animation done -> check win, then switch turns
      const afterWin = checkWinCondition(state);
      if (afterWin.phase === 'victory' || afterWin.phase === 'defeat')
        return afterWin;
      return startNextTurn(afterWin);
    }
    case 'animating_ai': {
      // AI move animation done — if it was an attack, resolve combat first
      if (state.lastEvent?.type === 'piece_attacked') {
        const afterCombat = resolveCombat(state);
        const afterWin = checkWinCondition(afterCombat);
        if (afterWin.phase === 'victory' || afterWin.phase === 'defeat')
          return afterWin;
        // resolveCombat sets phase to player_select for enemy attacks.
        // We still need startNextTurn to grant energy to the player.
        return startNextTurn(afterWin);
      }
      // Non-attack AI move -> check win, then start player turn
      const afterWin = checkWinCondition(state);
      if (afterWin.phase === 'victory' || afterWin.phase === 'defeat')
        return afterWin;
      return startNextTurn(afterWin);
    }
    default:
      return state;
  }
}
