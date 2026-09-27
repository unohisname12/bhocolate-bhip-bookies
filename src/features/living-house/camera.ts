import {TILE,type World,type WorldRoom} from './world';
export type HouseView='room'|'close'|'house';
export function frameRoom(world:World,room:WorldRoom,width:number,height:number,mode:HouseView,zoom=1){
 const rooms=mode==='house'?world.rooms.filter(r=>r.owned&&r.floor===room.floor):[room];
 const left=Math.min(...rooms.map(r=>r.x))*TILE-18,top=Math.min(...rooms.map(r=>r.y))*TILE-48;
 const right=Math.max(...rooms.map(r=>r.x+r.w))*TILE+18,bottom=Math.max(...rooms.map(r=>r.y+r.h))*TILE+30;
 const fit=Math.min(Math.max(120,width-32)/(right-left),Math.max(150,height-140)/(bottom-top));
 return {x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(3.5,fit*(mode==='close'?1.5:mode==='house'?1:zoom))};
}
