import type { Spot } from './roomLife';
export interface RoomMotion { moving:boolean; facingLeft:boolean; duration:number }
export const initialMotion:RoomMotion={moving:false,facingLeft:false,duration:340};
export function motionForStep(from:Spot,to:Spot,previous:RoomMotion,timing={x:340,y:220}):RoomMotion {
  const dx=to.x-from.x,dy=to.y-from.y;
  return {moving:dx!==0||dy!==0,facingLeft:dx===0?previous.facingLeft:dx<0,duration:dx!==0?timing.x:dy!==0?timing.y:previous.duration};
}
