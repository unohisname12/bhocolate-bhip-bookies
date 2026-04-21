import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface Bouncer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const BOUNCER_SIZE = 40;
const BASE_SPEED = 1.2;
const SPEED_INCREMENT = 0.15;

function spawnBouncer(id: number, speedMult: number): Bouncer {
  const angle = Math.random() * Math.PI * 2;
  const speed = BASE_SPEED + speedMult * SPEED_INCREMENT;
  return {
    id,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

export const PlayCatch: React.FC<CareGameProps> = ({
  mode, onComplete, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [bouncer, setBouncer] = useState<Bouncer>(() => spawnBouncer(0, 0));
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const nextIdRef = useRef(1);
  const hitsRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      setBouncer(b => {
        let { x, y, vx, vy } = b;
        x += vx;
        y += vy;
        if (x < 5 || x > 95) vx = -vx;
        if (y < 5 || y > 95) vy = -vy;
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));
        return { ...b, x, y, vx, vy };
      });
    }, 30);
    return () => clearInterval(iv);
  }, []);

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

  const handleBoop = useCallback(() => {
    setHits(h => {
      const next = h + 1;
      hitsRef.current = next;
      if (next >= config.targetCount && !doneRef.current) {
        doneRef.current = true;
        onComplete(1.0);
      }
      return next;
    });
    setBouncer(spawnBouncer(nextIdRef.current++, hitsRef.current));
  }, [config.targetCount, onComplete]);

  const progress = hits / config.targetCount;
  const EMOJIS = ['⭐', '🌟', '💫', '🎾', '🏐'];

  return (
    <>
      <CareGameHUD
        progress={progress}
        timeLeft={timeLeft}
        score={hits}
        total={config.targetCount}
        label="Play - Boop!"
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
        <button
          onClick={handleBoop}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            left: `${bouncer.x}%`,
            top: `${bouncer.y}%`,
            width: BOUNCER_SIZE,
            height: BOUNCER_SIZE,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,220,100,0.8) 0%, rgba(255,150,50,0.4) 70%, transparent 100%)',
            border: '2px solid rgba(255,230,130,0.7)',
            boxShadow: '0 0 12px rgba(255,200,80,0.5)',
            cursor: 'pointer',
            transition: 'left 0.03s linear, top 0.03s linear',
          }}
        >
          <span className="text-lg">{EMOJIS[hits % EMOJIS.length]}</span>
        </button>
      </div>
    </>
  );
};
