import type { Page } from '@playwright/test';
import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { computeChecksum } from '../src/services/persistence/saveValidation';

/** Older-feature tests deliberately exercise a migrated, already-issued egg.
 * Fresh students are tested separately through the full discovery workflow. */
export async function seedLegacyEgg(page: Page) {
  const state = createInitialEngineState();
  state.eggDiscovery = undefined;
  state.screen = 'incubation';
  state.egg = { id: 'legacy-egg', type: 'koala', state: 'incubating', progress: 0, createdAt: new Date().toISOString() };
  const data = JSON.stringify({ version: 15, timestamp: Date.now(), checksum: computeChecksum(state), state });
  await page.addInitScript(value => { if (!localStorage.getItem('vpet_save_auto')) localStorage.setItem('vpet_save_auto', value); }, data);
}
