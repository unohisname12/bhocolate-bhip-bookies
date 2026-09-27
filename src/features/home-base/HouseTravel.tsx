import { HouseArt } from './HouseArt';
import { useEffect, useRef } from 'react';
import { PetSprite } from '../../components/pet/PetSprite';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Pet } from '../../types/pet';
import type { HomeRoomId } from './catalog';
import { floorOf, roomName } from './house';
export interface HouseJourney { petId?:string; id:number; from:HomeRoomId; to:HomeRoomId; route:HomeRoomId[]; phase:'depart'|'cross' }

/** A transient journey commits one destination only after travel, so interrupted travel is safe. */
export function HouseTravel({journey,pet,onArrive,onCancel}:{journey:HouseJourney;pet:Pet|null;onArrive:()=>void;onCancel:()=>void}) {
  const visible=usePageVisible(),reduced=useReducedMotion(),done=useRef(onArrive);
  useEffect(()=>{done.current=onArrive;},[onArrive]);
  const upstairs=floorOf(journey.to)>floorOf(journey.from),stairs=floorOf(journey.to)!==floorOf(journey.from);
  const duration=reduced?50:stairs?2400:1200;
  useEffect(()=>{
    if(!visible||journey.phase!=='cross')return;
    const timer=setTimeout(()=>done.current(),duration);
    return ()=>clearTimeout(timer);
  },[journey.id,journey.phase,visible,duration]);
  const moving=journey.phase==='cross';
  return <div className="house-journey" role="dialog" aria-modal="true" aria-label={`Going to ${roomName(journey.to)}`} onKeyDown={e=>{if(e.key==='Escape')onCancel();}}>
    <div className="house-journey-card"><span className="house-eyebrow">A LITTLE WALK THROUGH HOME</span><h2>{moving?(stairs?upstairs?'Up we go!':'Back downstairs':`Into the ${roomName(journey.to).toLowerCase()}`):'Heading to the door…'}</h2>
      <div className={`house-passage ${stairs?'has-stairs':''} ${upstairs?'going-up':'going-down'}`} data-moving={moving} data-paused={!visible||reduced} style={{'--travel-time':`${duration}ms`} as React.CSSProperties}>
        <div className="passage-door from-door"/><div className="passage-door to-door"/>{stairs&&<div className="passage-stairs" aria-hidden="true"><HouseArt piece="stairs-east"/></div>}
        {pet&&<div className="passage-pet"><PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={pet.state==='sleeping'?'sleeping':pet.state==='dead'?'dead':moving?'walking':'idle'} paused={!visible||reduced} scale={.95}/></div>}
      </div><p role="status">{journey.route.map(roomName).join(' → ')}</p><button autoFocus onClick={onCancel}>Stay in {roomName(journey.from)}</button>
    </div>
  </div>;
}
