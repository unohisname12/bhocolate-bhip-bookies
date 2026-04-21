import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface DirtyZone {
  id: number;
  x: number;
  y: number;
  cleanProgress: number;
}

const ZONE_SIZE = 56;
const SCRUB_SPEED = 0.08;

function generateZones(count: number): DirtyZone[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 10 + Math.random() * 70,
    cleanProgress: 0,
  }));
}

export const WashScrubZones: React.FC<CareGameProps> = ({
  mode, onComplete, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [zones, setZones] = useState<DirtyZone[]>(() => generateZones(config.targetCount));
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const pointerDownRef = useRef(false);

  const cleaned = zones.filter(z => z.cleanProgress >= 1).length;
  const progress = cleaned / config.targetCount;

  useEffect(() => {
    const iv = setInterval(() => {
      const remaining = Math.max(0, config.durationMs - (Date.now() - startRef.current)) / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        const quality = cleaned / config.targetCount;
        onComplete(quality);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [config.durationMs, config.targetCount, cleaned, onComplete]);

  useEffect(() => {
    if (cleaned >= config.targetCount && !doneRef.current) {
      doneRef.current = true;
      onComplete(1.0);
    }
  }, [cleaned, config.targetCount, onComplete]);

  const handlePointerDown = useCallback(() => { pointerDownRef.current = true; }, []);
  const handlePointerUp = useCallback(() => { pointerDownRef.current = false; }, []);

  const handlePointerMove = useCallback((_e: React.PointerEvent, zoneId: number) => {
    if (!pointerDownRef.current) return;
    setZones(prev => prev.map(z =>
      z.id === zoneId && z.cleanProgress < 1
        ? { ...z, cleanProgress: Math.min(1, z.cleanProgress + SCRUB_SPEED) }
        : z
    ));
  }, []);

  return (
    <>
      <CareGameHUD
        progress={progress}
        timeLeft={timeLeft}
        score={cleaned}
        total={config.targetCount}
        label="Wash - Scrub Clean"
      />
      <div
        className="fixed pointer-events-auto"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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
        {zones.map(zone => (
          <div
            key={zone.id}
            onPointerMove={(e) => handlePointerMove(e, zone.id)}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: ZONE_SIZE,
              height: ZONE_SIZE,
              transform: 'translate(-50%, -50%)',
              cursor: zone.cleanProgress < 1 ? 'grab' : 'default',
              background: zone.cleanProgress >= 1
                ? 'radial-gradient(circle, rgba(100,255,200,0.3) 0%, transparent 70%)'
                : `radial-gradient(circle, rgba(120,80,40,${0.7 - zone.cleanProgress * 0.6}) 0%, rgba(80,50,20,${0.4 - zone.cleanProgress * 0.35}) 70%, transparent 100%)`,
              border: zone.cleanProgress >= 1
                ? '2px solid rgba(100,255,200,0.5)'
                : '2px dashed rgba(180,130,60,0.5)',
              boxShadow: zone.cleanProgress >= 1 ? '0 0 12px rgba(100,255,200,0.4)' : 'none',
              transition: 'background 0.2s, border 0.2s',
            }}
          >
            <span className="text-lg pointer-events-none">
              {zone.cleanProgress >= 1 ? '✨' : '🧽'}
            </span>
            {zone.cleanProgress > 0 && zone.cleanProgress < 1 && (
              <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 56 56">
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="rgba(100,200,255,0.6)"
                  strokeWidth="3"
                  strokeDasharray={`${zone.cleanProgress * 150} 150`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
