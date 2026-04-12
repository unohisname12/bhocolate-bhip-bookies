import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface Target {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
}

const TARGET_SIZE = 44;
const TARGET_LIFETIME_MS = 1500;
const SPAWN_DELAY_MS = 600;

export const TrainQuickTap: React.FC<CareGameProps> = ({
  mode, onComplete, onCancel, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [target, setTarget] = useState<Target | null>(null);
  const [hits, setHits] = useState(0);
  const [totalSpawned, setTotalSpawned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnTarget = useCallback(() => {
    if (doneRef.current) return;
    setTotalSpawned(prev => {
      if (prev >= config.targetCount) return prev;
      setTarget({
        id: nextIdRef.current++,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        spawnTime: Date.now(),
      });
      return prev + 1;
    });
  }, [config.targetCount]);

  useEffect(() => { spawnTarget(); }, [spawnTarget]);

  useEffect(() => {
    if (!target) return;
    const timer = setTimeout(() => {
      setTarget(null);
      setFlash('miss');
      setTimeout(() => setFlash(null), 300);
      spawnTimerRef.current = setTimeout(spawnTarget, SPAWN_DELAY_MS);
    }, TARGET_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [target, spawnTarget]);

  useEffect(() => {
    const iv = setInterval(() => {
      const remaining = Math.max(0, config.durationMs - (Date.now() - startRef.current)) / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        setHits(h => { onComplete(Math.min(1, h / config.targetCount)); return h; });
      }
    }, 100);
    return () => clearInterval(iv);
  }, [config.durationMs, config.targetCount, onComplete]);

  useEffect(() => {
    return () => { if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current); };
  }, []);

  const handleTap = useCallback(() => {
    if (!target) return;
    setHits(h => {
      const next = h + 1;
      if (next >= config.targetCount && !doneRef.current) {
        doneRef.current = true;
        onComplete(1.0);
      }
      return next;
    });
    setTarget(null);
    setFlash('hit');
    setTimeout(() => setFlash(null), 300);
    spawnTimerRef.current = setTimeout(spawnTarget, SPAWN_DELAY_MS);
  }, [target, config.targetCount, onComplete, spawnTarget]);

  const progress = hits / config.targetCount;

  return (
    <>
      <CareGameHUD
        progress={progress}
        timeLeft={timeLeft}
        score={hits}
        total={config.targetCount}
        label="Train - Quick Tap"
      />
      <div
        className="fixed pointer-events-auto"
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
        {target && (
          <button
            onClick={handleTap}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: TARGET_SIZE,
              height: TARGET_SIZE,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,200,50,0.8) 0%, rgba(255,140,0,0.4) 70%, transparent 100%)',
              border: '2px solid rgba(255,220,100,0.7)',
              boxShadow: '0 0 14px rgba(255,180,50,0.5)',
              animation: `care-target-shrink ${TARGET_LIFETIME_MS}ms linear forwards`,
              cursor: 'pointer',
            }}
          >
            <span className="text-lg">⚡</span>
          </button>
        )}
        {flash && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: flash === 'hit'
                ? 'rgba(100,255,150,0.15)'
                : 'rgba(255,100,100,0.1)',
              animation: 'care-hit-pop 0.3s ease-out forwards',
            }}
          />
        )}
      </div>
    </>
  );
};
