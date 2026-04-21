# Care Mini-Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat tap/rub/hold care interactions with 6 unique mini-games — one per care mode — so each feels like a distinct, engaging activity rather than stat-button clicking.

**Architecture:** Each mini-game is a self-contained React component that receives a shared `CareGameProps` interface. A dispatcher component (`CareGameOverlay`) mounts the correct mini-game based on `interaction.activeMode`. Each game manages its own internal state (targets, timers, score) and calls back with a `quality` result (0-1 float) when done. The existing `InteractionSystem.applyInteraction()` already handles stat effects and streaks — mini-games just gate *when* that fires and multiply rewards by quality. The pet sprite, VFX, and feedback text continue working as-is underneath the overlay.

**Tech Stack:** React, TypeScript, CSS animations, existing engine dispatch system. No new dependencies.

---

## File Structure

| File | Purpose |
|------|---------|
| `src/components/care-games/CareGameOverlay.tsx` | Dispatcher: mounts correct mini-game based on active mode |
| `src/components/care-games/CareGameHUD.tsx` | Shared progress bar + timer + score display used by all games |
| `src/components/care-games/types.ts` | Shared `CareGameProps` interface and result types |
| `src/components/care-games/PetSweetSpots.tsx` | **Pet** mini-game: tap glowing spots on the pet |
| `src/components/care-games/WashScrubZones.tsx` | **Wash** mini-game: scrub dirty patches clean |
| `src/components/care-games/BrushStrokes.tsx` | **Brush** mini-game: follow directional arrows |
| `src/components/care-games/ComfortHoldZone.tsx` | **Comfort** mini-game: hold still in calm zone |
| `src/components/care-games/TrainQuickTap.tsx` | **Train** mini-game: tap targets in sequence |
| `src/components/care-games/PlayCatch.tsx` | **Play** mini-game: boop bouncing targets |
| `src/animations.css` (modify) | Add keyframes for care game animations |
| `src/components/scene/GameSceneShell.tsx` (modify) | Mount `CareGameOverlay` in scene |
| `src/engine/core/ActionTypes.ts` (modify) | Add `CARE_GAME_COMPLETE` action |
| `src/engine/state/engineReducer.ts` (modify) | Handle `CARE_GAME_COMPLETE` with quality multiplier |
| `src/config/interactionConfig.ts` (modify) | Add `gameConfig` field to each interaction def |

---

## Task 1: Shared Types and CareGameHUD

**Files:**
- Create: `src/components/care-games/types.ts`
- Create: `src/components/care-games/CareGameHUD.tsx`

- [ ] **Step 1: Create shared types**

```ts
// src/components/care-games/types.ts
import type { HandMode } from '../../types/interaction';

/** Props every care mini-game receives. */
export interface CareGameProps {
  /** Which care mode this game is for. */
  mode: Exclude<HandMode, 'idle'>;
  /** Callback when the game round completes. quality is 0..1. */
  onComplete: (quality: number) => void;
  /** Callback if the player cancels mid-game. */
  onCancel: () => void;
  /** Viewport scale factor. */
  scale: number;
}

/** Per-mode game tuning. Added to InteractionDef. */
export interface CareGameConfig {
  /** Time limit in ms. */
  durationMs: number;
  /** Number of targets/zones to clear. */
  targetCount: number;
}

/** Default configs per mode. */
export const CARE_GAME_DEFAULTS: Record<Exclude<HandMode, 'idle'>, CareGameConfig> = {
  pet:     { durationMs: 6000,  targetCount: 5 },
  wash:    { durationMs: 8000,  targetCount: 4 },
  brush:   { durationMs: 7000,  targetCount: 5 },
  comfort: { durationMs: 5000,  targetCount: 1 },
  train:   { durationMs: 6000,  targetCount: 6 },
  play:    { durationMs: 8000,  targetCount: 8 },
};
```

- [ ] **Step 2: Create CareGameHUD component**

```tsx
// src/components/care-games/CareGameHUD.tsx
import React from 'react';

interface CareGameHUDProps {
  /** 0..1 progress through the game round. */
  progress: number;
  /** Remaining time in seconds. */
  timeLeft: number;
  /** Current score (targets hit / total). */
  score: number;
  /** Total targets in this round. */
  total: number;
  /** Label for the game mode. */
  label: string;
}

export const CareGameHUD: React.FC<CareGameHUDProps> = ({
  progress, timeLeft, score, total, label,
}) => (
  <div
    className="fixed top-16 left-1/2 -translate-x-1/2 pointer-events-none"
    style={{ zIndex: 55, width: 260 }}
  >
    {/* Mode label */}
    <div className="text-center mb-1">
      <span
        className="text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
        style={{
          background: 'rgba(100,60,200,0.8)',
          color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(180,150,255,0.4)',
        }}
      >
        {label}
      </span>
    </div>

    {/* Progress bar */}
    <div
      className="relative h-3 rounded-full overflow-hidden"
      style={{
        background: 'rgba(10,8,25,0.8)',
        border: '1px solid rgba(100,80,200,0.3)',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
        style={{
          width: `${Math.min(100, progress * 100)}%`,
          background: progress > 0.8
            ? 'linear-gradient(90deg, #a78bfa, #c084fc)'
            : progress > 0.5
            ? 'linear-gradient(90deg, #60a5fa, #818cf8)'
            : 'linear-gradient(90deg, #475569, #64748b)',
        }}
      />
    </div>

    {/* Stats row */}
    <div className="flex justify-between mt-1 px-1">
      <span className="text-[9px] font-bold text-slate-400">
        {score}/{total}
      </span>
      <span className="text-[9px] font-bold text-amber-400">
        {Math.ceil(timeLeft)}s
      </span>
    </div>
  </div>
);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/care-games/types.ts src/components/care-games/CareGameHUD.tsx
git commit -m "feat(care): add shared care mini-game types and HUD component"
```

---

## Task 2: Pet Sweet Spots Mini-Game

**Files:**
- Create: `src/components/care-games/PetSweetSpots.tsx`

The **Pet / Rub** mini-game: glowing circles appear at random positions within the pet area. Tap each one before it fades. Each successful tap triggers hearts. Miss too many and quality drops.

- [ ] **Step 1: Create PetSweetSpots component**

```tsx
// src/components/care-games/PetSweetSpots.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface SweetSpot {
  id: number;
  x: number; // 0..100 percent within game area
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
        // Use callback form to read latest hits
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

      {/* Game area overlay */}
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

        {/* Hit feedback */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/PetSweetSpots.tsx
git commit -m "feat(care): pet sweet-spots mini-game"
```

---

## Task 3: Wash Scrub Zones Mini-Game

**Files:**
- Create: `src/components/care-games/WashScrubZones.tsx`

The **Wash** mini-game: dirty patches appear on the pet. Rub/scrub over each one (track pointer movement within zone) to clean it. Each zone has a `clean` progress that fills as you scrub.

- [ ] **Step 1: Create WashScrubZones component**

```tsx
// src/components/care-games/WashScrubZones.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

interface DirtyZone {
  id: number;
  x: number;
  y: number;
  cleanProgress: number; // 0..1
}

const ZONE_SIZE = 56;
const SCRUB_SPEED = 0.08; // progress per pointer-move event inside zone

function generateZones(count: number): DirtyZone[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 10 + Math.random() * 70,
    cleanProgress: 0,
  }));
}

export const WashScrubZones: React.FC<CareGameProps> = ({
  mode, onComplete, onCancel, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [zones, setZones] = useState<DirtyZone[]>(() => generateZones(config.targetCount));
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const pointerDownRef = useRef(false);

  const cleaned = zones.filter(z => z.cleanProgress >= 1).length;
  const progress = cleaned / config.targetCount;

  // Timer
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

  // Auto-complete if all zones cleaned
  useEffect(() => {
    if (cleaned >= config.targetCount && !doneRef.current) {
      doneRef.current = true;
      onComplete(1.0);
    }
  }, [cleaned, config.targetCount, onComplete]);

  const handlePointerDown = useCallback(() => { pointerDownRef.current = true; }, []);
  const handlePointerUp = useCallback(() => { pointerDownRef.current = false; }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent, zoneId: number) => {
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
            {/* Small progress ring */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/WashScrubZones.tsx
git commit -m "feat(care): wash scrub-zones mini-game"
```

---

## Task 4: Brush Strokes Mini-Game

**Files:**
- Create: `src/components/care-games/BrushStrokes.tsx`

The **Brush** mini-game: directional arrows appear one at a time. Swipe/drag in the direction shown. Correct strokes fill the progress bar.

- [ ] **Step 1: Create BrushStrokes component**

```tsx
// src/components/care-games/BrushStrokes.tsx
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

  // Timer
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

  // Auto-complete
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
        {/* Direction prompt */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/BrushStrokes.tsx
git commit -m "feat(care): brush directional-strokes mini-game"
```

---

## Task 5: Comfort Hold Zone Mini-Game

**Files:**
- Create: `src/components/care-games/ComfortHoldZone.tsx`

The **Comfort** mini-game: a calming circle appears. Keep your pointer inside it without moving too much. A calm meter fills while you hold still. Move too fast and it drains. Fill it completely to succeed.

- [ ] **Step 1: Create ComfortHoldZone component**

```tsx
// src/components/care-games/ComfortHoldZone.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CareGameHUD } from './CareGameHUD';
import { CARE_GAME_DEFAULTS } from './types';
import type { CareGameProps } from './types';

const ZONE_RADIUS = 50;
const CALM_RATE = 0.015;   // fill per 100ms tick while holding still
const DRAIN_RATE = 0.04;   // drain per fast move
const MOVE_THRESHOLD = 4;  // px movement per event that counts as "too much"

export const ComfortHoldZone: React.FC<CareGameProps> = ({
  mode, onComplete, onCancel, scale,
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

  // Timer
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

  // Fill calm meter when holding still inside zone
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
          {/* Calm breathing ring */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/ComfortHoldZone.tsx
git commit -m "feat(care): comfort hold-zone mini-game"
```

---

## Task 6: Train Quick-Tap Mini-Game

**Files:**
- Create: `src/components/care-games/TrainQuickTap.tsx`

The **Training** mini-game: targets appear one at a time at random positions. Tap each one quickly. Speed matters — faster taps give bonus score. Targets shrink over time as pressure.

- [ ] **Step 1: Create TrainQuickTap component**

```tsx
// src/components/care-games/TrainQuickTap.tsx
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

  // Initial spawn
  useEffect(() => { spawnTarget(); }, [spawnTarget]);

  // Expire target if not tapped
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

  // Timer
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

  // Cleanup
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

        {/* Flash feedback */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/TrainQuickTap.tsx
git commit -m "feat(care): training quick-tap mini-game"
```

---

## Task 7: Play Catch Mini-Game

**Files:**
- Create: `src/components/care-games/PlayCatch.tsx`

The **Play** mini-game: bouncing targets move across the game area. Tap them to "boop" them. They respawn at a new position with slightly faster movement. Most energetic game — higher target count, faster pace.

- [ ] **Step 1: Create PlayCatch component**

```tsx
// src/components/care-games/PlayCatch.tsx
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
  mode, onComplete, onCancel, scale,
}) => {
  const config = CARE_GAME_DEFAULTS[mode];
  const [bouncer, setBouncer] = useState<Bouncer>(() => spawnBouncer(0, 0));
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const nextIdRef = useRef(1);

  // Animate bouncer movement
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

  // Timer
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
      if (next >= config.targetCount && !doneRef.current) {
        doneRef.current = true;
        onComplete(1.0);
      }
      return next;
    });
    setBouncer(spawnBouncer(nextIdRef.current++, hits));
  }, [hits, config.targetCount, onComplete]);

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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/PlayCatch.tsx
git commit -m "feat(care): play boop-catch mini-game"
```

---

## Task 8: CareGameOverlay Dispatcher

**Files:**
- Create: `src/components/care-games/CareGameOverlay.tsx`

Mounts the correct mini-game component based on the active interaction mode. Only renders when `isInteracting` is true.

- [ ] **Step 1: Create CareGameOverlay component**

```tsx
// src/components/care-games/CareGameOverlay.tsx
import React from 'react';
import type { InteractionState } from '../../types/interaction';
import type { CareGameProps } from './types';
import { PetSweetSpots } from './PetSweetSpots';
import { WashScrubZones } from './WashScrubZones';
import { BrushStrokes } from './BrushStrokes';
import { ComfortHoldZone } from './ComfortHoldZone';
import { TrainQuickTap } from './TrainQuickTap';
import { PlayCatch } from './PlayCatch';

interface CareGameOverlayProps {
  interaction: InteractionState;
  scale: number;
  onComplete: (quality: number) => void;
  onCancel: () => void;
}

const GAME_MAP: Record<string, React.FC<CareGameProps>> = {
  pet: PetSweetSpots,
  wash: WashScrubZones,
  brush: BrushStrokes,
  comfort: ComfortHoldZone,
  train: TrainQuickTap,
  play: PlayCatch,
};

export const CareGameOverlay: React.FC<CareGameOverlayProps> = ({
  interaction, scale, onComplete, onCancel,
}) => {
  const mode = interaction.activeMode;
  if (mode === 'idle' || !interaction.isInteracting) return null;

  const GameComponent = GAME_MAP[mode];
  if (!GameComponent) return null;

  return (
    <GameComponent
      mode={mode}
      onComplete={onComplete}
      onCancel={onCancel}
      scale={scale}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/care-games/CareGameOverlay.tsx
git commit -m "feat(care): care game overlay dispatcher"
```

---

## Task 9: Wire Into Game Engine

**Files:**
- Modify: `src/engine/core/ActionTypes.ts`
- Modify: `src/engine/state/engineReducer.ts`

Add `CARE_GAME_COMPLETE` action that applies stat effects with a quality multiplier.

- [ ] **Step 1: Add action type**

In `src/engine/core/ActionTypes.ts`, add to the `GameEngineAction` union before `| DevToolsAction`:

```ts
  | { type: 'CARE_GAME_COMPLETE'; mode: HandMode; quality: number }
```

- [ ] **Step 2: Handle in reducer**

In `src/engine/state/engineReducer.ts`, add a new case after the `END_PET_INTERACTION` case:

```ts
    case 'CARE_GAME_COMPLETE': {
      if (!state.pet) return state;
      const interaction = state.interaction ?? createDefaultInteractionState();
      const check = canInteractCheck(state.pet, action.mode, interaction, state.player.currencies.tokens);
      if (!check.allowed) {
        // Still end the interaction even if check fails (game already played)
        return { ...state, interaction: endInteractionFn(interaction) };
      }
      const result = applyInteractionFn(state.pet, action.mode, interaction);
      // Scale stat gains by quality (0..1)
      const q = Math.max(0.1, action.quality); // minimum 10% reward for playing
      const scaledPet: typeof result.pet = {
        ...result.pet,
        bond: state.pet.bond + (result.pet.bond - state.pet.bond) * q,
        trust: (state.pet.trust ?? 20) + ((result.pet.trust ?? 20) - (state.pet.trust ?? 20)) * q,
        discipline: (state.pet.discipline ?? 0) + ((result.pet.discipline ?? 0) - (state.pet.discipline ?? 0)) * q,
        groomingScore: (state.pet.groomingScore ?? 50) + ((result.pet.groomingScore ?? 50) - (state.pet.groomingScore ?? 50)) * q,
        stress: (state.pet.stress ?? 0) + ((result.pet.stress ?? 0) - (state.pet.stress ?? 0)) * q,
        needs: {
          ...result.pet.needs,
          happiness: state.pet.needs.happiness + (result.pet.needs.happiness - state.pet.needs.happiness) * q,
          cleanliness: state.pet.needs.cleanliness + (result.pet.needs.cleanliness - state.pet.needs.cleanliness) * q,
        },
      };
      let next: EngineState = {
        ...state,
        pet: scaledPet,
        interaction: endInteractionFn(result.interactionState),
      };
      const scaledCost = Math.ceil(result.tokenCost * q);
      if (scaledCost > 0) next = deductTokens(next, scaledCost);
      next = logEvent(next, 'care_game_complete', { mode: action.mode, quality: action.quality });
      return next;
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/core/ActionTypes.ts src/engine/state/engineReducer.ts
git commit -m "feat(care): CARE_GAME_COMPLETE action with quality-scaled rewards"
```

---

## Task 10: Wire Overlay Into GameSceneShell

**Files:**
- Modify: `src/components/scene/GameSceneShell.tsx`

Mount the `CareGameOverlay` in the scene and change the interaction flow: touching the pet starts the mini-game, and the mini-game's completion dispatches `CARE_GAME_COMPLETE`.

- [ ] **Step 1: Add imports and callbacks**

Add import at the top of `GameSceneShell.tsx`:

```ts
import { CareGameOverlay } from '../care-games/CareGameOverlay';
```

- [ ] **Step 2: Add game completion handler**

After the existing `handleInteractEnd` callback, add:

```ts
  const handleCareGameComplete = useCallback((quality: number) => {
    const mode = interaction.activeMode;
    if (mode !== 'idle') {
      dispatch({ type: 'CARE_GAME_COMPLETE', mode, quality });
    }
    dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  }, [interaction.activeMode, dispatch]);

  const handleCareGameCancel = useCallback(() => {
    dispatch({ type: 'END_PET_INTERACTION' });
    dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  }, [dispatch]);
```

- [ ] **Step 3: Mount CareGameOverlay in JSX**

Add after the `InteractionFeedback` component (z-26) and before the `SceneOverlay` (z-28):

```tsx
      {/* z-52: Care mini-game overlay */}
      <CareGameOverlay
        interaction={interaction}
        scale={scale}
        onComplete={handleCareGameComplete}
        onCancel={handleCareGameCancel}
      />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/GameSceneShell.tsx
git commit -m "feat(care): mount care game overlay in scene shell"
```

---

## Task 11: CSS Keyframes for Care Games

**Files:**
- Modify: `src/animations.css`

Add the keyframes referenced by the mini-game components.

- [ ] **Step 1: Add keyframes at the end of animations.css**

```css
/* ── Care mini-game animations ─────────────────────────────────── */

@keyframes care-spot-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
}

@keyframes care-hit-pop {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.8; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes care-target-shrink {
  0% { transform: translate(-50%, -50%) scale(1); }
  80% { transform: translate(-50%, -50%) scale(0.6); }
  100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/animations.css
git commit -m "feat(care): add CSS keyframes for care mini-game animations"
```

---

## Task 12: Integration Test — Full Flow

**Files:** None new; manual verification.

- [ ] **Step 1: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Verify dev server loads**

Run: `npm run dev`
Expected: Vite starts on port 5000, no console errors.

- [ ] **Step 3: Test each care mode in browser**

For each of the 6 modes (pet, wash, brush, comfort, train, play):
1. Open the Touch toolbar
2. Select the mode
3. Verify pet stops wandering and goes idle
4. Touch the pet — verify the mini-game starts
5. Play through the mini-game — verify HUD shows progress
6. Complete the game — verify stats update and mode resets to idle
7. Verify the correct care sprite plays during the game

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(care): integration fixes from manual testing"
```
