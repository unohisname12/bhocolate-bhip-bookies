import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_SAVE_VERSION } from '../saveMigrations';

describe('saveMigrations v12 → v13', () => {
  it('bumps CURRENT_SAVE_VERSION to 13', () => {
    expect(CURRENT_SAVE_VERSION).toBe(13);
  });

  it('defaults hasOnboarded = true for existing v12 saves (they already played)', () => {
    const v12State = {
      player: {
        id: 'p1',
        currencies: { tokens: 100, coins: 0, mp: 0, mpLifetime: 0, seasonPoints: 0, shards: 0 },
        mathBuffs: { atk: 0, def: 0, hp: 0 },
        lifetimeMathCorrect: 0,
      },
    };
    const result = migrate({ version: 12, state: v12State }) as unknown as {
      player: { hasOnboarded: boolean };
    };
    expect(result.player.hasOnboarded).toBe(true);
  });

  it('preserves hasOnboarded when already set', () => {
    const v12State = {
      player: {
        id: 'p1',
        hasOnboarded: false,
        currencies: {},
        mathBuffs: { atk: 0, def: 0, hp: 0 },
        lifetimeMathCorrect: 0,
      },
    };
    const result = migrate({ version: 12, state: v12State }) as unknown as {
      player: { hasOnboarded: boolean };
    };
    expect(result.player.hasOnboarded).toBe(false);
  });
});
