import { furniture, roomSize } from './catalog';
import type { HomeRoom } from './model';
export interface Spot { x: number; y: number }
export function openSpots(room: HomeRoom): Spot[] {
  const { cols, rows } = roomSize(room.tier);
  return Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) })).filter(p => !room.items.some(i => {
    const f = furniture(i.furnitureId)!;
    return f.layer === 'furniture' && p.x >= i.x && p.x < i.x + f.width && p.y >= i.y && p.y < i.y + f.height;
  }));
}
const distance = (a: Spot, b: Spot) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
// Breadth-first routes stay on free floor tiles. An occupied target resolves to
// the closest reachable tile beside it; enclosed furniture cannot trap the pet.
export function roomPath(room: HomeRoom, from: Spot, target: Spot): Spot[] {
  const open = openSpots(room), seen = new Set([`${from.x},${from.y}`]);
  const queue: { spot: Spot; path: Spot[] }[] = [{ spot: from, path: [] }];
  let best = queue[0];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (distance(current.spot, target) < distance(best.spot, target)) best = current;
    if (distance(current.spot,target) === 0) return current.path;
    for (const next of open.filter(p => distance(p,current.spot) === 1)) {
      const key = `${next.x},${next.y}`;
      if (!seen.has(key)) { seen.add(key); queue.push({ spot: next, path: [...current.path,next] }); }
    }
  }
  return best.path;
}
export interface RoomLife extends Spot { objectId?: string; book?: {shelfId:string;phase:'take'|'read'|'return';ticks:number}; path: Spot[]; animation: string; bubble: string; activity: string; ticks: number; hearts: boolean; ball?: Spot; returning?: Spot; memories: string[]; visits: number }
export const initialLife = (room: HomeRoom): RoomLife => ({ ...(openSpots(room).find(p => p.x===3 && p.y===4) ?? openSpots(room)[0] ?? {x:3,y:4}), path: [], animation: 'idle', bubble: 'You’re home! What shall we do?', activity: 'Settling in', ticks: 5, hearts: false, memories: [], visits: 0 });
export function startActivity(life: RoomLife, room: HomeRoom, target: Spot, activity: string, bubble: string, animation='idle'): RoomLife {
  return { ...life, objectId: undefined, book: undefined, path: roomPath(room,life,target), activity, bubble, animation, ticks: 10, hearts: animation==='happy', ball: undefined, returning: undefined };
}
export function tickLife(life: RoomLife, room: HomeRoom, roaming: boolean, random: number): RoomLife {
  const open = openSpots(room);
  if (open.length && !open.some(p => p.x===life.x && p.y===life.y)) return { ...initialLife(room), memories: life.memories };
  if (life.path.length && !open.some(p => p.x===life.path[0].x && p.y===life.path[0].y)) return { ...life, path: [], ticks: 0, objectId:undefined, book:undefined, activity:'Looking for a path', bubble:'Something is in the way. Let’s find another route.' };
  if (life.path.length) return { ...life, ...life.path[0], path: life.path.slice(1) };
  if (life.ball && life.returning) return { ...life, objectId: undefined, book: undefined, path: roomPath(room,life,life.returning), ball: undefined, returning: undefined, bubble: 'Got it! Bringing it back to you.', activity: 'Bringing the ball back', animation: 'happy', ticks: 8 };
  const shelf=room.items.find(p=>p.id===(life.book?.shelfId??life.objectId));
  if(life.book){
    if(!shelf||furniture(shelf.furnitureId)?.interaction!=='read')return {...life,book:undefined,objectId:undefined,ticks:0,activity:'Looking for another story',bubble:'Let’s choose another spot.'};
    if(life.book.ticks>1)return {...life,book:{...life.book,ticks:life.book.ticks-1}};
    if(life.book.phase==='take')return {...life,book:{...life.book,phase:'read',ticks:12},activity:'Reading a book',bubble:'Let’s see what happens on the next page.',animation:'idle'};
    if(life.book.phase==='read')return {...life,book:{...life.book,phase:'return',ticks:3},activity:'Putting the book back',bubble:'Back on the shelf for our next story.'};
    return {...life,book:undefined,objectId:undefined,ticks:6,activity:'Finished reading',bubble:'That was a lovely little story.',animation:'happy',hearts:true};
  }
  if(life.activity==='Story time'&&shelf&&furniture(shelf.furnitureId)?.interaction==='read')return {...life,book:{shelfId:shelf.id,phase:'take',ticks:3},activity:'Taking a book',bubble:'This one looks interesting!',animation:'happy'};
  if (life.ticks > 0) return { ...life, ticks: life.ticks-1 };
  if (!roaming) return { ...life, animation: 'idle', hearts: false, activity: 'Relaxing with you' };
  const destinations = room.items.filter(i => ['rest','read','water','play'].includes(furniture(i.furnitureId)?.interaction ?? ''));
  const choice = life.visits % 3;
  if (choice !== 2 && destinations.length) {
    const item = destinations[Math.floor(random*destinations.length)], def = furniture(item.furnitureId)!;
    const detail = { rest: ['Taking a nap','A perfect spot for a little nap…','sleeping'], read: ['Story time','I wonder what happens on the next page…','idle'], water: ['Tending the plants','A little water for our leafy friends.','happy'], play: ['Playing with toys','Look what I found! Want to play?','happy'] }[def.interaction as 'rest'|'read'|'water'|'play'];
    return { ...startActivity(life,room,{x:item.x,y:item.y+def.height},...detail as [string,string,string]), visits: life.visits+1 };
  }
  const spots = openSpots(room), target = spots[Math.floor(random*spots.length)] ?? life;
  return { ...startActivity(life,room,target,'Exploring the room','Just checking on my favorite little corners.'), visits: life.visits+1 };
}
