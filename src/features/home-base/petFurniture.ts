import { furniture } from './catalog';
import type { HomePlacement, HomeRoom } from './model';
import { openSpots, roomPath } from './roomLife';
import { objectSignature } from '../pet-mind/memory';
import type { RoomLife, Spot } from './roomLife';

export interface FurnitureWork {
  id: string;
  signature: string;
  target: Spot;
  origin: Spot;
  phase: 'approach' | 'carry' | 'push' | 'celebrate';
  ticks: number;
  label: string;
}
// Only accepted layout changes create work. Loading a room is not a delivery.
export function changedFurniture(before: HomePlacement[], room: HomeRoom) {
  return room.items.filter(p => {
    const old = before.find(o => o.id === p.id);
    return !old || old.x !== p.x || old.y !== p.y || old.flipped !== p.flipped;
  }).at(-1);
}
export function furnitureWork(room: HomeRoom, item: HomePlacement, from: Spot): FurnitureWork | undefined {
  const f = furniture(item.furnitureId)!;
  const transit={...room,items:room.items.filter(p=>p.id!==item.id)};
  const spaces=openSpots(transit);
  from=spaces.find(p=>p.x===from.x&&p.y===from.y)??spaces.sort((a,b)=>(Math.abs(a.x-from.x)+Math.abs(a.y-from.y))-(Math.abs(b.x-from.x)+Math.abs(b.y-from.y)))[0]??from;
  // Prefer a side grip so tall furniture does not hide the helper.
  const distance=(p:Spot)=>Math.abs(p.x-from.x)+Math.abs(p.y-from.y)+(p.x>=item.x&&p.x<item.x+f.width?2:0);
  const target=openSpots(transit).filter(p=>((p.x===item.x-1||p.x===item.x+f.width)&&p.y>=item.y&&p.y<item.y+f.height)||((p.y===item.y-1||p.y===item.y+f.height)&&p.x>=item.x&&p.x<item.x+f.width))
    .filter(p=>{const end=roomPath(transit,from,p).at(-1)??from;return end.x===p.x&&end.y===p.y;}).sort((a,b)=>distance(a)-distance(b))[0];
  if (!target) return;
  return { id: item.id, signature: objectSignature(item), target, origin:from, phase: 'approach', ticks: 2,
    label: f.layer === 'wall' ? 'Checking the wall decoration' : f.layer === 'floor' ? 'Smoothing out the rug' : 'Pushing into place' };
}
// Keep routing on open floor. The seated/lying sprite settles visually onto the
// surface only after arrival, then returns to its approach tile before walking.
export function furniturePose(room: HomeRoom, life: RoomLife) {
  const item = room.items.find(p => p.id === life.objectId);
  const f = item && furniture(item.furnitureId);
  if (!item || !f || life.path.length || life.ticks <= 0 || f.interaction !== 'rest' || life.activity === 'Investigating furniture' || life.activity === 'Checking the new arrangement') {
    return { x: life.x, y: life.y, pose: 'standing' };
  }
  return { x: item.x + (f.width - 1) / 2, y: item.y + (f.height - 1) / 2 - .3,
    pose: /chair|armchair|bench/.test(f.id) ? 'sitting' : 'lying' };
}
