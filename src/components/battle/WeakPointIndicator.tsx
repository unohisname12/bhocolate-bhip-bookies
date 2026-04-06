import React from 'react';
import type { CombatFeelState } from '../../types/battle';

interface WeakPointIndicatorProps {
  combatFeel: CombatFeelState | undefined;
}

export const WeakPointIndicator: React.FC<WeakPointIndicatorProps> = ({ combatFeel }) => {
  if (!combatFeel?.weakPointActive) return null;

  return (
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full animate-pulse"
        style={{
          background: 'rgba(250, 204, 21, 0.9)',
          boxShadow: '0 0 12px rgba(250,204,21,0.6), 0 0 24px rgba(250,204,21,0.3)',
        }}
      >
        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
          WEAK POINT
        </span>
      </div>
    </div>
  );
};
