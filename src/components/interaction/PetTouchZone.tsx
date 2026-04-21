import React, { useEffect, useRef } from 'react';
import { Z } from '../../config/zBands';
import type { HandMode, InteractionGesture } from '../../types/interaction';

interface PetTouchZoneProps {
  /** Pet X position in native coords. */
  petX: number;
  /** Ground Y in native coords (from bottom). */
  groundY: number;
  /** Viewport scale. */
  scale: number;
  /** Pet sprite scale. */
  petScale: number;
  /** Currently selected hand mode. */
  handMode: HandMode;
  /** Current detected gesture. */
  gesture: InteractionGesture;
  /** Whether the hand is over the pet. */
  isOverPet: boolean;
  /** Fires when a valid interaction should start. */
  onInteract: (mode: HandMode) => void;
  /** Fires when interaction ends. */
  onInteractEnd: () => void;
}

const HIT_SIZE_NATIVE = 120; // generous hit area in native px

/**
 * Translates gesture + over-pet state into interaction dispatches.
 *
 * Pointer tracking is handled globally by the `useHandInteraction` hook via
 * window-level listeners, so this component no longer needs its own pointer
 * event handlers — it just renders a renderless-style marker and watches the
 * resulting gesture/isOverPet state for interaction edges.
 *
 * The transparent `<div>` is kept only so the touch zone has a defined DOM
 * box matching the pet's hit area (useful for debug overlays).
 */
export const PetTouchZone: React.FC<PetTouchZoneProps> = ({
  petX, groundY, scale, petScale,
  handMode, gesture, isOverPet,
  onInteract, onInteractEnd,
}) => {
  const lastGestureRef = useRef<InteractionGesture>('none');
  const interactingRef = useRef(false);
  const tapEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when a gesture should trigger an interaction
  useEffect(() => {
    if (!isOverPet || handMode === 'idle') return;

    const prev = lastGestureRef.current;
    lastGestureRef.current = gesture;

    if (gesture === 'tap' && prev !== 'tap') {
      onInteract(handMode);
      // Auto-end tap interactions after brief delay (with cleanup)
      if (tapEndTimerRef.current) clearTimeout(tapEndTimerRef.current);
      tapEndTimerRef.current = setTimeout(() => {
        tapEndTimerRef.current = null;
        onInteractEnd();
      }, 500);
    } else if (gesture === 'rub' && !interactingRef.current) {
      interactingRef.current = true;
      onInteract(handMode);
    } else if (gesture === 'hold' && !interactingRef.current) {
      interactingRef.current = true;
      onInteract(handMode);
    }
  }, [gesture, isOverPet, handMode, onInteract, onInteractEnd]);

  // Cleanup tap timer on unmount
  useEffect(() => {
    return () => {
      if (tapEndTimerRef.current) clearTimeout(tapEndTimerRef.current);
    };
  }, []);

  // End interaction when gesture stops
  useEffect(() => {
    if (gesture === 'none' && interactingRef.current) {
      interactingRef.current = false;
      onInteractEnd();
    }
  }, [gesture, onInteractEnd]);

  const size = HIT_SIZE_NATIVE * (petScale / 2) * scale;
  const centerX = petX * scale;
  const bottomY = groundY * scale;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        zIndex: Z.TOUCH_ZONE,
        left: centerX - size / 2,
        bottom: bottomY,
        width: size,
        height: size,
        // Debug: uncomment to see hit area
        // border: '2px solid rgba(255,0,0,0.3)',
        // background: 'rgba(255,0,0,0.05)',
      }}
    />
  );
};
