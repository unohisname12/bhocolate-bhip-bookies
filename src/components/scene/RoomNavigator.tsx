import React from 'react';
import { HOUSE_ROOMS, ROOM_ORDER } from '../../config/roomConfig';
import type { RoomId } from '../../types/room';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface RoomNavigatorProps {
  currentRoom: RoomId;
  dispatch: (action: GameEngineAction) => void;
}

/**
 * Minimal room navigation — edge arrows + small dots above the action bar.
 */
export const RoomNavigator: React.FC<RoomNavigatorProps> = ({ currentRoom, dispatch }) => {
  const currentIndex = ROOM_ORDER.indexOf(currentRoom);

  const goTo = (direction: -1 | 1) => {
    const nextIndex = (currentIndex + direction + ROOM_ORDER.length) % ROOM_ORDER.length;
    dispatch({ type: 'CHANGE_ROOM', roomId: ROOM_ORDER[nextIndex] });
  };

  return (
    <>
      {/* Left arrow */}
      <button
        data-help="room-nav"
        onClick={() => goTo(-1)}
        className="fixed left-2 top-1/2 -translate-y-1/2 z-[35] w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white/60 hover:bg-black/50 hover:text-white active:scale-95 transition-all pointer-events-auto"
      >
        <span className="text-base font-bold">‹</span>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => goTo(1)}
        className="fixed right-2 top-1/2 -translate-y-1/2 z-[35] w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white/60 hover:bg-black/50 hover:text-white active:scale-95 transition-all pointer-events-auto"
      >
        <span className="text-base font-bold">›</span>
      </button>

      {/* Room dots — bottom of screen */}
      <div className="fixed bottom-2 inset-x-0 z-[45] pointer-events-none flex justify-center gap-1.5 pb-1">
        {HOUSE_ROOMS.map((room) => (
          <button
            key={room.id}
            onClick={() => dispatch({ type: 'CHANGE_ROOM', roomId: room.id })}
            className={`w-2 h-2 rounded-full transition-all duration-200 pointer-events-auto ${
              room.id === currentRoom
                ? 'bg-white shadow-sm shadow-white/40'
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={room.name}
          />
        ))}
      </div>
    </>
  );
};
