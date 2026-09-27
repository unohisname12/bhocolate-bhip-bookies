import { useContext, useRef, useState } from 'react';
import { LearningActionContext, useLearningSettings } from '../../components/LearningContext';
import { MathAnswerInput } from '../../components/math/MathAnswerInput';
import { answerMatches, parseMathAnswer, type LearningSettings } from '../../services/game/curriculum';
import type { MathProblem } from '../../types';
import { getSkill } from '../skill-challenge/catalog';
import { learningProblem } from '../skill-challenge/lessons';
import { LessonView, QuantityModel } from '../skill-challenge/LessonView';

export function SkillPractice({ id, settings }: { id: string; settings: LearningSettings }) {
  const dispatch = useContext(LearningActionContext), currentSettings = useLearningSettings();
  const skill = getSkill(id)!;
  const [started, setStarted] = useState(false), [index, setIndex] = useState(0), [correct, setCorrect] = useState<boolean | null>(null), [help, setHelp] = useState(false);
  const make = (n: number) => {
    const q = learningProblem(id, settings.challenge, 'check', n, Math.random);
    const problem: MathProblem = { id: `lab:${crypto.randomUUID()}`, skillId: id, grade: skill.grade, topic: skill.topic, practiceSettings: settings, templateId:q.templateId, context:'math-lab', question:q.text, answer:q.answer, hint:q.hint, explanation:[q.explanation], difficulty:settings.challenge==='stretch'?3:settings.challenge==='support'?1:2, reward:10 };
    return {q, problem};
  };
  const [task, setTask] = useState(() => make(0)), done = useRef(false);
  const changed = currentSettings.grade !== settings.grade || currentSettings.challenge !== settings.challenge || currentSettings.topic !== 'mixed' && currentSettings.topic !== skill.topic;
  const support = (kind: 'hint' | 'explanation') => dispatch({type:'RECORD_LEARNING_HELP',problem:task.problem,support:kind});
  return <section aria-label={`Practice ${skill.name}`}>
    <h3>{skill.name}</h3><p>Learn from an example, then try three fresh questions. Practice helps your teacher choose a next step; it does not mark a skill mastered.</p>
    {!started ? <><LessonView id={id} level={settings.challenge}/><button disabled={changed} onClick={()=>{setStarted(true);support('hint');}}>Try three practice questions</button></> : <>
      <p>Practice {Math.min(index+1,3)} of 3 · {index===0?'Supported first step':'Try independently; help is available'}</p>
      {index<3 ? <><QuantityModel visual={task.q.visual}/><h4>{task.q.text}</h4>
        {index===0&&<p>{task.q.hint}</p>}
        <MathAnswerInput key={task.problem.id} disabled={changed||correct===true} isCorrect={correct} onSubmit={answer=>{
          if(done.current||changed||!Number.isFinite(parseMathAnswer(String(answer))))return;
          const ok=answerMatches(answer,task.problem.answer,task.problem.question);
          done.current=ok;setCorrect(ok);
          dispatch({type:'SOLVE_MATH',problem:task.problem,source:'practice',correct:ok,difficulty:task.problem.difficulty,reward:10});
        }}/>
        {correct===false&&<p role="status">Not yet. Your attempt is saved. Use the hint or worked solution and try again.</p>}
        {correct!==true&&<button disabled={changed} onClick={()=>{setHelp(true);support('explanation');}}>Show the worked solution</button>}
        {help&&<p>{task.q.explanation}</p>}
        {correct===true&&<><p role="status">Correct. {task.q.explanation}</p><button onClick={()=>{const n=index+1;setIndex(n);if(n<3)setTask(make(n));setCorrect(null);setHelp(false);done.current=false;}}>{index===2?'Finish practice':'Next fresh question'}</button></>}
      </> : <p role="status">Three questions completed. Your attempts and help are recorded. Come back later for a fresh check.</p>}
    </>}
    {changed&&<p role="status">Your teacher changed your learning settings. Close this practice and open your updated topic.</p>}
  </section>;
}
