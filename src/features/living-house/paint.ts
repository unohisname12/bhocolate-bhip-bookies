import {TILE,type World} from './world';
import {FLOORS,WALLS} from '../home-base/catalog';
import type {HomeBase} from '../home-base/model';
/** Architecture is drawn at native pixel resolution; furniture remains movable sprites. */
export function paintHouse(canvas:HTMLCanvasElement,w:World,home:HomeBase,floor:number,night:boolean){
 const c=canvas.getContext('2d')!;canvas.width=w.width*TILE;canvas.height=w.height*TILE;c.imageSmoothingEnabled=false;
 const rect=(x:number,y:number,ww:number,hh:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(ww),Math.round(hh));};
 rect(0,0,canvas.width,canvas.height,night?'#142928':'#284638');
 for(let y=0;y<canvas.height;y+=12)for(let x=0;x<canvas.width;x+=16){const n=(x*17+y*31)%73;if(n<23){rect(x,y,2,4,'#35513d');rect(x+3,y-2,2,5,'#304b37');}}
 const floorRooms=w.rooms.filter(r=>r.floor===floor),top=floorRooms.filter(r=>r.y===3),bottom=floorRooms.find(r=>r.y>3)!;
 const left=Math.min(...top.map(r=>r.x))*TILE-14,right=Math.max(...top.map(r=>r.x+r.w))*TILE+14,maxY=Math.max(...top.map(r=>r.y+r.h))*TILE+14;
 rect(left,3*TILE-47,right-left,maxY-(3*TILE-47),'#554330');rect(bottom.x*TILE-14,maxY-5,bottom.w*TILE+28,(bottom.y+bottom.h)*TILE-maxY+20,'#554330');
 for(const r of w.rooms.filter(r=>r.floor===floor)){
  const x=r.x*TILE,y=r.y*TILE,ww=r.w*TILE,hh=r.h*TILE;const saved=home.rooms[r.id],wood=FLOORS.find(f=>f.id===saved?.floor)?.color??'#a18963',wall=WALLS.find(f=>f.id===saved?.wall)?.color??'#b1ad85';
  rect(x-12,y-40,ww+30,hh+62,'#162820');rect(x-9,y-42,ww+18,hh+55,'#4c382d');
  rect(x,y,ww,hh,r.owned?wood:'#5f6250');
  if(r.owned)for(let yy=0;yy<r.h*2;yy++){rect(x,y+yy*16,ww,1,'#7e604644');for(let xx=0;xx<r.w;xx++){const offset=yy%2?16:0;rect(x+xx*32+offset,y+yy*16,1,16,'#76594040');if((xx+yy)%3===0)rect(x+xx*32+7,y+yy*16+5,13,1,'#e1c28c35');}}
  rect(x-6,y-35,ww+12,35,wall);rect(x-6,y-37,ww+12,4,'#d0b482');rect(x-6,y-4,ww+12,7,'#5f4632');rect(x-6,y-6,ww+12,2,'#d6b47b');
  for(let xx=0;xx<=r.w;xx+=3){rect(x+xx*32-3,y-34,6,30,'#765838');rect(x+xx*32-1,y-34,1,30,'#b4925e');}
  rect(x-7,y,7,hh+5,'#715437');rect(x+ww,y,7,hh+5,'#493a2e');rect(x-7,y+hh,ww+14,6,'#c49c63');rect(x-7,y+hh+6,ww+14,6,'#584432');
  if(r.owned){const wx=x+ww/2-17;rect(wx-3,y-34,40,32,'#5b4231');rect(wx,y-32,34,28,night?'#3c5a6a':'#a2c7b3');rect(wx+2,y-30,13,11,night?'#506b7b':'#d6e6b4');rect(wx+17,y-30,15,11,night?'#455871':'#c7dcaa');rect(wx+16,y-32,2,28,'#765d3e');rect(wx,y-19,34,2,'#765d3e');rect(wx-4,y-4,42,4,'#cdb37b');
   c.fillStyle=night?'#9ab0cb0a':'#fff1b518';c.beginPath();c.moveTo(wx,y+2);c.lineTo(wx+34,y+2);c.lineTo(wx+100,y+130);c.lineTo(wx+30,y+130);c.fill();
  }else{c.fillStyle='#b6b397';c.font='9px monospace';c.textAlign='center';c.fillText('ROOM TO GROW',x+ww/2,y+hh/2);}
 }
 // Door openings are physical walkable tiles between room footprints.
 for(const p of w.open.values()){if(p.floor!==floor||w.rooms.some(r=>r.floor===floor&&p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h))continue;rect(p.x*TILE,p.y*TILE,TILE,TILE,'#ad8958');rect(p.x*TILE,p.y*TILE+15,TILE,1,'#8e6b47');}
 for(const d of w.doors.filter(d=>d.floor===floor)){rect(d.x*TILE+2,d.y*TILE-6,4,8,'#ddbc83');rect(d.x*TILE+26,d.y*TILE-6,4,8,'#5e432d');}
 const stair=w.stairs[floor];if(stair){const x=stair.x*TILE-9,y=stair.y*TILE;rect(x-3,y-33,31,83,'#473828');for(let i=0;i<8;i++){rect(x,y-28+i*9,25,7,i%2?'#b08c58':'#c4a16b');rect(x,y-21+i*9,25,2,'#644a33');rect(x,y-28+i*9,25,1,'#dec28e');}rect(x-5,y-35,4,84,'#debf81');rect(x+27,y-35,4,84,'#755436');}
}
