import React, { useEffect, useRef, useState } from 'react';
import { COMBAT_TIMINGS } from './combatTimings';

interface BattleHPBarProps {
  current: number;
  max: number;
  label: string;
  variant?: 'hp' | 'energy';
}

export const BattleHPBar: React.FC<BattleHPBarProps> = ({ current, max, label, variant = 'hp' }) => {
  const targetPct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  // Smoothly animate display value and show a trailing "damage ghost" bar
  const [displayPct, setDisplayPct] = useState(targetPct);
  const [ghostPct, setGhostPct] = useState(targetPct);
  const [displayValue, setDisplayValue] = useState(current);
  const rafRef = useRef(0);
  const ghostTimerRef = useRef(0);

  useEffect(() => {
    const duration = variant === 'energy' ? COMBAT_TIMINGS.energyDrain : COMBAT_TIMINGS.hpDrain;
    const startPct = displayPct;
    const startVal = displayValue;
    const deltaPct = targetPct - startPct;
    const deltaVal = current - startVal;
    const startTime = performance.now();

    // Ghost bar trails behind the actual bar on damage
    if (targetPct < ghostPct) {
      clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = window.setTimeout(() => {
        setGhostPct(targetPct);
      }, duration + 200);
    } else {
      setGhostPct(targetPct);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayPct(startPct + deltaPct * ease);
      setDisplayValue(Math.round(startVal + deltaVal * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, max, targetPct]);

  const color = variant === 'energy'
    ? (displayPct > 50 ? 'bg-cyan-500' : displayPct > 25 ? 'bg-cyan-600' : 'bg-cyan-800')
    : (displayPct > 50 ? 'bg-green-500' : displayPct > 25 ? 'bg-yellow-500' : 'bg-red-500');

  const isLow = variant === 'hp' && displayPct <= 25;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-bold text-slate-300 mb-0.5">
        <span>{label}</span>
        <span className={isLow ? 'text-red-400 anim-hp-critical' : ''}>
          {displayValue}/{max}
        </span>
      </div>
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden relative">
        {/* Ghost / trailing damage bar */}
        {ghostPct > displayPct && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-red-400/40 transition-all"
            style={{ width: `${ghostPct}%`, transitionDuration: '400ms' }}
          />
        )}
        {/* Actual HP fill */}
        <div
          className={`h-full rounded-full relative ${color}`}
          style={{ width: `${displayPct}%` }}
        >
          {/* Shine highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" style={{ height: '50%' }} />
        </div>
      </div>
    </div>
  );
};
