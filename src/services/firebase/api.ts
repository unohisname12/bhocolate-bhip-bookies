import type { GameState } from '../../types';

// Mock persistence layer. This implementation is intentionally localStorage-based for phase-2 prototyping.
// Keep the API shape consistent so a real Firebase adapter can be swapped in later.

export const isMockPersistence = true;

const LOCAL_STORAGE_KEY = 'vpet_gamestate_v1';

export const saveGameState = async (state: GameState): Promise<void> => {
  return new Promise((resolve) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      resolve();
    } catch (e) {
      console.error('Error saving game state to localStorage', e);
      resolve();
    }
  });
};

export const loadGameState = async (): Promise<GameState | null> => {
  return new Promise((resolve) => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        resolve(JSON.parse(saved) as GameState);
      } else {
        resolve(null);
      }
    } catch (e) {
      console.error('Error loading game state from localStorage', e);
      resolve(null);
    }
  });
};

export const clearGameState = async (): Promise<void> => {
    return new Promise((resolve) => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        resolve();
    });
};
