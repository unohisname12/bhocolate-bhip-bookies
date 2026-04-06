export type RoomId = 'outside' | 'inside';

export interface RoomItem {
  itemId: string;
  position: { x: number; y: number };
  placed: boolean;
}

export interface Room {
  backgroundId: string;
  items: RoomItem[];
  moodBonus: number;
}
