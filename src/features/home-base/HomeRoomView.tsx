import { placementStyle, placementClass } from './roomPresentation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import houseArt from '../living-house/houseArtMeta';
import { WALL_HEIGHT, WALL_HANG, FRAME, loadRoomArt, paintRoom, fitSprite } from '../living-house/houseArt';
import { TILE } from '../living-house/world';
import { WALLS, FLOORS, furniture, onDisplay, roomSize, finishFilter, type HomeRoomId } from './catalog';
import type { HomeRoom, HomePlacement, HomeBase } from './model';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import './home-base.css';
import './home-premium.css';
import './house.css';

/** The same room surfaces for decorating and the dashboard, dressed in the house-v2 room art.
 * `native` (decorating) draws the room at its true art size, scaled only by whole numbers, with the furniture grid
 * laid over the painted floor. `stretch` (dashboard scene) keeps the scene's fixed floor box and covers the extra
 * space with repeating wall and floor tiles, because the dashboard's pet movement is tied to that box. */
export function HomeRoomView({room,roomId='den',layout='native',editing=false,floorRef,children}:{room:HomeRoom;roomId?:HomeRoomId;layout?:'native'|'stretch';editing?:boolean;floorRef?:Ref<HTMLDivElement>;children:ReactNode}) {
 const {cols,rows}=roomSize(room.tier),wall=WALLS.find(w=>w.id===room.wall)!,wood=FLOORS.find(f=>f.id===room.floor)!;
 const box=useRef<HTMLDivElement>(null),paint=useRef<HTMLCanvasElement>(null),[fit,setFit]=useState({width:0,height:0});
 const tier=Math.max(0,Math.min(2,room.tier)),art='/assets/house-v2';
 const W=(cols+2)*TILE+2*FRAME.side,H=FRAME.top+WALL_HEIGHT+(rows+2)*TILE+FRAME.bottom;
 useEffect(()=>{const el=box.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setFit({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(layout!=='native')return;let live=true;
  loadRoomArt({id:roomId,tier,wall:room.wall,floor:room.floor}).then(a=>{const c=paint.current?.getContext('2d');if(!c||!live)return;c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);paintRoom(c,a,FRAME.side,FRAME.top+WALL_HEIGHT,W-2*FRAME.side,H-FRAME.top-WALL_HEIGHT-FRAME.bottom,{night:!!room.night,owned:true});}).catch(()=>{/* The grid still works without its painting. */});
  return()=>{live=false;};
 },[layout,roomId,tier,room.wall,room.floor,room.night,W,H]);
 const vars={'--wall':wall.color,'--trim':wall.trim,'--wood':wood.color,'--grain':wood.line,'--cols':cols,'--rows':rows} as CSSProperties;
 if(layout==='native'){
  const zoom=Math.max(1,Math.min(4,Math.floor(Math.min(fit.width/W,(typeof window==='undefined'?900:window.innerHeight*1.15)/H))));
  return <div ref={box} data-home-wall={room.wall} data-home-floor={room.floor} data-home-tier={room.tier} className={`hb-art-native-box ${editing?'is-building':'is-visiting'} ${room.night?'is-evening':''}`} style={{...vars,height:H*zoom}}>
   <div className="hb-art-native" style={{width:W,height:H,transform:`translateX(${Math.max(0,Math.round((fit.width-W*zoom)/2))}px) scale(${zoom})`,'--wall-hang':`${WALL_HANG}px`} as CSSProperties}>
    <canvas ref={paint} width={W} height={H} aria-hidden="true"/>
    <div ref={floorRef} className={`hb-room-floor hb-native-floor floor-${room.floor}`} role="group" aria-label="Room floor" style={{left:FRAME.side+TILE,top:FRAME.top+WALL_HEIGHT+TILE,width:cols*TILE,height:rows*TILE}}>{children}</div>
   </div>
  </div>;
 }
 const zoom=Math.max(1,Math.floor(fit.height*.34/WALL_HEIGHT));
 return <div ref={box} data-home-wall={room.wall} data-home-floor={room.floor} data-home-tier={room.tier} className={`hb-dollhouse hb-art-room ${editing?'is-building':'is-visiting'} ${room.night?'is-evening':''}`} style={{...vars,'--z':zoom,
   '--wall-art':`url(${art}/wall-${room.wall}.png)`,'--decor-art':`url(${art}/decor-${roomId}-${tier}.png)`,'--decor-w':`${houseArt.widths[tier]}px`,'--floor-art':`url(${art}/floor-${room.floor}.png)`,'--frame-side':`url(${art}/frame-left.png)`,'--frame-right':`url(${art}/frame-right.png)`,'--frame-bottom':`url(${art}/frame-bottom.png)`} as CSSProperties}>
  <div className="hb-art-wall" aria-hidden="true"/><div className="hb-art-frame" aria-hidden="true"/>
  <div ref={floorRef} className={`hb-room-floor floor-${room.floor}`} role="group" aria-label="Room floor">{children}</div>
 </div>;
}
export function FurnitureArt({placement:p}:{placement:HomePlacement}) {
 return <img src={furniture(p.furnitureId)!.art} alt="" draggable={false} onLoad={e=>{if(e.currentTarget.closest('.hb-art-native'))fitSprite(e.currentTarget,furniture(p.furnitureId)!.width*TILE);}} data-furniture-id={p.furnitureId} data-finish={p.finish??'original'} data-flipped={p.flipped} style={{transform:p.flipped?'scaleX(-1)':undefined,'--finish':finishFilter(p.finish)} as CSSProperties}/>;
}
export function SavedHomeScene({home,dispatch}:{home:HomeBase;dispatch:(action:GameEngineAction)=>void}) {
 const room=home.rooms[home.activeRoom]!;
 return <div className="saved-home-scene" data-home-room={home.activeRoom} aria-label="Your saved home"><HomeRoomView room={room} roomId={home.activeRoom} layout="stretch">{room.items.filter(p=>onDisplay(p.furnitureId)).map(p=><button key={p.id} type="button" className={placementClass(p)} style={placementStyle(room,p)} aria-label={`${furniture(p.furnitureId)!.name}, placed at ${p.x+1}, ${p.y+1}`} onClick={()=>dispatch(furniture(p.furnitureId)?.interaction==='light'?{type:'HOME_TOGGLE',id:p.id}:{type:'HOME_OPEN'})}><FurnitureArt placement={p}/></button>)}</HomeRoomView></div>;
}

/** Foreground copies share exact geometry, allowing tall furniture to occlude
 * the separately rendered dashboard pet. They never intercept room controls. */
export function SavedHomeForeground({home,petY,restingId}:{home:HomeBase;petY:number;restingId?:string}) {
 const room=home.rooms[home.activeRoom]!;
 return <div className={`saved-home-foreground ${room.night?'is-evening':''}`} aria-hidden="true"><div className="hb-foreground-floor">{room.items.filter(p=>onDisplay(p.furnitureId)).filter(p=>{
   const f=furniture(p.furnitureId)!;return f.layer==='furniture'&&p.id!==restingId&&p.y+f.height>petY+.9;
 }).map(p=><div key={p.id} className={placementClass(p)} style={placementStyle(room,p)}><img src={furniture(p.furnitureId)!.art} alt="" style={{transform:p.flipped?'scaleX(-1)':undefined,'--finish':finishFilter(p.finish)} as CSSProperties}/></div>)}</div></div>;
}
