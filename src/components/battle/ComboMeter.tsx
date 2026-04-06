import React from 'react';
import type { ComboState } from '../../types/battle';

interface ComboMeterProps {
  combo: ComboState;
}

export const ComboMeter: React.FC<ComboMeterProps> = ({ combo }) => {
  if (combo.count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-500/30 anim-combo-glow">
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-amber-400/80 uppercase tracking-wider font-bold leading-none">Combo</span>
        <span className="text-lg font-black text-amber-300 leading-none anim-combo-pop">
          {combo.count}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black text-amber-200">
          x{combo.multiplier.toFixed(2)}
        </span>
        <span className="text-[8px] text-amber-400/60 uppercase">damage</span>
      </div>
    </div>
  );
};
