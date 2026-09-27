import {WIDTH,HEIGHT,type Vec} from './model';
// The camera frames a window this size and scrolls across the (larger) arena, so pets stay readable on any screen.
export const VIEW_W=1120,VIEW_H=720;
/** Fill any screen without stretching sprites or adding letterbox bars. */
export function arenaViewport(width:number,height:number){
 const scale=Math.max(width/VIEW_W,height/VIEW_H);
 return {width:Math.max(1,Math.round(width/scale)),height:Math.max(1,Math.round(height/scale))};
}
export function arenaCamera(player:Vec|undefined,width:number,height:number,top=0,bottom=0):Vec{
 const snap=(n:number)=>Math.round(n/2)*2;
 return {x:snap(player?Math.max(0,Math.min(WIDTH-width,player.x-width/2)):(WIDTH-width)/2),
  y:snap(player?Math.max(-top,Math.min(HEIGHT-height+bottom,player.y-(height+top-bottom)/2)):(HEIGHT-height)/2)};
}
export function screenToArena(x:number,y:number,rect:{left:number;top:number;width:number;height:number},viewport:{width:number;height:number},camera:Vec):Vec{
 return {x:(x-rect.left)*viewport.width/rect.width+camera.x,y:(y-rect.top)*viewport.height/rect.height+camera.y};
}
