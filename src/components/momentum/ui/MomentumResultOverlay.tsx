import type React from 'react';
import type { ActiveMomentumState } from '../../../types/momentum';

interface MomentumResultOverlayProps {
  state: ActiveMomentumState;
  onExit: () => void;
}

export const MomentumResultOverlay: React.FC<MomentumResultOverlayProps> = ({ state, onExit }) => {
  const isVictory = state.phase === 'victory';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="momentum-victory-enter bg-slate-900/95 rounded-2xl p-8 border border-slate-700/50 text-center max-w-sm">
        {/* Title */}
        <h1
          className={`text-3xl font-black mb-2 ${isVictory ? 'text-amber-400' : 'text-slate-400'}`}
          style={{ textShadow: isVictory ? '0 0 20px rgba(251,191,36,0.4)' : 'none' }}
        >
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </h1>

        <p className="text-slate-400 text-sm mb-4">
          {isVictory
            ? 'All enemies eliminated!'
            : state.turnCount >= 50
            ? 'Time ran out...'
            : 'Your forces were overwhelmed...'}
        </p>

        {/* Rewards (victory only) */}
        {isVictory && state.rewards && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/30">
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Rewards</div>
            <div className="flex justify-center gap-6 flex-wrap">
              <div>
                <span className="text-amber-400 font-bold text-lg">{state.rewards.tokens}</span>
                <span className="text-slate-400 text-xs block">tokens</span>
              </div>
              <div>
                <span className="text-purple-400 font-bold text-lg">{state.rewards.xp}</span>
                <span className="text-slate-400 text-xs block">XP</span>
              </div>
              {state.rewards.shards !== undefined && state.rewards.shards > 0 && (
                <div>
                  <span className="text-cyan-300 font-bold text-lg">{state.rewards.shards}</span>
                  <span className="text-slate-400 text-xs block">shards 💎</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Turn summary */}
        <p className="text-slate-500 text-xs mb-4">
          Completed in {state.turnCount} turns
        </p>

        {/* Return button */}
        <button
          onClick={onExit}
          className={`
            px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide
            transition-all duration-150
            ${isVictory
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700/70'}
          `}
        >
          Return Home
        </button>
      </div>
    </div>
  );
};
