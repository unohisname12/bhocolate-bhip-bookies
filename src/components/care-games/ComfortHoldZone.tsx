import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

const ZONE_RADIUS = 50;
const CALM_RATE = 0.015;
const DRAIN_RATE = 0.04;
const MOVE_THRESHOLD = 4;

export const ComfortHoldZone: React.FC<CareGameProps> = ({
  mode, onComplete, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [calmLevel, setCalmLevel] = useState(0);
  const [isInZone, setIsInZone] = useState(false);
  const [isStill, setIsStill] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const remaining = Math.max(0, config.durationMs - (Date.now() - startRef.current)) / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        setCalmLevel(c => { onComplete(c); return c; });
      }
    }, 100);
    return () => clearInterval(iv);
  }, [config.durationMs, onComplete]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      setCalmLevel(prev => {
        if (isInZone && isStill) {
          const next = Math.min(1, prev + CALM_RATE);
          if (next >= 1 && !doneRef.current) {
            doneRef.current = true;
            onComplete(1.0);
          }
          return next;
        }
        return prev;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [isInZone, isStill, onComplete]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
    const inside = dist < ZONE_RADIUS * scale;
    setIsInZone(inside);
    if (lastPosRef.current) {
      const moveDist = Math.sqrt(
        (e.clientX - lastPosRef.current.x) ** 2 +
        (e.clientY - lastPosRef.current.y) ** 2
      );
      if (moveDist > MOVE_THRESHOLD) {
        setIsStill(false);
        if (inside) {
          setCalmLevel(prev => Math.max(0, prev - DRAIN_RATE));
        }
      } else {
        setIsStill(true);
      }
    }
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [scale]);

  const handlePointerDown = useCallback(() => {
    setIsStill(true);
  }, []);

  return (
    <>
      <CareGameHUD
        progress={calmLevel}
        timeLeft={timeLeft}
        score={calmLevel >= 1 ? 1 : 0}
        total={1}
        label="Comfort - Hold Still"
      />
      <div
        className="fixed pointer-events-auto"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        style={{
          zIndex: 52,
          left: '50%',
          bottom: `${80 * scale}px`,
          transform: 'translateX(-50%)',
          width: 200 * scale,
          height: 200 * scale,
          touchAction: 'none',
        }}
      >
        <div
          ref={zoneRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
          style={{
            width: ZONE_RADIUS * 2,
            height: ZONE_RADIUS * 2,
            background: isInZone && isStill
              ? `radial-gradient(circle, rgba(100,200,255,${0.15 + calmLevel * 0.25}) 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(100,100,150,0.1) 0%, transparent 70%)',
            border: `2px solid ${isInZone ? 'rgba(100,200,255,0.5)' : 'rgba(100,100,150,0.3)'}`,
            boxShadow: isInZone && isStill ? `0 0 ${20 + calmLevel * 20}px rgba(100,200,255,${0.2 + calmLevel * 0.3})` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div
            className="absolute inset-2 rounded-full"
            style={{
              border: `2px solid rgba(100,200,255,${0.1 + calmLevel * 0.4})`,
              animation: isInZone && isStill ? 'glow-pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span className="text-2xl pointer-events-none" style={{ opacity: 0.6 + calmLevel * 0.4 }}>
            {calmLevel >= 1 ? '💛' : isInZone ? '🤲' : '🫧'}
          </span>
        </div>
      </div>
    </>
  );
};
