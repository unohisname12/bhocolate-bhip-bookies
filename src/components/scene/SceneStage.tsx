import React from 'react';
import type { ShadowConfig, AmbientTint } from '../../config/sceneConfig';
import { Z } from '../../config/zBands';

interface SceneStageProps {
  children: React.ReactNode;
  /** Top edge of ground strip in native 224px coords (from bottom). */
  groundY: number;
  /** Viewport-to-native scale factor (viewportWidth / 400). */
  scale: number;
  /** Pet X position in native coords (optional — centered if omitted). */
  petX?: number;
  /** Whether the pet is facing left. */
  facingLeft?: boolean;
  /** Pixel-art ground shadow config from scene. */
  shadow?: ShadowConfig;
  /** Subtle scene-aware color tint. */
  ambientTint?: AmbientTint;
  /** Sink pet into ground by N native px for natural grounding. */
  footEmbed?: number;
}

/**
 * Positions the pet sprite on the scene's ground plane.
 *
 * The pet's feet are anchored to `groundY` (the top edge of the ground
 * strip), scaled to the current viewport size. When `petX` is provided
 * the pet is placed at that horizontal position; otherwise it is
 * centered in the viewport.
 *
 * The sprite's groundOffsetY negative margin (from SpriteRenderer)
 * collapses transparent padding below the feet — any transparent
 * overshoot is clipped by the root overflow-hidden on GameSceneShell.
 */
export const SceneStage: React.FC<SceneStageProps> = ({
  children,
  groundY,
  scale,
  petX,
  facingLeft,
  shadow,
  ambientTint: _ambientTint, // kept for future use — overlay approach caused white outline
  footEmbed = 0,
}) => {
  const useCentered = petX === undefined;

  return (
    <div
      className={`absolute pointer-events-none ${useCentered ? 'inset-x-0 flex justify-center' : ''}`}
      style={{
        zIndex: Z.PET,
        bottom: (groundY - footEmbed) * scale,
        ...(!useCentered && { left: petX * scale }),
      }}
    >
      <div className="relative pointer-events-auto" style={{ transformOrigin: 'bottom center' }}>
        {/* Pixel-art ground shadow — stepped gradient, no blur */}
        {shadow && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: -shadow.offsetY * scale,
              width: shadow.width * scale,
              height: shadow.height * scale,
              borderRadius: '100%',
              background: `radial-gradient(ellipse, rgba(0,0,0,${shadow.opacity}) 0%, rgba(0,0,0,${shadow.opacity}) 40%, rgba(0,0,0,${shadow.opacity * 0.4}) 41%, rgba(0,0,0,${shadow.opacity * 0.4}) 65%, transparent 66%)`,
              imageRendering: 'pixelated',
              zIndex: Z.PET_SHADOW,
            }}
          />
        )}
        {/* Pet content — flip horizontally when facing left */}
        <div
          className="relative"
          style={{
            zIndex: Z.PET,
            transformOrigin: 'bottom center',
            transform: facingLeft ? 'scaleX(-1)' : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
