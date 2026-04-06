import type { PetState } from '../../types';
import type { EngineState } from '../core/EngineTypes';
import { createInitialEngineState } from './createInitialEngineState';

export const createTestEngineState = (): EngineState => {
  const base = createInitialEngineState();
  return {
    ...base,
    mode: 'test' as const,
    screen: 'home' as const,
    pet: {
      id: 'test_pet_1',
      ownerId: 'test_player',
      speciesId: 'koala_sprite',
      name: 'Test Koala',
      type: 'koala_sprite',
      stage: 'baby',
      mood: 'playful',
      state: 'idle' as PetState,
      needs: {
        hunger: 75,
        happiness: 80,
        cleanliness: 70,
        health: 90,
      },
      stats: {
        strength: 12,
        speed: 14,
        defense: 11,
      },
      bond: 10,
      progression: {
        level: 2,
        xp: 25,
        evolutionFlags: [],
      },
      timestamps: {
        createdAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        lastFedAt: new Date().toISOString(),
        lastCleanedAt: new Date().toISOString(),
      },
    },
    player: {
      ...base.player,
      currencies: {
        ...base.player.currencies,
        tokens: 500,
        coins: 0,
      },
      quizOutcome: null,
    },
    test: {
      active: true,
      label: 'Test Mode Active',
    },
  };
};
