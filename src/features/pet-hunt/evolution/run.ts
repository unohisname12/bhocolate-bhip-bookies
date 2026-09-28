import {distance,lineClear,playArena,type Match,type Player,type Vec} from '../model';
import {award,shuffled} from './state';
import {freePoint} from './world';
import type {Rift} from './types';
/** A seeded route of combat, delivery and two-switch missions replaces beacon charging. */
export function ensureRun(m:Match){const e=m.evolution!;if(e.run)return;for(const p of m.players){p.charging=-1;if(!p.evo?.echo)p.check=null;}const kinds=shuffled(m,['breach','circuit','salvage','breach','circuit','salvage','breach'] as Rift['kind'][]);e.run={needed:4,sites:m.beacons.map((b,id)=>({id,x:b.x,y:b.y,kind:kinds[id],hp:160,work:0,done:b.progress>=1,nodes:[-1,1].map(n=>({...freePoint(playArena(m),{x:b.x+n*190,y:b.y+100}),done:false,work:0}))}))};}
export const runComplete=(m:Match)=>!!m.evolution?.run&&m.evolution.run.sites.filter(s=>s.done).length>=m.evolution.run.needed;
export function damageRift(m:Match,p:Player,at:Vec,radius:number,damage:number){if(p.role!=='runner'||p.out||p.escaped)return;for(const s of m.evolution!.run?.sites??[])if(!s.done&&s.kind==='breach'&&s.hp>0&&distance(at,s)<radius&&lineClear(playArena(m),at,s)){s.hp=Math.max(0,s.hp-damage);if(!s.hp){award(m,'runner',15,`rift-breach:${s.id}`);m.message='Rift armor broken! Hold E at the crystal to claim its power.';}return;}}
export function riftTarget(s:Rift,p?:Player):Vec {if(s.kind==='salvage'&&s.nodes.some(n=>n.carrier===p?.id))return s;return s.kind!=='breach'?s.nodes.find(n=>!n.done&&!n.carrier)??s:s;}
export function interactRift(m:Match,p:Player,dt:number){const e=m.evolution!,a=p.evo!;if(!e.run||p.out||p.escaped)return false;const near=(v:Vec,r=75)=>distance(p,v)<r&&lineClear(playArena(m),p,v);
 for(const s of e.run.sites){if(s.done)continue;
  if(p.role==='hunter'){if(!near(s)||s.work<=0)continue;const key=`disrupt:${s.id}`;if(a.work!==key){a.work=key;a.workTime=0;}a.workTime+=dt;p.action='interact';if(a.workTime>=3&&!e.paid[key]){s.work=Math.max(0,s.work-4);award(m,'hunter',25,key);m.message='Rift disrupted! The monster claimed power; completed steps stay secured.';}return true;}
  if(s.kind==='salvage'&&near(s)){const cargo=s.nodes.find(n=>n.carrier===p.id);if(cargo){cargo.carrier=null;cargo.done=true;award(m,'runner',8,`rift-node:${s.id}:${s.nodes.indexOf(cargo)}`);m.message='Energy cell delivered. Bring both cells to this rift.';return true;}}
  if(s.kind!=='breach'){const node=s.nodes.find(n=>!n.done&&!n.carrier&&near(n,60));if(node){if(s.kind==='salvage'){if(!e.run.sites.some(r=>r.nodes.some(n=>n.carrier===p.id))){node.carrier=p.id;m.message='Carry the energy cell back to its rift. You move more slowly while carrying.';}return true;}node.work+=dt;p.action='interact';p.noise=1;if(node.work>=5){node.done=true;award(m,'runner',8,`rift-node:${s.id}:${s.nodes.indexOf(node)}`);m.message='Circuit connected. Connect both terminals, then claim the rift.';}return true;}}
  if(!near(s))continue;p.action='interact';if(s.kind==='breach'?s.hp>0:s.nodes.some(n=>!n.done))return true;
  // Shared progress persists, but four bodies cannot accelerate a mission past its intended duration.
  const key=`rift-tick:${s.id}`;if(a.lastAward[key]===m.tick)return true;for(const v of m.players)if(v.evo)v.evo.lastAward[key]=m.tick;
  s.work=Math.min(12,s.work+dt);p.noise=1;m.beacons[s.id].progress=s.work/12*.99;
  if(s.work>=12){s.done=true;m.beacons[s.id].progress=1;p.beaconScore++;award(m,'runner',45,`rift:${s.id}`);m.effects.push({id:m.nextId++,kind:'beacon',x:s.x,y:s.y,life:1.4});m.message=`Rift secured! ${e.run.sites.filter(r=>r.done).length}/${e.run.needed} · Team evolution earned.`;}return true;
 }return false;
}
