import type { CSSProperties } from 'react';
import type { PetState } from '../../types';

export type AnimationRange = {
  startFrame: number;
  endFrame: number;
  frameDuration: number;
};

/**
 * Animation names include all PetState values plus additional visual states
 * that may not have sprites yet. When a name isn't in the sprite config,
 * the fallback system shows a black box — telling artists what to create.
 */
export type AnimationName = PetState | 'dirty' | 'eating';

export type SpriteSheetConfig = {
  url: string;
  alt: string;
  spriteSheet: true;
  cols: number;
  rows: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  /** Transparent pixels below the character's feet in each frame.
   *  Used to collapse dead space so the sprite sits flush on the ground plane.
   *  Measure from the bottom of the frame to the lowest non-transparent row. */
  groundOffsetY?: number;
  /** Keyed by animation name. Missing keys are handled by the fallback system. */
  animations: Record<string, AnimationRange>;
};

export type SpriteRenderStyle = Pick<
  CSSProperties,
  'width' | 'height' | 'overflow' | 'backgroundImage' | 'backgroundRepeat' | 'backgroundPosition' | 'backgroundSize' | 'imageRendering' | 'marginBottom'
>;
