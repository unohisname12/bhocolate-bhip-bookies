import React from 'react';
import type { CombatFeelState } from '../../types/battle';
import { COMBO_FEEL } from '../../config/combatFeelConfig';

interface CombatFeelComboMeterProps {
  combatFeel: CombatFeelState | undefined;
}

export const CombatFeelComboMeter: React.FC<CombatFeelComboMeterProps> = ({ combatFeel }) => {
  if (!combatFeel || combatFeel.combo <= 0) return null;

  const { combo } = combatFeel;
  const isSurge = combo >= COMBO_FEEL.surgeThreshold;
  const isBigHit = combo >= COMBO_FEEL.bigHitThreshold;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 ${
      isBigHit
        ? 'bg-red-900/60 border border-red-400/50 animate-pulse'
        : isSurge
        ? 'bg-orange-900/50 border border-orange-400/40'
        : 'bg-amber-950/40 border border-amber-500/20'
    }`}>
      {/* Combo pips */}
      <div className="flex gap-0.5">
        {Array.from({ length: COMBO_FEEL.max }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-150 ${
              i < combo
                ? i >= COMBO_FEEL.bigHitThreshold - 1
                  ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]'
                  : i >= COMBO_FEEL.surgeThreshold - 1
                  ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.6)]'
                  : 'bg-amber-400'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-[10px] font-black leading-none ${
          isBigHit ? 'text-red-300' : isSurge ? 'text-orange-300' : 'text-amber-300'
        }`}>
          {isBigHit ? 'BIG HIT!' : isSurge ? 'SURGE!' : `x${combo}`}
        </span>
      </div>
    </div>
  );
};
