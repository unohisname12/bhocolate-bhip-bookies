import { middleSkill } from '../middle-school/catalog';
import {metrics,status,type Policy,type ProgressView,type Target} from './model';
import {lesson} from './lessons';

function reviewNext(p:ProgressView,t:Target,policy:Policy,now:number) {
 const state=status(t);
 if(state==='secure')return 'Check the starting work, then choose another growth target.';
 if(state==='baseline')return 'Finish the starting check before judging growth.';
 if(state==='confirmed')return t.retentionAt?'Compare the one-week result with earlier work.':t.confirmedAt!+7*86400000<=now?'Invite the optional one-week check.':'Revisit this skill about a week after confirmation.';
 if(state==='ready')return p.version===2&&!t.reflection?'Ask for an explanation and record what you hear.':'Compare the responses and explanation, then add your observation.';
 if(state==='transfer')return 'Try the additional fresh check; the independent check has passed.';
 if(state==='follow'){const due=Math.max(t.passedAt??0,t.transferAt??0)+policy.delayHours*3600000;return now>=due?'The later check is ready. Ask the learner to return to it.':`Later check opens ${new Date(due).toLocaleString()}.`;}
 const m=metrics(p,t);
 return m.supported?'Discuss one worked step, then try a fresh problem without support.':m.practiceForNextCheck>=3?'The independent check is available.':'Review the example and complete short guided practice.';
}
export function ReviewSummary({p,t,policy,now}:{p:ProgressView;t:Target;policy:Policy;now:number}) {
 const m=metrics(p,t),score=(ids:string[]|undefined,n:number,total:number)=>ids?.length?`${n}/${ids.length} answered${ids.length<total?` (${total} in set)`:''}`:'Not checked';
 return <span className="skill-comparison">
  <small>Starting: {t.baseline===null?`${t.baselineIds.length}/3 answered`:`${t.baseline}/3 correct`}</small>
  <small>Practice: {m.supported} supported · {m.independentPractice} correct without hints</small>
  <small>Independent: {score(t.checkIds,m.check,5)}</small>
  <small>{middleSkill(t.id)?'Fresh quantities':'Different use'}: {p.version===2?score(t.transferIds,m.transfer,2):'Not assessed under original rules'}</small>
  {middleSkill(t.id)&&<small>Transfer to an unfamiliar situation needs teacher observation; fresh quantities alone do not establish it.</small>}
  <small>Explanation: {t.reflection?'Recorded; review the reasoning':'Not recorded'}</small>
  <small>Later: {score(t.followIds,m.follow,2)} · Week: {score(t.retentionIds,m.retention,2)}</small>
  <small><strong>Next:</strong> {reviewNext(p,t,policy,now)}</small>
  <small><strong>Ask:</strong> {lesson(t.id,p.learning.challenge).oralPrompt}</small>
 </span>;
}
