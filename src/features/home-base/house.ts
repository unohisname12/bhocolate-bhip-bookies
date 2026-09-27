import type { Pet } from '../../types/pet';
import { createMind } from '../pet-mind/memory';
import { effectiveTraits } from '../pet-mind/life';
import { HOME_ROOMS, roomSize, type HomeRoomId } from './catalog';
import type { HomeBase, HomeRoom } from './model';
import { openSpots, roomPath, type Spot } from './roomLife';

export const HOUSE_LINKS: Record<HomeRoomId, HomeRoomId[]> = {
  den: ['hall'], kitchen: ['hall'], garden: ['hall'], hall: ['den','kitchen','garden','landing'],
  landing: ['hall','bedroom','bathroom','studio'], bedroom: ['landing'], bathroom: ['landing'], studio: ['landing'],
};
export const roomName = (id: HomeRoomId) => HOME_ROOMS.find(r => r.id === id)!.name;
export const floorOf = (id: HomeRoomId) => HOME_ROOMS.find(r => r.id === id)!.floor;
export const floorName = (id: HomeRoomId) => floorOf(id) ? 'Upstairs' : 'Downstairs';
/** Room graph is structural. Furniture can never remove a staircase or its landing. */
export function houseRoute(home: HomeBase, destination: HomeRoomId): HomeRoomId[] {
  if (!home.rooms[destination]) return [];
  const queue: HomeRoomId[][] = [[home.activeRoom]], seen = new Set([home.activeRoom]);
  for (let i=0;i<queue.length;i++) {
    const path=queue[i],last=path[path.length-1];
    if (last===destination) return path;
    for (const next of HOUSE_LINKS[last]) if (home.rooms[next] && !seen.has(next)) { seen.add(next); queue.push([...path,next]); }
  }
  return [];
}
/** Architectural threshold sits outside the furniture footprint; choose an accessible approach. */
export function entrySpot(room: HomeRoom): Spot {
  const {cols,rows}=roomSize(room.tier),door={x:Math.floor(cols/2),y:rows-1};
  return openSpots(room).sort((a,b)=>Math.abs(a.x-door.x)+Math.abs(a.y-door.y)-Math.abs(b.x-door.x)-Math.abs(b.y-door.y))[0] ?? door;
}
export function exitSpot(room: HomeRoom, from: Spot): Spot {
  const target=entrySpot(room),path=roomPath(room,from,target);
  return path.at(-1)??from;
}
export function householdWish(pet: Pet | null, home: HomeBase): {room: HomeRoomId;text:string} | undefined {
  if (!pet || pet.state==='dead' || pet.state==='sleeping') return undefined;
  const mind=pet.mind??createMind(pet),t=effectiveTraits(mind.traits,mind.life);
  const wants: {room:HomeRoomId;text:string;score:number}[]=[
    {room:'kitchen',text:'A snack in the kitchen sounds lovely.',score:pet.needs.hunger<40?200:0},
    {room:'bathroom',text:'How about a little wash and brush?',score:pet.needs.cleanliness<40?180:0},
    {room:'den',text:'Let’s find a toy and play together.',score:t.playfulness*60+(100-pet.needs.happiness)*.3},
    {room:'studio',text:'A quiet reading corner sounds lovely.',score:t.quiet*60+(mind.life?.tallies['preference:books']??0)*2},
    {room:'garden',text:'Shall we check on our leafy friends?',score:t.nature*60+(mind.life?.tallies['preference:plants']??0)*2},
    {room:'landing',text:'Come upstairs for a cozy little break.',score:t.comfort*55},
  ];
  if (pet.needs.health<30) return undefined;
  return wants.filter(w=>w.room!==home.activeRoom&&w.score>0&&houseRoute(home,w.room).length>1).sort((a,b)=>b.score-a.score)[0];
}
