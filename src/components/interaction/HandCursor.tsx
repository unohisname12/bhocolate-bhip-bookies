import React, { useEffect, useRef, useState, useMemo } from 'react';
import { HAND_ASSETS, HAND_ANIM_TO_ASSET } from '../../config/assetManifest';
import { Z } from '../../config/zBands';
import type { HandAnimState } from '../../types/interaction';

interface HandCursorProps {
  /** Ref setter — parent hook writes the outer transform directly into the
   *  DOM so the hand can follow the pointer without re-rendering React. */
  handRef: (el: HTMLDivElement | null) => void;
  /** Current animation state of the hand. */
  animState: HandAnimState;
  /** Whether the hand is actively over the pet. */
  isOverPet: boolean;
  /** Whether any interaction mode is selected (not 'idle'). */
  active: boolean;
}

/**
 * Floating hand cursor that follows the pointer.
 *
 * Uses the real sprite sheets from public/assets/hand/ when available.
 * Falls back to the idle sheet + CSS transforms for missing states,
 * with a small TODO label showing which animation is needed.
 */
export const HandCursor: React.FC<HandCursorProps> = ({
  handRef, animState, isOverPet, active,
}) => {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef(0);

  // Resolve which sprite sheet to use
  const assetKey = HAND_ANIM_TO_ASSET[animState] ?? 'idle';
  const config = HAND_ASSETS[assetKey] ?? HAND_ASSETS.idle;

  // Check if this state has a dedicated sheet or is borrowing idle
  const isDedicatedSheet = assetKey !== 'idle' || animState === 'HAND_IDLE';
  const todoLabel = !isDedicatedSheet
    ? `TODO: hand ${animState.replace('HAND_', '').toLowerCase()} animation`
    : null;

  // CSS transform hints for states borrowing the idle/rub sheet.
  // Applied to the inner sprite so it composes with the outer translate3d
  // (which the hook writes imperatively on every pointermove).
  const stateTransform = useMemo(() => {
    switch (animState) {
      case 'HAND_SCRUB': return 'rotate(15deg)';
      case 'HAND_HOLD': return 'scale(1.05)';
      case 'HAND_DRAG': return 'rotate(-10deg)';
      default: return undefined;
    }
  }, [animState]);

  // Animate frames
  useEffect(() => {
    if (!active) return;

    const tick = (now: number) => {
      const delta = lastTickRef.current ? now - lastTickRef.current : 0;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      if (elapsedRef.current >= config.frameDuration) {
        elapsedRef.current -= config.frameDuration;
        setFrame(f => (f + 1) % config.frames);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = 0;
      elapsedRef.current = 0;
    };
  }, [active, config.frameDuration, config.frames, animState]);

  // Reset frame on state change
  useEffect(() => { setFrame(0); }, [animState]);

  if (!active) return null;

  const spriteX = -(frame * config.frameWidth);
  const displayScale = 0.3; // hand is 256px, render at ~77px
  const displaySize = config.frameWidth * displayScale;

  return (
    <div
      ref={handRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: Z.HAND,
        left: 0,
        top: 0,
        width: displaySize,
        height: displaySize,
        willChange: 'transform',
      }}
    >
      {/* Sprite — carries state-specific rotate/scale so it composes with
          the outer translate written by the hook on every pointermove. */}
      <div
        style={{
          width: displaySize,
          height: displaySize,
          backgroundImage: `url(${config.url})`,
          backgroundPosition: `${spriteX * displayScale}px 0px`,
          backgroundSize: `${config.cols * displaySize}px ${displaySize}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated' as const,
          transform: stateTransform,
          transition: stateTransform ? 'transform 0.15s ease-out' : undefined,
          animation: isOverPet ? 'hand-bob 0.6s ease-in-out infinite' : undefined,
        }}
      />

      {/* TODO label for missing hand animations */}
      {todoLabel && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: 'rgba(255,200,50,0.9)',
            background: 'rgba(0,0,0,0.7)',
            padding: '1px 4px',
            borderRadius: 3,
          }}
        >
          {todoLabel}
        </div>
      )}

    </div>
  );
};
