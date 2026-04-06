import React, { useEffect, useState, useRef } from 'react';

export type CombatPhase =
  | 'PLAYER_INPUT'
  | 'PLAYER_ANIMATING'
  | 'ENEMY_TURN'
  | 'RESOLVING';

interface CombatPhaseIndicatorProps {
  phase: CombatPhase;
}

const PHASE_CONFIG: Record<CombatPhase, { label: string; color: string; bg: string; glow: string }> = {
  PLAYER_INPUT:     { label: 'YOUR TURN',     color: 'text-cyan-300',   bg: 'bg-cyan-500/15',    glow: 'shadow-cyan-500/30' },
  PLAYER_ANIMATING: { label: 'ACTION',        color: 'text-amber-300',  bg: 'bg-amber-500/15',   glow: 'shadow-amber-500/30' },
  ENEMY_TURN:       { label: 'ENEMY TURN',    color: 'text-red-400',    bg: 'bg-red-500/15',     glow: 'shadow-red-500/30' },
  RESOLVING:        { label: 'RESOLVING',     color: 'text-slate-400',  bg: 'bg-slate-500/15',   glow: 'shadow-slate-500/20' },
};

export const CombatPhaseIndicator: React.FC<CombatPhaseIndicatorProps> = ({ phase }) => {
  const [displayPhase, setDisplayPhase] = useState(phase);
  const [transitioning, setTransitioning] = useState(false);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      setTransitioning(true);
      const t = setTimeout(() => {
        setDisplayPhase(phase);
        setTransitioning(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const config = PHASE_CONFIG[displayPhase];

  return (
    <div className="flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
      <div
        className={`
          px-5 py-1.5 rounded-full border border-white/10
          ${config.bg} shadow-lg ${config.glow}
          transition-all duration-300
          ${transitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}
        `}
      >
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${config.color}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
};
