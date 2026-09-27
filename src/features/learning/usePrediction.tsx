import { useContext, useState } from 'react';
import type { MathProblem } from '../../types';
import { LearningActionContext } from '../../components/LearningContext';
import { checkAnswer } from '../../services/game/mathEngine';
import { DecisionCard } from './DecisionCard';
/** Optional planning aid. A changed board/turn invalidates the captured action. */
export function usePrediction(snapshot:string) {
  const dispatch=useContext(LearningActionContext);
  const [enabled,setEnabled]=useState(false);
  const [pending,setPending]=useState<{problem:MathProblem;snapshot:string;apply:()=>void|boolean}|null>(null);
  const [receipt,setReceipt]=useState('');
  const attempt=(problem:MathProblem|null,apply:()=>void|boolean)=>{
    if(!enabled || !problem)return apply()!==false;
    setPending({problem,snapshot,apply}); return true;
  };
  const panel=<>{pending && pending.snapshot===snapshot ? <DecisionCard key={pending.problem.id} problem={pending.problem} onCancel={()=>setPending(null)} onAnswer={answer=>{
    dispatch({type:'RECORD_GAME_PREDICTION',problem:pending.problem,answer});
    if(checkAnswer(pending.problem,answer)){pending.apply();setReceipt(pending.problem.explanation?.[0]??'Plan applied.');setPending(null);}
  }}/> : pending ? <p role="status">The board changed. Choose your next move to make a new plan.</p>:null}
    {receipt&&<p className="learning-receipt" role="status">{receipt}</p>}</>;
  return {attempt,panel,enabled,toggle:<label className="learning-footnote"><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setPending(null);}}/> Plan moves with math when they fit my assigned skill</label>};
}
