import type React from 'react';
import type { MomentumPhase } from '../../../types/momentum';

interface MomentumActionBarProps {
  phase: MomentumPhase;
  onSkip: () => void;
  onForfeit: () => void;
}

export const MomentumActionBar: React.FC<MomentumActionBarProps> = ({
  phase,
  onSkip,
  onForfeit,
}) => {
  const canSkip = phase === 'player_select' || phase === 'player_move';
  const isAnimating = phase.startsWith('animating') || phase === 'flash_sequence' || phase === 'flash_choice';
  const isGameOver = phase === 'victory' || phase === 'defeat';

  if (isGameOver) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <button
        onClick={onSkip}
        disabled={!canSkip}
        className={`
          px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide
          transition-all duration-150
          ${canSkip
            ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border border-slate-600/50'
            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'}
        `}
      >
        Skip Turn
      </button>
      <button
        onClick={onForfeit}
        disabled={isAnimating}
        className={`
          px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide
          transition-all duration-150
          ${!isAnimating
            ? 'bg-red-900/40 text-red-300 hover:bg-red-800/50 border border-red-700/30'
            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'}
        `}
      >
        Forfeit
      </button>
    </div>
  );
};
