import { describe, expect, it } from 'vitest';
import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { createTestEngineState } from '../src/engine/state/createTestEngineState';
import { checkDiscoveryCheckpoint } from './discovery-checkpoint';
import { careDate } from '../src/services/game/petGrowth';
const now = Date.now();
describe('server egg activity days', () => {
  it('rejects instant hatching, backdated stamps, and device-clock future stamps', () => {
    const before = createInitialEngineState();
    const hatched = { ...structuredClone(before), pet: createTestEngineState().pet };
    expect(() => checkDiscoveryCheckpoint(before, hatched, now + 1000)).toThrow('five separate');
    const forged = structuredClone(before);
    forged.eggDiscovery!.stamps = [{ day: careDate(now - 86400000), style: 'help', source: 'mission' }];
    expect(() => checkDiscoveryCheckpoint(before, forged, now + 1000)).toThrow('today');
    forged.eggDiscovery!.stamps[0].day = careDate(now + 86400000);
    expect(() => checkDiscoveryCheckpoint(before, forged, now + 1000)).toThrow('real completed');
  });
  it('accepts today once, preserves older stamps, and permits a real five-day reveal', () => {
    const before = createInitialEngineState();
    const d = before.eggDiscovery!;
    d.startedAt = now - 5 * 86400000; d.answers = [4,4,4,4];
    d.stamps = [4,3,2,1].map(day => ({ day: careDate(now - day * 86400000), style: 'help', source: 'mission' }));
    const next = structuredClone(before);
    next.eggDiscovery!.stamps.push({ day: careDate(now), style: 'help', source: 'mission' });
    next.eggDiscovery!.status = 'matched'; next.eggDiscovery!.companion = 'koala_sprite';
    expect(() => checkDiscoveryCheckpoint(before, next, now)).not.toThrow();
    next.eggDiscovery!.stamps[0].style = 'explore';
    expect(() => checkDiscoveryCheckpoint(before, next, now)).toThrow('saved egg journey');
  });
});

it('rejects a client changing the matching version', () => { const before = createInitialEngineState(); const after = structuredClone(before); delete after.eggDiscovery!.matchingVersion; expect(() => checkDiscoveryCheckpoint(before, after, Date.now() + 1000)).toThrow('saved egg journey'); });
