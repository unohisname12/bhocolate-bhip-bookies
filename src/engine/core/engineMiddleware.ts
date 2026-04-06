import type { GameEngine } from './GameEngine';
import type { GameEngineAction } from './ActionTypes';
import type { EngineState } from './EngineTypes';

export type Middleware = (
  engine: GameEngine,
  action: GameEngineAction,
  prevState: EngineState,
  next: () => void,
) => void;

/** Log every action to console in dev mode */
export const loggingMiddleware: Middleware = (_engine, action, _prev, next) => {
  if (import.meta.env.DEV) {
    console.debug('[Engine]', action.type, action);
  }
  next();
};

/** Warn on unknown action types */
export const validationMiddleware: Middleware = (_engine, action, _prev, next) => {
  if (!action.type) {
    console.warn('[Engine] Action missing type:', action);
  }
  next();
};

const SKIP_SAVE_ACTIONS = new Set(['TICK', 'START_ENGINE', 'STOP_ENGINE', 'PAUSE_ENGINE', 'RESUME_ENGINE']);

/** Triggers a debounced save after any state-changing action (excludes high-frequency TICK). */
export const persistenceMiddleware: Middleware = (_engine, action, _prev, next) => {
  next();
  if (!SKIP_SAVE_ACTIONS.has(action.type)) {
    import('../../services/persistence/SaveManager').then(({ debouncedSave }) => {
      debouncedSave(_engine.getState());
    }).catch(() => { /* non-critical */ });
  }
};

/** Compose middlewares into a single pipeline */
export const composeMiddleware = (middlewares: Middleware[]): Middleware => {
  return (engine, action, prevState, next) => {
    const run = (index: number): void => {
      if (index >= middlewares.length) {
        next();
        return;
      }
      middlewares[index](engine, action, prevState, () => run(index + 1));
    };
    run(0);
  };
};
