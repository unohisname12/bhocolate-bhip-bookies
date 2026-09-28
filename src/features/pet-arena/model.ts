import {applyMathPower,validMathPower,type MathPowerCommand} from './mathPower';
import type {MathProblem} from '../../types';
import {observeFirstAdventure} from '../first-adventure/model';
import {awardTransitions} from '../clash/rewards';
import type {EngineState} from '../../types/engine';
import {addXP} from '../../services/game/evolutionEngine';
import {GEAR,gear,BRANCHES,pointsAt,slotsAt,ENCOUNTERS,PERKS,type Branch,type Move,type Perk} from './catalog';
import {emptyBuild,preset,createFight,turn,type Build,type Fight} from './combat';
export interface ArenaProgress {version:1;owned:string[];pets:{[petId:string]:{build:Build;presets:(Build|null)[]}};cleared:number[];wins:number;expeditions:number;challenges:number[];fight:Fight|null;expedition:{stage:number;perks:Perk[];choosing:boolean;route:number}|null;sequence:number;notice:string;seenLevel:{[petId:string]:number};lastRequest?:{id:string;command:string}}
export type ArenaCommand = MathPowerCommand | {kind:'init'}|{kind:'buy';id:string}|{kind:'equip';id:string}|{kind:'talent';branch:Branch}|{kind:'reset'}|{kind:'preset';branch:Branch}|{kind:'saveBuild'|'loadBuild';slot:number}|{kind:'start';mode:Fight['mode'];encounter:number;branch?:Branch}|{kind:'move';move:Move;fightId:string;round:number}|{kind:'close'}|{kind:'retreat'}|{kind:'perk';perk:Perk;route:number}|{kind:'acknowledge'};
export const freshArena=():ArenaProgress=>({version:1,owned:['snack'],pets:{},cleared:[],wins:0,expeditions:0,challenges:[],fight:null,expedition:null,sequence:0,notice:'Welcome! Your first battle kit is ready. Earn MP in math practice to unlock equipment.',seenLevel:{}});
export const arenaOf=(s:EngineState)=>s.petArena??freshArena();
export const buildOf=(s:EngineState)=>s.pet?arenaOf(s).pets[s.pet.id]?.build??emptyBuild():emptyBuild();
const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export function command(state:EngineState,c:ArenaCommand,privateProblem?:MathProblem):EngineState{
 check(state.pet&&state.pet.state!=='dead','Hatch a companion before entering Pet Battle.');
 const pet=state.pet!,a=structuredClone(arenaOf(state));a.pets[pet.id]??={build:emptyBuild(),presets:[]};
 if(a.fight&&a.fight.fighters[0].id!==pet.id&&c.kind!=='retreat')throw Error('Return to the pet that started this battle, or leave the battle first.');
 const entry=a.pets[pet.id],b=entry.build;let next={...state,petArena:a};
 const preparing=['buy','equip','talent','reset','preset','saveBuild','loadBuild','start'].includes(c.kind);
 if(preparing)check(!a.fight&&!a.expedition,'Finish or leave your current battle or expedition before changing your build.');
 switch(c.kind){
 case 'math-open':case 'math-help':case 'math-answer':case 'math-activate':return applyMathPower(next,c,privateProblem);
 case 'init':break;
 case 'acknowledge':a.seenLevel[pet.id]=pet.progression.level;break;
 case 'buy':{const g=gear(c.id);check(g,'Choose an item from the catalog.');check(!a.owned.includes(c.id),'You already own this item.');check(state.player.currencies.mp>=g!.price,'Earn more Math Points in practice first.');a.owned.push(c.id);next={...next,player:{...state.player,currencies:{...state.player.currencies,mp:state.player.currencies.mp-g!.price}}};a.notice=`${g!.name} unlocked permanently! Equip it when its slot is ready.`;break;}
 case 'equip':{const g=gear(c.id);check(g&&a.owned.includes(c.id),'Unlock this item first.');check(pet.progression.level>=(g!.slot==='charm'?2:g!.slot==='badge'?5:3),'Level up to unlock this equipment slot.');b[g!.slot]=g!.id;a.notice=`${g!.name} equipped.`;break;}
 case 'talent':check(BRANCHES.includes(c.branch),'Choose a talent branch.');check(Object.values(b.talents).reduce((n,x)=>n+x,0)<pointsAt(pet.progression.level),'Earn another talent point by levelling up.');check(b.talents[c.branch]<4,'This branch is complete.');b.talents[c.branch]++;a.notice='Talent learned! Your next battle uses this build.';break;
 case 'reset':b.talents={guardian:0,striker:0,tactician:0};a.notice='All talent points returned. Your equipment is kept.';break;
 case 'preset':{check(BRANCHES.includes(c.branch),'Choose a build.');const p=preset(c.branch,pointsAt(pet.progression.level));entry.build={...b,talents:p.talents,charm:pet.progression.level>=2&&a.owned.includes(p.charm!)?p.charm:b.charm,badge:pet.progression.level>=5&&a.owned.includes(p.badge!)?p.badge:b.badge,tool:pet.progression.level>=3&&a.owned.includes(p.tool)?p.tool:b.tool};a.notice=`${c.branch} talents applied. Owned compatible gear equipped.`;break;}
 case 'saveBuild':case 'loadBuild':check(Number.isInteger(c.slot)&&c.slot>=0&&c.slot<slotsAt(pet.progression.level),'That saved build slot is locked.');if(c.kind==='saveBuild'){entry.presets[c.slot]=structuredClone(b);a.notice='Build saved.';}else{check(entry.presets[c.slot],'Save a build here first.');entry.build=structuredClone(entry.presets[c.slot]!);a.notice='Saved build equipped.';}break;
 case 'start':{
  check(!state.run.active&&!state.battle.active&&!state.momentum.active,'Finish the other saved adventure first.');
  check(['campaign','practice','expedition','challenge'].includes(c.mode),'Choose a battle mode.');
  check(Number.isInteger(c.encounter)&&c.encounter>=0&&c.encounter<ENCOUNTERS.length,'Choose an encounter.');
  if(c.mode==='campaign')check(c.encounter===0||a.cleared.includes(c.encounter-1),'Win the previous encounter first.');
  if(c.mode==='expedition')check(a.cleared.includes(4),'Defeat the Old Oak to unlock expeditions.');
  if(c.mode==='challenge')check(a.cleared.includes(14),'Complete the campaign to unlock Champion challenges.');
  a.sequence++;let e={...ENCOUNTERS[c.encounter]},chosen=b;
  if(c.mode==='practice'){check(c.branch&&BRANCHES.includes(c.branch),'Choose a practice build.');chosen=preset(c.branch!);e={...e,level:10};}
  if(c.mode==='expedition'){a.expedition={stage:0,perks:[],choosing:false,route:0};e={...ENCOUNTERS[0],level:Math.min(20,pet.progression.level)};}
  if(c.mode==='challenge')e={...ENCOUNTERS[14],level:20,boss:true,name:['Night Crown · Iron Guard','Night Crown · Burning Rhythm','Night Crown · Deep Focus'][c.encounter%3],style:(['defender','combo','disruptor'] as const)[c.encounter%3]};
  const training=Math.min(3,(state.player.powerForge?.forge_atk??0)+(state.player.powerForge?.forge_def??0));
  a.fight=createFight(pet,chosen,e,`${pet.id}:${a.sequence}`,c.mode,[],training);if(c.mode==='challenge')a.fight.challenge=c.encounter%3;a.notice='Battle started. Read the next enemy move, then choose your action.';break;
 }
 case 'move':{
  check(a.fight&&a.fight.id===c.fightId&&a.fight.round===c.round,'The turn changed. Review the battle and try again.');check(['strike','guard','focus','signature','item'].includes(c.move),'Choose an action.');
  a.fight=turn(a.fight!,c.move);const f=a.fight;
  if(f.phase!=='active'&&!f.rewarded){
   f.rewarded=true;const won=f.phase==='won',practice=f.mode==='practice',first=won&&f.mode==='campaign'&&!a.cleared.includes(f.encounter);
   const xp=practice?0:won?30+f.fighters[1].level*8+(first?40:0):f.round>=3?12:0;
   const grown=addXP(pet,xp);next={...next,pet:grown};
   f.result={xp,mp:0,levelBefore:pet.progression.level,levelAfter:grown.progression.level,first};
   if(won&&!practice){a.wins++;if(f.mode==='campaign'&&!a.cleared.includes(f.encounter))a.cleared.push(f.encounter);if(f.mode==='challenge'&&!a.challenges.includes(f.challenge??0))a.challenges.push(f.challenge??0);}
   if(a.expedition){if(won&&a.expedition.stage<4)a.expedition.choosing=true;else{if(won)a.expeditions++;a.expedition=null;}}
   a.notice=practice?'Practice complete. Loan gear stays in the training arena.':`${won?'Victory!':f.phase==='draw'?'Draw.':'Good effort.'} +${xp} pet XP. Your equipment and progress are kept.`;
   if(won&&f.mode==='expedition'&&!a.expedition)a.notice+=' Expedition complete — Trailblazer badge earned!';
  }break;
 }
 case 'retreat':a.fight=null;a.expedition=null;a.notice='Battle left. Previously earned XP and equipment are kept.';break;
 case 'close':check(!a.fight||a.fight.phase!=='active','Finish or leave the battle first.');check(!a.expedition?.choosing,'Choose an expedition reward or leave the expedition.');a.fight=null;break;
 case 'perk':{
  check(a.expedition?.choosing&&a.fight?.phase==='won','Win this expedition encounter first.');check(PERKS.some(p=>p.id===c.perk)&&[0,1].includes(c.route),'Choose a perk and a route.');
  const ex=a.expedition!;ex.perks.push(c.perk);ex.stage++;ex.route=c.route;ex.choosing=false;a.sequence++;
  const e={...ENCOUNTERS[ex.stage*3+c.route],level:Math.min(20,pet.progression.level+ex.stage+c.route),boss:ex.stage===4};
  a.fight=createFight(pet,b,e,`${pet.id}:${a.sequence}`,'expedition',ex.perks);break;
 }
 default:throw Error('Unknown battle command.');
 }
 return observeFirstAdventure(state,awardTransitions(state,next,{type:'ARENA_COMMAND',command:c}),{type:'ARENA_COMMAND',command:c});
}
export function validArena(a:ArenaProgress|undefined):boolean{
 try {
 if(a===undefined)return true;
 if(!a||a.version!==1||!Array.isArray(a.owned)||a.owned.length>16||new Set(a.owned).size!==a.owned.length||a.owned.some(id=>!gear(id)))return false;
 const nat=(n:number)=>Number.isSafeInteger(n)&&n>=0;
 if(![a.wins,a.expeditions,a.sequence].every(nat)||!a.pets||Object.keys(a.pets).length>100||!Array.isArray(a.cleared)||a.cleared.length>15||a.cleared.some(n=>!nat(n)||n>14))return false;
 const validBuild=(b:Build)=>b&&b.talents&&Object.keys(b.talents).length===3&&BRANCHES.every(k=>nat(b.talents[k])&&b.talents[k]<=4)&&Object.values(b.talents).reduce((n,v)=>n+v,0)<=6&&(!b.charm||gear(b.charm)?.slot==='charm')&&(!b.badge||gear(b.badge)?.slot==='badge')&&gear(b.tool)?.slot==='tool';
 if(Object.values(a.pets).some(p=>!validBuild(p.build)||!Array.isArray(p.presets)||p.presets.length>3||p.presets.some(b=>b&&!validBuild(b))))return false;
 if(a.fight&&(a.fight.version!==1||!nat(a.fight.round)||a.fight.round>20||a.fight.fighters.length!==2||a.fight.fighters.some(f=>!validBuild(f.build)||![f.hp,f.maxHP,f.energy,f.shield].every(nat)||f.hp>f.maxHP||f.energy>60)||a.fight.history.length>100||!validMathPower(a.fight.mathPower)))return false;
 return true;
 }catch{return false;}
}
export const CATALOG_SIZE=GEAR.length;
/** Parse only the command vocabulary; never accept client-authored combat state. */
export function parseCommand(value:unknown):ArenaCommand{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a battle action.');
 const v=value as Record<string,unknown>,k=v.kind;
 if(typeof v.fightId==='string'&&v.fightId.length<=180&&Number.isInteger(v.round)&&Number(v.round)>=1&&Number(v.round)<=20){
  const base={fightId:v.fightId,round:v.round as number};
  if(k==='math-open'&&['strike','shield','energy'].includes(String(v.power)))return {...base,kind:k,power:v.power as 'strike'|'shield'|'energy'};
  if(typeof v.challengeId==='string'&&v.challengeId.length<=200){
   const challengeId=v.challengeId;
   if(k==='math-help')return {...base,kind:k,challengeId};
   if(k==='math-answer'&&typeof v.answer==='string'&&v.answer.length<=80)return {...base,kind:k,challengeId,answer:v.answer};
   if(k==='math-activate'&&(v.method==='trace'||v.method==='tap'))return {...base,kind:k,challengeId,method:v.method};
  }
 }
 if(k==='init'||k==='reset'||k==='close'||k==='retreat'||k==='acknowledge')return {kind:k};
 if((k==='buy'||k==='equip')&&typeof v.id==='string')return {kind:k,id:v.id};
 if((k==='talent'||k==='preset')&&BRANCHES.includes(v.branch as Branch))return {kind:k,branch:v.branch as Branch};
 if((k==='saveBuild'||k==='loadBuild')&&Number.isInteger(v.slot))return {kind:k,slot:v.slot as number};
 if(k==='start'&&['campaign','practice','expedition','challenge'].includes(String(v.mode))&&Number.isInteger(v.encounter))return {kind:k,mode:v.mode as Fight['mode'],encounter:v.encounter as number,...(BRANCHES.includes(v.branch as Branch)?{branch:v.branch as Branch}:{})};
 if(k==='move'&&['strike','guard','focus','signature','item'].includes(String(v.move))&&typeof v.fightId==='string'&&Number.isInteger(v.round))return {kind:k,move:v.move as Move,fightId:v.fightId,round:v.round as number};
 if(k==='perk'&&PERKS.some(p=>p.id===v.perk)&&[0,1].includes(Number(v.route)))return {kind:k,perk:v.perk as Perk,route:Number(v.route)};
 throw Error('Unknown or incomplete battle action.');
}
