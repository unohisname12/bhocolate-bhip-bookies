import type {EngineState} from '../../types/engine';
import {EMOTES,moveName,petTitle,type Emote} from '../pet-identity/model';
import {generateLearningProblem,normalizeLearning,parseMathAnswer,answerMatches,type LearningSettings} from '../../services/game/curriculum';
export const MOVES=['strike','guard','feint'] as const;
export type Move=typeof MOVES[number];
export const beats:Record<Move,Move>={strike:'feint',guard:'strike',feint:'guard'};
export interface Fighter {id:string;alias:string;species:string;pet?:{name:string;title:string|null;move:string|null};level:number;stage:number;power:number;maxHealth:number;attack:number;bonuses:{levels:number;evolution:number;math:number;bond:number;training:number};learning:LearningSettings}
export function fighter(id:string,alias:string,s:EngineState):Fighter|null{
 const p=s.pet;if(!p||p.state==='dead'||p.state==='sick'||p.needs.health<=0)return null;
 const level=Math.max(1,Math.min(20,Math.floor(p.progression.level))),stage=p.stage==='adult'||p.stage==='elder'?2:p.stage==='juvenile'?1:0;
 const bonuses={levels:(level-1)*3,evolution:stage*12,math:Math.min(15,Math.floor(s.player.lifetimeMathCorrect/10)),bond:Math.min(8,Math.floor(p.bond/10)),training:Math.min(8,Math.floor((p.discipline??0)/10))};
 const bonus=Object.values(bonuses).reduce((a,b)=>a+b,0);
 return {id,alias,species:p.speciesId,pet:{name:p.name,title:petTitle(p.identity,s.player.lifetimeMathCorrect,s.skillReviews),move:moveName(p.identity)},level,stage,power:100+bonus,maxHealth:100+Math.floor(bonus/2),attack:18+Math.floor(bonus/10),bonuses,learning:normalizeLearning(s.learning)};
}
export function fairPair(a:Pick<Fighter,'id'|'level'|'stage'|'power'>,b:Pick<Fighter,'id'|'level'|'stage'|'power'>){return a.id!==b.id&&Math.abs(a.level-b.level)<=3&&Math.abs(a.stage-b.stage)<=1&&Math.max(a.power,b.power)/Math.min(a.power,b.power)<=1.2;}
interface Question {id:string;text:string;answer:number;hint:string;explanation:string[];attempts:number;move:Move|null}
export interface Duel {emotes?:Record<string,{emote:Emote;at:number}>;fighters:[Fighter,Fighter];phase:'lobby'|'question'|'result'|'finished';round:number;paused:boolean;ready:string[];health:[number,number];questions:Record<string,Question>;results:{round:number;moves:[Move,Move];damage:[number,number]}[];winner:string|null;cancelled:string|null}
export function createDuel(a:Fighter,b:Fighter):Duel{if(!fairPair(a,b))throw Error('Choose pets within 3 levels and 20% power, and no more than one growth stage apart.');return {fighters:[a,b],phase:'lobby',round:0,paused:false,ready:[],health:[a.maxHealth,b.maxHealth],questions:{},results:[],winner:null,cancelled:null};}
export interface DuelCommand {emote?:string;action:string;round?:number;phase?:string;questionId?:string;answer?:string;move?:Move;paused?:boolean}
/** Emotes are preset reactions only, so nothing typed ever reaches a classmate. */
export const EMOTE_COOLDOWN=2000;
export function actDuel(old:Duel,c:DuelCommand,actor:string,teacher=false,random:()=>number=Math.random,now=Date.now()):Duel{
 const r=structuredClone(old),index=r.fighters.findIndex(f=>f.id===actor);
 if(!teacher&&index<0)throw Error('This is not your duel.');
 if(r.phase==='finished')return r;
 if(c.action==='end'){r.phase='finished';r.cancelled=teacher?'Teacher ended this duel.':'A player left the duel.';r.winner=null;r.paused=false;return r;}
 if(c.action==='pause'){if(!teacher||typeof c.paused!=='boolean')throw Error('Only your teacher can pause.');r.paused=c.paused;return r;}
 if(c.action==='emote'){if(teacher||index<0)throw Error('Only players can react.');if(!EMOTES.includes(c.emote as Emote))throw Error('Choose a reaction.');const last=r.emotes?.[actor];if(last&&now-last.at<EMOTE_COOLDOWN)throw Error('Wait a moment before reacting again.');r.emotes={...r.emotes,[actor]:{emote:c.emote as Emote,at:now}};return r;}
 if(r.paused)throw Error('Your teacher paused this duel.');
 if(teacher)throw Error('Students choose their own moves.');
 if(c.action==='ready'){
  if(c.round!==r.round||c.phase!==r.phase)throw Error('The round changed. Refresh and try again.');
  if(!['lobby','result'].includes(r.phase))throw Error('Finish this round first.');
  if(!r.ready.includes(actor))r.ready.push(actor);
  if(r.ready.length===2){r.round++;r.phase='question';r.ready=[];r.questions={};for(const f of r.fighters){const q=generateLearningProblem(f.learning,random);r.questions[f.id]={id:`${r.round}:${f.id}`,text:q.question,answer:q.answer,hint:q.hint??'Take it one step at a time.',explanation:q.explanation??[],attempts:0,move:null};}}
  return r;
 }
 const q=r.questions[actor];
 if(c.action!=='answer'||!q||c.questionId!==q.id)throw Error('This question is no longer open.');
 if(q.move)return r; // An identical retry cannot change a locked move or resolve twice.
 if(r.phase!=='question')throw Error('This round is closed.');
 if(!MOVES.includes(c.move as Move))throw Error('Choose a move.');
 const answer=String(c.answer??'').trim(),value=parseMathAnswer(answer);if(!answer||answer.length>80||!Number.isFinite(value))throw Error('Enter a number, decimal, or fraction.');
 q.attempts++;if(!answerMatches(answer,q.answer,q.text))return r;q.move=c.move!;
 const [a,b]=r.fighters,[qa,qb]=[r.questions[a.id],r.questions[b.id]];
 if(qa.move&&qb.move){
  const moves:[Move,Move]=[qa.move,qb.move];const tie=qa.move===qb.move,win=beats[qa.move]===qb.move;
  const damage:[number,number]=[Math.round(b.attack*(tie?.6:win?.35:1.5)),Math.round(a.attack*(tie?.6:win?1.5:.35))];
  r.health=[Math.max(0,r.health[0]-damage[0]),Math.max(0,r.health[1]-damage[1])];r.results.push({round:r.round,moves,damage});r.phase='result';
  if(r.round===5||r.health.some(h=>h===0)){r.phase='finished';const difference=r.health[0]/a.maxHealth-r.health[1]/b.maxHealth;r.winner=Math.abs(difference)<1e-9?null:difference>0?a.id:b.id;}
 }
 return r;
}
export function duelView(r:Duel,actor:string){const q=r.questions[actor],reveal=r.phase==='result'||r.phase==='finished';return {emotes:r.emotes??{},fighters:r.fighters.map(({learning:_,...f})=>f),phase:r.phase,round:r.round,paused:r.paused,ready:r.ready,health:r.health,results:r.results,winner:r.winner,cancelled:r.cancelled,you:actor,charged:r.fighters.filter(f=>r.questions[f.id]?.move).map(f=>f.id),question:q?{id:q.id,text:q.text,hint:q.hint,attempts:q.attempts,move:q.move,...(reveal?{answer:q.answer,explanation:q.explanation}:{})}:null};}
export type DuelView=ReturnType<typeof duelView>&{id:string;revision:number};
export interface DuelData {rooms:DuelView[];you?:string;entries?:number;learners?:{id:string;alias:string;fighter:Omit<Fighter,'learning'>|null;busy:boolean;entries:number}[]}
