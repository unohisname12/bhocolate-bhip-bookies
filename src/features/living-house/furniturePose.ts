import {furniture} from '../home-base/catalog';
import {TILE,type World} from './world';
import type {Resident} from './resident';
export function furniturePose(w:World,r:Resident){
 const o=r.using?w.objects.find(o=>o.key===r.using):undefined;
 const kind=o?furniture(o.placement.furnitureId)?.interaction:undefined;
 const seated=kind==='rest'&&o;
 return {kind:kind??'',x:seated?(o.x+o.w/2)*TILE:(r.position.x+.5)*TILE,y:seated?(o.y+o.h*.55)*TILE:(r.position.y+1)*TILE,z:seated?52+Math.floor((o.y+o.h)*10):50+Math.floor(r.position.y*10)};
}
