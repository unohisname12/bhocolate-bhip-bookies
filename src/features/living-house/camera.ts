import {TILE,type World,type WorldRoom} from './world';
import {WALL_HEIGHT,FRAME} from './houseArt';
export type HouseView='room'|'close'|'house';
export const MAX_ZOOM_STEP=4;
/** Pixel art only stays crisp when each art pixel covers a whole number of device pixels. */
export function crispZoom(zoom:number,dpr=typeof window==='undefined'?1:window.devicePixelRatio||1){
 const device=Math.floor(zoom*dpr+1e-6);
 return device>=1?device/dpr:zoom;
}
export function frameRoom(world:World,room:WorldRoom,width:number,height:number,mode:HouseView,zoom=1){
 const rooms=mode==='house'?world.rooms.filter(r=>r.owned&&r.floor===room.floor):[room];
 const left=Math.min(...rooms.map(r=>r.x))*TILE-FRAME.side-4,top=Math.min(...rooms.map(r=>r.y))*TILE-WALL_HEIGHT-FRAME.top-4;
 const right=Math.max(...rooms.map(r=>r.x+r.w))*TILE+FRAME.side+4,bottom=Math.max(...rooms.map(r=>r.y+r.h))*TILE+FRAME.bottom+4;
 const fit=Math.min(Math.max(120,width-32)/(right-left),Math.max(150,height-140)/(bottom-top));
 const dpr=typeof window==='undefined'?1:window.devicePixelRatio||1;
 // The whole-house overview may shrink below one device pixel; room views never do, and close-up doubles the room view.
 const roomZoom=crispZoom(Math.max(Math.min(4,fit),1/dpr),dpr);
 // `zoom` is a whole-number step on top of the crisp room fit, so zooming in never breaks the pixel grid.
 const step=Math.max(1,Math.min(MAX_ZOOM_STEP,Math.round(zoom)));
 const scale=mode==='house'?crispZoom(Math.min(4,fit),dpr):Math.min(8,roomZoom*step*(mode==='close'?2:1));
 return {x:(left+right)/2,y:(top+bottom)/2,zoom:scale};
}
