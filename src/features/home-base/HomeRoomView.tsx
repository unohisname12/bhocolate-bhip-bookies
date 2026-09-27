import { HouseTexture } from './HouseArt';
import { placementStyle, placementClass } from './roomPresentation';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { WALLS, FLOORS, furniture, roomSize, finishFilter } from './catalog';
import type { HomeRoom, HomePlacement, HomeBase } from './model';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import './home-base.css';
import './home-premium.css';
import './house.css';

/** The same room geometry and surfaces for decorating and the dashboard. */
export function HomeRoomView({room,editing=false,floorRef,children}:{room:HomeRoom;editing?:boolean;floorRef?:Ref<HTMLDivElement>;children:ReactNode}) {
 const {cols,rows}=roomSize(room.tier),wall=WALLS.find(w=>w.id===room.wall)!,wood=FLOORS.find(f=>f.id===room.floor)!;
 return <div data-home-wall={room.wall} data-home-floor={room.floor} data-home-tier={room.tier} className={`hb-dollhouse ${editing?'is-building':'is-visiting'} ${room.night?'is-evening':''}`} style={{'--wall':wall.color,'--trim':wall.trim,'--wood':wood.color,'--grain':wood.line,'--cols':cols,'--rows':rows} as CSSProperties}>
  <div className="hb-roofline"/><div className={`hb-back-wall pattern-${room.wall}`}><HouseTexture piece="wall"/><span className="hb-wall-rail"/><span className="hb-wall-panel"/></div><div className="hb-left-wall"/><div className="hb-right-wall"/>
  <div ref={floorRef} className={`hb-room-floor floor-${room.floor}`} role="group" aria-label="Room floor"><HouseTexture piece="floor"/><div className="hb-sunbeam"/>{children}</div>
  <div className="hb-room-atmosphere" aria-hidden="true"><i/><i/><i/><i/><i/></div><div className="hb-front-edge"/><div className="hb-doormat">home, sweet home</div>
 </div>;
}
export function FurnitureArt({placement:p}:{placement:HomePlacement}) {
 return <img src={furniture(p.furnitureId)!.art} alt="" draggable={false} data-furniture-id={p.furnitureId} data-finish={p.finish??'original'} data-flipped={p.flipped} style={{transform:p.flipped?'scaleX(-1)':undefined,'--finish':finishFilter(p.finish)} as CSSProperties}/>;
}
export function SavedHomeScene({home,dispatch}:{home:HomeBase;dispatch:(action:GameEngineAction)=>void}) {
 const room=home.rooms[home.activeRoom]!;
 return <div className="saved-home-scene" data-home-room={home.activeRoom} aria-label="Your saved home"><HomeRoomView room={room}>{room.items.map(p=><button key={p.id} type="button" className={placementClass(p)} style={placementStyle(room,p)} aria-label={`${furniture(p.furnitureId)!.name}, placed at ${p.x+1}, ${p.y+1}`} onClick={()=>dispatch(furniture(p.furnitureId)?.interaction==='light'?{type:'HOME_TOGGLE',id:p.id}:{type:'HOME_OPEN'})}><FurnitureArt placement={p}/></button>)}</HomeRoomView></div>;
}

/** Foreground copies share exact geometry, allowing tall furniture to occlude
 * the separately rendered dashboard pet. They never intercept room controls. */
export function SavedHomeForeground({home,petY,restingId}:{home:HomeBase;petY:number;restingId?:string}) {
 const room=home.rooms[home.activeRoom]!;
 return <div className={`saved-home-foreground ${room.night?'is-evening':''}`} aria-hidden="true"><div className="hb-foreground-floor">{room.items.filter(p=>{
   const f=furniture(p.furnitureId)!;return f.layer==='furniture'&&p.id!==restingId&&p.y+f.height>petY+.9;
 }).map(p=><div key={p.id} className={placementClass(p)} style={placementStyle(room,p)}><img src={furniture(p.furnitureId)!.art} alt="" style={{transform:p.flipped?'scaleX(-1)':undefined,'--finish':finishFilter(p.finish)} as CSSProperties}/></div>)}</div></div>;
}
