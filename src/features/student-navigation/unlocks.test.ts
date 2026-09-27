import { describe, expect, it } from 'vitest';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { createTestEngineState } from '../../engine/state/createTestEngineState';
import { freshArcade } from '../arcade/model';
import { careDate } from '../../services/game/petGrowth';
import { nextUnlock, unlockedFeatures } from './unlocks';
import type { EngineState } from '../../types/engine';

const day = (n: number) => careDate(Date.now() - n * 86400000);
function egg(days: number): EngineState {
  const s = createInitialEngineState();
  s.pet = null;
  s.eggDiscovery = { ...(s.eggDiscovery ?? {}), status: 'collecting', stamps: Array.from({ length: days }, (_, i) => ({ day: day(i), style: 'explore' })) } as EngineState['eggDiscovery'];
  return s;
}

describe('features open as the student plays', () => {
  it('day one shows four games, the shop and nothing else', () => {
    const open = unlockedFeatures(egg(0));
    expect([...open].sort()).toEqual(['catch', 'dash', 'math', 'merge', 'shop']);
    expect(nextUnlock(open)).toContain('second day');
  });
  it('Café, Shellguard and the bridge open on day two; Momentum and Delivery on day three', () => {
    expect(unlockedFeatures(egg(2)).has('cafe')).toBe(true);
    expect(unlockedFeatures(egg(2)).has('momentum')).toBe(false);
    expect(unlockedFeatures(egg(3)).has('delivery')).toBe(true);
    expect(unlockedFeatures(egg(3)).has('care')).toBe(false);
  });
  it('hatching opens the pet systems; the first victory opens the deep ones', () => {
    const hatched = createTestEngineState();
    const open = unlockedFeatures(hatched);
    for (const f of ['care', 'home', 'battle', 'petGames', 'cafe', 'momentum'] as const) expect(open.has(f)).toBe(true);
    expect(open.has('forge')).toBe(false);
    expect(nextUnlock(open)).toContain('first battle');
    const won = { ...hatched, prizes: { wins: 1, medals: 0, boosts: { attack: 0, defense: 0 }, armed: null, levelClaims: {}, classClaims: [] } };
    expect(unlockedFeatures(won).has('forge')).toBe(true);
    expect(nextUnlock(unlockedFeatures(won))).toBeNull();
  });
  it('anything a student already played stays open, and the teacher can open everything', () => {
    const s = egg(0); s.arcade = { ...freshArcade(), plays: { dash: 0, guard: 2, cafe: 0 } };
    expect(unlockedFeatures(s).has('guard')).toBe(true);
    const all = egg(0); all.learning = { ...all.learning, showAllGames: true };
    expect(unlockedFeatures(all).has('forge')).toBe(true);
    expect(unlockedFeatures(all).has('delivery')).toBe(true);
  });
});
