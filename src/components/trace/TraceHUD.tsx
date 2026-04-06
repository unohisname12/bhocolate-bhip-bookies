import React from 'react';

interface TraceHUDProps {
  promptText: string;
  completionPct: number;
  timeRemainingPct: number; // 0–100
}

export const TraceHUD: React.FC<TraceHUDProps> = ({ promptText, completionPct, timeRemainingPct }) => {
  const isUrgent = timeRemainingPct < 25;

  return (
    <div className="absolute inset-x-0 top-0 z-50 pointer-events-none px-3 pt-2 flex flex-col gap-1">
      {/* Prompt */}
      <div className="text-center text-sm font-black text-white uppercase tracking-wider drop-shadow-lg">
        {promptText}
      </div>

      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isUrgent ? 'bg-red-500 anim-trace-urgent' : 'bg-indigo-400'
          }`}
          style={{ width: `${Math.max(0, timeRemainingPct)}%` }}
        />
      </div>

      {/* Completion indicator */}
      <div className="text-center text-xs font-bold text-slate-300 drop-shadow">
        {Math.round(completionPct)}% traced
      </div>
    </div>
  );
};
