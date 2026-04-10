import React, { useState } from 'react';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface LeaveDungeonButtonProps {
  dispatch: (action: GameEngineAction) => void;
  /** Override positioning. Defaults to top-left fixed corner. */
  className?: string;
}

/**
 * Shared retreat-from-dungeon button.
 *
 * Why: beta testers reported that once inside the dungeon (rest / event /
 * reward nodes) there was no visible way back out — every run screen had its
 * own flow and only `RunOverScreen` surfaced a "Return Home" button. This
 * component puts a consistent, clearly-visible retreat affordance on every
 * run screen with a confirmation to avoid mis-clicks.
 */
export const LeaveDungeonButton: React.FC<LeaveDungeonButtonProps> = ({
  dispatch,
  className,
}) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4">
        <div
          className="w-full max-w-xs rounded-xl p-5 text-white text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(30,20,40,0.98) 0%, rgba(20,12,30,0.98) 100%)',
            border: '1px solid rgba(220,80,80,0.3)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-sm font-black uppercase tracking-wider text-red-400 mb-2">
            Abandon Run?
          </div>
          <p className="text-[11px] text-slate-400 mb-4 leading-snug">
            You'll lose unclaimed rewards but keep anything already earned.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-300"
              style={{
                background: 'rgba(40,30,60,0.9)',
                border: '1px solid rgba(100,70,150,0.3)',
              }}
            >
              Stay
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                dispatch({ type: 'END_RUN' });
              }}
              className="flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-red-200"
              style={{
                background: 'linear-gradient(180deg, rgba(120,20,20,0.9) 0%, rgba(80,10,10,0.95) 100%)',
                border: '1px solid rgba(220,50,50,0.5)',
              }}
            >
              Retreat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={
        className ??
        'fixed top-3 left-3 z-30 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-slate-300 hover:text-red-300 transition-colors'
      }
      style={{
        background: 'rgba(30,20,40,0.85)',
        border: '1px solid rgba(140,80,160,0.35)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      Leave Dungeon
    </button>
  );
};
