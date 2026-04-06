import type React from 'react';
import type { MomentumLogEntry } from '../../../types/momentum';

interface MomentumLogProps {
  log: MomentumLogEntry[];
}

export const MomentumLog: React.FC<MomentumLogProps> = ({ log }) => {
  const recentEntries = log.slice(-5);

  if (recentEntries.length === 0) return null;

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30 max-w-[280px]">
      <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Log</div>
      <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
        {recentEntries.map((entry, i) => (
          <div
            key={`${entry.turn}-${i}`}
            className="text-[11px] text-slate-300"
          >
            <span className={`font-bold ${entry.actor === 'player' ? 'text-cyan-400' : 'text-red-400'}`}>
              T{entry.turn}
            </span>{' '}
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
};
