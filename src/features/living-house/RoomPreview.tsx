import {useEffect,useRef} from 'react';
import type {HomeBase} from '../home-base/model';
import {furniture} from '../home-base/catalog';
import {paintHouse} from './paint';
import {TILE,type World,type WorldRoom} from './world';
/** A miniature of the actual room, including the learner's furniture placements. */
export function RoomPreview({world,room,home}:{world:World;room:WorldRoom;home:HomeBase}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  let active=true;const background=document.createElement('canvas');paintHouse(background,world,home,room.floor,false);
  const draw=()=>{const c=ref.current?.getContext('2d');if(!c||!active)return;c.clearRect(0,0,120,70);c.imageSmoothingEnabled=false;const w=room.w*TILE+24,h=room.h*TILE+54,scale=Math.min(120/w,70/h);c.save();c.translate((120-w*scale)/2,(70-h*scale)/2);c.scale(scale,scale);c.drawImage(background,room.x*TILE-12,room.y*TILE-42,w,h,0,0,w,h);for(const {o,img} of art){if(!img.complete||!img.naturalWidth)continue;const f=furniture(o.placement.furnitureId)!,height=f.layer==='floor'?o.h*TILE:Math.max(40,o.h*TILE*2);const x=(o.x-room.x)*TILE+12,y=(o.y+o.h-room.y)*TILE+42-height-(f.layer==='wall'?32:0);c.save();if(o.placement.flipped){c.translate(x+o.w*TILE,y);c.scale(-1,1);c.drawImage(img,0,0,o.w*TILE,height);}else c.drawImage(img,x,y,o.w*TILE,height);c.restore();}c.restore();};
  const art=world.objects.filter(o=>o.roomId===room.id).sort((a,b)=>{const af=furniture(a.placement.furnitureId)!,bf=furniture(b.placement.furnitureId)!;return (af.layer==='floor'?-100:a.y+a.h)-(bf.layer==='floor'?-100:b.y+b.h);}).map(o=>{const img=new Image();img.onload=draw;img.src=furniture(o.placement.furnitureId)!.art;return {o,img};});draw();return()=>{active=false;for(const a of art)a.img.onload=null;};
 },[world,room,home]);
 return <canvas ref={ref} width={120} height={70} aria-hidden="true"/>;
}
