import {arenaOf,blocked,distance,lineClear,type Arena,type Match,type Vec} from '../model';
import type {Evolution} from './types';
const scaled=new WeakMap<Arena,Arena>();
export function expandedArena(base:Arena):Arena {
 let a=scaled.get(base);if(a)return a;const k=1.25;
 const point=(p:Vec)=>({x:p.x*k,y:p.y*k});const rect=(p:Vec&{w:number;h:number})=>({...point(p),w:p.w*k,h:p.h*k});
 a={...base,width:2800,height:1800,walls:base.walls.map(rect),pieces:base.pieces?.map(p=>({...rect(p),kind:p.kind})),bushes:base.bushes.map(rect),beacons:base.beacons.map(point),portal:point(base.portal),lockers:base.lockers?.map(point),cages:base.cages?.map(point),vents:base.vents?.map(([a,b])=>[point(a),point(b)]),door:base.door?rect(base.door):null,key:base.key?point(base.key):null};scaled.set(base,a);return a;
}
const dynamic=new WeakMap<Evolution,{revision:number;arena:Arena}>();
export function evolutionArena(m:Pick<Match,'map'|'seed'|'evolution'>):Arena {
 const base=arenaOf(m),e=m.evolution;if(!e)return base;const old=dynamic.get(e);if(old?.revision===e.revision)return old.arena;
 const broken=new Set(e.terrain.filter(t=>t.hp<=0).map(t=>t.id));
 const pieces=base.pieces?.filter((_,i)=>!broken.has(i));
 const walls=base.walls.filter((_,i)=>!broken.has(i));
 const a={...base,pieces,walls,door:null};dynamic.set(e,{revision:e.revision,arena:a});return a;
}
export function freePoint(a:Arena,p:Vec):Vec {
 if(!blocked(a,p))return {...p};
 for(let r=24;r<500;r+=24)for(let i=0;i<16;i++){const q={x:p.x+Math.cos(i*Math.PI/8)*r,y:p.y+Math.sin(i*Math.PI/8)*r};if(!blocked(a,q))return q;}
 return {...a.beacons[0]};
}
export function advance(m:Match,p:Vec,target:Vec,speed:number,dt:number,underground=false){
 const a=evolutionArena(m),d=distance(p,target);if(d<.01)return;const n=Math.min(d,speed*dt),dx=(target.x-p.x)/d*n,dy=(target.y-p.y)/d*n;
 const allowed=(v:Vec)=>underground?v.x>35&&v.y>35&&v.x<(a.width??2240)-35&&v.y<(a.height??1440)-35&&!a.pieces?.some(r=>['pond','fountain'].includes(r.kind)&&v.x>r.x-20&&v.x<r.x+r.w+20&&v.y>r.y-20&&v.y<r.y+r.h+20):!blocked(a,v);
 if(allowed({x:p.x+dx,y:p.y}))p.x+=dx;if(allowed({x:p.x,y:p.y+dy}))p.y+=dy;
}

/** Both pressure pads must be reachable, not tucked inside scenery by a seed. */
export function stationPoint(a:Arena,p:Vec):Vec {for(let r=0;r<600;r+=30)for(let n=0;n<16;n++){const c={x:p.x+Math.cos(n*Math.PI/8)*r,y:p.y+Math.sin(n*Math.PI/8)*r},left={x:c.x-95,y:c.y},right={x:c.x+95,y:c.y};if(!blocked(a,c)&&!blocked(a,left)&&!blocked(a,right)&&lineClear(a,left,right))return c;}return freePoint(a,p);}
