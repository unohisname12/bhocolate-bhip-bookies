import type {EngineState} from '../../types/engine';
import type {MathProblem} from '../../types';
import {rewardMath} from '../../services/game/economy';
import {recordLearning} from '../../services/game/learningEvidence';
import {TRAILS,trail,startPop,popChain,mixPop,goal,findChain,type PopRun,type Trail} from './game';
export type PopProgress={version:1;sequence:number;run:PopRun|null;unlocked:Partial<Record<Trail,number>>;best:Partial<Record<Trail,number>>;rewardDay:string;rewardCount:number;notice:string;lastRequest?:{id:string;command:string}};
export type PopCommand={kind:'start';trail:Trail;level:number}|{kind:'chain';revision:number;path:number[]}|{kind:'hint'|'mix';revision:number};
export const freshPop=():PopProgress=>({version:1,sequence:0,run:null,unlocked:{},best:{},rewardDay:'',rewardCount:0,notice:''});
export function parsePop(raw:unknown):PopCommand{
 if(!raw||typeof raw!=='object')throw new Error('Choose a Math Pop action.');const c=raw as Record<string,unknown>;
 if(c.kind==='start'&&TRAILS.some(t=>t.id===c.trail)&&Number.isInteger(c.level)&&Number(c.level)>=1&&Number(c.level)<=99)return{kind:'start',trail:c.trail as Trail,level:Number(c.level)};
 if(!Number.isSafeInteger(c.revision)||Number(c.revision)<0)throw new Error('Reload your latest puzzle.');
 if(c.kind==='mix')return{kind:'mix',revision:Number(c.revision)};
 if(c.kind==='hint')return{kind:'hint',revision:Number(c.revision)};
 if(c.kind==='chain'&&Array.isArray(c.path)&&c.path.length>=2&&c.path.length<=8&&c.path.every(i=>Number.isInteger(i)&&i>=0&&i<36))return{kind:'chain',revision:Number(c.revision),path:[...c.path]};
 throw new Error('Choose 2–8 neighboring tiles.');
}
export function popProblem(r:PopRun):MathProblem{const g=goal(r),t=trail(r.trail);return{id:`pop:${r.id}:${r.turn}`,question:g.title,answer:g.target/g.denominator,difficulty:1,reward:2,grade:t.grade,topic:t.skill,skillId:`math-pop:${r.trail}`,templateId:`pop:${r.trail}:v1`,context:'math-pop',hint:g.rule,explanation:[r.lastEquation||g.rule]};}
export function popCommand(state:EngineState,raw:PopCommand):EngineState{
 const c=parsePop(raw),p=structuredClone(state.mathPop??freshPop());let next=state;
 if(c.kind==='start'){
  if(c.level>(p.unlocked[c.trail]??1))throw new Error('Clear the previous level first.');
  p.sequence++;p.run=startPop(`${state.player.id??'player'}:${p.sequence}`,c.trail,c.level,p.sequence*113+c.level*37);p.notice='Correct chains grow your pet. Up to 20 rewarded chains a day; scores always count.';
 }else{
  const r=p.run;if(!r||r.status!=='playing'||r.revision!==c.revision)throw new Error('The puzzle changed. Use the latest board.');
  if(c.kind==='mix'){p.run=mixPop(r);}
  else if(c.kind==='hint'){r.hint=findChain(r);r.revision++;r.message='Follow the glowing tiles in order. The first tile is marked 1.';next=recordLearning(next,popProblem(r),'math-pop',undefined,'explanation');}
  else if(c.kind==='chain'){
   const result=popChain(r,c.path);p.run=result.run;
   if(result.solved){const day=new Date().toISOString().slice(0,10);if(p.rewardDay!==day){p.rewardDay=day;p.rewardCount=0;}if(p.rewardCount<20){const mp=next.player.currencies.mp;next=rewardMath(next,popProblem(r),true,'math-pop');p.rewardCount++;p.notice=`Good math! +${next.player.currencies.mp-mp} MP · pet growth saved.`;}else{next=recordLearning(next,popProblem(r),'math-pop',true);p.notice='Daily reward limit reached. Your score and practice still count.';}
    p.best[r.trail]=Math.max(p.best[r.trail]??0,result.run.score);if(result.run.status==='won')p.unlocked[r.trail]=Math.max(p.unlocked[r.trail]??1,Math.min(99,r.level+1));
   }else next=recordLearning(next,popProblem(r),'math-pop',false);
  }
 }
 return{...next,mathPop:p};
}
export function validPop(p:PopProgress|undefined){
 if(p===undefined)return true;
 try{const nat=(n:number,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;const ids=(a:number[],max:number)=>Array.isArray(a)&&a.length<=max&&a.every(i=>nat(i,35));
 if(p.version!==1||!nat(p.sequence)||!nat(p.rewardCount,20)||typeof p.rewardDay!=='string'||typeof p.notice!=='string'||p.notice.length>1000)return false;
 for(const v of [p.unlocked,p.best])if(!v||Object.entries(v).some(([k,n])=>!TRAILS.some(t=>t.id===k)||!nat(n)))return false;
 if(p.lastRequest&&(typeof p.lastRequest.id!=='string'||p.lastRequest.id.length>100||typeof p.lastRequest.command!=='string'||p.lastRequest.command.length>1000))return false;
 const r=p.run;if(r===null)return true;
 return !!r&&typeof r.id==='string'&&r.id.length<160&&TRAILS.some(t=>t.id===r.trail)&&nat(r.level,99)&&r.level>=1&&nat(r.seed,0xffffffff)&&nat(r.serial)&&nat(r.revision)&&nat(r.turn)&&nat(r.score)&&nat(r.chains)&&nat(r.ice,36)&&nat(r.stars,1)&&nat(r.moves,12)&&['playing','won','lost'].includes(r.status)&&typeof r.message==='string'&&r.message.length<2000&&typeof r.lastEquation==='string'&&r.lastEquation.length<1000&&ids(r.burst,36)&&ids(r.hint,8)&&Array.isArray(r.board)&&r.board.length===36&&new Set(r.board.map(t=>t.id)).size===36&&r.board.every(t=>nat(t.id)&&Number.isInteger(t.n)&&Math.abs(t.n)<=100&&typeof t.ice==='boolean'&&typeof t.star==='boolean'&&[null,'rocket','bomb'].includes(t.power));
 }catch{return false;}
}
