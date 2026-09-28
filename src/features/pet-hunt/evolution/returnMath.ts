import type {LearningEvidence,SkillReview} from '../../../types/woodland';
import type {SparkCheck} from '../spark';
/** Only these short, single-operation templates belong in a return challenge. */
export const QUICK_TOPICS=['Counting','Addition within 10','Addition within 20','Subtraction within 20','Two-digit addition','Two-digit subtraction','Multiplication facts','Division facts','Factors','Decimals','Signed integers','One-step equations'] as const;
export type QuickTopic=typeof QUICK_TOPICS[number];
export interface ReturnProfile {skills:QuickTopic[]; established:boolean}
/** Use recent, independent first-try evidence. Reviews alone do not prove current fluency. */
export function returnProfile(state:{learningEvidence?:LearningEvidence[];skillReviews?:SkillReview[]},now=Date.now()):ReturnProfile {
 const skills=QUICK_TOPICS.filter(topic=>{
  const rows=[...new Map((state.learningEvidence??[]).filter(r=>r.topic===topic&&r.attempts>0&&r.updatedAt<=now&&r.updatedAt>=now-90*86400000).map(r=>[r.questionId,r])).values()].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,8);
  const good=rows.filter(r=>r.correct&&r.firstAttemptCorrect&&r.support==='none'&&!r.answerRevealed);
  return good.length>=3&&good.length/rows.length>=.8&&!state.skillReviews?.some(r=>r.topic===topic&&r.needsFreshCheck);
 });
 return {skills:skills.length?skills:['Addition within 10'],established:skills.length>0};
}
export function makeReturnCheck(id:number,profile:ReturnProfile|undefined,random:()=>number,misses=0,relaxed=false):SparkCheck {
 const topics=profile?.skills.length?profile.skills:['Addition within 10' as QuickTopic];
 const topic=topics[Math.floor(random()*topics.length)],int=(lo:number,hi:number)=>lo+Math.floor(random()*(hi-lo+1));
 const a=int(1,misses>=2?4:9),b=int(1,misses>=2?3:5);let prompt:string,answer:number;
 switch(topic){
 case 'Counting':prompt=`Count: ${'● '.repeat(b).trim()}`;answer=b;break;
 case 'Addition within 10':prompt=`${b} + ${Math.min(a,10-b)}`;answer=b+Math.min(a,10-b);break;
 case 'Addition within 20':prompt=`${a} + ${b}`;answer=a+b;break;
 case 'Subtraction within 20':prompt=`${a+b} − ${b}`;answer=a;break;
 case 'Two-digit addition':prompt=`${10+a} + ${10+b}`;answer=20+a+b;break;
 case 'Two-digit subtraction':prompt=`${20+a+b} − ${10+b}`;answer=10+a;break;
 case 'Multiplication facts':prompt=`${a} × ${b}`;answer=a*b;break;
 case 'Division facts':prompt=`${a*b} ÷ ${b}`;answer=a;break;
 case 'Factors':prompt=`${b} × ? = ${a*b}`;answer=a;break;
 case 'Decimals':prompt=`${(a/10).toFixed(1)} + ${(b/10).toFixed(1)}`;answer=(a+b)/10;break;
 case 'Signed integers':prompt=`−${b} + ${a}`;answer=a-b;break;
 case 'One-step equations':prompt=`x + ${b} = ${a+b}`;answer=a;break;
 }
 const step=topic==='Decimals'?.1:1,fmt=(n:number)=>String(Math.round(n*10)/10);
 const offsets=[-2,-1,1,2];for(let j=offsets.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[offsets[j],offsets[k]]=[offsets[k],offsets[j]];}
 const wrong=offsets.map(n=>answer+n*step).filter(n=>topic==='Signed integers'||n>=0).slice(0,2),choices=[fmt(answer),...wrong.map(fmt)];
 for(let j=2;j>0;j--){const k=Math.floor(random()*(j+1));[choices[j],choices[k]]=[choices[k],choices[j]];}
 const total=(relaxed||!profile?.established?12:8)+Math.min(4,misses*2);
 return {id,kind:'facts',prompt,choices,answer:choices.indexOf(fmt(answer)),left:total,total};
}
