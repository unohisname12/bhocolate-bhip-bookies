import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NumberMergeGamePhase, NumberMergeOverseerEvent } from './types';

interface NumberMergeOverseerEntityProps {
  phase: NumberMergeGamePhase;
  chainTimeLeftMs: number;
  lastOverseerEvent: NumberMergeOverseerEvent | null;
  corruption: number;
  attackAnimationLevel: 'ambient' | 'warning' | 'reactive' | 'aggressive';
}

type OverseerVisualState = 'idle' | 'warning' | 'attack' | 'recover' | 'lost';

const OVERSEER_ATTACK_SHEET = '/assets/generated/final/number-merge/overseer-attack-sheet.png';
const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 256;
const FRAME_COUNT = 17;

// Sheet metadata from direct inspection of `OVERE-sheet.png`:
// 4352x256 -> 17 columns, 1 row, 256x256 per frame.
const WARNING_FRAMES = [0, 1, 2, 3, 4, 3, 2, 1];
const ATTACK_FRAMES = Array.from({ length: FRAME_COUNT }, (_, index) => index);
const RECOVER_FRAMES = [15, 16, 15, 14];
const LOST_FRAME = 13;

export const NumberMergeOverseerEntity: React.FC<NumberMergeOverseerEntityProps> = ({
  phase,
  chainTimeLeftMs,
  lastOverseerEvent,
  corruption,
  attackAnimationLevel,
}) => {
  const [visualState, setVisualState] = useState<OverseerVisualState>('idle');
  const [frameIndex, setFrameIndex] = useState(0);
  const [hoverTick, setHoverTick] = useState(0);
  const previousEventRef = useRef<NumberMergeOverseerEvent | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHoverTick((tick) => tick + 1);
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (phase === 'lost') {
      setVisualState('lost');
      setFrameIndex(LOST_FRAME);
      previousEventRef.current = lastOverseerEvent;
      return;
    }

    if (lastOverseerEvent && lastOverseerEvent !== previousEventRef.current) {
      previousEventRef.current = lastOverseerEvent;
      setVisualState(
        attackAnimationLevel === 'ambient'
          ? 'idle'
          : attackAnimationLevel === 'warning'
          ? 'warning'
          : 'attack',
      );
      setFrameIndex(0);
      return;
    }

    if (visualState === 'attack' || visualState === 'recover') {
      return;
    }

    if (phase === 'chain_window') {
      setVisualState('warning');
      return;
    }

    setVisualState('idle');
    setFrameIndex(0);
  }, [phase, lastOverseerEvent, visualState, attackAnimationLevel]);

  useEffect(() => {
    if (visualState === 'idle' || visualState === 'lost') {
      setFrameIndex(visualState === 'lost' ? LOST_FRAME : 0);
      return;
    }

    const frames = visualState === 'warning'
      ? WARNING_FRAMES
      : visualState === 'attack'
      ? ATTACK_FRAMES
      : RECOVER_FRAMES;
    const intervalMs = visualState === 'attack' ? 55 : visualState === 'warning' ? 85 : 90;

    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next >= frames.length) {
          if (visualState === 'warning') {
            return 0;
          }

          if (visualState === 'attack') {
            window.setTimeout(() => setVisualState('recover'), 0);
            return frames.length - 1;
          }

          window.setTimeout(() => setVisualState(phase === 'chain_window' ? 'warning' : 'idle'), 0);
          return 0;
        }

        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [visualState, phase]);

  const renderedFrame = useMemo(() => {
    if (visualState === 'idle') {
      return 0;
    }

    if (visualState === 'warning') {
      return WARNING_FRAMES[frameIndex] ?? 0;
    }

    if (visualState === 'attack') {
      return ATTACK_FRAMES[frameIndex] ?? FRAME_COUNT - 1;
    }

    if (visualState === 'recover') {
      return RECOVER_FRAMES[frameIndex] ?? RECOVER_FRAMES[RECOVER_FRAMES.length - 1];
    }

    return LOST_FRAME;
  }, [visualState, frameIndex]);

  const hoverOffset = visualState === 'idle' || visualState === 'warning'
    ? Math.sin(hoverTick / 3) * 4
    : 0;
  const scale = visualState === 'attack'
    ? attackAnimationLevel === 'aggressive' ? 1.12 : 1.08
    : visualState === 'warning'
    ? attackAnimationLevel === 'ambient' ? 1.01 : 1.03
    : 1;
  const opacity = phase === 'lost' ? 0.92 : 1;
  const warningGlow = visualState === 'warning'
    ? Math.max(0.2, Math.min(0.8, 1 - chainTimeLeftMs / 3000))
    : 0;
  const auraColor = visualState === 'attack'
    ? 'rgba(56,189,248,0.42)'
    : visualState === 'warning'
    ? `rgba(248,113,113,${warningGlow})`
    : corruption >= 70
    ? 'rgba(248,113,113,0.28)'
    : 'rgba(56,189,248,0.22)';

  return (
    <div className="pointer-events-none absolute inset-x-0 -top-28 z-20 flex justify-center sm:-top-32">
      <div className="relative flex flex-col items-center">
        <div
          className="absolute left-1/2 top-[68%] h-12 w-44 -translate-x-1/2 rounded-full blur-2xl"
          style={{
            background: auraColor,
            transform: `translateX(-50%) scale(${scale})`,
            transition: 'background 120ms ease, transform 120ms ease',
          }}
        />
        <div
          className="relative rounded-[32px] border border-cyan-300/10 bg-slate-950/25 backdrop-blur-sm"
          style={{
            width: 168,
            height: 168,
            boxShadow: `0 18px 48px rgba(2,6,23,0.5), 0 0 22px ${auraColor}`,
            transform: `translateY(${hoverOffset}px) scale(${scale})`,
            opacity,
            transition: 'transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
          }}
        >
          <div
            aria-label="Animated Overseer entity"
            role="img"
            style={{
              width: 168,
              height: 168,
              backgroundImage: `url(${OVERSEER_ATTACK_SHEET})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${FRAME_WIDTH * FRAME_COUNT}px ${FRAME_HEIGHT}px`,
              backgroundPositionX: `${-renderedFrame * FRAME_WIDTH}px`,
              backgroundPositionY: '0px',
              imageRendering: 'pixelated',
            }}
          />
        </div>
        <div className="mt-1 rounded-full border border-cyan-200/10 bg-slate-950/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
          {visualState === 'attack'
            ? 'Projecting'
            : visualState === 'warning'
            ? 'Watching'
            : visualState === 'lost'
            ? 'Dominating'
            : 'Overseeing'}
        </div>
      </div>
    </div>
  );
};
