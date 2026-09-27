import { MathAnswerInput } from '../../components/math/MathAnswerInput';
import type { DeliveryPlan } from './planning';
import '../learning/learning.css';
export function DeliveryPlanCard({task,busy,act}:{task:DeliveryPlan;busy:boolean;act:(kind:'hint'|'explanation'|'answer'|'cancel',answer?:number)=>void}) {
  return <section className="learning-decision" aria-label="Delivery math plan"><p className="learning-kicker">PLAN YOUR ACTUAL DELIVERY</p><h3>Predict the margin, then send your pet</h3><p>{task.problem.topic} · Current round deadline still applies</p><p>{task.problem.question}</p>
    <fieldset disabled={busy}><MathAnswerInput key={task.problem.id} isCorrect={task.attempts?false:null} onSubmit={answer=>act('answer',answer)}/></fieldset>
    {task.feedback&&<p role="status">{task.feedback}</p>}
    {task.helpAllowed&&<><button disabled={busy} onClick={()=>act('hint')}>Give me a hint</button><button disabled={busy} onClick={()=>act('explanation')}>Explain the answer</button></>}
    {task.support==='hint'&&<p>{task.problem.hint}</p>}{task.support==='explanation'&&<p>{task.problem.explanation?.join(' ')}</p>}
    <button disabled={busy} onClick={()=>act('cancel')}>Back to my choices</button><p>A correct answer seals this route. The result before bonuses is a prediction, not a guaranteed payout. Supported work is recorded separately.</p>
  </section>;
}
