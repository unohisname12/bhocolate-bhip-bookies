import { describe, it, expect, vi } from 'vitest';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
import { initBattle } from '../../../engine/systems/BattleSystem';
import { awardTransitions, grantClassPrize, prizeProgress } from '../rewards';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION, migrate } from '../../../services/persistence/saveMigrations';
import type { EngineState } from '../../../types/engine';
const fixture = (): EngineState => ({ ...createTestEngineState(), mode: 'normal', test: { active: false, label: '' } });
function victory(state: EngineState) {
  const battle = initBattle(state.pet!);
  return awardTransitions({ ...state, battle }, { ...state, battle: { ...battle, phase: 'victory' } }, { type: 'PLAYER_FOCUS' });
}
describe('lasting battle and class prizes', () => {
  it('awards every victory once, gives milestone furniture and supports repeat goals', () => {
    const start = fixture().player.currencies.tokens;
    let state = victory(fixture());
    expect(state.prizes?.wins).toBe(1); expect(state.player.currencies.tokens).toBe(start + 10);
    expect(state.player.unlockedRoomItems).toContain('clash_bed');
    const closed = engineReducer(state, { type: 'END_BATTLE' });
    expect(engineReducer(closed, { type: 'END_BATTLE' }).prizes).toEqual(closed.prizes);
    for (let i = 1; i < 5; i++) state = victory(state);
    expect(state.prizes?.wins).toBe(5); expect(state.player.currencies.tokens).toBe(start + 5 * 10 + 25);
    expect(state.cosmetics.owned.some(c => c.cosmeticId === 'cos_star_beret')).toBe(true);
    expect(state.player.unlockedRoomItems).toContain('clash_lamp');
  });
  it('a real finishing move credits the prize track and result dismissal cannot replay it', () => {
    const state = fixture(), battle = initBattle(state.pet!);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const ready = { ...state, battle: { ...battle, phase: 'player_turn' as const, enemyPet: { ...battle.enemyPet, currentHP: 1 } } };
      const won = engineReducer(ready, { type: 'PLAYER_MOVE', moveId: battle.playerPet.moves[0].id });
      expect(won.battle.active && won.battle.phase).toBe('victory');
      expect(won.prizes?.wins).toBe(1);
      expect(engineReducer(won, { type: 'PLAYER_MOVE', moveId: battle.playerPet.moves[0].id }).prizes?.wins).toBe(1);
      const closed = engineReducer(won, { type: 'END_BATTLE' });
      expect(engineReducer(closed, { type: 'END_BATTLE' }).prizes?.wins).toBe(1);
    } finally { random.mockRestore(); }
  });
  it('keeps boosts optional and consumes one only on battle start, without changing pet stats', () => {
    let state = fixture(); state.prizes = { ...prizeProgress(state), boosts: { attack: 2, defense: 1 } };
    state = engineReducer(state, { type: 'ARM_PRIZE_BOOST', boost: 'attack' });
    const battle = initBattle(state.pet!);
    const started = awardTransitions(state, { ...state, battle }, { type: 'RESOLVE_WARMUP', correct: true, skipped: false });
    expect(started.prizes?.boosts.attack).toBe(1); expect(started.prizes?.armed).toBeNull();
    expect(started.battle.active && started.battle.playerPet.strength).toBe(Math.ceil(battle.playerPet.strength * 1.2));
    expect(started.pet?.stats).toEqual(state.pet?.stats);
    expect(engineReducer(started, { type: 'ARM_PRIZE_BOOST', boost: 'defense' })).toBe(started);
  });
  it('grants each crossed level and blocks developer preview rewards', () => {
    const state = fixture();
    const next = { ...state, pet: { ...state.pet!, progression: { ...state.pet!.progression, level: state.pet!.progression.level + 3 } } };
    const rewarded = awardTransitions(state, next, { type: 'ADD_XP', amount: 999 });
    expect(rewarded.player.currencies.tokens).toBe(state.player.currencies.tokens + 45);
    expect(awardTransitions(state, { ...next, devPreview: true }, { type: 'ADD_XP', amount: 999 }).prizes).toBeUndefined();
  });
  it('class rewards survive saves, reject replay and convert duplicates to tokens', () => {
    const start = fixture().player.currencies.tokens;
    let state = grantClassPrize(fixture(), 'round-a', 100, 1);
    expect(state.player.currencies.tokens).toBe(start + 50);
    expect(grantClassPrize(state, 'round-a', 100, 1)).toBe(state);
    expect(state.player.unlockedRoomItems).toContain('clash_trophy');
    state = grantClassPrize(state, 'round-b', 100, 1);
    expect(state.player.currencies.tokens).toBe(start + 50 + 50 + 15 + 15);
    const save = { version: CURRENT_SAVE_VERSION, timestamp: Date.now(), state, checksum: computeChecksum(state) };
    expect(validateSave(save).valid).toBe(true); expect(migrate(save).prizes).toEqual(state.prizes);
  });
  it('only places owned decorations and never double-charges owned prizes', () => {
    let state = fixture(); state.player.currencies.tokens = 50;
    expect(engineReducer(state, { type: 'PLACE_ROOM_ITEM', itemId: 'clash_bed', position: { x: 50, y: 70 } })).toBe(state);
    state = engineReducer(state, { type: 'BUY_PRIZE', itemId: 'clash_bed' });
    expect(state.player.currencies.tokens).toBe(25);
    expect(engineReducer(state, { type: 'BUY_PRIZE', itemId: 'clash_bed' })).toBe(state);
    state = engineReducer(state, { type: 'PLACE_ROOM_ITEM', itemId: 'clash_bed', position: { x: 50, y: 70 } });
    expect(state.room.items.some(i => i.itemId === 'clash_bed')).toBe(true);
    state = engineReducer(state, { type: 'REMOVE_ROOM_ITEM', itemId: 'clash_bed' });
    expect(state.player.unlockedRoomItems).toContain('clash_bed');
  });
});
