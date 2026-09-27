import type { SpriteSheetConfig } from '../engine/animation/types';

export const WOODLAND_ART = '/assets/woodland-v1';
const pose = (name: string, frameDuration: number): SpriteSheetConfig => ({
  url: `${WOODLAND_ART}/pip-${name}.png`, alt: `Pip • ${name}`,
  spriteSheet: true, cols: 4, rows: 1, frames: 4,
  frameWidth: 128, frameHeight: 128, groundOffsetY: 12,
  animations: { idle: { startFrame: 0, endFrame: 3, frameDuration } },
});

// Care reactions reuse the appropriate new poses; specialized brush/wash/hurt
// drawings and evolution stages remain a later art milestone, not old-art fallbacks.
const reactions: Record<string, [string, number]> = {
  idle: ['idle', 320], walking: ['walking', 150], happy: ['happy', 200],
  hungry: ['eating', 350], eating: ['eating', 180], sleeping: ['sleeping', 600],
  sick: ['sleeping', 650], dead: ['sleeping', 1000], dirty: ['idle', 400],
  being_petted: ['happy', 220], being_washed: ['happy', 240],
  being_brushed: ['happy', 260], being_comforted: ['idle', 400],
  being_trained: ['action', 180], playing_with_hand: ['happy', 180],
};
export const PIP_PETS: Record<string, SpriteSheetConfig> = Object.fromEntries(
  Object.entries(reactions).map(([animation, [sheet, duration]]) => {
    const config = pose(sheet, duration);
    const resting = animation === 'sleeping' || animation === 'dead';
    config.animations[animation] = { startFrame: resting ? 2 : 0, endFrame: resting ? 2 : animation === 'sick' ? 0 : 3, frameDuration: duration };
    return [`koala_sprite__${animation}`, config];
  }),
);
PIP_PETS.koala_sprite = PIP_PETS.koala_sprite__idle;

export const PIP_COMBAT = Object.fromEntries(
  Object.entries({ attack: 'action', special: 'action', defend: 'idle', hurt: 'idle', heal: 'happy', math: 'happy' }).map(([name, sheet]) => [name, {
    url: `${WOODLAND_ART}/pip-${sheet}.png`, frameCount: 4,
    frameWidth: 128, frameHeight: 128, frameDuration: 120,
  }]),
);
