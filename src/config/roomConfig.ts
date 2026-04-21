import type { RoomId } from '../types/room';

export type ActionId = 'feed' | 'play' | 'clean' | 'heal' | 'train' | 'shop' | 'arena' | 'practice' | 'dungeon' | 'care';

export interface PropPlacement {
  assetId: string;
  path: string;
  x: string;   // CSS percentage position
  y: string;
  scale: number;
  layer?: 'background' | 'midground' | 'foreground';  // defaults to 'midground'
}

export interface HouseRoom {
  id: RoomId;
  name: string;
  icon: string;
  background: string;           // CSS gradient fallback
  floorGradient: string;        // Tailwind fallback
  backgroundImage?: string;     // Full scene image path
  primaryActions: ActionId[];
  props: PropPlacement[];
}

const F = '/assets/generated/final';

export const HOUSE_ROOMS: HouseRoom[] = [
  {
    id: 'outside',
    name: 'Yard',
    icon: `${F}/room_plant.png`,
    background: 'linear-gradient(180deg, #38bdf8 0%, #22c55e 60%, #854d0e 100%)',
    floorGradient: 'from-green-900/60 to-transparent',
    backgroundImage: `${F}/scene_outside.png`,
    primaryActions: ['care', 'train', 'arena', 'practice', 'dungeon'],
    props: [],
  },
  {
    id: 'inside',
    name: 'Home',
    icon: `${F}/room_lamp.png`,
    background: 'radial-gradient(ellipse at 50% 40%, #78350f 0%, #1c1917 100%)',
    floorGradient: 'from-amber-950/60 to-transparent',
    backgroundImage: `${F}/scene_inside.png`,
    primaryActions: ['feed', 'care', 'heal', 'shop', 'practice', 'dungeon'],
    props: [],
  },
];

export const getRoomConfig = (roomId: RoomId): HouseRoom =>
  HOUSE_ROOMS.find((r) => r.id === roomId) ?? HOUSE_ROOMS[0];

export const ROOM_ORDER: RoomId[] = HOUSE_ROOMS.map((r) => r.id);

export interface RoomBackground {
  id: string;
  name: string;
  gradient: string; // Tailwind gradient classes
}

export interface RoomDecoration {
  id: string;
  name: string;
  icon: string;
  cost: { tokens?: number; coins?: number };
  moodBonus: number;
}

export const ROOM_BACKGROUNDS: RoomBackground[] = [
  { id: 'default', name: 'Dark Cave', gradient: 'from-slate-800 to-slate-900' },
  { id: 'forest', name: 'Forest', gradient: 'from-green-900 to-slate-900' },
  { id: 'ocean', name: 'Ocean', gradient: 'from-blue-900 to-slate-900' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-orange-900 to-purple-900' },
];

export const ROOM_DECORATIONS: RoomDecoration[] = [
  { id: 'plant', name: 'Plant', icon: '/assets/generated/final/room_plant.png', cost: { tokens: 30 }, moodBonus: 2 },
  { id: 'lamp', name: 'Lamp', icon: '/assets/generated/final/room_lamp.png', cost: { tokens: 40 }, moodBonus: 3 },
  { id: 'carpet', name: 'Carpet', icon: '/assets/generated/final/room_carpet.png', cost: { tokens: 60 }, moodBonus: 5 },
  { id: 'painting', name: 'Painting', icon: '/assets/generated/final/room_painting.png', cost: { coins: 3 }, moodBonus: 8 },
];
