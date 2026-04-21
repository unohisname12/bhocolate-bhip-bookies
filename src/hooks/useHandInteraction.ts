import { useState, useCallback, useRef, useEffect } from 'react';
import type { HandMode, HandAnimState, InteractionGesture } from '../types/interaction';
import { INTERACTION_DEFS } from '../config/interactionConfig';

interface UseHandInteractionOptions {
  /** Viewport-to-native scale factor. */
  scale: number;
  /** Pet X in native coords. */
  petX: number;
  /** Pet ground Y in native coords. */
  groundY: number;
  /** Pet sprite scale. */
  petScale: number;
}

interface UseHandInteractionReturn {
  handMode: HandMode;
  handAnimState: HandAnimState;
  isOverPet: boolean;
  gesture: InteractionGesture;
  setHandMode: (mode: HandMode) => void;
  /** Ref setter — pass as `ref` to the HandCursor root element so the hook
   *  can write `transform` directly and avoid React re-renders on mousemove. */
  setHandEl: (el: HTMLDivElement | null) => void;
  /** Kept exported for backward compat with existing PetTouchZone wiring, but
   *  the hook now also attaches window-level listeners while hand mode is
   *  active, so the hand tracks the pointer across the entire viewport. */
  handlePointerMove: (e: React.PointerEvent | PointerEvent) => void;
  handlePointerDown: (e: React.PointerEvent | PointerEvent) => void;
  handlePointerUp: () => void;
}

const PET_HIT_SIZE_NATIVE = 100;
// displaySize in HandCursor is 256 * 0.3 ≈ 77; half of that centers the sprite.
const HAND_HALF_PX = 38;

export function useHandInteraction(opts: UseHandInteractionOptions): UseHandInteractionReturn {
  const { scale, petX, groundY, petScale } = opts;

  const [handMode, setHandMode] = useState<HandMode>('idle');
  const [isOverPet, setIsOverPetState] = useState(false);
  const [gesture, setGesture] = useState<InteractionGesture>('none');

  // Ref mirrors gesture state so callbacks never read stale closures
  const gestureRef = useRef<InteractionGesture>('none');
  const syncGesture = useCallback((g: InteractionGesture) => {
    gestureRef.current = g;
    setGesture(g);
  }, []);

  const pointerDownRef = useRef(false);
  const downPosRef = useRef({ x: 0, y: 0 });
  const downTimeRef = useRef(0);
  const moveDistRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position lives in refs + DOM transform; never triggers a re-render.
  const handXRef = useRef(0);
  const handYRef = useRef(0);
  const handElRef = useRef<HTMLDivElement | null>(null);
  const isOverPetRef = useRef(false);

  const writePosition = useCallback((vx: number, vy: number) => {
    const el = handElRef.current;
    if (el) {
      el.style.transform = `translate3d(${vx - HAND_HALF_PX}px, ${vy - HAND_HALF_PX}px, 0)`;
    }
  }, []);

  const setHandEl = useCallback(
    (el: HTMLDivElement | null) => {
      handElRef.current = el;
      if (el) writePosition(handXRef.current, handYRef.current);
    },
    [writePosition],
  );

  // Latest pet geometry in a ref so window listeners always see fresh values
  // without needing to re-register when the pet moves.
  const geomRef = useRef({ petX, groundY, petScale, scale });
  useEffect(() => {
    geomRef.current = { petX, groundY, petScale, scale };
  }, [petX, groundY, petScale, scale]);

  const checkOverPet = useCallback((vx: number, vy: number) => {
    const g = geomRef.current;
    const petCenterX = g.petX * g.scale;
    const petBottomY = window.innerHeight - g.groundY * g.scale;
    const petSize = PET_HIT_SIZE_NATIVE * (g.petScale / 2) * g.scale;
    return (
      vx >= petCenterX - petSize / 2 &&
      vx <= petCenterX + petSize / 2 &&
      vy >= petBottomY - petSize &&
      vy <= petBottomY
    );
  }, []);

  const handAnimState: HandAnimState =
    handMode === 'idle'
      ? 'HAND_IDLE'
      : INTERACTION_DEFS[handMode]?.handAnimState ?? 'HAND_IDLE';

  const applyPos = useCallback(
    (vx: number, vy: number) => {
      handXRef.current = vx;
      handYRef.current = vy;
      writePosition(vx, vy);
      const over = checkOverPet(vx, vy);
      if (over !== isOverPetRef.current) {
        isOverPetRef.current = over;
        setIsOverPetState(over);
      }
    },
    [writePosition, checkOverPet],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const vx = e.clientX;
      const vy = e.clientY;
      applyPos(vx, vy);

      if (pointerDownRef.current) {
        const dx = vx - downPosRef.current.x;
        const dy = vy - downPosRef.current.y;
        moveDistRef.current = Math.sqrt(dx * dx + dy * dy);

        if (moveDistRef.current > 10) {
          syncGesture('rub');
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
        }
      }
    },
    [applyPos, syncGesture],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      pointerDownRef.current = true;
      downPosRef.current = { x: e.clientX, y: e.clientY };
      downTimeRef.current = Date.now();
      moveDistRef.current = 0;

      holdTimerRef.current = setTimeout(() => {
        if (pointerDownRef.current && moveDistRef.current < 10) {
          syncGesture('hold');
        }
      }, 800);
    },
    [syncGesture],
  );

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (pointerDownRef.current) {
      const elapsed = Date.now() - downTimeRef.current;
      // Read from ref, not stale closure
      if (elapsed < 300 && moveDistRef.current < 10 && gestureRef.current !== 'hold') {
        syncGesture('tap');
        if (tapResetRef.current) clearTimeout(tapResetRef.current);
        tapResetRef.current = setTimeout(() => syncGesture('none'), 100);
      } else {
        syncGesture('none');
      }
    }

    pointerDownRef.current = false;
    moveDistRef.current = 0;
  }, [syncGesture]);

  // Global pointer tracking while hand is active — keeps the cursor following
  // everywhere on screen, not just over the pet's touch zone.
  useEffect(() => {
    if (handMode === 'idle') return;
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onDown = (e: PointerEvent) => handlePointerDown(e);
    const onUp = () => handlePointerUp();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [handMode, handlePointerMove, handlePointerDown, handlePointerUp]);

  // Hide the native OS cursor globally while hand mode is active so it
  // doesn't fight the sprite cursor.
  useEffect(() => {
    if (handMode === 'idle') return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = prev;
    };
  }, [handMode]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (tapResetRef.current) clearTimeout(tapResetRef.current);
    };
  }, []);

  return {
    handMode,
    handAnimState,
    isOverPet,
    gesture,
    setHandMode,
    setHandEl,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
  };
}
