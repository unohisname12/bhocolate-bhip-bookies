import React, { useEffect, useState, useRef } from 'react';

export interface EffectAnimConfig {
  /** Path to horizontal sprite sheet PNG */
  sheetUrl: string;
  /** Number of frames in the sheet */
  frameCount: number;
  /** Width of each frame in px */
  frameWidth: number;
  /** Height of each frame in px */
  frameHeight: number;
  /** Ms per frame (lower = faster) */
  frameDuration: number;
  /** Whether the animation loops or plays once */
  loop?: boolean;
}

/**
 * Plays a sprite-sheet animation frame-by-frame.
 * Renders at the given display size using background-position stepping.
 */
export const AnimatedEffect: React.FC<{
  config: EffectAnimConfig;
  /** Display size (CSS px). Defaults to frameWidth/frameHeight. */
  displaySize?: number;
  onDone?: () => void;
}> = ({ config, displaySize, onDone }) => {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const size = displaySize ?? config.frameWidth;

  useEffect(() => {
    frameRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset frame counter when animation config changes
    setFrame(0);

    const interval = setInterval(() => {
      frameRef.current += 1;
      if (frameRef.current >= config.frameCount) {
        if (config.loop) {
          frameRef.current = 0;
          setFrame(0);
        } else {
          clearInterval(interval);
          onDone?.();
        }
        return;
      }
      setFrame(frameRef.current);
    }, config.frameDuration);

    return () => clearInterval(interval);
  }, [config, onDone]);

  const scale = size / config.frameWidth;
  const sheetWidth = config.frameCount * config.frameWidth;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 40 }}
    >
      <div
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${config.sheetUrl})`,
          backgroundPosition: `-${frame * config.frameWidth * scale}px 0px`,
          backgroundSize: `${sheetWidth * scale}px ${config.frameHeight * scale}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
        }}
      />
    </div>
  );
};

/** Registry of available animated combat effects */
// eslint-disable-next-line react-refresh/only-export-components -- co-located config data used alongside AnimatedEffect
export const COMBAT_ANIMS: Record<string, EffectAnimConfig> = {
  slash: {
    sheetUrl: '/assets/generated/final/anim_slash.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 70,
  },
  fire: {
    sheetUrl: '/assets/generated/final/anim_fire.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 80,
  },
  lightning: {
    sheetUrl: '/assets/generated/final/anim_lightning.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 65,
  },
  slam: {
    sheetUrl: '/assets/generated/final/anim_slam.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 80,
  },
  shield: {
    sheetUrl: '/assets/generated/final/anim_shield.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 90,
  },
  heal: {
    sheetUrl: '/assets/generated/final/anim_heal.png',
    frameCount: 6, frameWidth: 128, frameHeight: 128,
    frameDuration: 90,
  },
};
