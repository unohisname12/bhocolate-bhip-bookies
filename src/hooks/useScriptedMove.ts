import { useCallback, useEffect, useRef, useState } from 'react';

interface ScriptedMoveReturn {
  /** Overridden x while scripted; null when idle wander owns the pet. */
  x: number | null;
  /** True when pet is currently facing left. */
  facingLeft: boolean;
  /** True while a scripted move is in flight (before arrival). */
  walking: boolean;
  /** Move the pet from its current x to target, then resolve. */
  moveTo: (fromX: number, targetX: number, speedPxSec?: number) => Promise<void>;
  /** Release override; wander takes over next frame. */
  release: () => void;
}

/**
 * Lightweight scripted-move driver. When `moveTo` is called, the hook
 * interpolates x from the starting position to the target over time and
 * exposes `{ x, facingLeft, walking }`. Resolves when arrived so callers
 * can chain an animation hold, then call `release()` to hand control
 * back to idle wander.
 *
 * Non-goals: pathfinding, collision, interruption. One move at a time.
 */
export function useScriptedMove(): ScriptedMoveReturn {
  const [x, setX] = useState<number | null>(null);
  const [facingLeft, setFacingLeft] = useState(false);
  const [walking, setWalking] = useState(false);
  const rafRef = useRef<number | null>(null);
  const pendingRejectRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Resolve any in-flight move so awaiting callers don't leak.
    if (pendingRejectRef.current) {
      pendingRejectRef.current();
      pendingRejectRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    cancel();
    setX(null);
    setWalking(false);
  }, [cancel]);

  const moveTo = useCallback((fromX: number, targetX: number, speedPxSec = 45): Promise<void> => {
    cancel();
    const distance = Math.abs(targetX - fromX);
    const duration = Math.max(150, (distance / speedPxSec) * 1000);
    setX(fromX);
    setFacingLeft(targetX < fromX);
    setWalking(true);

    return new Promise<void>((resolve) => {
      const start = performance.now();
      pendingRejectRef.current = resolve;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const nextX = fromX + (targetX - fromX) * eased;
        setX(nextX);
        if (progress >= 1) {
          setWalking(false);
          rafRef.current = null;
          pendingRejectRef.current = null;
          resolve();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    });
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { x, facingLeft, walking, moveTo, release };
}
