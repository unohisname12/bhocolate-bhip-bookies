import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FLOOR_RECT,
  PET_HOME,
  resolveTarget,
  hitCollider,
} from '../config/warmRoomLayout';

export type PetMoveState = 'idle' | 'walking' | 'interacting';
export type Facing = 'left' | 'right';

export interface PetPose {
  x: number;
  y: number;
  state: PetMoveState;
  facing: Facing;
  interactionId: string | null;
}

interface Target {
  x: number;
  y: number;
  interactionId?: string;
}

const SPEED_PCT_PER_SEC = 16;
const ARRIVE_EPS = 0.4;
const WANDER_MIN_MS = 6000;
const WANDER_MAX_MS = 11000;

/**
 * 2D pet controller for the warm room.
 *
 * Responsibilities:
 *   - Hold the pet's current (x,y) foot anchor, movement state, and facing.
 *   - Smoothly interpolate toward a target on each frame (constant speed).
 *   - Stay out of colliders — targets are resolved via resolveTarget() before
 *     the pet starts moving. A naive direct path is then taken; if the path
 *     crosses a collider mid-segment, the pet stops at the boundary.
 *   - Drift between random walkable points while idle so the room feels alive.
 */
export function useRoomPetController(opts?: { wander?: boolean; paused?: boolean }) {
  const wander = opts?.wander ?? true;
  const paused = opts?.paused ?? false;
  const [pose, setPose] = useState<PetPose>({
    x: PET_HOME.x,
    y: PET_HOME.y,
    state: 'idle',
    facing: 'right',
    interactionId: null,
  });
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const targetRef = useRef<Target | null>(null);
  const lastTickRef = useRef<number>(0);
  const idleSinceRef = useRef<number>(performance.now());

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    lastTickRef.current = performance.now();

    const pickWanderTarget = (): Target => {
      const x = FLOOR_RECT.xMin + Math.random() * (FLOOR_RECT.xMax - FLOOR_RECT.xMin);
      const y = FLOOR_RECT.yMin + Math.random() * (FLOOR_RECT.yMax - FLOOR_RECT.yMin);
      const safe = resolveTarget(x, y);
      return { x: safe.x, y: safe.y };
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      const cur = poseRef.current;
      const t = targetRef.current;

      if (t) {
        const dx = t.x - cur.x;
        const dy = t.y - cur.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ARRIVE_EPS) {
          targetRef.current = null;
          idleSinceRef.current = now;
          const nextState: PetMoveState = t.interactionId ? 'interacting' : 'idle';
          setPose({
            x: t.x,
            y: t.y,
            state: nextState,
            facing: cur.facing,
            interactionId: t.interactionId ?? null,
          });
        } else {
          const step = Math.min(dist, SPEED_PCT_PER_SEC * dt);
          const nx = cur.x + (dx / dist) * step;
          const ny = cur.y + (dy / dist) * step;
          if (hitCollider(nx, ny)) {
            targetRef.current = null;
            idleSinceRef.current = now;
            setPose({ ...cur, state: 'idle', interactionId: null });
          } else {
            const facing: Facing = Math.abs(dx) < 0.1 ? cur.facing : dx >= 0 ? 'right' : 'left';
            setPose({
              x: nx,
              y: ny,
              state: 'walking',
              facing,
              interactionId: null,
            });
          }
        }
      } else if (wander && cur.state === 'idle') {
        const idleMs = now - idleSinceRef.current;
        if (idleMs > WANDER_MIN_MS + Math.random() * (WANDER_MAX_MS - WANDER_MIN_MS)) {
          targetRef.current = pickWanderTarget();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wander, paused]);

  const moveTo = useCallback((x: number, y: number) => {
    const safe = resolveTarget(x, y);
    targetRef.current = { x: safe.x, y: safe.y };
  }, []);

  const walkToInteraction = useCallback(
    (id: string, anchor: { x: number; y: number }) => {
      const safe = resolveTarget(anchor.x, anchor.y);
      targetRef.current = { x: safe.x, y: safe.y, interactionId: id };
    },
    []
  );

  const stop = useCallback(() => {
    targetRef.current = null;
  }, []);

  return { pose, moveTo, walkToInteraction, stop };
}
