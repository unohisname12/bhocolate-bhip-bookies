import {reaction,type Environment} from '../house-weather/model';
import {houseChoices,favoriteLine} from './brain';
import {speak,type TogetherKind} from '../pet-mind/voice';
import type {LearnerFacts} from '../pet-mind/life';
import type {GameEngineAction} from '../../engine/core/ActionTypes';
import type {Pet} from '../../types/pet';
import {furniture} from '../home-base/catalog';
import {approach,checkpoint,distance,key,locate,nearest,route,type Point,type World,type WorldObject,type HouseResident} from './world';
export type Resident={position:Point;path:Point[];activity:string;speech:string;animation:string;wait:number;goal?:WorldObject;invited:boolean;facingLeft:boolean;direction:'north'|'east'|'south'|'west';step:number;climb:number;visits:Record<string,number>;lastObject?:string;serial:number;cooldowns:Record<string,number>;ask?:TogetherKind;socialAfter:number;events:GameEngineAction[];using?:string;weatherKey?:string;weatherAfter?:number;together?:TogetherKind;returnTo?:Point;ball?:Point;};
export function makeResident(world:World,saved:HouseResident|undefined,pet:Pet,room:import('../home-base/catalog').HomeRoomId):Resident{
 const r:Resident={position:locate(world,saved,pet.id,room),path:[],activity:saved?.petId===pet.id?saved.activity:pet.state==='sleeping'?'Having a quiet nap':'Taking in the house',speech:'',animation:pet.state==='sleeping'||saved?.activity==='Settling into a favorite spot'?'sleeping':'idle',wait:8,invited:false,facingLeft:false,direction:'south',step:0,climb:0,visits:{},serial:0,cooldowns:{},socialAfter:0,events:[],lastObject:saved?.petId===pet.id?saved.objectId:undefined};
 for(const o of pet.mind?.objects??[])r.visits[o.id.replace('/',':')]=o.visits;
 if(saved?.petId===pet.id)for(const v of saved.visits??[])r.visits[v.objectId]=v.count;
 if(saved?.petId===pet.id&&saved.destination){const d=saved.destination,object=world.objects.find(o=>o.key===d.objectId),at=locate(world,{...d,petId:pet.id,activity:''},pet.id,d.roomId);invite(r,world,pet,at,object);}
 return r;
}
export function invite(r:Resident,w:World,pet:Pet,target:Point,object?:WorldObject):string{
 if(pet.state==='dead'||pet.needs.health<30){r.speech='I need some gentle care here first.';return r.speech;}
 r.ask=undefined;r.together=undefined;r.returnTo=undefined;r.ball=undefined;
 r.using=undefined;
 const destination=object?approach(w,object,r.position):nearest(w,target);
 if(!destination){r.speech='I can’t quite reach that. Could you make a little space?';return r.speech;}
 // Finish the current tile before replanning, avoiding a snap back when a new invitation arrives.
 const anchor=r.path[0]??nearest(w,r.position),path=route(w,anchor,destination);
 if(!path.length&&distance(anchor,destination)>1){r.speech='Something is blocking the way.';return r.speech;}
 const sleepy=pet.state==='sleeping'||r.animation==='sleeping';
 r.path=[...(distance(r.position,anchor)>.05?[anchor]:[]),...path];r.goal=object;r.invited=true;r.wait=sleepy?3:0.5;r.activity=sleepy?'Waking up slowly':object?'Coming to investigate':'Coming to join you';r.speech=sleepy?'Just waking up… I’ll be there in a moment.':object?'Let me have a look!':'Coming! I’ll meet you there.';r.serial++;return r.speech;
}
export function cancelInvitation(r:Resident){r.using=undefined;r.path=[];r.goal=undefined;r.ask=undefined;r.together=undefined;r.returnTo=undefined;r.ball=undefined;r.invited=false;r.wait=4;r.activity='Taking a little pause';r.animation='idle';r.speech='Okay. I’ll stay here a little while.';r.serial++;}
function arrive(r:Resident,pet:Pet,now:number){
 if(r.together==='fetch'){
  r.animation='happy';r.serial++;
  if(r.returnTo){r.activity='Bringing the ball back';r.speech='Got it! Back to you.';r.wait=1;return;}
  r.ball=undefined;r.wait=3;r.activity='Back with the ball';r.speech='That was fun! Another little memory for us.';return;
 }

 const f=r.goal&&furniture(r.goal.placement.furnitureId);r.animation='idle';r.wait=12;r.serial++;
 if(!f){r.activity='Keeping you company';r.speech=r.invited?'Here I am. What shall we look at?':'';r.wait=18;}
 else{r.using=r.goal!.key;r.facingLeft=r.goal!.x+r.goal!.w/2<r.position.x;r.lastObject=r.goal!.key;r.visits[r.lastObject]=Math.min(99,(r.visits[r.lastObject]??0)+1);
  const familiar=r.visits[r.lastObject]>1;r.cooldowns[r.lastObject]=now+90000;
  const response:Record<string,[string,string,string,number]>={rest:[r.visits[r.lastObject]>=3?'Settling into a favorite spot':'Settling into a cozy spot',familiar?'My cozy spot. Just a little rest…':'This looks wonderfully soft.','sleeping',25],read:['Looking through a story','I wonder what happens on the next page.','idle',20],water:['Checking the leaves','A new leaf! Let’s keep this corner growing.','idle',16],play:[r.visits[r.lastObject]>=3?'Playing with a favorite toy':'Playing with a toy','Look what I found! Want to play?','happy',15],feed:['Waiting by the kitchen counter','Something smells lovely in here.','idle',14],wash:['Looking at the bath','A warm wash would feel nice.','idle',14],brush:['Inspecting the mirror','Look—there’s another little face!','idle',12],light:['Warming up by the light','This corner feels cozy.','idle',18]};
  const a=response[f.interaction??'']??['Sniffing something interesting',familiar?'I remember this one.':'What’s this? Let me take a closer look.','idle',12];[r.activity,r.speech,r.animation,r.wait]=a;
   const favorite=favoriteLine(r.goal!,r.visits[r.lastObject]);if(favorite)r.speech=favorite;
  if(f.interaction==='play'&&pet.needs.hunger>=30&&pet.needs.health>=30&&now>=r.socialAfter){
   const shared=pet.mind?.memories.find(m=>m.kind==='fetch'||m.kind==='dance');
   r.ask=shared?.kind==='dance'?'dance':'fetch';
   r.speech=shared?`I remember our ${r.ask==='fetch'?'fetch game':'dance'}! Want to do that together again?`:'Want to play fetch together?';
   r.wait=25;r.socialAfter=now+180000;
  }
 }r.invited=false;r.goal=undefined;
}
export function stepResident(r:Resident,w:World,pet:Pet,dt:number,learner:LearnerFacts={},now=Date.now(),environment?:Environment){
 if(pet.needs.health<30&&pet.state!=='dead'){if(r.activity!=='Taking it easy')cancelInvitation(r);r.animation='sick';r.activity='Taking it easy';r.speech='A quiet moment and some gentle care would feel nice.';return;}
 if(pet.state==='sleeping'&&!r.invited){r.path=[];r.goal=undefined;r.ask=undefined;r.together=undefined;r.returnTo=undefined;r.ball=undefined;r.animation='sleeping';r.activity='Having a quiet nap';r.speech='';return;}
 if(r.goal&&!w.objects.some(o=>o.key===r.goal!.key&&o.x===r.goal!.x&&o.y===r.goal!.y&&o.placement.furnitureId===r.goal!.placement.furnitureId)){cancelInvitation(r);return;}

 if(pet.state==='dead'){if(r.animation!=='dead')cancelInvitation(r);r.animation='dead';r.speech='';r.activity='Resting';return;}
 if(r.wait>0){r.wait-=dt;return;}
 r.using=undefined;
 if(r.together&&!r.path.length){
  if(r.returnTo){const target=r.returnTo;r.path=route(w,r.position,target);r.returnTo=undefined;if(r.path.length)return;if(distance(r.position,target)>.1){cancelInvitation(r);r.speech='The way back changed. Let’s try again in a clear space.';return;}}
  r.events.push({type:'PET_HOME_MEMORY',kind:r.together==='talk'?'chat':r.together});r.together=undefined;r.ball=undefined;
  r.animation='happy';r.activity='Enjoying our time together';r.speech='That was lovely. Let’s do it again sometime.';r.wait=8;r.serial++;return;
 }
 if(r.path.length){const next=r.path[0];if(!w.open.has(key(next))){cancelInvitation(r);r.speech='Something moved. I’ll find another way in a moment.';return;}r.animation='walking';r.activity=next.floor!==r.position.floor?'Taking the stairs':r.together==='fetch'?(r.returnTo?'Chasing the ball':'Bringing the ball back'):r.invited?'On my way to you':'Exploring the house';
  if(next.floor!==r.position.floor){r.direction=next.floor>r.position.floor?'north':'south';r.climb+=dt;r.activity='Taking the stairs';if(r.climb>=1.7){r.position={...next};r.path.shift();r.climb=0;r.serial++;}return;}
  const dx=next.x-r.position.x,dy=next.y-r.position.y,len=Math.hypot(dx,dy);if(Math.abs(dx)>.01)r.facingLeft=dx<0;if(Math.abs(dx)>.01)r.direction=dx<0?'west':'east';else if(Math.abs(dy)>.01)r.direction=dy<0?'north':'south';const speed=2.8*dt;r.step+=dt;
  if(len<=speed){r.position={...next};r.path.shift();if(!r.path.length)arrive(r,pet,now);}else r.position={...r.position,x:r.position.x+dx/len*speed,y:r.position.y+dy/len*speed};return;
 }
 if(r.invited){arrive(r,pet,now);return;}
 if(pet.state==='sleeping'){r.animation='sleeping';r.activity='Having a quiet nap';r.wait=15;return;}
 r.ask=undefined;
 for(const [id,until] of Object.entries(r.cooldowns))if(until<=now)delete r.cooldowns[id];
 const choices=houseChoices(pet,w,r.position,r.visits,r.cooldowns,now,Math.random,environment);
 if(environment&&r.weatherKey!==environment.key&&now>=(r.weatherAfter??0)&&!choices[0]?.urgent&&pet.needs.hunger>=30){
  r.weatherKey=environment.key;r.weatherAfter=now+180000;[r.activity,r.speech]=reaction(environment);r.animation='idle';r.wait=9;r.serial++;return;
 }
 const line=now>=r.socialAfter&&pet.needs.hunger>=30?speak(pet,learner,now,Math.random()):undefined;
 if(line&&!choices[0]?.urgent){r.speech=line.text;r.animation=line.animation;r.activity=line.ask?'Asking you something':'Remembering our time together';r.ask=line.ask;r.wait=20;r.socialAfter=now+90000;r.events.push({type:'PET_SAID',key:line.key});r.serial++;return;}
 for(const {object:o} of choices){const at=approach(w,o,r.position);if(!at)continue;const path=route(w,r.position,at);if(path.length||distance(r.position,at)<1){r.path=path;r.goal=o;r.speech='';if(!path.length)arrive(r,pet,now);return;}}
 if(pet.needs.hunger<30){r.speech='A snack would feel lovely when you’re ready.';r.activity='Thinking about a snack';r.animation='hungry';r.wait=15;return;}
 r.wait=10;r.animation='idle';r.activity='Enjoying a quiet moment';
}
export function savedResident(w:World,r:Resident,pet:Pet):HouseResident{
 const saved=checkpoint(w,r.position,pet.id,r.activity,r.lastObject);saved.visits=Object.entries(r.visits).slice(-64).map(([objectId,count])=>({objectId,count}));
 if(r.invited){const end=r.path.at(-1)??r.position,d=checkpoint(w,end,pet.id,'',r.goal?.key);saved.destination={roomId:d.roomId,x:d.x,y:d.y,...(d.objectId?{objectId:d.objectId}:{})};}
 return saved;
}
export const sameTile=(a:Point,b:Point)=>key(a)===key(b);

/** Shared activities record a memory only after they finish; calls and cancellation interrupt them. */
export function together(r:Resident,w:World,pet:Pet,kind:TogetherKind,now=Date.now()):boolean{
 if(pet.state==='dead'||pet.state==='sleeping'||pet.needs.health<30||r.path.length>0)return false;
 cancelInvitation(r);r.socialAfter=now+180000;r.together=kind;r.wait=6;r.animation='happy';
 const lines={cuddle:['Cuddle time','My favorite place is right here with you.'],dance:['Dance party','One, two, wiggle! Your turn!'],talk:['Having a chat','I like these little moments in our home.'],fetch:['Chasing the ball','Here I go!']} as const;
 [r.activity,r.speech]=lines[kind];
 if(kind==='fetch'){
  const targets=Array.from(w.open.values()).filter(p=>p.floor===r.position.floor&&distance(p,r.position)>=3&&distance(p,r.position)<=5);
  const target=targets.map(p=>({p,path:route(w,r.position,p)})).find(t=>t.path.length>=3&&t.path.length<=8&&t.path.every(p=>p.floor===r.position.floor));
  if(!target){cancelInvitation(r);r.speech='Let’s find a little more floor space for fetch.';return false;}
  r.returnTo={...r.position};r.ball=target.p;r.path=target.path;r.wait=.5;
 }
 r.serial++;return true;
}
