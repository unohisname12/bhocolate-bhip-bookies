import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationName } from '../engine/animation/types';

/**
 * Short-lived animation override. Triggered by discrete actions
 * (feed, heal, power-up) to force an expressive animation for a
 * few seconds before returning control to the normal intent pipeline.
 */
export interface UsePetOneShotReturn {
  animName: AnimationName | null;
  trigger: (anim: AnimationName, durationMs: number) => void;
}

export function usePetOneShot(): UsePetOneShotReturn {
  const [animName, setAnimName] = useState<AnimationName | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback((anim: AnimationName, durationMs: number) => {
    clear();
    setAnimName(anim);
    timerRef.current = setTimeout(() => {
      setAnimName(null);
      timerRef.current = null;
    }, durationMs);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { animName, trigger };
}
