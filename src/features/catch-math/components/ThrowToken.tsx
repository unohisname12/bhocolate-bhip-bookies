import React, { useEffect, useRef, useState } from 'react';
import type { CatchChoice } from '../types';

export type ThrowFlight = {
  choice: CatchChoice;
  /** Screen-space start (choice button center). */
  from: { x: number; y: number };
  /** Screen-space end (pet catch-point). */
  to: { x: number; y: number };
  /** Ms the flight should take. */
  durationMs: number;
  /** Identity — bumps every throw so the animation re-runs. */
  seq: number;
};

interface Props {
  flight: ThrowFlight | null;
  onArrive: () => void;
}

/** A small pixel-orb that translates from (from) → (to) via a CSS transition.
 *  Mounted in a fixed container at the top-left of the viewport and
 *  animated via style transform. */
export const ThrowToken: React.FC<Props> = ({ flight, onArrive }) => {
  const [phase, setPhase] = useState<'idle' | 'flying' | 'gone'>('idle');
  const arrivedRef = useRef(false);

  useEffect(() => {
    if (!flight) {
      setPhase('idle');
      arrivedRef.current = false;
      return;
    }
    arrivedRef.current = false;
    setPhase('idle');
    // Kick off the transition on the next frame so the style change applies.
    const raf = requestAnimationFrame(() => setPhase('flying'));
    const timer = window.setTimeout(() => {
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      setPhase('gone');
      onArrive();
    }, flight.durationMs + 30);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [flight, onArrive]);

  if (!flight) return null;

  const { from, to, durationMs, choice } = flight;
  const x = phase === 'flying' ? to.x : from.x;
  const y = phase === 'flying' ? to.y : from.y;

  return (
    <div
      aria-hidden
      data-testid="catch-throw-token"
      className="fixed pointer-events-none z-[80]"
      style={{
        left: 0,
        top: 0,
        width: 56,
        height: 56,
        transform: `translate(${x - 28}px, ${y - 28}px) scale(${phase === 'flying' ? 1.1 : 1})`,
        transition:
          phase === 'flying'
            ? `transform ${durationMs}ms cubic-bezier(0.22, 0.9, 0.4, 1)`
            : 'none',
        opacity: phase === 'gone' ? 0 : 1,
      }}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-black text-[18px]"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #fde68a, #fbbf24 55%, #f97316 90%)',
          color: '#0a0604',
          border: '2px solid rgba(0,0,0,0.6)',
          boxShadow: '0 0 18px rgba(251,191,36,0.7), inset 0 2px 0 rgba(255,255,255,0.35)',
          textShadow: '0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {choice.kind === 'number' ? choice.value : `${choice.op}${choice.amount}`}
      </div>
    </div>
  );
};
