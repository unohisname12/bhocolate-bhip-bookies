import React from 'react';
import type { CatchRound } from '../types';

interface Props {
  round: CatchRound;
}

export const PromptCard: React.FC<Props> = ({ round }) => {
  return (
    <div
      className="mx-auto mt-4 rounded-2xl px-5 py-4 text-center"
      data-testid="catch-prompt"
      style={{
        background: 'linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.92))',
        border: '2px solid rgba(251,191,36,0.35)',
        boxShadow: '0 6px 0 rgba(0,0,0,0.45), 0 0 22px rgba(59,130,246,0.18)',
        maxWidth: 340,
      }}
    >
      <div
        className="font-black uppercase text-[10px] tracking-[0.25em]"
        style={{ color: '#fde68a', letterSpacing: '0.25em' }}
      >
        {round.mode === 'missing_number'
          ? 'Missing Number'
          : round.mode === 'solve_for_x'
          ? 'Solve for X'
          : 'Equation Step'}
        {round.totalSteps ? ` · Step ${(round.stepIndex ?? 0) + 1}/${round.totalSteps}` : ''}
      </div>
      <div
        className="font-black text-white mt-2"
        style={{
          fontSize: 36,
          lineHeight: 1.05,
          letterSpacing: '0.03em',
          textShadow: '0 2px 0 rgba(0,0,0,0.8), 0 0 16px rgba(59,130,246,0.35)',
        }}
      >
        {round.prompt}
      </div>
      <div className="mt-2 font-bold text-[10px] uppercase tracking-widest text-cyan-300/80">
        {round.difficulty}
      </div>
    </div>
  );
};
