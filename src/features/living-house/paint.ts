import {TILE,type World} from './world';
import type {HomeBase} from '../home-base/model';
import {loadRoomArt,loadStairs,paintRoom,paintFloor,band,FRAME,type RoomArt} from './houseArt';

/** Architecture is drawn from PixelLab room art at native pixel resolution; furniture remains movable sprites. */
export async function paintHouse(canvas:HTMLCanvasElement,w:World,home:HomeBase,floor:number,night:boolean){
 const rooms=w.rooms.filter(r=>r.floor===floor);
 const arts=new Map<string,RoomArt>(await Promise.all(rooms.map(async r=>{const saved=home.rooms[r.id];return [r.id,await loadRoomArt({id:r.id,tier:saved?.tier??0,wall:saved?.wall??'sage',floor:saved?.floor??'oak'})] as const;})));
 const c=canvas.getContext('2d')!;canvas.width=w.width*TILE;canvas.height=w.height*TILE;c.imageSmoothingEnabled=false;
 c.fillStyle=night?'#0b0a12':'#16100d';c.fillRect(0,0,canvas.width,canvas.height);
 for(const r of rooms)paintRoom(c,arts.get(r.id)!,r.x*TILE,r.y*TILE,r.w*TILE,r.h*TILE,{night,owned:r.owned});
 // Hallways are walkable tiles outside every room. Painting them last carves doorways through walls and frames.
 const inRoom=(x:number,y:number)=>rooms.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
 const open=(x:number,y:number)=>w.open.has(`${floor}:${x},${y}`);
 const hall=[...w.open.values()].filter(p=>p.floor===floor&&!inRoom(p.x,p.y));
 const nearestArt=(x:number,y:number)=>arts.get(rooms.filter(r=>r.owned).sort((a,b)=>Math.hypot(a.x+a.w/2-x,a.y+a.h/2-y)-Math.hypot(b.x+b.w/2-x,b.y+b.h/2-y))[0]?.id??rooms[0].id)!;
 for(const p of hall)paintFloor(c,nearestArt(p.x,p.y),p.x*TILE,p.y*TILE,TILE,TILE);
 for(const p of hall){
  const art=nearestArt(p.x,p.y),x=p.x*TILE,y=p.y*TILE,side=FRAME.side;
  if(!open(p.x-1,p.y)&&!inRoom(p.x-1,p.y))c.drawImage(art.frame.left,x-side,y,side,TILE);
  if(!open(p.x+1,p.y)&&!inRoom(p.x+1,p.y))c.drawImage(art.frame.right,x+TILE,y,side,TILE);
  if(!open(p.x,p.y-1)&&!inRoom(p.x,p.y-1)){c.drawImage(art.frame.top,x,y-FRAME.top,TILE,FRAME.top);band(c,'#2a1510',[[3,.3],[4,.15]],x,y,TILE,1);}
  if(!open(p.x,p.y+1)&&!inRoom(p.x,p.y+1))c.drawImage(art.frame.bottom,x,y+TILE,TILE,FRAME.bottom);
 }
 const stair=w.stairs[floor];
 if(stair){const img=await loadStairs(floor===1);c.drawImage(img,(stair.x+1)*TILE-img.width-2,(stair.y+1)*TILE-img.height+(floor===1?8:0));}
}
