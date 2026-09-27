import { useContext, useState } from 'react';
import type { MathProblem } from '../../types';
import { LearningActionContext, useLearningSettings } from '../LearningContext';
import './learning-help.css';
import { MiniLessonButton } from '../../features/mini-lesson/MiniLesson';

/** Inline, optional support: never submits an answer or grants a reward. Key by problem id. */
export function LearningHelp({ problem, onRetry, beforeAttempt = false }: { problem: MathProblem; onRetry: () => void; beforeAttempt?: boolean }) {
  const learning = useLearningSettings();
  const dispatch = useContext(LearningActionContext);
  const [view, setView] = useState<'offer' | 'hint' | 'steps'>('offer');
  if (learning.learningHelp === false) return null;
  return <aside className="learning-help" aria-label="Learning help">
    <p aria-live="polite"><strong>{beforeAttempt ? 'Want a little help getting started?' : 'Not quite yet. Want a little help?'}</strong></p>
    <p>{beforeAttempt ? 'Use a hint, then try the question at your own pace.' : 'Mistakes help us learn. You can try again whenever you’re ready.'}</p>
    <div className="learning-help-actions">
      <MiniLessonButton problem={problem} onOpen={() => dispatch({ type: 'RECORD_LEARNING_HELP', problem, support: 'explanation' })}/>
      {problem.hint && <button type="button" aria-pressed={view === 'hint'} onClick={() => { setView('hint'); dispatch({ type: 'RECORD_LEARNING_HELP', problem, support: 'hint' }); }}>Give me a hint</button>}
      <button type="button" aria-pressed={view === 'steps'} onClick={() => { setView('steps'); dispatch({ type: 'RECORD_LEARNING_HELP', problem, support: 'explanation' }); }}>Explain the answer</button>
      <button type="button" onClick={onRetry}>Try again without help</button>
    </div>
    {view === 'hint' && <p className="learning-help-detail" role="status">{problem.hint}</p>}
    {view === 'steps' && <div className="learning-help-detail" role="region" aria-label="Worked explanation">
      <h3>Let’s work it out</h3>
      <p>{problem.question}</p>
      {problem.explanation?.length ? <ol>{problem.explanation.map((step, i) => <li key={i}>{step}</li>)}</ol> : <p>{problem.hint ?? 'Check each part of the question carefully.'}</p>}
      <p><strong>Answer: {problem.answer}</strong></p>
      <p>Now try the question yourself. What step helped you?</p>
      <button type="button" onClick={onRetry}>I’m ready to try again</button>
    </div>}
  </aside>;
}
