import type {Pet} from '../../types/pet';
import {furniture} from '../home-base/catalog';
import {approach,checkpoint,distance,key,locate,nearest,route,type Point,type World,type WorldObject,type HouseResident} from './world';
export type Resident={position:Point;path:Point[];activity:string;speech:string;animation:string;wait:number;goal?:WorldObject;invited:boolean;facingLeft:boolean;direction:'north'|'east'|'south'|'west';step:number;climb:number;visits:Record<string,number>;lastObject?:string;serial:number};
export function makeResident(world:World,saved:HouseResident|undefined,pet:Pet,room:import('../home-base/catalog').HomeRoomId):Resident{
 const r:Resident={position:locate(world,saved,pet.id,room),path:[],activity:saved?.petId===pet.id?saved.activity:pet.state==='sleeping'?'Having a quiet nap':'Taking in the house',speech:'',animation:pet.state==='sleeping'||saved?.activity==='Settling into a favorite spot'?'sleeping':'idle',wait:8,invited:false,facingLeft:false,direction:'south',step:0,climb:0,visits:{},serial:0,lastObject:saved?.petId===pet.id?saved.objectId:undefined};
 for(const o of pet.mind?.objects??[])r.visits[o.id.replace('/',':')]=o.visits;
 if(saved?.petId===pet.id)for(const v of saved.visits??[])r.visits[v.objectId]=v.count;
 if(saved?.petId===pet.id&&saved.destination){const d=saved.destination,object=world.objects.find(o=>o.key===d.objectId),at=locate(world,{...d,petId:pet.id,activity:''},pet.id,d.roomId);invite(r,world,pet,at,object);}
 return r;
}
export function invite(r:Resident,w:World,pet:Pet,target:Point,object?:WorldObject):string{
 if(pet.state==='dead'||pet.needs.health<15){r.speech='I need some gentle care here first.';return r.speech;}
 const destination=object?approach(w,object,r.position):nearest(w,target);
 if(!destination){r.speech='I can’t quite reach that. Could you make a little space?';return r.speech;}
 // Finish the current tile before replanning, avoiding a snap back when a new invitation arrives.
 const anchor=r.path[0]??nearest(w,r.position),path=route(w,anchor,destination);
 if(!path.length&&distance(anchor,destination)>1){r.speech='Something is blocking the way.';return r.speech;}
 const sleepy=pet.state==='sleeping'||r.animation==='sleeping';
 r.path=[...(distance(r.position,anchor)>.05?[anchor]:[]),...path];r.goal=object;r.invited=true;r.wait=sleepy?3:0.5;r.activity=sleepy?'Waking up slowly':object?'Coming to investigate':'Coming to join you';r.speech=sleepy?'Just waking up… I’ll be there in a moment.':object?'Let me have a look!':'Coming! I’ll meet you there.';r.serial++;return r.speech;
}
export function cancelInvitation(r:Resident){r.path=[];r.goal=undefined;r.invited=false;r.wait=4;r.activity='Taking a little pause';r.animation='idle';r.speech='Okay. I’ll stay here a little while.';r.serial++;}
function arrive(r:Resident){
 const f=r.goal&&furniture(r.goal.placement.furnitureId);r.animation='idle';r.wait=12;r.serial++;
 if(!f){r.activity='Keeping you company';r.speech=r.invited?'Here I am. What shall we look at?':'';r.wait=18;}
 else{r.lastObject=r.goal!.key;r.visits[r.lastObject]=Math.min(99,(r.visits[r.lastObject]??0)+1);
  const familiar=r.visits[r.lastObject]>1;
  const response:Record<string,[string,string,string,number]>={rest:['Settling into a favorite spot',familiar?'My cozy spot. Just a little rest…':'This looks wonderfully soft.','sleeping',25],read:['Looking through a story','I wonder what happens on the next page.','idle',20],water:['Checking the leaves','A new leaf! Let’s keep this corner growing.','idle',16],play:['Playing with a favorite toy','Look what I found! Want to play?','happy',15],feed:['Waiting by the kitchen counter','Something smells lovely in here.','idle',14],wash:['Looking at the bath','A warm wash would feel nice.','idle',14],brush:['Inspecting the mirror','Look—there’s another little face!','idle',12],light:['Warming up by the light','This corner feels cozy.','idle',18]};
  const a=response[f.interaction??'']??['Sniffing something interesting',familiar?'I remember this one.':'What’s this? Let me take a closer look.','idle',12];[r.activity,r.speech,r.animation,r.wait]=a;
 }r.invited=false;r.goal=undefined;
}
export function stepResident(r:Resident,w:World,pet:Pet,dt:number){
 if(pet.state==='dead'){r.animation='dead';r.path=[];return;}
 if(r.wait>0){r.wait-=dt;return;}
 if(r.path.length){const next=r.path[0];if(!w.open.has(key(next))){cancelInvitation(r);r.speech='Something moved. I’ll find another way in a moment.';return;}r.animation='walking';r.activity=next.floor!==r.position.floor?'Taking the stairs':r.invited?'On my way to you':'Exploring the house';
  if(next.floor!==r.position.floor){r.direction=next.floor>r.position.floor?'north':'south';r.climb+=dt;r.activity='Taking the stairs';if(r.climb>=1.7){r.position={...next};r.path.shift();r.climb=0;r.serial++;}return;}
  const dx=next.x-r.position.x,dy=next.y-r.position.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.01)r.facingLeft=dx<0;if(Math.abs(dx)>.01)r.direction=dx<0?'west':'east';else if(Math.abs(dy)>.01)r.direction=dy<0?'north':'south';const speed=2.8*dt;r.step+=dt;
  if(len<=speed){r.position={...next};r.path.shift();if(!r.path.length)arrive(r);}else r.position={...r.position,x:r.position.x+dx/len*speed,y:r.position.y+dy/len*speed};return;
 }
 if(r.invited){arrive(r);return;}
 if(pet.state==='sleeping'){r.animation='sleeping';r.activity='Having a quiet nap';r.wait=15;return;}
 const traits=pet.mind?.traits;const scored=w.objects.map(o=>{const f=furniture(o.placement.furnitureId);const t=f?.interaction;return {o,score:Math.random()*8+(t==='feed'?(100-pet.needs.hunger)*.3:t==='wash'?(100-pet.needs.cleanliness)*.2:t==='rest'?(traits?.comfort??.5)*10:t==='read'?(traits?.quiet??.5)*10:t==='water'?(traits?.nature??.5)*10:t==='play'?(traits?.playfulness??.5)*10:1)-(o.key===r.lastObject?15:0)-distance(r.position,{x:o.x,y:o.y,floor:o.floor})*.12};}).sort((a,b)=>b.score-a.score);
 for(const {o} of scored.slice(0,8)){const at=approach(w,o,r.position);if(!at)continue;const path=route(w,r.position,at);if(path.length){r.path=path;r.goal=o;r.speech='';return;}}
 r.wait=10;r.animation='idle';r.activity='Enjoying a quiet moment';
}
export function savedResident(w:World,r:Resident,pet:Pet):HouseResident{
 const saved=checkpoint(w,r.position,pet.id,r.activity,r.lastObject);saved.visits=Object.entries(r.visits).slice(-64).map(([objectId,count])=>({objectId,count}));
 if(r.invited){const end=r.path.at(-1)??r.position,d=checkpoint(w,end,pet.id,'',r.goal?.key);saved.destination={roomId:d.roomId,x:d.x,y:d.y,...(d.objectId?{objectId:d.objectId}:{})};}
 return saved;
}
export const sameTile=(a:Point,b:Point)=>key(a)===key(b);
