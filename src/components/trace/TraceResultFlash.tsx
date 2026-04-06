import React, { useEffect, useState } from 'react';
import type { TraceTier } from '../../types/trace';

interface TraceResultFlashProps {
  tier: TraceTier;
  onDone: () => void;
}

const TIER_CONFIG: Record<TraceTier, { label: string; color: string }> = {
  miss: { label: 'MISS', color: 'text-slate-400' },
  basic: { label: 'BASIC!', color: 'text-blue-400' },
  good: { label: 'GREAT!', color: 'text-green-400' },
  perfect: { label: 'PERFECT!', color: 'text-yellow-400' },
};

export const TraceResultFlash: React.FC<TraceResultFlashProps> = ({ tier, onDone }) => {
  const [visible, setVisible] = useState(true);
  const cfg = TIER_CONFIG[tier];

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className={`font-black text-4xl ${cfg.color} anim-pop drop-shadow-lg`}
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)' }}
      >
        {cfg.label}
      </div>
    </div>
  );
};
