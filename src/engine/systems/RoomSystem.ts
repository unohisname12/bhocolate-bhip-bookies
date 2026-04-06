import type { Room, RoomItem } from '../../types/room';
import { ROOM_DECORATIONS } from '../../config/roomConfig';

export const calculateRoomMoodBonus = (room: Room): number =>
  room.items.reduce((sum, item) => {
    const def = ROOM_DECORATIONS.find((d) => d.id === item.itemId);
    return sum + (def?.moodBonus ?? 0);
  }, 0);

export const placeItem = (
  room: Room,
  itemId: string,
  position: { x: number; y: number },
): Room => {
  const existing = room.items.find((i) => i.itemId === itemId);
  if (existing) {
    return {
      ...room,
      items: room.items.map((i) =>
        i.itemId === itemId ? { ...i, position, placed: true } : i,
      ),
    };
  }
  const newItem: RoomItem = { itemId, position, placed: true };
  return { ...room, items: [...room.items, newItem] };
};

export const removeRoomItem = (room: Room, itemId: string): Room => ({
  ...room,
  items: room.items.filter((i) => i.itemId !== itemId),
});

export const changeBackground = (room: Room, backgroundId: string): Room => ({
  ...room,
  backgroundId,
  moodBonus: calculateRoomMoodBonus(room),
});
