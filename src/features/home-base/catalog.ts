import { DECOR_PRIZES } from '../clash/rewards';
import collection from './furniture-collection';
export type HomeRoomId = 'den' | 'bedroom' | 'garden' | 'studio' | 'hall' | 'landing' | 'kitchen' | 'bathroom';
export type HomeCategory = 'comfort' | 'tables' | 'nature' | 'lights' | 'wall' | 'treasures';
export interface HomeFurniture { id: string; name: string; description: string; art: string; category: HomeCategory; set: string; cost: number; width: number; height: number; layer: 'floor' | 'furniture' | 'wall'; retired?: boolean; interaction?: 'rest' | 'read' | 'water' | 'light' | 'play' | 'feed' | 'wash' | 'brush'; prize?: boolean }
const art = '/assets/generated/final';
const prop = `${art}/environment/indoor/props`;
// PixelLab furniture drawn to match the house-v2 room paintings, at native size (32px per floor tile).
const furnitureArt = '/assets/house-v2/furniture';
export const FURNITURE: HomeFurniture[] = [
  { id: 'home_cushion', name: 'Little nest cushion', description: 'A soft spot for a well-earned nap.', art: `${furnitureArt}/home_cushion.png`, category: 'comfort', set: 'First nest', cost: 0, width: 2, height: 1, layer: 'furniture', interaction: 'rest' },
  { id: 'home_chair', name: 'Woodland chair', description: 'Pull up a seat. There is always room for you.', art: `${furnitureArt}/home_chair.png`, category: 'comfort', set: 'First nest', cost: 0, width: 1, height: 1, layer: 'furniture', interaction: 'rest' },
  { id: 'home_table', name: 'Little oak table', description: 'The beginning of a cozy reading corner.', art: `${furnitureArt}/home_table.png`, category: 'tables', set: 'First nest', cost: 0, width: 2, height: 1, layer: 'furniture' },
  { id: 'home_rug', name: 'Welcome-home rug', description: 'Layer furniture over this soft woven rug.', art: `${furnitureArt}/home_rug.png`, category: 'comfort', set: 'First nest', cost: 0, width: 3, height: 2, layer: 'floor' },
  { id: 'home_plant', name: 'Leafy little friend', description: 'Brightens the room. Give it a little water!', art: `${furnitureArt}/home_plant.png`, category: 'nature', set: 'First nest', cost: 0, width: 1, height: 1, layer: 'furniture', interaction: 'water' },
  { id: 'home_window', name: 'Morning window', description: 'A little piece of the world beyond your walls.', art: `${prop}/prop_window.png`, category: 'wall', set: 'First nest', cost: 0, width: 2, height: 1, layer: 'wall', retired: true },
  { id: 'home_couch', name: 'Sunday sofa', description: 'Made for lazy afternoons and big dreams.', art: `${furnitureArt}/home_couch.png`, category: 'comfort', set: 'Storybook', cost: 25, width: 3, height: 1, layer: 'furniture', interaction: 'rest' },
  { id: 'home_bookshelf', name: 'Storykeeper shelf', description: 'Every book is another world to explore.', art: `${furnitureArt}/home_bookshelf.png`, category: 'tables', set: 'Storybook', cost: 25, width: 2, height: 1, layer: 'furniture', interaction: 'read' },
  { id: 'home_fireplace', name: 'Fireside hearth', description: 'Warm light for rainy evenings at home.', art: `${furnitureArt}/home_fireplace.png`, category: 'lights', set: 'Storybook', cost: 45, width: 2, height: 1, layer: 'furniture', interaction: 'light' },
  { id: 'home_lamp', name: 'Reading light', description: 'Just one more chapter before bedtime.', art: `${furnitureArt}/home_lamp.png`, category: 'lights', set: 'Storybook', cost: 15, width: 1, height: 1, layer: 'furniture', interaction: 'light' },
  { id: 'home_clock', name: 'Tick-tock clock', description: 'A familiar face on a cozy wall.', art: `${furnitureArt}/home_clock.png`, category: 'wall', set: 'Storybook', cost: 15, width: 1, height: 1, layer: 'wall' },
  { id: 'home_painting', name: 'A view worth keeping', description: 'Hang a little adventure on your wall.', art: `${furnitureArt}/home_painting.png`, category: 'wall', set: 'Storybook', cost: 20, width: 2, height: 1, layer: 'wall' },
  { id: 'home_toys', name: 'Treasure toy box', description: 'Full of favorites, old and new.', art: `${furnitureArt}/home_toys.png`, category: 'treasures', set: 'Playful days', cost: 20, width: 2, height: 1, layer: 'furniture', interaction: 'play' },
  { id: 'home_ball', name: 'Bouncy ball', description: 'A little fun in every corner.', art: `${furnitureArt}/home_ball.png`, category: 'treasures', set: 'Playful days', cost: 10, width: 1, height: 1, layer: 'furniture', interaction: 'play' },
  { id: 'home_bowl', name: 'Dinner is ready', description: 'A personal place at the table.', art: `${furnitureArt}/home_bowl.png`, category: 'treasures', set: 'Playful days', cost: 10, width: 1, height: 1, layer: 'furniture' },
  { id: 'home_aquarium', name: 'Tiny ocean', description: 'Watch your own peaceful underwater world.', art: `${furnitureArt}/home_aquarium.png`, category: 'nature', set: 'Garden retreat', cost: 40, width: 2, height: 1, layer: 'furniture', interaction: 'water' },
  { id: 'home_flowers', name: 'Window garden', description: 'A little more green, wherever you put it.', art: `${furnitureArt}/home_flowers.png`, category: 'nature', set: 'Garden retreat', cost: 15, width: 1, height: 1, layer: 'furniture', interaction: 'water' },
  { id: 'house_counter', name: 'Cottage kitchen counter', description: 'A place to prepare a favorite snack.', art: `${furnitureArt}/house_counter.png`, category: 'tables', set: 'Cottage essentials', cost: 0, width: 3, height: 1, layer: 'furniture', interaction: 'feed' },
  { id: 'house_tub', name: 'Warm little bathtub', description: 'A splash and a scrub, then back to play.', art: `${furnitureArt}/house_tub.png`, category: 'comfort', set: 'Cottage essentials', cost: 0, width: 2, height: 1, layer: 'furniture', interaction: 'wash' },
  { id: 'house_mirror', name: 'Morning mirror', description: 'A sunny spot to brush and get ready.', art: `${furnitureArt}/house_mirror.png`, category: 'wall', set: 'Cottage essentials', cost: 0, width: 1, height: 1, layer: 'wall', interaction: 'brush' },
  ...DECOR_PRIZES.map(d => ({ id: d.id, name: d.name, description: 'A keepsake from your adventures. Yours forever.', art: `${furnitureArt}/${d.id}.png`, category: 'treasures' as const, set: 'Adventure keepsakes', cost: d.price, width: d.id === 'clash_rug' ? 3 : 2, height: d.id === 'clash_rug' ? 2 : 1, layer: d.id === 'clash_rug' ? 'floor' as const : 'furniture' as const, prize: true })),
  ...collection as HomeFurniture[],
];
export const FINISHES = [
  { id: 'original', name: 'Original', color: '#b88959', filter: 'brightness(1)' },
  { id: 'rose', name: 'Rose', color: '#d28caa', filter: 'sepia(1) saturate(1.6) hue-rotate(285deg)' },
  { id: 'ocean', name: 'Ocean', color: '#689dc9', filter: 'sepia(1) saturate(1.8) hue-rotate(160deg)' },
  { id: 'sage', name: 'Sage', color: '#8ab482', filter: 'sepia(1) saturate(1.2) hue-rotate(55deg)' },
  { id: 'lilac', name: 'Lilac', color: '#ad94cc', filter: 'sepia(1) saturate(1.5) hue-rotate(215deg)' },
  { id: 'honey', name: 'Honey', color: '#ddb86a', filter: 'sepia(.9) saturate(1.6)' },
  { id: 'cherry', name: 'Cherry', color: '#be635a', filter: 'sepia(1) saturate(3) hue-rotate(315deg)' },
  { id: 'pearl', name: 'Pearl', color: '#ece8df', filter: 'grayscale(1) brightness(1.45)' },
  { id: 'slate', name: 'Slate', color: '#6c7880', filter: 'grayscale(1) brightness(.7)' },
];
export const finishFilter = (id?: string) => FINISHES.find(f => f.id === id)?.filter ?? 'brightness(1)';
export const HOME_ROOMS: { floor: 0 | 1; id: HomeRoomId; name: string; note: string; cost: number; symbol: string }[] = [
  { floor: 0, id: 'hall', name: 'Welcome hall', note: 'Front door, stairs, and a place to begin.', cost: 0, symbol: '⌂' },
  { floor: 0, id: 'kitchen', name: 'Kitchen', note: 'Something delicious, made with love.', cost: 0, symbol: '♧' },
  { floor: 1, id: 'landing', name: 'Upstairs nook', note: 'A cozy landing at the top of the stairs.', cost: 0, symbol: '☀' },
  { floor: 1, id: 'bathroom', name: 'Bathroom', note: 'Bubbles, brushes, and fresh beginnings.', cost: 0, symbol: '♨' },
  { floor: 0, id: 'den', name: 'Cozy den', note: 'Where every day begins.', cost: 0, symbol: '⌂' },
  { floor: 1, id: 'bedroom', name: 'Dream room', note: 'A quiet place to recharge.', cost: 35, symbol: '☾' },
  { floor: 0, id: 'garden', name: 'Sunroom', note: 'Let a little sunshine in.', cost: 50, symbol: '✿' },
  { floor: 1, id: 'studio', name: 'Creative corner', note: 'A space for big ideas.', cost: 65, symbol: '✦' },
];
export const WALLS = [
  { id: 'sage', name: 'Sage cottage', color: '#8eaf96', trim: '#385d4b' },
  { id: 'cream', name: 'Vanilla linen', color: '#dfcdb0', trim: '#8d6a48' },
  { id: 'rose', name: 'Rosebud', color: '#c69b9b', trim: '#805b68' },
  { id: 'blue', name: 'Seaside stripes', color: '#99b9c6', trim: '#466d86' },
  { id: 'night', name: 'Starry evening', color: '#657495', trim: '#303e61' },
];
export const FLOORS = [
  { id: 'oak', name: 'Honey oak', color: '#bc8b5c', line: '#82552f' },
  { id: 'walnut', name: 'Toasted walnut', color: '#785740', line: '#4a3429' },
  { id: 'birch', name: 'Pale birch', color: '#d9c7a3', line: '#ac956f' },
  { id: 'tile', name: 'Garden tile', color: '#96ad9a', line: '#607f70' },
];
export const roomSize = (tier: number) => tier === 2 ? { cols: 12, rows: 8 } : tier === 1 ? { cols: 10, rows: 7 } : { cols: 8, rows: 6 };
export const furniture = (id: string) => FURNITURE.find(f => f.id === id);
/** Retired pieces stay in saves but are no longer shown: every painted room wall now has its own windows. */
export const onDisplay = (id: string) => !furniture(id)?.retired;
