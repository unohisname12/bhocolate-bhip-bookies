import { describe, expect, it } from 'vitest';
import { applyDiscoveryBond } from '../discoveryBond';
import { createEggDiscovery } from '../eggDiscovery';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { createMind } from '../../../features/pet-mind/memory';

describe('egg activities shape the hatched companion', () => {
  it('carries different activity styles into different starting traits', () => {
    const pet = createTestEngineState().pet!;
    const d = { ...createEggDiscovery(), status: 'claimed' as const, companion: 'koala_sprite' as const };
    const helped = applyDiscoveryBond(pet, { ...d, stamps: [{ day: '2026-09-16', style: 'help', source: 'mission' }] });
    const explored = applyDiscoveryBond(pet, { ...d, stamps: [{ day: '2026-09-16', style: 'explore', source: 'mission' }] });
    expect(helped.mind!.traits.sociability).toBeGreaterThan(explored.mind!.traits.sociability);
    expect(explored.mind!.traits.curiosity).toBeGreaterThan(helped.mind!.traits.curiosity);
    expect(helped.mind!.traits.quiet).toBe(createMind(pet).traits.quiet);
    expect(applyDiscoveryBond(pet, null)).toBe(pet);
  });
});
