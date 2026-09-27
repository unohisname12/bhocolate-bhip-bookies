import { learningProblem, type LearningProblem } from './lessons';
import { getSkill, problem, type Problem, type Subskill } from './catalog';
import { answerMatches, parseMathAnswer, type LearningSettings } from '../../services/game/curriculum';
export type Stage='baseline'|'practice'|'check'|'transfer'|'follow'|'retention';
export interface Event {templateId?:string;representation?:string;visual?:LearningProblem["visual"];reasoning?:string;answerRevealed?:boolean;id:string;skill:string;stage:Stage;text:string;answer:string;expected:number;correct:boolean;supported:boolean;at:number;set:number}
// autoDeclined: the teacher undid an auto-confirm, so only a person may confirm this target now.
export interface Target {autoConfirmed?:boolean;autoDeclined?:boolean;lessonAt?:number;transferIds?:string[];transferAt?:number|null;reflection?:string;retentionIds?:string[];retentionAt?:number|null;id:string;reason:string;baseline:number|null;baselineIds:string[];passedAt:number|null;followAt:number|null;confirmedAt:number|null;teacherNote:string;set:number;checkIds:string[];followIds:string[]}
export interface Current extends Problem {stakes?:import('./structural').Stakes;templateId?:string;representation?:string;visual?:LearningProblem["visual"];reasonPrompt?:string;hints?:string[];hintLevel?:number;outcome?:string;id:string;skill:string;stage:Stage;hintUsed:boolean;answered:boolean}
export interface Focus {skillId:string;activity:"lesson"|"practice";breakAllowed:boolean;onBreak:boolean;startedAt:number}
export interface Progress {version?:2;focus?:Focus|null;learning:LearningSettings;targets:Target[];events:Event[];current:Current|null;archived:Target[]}
// autoConfirm undefined = on for guided (version 2) challenges.
export interface Policy {version?:1|2;target:number;delayHours:number;name:string;autoConfirm?:boolean}
export const DEFAULT_POLICY:Policy={target:3,delayHours:24,name:'My skill growth challenge'};
export const ENHANCED_POLICY:Policy={...DEFAULT_POLICY,version:2};
export const newTarget=(id:string,reason:string):Target=>({id,reason,baseline:null,baselineIds:[],passedAt:null,followAt:null,confirmedAt:null,teacherNote:'',set:0,checkIds:[],followIds:[]});
export const initial=(learning:LearningSettings,targets:{id:string;reason:string}[],policy?:Policy):Progress=>({...policy?.version&&policy.version===2?{version:2 as const}:{},learning,targets:targets.map(t=>newTarget(t.id,t.reason)),events:[],current:null,archived:[]});
export function status(t:Target){return t.confirmedAt?'confirmed':t.followAt?'ready':t.baseline===3?'secure':t.passedAt?(t.transferIds&&!t.transferAt?'transfer':'follow'):t.baseline===null?'baseline':'practice';}
export function metrics(p:Pick<Progress,'events'>,t:Target){const rows=p.events.filter(e=>e.skill===t.id),practice=rows.filter(e=>e.stage==='practice'),success=practice.filter(e=>e.correct);return {baseline:t.baseline,practice:practice.length,completedPractice:success.length,practiceForNextCheck:rows.slice(1+rows.findLastIndex(e=>e.stage==='check'||e.stage==='transfer'||e.stage==='follow')).filter(e=>e.stage==='practice'&&e.correct).length,practiceDays:new Set(practice.map(e=>new Date(e.at).toISOString().slice(0,10))).size,independentPractice:success.filter(e=>!e.supported).length,check:p.events.filter(e=>t.checkIds.includes(e.id)).filter(e=>e.correct&&!e.supported).length,follow:p.events.filter(e=>t.followIds.includes(e.id)).filter(e=>e.correct&&!e.supported).length,transfer:rows.filter(e=>t.transferIds?.includes(e.id)&&e.correct&&!e.supported).length,retention:rows.filter(e=>t.retentionIds?.includes(e.id)&&e.correct&&!e.supported).length,supported:practice.filter(e=>e.supported).length,correctedAfterPractice:!!t.passedAt&&practice.some(e=>!e.correct)&&success.length>0};}
function need(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
export function begin(p:Progress,id:string,stage:Stage,policy:Policy,now:number,random:()=>number,questionId:string):Progress{
 const next=structuredClone(p),t=next.targets.find(t=>t.id===id),skill=getSkill(id);need(t&&skill,'This skill is not assigned.');need(!next.current||next.current.answered,'Finish your current question first.');
 need(!next.focus||(!next.focus.onBreak&&next.focus.skillId===id),'Return to your teacher’s focused target first.');
 if(stage==='retention')need(next.version===2&&t.confirmedAt&&!t.retentionAt&&now>=t.confirmedAt+7*86400000,'The optional one-week check is not due yet.');
 else need(!t.confirmedAt&&!t.followAt&&t.baseline!==3,'This target is waiting for your teacher.');
 const recent=next.events.filter(e=>e.skill===id).slice(-10).map(e=>e.text);
 if(stage==='baseline')need(t.baseline===null,'Your starting check is already recorded.');
 else if(stage==='practice'){need(t.baseline!==null,'Do your starting check first.');if(next.version===2)need(t.lessonAt,'Read the worked example first.');}
 else if(stage==='check'){
  need(t.baseline!==null&&!t.passedAt,'Complete practice before this check.');
  if(t.checkIds.length===0||t.checkIds.length===5){need(metrics(next,t).practiceForNextCheck>=3,'Complete three fresh practice questions before a new check. Hints are welcome.');t.set++;t.checkIds=[];}
 }else if(stage==='transfer'){
  need(next.version===2&&t.passedAt&&!t.transferAt,'Pass the independent check first.');
  if(t.transferIds?.length===2)t.transferIds=[];
 }else if(stage==='follow'){
  need(t.passedAt&&(next.version!==2||t.transferAt)&&now>=Math.max(t.passedAt,t.transferAt??0)+policy.delayHours*3600000,'Your fresh follow-up check is not due yet.');
  if(t.followIds.length===2)t.followIds=[];
 }else if(stage!=='retention')throw Error('Choose a valid activity.');
 // Once a check starts, finish it before changing to a different activity.
 const inProgress=next.targets.find(s=>s.checkIds.length>0&&s.checkIds.length<5||s.followIds.length===1||s.transferIds?.length===1||s.retentionIds?.length===1);
 if(inProgress)need(inProgress.id===id&&stage===(inProgress.retentionIds?.length===1?'retention':inProgress.transferIds?.length===1?'transfer':inProgress.followIds.length===1?'follow':'check'),'Finish the short check you already started.');
 const index=next.events.filter(e=>e.skill===id&&e.stage===stage).length;
 const generate=()=>next.version===2?learningProblem(id,p.learning.challenge,stage,index,random):problem(skill,p.learning.challenge,random);
 const signature=(q:Pick<Problem,"text">&{visual?:LearningProblem['visual']})=>q.text+JSON.stringify(q.visual??null);
 const prior=next.version===2?next.events.filter(e=>e.skill===id).slice(-10).map(signature):recent;
 let q=generate();for(let i=0;i<120&&prior.includes(next.version===2?signature(q):q.text);i++)q=generate();
 need(!prior.includes(next.version===2?signature(q):q.text),'Pip is preparing a fresh question. Try again.');
 next.current={...q,id:questionId,skill:id,stage,hintUsed:false,answered:false};return next;
}
export function answer(p:Progress,id:string,text:string,now:number,reasoning=''):Progress{
 const n=structuredClone(p),q=n.current;need(q&&q.id===id,'That question is no longer open.');if(q.answered)return n;
 const value=parseMathAnswer(text);need(text.length<=100&&Number.isFinite(value),'Enter a number, decimal, or fraction.');
 need(!n.focus||(!n.focus.onBreak&&n.focus.skillId===q.skill),'Return to your focused target first.');
 need(reasoning.length<=1000,'Keep your explanation under 1000 characters.');
 const t=n.targets.find(t=>t.id===q.skill)!;
 const e:Event={...(n.version===2?{templateId:q.templateId,representation:q.representation,visual:q.visual,reasoning:reasoning.trim(),answerRevealed:(q.hintLevel??0)>=3}:{}),id:q.id,skill:q.skill,stage:q.stage,text:q.text,answer:text,expected:q.answer,correct:answerMatches(text,q.answer,q.text),supported:q.hintUsed||q.representation==='guided-step',at:now,set:t.set};
 need(n.events.length<1200,'This challenge has reached its question limit. Ask your teacher to start a fresh challenge.');n.events.push(e);q.answered=true;
 if(q.stage==='baseline'){t.baselineIds.push(e.id);if(t.baselineIds.length===3)t.baseline=n.events.filter(e=>t.baselineIds.includes(e.id)&&e.correct&&!e.supported).length;}
 if(q.stage==='check'){t.checkIds.push(e.id);if(t.checkIds.length===5&&metrics(n,t).check>=4){t.passedAt=now;if(n.version===2)t.transferIds=[];}}
 if(q.stage==='transfer'){t.transferIds??=[];t.transferIds.push(e.id);if(t.transferIds.length===2){if(metrics(n,t).transfer===2)t.transferAt=now;else{t.passedAt=null;t.checkIds=[];t.transferAt=null;t.transferIds=[];}}}
 if(q.stage==='retention'){t.retentionIds??=[];t.retentionIds.push(e.id);if(t.retentionIds.length===2)t.retentionAt=now;}
 if(q.stage==='follow'){t.followIds.push(e.id);if(t.followIds.length===2){if(metrics(n,t).follow===2)t.followAt=now;else{t.passedAt=null;t.followIds=[];t.checkIds=[];if(n.version===2){t.transferAt=null;t.transferIds=[];}}}}
 return n;
}
export function hint(p:Progress,id:string):Progress{const n=structuredClone(p);need(n.current?.id===id&&!n.current.answered&&n.current.stage==='practice','Hints are available during practice. A check must be independent.');need(!n.focus||!n.focus.onBreak,'Return from your break before using hints.');n.current.hintUsed=true;if(n.version===2)n.current.hintLevel=Math.min(3,(n.current.hintLevel??0)+1);return n;}
export function confirm(p:Progress,id:string,note:string,now:number):Progress{const n=structuredClone(p),t=n.targets.find(t=>t.id===id);need(t?.followAt&&t.baseline!==null&&t.baseline<3,'Both checks and a growth starting point are required.');if(n.version===2){need(t.transferAt,'A different-use transfer check is required.');need(t.reflection?.trim(),'Record the learner’s explanation or an oral explanation before confirming.');}
 need(note.trim().length>=5&&note.length<=500,'Add a short teacher observation.');t.confirmedAt??=now;t.teacherNote=note.trim();return n;}
export function replace(p:Progress,oldId:string,newId:string,reason:string):Progress{const n=structuredClone(p),t=n.targets.find(t=>t.id===oldId),s=getSkill(newId);need(t&&s&&s.grade===p.learning.grade,'Choose a skill at this learner’s assigned grade.');need(!n.targets.some(t=>t.id===newId)&&!n.archived.some(t=>t.id===newId),'Choose a different target that has not been used in this challenge.');need(reason.trim().length>=5&&reason.length<=500,'Explain why this new target fits the learner.');n.archived.push(t);n.targets=n.targets.map(x=>x.id===oldId?newTarget(newId,reason.trim()):x);if(n.current?.skill===oldId)n.current=null;if(n.focus?.skillId===oldId)n.focus=null;return n;}
export function publicProgress(p:Progress){const q=p.current;return {...p,current:q?{id:q.id,skill:q.skill,stage:q.stage,text:q.text,answered:q.answered,hintUsed:q.hintUsed,templateId:q.templateId,representation:q.representation,visual:q.visual,reasonPrompt:q.reasonPrompt,hintLevel:q.hintLevel,...(q.hintUsed?{hint:p.version===2?q.hints?.slice(0,q.hintLevel??1).join(' '):q.hint}:{}),...(q.answered?{answer:q.answer,explanation:q.explanation,outcome:q.outcome,stakes:q.stakes}:{})}:null};}
export function hasOpenCheck(p:Pick<Progress,'targets'>){return p.targets.some(t=>t.checkIds.length>0&&t.checkIds.length<5||t.transferIds?.length===1||t.followIds.length===1||t.retentionIds?.length===1);}
export function readLesson(p:Progress,id:string,now:number):Progress{const n=structuredClone(p),t=n.targets.find(t=>t.id===id);need(n.version===2&&t&&t.baseline!==null&&t.baseline<3,'Finish your starting check first.');need((!n.current||n.current.answered)&&!hasOpenCheck(n),'Finish the short independent set before opening the example.');need(!n.focus||(!n.focus.onBreak&&n.focus.skillId===id),'Return to your focused target.');t.lessonAt??=now;return n;}
export function reflect(p:Progress,id:string,text:string):Progress{const n=structuredClone(p),t=n.targets.find(t=>t.id===id);need(n.version===2&&t?.transferAt&&!t.confirmedAt,'Finish the different-use check before recording your explanation.');need(text.trim().length>0&&text.length<=1000,'Write an explanation or say that you will explain to your teacher.');t.reflection=text.trim();return n;}
export function focus(p:Progress,id:string,activity:string,allowBreak:boolean,now:number):Progress{const n=structuredClone(p);if(!id){n.focus=null;return n;}need(n.targets.some(t=>t.id===id),'Choose an assigned target.');need(!n.current||n.current.answered||n.current.skill===id,'Let the learner finish their open question first.');need(['lesson','practice'].includes(activity),'Choose a lesson or practice session.');n.focus={skillId:id,activity:activity as Focus['activity'],breakAllowed:allowBreak,onBreak:false,startedAt:now};return n;}
export function takeBreak(p:Progress,onBreak:boolean):Progress{const n=structuredClone(p);need(n.focus&&n.focus.breakAllowed,'Your teacher has not enabled a break.');n.focus.onBreak=onBreak;return n;}
export function reviewGroup(p:Pick<Progress,"version">,t:Target,policy:Policy,now:number){if(t.confirmedAt)return 'Confirmed for this challenge';if(t.followAt)return 'Ready for review';if(t.passedAt&&(p.version!==2||t.transferAt)&&now>=Math.max(t.passedAt,t.transferAt??0)+policy.delayHours*3600000)return 'Follow-up due';return 'Needs a check-in';}
export type ProgressView=ReturnType<typeof publicProgress>;
export interface Candidate extends Subskill {reason:string;questions:number;independent:number;alreadyConfirmed:boolean;priority:number}
export function candidates(grade:number,skills:Subskill[],history:{topic:string;questions:number;independent:number}[],confirmed:string[]):Candidate[]{return skills.filter(s=>s.grade===grade).map(s=>{const row=history.find(r=>r.topic===s.topic),n=row?.questions??0,good=row?.independent??0,known=confirmed.includes(s.id);return {...s,questions:n,independent:good,alreadyConfirmed:known,priority:known?9:n>=3&&good/n<.8?0:n===0?1:2,reason:known?'Previously confirmed. Choose this only if you want a fresh check; old credit will not count.':n>=3&&good/n<.8?`Recent ${s.topic} work: ${good}/${n} independent successes. This subskill needs a starting check.`:n===0?'No recent evidence at this grade. Start with a short baseline check.':`Recent ${s.topic} work: ${good}/${n} independent successes. Topic evidence suggests a fresh subskill check.`};}).sort((a,b)=>a.priority-b.priority||a.variant-b.variant);}
