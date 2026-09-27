import { PET_ANIMATIONS, COMBAT_ANIMATIONS } from './petAnimationCoverage';
import type { SpriteSheetConfig } from '../engine/animation/types';
import { GROWING_PETS, GROWTH_ART, GROWTH_STAGES } from './companionConfig';
import type { CombatSheetConfig } from './assetManifest';

export const COMPANION_PETS: Record<string, SpriteSheetConfig> = {};
export const COMPANION_PORTRAITS: Record<string, string> = {};
export const COMPANION_COMBAT: Record<string, Record<string, CombatSheetConfig>> = {};
for (const id of Object.keys(GROWING_PETS)) for (const stage of GROWTH_STAGES) {
  if (id === 'koala_sprite' && stage === 'baby') continue;
  const key = stage === 'baby' ? id : `${id}__${stage}`;
  const durations: Record<string, number> = { idle: 450, walking: 160, sleeping: 600, eating: 160, being_trained: 200 };
  COMPANION_PETS[key] = {
    url: `/assets/companions-v2/${id}-${stage}.png`, alt: `${GROWING_PETS[id as keyof typeof GROWING_PETS].name} • ${stage}`,
    spriteSheet: true, cols: 8, rows: 15, frames: 120, frameWidth: 128, frameHeight: 128, groundOffsetY: 12,
    animations: Object.fromEntries(PET_ANIMATIONS.map((name, row) => [name, { startFrame: row * 8, endFrame: row * 8 + (name === 'dead' ? 0 : 7), frameDuration: durations[name] ?? 240 }])),
  };
  COMPANION_PORTRAITS[key] = `${GROWTH_ART}/${id}-${stage}-portrait.png`;
  COMPANION_COMBAT[key] = Object.fromEntries(COMBAT_ANIMATIONS.map(name => [name, {
    url: `/assets/companions-v2/${id}-${stage}-${name}.png`, frameWidth: 128, frameHeight: 128, frameCount: 4, frameDuration: 160,
  }]));
}
