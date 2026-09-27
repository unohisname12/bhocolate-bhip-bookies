import type { Pet } from '../../types/pet';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { furniture } from '../home-base/catalog';
import { createHomeBase, type HomePlacement } from '../home-base/model';
import { markSaid, validLife, visitPet, dayKey } from './life';
export const MEMORY_KINDS=['feed','clean','play','comfort','train','heal','victory','cuddle','chat','dance','fetch','visit'] as const;
export type MemoryKind=typeof MEMORY_KINDS[number];
export interface PetMemory {kind:MemoryKind;at:number;count:number;objectId?:string}
export interface ObjectMemory {id:string;signature:string;seenAt:number;visits:number}
export interface PetMind {life?:import('./life').PetLife;version:1;traits:{curiosity:number;playfulness:number;sociability:number;quiet:number;nature:number;comfort:number};memories:PetMemory[];objects:ObjectMemory[]}
export function createMind(pet:Pick<Pet,'id'|'speciesId'>):PetMind {
 let seed=0;for(const c of pet.id+pet.speciesId)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
 const value=(i:number)=>.25+((seed>>>i)%51)/100;
 const t={curiosity:value(0),playfulness:value(3),sociability:value(6),quiet:value(9),nature:value(12),comfort:value(15)};
 if(pet.speciesId.includes('fox'))t.playfulness=Math.min(1,t.playfulness+.2);
 if(pet.speciesId.includes('turtle'))t.nature=Math.min(1,t.nature+.2);
 if(pet.speciesId.includes('owl'))t.quiet=Math.min(1,t.quiet+.2);
 return {version:1,traits:t,memories:[],objects:[]};
}
export const objectSignature=(p:HomePlacement)=>`${p.furnitureId}:${p.x}:${p.y}:${p.flipped}:${p.finish??'original'}`;
export function remember(mind:PetMind,kind:MemoryKind,now:number,objectId?:string):PetMind {
 const previous=mind.memories.find(m=>m.kind===kind&&m.objectId===objectId);
 if(previous && now-previous.at<120000)return mind;
 return {...mind,memories:[{kind,at:now,count:Math.min(20,(previous?.count??0)+1),...(objectId?{objectId}:{})},...mind.memories.filter(m=>m!==previous)].slice(0,24)};
}
/** Runs after normal rules: rejected/cancelled care cannot manufacture memories. */
export function observeCare(before:EngineState,after:EngineState,action:GameEngineAction):EngineState {
 if(!before.pet||!after.pet||before.pet.id!==after.pet.id)return after;
 const victory=before.battle.active&&after.battle.active&&before.battle.phase!=='victory'&&after.battle.phase==='victory';
 if(before.pet===after.pet&&!victory)return after;
 let kind:MemoryKind|undefined;
 if(action.type==='FEED_PET')kind=action.food.rarity==='medicine'?'heal':'feed';
 if(action.type==='CLEAN_PET')kind='clean';if(action.type==='PLAY_PET')kind='play';if(action.type==='BOOST_MOOD')kind='heal';
 if(action.type==='FREE_SCHOOL_CARE')kind=action.task==='rest'?'comfort':action.task;
 if(action.type==='CARE_GAME_COMPLETE')kind=({pet:'comfort',wash:'clean',brush:'clean',comfort:'comfort',train:'train',play:'play'} as const)[action.mode as 'pet'|'wash'|'brush'|'comfort'|'train'|'play'];
 if(victory)kind='victory';
 if(!kind)return after;
 const mind=after.pet.mind??createMind(after.pet),next=remember(mind,kind,Date.now());
 return {...after,pet:{...after.pet,mind:next}};
}
export function reduceMind(state:EngineState,action:GameEngineAction):EngineState|null {
 if(action.type==='PET_VISIT'){
  const pet=state.pet,now=Date.now();
  if(!pet||pet.state==='dead'||state.mode!=='normal')return state;
  const life=pet.mind?.life;
  if(life?.visit.lastDay===dayKey(now) && (life.firsts.includes('hatched:') || [...life.episodes,...life.core].some(e=>e.kind==='hatched')))return state;
  return {...state,pet:visitPet(pet,now)};
 }
 if(action.type==='PET_SAID'){const life=state.pet?.mind?.life;if(!life||typeof action.key!=='string'||!action.key||action.key.length>120)return state;return {...state,pet:{...state.pet!,mind:{...state.pet!.mind!,life:markSaid(life,action.key,Date.now())}}};}
 if(action.type!=='PET_HOME_MEMORY'&&action.type!=='PET_NOTICE_OBJECT'&&action.type!=='PET_PREFERENCE')return null;
 if(!state.pet||['dead','sleeping'].includes(state.pet.state)||state.mode!=='normal'||state.battle.active||state.run.active||state.momentum.active||state.pendingBattleWarmup||!['home','home_builder'].includes(state.screen))return state;
 const mind=state.pet.mind??createMind(state.pet),now=Date.now();let next=mind;
 if(action.type==='PET_PREFERENCE'){
  if(!['plants','books','toys'].includes(action.choice))return state;
  next=remember(mind,'chat',now,action.choice);
 } else if(action.type==='PET_HOME_MEMORY') {
  if(!['cuddle','chat','dance','fetch'].includes(action.kind))return state;
  next=remember(mind,action.kind,now);
 } else {
  const base=state.homeBase??createHomeBase(state);
  if(base.activeRoom!==action.roomId)return state;
  const item=base.rooms[base.activeRoom]?.items.find(i=>i.id===action.id);
  if(!item||!furniture(item.furnitureId))return state;
  const key=`${base.activeRoom}/${item.id}`,signature=objectSignature(item),old=mind.objects.find(o=>o.id===key);
  if(old?.signature===signature&&now-old.seenAt<120000)return state;
  const record={id:key,signature,seenAt:now,visits:Math.min(20,(old?.visits??0)+1)};
  next={...mind,objects:[record,...mind.objects.filter(o=>o.id!==key)].slice(0,64)};
  next=remember(next,'visit',now,item.furnitureId);
 }
 return next===state.pet.mind?state:{...state,pet:{...state.pet,mind:next}};
}
export function validMind(value:unknown):boolean {
 if(!value||typeof value!=='object')return false;const m=value as PetMind;
 const number=(x:unknown,max=Number.MAX_SAFE_INTEGER)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
 const short=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=200;
 return m.version===1&&!!m.traits&&['curiosity','playfulness','sociability','quiet','nature','comfort'].every(k=>number(m.traits[k as keyof PetMind['traits']],1))&&Array.isArray(m.memories)&&m.memories.length<=24&&m.memories.every(x=>x&&MEMORY_KINDS.includes(x.kind)&&number(x.at)&&Number.isInteger(x.count)&&x.count>=1&&x.count<=20&&(x.objectId===undefined||short(x.objectId)))&&Array.isArray(m.objects)&&m.objects.length<=64&&new Set(m.objects.map(o=>o?.id)).size===m.objects.length&&m.objects.every(o=>o&&short(o.id)&&short(o.signature)&&number(o.seenAt)&&Number.isInteger(o.visits)&&o.visits>=1&&o.visits<=20)&&(m.life===undefined||validLife(m.life));
}
