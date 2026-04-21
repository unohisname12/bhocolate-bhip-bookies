import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from '../ui/GameCard';
import { GameButton } from '../ui/GameButton';
import { generateMathProblem } from '../../services/game/mathEngine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface PreBattleWarmupProps {
  difficulty: number;
  dispatch: (action: GameEngineAction) => void;
}

const TIMER_SECONDS = 15;

export const PreBattleWarmup: React.FC<PreBattleWarmupProps> = ({
  difficulty,
  dispatch,
}) => {
  const problem = useMemo(() => generateMathProblem(difficulty, 'arithmetic'), [difficulty]);
  const [input, setInput] = useState('');
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const resolved = useRef(false);

  const resolve = (correct: boolean, skipped = false) => {
    if (resolved.current) return;
    resolved.current = true;
    dispatch({ type: 'RESOLVE_WARMUP', correct, skipped });
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          resolve(false, true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    const parsed = parseInt(input, 10);
    if (Number.isNaN(parsed)) return;
    resolve(parsed === problem.answer);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <GameCard className="w-full max-w-sm border-4 border-indigo-500 bg-slate-900 shadow-2xl anim-pop">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-wider text-indigo-300">
            Pre-Battle Warmup
          </h2>
          <span className={`font-mono text-sm ${seconds <= 5 ? 'text-red-400' : 'text-slate-300'}`}>
            {seconds}s
          </span>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Solve for +3 ATK this battle. Skipping is allowed.
        </p>
        <div className="mb-4 rounded bg-slate-800 px-4 py-6 text-center">
          <div className="text-3xl font-black text-slate-100">{problem.question}</div>
        </div>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
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
      </GameCard>
    </div>
  );
};
