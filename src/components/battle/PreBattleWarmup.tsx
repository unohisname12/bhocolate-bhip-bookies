import { useSyncExternalStore } from 'react';
import { miniLessonActive, subscribeMiniLesson } from '../../features/mini-lesson/pause';
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { GameButton } from '../ui/GameButton';
import { checkAnswer } from '../../services/game/mathEngine';
import { generateLearningProblem, parseMathAnswer } from '../../services/game/curriculum';
import { LearningHelp } from '../math/LearningHelp';
import { useLearningSettings } from '../LearningContext';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface PreBattleWarmupProps {
  difficulty: number;
  dispatch: (action: GameEngineAction) => void;
}

const TIMER_SECONDS = 15;

export const PreBattleWarmup: React.FC<PreBattleWarmupProps> = ({
  dispatch,
}) => {
  const learning = useLearningSettings();
  const lessonOpen = useSyncExternalStore(subscribeMiniLesson, miniLessonActive, () => false);
  const [problem] = useState(() => generateLearningProblem(learning));
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const resolved = useRef(false);

  const resolve = (correct: boolean, skipped = false) => {
    if (resolved.current) return;
    resolved.current = true;
    dispatch({ type: 'RESOLVE_WARMUP', correct, skipped });
  };

  useEffect(() => {
    if (!learning.timedWarmup || wrong || lessonOpen || resolved.current) return;
    const id = window.setTimeout(() => {
      if (seconds <= 1) { setSeconds(0); resolve(false, true); }
      else setSeconds(seconds - 1);
    }, 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learning.timedWarmup, wrong, seconds, lessonOpen]);

  const submit = () => {
    const parsed = parseMathAnswer(input);
    if (Number.isNaN(parsed)) return;
    const correct = checkAnswer(problem, parsed);
    dispatch({ type: 'RECORD_LEARNING_ATTEMPT', problem, source: 'warmup', correct });
    if (correct) resolve(true);
    else setWrong(true);
  };

  return (
    <Modal isOpen title="Pre-Battle Warmup" onClose={() => dispatch({ type: 'CANCEL_BATTLE_WARMUP' })} footer={<button className="min-h-11 px-4 text-slate-200" onClick={() => dispatch({ type: 'CANCEL_BATTLE_WARMUP' })}>Cancel battle</button>}>
        <div className="mb-3 flex items-center justify-between">

          <span className={`font-mono text-sm ${seconds <= 5 ? 'text-red-400' : 'text-slate-300'}`}>
            {learning.timedWarmup ? wrong ? `Paused · ${seconds}s` : `${seconds}s` : 'No timer'}
          </span>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Solve for +3 ATK this battle. Skipping is allowed.
        </p>
        <div className="mb-4 rounded bg-slate-800 px-4 py-6 text-center">
          <div className="text-3xl font-black text-slate-100">{problem.question}</div>
        </div>
        {wrong && <><p role="status" className="text-amber-200 mb-2">Not quite yet. Try again. {learning.timedWarmup && 'The timer is paused while you learn.'}</p><LearningHelp key={problem.id} problem={problem} onRetry={() => { setWrong(false); document.querySelector<HTMLInputElement>('[aria-label="Warmup answer"]')?.select(); }} /></>}
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          aria-label="Warmup answer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          className="mb-3 w-full rounded bg-slate-800 px-3 py-2 text-center text-xl font-bold text-white outline-none ring-2 ring-indigo-500/50 focus:ring-indigo-400"
          placeholder="Your answer"
        />
        <div className="flex gap-2">
          <GameButton variant="secondary" onClick={() => resolve(false, true)} className="flex-1">
            Skip
          </GameButton>
          <GameButton variant="primary" onClick={submit} className="flex-1">
            Submit
          </GameButton>
        </div>
    </Modal>
  );
};
