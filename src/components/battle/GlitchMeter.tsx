import React from 'react';
import type { CombatFeelState } from '../../types/battle';
import { GLITCH_METER, getGlitchState, getRealityLevel } from '../../config/combatFeelConfig';

interface GlitchMeterProps {
  combatFeel: CombatFeelState | undefined;
}

const GLITCH_COLORS = {
  low: { bar: 'bg-cyan-400', glow: 'shadow-cyan-400/30', text: 'text-cyan-300', label: 'STABLE' },
  medium: { bar: 'bg-amber-400', glow: 'shadow-amber-400/40', text: 'text-amber-300', label: 'SHAKY' },
  high: { bar: 'bg-red-500', glow: 'shadow-red-500/50', text: 'text-red-400', label: 'BROKEN' },
} as const;

export const GlitchMeter: React.FC<GlitchMeterProps> = ({ combatFeel }) => {
  if (!combatFeel) return null;
  const { glitchMeter } = combatFeel;
  if (glitchMeter <= 0) return null;

  const glitchState = getGlitchState(glitchMeter);
  const realityLevel = getRealityLevel(glitchMeter);
  const pct = Math.min(100, (glitchMeter / GLITCH_METER.max) * 100);
  const colors = GLITCH_COLORS[glitchState];

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-black uppercase tracking-wider ${colors.text}`}>
            {colors.label}
          </span>
          <span className="text-[8px] text-slate-500 uppercase">
            Reality
          </span>
        </div>
        <div className="w-20 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colors.bar} ${glitchState === 'high' ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%`, boxShadow: glitchState !== 'low' ? `0 0 8px currentColor` : undefined }}
          />
        </div>
      </div>
    </div>
  );
};
