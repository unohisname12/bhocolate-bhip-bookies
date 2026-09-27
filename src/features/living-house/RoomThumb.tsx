import {useEffect,useRef} from 'react';
import {furniture,onDisplay,roomSize,type HomeRoomId} from '../home-base/catalog';
import type {HomeRoom} from '../home-base/model';
import {loadRoomArt,paintRoom,WALL_HEIGHT,WALL_HANG,FRAME} from './houseArt';
import {TILE} from './world';

/** Paint one room, furniture included, at native art size. Placements sit inside the one-tile walkable ring. */
export async function paintRoomScene(canvas:HTMLCanvasElement,id:HomeRoomId,room:HomeRoom|undefined){
 const tier=room?.tier??0,{cols,rows}=roomSize(tier),w=(cols+2)*TILE,h=(rows+2)*TILE,x=FRAME.side,y=FRAME.top+WALL_HEIGHT;
 const art=await loadRoomArt({id,tier,wall:room?.wall??'sage',floor:room?.floor??'oak'});
 const items=(room?.items??[]).filter(p=>onDisplay(p.furnitureId)).map(p=>({p,f:furniture(p.furnitureId)!})).filter(i=>i.f)
  .sort((a,b)=>(a.f.layer==='floor'?-100:a.f.layer==='wall'?-50:a.p.y+a.f.height)-(b.f.layer==='floor'?-100:b.f.layer==='wall'?-50:b.p.y+b.f.height));
 const sprites=await Promise.all(items.map(i=>new Promise<HTMLImageElement|null>(done=>{const img=new Image();img.onload=()=>done(img);img.onerror=()=>done(null);img.src=i.f.art;})));
 canvas.width=w+2*FRAME.side;canvas.height=y+h+FRAME.bottom;
 const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;
 paintRoom(c,art,x,y,w,h,{night:!!room?.night,owned:!!room});
 items.forEach(({p,f},i)=>{
  const img=sprites[i];if(!img||!room)return;const foot=f.width*TILE,scale=img.naturalWidth<=foot*1.6?1:img.naturalWidth/2<=foot*1.6?.5:.25;
  const sw=Math.round(img.naturalWidth*scale),sh=Math.round(img.naturalHeight*scale),cx=x+(1+p.x+f.width/2)*TILE;
  const bottom=f.layer==='wall'?y+(2+p.y)*TILE-WALL_HANG:f.layer==='floor'?y+(1+p.y+f.height/2)*TILE+sh/2:y+(1+p.y+f.height)*TILE;
  c.save();c.translate(Math.round(cx),Math.round(bottom-sh));if(p.flipped)c.scale(-1,1);c.drawImage(img,Math.round(-sw/2),0,sw,sh);c.restore();
 });
}

/** A small, smoothly reduced picture of a room for maps and pickers, framed on the lower wall and the floor. */
export function RoomThumb({id,room,width,height,className}:{id:HomeRoomId;room:HomeRoom|undefined;width:number;height:number;className?:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  let live=true;const scene=document.createElement('canvas');
  paintRoomScene(scene,id,room).then(()=>{
   const c=ref.current?.getContext('2d');if(!c||!live)return;
   const sh=Math.min(scene.height,Math.round(scene.width*height/width)),floorTop=FRAME.top+WALL_HEIGHT,sy=Math.max(0,Math.min(scene.height-sh,Math.round(floorTop-sh*.72)));
   c.clearRect(0,0,width,height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(scene,0,sy,scene.width,sh,0,0,width,height);
  }).catch(()=>{/* A missing picture leaves the empty frame; the room button still works. */});
  return()=>{live=false;};
 },[id,room,width,height]);
 return <canvas ref={ref} width={width} height={height} className={className} aria-hidden="true"/>;
}
