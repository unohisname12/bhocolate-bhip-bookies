import type {
  NumberMergeBoard,
  NumberMergePetBonus,
  NumberMergePetType,
} from './types';

export interface PetPassiveContext {
  board: NumberMergeBoard;
  createdTileId: string | null;
  createdTileValue: number;
  turnUsed: number;
  passiveReadyTurn: number | null;
  random: () => number;
}

export interface PetPassiveResult {
  board: NumberMergeBoard;
  bonus: NumberMergePetBonus | null;
  nextPassiveReadyTurn: number | null;
}

export interface NumberMergePetModifier {
  id: string;
  name: string;
  description: string;
  applyPassive: (context: PetPassiveContext) => PetPassiveResult;
}

const cloneBoard = (board: NumberMergeBoard): NumberMergeBoard => board.map((row) => row.slice());

const chooseRandomIndex = (length: number, random: () => number): number =>
  Math.max(0, Math.min(length - 1, Math.floor(random() * length)));

const defaultModifier: NumberMergePetModifier = {
  id: 'default',
  name: 'No Passive',
  description: 'No extra effect.',
  applyPassive: ({ board, passiveReadyTurn }) => ({
    board,
    bonus: null,
    nextPassiveReadyTurn: passiveReadyTurn,
  }),
};

const blueKoalaModifier: NumberMergePetModifier = {
  id: 'koala_sprite',
  name: 'Blue Koala',
  description: 'Every few turns, landing exactly 10 upgrades one random low tile by +1.',
  applyPassive: ({
    board,
    createdTileValue,
    turnUsed,
    passiveReadyTurn,
    random,
  }) => {
    const isReady = passiveReadyTurn === null || turnUsed >= passiveReadyTurn;

    if (!isReady || createdTileValue !== 10) {
      return {
        board,
        bonus: null,
        nextPassiveReadyTurn: passiveReadyTurn,
      };
    }

    const candidates = board
      .flat()
      .filter((tile): tile is NonNullable<typeof tile> => Boolean(tile && tile.kind === 'number' && tile.value <= 4));
    if (candidates.length === 0) {
      return {
        board,
        bonus: {
          label: 'Blue Koala',
          description: 'Exact 10 reached, but there was nothing small to boost.',
          affectedTileId: null,
        },
        nextPassiveReadyTurn: turnUsed + 4,
      };
    }

    const chosen = candidates[chooseRandomIndex(candidates.length, random)];
    const nextBoard = cloneBoard(board);

    for (let rowIndex = 0; rowIndex < nextBoard.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < nextBoard[rowIndex].length; colIndex += 1) {
        const tile = nextBoard[rowIndex][colIndex];
        if (tile?.id === chosen.id) {
          nextBoard[rowIndex][colIndex] = { ...tile, value: tile.value + 1 };
          return {
            board: nextBoard,
            bonus: {
              label: 'Blue Koala',
              description: `Exact 10! Blue Koala nudged a ${tile.value} into ${tile.value + 1}.`,
              affectedTileId: tile.id,
            },
            nextPassiveReadyTurn: turnUsed + 4,
          };
        }
      }
    }

    return {
      board,
      bonus: null,
      nextPassiveReadyTurn: turnUsed + 4,
    };
  },
};

export const getPetModifier = (petType: NumberMergePetType): NumberMergePetModifier => {
  if (petType === 'koala_sprite') {
    return blueKoalaModifier;
  }

  return defaultModifier;
};
