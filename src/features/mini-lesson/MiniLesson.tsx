import { useContext, useEffect, useId, useRef, useState } from 'react';
import { LearningActionContext, useLearningSettings } from '../../components/LearningContext';
import { answerMatches, type Challenge } from '../../services/game/curriculum';
import { MathAnswerInput } from '../../components/math/MathAnswerInput';
import type { MathProblem } from '../../types';
import { QuantityModel } from '../skill-challenge/QuantityModel';
import { createMiniLesson, skillLessonSource, type MiniLesson } from './model';
import { holdMiniLesson } from './pause';
import './mini-lesson.css';

export interface LessonAttempt { problem: MathProblem; correct: boolean; revealed: boolean }
export function MiniLessonButton({ problem, skillId, level, onOpen }: { problem?: MathProblem; skillId?: string; level?: Challenge; onOpen?: () => void }) {
  const settings = useLearningSettings();
  const [lesson, setLesson] = useState<MiniLesson | null>(null), [error, setError] = useState('');
  if (settings.learningHelp === false) return null;
  return <><button type="button" className="mini-lesson-entry" onClick={() => {
    try {
      const learning = { ...settings, challenge: level ?? settings.challenge };
      const source = problem ?? skillLessonSource(skillId!, learning);
      const next = createMiniLesson(source, learning);
      onOpen?.(); setError(''); setLesson(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open the lesson.'); }
  }}>Work through it together</button>{error && <p role="status">{error}</p>}
    {lesson && <LessonDialog lesson={lesson} onClose={() => setLesson(null)}/>}</>;
}

function LessonDialog({ lesson, onClose }: { lesson: MiniLesson; onClose: () => void }) {
  const dispatch = useContext(LearningActionContext), dialog = useRef<HTMLDialogElement>(null), title = useId();
  const [stage, setStage] = useState<'example' | 'guided' | 'fresh' | 'done'>('example');
  const [step, setStep] = useState(0), [correct, setCorrect] = useState<boolean | null>(null), [revealed, setRevealed] = useState(false);
  const attempts = useRef<LessonAttempt[]>([]), finished = useRef(false);
  useEffect(() => {
    const release = holdMiniLesson(), node = dialog.current, previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); release(); previous?.focus(); };
  }, []);
  const task = stage === 'guided' ? lesson.guided : lesson.fresh;
  const nextStage = () => {
    if (stage === 'example') setStage('guided');
    else if (stage === 'guided') setStage('fresh');
    else {
      if (!finished.current) { finished.current = true; dispatch({ type: 'COMPLETE_MINI_LESSON', attempts: attempts.current }); }
      setStage('done');
    }
    setCorrect(null); setRevealed(false);
  };
  return <dialog className="mini-lesson-dialog" ref={dialog} aria-labelledby={title} onCancel={e => { e.preventDefault(); onClose(); }}>
    <header><img src="/assets/woodland-v1/pip-portrait.png" alt=""/><div><p>Let’s work through it together · No rush</p><h2 id={title}>{lesson.title}</h2></div><button type="button" onClick={onClose} aria-label="Close mini-lesson">Close</button></header>
    <p>Take your time. This lesson does not spend your earned game minutes. Live classmates’ matches continue.</p>
    <nav aria-label="Lesson progress">{['Example', 'Together', 'Fresh try'].map((label, i) => <span key={label} aria-current={['example','guided','fresh'][i] === stage ? 'step' : undefined}>{i + 1}. {label}</span>)}</nav>
    {stage === 'example' ? <section aria-label="One step at a time">
      <QuantityModel visual={lesson.example.visual}/><h3>{lesson.example.question}</h3>
      <p className="mini-lesson-step" aria-live="polite">{lesson.example.steps[step]}</p>
      <p>Step {step + 1} of {lesson.example.steps.length}</p>
      <div className="mini-lesson-actions">{step > 0 && <button onClick={() => setStep(step - 1)}>Previous step</button>}
        {step + 1 < lesson.example.steps.length ? <button onClick={() => setStep(step + 1)}>Next step</button> : <button onClick={nextStage}>Let’s try one together</button>}</div>
    </section> : stage === 'done' ? <section role="status"><h3>You worked through the lesson</h3><p>Your attempts are recorded as supported practice. Your teacher can see what still needs help; completing this lesson does not mark a skill mastered.</p><p>In classrooms with support minutes enabled, a completed lesson can earn the daily support allowance once. Your teacher controls that allowance.</p><button onClick={onClose}>Return to my activity</button></section> : <section aria-label={stage === 'guided' ? 'Try together' : 'Fresh try'}>
      <QuantityModel visual={task.visual}/><h3>{task.problem.question}</h3>
      {stage === 'guided' && <p className="mini-lesson-step">{task.problem.hint}</p>}
      <MathAnswerInput key={stage} isCorrect={correct} disabled={correct === true} onSubmit={answer => {
        if (correct === true) return;
        const ok = answerMatches(answer, task.problem.answer, task.problem.question);
        attempts.current.push({ problem: task.problem, correct: ok, revealed }); setCorrect(ok);
        dispatch({ type: 'RECORD_MINI_LESSON_ATTEMPT', problem: task.problem, correct: ok, revealed });
        if (!ok) { setRevealed(true); dispatch({ type: 'RECORD_MINI_LESSON_HELP', problem: task.problem }); }
      }}/>
      {correct !== null && <p role="status">{correct ? 'That works. Notice how the quantities fit together.' : 'Not yet. Let’s look at the steps. You can retry or finish this step with help.'}</p>}
      {correct !== true && <button type="button" onClick={() => { setRevealed(true); dispatch({ type: 'RECORD_MINI_LESSON_HELP', problem: task.problem }); }}>Show this step with help</button>}
      {(revealed || correct === false || correct === true) && <div className="mini-lesson-step"><p>{task.problem.hint}</p>{task.problem.explanation?.map((line, i) => <p key={i}>{line}</p>)}<p>Answer: {task.problem.answer}</p></div>}
      {correct !== null && <button type="button" onClick={nextStage}>{stage === 'guided' ? 'Try fresh numbers' : 'Finish my lesson'}</button>}
      <p>You can ask for help, try again, or close the lesson. Mistakes do not take away supplies.</p>
    </section>}
  </dialog>;
}
