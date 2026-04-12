import React from 'react';

interface CareGameHUDProps {
  /** 0..1 progress through the game round. */
  progress: number;
  /** Remaining time in seconds. */
  timeLeft: number;
  /** Current score (targets hit / total). */
  score: number;
  /** Total targets in this round. */
  total: number;
  /** Label for the game mode. */
  label: string;
}

export const CareGameHUD: React.FC<CareGameHUDProps> = ({
  progress, timeLeft, score, total, label,
}) => (
  <div
    className="fixed top-16 left-1/2 -translate-x-1/2 pointer-events-none"
    style={{ zIndex: 55, width: 260 }}
  >
    {/* Mode label */}
    <div className="text-center mb-1">
      <span
        className="text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
        style={{
          background: 'rgba(100,60,200,0.8)',
          color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(180,150,255,0.4)',
        }}
      >
        {label}
      </span>
    </div>

    {/* Progress bar */}
    <div
      className="relative h-3 rounded-full overflow-hidden"
      style={{
        background: 'rgba(10,8,25,0.8)',
        border: '1px solid rgba(100,80,200,0.3)',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
        style={{
          width: `${Math.min(100, progress * 100)}%`,
          background: progress > 0.8
            ? 'linear-gradient(90deg, #a78bfa, #c084fc)'
            : progress > 0.5
            ? 'linear-gradient(90deg, #60a5fa, #818cf8)'
            : 'linear-gradient(90deg, #475569, #64748b)',
        }}
      />
    </div>

    {/* Stats row */}
    <div className="flex justify-between mt-1 px-1">
      <span className="text-[9px] font-bold text-slate-400">
        {score}/{total}
      </span>
      <span className="text-[9px] font-bold text-amber-400">
        {Math.ceil(timeLeft)}s
      </span>
    </div>
  </div>
);
