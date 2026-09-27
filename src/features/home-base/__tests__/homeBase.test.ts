import { describe, it, expect } from 'vitest';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
import { canPlace, validHomeBase, ownsFurniture, homeComfort } from '../model';
import { FURNITURE } from '../catalog';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import { migrate, CURRENT_SAVE_VERSION } from '../../../services/persistence/saveMigrations';
const open = () => engineReducer(createInitialEngineState(), { type: 'HOME_OPEN' });
describe('Home Base', () => {
  it('gives an old save a furnished home without spending tokens or replacing the earlier layout', () => {
    const previous = createInitialEngineState();
    previous.room.items = [{ itemId: 'clash_rug', placed: true, position: { x: 40, y: 80 } }];
    previous.player.unlockedRoomItems.push('clash_rug');
    const state = engineReducer(previous, { type: 'HOME_OPEN' });
    expect(state.screen).toBe('home_builder'); expect(state.homeBase?.rooms.den?.items).toHaveLength(7);
    expect(state.player).toEqual(previous.player); expect(state.room).toEqual(previous.room);
    expect(validHomeBase(state.homeBase)).toBe(true);
    expect(engineReducer(state, { type: 'HOME_OPEN' }).homeBase).toEqual(state.homeBase);
  });
  it('places owned furniture, checks edges and collision, but lets rugs sit beneath furniture', () => {
    let state = open(); const room = state.homeBase!.rooms.den!;
    expect(canPlace(room, 'home_chair', 3, 2)).toBe(false);
    expect(canPlace(room, 'home_chair', 4, 3)).toBe(true);
    expect(canPlace(room, 'home_couch', 7, 3)).toBe(false);
    expect(canPlace(room, 'home_window', 0, 2)).toBe(false);
    expect(engineReducer(state, { type: 'HOME_PLACE', furnitureId: 'home_couch', x: 0, y: 4 })).toBe(state);
    state = engineReducer(state, { type: 'HOME_PLACE', furnitureId: 'home_chair', x: 4, y: 3 });
    expect(state.homeBase!.rooms.den!.items).toHaveLength(room.items.length + 1);
    expect(engineReducer(state, { type: 'HOME_MOVE', id: state.homeBase!.rooms.den!.items.at(-1)!.id, x: NaN, y: 0 })).toBe(state);
  });
  it('charges once for a furniture design and keeps it after put-away and undo', () => {
    let state = open(); state.player.currencies.tokens = 50;
    state = engineReducer(state, { type: 'HOME_BUY', furnitureId: 'home_couch' });
    expect(state.player.currencies.tokens).toBe(25); expect(ownsFurniture(state, 'home_couch')).toBe(true);
    expect(engineReducer(state, { type: 'HOME_BUY', furnitureId: 'home_couch' })).toBe(state);
    state = engineReducer(state, { type: 'HOME_PLACE', furnitureId: 'home_couch', x: 0, y: 4 });
    const id = state.homeBase!.rooms.den!.items.at(-1)!.id;
    state = engineReducer(state, { type: 'HOME_STORE', id });
    expect(ownsFurniture(state, 'home_couch')).toBe(true);
    state = engineReducer(state, { type: 'HOME_UNDO' });
    expect(state.homeBase!.rooms.den!.items.some(p => p.id === id)).toBe(true);
    expect(state.player.currencies.tokens).toBe(25);
  });
  it('builds and expands rooms once, preserving each room and never refunding costs with undo', () => {
    let state = open(); state.player.currencies.tokens = 100;
    const den = state.homeBase!.rooms.den;
    state = engineReducer(state, { type: 'HOME_ROOM', roomId: 'bedroom' });
    expect(state.player.currencies.tokens).toBe(65);
    state = engineReducer(state, { type: 'HOME_STYLE', wall: 'rose', floor: 'birch' });
    state = engineReducer(state, { type: 'HOME_EXPAND' });
    expect(state.homeBase!.rooms.bedroom!.tier).toBe(1); expect(state.player.currencies.tokens).toBe(25);
    expect(engineReducer(state, { type: 'HOME_UNDO' })).toBe(state);
    state = engineReducer(state, { type: 'HOME_ROOM', roomId: 'den' }); expect(state.homeBase!.rooms.den).toEqual(den);
    state = engineReducer(state, { type: 'HOME_ROOM', roomId: 'bedroom' });
    expect(state.homeBase!.rooms.bedroom!.wall).toBe('rose'); expect(state.player.currencies.tokens).toBe(25);
    expect(engineReducer(state, { type: 'HOME_ROOM', roomId: 'garden' })).toBe(state);
  });
  it('uses existing prize ownership and never consumes a collectible by placing it', () => {
    let state = open(); state.player.unlockedRoomItems.push('clash_trophy');
    state = engineReducer(state, { type: 'HOME_PLACE', furnitureId: 'clash_trophy', x: 0, y: 4 });
    expect(state.homeBase!.rooms.den!.items.at(-1)!.furnitureId).toBe('clash_trophy');
    expect(state.player.unlockedRoomItems).toContain('clash_trophy');
    const before = state.homeBase!.rooms.den;
    state = engineReducer(state, { type: 'HOME_CLEAR' });
    expect(state.homeBase!.rooms.den!.items).toEqual([]);
    expect(engineReducer(state, { type: 'HOME_UNDO' }).homeBase!.rooms.den).toEqual(before);
  });
  it('validates layouts and preserves them through save and reload', () => {
    const state = open(), data = { version: CURRENT_SAVE_VERSION, state, timestamp: Date.now(), checksum: computeChecksum(state) };
    expect(validateSave(data).valid).toBe(true); expect(migrate(data).homeBase).toEqual(state.homeBase);
    expect(validHomeBase({ ...state.homeBase, rooms: { den: { ...state.homeBase!.rooms.den, items: [null] } } })).toBe(false);
    expect(validHomeBase({ ...state.homeBase, rooms: { den: { ...state.homeBase!.rooms.den, tier: 900 } } })).toBe(false);
    expect(validHomeBase({ ...state.homeBase, owned: ['made-up'] })).toBe(false);
    expect(homeComfort(state.homeBase!.rooms.den!)).toBeGreaterThan(0);
    expect(FURNITURE).toHaveLength(242);
  });
});
