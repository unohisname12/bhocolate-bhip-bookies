import {describe,it,expect} from 'vitest';
import {arenaViewport,arenaCamera,screenToArena} from './camera';
describe('viewport camera',()=>{
 it.each([[1920,1080],[1440,900],[390,844],[844,390]])('fills %sx%s without stretching or exceeding the arena', (w,h)=>{
  const v=arenaViewport(w,h);expect(v.width).toBeLessThanOrEqual(1120);expect(v.height).toBeLessThanOrEqual(720);expect(Math.abs(w/v.width-h/v.height)).toBeLessThan(.01);
  const me={x:850,y:550},camera=arenaCamera(me,v.width,v.height,100,120),rect={left:0,top:0,width:w,height:h};
  const projected={x:(me.x-camera.x)*w/v.width,y:(me.y-camera.y)*h/v.height};
  expect(screenToArena(projected.x,projected.y,rect,v,camera)).toEqual(me);
 });
 it('keeps edge pets out from under the top and bottom HUD',()=>{
  const v=arenaViewport(1440,900),top=110,bottom=120;
  for(const y of [24,696]){const p={x:560,y},camera=arenaCamera(p,v.width,v.height,top,bottom);expect(p.y-camera.y).toBeGreaterThan(top);expect(p.y-camera.y).toBeLessThan(v.height-bottom);}
 });
});
