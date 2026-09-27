import { useState } from 'react';
import type { MathProblem } from '../../types';
import { MathAnswerInput } from '../../components/math/MathAnswerInput';
import { LearningHelp } from '../../components/math/LearningHelp';
import { checkAnswer } from '../../services/game/mathEngine';
import { useLearningSettings } from '../../components/LearningContext';
import './learning.css';
export function DecisionCard({problem, onAnswer, onCancel, busy=false, title='Plan your next move'}: {
  problem:MathProblem; onAnswer:(answer:number)=>void; onCancel:()=>void; busy?:boolean; title?:string;
}) {
  const [wrong,setWrong]=useState(false), [help,setHelp]=useState(false);
  const learning=useLearningSettings();
  return <section className="learning-decision" aria-label="Math game plan">
    <p className="learning-kicker">PLAN → ACT → SEE WHAT CHANGES</p><h3>{title}</h3>
    <p>Skill: {problem.topic} · Take your time</p><p className="learning-question">{problem.question}</p>
    <fieldset disabled={busy}><MathAnswerInput key={problem.id} isCorrect={wrong?false:null} onSubmit={answer=>{setWrong(!checkAnswer(problem,answer));onAnswer(answer);}}/></fieldset>
    {wrong && <p role="status">Check which amount you start with and which amount changes. Your supplies are safe.</p>}
    {learning.learningHelp!==false && <button type="button" onClick={()=>setHelp(true)}>Help me plan</button>}
    {help && <LearningHelp key={problem.id} problem={problem} beforeAttempt={!wrong} onRetry={()=>setHelp(false)}/>}
    <button type="button" disabled={busy} onClick={onCancel}>Back to my choices</button>
    <p className="learning-footnote">A correct plan applies your chosen move. Hints and retries are welcome.</p>
  </section>;
}
