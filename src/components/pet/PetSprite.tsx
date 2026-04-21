import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ASSETS } from '../../config/assetManifest';
import { ANIMATION_CONFIG } from '../../config/animationConfig';
import { ANIMATION_DEFAULTS } from '../../config/gameConfig';
import { AnimationController } from '../../engine/animation/AnimationController';
import { computeSpriteStyle } from '../../engine/animation/SpriteRenderer';
import type { AnimationName, SpriteSheetConfig } from '../../engine/animation/types';
import type { PetIntent } from '../../engine/systems/PetIntentSystem';
import type { PetNeeds } from '../../types';
import { usePetMotion } from '../../hooks/usePetMotion';
import { AccessoryLayer } from './AccessoryLayer';
import type { CosmeticSlot } from '../../types/cosmetic';

// Proof-of-concept motion layer targets Blue Koala only. If pet.type
// maps to this species, we wire the motion hook; otherwise the pet
// renders unchanged.
const BLUE_KOALA_IDS = new Set(['koala_sprite', 'blue_koala']);

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
  /** Current X in native px — used by motion layer for tilt. */
  petX?: number;
  /** Care interaction phase — motion layer pulses on edges. */
  reactionPhase?: 'idle' | 'anticipation' | 'reacting' | 'afterglow';
  /** Icon (image URL or emoji glyph) to render in the pet's hand. */
  heldItemIcon?: string | null;
  /** Equipped cosmetics keyed by slot. Omit to render pet without cosmetics
   *  (e.g. battle screen). */
  equippedCosmetics?: Partial<Record<CosmeticSlot, string | null>>;
}

/**
 * Renders a small food/item sprite at the pet's hands/mouth so the player
 * can see what the pet is eating. Sized small enough to read as "held"
 * (not a floating billboard) and bobs toward the mouth on each chomp.
 */
const HeldItem: React.FC<{ icon: string; scale: number }> = ({ icon, scale }) => {
  // Native pet frame is 128px. Hands sit ~45% from bottom; keep item
  // ~24px native (fits in pet's paws). Scale with sprite scale so it
  // tracks the pet at any zoom level.
  const size = 26 * scale;
  const isImageUrl = /^[\/\.]|^https?:/.test(icon);
  return (
    <div
      className="absolute pointer-events-none anim-chomp"
      style={{
        left: '50%',
        bottom: `${48 * scale}px`,
        transform: 'translateX(-50%)',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
      }}
    >
      {isImageUrl ? (
        <img
          src={icon}
          alt=""
          style={{
            width: size,
            height: size,
            imageRendering: 'pixelated',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{icon}</span>
      )}
    </div>
  );
};

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
  petX = 0,
  reactionPhase = 'idle',
  heldItemIcon = null,
  equippedCosmetics,
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
  const motionTargetRef = useRef<HTMLDivElement | null>(null);
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

  // Gate the proof motion layer to Blue Koala. Other species render as before.
  const motionEnabled = !paused && BLUE_KOALA_IDS.has(speciesId);
  usePetMotion(motionTargetRef, {
    animationName: safeAnimationName,
    petX,
    reactionPhase,
    enabled: motionEnabled,
  });

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

      {/* Motion target — inner div owns the fake-physics transform.
          Transforms on this inner element compose cleanly with the CSS
          class-based breathing on the outer wrapper. */}
      <div
        ref={motionTargetRef}
        className="relative z-10"
        style={{ transformOrigin: 'bottom center', willChange: 'transform' }}
      >
        {showFallback ? (
          <SpriteFallback
            animationName={animationName}
            speciesId={speciesId}
            scale={scale}
            reason={!hasSpriteSheet ? 'no_sheet' : 'no_animation'}
          />
        ) : (
          <div className="relative">
            {/* Aura layer — renders BEHIND the pet sprite */}
            {equippedCosmetics && (
              <AccessoryLayer equipped={equippedCosmetics} scale={scale} behind />
            )}
            <div
              className="cursor-pointer"
              style={computeSpriteStyle(spriteConfig, frame, scale)}
            />
            {/* Front cosmetics (collar/eyewear/hat) render on top of pet */}
            {equippedCosmetics && (
              <AccessoryLayer equipped={equippedCosmetics} scale={scale} />
            )}
            {/* Held item rendered as sibling of clipped sprite so it is
                not cut off by the sprite's overflow: hidden. */}
            {heldItemIcon && <HeldItem icon={heldItemIcon} scale={scale} />}
          </div>
        )}
      </div>
    </div>
  );
};
