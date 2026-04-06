import type { SpriteSheetConfig, SpriteRenderStyle } from './types';

export const computeSpriteStyle = (
  config: SpriteSheetConfig,
  frame: number,
  scale: number,
): SpriteRenderStyle => {
  const safeScale = Math.max(0.1, scale);
  const maxFrame = Math.max(0, config.frames - 1);
  const safeFrame = Math.min(maxFrame, Math.max(0, frame));

  const col = safeFrame % config.cols;
  const row = Math.floor(safeFrame / config.cols);

  const width = config.frameWidth * safeScale;
  const height = config.frameHeight * safeScale;
  const backgroundWidth = config.cols * config.frameWidth * safeScale;
  const backgroundHeight = config.rows * config.frameHeight * safeScale;

  // Collapse transparent padding below feet so the container bottom = visual feet.
  // This keeps the shadow (anchored to container bottom) aligned with the ground.
  // Clamped so it never exceeds half the sprite height — prevents overflow.
  const rawOffset = (config.groundOffsetY ?? 0) * safeScale;
  const groundOffset = Math.min(rawOffset, height * 0.4);

  return {
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    backgroundImage: `url(${config.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `${-col * config.frameWidth * safeScale}px ${-row * config.frameHeight * safeScale}px`,
    backgroundSize: `${backgroundWidth}px ${backgroundHeight}px`,
    imageRendering: 'pixelated',
    ...(groundOffset > 0 && { marginBottom: `${-groundOffset}px` }),
  };
};
