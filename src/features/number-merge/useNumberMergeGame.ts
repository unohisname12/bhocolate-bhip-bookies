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
      if (!document.hidden) setNow(Date.now());
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let hiddenAt: number | null = document.hidden ? Date.now() : null;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const pausedMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      setGame(current => current.chainExpiresAt === null ? current : {
        ...current, chainExpiresAt: current.chainExpiresAt + pausedMs,
      });
      setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
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
    if (game.phase === 'lost' || game.phase === 'won') return false;
    const resolved = resolveMove(game, { from, to });
    if (!resolved) return false;
    setGame(current => current === game ? applyResolvedMove(current, resolved, Date.now()) : current);
    setSelected(null);
    return true;
  }, [game]);

  useEffect(() => {
    const preset = getNumberMergeDifficultyPreset(difficulty);
    if (document.hidden || !preset.enableChainWindow || game.phase !== 'chain_window' || game.chainExpiresAt === null) {
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
