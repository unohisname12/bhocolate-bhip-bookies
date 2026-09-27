import { EMOTES, type Emote } from '../pet-identity/model';
import { generateLearningProblem, normalizeLearning, parseMathAnswer, answerMatches, type LearningSettings } from '../../services/game/curriculum';
export const COLORS = ['midnight', 'emerald', 'amethyst'] as const;
export type Color = typeof COLORS[number];
export type Move = 'strike'|'guard'|'rally';
export type Side = 'teachers'|'students';
export interface Guardian { name:string; color:Color }
export interface Member { id:string; alias:string; side:Side; pet:string; guardian?:Guardian; learning:LearningSettings; tokenHash?:string }
interface Question { id:string; text:string; answer:number; hint:string; explanation:string[]; solved:boolean; attempts:number; move:Move|null }
export interface Result { round:number; damage:Record<Side,number>; shield:Record<Side,number>; healing:Record<Side,number>; charged:Record<Side,number>; contributors:string[] }
export interface Room { host:string; members:Member[]; phase:'lobby'|'question'|'result'|'finished'; paused:boolean; round:number; rounds:number; learning:LearningSettings; health:Record<Side,number>; questions:Record<string,Question>; results:Result[]; emotes?:Record<string,{emote:Emote;at:number}>; }
export interface Command { emote?:string; action:string; questionId?:string; answer?:string; move?:Move; memberId?:string; grade?:number; topic?:string; challenge?:LearningSettings['challenge'] }
const need:(condition:unknown,message:string)=>asserts condition=(condition,message)=>{if(!condition)throw Error(message);};
export function createRoom(host:Member,rounds:number,learning:LearningSettings):Room {
  need(Number.isInteger(rounds)&&rounds>=1&&rounds<=10,'Choose 1–10 rounds.');
  return {host:host.id,members:[host],phase:'lobby',paused:false,round:0,rounds,learning,health:{teachers:100,students:100},questions:{},results:[]};
}
export function joinRoom(room:Room,member:Member):Room {
  need(room.phase==='lobby','The match has started. Reopen your original tab to reconnect.');
  if(room.members.some(m=>m.id===member.id))return room;
  need(room.members.filter(m=>m.side===member.side).length<(member.side==='teachers'?3:60),member.side==='teachers'?'The teacher team already has three adults.':'This match is full.');
  need(!room.members.some(m=>m.alias.toLowerCase()===member.alias.toLowerCase()),'That nickname is already in use.');
  return {...room,members:[...room.members,member]};
}
function questionRound(r:Room,random:()=>number) {
  r.round++;r.phase='question';r.questions={};
  for(const m of r.members){const p=generateLearningProblem(m.learning,random);r.questions[m.id]={id:`${r.round}:${m.id}`,text:p.question,answer:p.answer,hint:p.hint??'Break the problem into smaller steps.',explanation:p.explanation??[],solved:false,attempts:0,move:null};}
}
export function resolveRound(r:Room) {
  const actions={teachers:{strike:0,guard:0,rally:0},students:{strike:0,guard:0,rally:0}};
  const charged={teachers:0,students:0};const contributors:string[]=[];
  for(const side of ['teachers','students'] as const){const members=r.members.filter(m=>m.side===side);for(const m of members){const q=r.questions[m.id];if(q?.solved&&q.move){actions[side][q.move]+=30/members.length;charged[side]++;contributors.push(m.id);}}}
  const shield={teachers:actions.teachers.guard,students:actions.students.guard};
  const healing={teachers:actions.teachers.rally*.6,students:actions.students.rally*.6};
  const damage={teachers:Math.max(0,actions.students.strike-shield.teachers),students:Math.max(0,actions.teachers.strike-shield.students)};
  for(const side of ['teachers','students'] as const)r.health[side]=Math.round(Math.max(0,Math.min(100,r.health[side]-damage[side]+healing[side]))*100)/100;
  r.results.push({round:r.round,damage,shield,healing,charged,contributors});r.phase='result';
}
export const EMOTE_COOLDOWN=2000;
export function apply(room:Room,cmd:Command,actor:string,random:()=>number=Math.random,now=Date.now()):Room {
  const r=structuredClone(room),member=r.members.find(m=>m.id===actor),host=actor===r.host;
  need(member,'Join this match first.');
  if(cmd.action==='finish'){need(host,'Only the lead teacher can end the match.');r.phase='finished';r.paused=false;return r;}
  need(r.phase!=='finished','This match is finished.');
  if(cmd.action==='emote'){need(EMOTES.includes(cmd.emote as Emote),'Choose a reaction.');const last=r.emotes?.[actor];need(!last||now-last.at>=EMOTE_COOLDOWN,'Wait a moment before reacting again.');r.emotes={...r.emotes,[actor]:{emote:cmd.emote as Emote,at:now}};return r;}
  if(cmd.action==='pause'){need(member.side==='teachers','Only teachers can pause.');r.paused=!r.paused;return r;}
  need(!r.paused,'The match is paused.');
  if(cmd.action==='remove'){need(host&&r.phase==='lobby'&&cmd.memberId!==r.host,'Manage participants before starting.');r.members=r.members.filter(m=>m.id!==cmd.memberId);return r;}
  if(cmd.action==='learning'){need(host&&r.phase==='lobby','Set learning levels before starting.');const target=r.members.find(m=>m.id===cmd.memberId);need(target,'Choose a participant.');target.learning=normalizeLearning({grade:cmd.grade,topic:cmd.topic,challenge:cmd.challenge});return r;}
  if(cmd.action==='answer'){
    const q=r.questions[actor];need(r.phase==='question'&&q&&q.id===cmd.questionId,'This question has closed.');
    if(q.solved)return r; // Network retry cannot change the selected move or earn twice.
    need(['strike','guard','rally'].includes(cmd.move??''),'Choose an action.');
    const answer=String(cmd.answer??'').trim();need(answer.length>0&&answer.length<=60,'Enter a number, decimal, or fraction.');
    const value=parseMathAnswer(answer);need(Number.isFinite(value),'Enter a number, decimal, or fraction.');
    q.attempts++;if(answerMatches(answer,q.answer,q.text)){q.solved=true;q.move=cmd.move!;}return r;
  }
  need(host&&cmd.action==='next','Only the lead teacher can advance.');
  if(r.phase==='lobby'){need(r.members.some(m=>m.side==='students'),'Let at least one student join.');questionRound(r,random);}
  else if(r.phase==='question')resolveRound(r);
  else if(r.phase==='result'){if(r.round>=r.rounds||r.health.teachers<=0||r.health.students<=0)r.phase='finished';else questionRound(r,random);}
  return r;
}
export function roomView(r:Room,actor:string){
  const mine=r.questions[actor],reveal=r.phase==='result'||r.phase==='finished';
  return {emotes:r.emotes??{},host:r.host,phase:r.phase,paused:r.paused,round:r.round,rounds:r.rounds,learning:r.learning,health:r.health,results:r.results,
    members:r.members.map(m=>({id:m.id,alias:m.alias,side:m.side,pet:m.pet,guardian:m.guardian,...(actor===r.host?{learning:m.learning}:{})})),
    you:actor,question:mine?{id:mine.id,text:mine.text,hint:mine.hint,solved:mine.solved,attempts:mine.attempts,move:mine.move,...(reveal?{answer:mine.answer,explanation:mine.explanation}:{})}:null,
    charged:{teachers:r.members.filter(m=>m.side==='teachers'&&r.questions[m.id]?.solved).length,students:r.members.filter(m=>m.side==='students'&&r.questions[m.id]?.solved).length}};
}
export type View=ReturnType<typeof roomView>&{id:string;code:string;revision:number;invite?:string};
