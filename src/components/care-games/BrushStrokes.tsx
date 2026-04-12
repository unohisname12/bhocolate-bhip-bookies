import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const ARROWS: Record<Direction, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const MIN_SWIPE_PX = 40;

function randomDirection(): Direction {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function detectSwipeDirection(dx: number, dy: number): Direction | null {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < MIN_SWIPE_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export const BrushStrokes: React.FC<CareGameProps> = ({
  mode, onComplete, onCancel, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [currentDir, setCurrentDir] = useState<Direction>(randomDirection);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const progress = hits / config.targetCount;

  useEffect(() => {
    const iv = setInterval(() => {
      const remaining = Math.max(0, config.durationMs - (Date.now() - startRef.current)) / 1000;
      setTimeLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        const quality = Math.max(0, hits / config.targetCount - misses * 0.1);
        onComplete(Math.min(1, quality));
      }
    }, 100);
    return () => clearInterval(iv);
  }, [config.durationMs, config.targetCount, hits, misses, onComplete]);

  useEffect(() => {
    if (hits >= config.targetCount && !doneRef.current) {
      doneRef.current = true;
      const quality = Math.max(0, 1 - misses * 0.1);
      onComplete(Math.min(1, quality));
    }
  }, [hits, misses, config.targetCount, onComplete]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;

    const swiped = detectSwipeDirection(dx, dy);
    if (!swiped) return;

    if (swiped === currentDir) {
      setHits(h => h + 1);
      setFeedback('correct');
      setCurrentDir(randomDirection());
    } else {
      setMisses(m => m + 1);
      setFeedback('wrong');
    }
    setTimeout(() => setFeedback(null), 400);
  }, [currentDir]);

  return (
    <>
      <CareGameHUD
        progress={progress}
        timeLeft={timeLeft}
        score={hits}
        total={config.targetCount}
        label="Brush - Follow Strokes"
      />
      <div
        className="fixed pointer-events-auto flex items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
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
          className="flex flex-col items-center gap-2"
          style={{
            animation: feedback === 'correct' ? 'care-hit-pop 0.3s ease-out' : undefined,
          }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: feedback === 'correct'
                ? 'rgba(100,255,150,0.3)'
                : feedback === 'wrong'
                ? 'rgba(255,100,100,0.3)'
                : 'rgba(100,60,200,0.3)',
              border: `3px solid ${
                feedback === 'correct' ? 'rgba(100,255,150,0.7)'
                : feedback === 'wrong' ? 'rgba(255,100,100,0.7)'
                : 'rgba(180,150,255,0.5)'
              }`,
              boxShadow: `0 0 20px ${
                feedback === 'correct' ? 'rgba(100,255,150,0.4)'
                : feedback === 'wrong' ? 'rgba(255,100,100,0.4)'
                : 'rgba(140,100,255,0.3)'
              }`,
              transition: 'all 0.15s ease',
            }}
          >
            <span className="text-4xl font-black text-white" style={{ textShadow: '0 0 12px rgba(255,255,255,0.5)' }}>
              {ARROWS[currentDir]}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Swipe {currentDir}
          </span>
        </div>
      </div>
    </>
  );
};
