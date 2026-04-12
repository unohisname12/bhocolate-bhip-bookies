import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface SweetSpot {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  hit: boolean;
  spawnTime: number;
}

const SPOT_LIFETIME_MS = 2000;
const SPOT_SIZE = 48;
const SPAWN_INTERVAL_MS = 1000;

export const PetSweetSpots: React.FC<CareGameProps> = ({
  mode, onComplete, onCancel, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [spots, setSpots] = useState<SweetSpot[]>([]);
  const [hits, setHits] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const nextIdRef = useRef(0);
  const doneRef = useRef(false);

  // Spawn spots on interval
  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      setSpawned(prev => {
        if (prev >= config.targetCount) return prev;
        const spot: SweetSpot = {
          id: nextIdRef.current++,
          x: 15 + Math.random() * 70,
          y: 10 + Math.random() * 70,
          alive: true,
          hit: false,
          spawnTime: Date.now(),
        };
        setSpots(s => [...s, spot]);
        return prev + 1;
      });
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [config.targetCount]);

  // Expire old spots
  useEffect(() => {
    const iv = setInterval(() => {
      setSpots(s => s.map(spot =>
        spot.alive && !spot.hit && Date.now() - spot.spawnTime > SPOT_LIFETIME_MS
          ? { ...spot, alive: false }
          : spot
      ));
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // Timer countdown
  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, config.durationMs - elapsed) / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        setHits(h => {
          const quality = Math.min(1, h / config.targetCount);
          onComplete(quality);
          return h;
        });
      }
    }, 100);
    return () => clearInterval(iv);
  }, [config.durationMs, config.targetCount, onComplete]);

  const handleTap = useCallback((id: number) => {
    setSpots(s => s.map(spot =>
      spot.id === id && spot.alive && !spot.hit
        ? { ...spot, hit: true, alive: false }
        : spot
    ));
    setHits(h => h + 1);
  }, []);

  const progress = hits / config.targetCount;

  return (
    <>
      <CareGameHUD
        progress={progress}
        timeLeft={timeLeft}
        score={hits}
        total={config.targetCount}
        label="Pet - Find Sweet Spots"
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
        }}
      >
        {spots.map(spot => spot.alive && !spot.hit && (
          <button
            key={spot.id}
            onClick={() => handleTap(spot.id)}
            className="absolute rounded-full"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: SPOT_SIZE,
              height: SPOT_SIZE,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,150,200,0.8) 0%, rgba(255,100,180,0.3) 70%, transparent 100%)',
              border: '2px solid rgba(255,180,220,0.6)',
              boxShadow: '0 0 16px rgba(255,100,180,0.5)',
              animation: 'care-spot-pulse 0.8s ease-in-out infinite',
              cursor: 'pointer',
            }}
          >
            <span className="text-lg">💗</span>
          </button>
        ))}
        {spots.map(spot => spot.hit && (
          <div
            key={`hit-${spot.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'care-hit-pop 0.4s ease-out forwards',
              fontSize: 24,
            }}
          >
            ❤️
          </div>
        ))}
      </div>
    </>
  );
};
