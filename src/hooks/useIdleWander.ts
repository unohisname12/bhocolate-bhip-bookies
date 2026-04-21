import { useState, useEffect, useRef, useCallback } from 'react';

interface WalkBounds {
  minX: number;
  maxX: number;
}

interface WanderState {
  /** Current X position in native coords. */
  x: number;
  /** Whether the pet is facing left. */
  facingLeft: boolean;
}

/**
 * Easing function — ease-in-out cubic for organic-feeling movement.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Random number between min and max (inclusive).
 */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Hook that makes the pet slowly wander to random X positions within
 * the given walk bounds. Movement is gentle and organic with pauses.
 *
 * @param walkBounds - Min/max X in native 400px coords
 * @param paused - If true, pet holds its current position (sleeping, dead, etc.)
 * @param resumeFromRef - Optional ref whose current value is the x to
 *        snap to when resuming (prevents teleport after a scripted move).
 */
export function useIdleWander(
  walkBounds: WalkBounds,
  paused: boolean,
  resumeFromRef?: React.MutableRefObject<number | null>,
): WanderState {
  const center = (walkBounds.minX + walkBounds.maxX) / 2;
  const [state, setState] = useState<WanderState>({ x: center, facingLeft: false });

  // Refs to survive across animation frames without re-renders
  const animRef = useRef<number>(0);
  const startXRef = useRef(center);
  const targetXRef = useRef(center);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const currentXRef = useRef(center);

  const pickNewTarget = useCallback(() => {
    const current = currentXRef.current;
    // Pick a target at least 30px away, within bounds
    let target: number;
    let attempts = 0;
    do {
      target = rand(walkBounds.minX, walkBounds.maxX);
      attempts++;
    } while (Math.abs(target - current) < 30 && attempts < 10);

    const distance = Math.abs(target - current);
    // Speed: 15-25 native px/sec → duration = distance / speed
    const speed = rand(15, 25);
    const duration = (distance / speed) * 1000;

    startXRef.current = current;
    targetXRef.current = target;
    durationRef.current = duration;
    startTimeRef.current = performance.now();
    // Pause 3-8 seconds after arriving
    pauseUntilRef.current = 0;
  }, [walkBounds.minX, walkBounds.maxX]);

  useEffect(() => {
    if (paused) return;

    // Sync internal position with the caller-supplied resume point so
    // wander continues from wherever a scripted move left the pet.
    const resumePos = resumeFromRef?.current;
    if (typeof resumePos === 'number') {
      currentXRef.current = resumePos;
      startXRef.current = resumePos;
      durationRef.current = 0;
      setState((prev) => ({ ...prev, x: resumePos }));
    }

    let running = true;

    const tick = (now: number) => {
      if (!running) return;

      // Still in pause phase?
      if (pauseUntilRef.current > 0 && now < pauseUntilRef.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      // If we were pausing and pause ended, pick new target
      if (pauseUntilRef.current > 0 && now >= pauseUntilRef.current) {
        pauseUntilRef.current = 0;
        pickNewTarget();
      }

      // If no active movement, start one
      if (durationRef.current === 0) {
        pickNewTarget();
      }

      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / durationRef.current, 1);
      const eased = easeInOutCubic(progress);

      const x = startXRef.current + (targetXRef.current - startXRef.current) * eased;
      const facingLeft = targetXRef.current < startXRef.current;

      currentXRef.current = x;
      setState({ x, facingLeft });

      // Arrived at target — enter pause
      if (progress >= 1) {
        durationRef.current = 0;
        pauseUntilRef.current = now + rand(3000, 8000);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [paused, pickNewTarget, resumeFromRef]);

  return state;
}
