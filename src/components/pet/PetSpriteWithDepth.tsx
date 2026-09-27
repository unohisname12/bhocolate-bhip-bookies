import React from 'react';

interface PetSpriteWithDepthProps {
  /** The sprite element to render on top of the depth effects. Typically a
   *  <PetSprite /> or <img /> — anything that renders at its own size. */
  children: React.ReactNode;
  /** Native pixel width of the child sprite (before CSS scaling). Drives
   *  the shadow oval size. */
  spriteWidth: number;
  /** Optional multiplier on the shadow oval vs sprite width. Default 0.7. */
  shadowScale?: number;
  /** Shadow opacity 0-1. Default 0.35. */
  shadowOpacity?: number;
  /** Vertical offset of the shadow below the sprite's bottom edge in native
   *  px. Negative to overlap the feet. Default 0. */
  shadowOffsetY?: number;
  className?: string;
}

/**
 * Opt-in wrapper that adds a subtle oval ground shadow beneath a sprite.
 * Pivot is bottom-center so the child grounds to the shadow.
 *
 * Not used in gameplay yet — built for Asset Review showcases and future
 * directional-sprite mode. Existing PetSprite callers are unaffected.
 */
export const PetSpriteWithDepth: React.FC<PetSpriteWithDepthProps> = ({
  children,
  spriteWidth,
  shadowScale = 0.7,
  shadowOpacity = 0.35,
  shadowOffsetY = 0,
  className = '',
}) => {
  const shadowW = Math.round(spriteWidth * shadowScale);
  const shadowH = Math.round(shadowW * 0.28);

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-end ${className}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none"
        style={{
          width: `${shadowW}px`,
          height: `${shadowH}px`,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, rgba(0,0,0,${shadowOpacity}) 0%, rgba(0,0,0,${shadowOpacity * 0.5}) 55%, rgba(0,0,0,0) 80%)`,
          marginTop: `${shadowOffsetY}px`,
          filter: 'blur(0.5px)',
        }}
      />
    </div>
  );
};
