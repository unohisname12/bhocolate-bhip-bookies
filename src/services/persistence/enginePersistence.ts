import type { GameEngine } from '../../engine/core/GameEngine';
import { save } from './SaveManager';

/** Save committed actions immediately; checkpoint passive changes every 30 seconds. */
export function connectPersistence(engine: GameEngine, page: EventTarget, visibility: EventTarget) {
  const flush = () => save(engine.getState());
  const ignore = new Set(['TICK', 'START_ENGINE', 'STOP_ENGINE', 'PAUSE_ENGINE', 'RESUME_ENGINE', 'NEXT_FRAME']);
  const unsubscribe = engine.onAction((action, previous, next) => {
    if (next !== previous && !ignore.has(action.type) && !(action.type === 'ARCADE_TICK' && !next.arcade?.run?.done)) save(next);
  });
  const timer = setInterval(flush, 30_000);
  page.addEventListener('pagehide', flush);
  visibility.addEventListener('visibilitychange', flush);
  return () => {
    flush();
    unsubscribe();
    clearInterval(timer);
    page.removeEventListener('pagehide', flush);
    visibility.removeEventListener('visibilitychange', flush);
  };
}
