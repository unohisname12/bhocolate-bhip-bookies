import { useCallback, useEffect, useMemo, useState } from 'react';
import { getNumberMergeDifficultyPreset } from './difficulty';
import {
  applyOverseerStrike,
  applyResolvedMove,
  collapseBoardAfterStrike,
  createInitialNumberMergeGame,
  resolveMove,
} from './game';
import type {
  NumberMergeDifficulty,
  NumberMergeGameSnapshot,
  NumberMergeOverseerEvent,
  NumberMergePetType,
  NumberMergePosition,
} from './types';

export interface NumberMergeViewState extends NumberMergeGameSnapshot {
  selected: NumberMergePosition | null;
  now: number;
  chainTimeLeftMs: number;
}

const samePosition = (a: NumberMergePosition | null, b: NumberMergePosition | null): boolean =>
  Boolean(a && b && a.row === b.row && a.col === b.col);

export const useNumberMergeGame = (
  petType: NumberMergePetType,
  difficulty: NumberMergeDifficulty,
) => {
  const [game, setGame] = useState<NumberMergeGameSnapshot>(() =>
    createInitialNumberMergeGame(petType, difficulty));
  const [selected, setSelected] = useState<NumberMergePosition | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setGame(createInitialNumberMergeGame(petType, difficulty));
    setSelected(null);
    setNow(Date.now());
  }, [petType, difficulty]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  const reset = useCallback(() => {
    setGame(createInitialNumberMergeGame(petType, difficulty));
    setSelected(null);
    setNow(Date.now());
  }, [petType, difficulty]);

  const select = useCallback((position: NumberMergePosition) => {
    setSelected((current) => (samePosition(current, position) ? null : position));
  }, []);

  const playMove = useCallback((from: NumberMergePosition, to: NumberMergePosition) => {
    let applied = false;

    setGame((current) => {
      if (current.phase === 'lost') {
        return current;
      }

      const resolved = resolveMove(current, { from, to });
      if (!resolved) {
        return current;
      }

      applied = true;
      return applyResolvedMove(current, resolved, Date.now());
    });

    if (applied) {
      setSelected(null);
    }

    return applied;
  }, []);

  useEffect(() => {
    const preset = getNumberMergeDifficultyPreset(difficulty);
    if (!preset.enableChainWindow || game.phase !== 'chain_window' || game.chainExpiresAt === null) {
      return;
    }

    if (now < game.chainExpiresAt) {
      return;
    }

    setGame((current) => {
      const struck = applyOverseerStrike(current);
      if (struck.phase === 'lost') {
        return struck;
      }

      return collapseBoardAfterStrike(struck);
    });
    setSelected(null);
  }, [difficulty, game, now]);

  const acknowledgeOverseerEvent = useCallback(() => {
    setGame((current) => {
      if (!current.lastOverseerEvent || current.phase === 'lost') {
        return current;
      }

      return {
        ...current,
        lastOverseerEvent: null as NumberMergeOverseerEvent | null,
      };
    });
  }, []);

  const chainTimeLeftMs = Math.max(0, (game.chainExpiresAt ?? 0) - now);

  const viewState = useMemo<NumberMergeViewState>(() => ({
    ...game,
    selected,
    now,
    chainTimeLeftMs,
  }), [game, selected, now, chainTimeLeftMs]);

  return {
    state: viewState,
    select,
    playMove,
    reset,
    acknowledgeOverseerEvent,
  };
};
