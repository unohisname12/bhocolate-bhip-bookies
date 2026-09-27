import { HOUSE_ROOMS } from '../../config/roomConfig';
import type { RoomId } from '../../types/room';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

export function RoomNavigator({ currentRoom, dispatch }: { currentRoom: RoomId; dispatch: (action: GameEngineAction) => void }) {
  return <nav aria-label="Rooms" className="fixed top-[205px] inset-x-0 z-[35] flex justify-center gap-2">{HOUSE_ROOMS.map(room => <button key={room.id} className={'min-h-11 min-w-16 px-4 rounded-xl text-sm font-bold border ' + (currentRoom === room.id ? 'border-teal-400 bg-teal-950 text-teal-200' : 'border-slate-600 bg-slate-900 text-slate-300')} aria-pressed={currentRoom === room.id} onClick={() => dispatch({ type: 'CHANGE_ROOM', roomId: room.id })}>{room.name}</button>)}<button className="min-h-11 px-3 rounded-xl text-sm font-bold border border-lime-300 bg-lime-100 text-emerald-950" onClick={() => dispatch({ type: 'HOME_OPEN' })}>Build home</button><button className="min-h-11 px-3 rounded-xl text-sm font-bold border border-amber-300/50 bg-amber-950 text-amber-100" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'growth' })}>Growth</button></nav>;
}
