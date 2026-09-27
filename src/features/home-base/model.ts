import {validResident,type HouseResident} from '../living-house/world';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { FURNITURE, HOME_ROOMS, WALLS, FLOORS, FINISHES, furniture, roomSize, type HomeRoomId } from './catalog';
export interface HomePlacement { id: string; furnitureId: string; x: number; y: number; flipped: boolean; on: boolean; finish?: string }
export interface HomeRoom { night?: boolean; tier: number; wall: string; floor: string; items: HomePlacement[] }
export interface HomeBase { resident?: HouseResident; houseVersion?: 1; lastDoor?: HomeRoomId; activeRoom: HomeRoomId; rooms: Partial<Record<HomeRoomId, HomeRoom>>; owned: string[]; undo?: { roomId: HomeRoomId; room: HomeRoom }; }
export const emptyRoom = (): HomeRoom => ({ tier: 0, wall: 'sage', floor: 'oak', items: [] });
export const ownsFurniture = (state: EngineState, id: string) => {
  const item = furniture(id);
  return !!item && (item.cost === 0 || (item.prize ? state.player.unlockedRoomItems.includes(id) : !!state.homeBase?.owned.includes(id)));
};
const starter = (id: string, x: number, y: number): HomePlacement => ({ id: `starter-${id}`, furnitureId: id, x, y, flipped: false, on: true });
export function createHomeBase(state: EngineState): HomeBase {
  const room = emptyRoom();
  room.items = [starter('home_cushion', 0, 1), starter('home_rug', 3, 2), starter('home_table', 3, 2), starter('home_chair', 5, 3), starter('home_plant', 7, 1)];
  // Preserve the earlier home layout in its original save. Make previously placed
  // prize keepsakes available here without spending or claiming them again.
  state.room.items.filter(i => i.placed && furniture(i.itemId) && ownsFurniture(state, i.itemId)).slice(0, 4).forEach((item, i) => {
    room.items.push(starter(item.itemId, i * 2, 6 - furniture(item.itemId)!.height));
  });
  return upgradeHouse({ activeRoom: 'den', rooms: { den: room }, owned: [] });
}
/** Add structural rooms without touching any saved furniture, finish, size, or purchase. */
export function upgradeHouse(base: HomeBase): HomeBase {
  if (base.houseVersion === 1 && ['hall','landing','kitchen','bathroom'].every(id => base.rooms[id as HomeRoomId])) return base;
  const furnished = (wall: string, floor: string, items: HomePlacement[]): HomeRoom => ({ ...emptyRoom(), wall, floor, items });
  return { ...base, houseVersion: 1, rooms: {
    hall: furnished('cream','oak',[starter('home_rug',2,2),starter('home_plant',0,1),starter('home_chair',6,2)]),
    landing: furnished('sage','birch',[starter('home_cushion',0,1),starter('home_plant',6,1)]),
    kitchen: furnished('cream','oak',[starter('house_counter',0,1),starter('home_table',2,3),starter('home_chair',4,3)]),
    bathroom: furnished('blue','birch',[starter('house_tub',0,1),starter('house_mirror',3,0),starter('home_plant',6,1)]),
    ...base.rooms,
  } };
}

export function canPlace(room: HomeRoom, furnitureId: string, x: number, y: number, skipId?: string): boolean {
  const item = furniture(furnitureId), { cols, rows } = roomSize(room.tier);
  if (!item || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + item.width > cols || y + item.height > rows || (item.layer === 'wall' && y !== 0)) return false;
  return !room.items.some(p => {
    const other = furniture(p.furnitureId);
    return p.id !== skipId && other?.layer === item.layer && x < p.x + other.width && x + item.width > p.x && y < p.y + other.height && y + item.height > p.y;
  });
}
export function homeComfort(room: HomeRoom) {
  const items = room.items.map(p => furniture(p.furnitureId)).filter(Boolean);
  return Math.min(100, new Set(items.map(i => i!.id)).size * 7 + new Set(items.map(i => i!.category)).size * 5);
}
export function reduceHomeBase(state: EngineState, action: GameEngineAction): EngineState | null {
  if (!action.type.startsWith('HOME_')) return null;
  if (state.battle.active || state.run.active || state.momentum.active || state.pendingBattleWarmup) return state;
  const base = upgradeHouse(state.homeBase ?? createHomeBase(state)), room = base.rooms[base.activeRoom];
  if (!room) return state;
  const update = (next: HomeRoom, undo = true): EngineState => ({ ...state, homeBase: { ...base, rooms: { ...base.rooms, [base.activeRoom]: next }, ...(undo ? { undo: { roomId: base.activeRoom, room } } : {}) } });
  switch (action.type) {
    case 'HOME_RESIDENT': return validResident(action.resident) && action.resident.petId === state.pet?.id && base.rooms[action.resident.roomId] ? {...state,homeBase:{...base,resident:action.resident}} : state;
    case 'HOME_FINISH': return FINISHES.some(f => f.id === action.finish) && room.items.some(p => p.id === action.id) ? update({ ...room, items: room.items.map(p => p.id === action.id ? { ...p, finish: action.finish } : p) }) : state;
    case 'HOME_OPEN': return { ...state, homeBase: base, screen: 'home_builder', currentRoom: 'inside' };
    case 'HOME_TRAVEL': {
      if (state.interaction.careGameActive || action.from !== base.activeRoom || !base.rooms[action.roomId] || !HOME_ROOMS.some(r => r.id === action.roomId)) return state;
      if (action.roomId === base.activeRoom) return state;
      return { ...state, currentRoom: 'inside', homeBase: { ...base, activeRoom: action.roomId, lastDoor: base.activeRoom, undo: undefined } };
    }
    case 'HOME_ROOM': {
      const def = HOME_ROOMS.find(r => r.id === action.roomId);
      if (!def) return state;
      if (base.rooms[def.id]) return { ...state, homeBase: { ...base, activeRoom: def.id, lastDoor: base.activeRoom, undo: undefined } };
      if (state.player.currencies.tokens < def.cost) return state;
      return { ...state, player: { ...state.player, currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens - def.cost } }, homeBase: { ...base, activeRoom: def.id, lastDoor: base.activeRoom, rooms: { ...base.rooms, [def.id]: { ...emptyRoom(), wall: def.id === 'bedroom' ? 'night' : def.id === 'garden' ? 'cream' : 'blue' } }, undo: undefined } };
    }
    case 'HOME_BUY': {
      const def = furniture(action.furnitureId);
      if (!def || ownsFurniture(state, def.id)) return state;
      if (def.prize) {
        if (state.player.currencies.tokens < def.cost) return state;
        return { ...state, homeBase: base, player: { ...state.player, unlockedRoomItems: [...state.player.unlockedRoomItems, def.id], currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens - def.cost } } };
      }
      if (state.player.currencies.tokens < def.cost) return state;
      return { ...state, homeBase: { ...base, owned: [...base.owned, def.id] }, player: { ...state.player, currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens - def.cost } } };
    }
    case 'HOME_PLACE': {
      if (!ownsFurniture(state, action.furnitureId) || !canPlace(room, action.furnitureId, action.x, action.y) || room.items.length >= 60 || room.items.filter(i => i.furnitureId === action.furnitureId).length >= 8) return state;
      return update({ ...room, items: [...room.items, { id: crypto.randomUUID(), furnitureId: action.furnitureId, x: action.x, y: action.y, flipped: false, on: true }] });
    }
    case 'HOME_MOVE': {
      const placed = room.items.find(p => p.id === action.id);
      if (!placed || !canPlace(room, placed.furnitureId, action.x, action.y, placed.id) || (placed.x === action.x && placed.y === action.y)) return state;
      return update({ ...room, items: room.items.map(p => p.id === placed.id ? { ...p, x: action.x, y: action.y } : p) });
    }
    case 'HOME_TURN': return room.items.some(p => p.id === action.id) ? update({ ...room, items: room.items.map(p => p.id === action.id ? { ...p, flipped: !p.flipped } : p) }) : state;
    case 'HOME_TOGGLE': return room.items.some(p => p.id === action.id && furniture(p.furnitureId)?.interaction === 'light') ? update({ ...room, items: room.items.map(p => p.id === action.id ? { ...p, on: !p.on } : p) }) : state;
    case 'HOME_STORE': return room.items.some(p => p.id === action.id) ? update({ ...room, items: room.items.filter(p => p.id !== action.id) }) : state;
    case 'HOME_AMBIENCE': return typeof action.night === 'boolean' ? update({ ...room, night: action.night }) : state;
    case 'HOME_STYLE': {
      if (!WALLS.some(w => w.id === action.wall) || !FLOORS.some(f => f.id === action.floor)) return state;
      if (room.wall === action.wall && room.floor === action.floor) return state;
      return update({ ...room, wall: action.wall, floor: action.floor });
    }
    case 'HOME_EXPAND': {
      const cost = room.tier === 0 ? 40 : 80;
      if (room.tier >= 2 || state.player.currencies.tokens < cost) return state;
      return { ...state, homeBase: { ...base, rooms: { ...base.rooms, [base.activeRoom]: { ...room, tier: room.tier + 1 } }, undo: undefined }, player: { ...state.player, currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens - cost } } };
    }
    case 'HOME_CLEAR': return room.items.length ? update({ ...room, items: [] }) : state;
    case 'HOME_UNDO': return base.undo ? { ...state, homeBase: { ...base, activeRoom: base.undo.roomId, rooms: { ...base.rooms, [base.undo.roomId]: base.undo.room }, undo: undefined } } : state;
    default: return state;
  }
}
export function validHomeBase(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const b = value as HomeBase;
  const validRoom = (r: HomeRoom) => !!r && (r.night === undefined || typeof r.night === 'boolean') && [0,1,2].includes(r.tier) && WALLS.some(w => w.id === r.wall) && FLOORS.some(f => f.id === r.floor) && Array.isArray(r.items) && r.items.length <= 60 && new Set(r.items.map(p => p?.id)).size === r.items.length && r.items.every(p => {
    if (!p || typeof p !== 'object') return false;
    if (p.finish !== undefined && !FINISHES.some(f => f.id === p.finish)) return false;
    const def = furniture(p.furnitureId), size = roomSize(r.tier);
    return !!def && typeof p.id === 'string' && p.id.length <= 100 && typeof p.flipped === 'boolean' && typeof p.on === 'boolean' && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x + def.width <= size.cols && p.y + def.height <= size.rows && (def.layer !== 'wall' || p.y === 0);
  });
  return (b.resident === undefined || validResident(b.resident) && !!b.rooms?.[b.resident.roomId]) && (b.houseVersion === undefined || b.houseVersion === 1) && (b.lastDoor === undefined || HOME_ROOMS.some(r => r.id === b.lastDoor)) && !!b.rooms && HOME_ROOMS.some(r => r.id === b.activeRoom) && !!b.rooms.den && !!b.rooms[b.activeRoom] && Object.entries(b.rooms).every(([id, room]) => HOME_ROOMS.some(r => r.id === id) && validRoom(room)) && Array.isArray(b.owned) && b.owned.length <= FURNITURE.length && new Set(b.owned).size === b.owned.length && b.owned.every(id => !!furniture(id)) && (!b.undo || (!!b.rooms[b.undo.roomId] && validRoom(b.undo.room)));
}
