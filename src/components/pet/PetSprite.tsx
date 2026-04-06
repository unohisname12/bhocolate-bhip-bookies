import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ASSETS } from '../../config/assetManifest';
import { ANIMATION_CONFIG } from '../../config/animationConfig';
import { ANIMATION_DEFAULTS } from '../../config/gameConfig';
import { AnimationController } from '../../engine/animation/AnimationController';
import { computeSpriteStyle } from '../../engine/animation/SpriteRenderer';
import type { AnimationName, SpriteSheetConfig } from '../../engine/animation/types';
import type { PetIntent } from '../../engine/systems/PetIntentSystem';
import type { PetNeeds } from '../../types';

interface PetSpriteProps {
  speciesId: string;
  animationName: string;
  /** Optional intent override — when set, shown in debug overlay */
  intent?: PetIntent;
  /** Raw pet needs — shown in debug overlay when debug=true */
  needs?: PetNeeds;
  scale?: number;
  paused?: boolean;
  onFrameChange?: (frame: number) => void;
  className?: string;
  /** Show debug overlay with intent + animation name + needs */
  debug?: boolean;
}

/**
 * Black box fallback — rendered when a sprite sheet or animation is missing.
 * Shows the missing animation name so artists know what to create.
 */
const SpriteFallback: React.FC<{ animationName: string; speciesId: string; scale: number; reason: string }> = ({
  animationName, speciesId, scale, reason,
}) => {
  const size = 128 * scale;

  // Log to console for easy debugging
  useEffect(() => {
    console.warn(
      `[PetSprite] MISSING ANIMATION: species="${speciesId}" animation="${animationName}" reason="${reason}"`,
    );
  }, [speciesId, animationName, reason]);

  return (
    <div
      className="flex items-center justify-center border-2 border-dashed border-red-500/60"
      style={{
        width: size,
        height: size,
        background: 'rgba(0,0,0,0.85)',
        imageRendering: 'pixelated',
      }}
    >
      <div className="text-center px-2">
        <div className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">
          {reason === 'no_sheet' ? 'Missing Sprite Sheet' : 'Missing Animation'}
        </div>
        <div className="text-white text-xs font-black uppercase">{animationName}</div>
        <div className="text-slate-400 text-[9px] mt-1">{speciesId}</div>
      </div>
    </div>
  );
};

/**
 * Debug overlay — shows current intent, resolved animation, raw needs,
 * asset key, and whether the animation is real or a fallback.
 */
const DebugOverlay: React.FC<{
  intent?: PetIntent;
  animationName: string;
  speciesId: string;
  assetKey: string;
  isFallback: boolean;
  fallbackReason?: string;
  needs?: PetNeeds;
}> = ({ intent, animationName, speciesId, assetKey, isFallback, fallbackReason, needs }) => (
  <div
    className="absolute -top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
    style={{
      background: 'rgba(0,0,0,0.88)',
      border: `1px solid ${isFallback ? 'rgba(255,100,100,0.6)' : 'rgba(100,200,255,0.4)'}`,
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 9,
      fontFamily: 'monospace',
      lineHeight: 1.5,
    }}
  >
    {intent && (
      <div className="text-cyan-300">
        intent: <span className="text-white font-bold">{intent}</span>
      </div>
    )}
    <div className="text-green-300">
      anim: <span className="text-white font-bold">{animationName}</span>
      {isFallback && (
        <span className="text-red-400 ml-1">[MISSING → {fallbackReason}]</span>
      )}
    </div>
    <div className="text-slate-400">
      asset: <span className="text-slate-300">{assetKey}</span>
    </div>
    <div className="text-slate-400">
      species: <span className="text-slate-300">{speciesId}</span>
    </div>
    {needs && (
      <div className="text-amber-300 mt-0.5">
        H:{needs.hunger} P:{needs.happiness} C:{needs.cleanliness} HP:{needs.health}
      </div>
    )}
  </div>
);

export const PetSprite: React.FC<PetSpriteProps> = ({
  speciesId,
  animationName,
  intent,
  needs,
  scale = ANIMATION_DEFAULTS.scale,
  paused = false,
  onFrameChange,
  className = '',
  debug = false,
}) => {
  // Check for a mood-specific override sheet (e.g. koala_sprite__idle)
  const overrideKey = `${speciesId}__${animationName}`;
  const petAsset = ASSETS.pets[overrideKey] ?? ASSETS.pets[speciesId] ?? null;
  const hasSpriteSheet = petAsset !== null;
  const spriteConfig = (petAsset ?? ASSETS.pets.koala_sprite) as SpriteSheetConfig;

  // Which asset key was actually resolved
  const resolvedAssetKey = ASSETS.pets[overrideKey] ? overrideKey
    : ASSETS.pets[speciesId] ? speciesId
    : 'koala_sprite (fallback)';

  const controllerRef = useRef<AnimationController | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const [frame, setFrame] = useState(0);

  // Check if the specific animation exists in this sprite config
  const hasAnimation = animationName in spriteConfig.animations;

  // Determine fallback status for debug display
  const isFallback = !hasSpriteSheet || !hasAnimation;
  const fallbackReason = !hasSpriteSheet
    ? 'no sprite sheet'
    : !hasAnimation
    ? `no "${animationName}" in config`
    : undefined;

  const safeAnimationName = useMemo<AnimationName>(() => {
    if (hasAnimation) {
      return animationName as AnimationName;
    }
    return 'idle';
  }, [animationName, hasAnimation]);

  // Initialize controller once in an effect, not during render
  useEffect(() => {
    controllerRef.current = new AnimationController(spriteConfig);
    controllerRef.current.setAnimation(safeAnimationName);
    const nextFrame = controllerRef.current.getCurrentFrame();
    setFrame(nextFrame);
    onFrameChange?.(nextFrame);
  }, [spriteConfig, safeAnimationName, onFrameChange]);

  useEffect(() => {
    if (paused) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = (time: number) => {
      const previous = lastFrameTimeRef.current ?? time;
      const deltaMs = time - previous;
      lastFrameTimeRef.current = time;

      controllerRef.current?.tick(deltaMs);
      const nextFrame = controllerRef.current?.getCurrentFrame() ?? 0;
      setFrame(nextFrame);
      onFrameChange?.(nextFrame);

      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      lastFrameTimeRef.current = null;
    };
  }, [paused, onFrameChange]);

  const currentAnimClass = (ANIMATION_CONFIG.petStates as Record<string, string>)[safeAnimationName] || 'anim-sprite-idle';

  // Show fallback for EITHER: no sprite sheet OR animation missing from existing sheet
  // This ensures artists always see what needs to be created
  const showFallback = !hasSpriteSheet || !hasAnimation;

  return (
    <div className={`relative flex flex-col items-center justify-center ${currentAnimClass} ${className}`}
         style={{ transformOrigin: 'bottom center' }}>

      {/* Debug overlay */}
      {debug && (
        <DebugOverlay
          intent={intent}
          animationName={animationName}
          speciesId={speciesId}
          assetKey={resolvedAssetKey}
          isFallback={isFallback}
          fallbackReason={fallbackReason}
          needs={needs}
        />
      )}

      {/* State indicators */}
      {safeAnimationName === 'sleeping' && (
        <div className="absolute -top-12 -right-8 z-20 text-3xl font-bold text-blue-300 drop-shadow-md anim-float">Zzz</div>
      )}
      {safeAnimationName === 'hungry' && (
        <div className="absolute -top-12 z-20 text-3xl font-bold text-red-500 drop-shadow-md anim-wobble">🥩!</div>
      )}

      {/* Sprite or fallback — fallback shows for BOTH missing sheet and missing animation */}
      {showFallback ? (
        <SpriteFallback
          animationName={animationName}
          speciesId={speciesId}
          scale={scale}
          reason={!hasSpriteSheet ? 'no_sheet' : 'no_animation'}
        />
      ) : (
        <div
          className="relative z-10 cursor-pointer"
          style={computeSpriteStyle(spriteConfig, frame, scale)}
        />
      )}
    </div>
  );
};
