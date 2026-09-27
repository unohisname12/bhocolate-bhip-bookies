import type {EngineState} from '../../types/engine';
import type {MathProblem} from '../../types';
import {rewardMath} from '../../services/game/economy';
import {recordLearning} from '../../services/game/learningEvidence';
import {TRACKS,track,type Track,WIDTH,HEIGHT} from './catalog';
import {drop,startRun,question,type Run,type Drop,type Cell} from './game';
export type StackProgress={version:1;sequence:number;run:Run|null;best:Partial<Record<Track,number>>;wins:Partial<Record<Track,number>>;rewardDay:string;rewardCount:number;notice:string;lastRequest?:{id:string;command:string}};
export type StackCommand={kind:'start';track:Track;mode:'learn'|'arcade'|'flow'}|({kind:'drop';revision:number}&Drop)|{kind:'undo'|'hint'|'retry'|'explain';revision:number};
export const freshStack=():StackProgress=>({version:1,sequence:0,run:null,best:{},wins:{},rewardDay:'',rewardCount:0,notice:''});
export function parseStack(value:unknown):StackCommand{
 if(!value||typeof value!=='object')throw new Error('Choose a Math Stack action.');const c=value as Record<string,unknown>;
 if(c.kind==='start'&&TRACKS.some(t=>t.id===c.track)&&['learn','arcade','flow'].includes(String(c.mode)))return{kind:'start',track:c.track as Track,mode:c.mode as 'learn'|'arcade'|'flow'};
 if(!Number.isSafeInteger(c.revision)||Number(c.revision)<0)throw new Error('Reload the latest board.');
 if(c.kind==='drop'){for(const[k,max]of[['tray',2],['rotation',3],['value',5],['x',WIDTH-1]] as const)if(!Number.isInteger(c[k])||Number(c[k])<0||Number(c[k])>max)throw new Error('Invalid block placement.');return{kind:'drop',revision:Number(c.revision),tray:Number(c.tray),rotation:Number(c.rotation),value:Number(c.value),x:Number(c.x)};}
 if(['undo','hint','retry','explain'].includes(String(c.kind)))return{kind:c.kind as 'undo'|'hint'|'retry'|'explain',revision:Number(c.revision)};throw new Error('Unknown Math Stack action.');
}
export function problem(r:Run):MathProblem{const q=question(r),t=track(r.track);return{id:`stack:${r.id}:${r.round}`,question:q.prompt,answer:q.target/q.denominator,difficulty:1,reward:2,grade:t.grade,topic:t.skill,skillId:`math-stack:${r.track}`,templateId:`stack:${r.track}:v1`,context:'math-stack',hint:q.hint,explanation:[q.explanation]};}
export function stackCommand(state:EngineState,raw:StackCommand):EngineState{
 const c=parseStack(raw),p=structuredClone(state.mathStack??freshStack());let next=state;
 if(c.kind==='start'){
  p.sequence++;p.run=startRun(`${state.player.id??'player'}:${p.sequence}`,c.track,c.mode,Math.min(20,1+(p.wins[c.track]??0)),p.sequence*113+track(c.track).grade*37);p.notice='Each solved puzzle earns normal math rewards, up to 20 rewarded puzzles a day. Scores always count.';
 }else{
  const r=p.run;if(!r||r.status==='won'||r.revision!==c.revision)throw new Error('The board changed. Try again on the latest board.');
  if(c.kind==='drop'){
   const result=drop(r,c);p.run=result.run;
   if(result.wrong)next=recordLearning(next,problem(r),'math-stack',false);
   if(result.solved){const day=new Date().toISOString().slice(0,10);if(p.rewardDay!==day){p.rewardDay=day;p.rewardCount=0;}if(p.rewardCount<20){const mp=next.player.currencies.mp;next=rewardMath(next,problem(r),true,'math-stack');p.rewardCount++;p.notice=`Good math! +${next.player.currencies.mp-mp} MP · pet growth and practice progress saved.`;}else{next=recordLearning(next,problem(r),'math-stack',true);p.notice='Daily Math Stack reward limit reached. Your score and practice still count.';}
    p.best[r.track]=Math.max(p.best[r.track]??0,result.run.score);if(result.run.status==='won')p.wins[r.track]=(p.wins[r.track]??0)+1;
   }
  }else if(c.kind==='undo'){
   if(!r.previous)throw new Error('No placement to undo. Solved puzzles stay solved.');r.board=r.previous;r.previous=null;r.status='playing';r.revision++;r.combo=0;r.message='Last placement undone. Your solved puzzles and rewards are unchanged.';
  }else if(c.kind==='retry'){
   r.board=Array.from({length:HEIGHT},()=>Array<Cell|null>(WIDTH).fill(null));r.previous=null;r.status='playing';r.revision++;r.combo=0;r.message='Fresh space, same question. Keep thinking!';
  }else{
   r.helped=true;r.revision++;r.message=c.kind==='explain'?question(r).explanation:question(r).hint;next=recordLearning(next,problem(r),'math-stack',undefined,c.kind==='explain'?'explanation':'hint');
  }
 }
 return{...next,mathStack:p};
}
export function validStack(p:StackProgress|undefined):boolean{
 if(p===undefined)return true;
 try{
  const nat=(n:number,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  if(p.version!==1||!nat(p.sequence)||!nat(p.rewardCount,20)||typeof p.rewardDay!=='string'||typeof p.notice!=='string'||p.notice.length>1000)return false;
  for(const v of [p.best,p.wins])if(!v||Object.entries(v).some(([k,n])=>!TRACKS.some(t=>t.id===k)||!nat(n)))return false;
  if(p.lastRequest&&(typeof p.lastRequest.id!=='string'||p.lastRequest.id.length>100||typeof p.lastRequest.command!=='string'||p.lastRequest.command.length>1000))return false;
  const r=p.run;if(!r)return true;
  const board=(b:(Cell|null)[][])=>Array.isArray(b)&&b.length===HEIGHT&&b.every(row=>Array.isArray(row)&&row.length===WIDTH&&row.every(c=>c===null||typeof c==='object'&&Number.isInteger(c.n)&&Math.abs(c.n)<=100&&Number.isInteger(c.x)&&Math.abs(c.x)<=100&&[0,1,2].includes(c.color)));
  return typeof r.id==='string'&&r.id.length<160&&TRACKS.some(t=>t.id===r.track)&&['learn','arcade','flow'].includes(r.mode)&&['playing','won','blocked'].includes(r.status)&&nat(r.seed)&&nat(r.level,20)&&nat(r.round,r.mode==='flow'?12:5)&&nat(r.score)&&nat(r.combo)&&nat(r.cleared)&&nat(r.drops)&&nat(r.mistakes)&&nat(r.revision)&&typeof r.helped==='boolean'&&typeof r.message==='string'&&r.message.length<2000&&typeof r.lastClear==='string'&&board(r.board)&&(r.previous===null||board(r.previous));
 }catch{return false;}
}
