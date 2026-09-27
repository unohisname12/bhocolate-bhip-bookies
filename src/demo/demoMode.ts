import { createScreenPreview } from '../devtools/screenCatalog';
import { DEFAULT_LEARNING } from '../services/game/curriculum';
import { SHOP_ITEMS } from '../config/shopConfig';
import type { connectPersistence } from '../services/persistence/enginePersistence';

// A separate build and origin keep classroom accounts out of the public demo.
export const DEMO_MODE = import.meta.env.MODE === 'demo';

export function createDemoState() {
  const state = createScreenPreview('home', { ...DEFAULT_LEARNING }, {
    species: 'koala_sprite', stage: 'adult', ready: true,
  });
  return {
    ...state,
    player: { ...state.player, displayName: 'Demo player', activePetId: state.pet!.id },
    pet: { ...state.pet!, name: 'Pip' },
    inventory: { ...state.inventory, items: SHOP_ITEMS.map(item => ({
      itemId: item.id, quantity: item.stackable ? 20 : 1, acquiredAt: Date.now(),
    })) },
  };
}

// Deliberately session-only: reload always gives the presenter a fresh pet.
export const connectDemoPersistence: typeof connectPersistence = () => () => {};
