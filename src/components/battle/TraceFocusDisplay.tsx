import React from 'react';
import type { CombatFeelState } from '../../types/battle';
import { TRACE_FOCUS } from '../../config/combatFeelConfig';

interface TraceFocusDisplayProps {
  combatFeel: CombatFeelState | undefined;
}

export const TraceFocusDisplay: React.FC<TraceFocusDisplayProps> = ({ combatFeel }) => {
  if (!combatFeel) return null;

  const { focusCharges } = combatFeel;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Focus</span>
      <div className="flex gap-0.5">
        {Array.from({ length: TRACE_FOCUS.maxCharges }, (_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-sm transition-all duration-200 ${
              i < focusCharges
                ? 'bg-violet-400 shadow-[0_0_4px_rgba(167,139,250,0.5)]'
                : 'bg-slate-700/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
