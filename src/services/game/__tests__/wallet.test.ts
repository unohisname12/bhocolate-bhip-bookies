import { describe, expect, it } from 'vitest';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { freshArcade } from '../../../features/arcade/model';
import { prizeProgress } from '../../../features/clash/rewards';
import { CURRENT_SAVE_VERSION, migrate } from '../../persistence/saveMigrations';
import { consolidateWallet, TOKENS_PER_CHARGE, TOKENS_PER_COIN, TOKENS_PER_MEDAL, TOKENS_PER_STAR } from '../wallet';

function legacy() {
  const s = createInitialEngineState();
  s.player.currencies.tokens = 100;
  s.player.currencies.coins = 4;
  s.prizes = { ...prizeProgress(s), medals: 7 };
  s.arcade = { ...freshArcade(), stars: 12, charges: 3 };
  return s;
}

describe('one money: tokens', () => {
  it('converts medals, stars, play charges and coins into tokens exactly once', () => {
    const once = consolidateWallet(legacy());
    expect(once.player.currencies.tokens).toBe(100 + 7 * TOKENS_PER_MEDAL + 12 * TOKENS_PER_STAR + 3 * TOKENS_PER_CHARGE + 4 * TOKENS_PER_COIN);
    expect(once.player.currencies.coins).toBe(0);
    expect(once.prizes?.medals).toBe(0);
    expect(once.arcade).toMatchObject({ stars: 0, charges: 0 });
    expect(consolidateWallet(once)).toBe(once);
  });
  it('old saves convert on load, keeping everything else', () => {
    const s = legacy();
    const loaded = migrate({ version: CURRENT_SAVE_VERSION, timestamp: 0, checksum: '', state: s });
    expect(loaded.player.currencies.tokens).toBe(100 + 35 + 24 + 15 + 40);
    expect(loaded.prizes?.wins).toBe(s.prizes?.wins);
    expect(loaded.arcade?.best).toEqual(s.arcade?.best);
  });
  it('a stale tab that still holds medals converts from its own totals, so nothing is minted twice', () => {
    const stale = legacy();
    const saved = consolidateWallet(stale);
    const later = { ...stale, player: { ...stale.player, currencies: { ...stale.player.currencies, tokens: 110 } } };
    expect(consolidateWallet(later).player.currencies.tokens).toBe(110 + 35 + 24 + 15 + 40);
    expect(saved.player.currencies.tokens).toBe(214);
  });
  it('leaves saves without retired currencies untouched', () => {
    const s = createInitialEngineState();
    expect(consolidateWallet(s)).toBe(s);
  });
});
