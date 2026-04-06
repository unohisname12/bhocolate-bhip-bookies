import React from 'react';
import type { CombatFeelState } from '../../types/battle';

interface CollapseOverlayProps {
  combatFeel: CombatFeelState | undefined;
}

/**
 * Full-screen dramatic overlay shown when Collapse (Last Stand) triggers.
 * The actual trace interaction is handled by TraceEventController — this
 * component is purely visual atmosphere.
 */
export const CollapseOverlay: React.FC<CollapseOverlayProps> = ({ combatFeel }) => {
  if (!combatFeel?.collapseTriggered) return null;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(127,29,29,0.4) 0%, rgba(0,0,0,0.7) 100%)',
      }}
    >
      <div className="text-center animate-pulse">
        <div
          className="text-4xl font-black text-red-400 uppercase tracking-[0.3em]"
          style={{ textShadow: '0 0 20px rgba(248,113,113,0.6), 0 0 40px rgba(220,38,38,0.3)' }}
        >
          LAST STAND
        </div>
        <div className="text-sm text-red-200/70 mt-2 tracking-wide">
          Trace to survive!
        </div>
      </div>
      {/* Vignette edge pulse */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          border: '3px solid rgba(220,38,38,0.4)',
          borderRadius: 'inherit',
        }}
      />
    </div>
  );
};
