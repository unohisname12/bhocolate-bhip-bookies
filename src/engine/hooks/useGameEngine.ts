import { useCallback, useEffect, useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import { createInitialEngineState } from '../state/createInitialEngineState';
import type { EngineState } from '../core/EngineTypes';
import type { GameEngineAction } from '../core/ActionTypes';
import { TICK_INTERVAL_MS } from '../../config/gameConfig';

/**
 * Thin React wrapper around the pure GameEngine class.
 * Contains NO game logic — only wiring between engine and React state.
 */
export const useGameEngine = (initialState?: EngineState) => {
  const [engine] = useState(() => new GameEngine(initialState ?? createInitialEngineState()));

  const [state, setState] = useState<EngineState>(() => engine.getState());

  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    if (!engine.getState().initialized) {
      engine.start(TICK_INTERVAL_MS);
    }
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  const dispatch = useCallback(
    (action: GameEngineAction) => engine.dispatch(action),
    [engine],
  );

  return { state, engine, dispatch };
};
