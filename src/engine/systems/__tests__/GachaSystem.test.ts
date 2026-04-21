import { describe, it, expect } from 'vitest';
import { gachaPull, equipCosmetic, unequipSlot } from '../GachaSystem';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { GACHA_PULL_COST } from '../../../config/cosmeticConfig';
import type { EngineState } from '../../../types/engine';

const withTokens = (n: number): EngineState => {
  const base = createInitialEngineState();
  return {
    ...base,
    player: {
      ...base.player,
      currencies: { ...base.player.currencies, tokens: n, mp: 1000 },
    },
  };
};

describe('GachaSystem', () => {
  it('refuses pull if tokens < cost', () => {
    const { state, result } = gachaPull(withTokens(10));
    expect(result).toBeNull();
    expect(state.player.currencies.tokens).toBe(10);
  });

  it('pays tokens and adds cosmetic on successful pull', () => {
    const before = withTokens(1000);
    const { state, result } = gachaPull(before, () => 0.1);
    expect(result).not.toBeNull();
    expect(state.player.currencies.tokens).toBe(1000 - GACHA_PULL_COST);
    expect(state.cosmetics.owned.length).toBe(1);
  });

  it('awards shards on duplicate pull', () => {
    let s = withTokens(1000);
    // Fixed rand → same rarity bucket pick; ensure same cosmetic
    const r1 = gachaPull(s, () => 0.0);
    s = r1.state;
    const r2 = gachaPull({ ...s, player: { ...s.player, currencies: { ...s.player.currencies, tokens: 1000, mp: 1000 } } }, () => 0.0);
    expect(r2.result?.isDuplicate).toBe(true);
    expect(r2.state.player.currencies.shards).toBeGreaterThan(0);
  });

  it('equipCosmetic requires ownership', () => {
    const s = withTokens(0);
    const petId = 'test_pet';
    const result = equipCosmetic(s, petId, 'cos_cozy_cap');
    // Not owned → no equip
    expect(result.cosmetics.equipped[petId]?.hat).toBeUndefined();
  });

  it('equip then unequip updates slot', () => {
    let s = withTokens(1000);
    // Manually seed ownership
    s = {
      ...s,
      cosmetics: {
        ...s.cosmetics,
        owned: [{ cosmeticId: 'cos_cozy_cap', count: 1, firstObtainedAt: '2026-04-19' }],
      },
    };
    s = equipCosmetic(s, 'pet_1', 'cos_cozy_cap');
    expect(s.cosmetics.equipped['pet_1']?.hat).toBe('cos_cozy_cap');
    s = unequipSlot(s, 'pet_1', 'hat');
    expect(s.cosmetics.equipped['pet_1']?.hat).toBeNull();
  });
});
