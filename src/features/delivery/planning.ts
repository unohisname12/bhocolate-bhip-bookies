import type { MathProblem } from '../../types';
import type { LearningSettings } from '../../services/game/curriculum';
import type { LearningEvidence } from '../../types/woodland';
import { quantityDecision } from '../learning/decisions';
import { checkAnswer } from '../../services/game/mathEngine';
import { preview, submit, type City, type Order } from './model';
export interface DeliveryPlan { problem:MathProblem; order:Order; round:number; total:number; cost:number; helpAllowed:boolean; support:'none'|'hint'|'explanation'; attempts:number; feedback?:string }
export function deliveryNumbers(s:City, actor:string, order:Order) {
  const p=s.players.find(p=>p.id===actor); if(!p)throw new Error('Join this city first.');
  const plan=preview(s,p,order), hire=s.trades?.find(t=>t.owner===actor && t.courier);
  return {total:plan.income,cost:hire?hire.pay:plan.cost};
}
export function startDeliveryPlan(s:City,actor:string,order:Order,settings:LearningSettings,now:number):City {
  const p=s.players.find(p=>p.id===actor); if(!p || p.submitted || s.phase!=='planning' || s.deadline>0 && now>=s.deadline)throw new Error('Wait for a planning round.');
  if(p.learningPlan)return s;
  // Validate all ordinary move rules without spending, submitting or granting briefing credit.
  submit({...s,players:s.players.map(r=>r.id===actor?{...r,practice:2}:r)},actor,order);
  const n=deliveryNumbers(s,actor,order);
  const problem=quantityDecision(settings,`delivery-plan:${s.id}:${s.round}:${actor}:${JSON.stringify(order)}:${n.total}:${n.cost}:${settings.grade}:${settings.topic}`,'delivery',n.total,n.cost,'coins', 'Plan this delivery’s margin before bonuses, assuming your crew wins this customer.');
  if(!problem)throw new Error('This route does not fit your assigned math strand. Choose another route or use the regular briefing.');
  const earlier=p.planningEvidence?.find(e=>e.questionId===problem.id);
  return {...s,players:s.players.map(r=>r.id===actor?{...r,learningPlan:{problem,order:{...order},round:s.round,...n,helpAllowed:settings.learningHelp!==false,support:earlier?.support ?? 'none',attempts:earlier?.attempts ?? 0}}:r)};
}
export function deliveryPlanAction(s:City,actor:string,kind:'hint'|'explanation'|'answer'|'cancel',answer:number,now:number):City {
  const p=s.players.find(p=>p.id===actor), task=p?.learningPlan;
  if(!p || !task || task.round!==s.round || s.phase!=='planning' || p.submitted || s.deadline>0 && now>=s.deadline)throw new Error('That planning turn has ended. Choose a current route.');
  const put=(plan:DeliveryPlan|undefined)=>({...s,players:s.players.map(r=>r.id===actor?{...r,learningPlan:plan}:r)});
  if(kind==='cancel')return put(undefined);
  if(kind!=='answer') {
    if(!task.helpAllowed)throw new Error('Help is disabled for this task.');
    const support=task.support==='explanation'?'explanation':kind;
    const row:LearningEvidence={questionId:task.problem.id,skillId:task.problem.skillId,templateId:task.problem.templateId,context:'delivery',topic:task.problem.topic!,grade:task.problem.grade!,source:'delivery',attempts:task.attempts,support,answerRevealed:support==='explanation',correct:false,firstAttemptCorrect:false,updatedAt:now};
    const next=put({...task,support});
    return {...next,players:next.players.map(r=>r.id===actor?{...r,planningEvidence:[...(r.planningEvidence??[]).filter(e=>e.questionId!==row.questionId),row].slice(-100)}:r)};
  }
  const current=deliveryNumbers(s,actor,task.order);
  if(current.total!==task.total || current.cost!==task.cost)return put({...task,feedback:'The route costs changed. Go back and plan the updated route.'});
  const correct=checkAnswer(task.problem,answer), attempts=task.attempts+1;
  const row:LearningEvidence={questionId:task.problem.id,skillId:task.problem.skillId,templateId:task.problem.templateId,context:'delivery',topic:task.problem.topic!,grade:task.problem.grade!,source:'delivery',attempts,support:task.support,answerRevealed:task.support==='explanation',correct,firstAttemptCorrect:correct && attempts===1 && task.support==='none',updatedAt:now};
  const withEvidence={...s,players:s.players.map(r=>r.id===actor?{...r,planningEvidence:[...(r.planningEvidence??[]).filter(e=>e.questionId!==row.questionId),row].slice(-100),learningPlan:{...task,attempts,feedback:correct?'Plan applied.':'Try subtracting the route cost from the income. No coins spent.'}}:r)};
  if(!correct)return withEvidence;
  const submitted=submit({...withEvidence,players:withEvidence.players.map(r=>r.id===actor?{...r,practice:Math.max(2,r.practice),learningPlan:undefined}:r)},actor,task.order);
  return {...submitted,log:[...submitted.log,`${p.alias} planned a ${task.problem.answer}-coin margin before bonuses. Actual settlement depends on the customer and events.`].slice(-30)};
}
