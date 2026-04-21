import { describe, it, expect } from 'vitest';
import { getEarnedTier, getSeasonProgress, claimTier } from '../SeasonSystem';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import type { EngineState } from '../../../types/engine';

const stateWithPoints = (pts: number): EngineState => {
  const base = createInitialEngineState();
  return {
    ...base,
    player: {
      ...base.player,
      currencies: { ...base.player.currencies, seasonPoints: pts },
    },
  };
};

describe('SeasonSystem', () => {
  it('returns 0 earned tier with 0 points', () => {
    expect(getEarnedTier(stateWithPoints(0))).toBe(0);
  });

  it('earns tier 1 at 50 points', () => {
    expect(getEarnedTier(stateWithPoints(50))).toBe(1);
  });

  it('earns tier 3 at 200 points (between tiers 3 and 4)', () => {
    expect(getEarnedTier(stateWithPoints(200))).toBe(3);
  });

  it('reports progress fraction between tiers', () => {
    const p = getSeasonProgress(stateWithPoints(125));
    expect(p.earned).toBe(2);
    expect(p.nextTier?.tier).toBe(3);
    expect(p.fraction).toBeGreaterThan(0);
    expect(p.fraction).toBeLessThan(1);
  });

  it('claimTier pays tokens reward', () => {
    let s = stateWithPoints(60);
    const before = s.player.currencies.tokens;
    s = claimTier(s, 1); // tier 1 = 50 tokens
    expect(s.player.currencies.tokens).toBe(before + 50);
    expect(s.season.claimedTiers).toContain(1);
  });

  it('refuses duplicate claims', () => {
    let s = stateWithPoints(60);
    s = claimTier(s, 1);
    const after1 = s.player.currencies.tokens;
    s = claimTier(s, 1);
    expect(s.player.currencies.tokens).toBe(after1);
  });

  it('refuses claim without enough points', () => {
    let s = stateWithPoints(10);
    s = claimTier(s, 1); // needs 50
    expect(s.season.claimedTiers).not.toContain(1);
  });
});
