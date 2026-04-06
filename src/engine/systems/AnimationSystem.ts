import type { AnimationState } from '../core/EngineTypes';

export const applyAnimationStep = (animation: AnimationState, deltaMs: number): AnimationState => {
  if (!animation.autoplay || animation.isFinished) return animation;

  const updateMs = animation.elapsedMs + deltaMs;
  if (updateMs >= animation.frameDurationMs) {
    const nextFrame = (animation.frameIndex + 1) % animation.frameCount;

    return {
      ...animation,
      frameIndex: nextFrame,
      elapsedMs: updateMs - animation.frameDurationMs,
      isFinished: nextFrame === 0 && !animation.autoplay,
    };
  }

  return { ...animation, elapsedMs: updateMs };
};
