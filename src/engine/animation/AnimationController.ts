import type { AnimationName, AnimationRange, SpriteSheetConfig } from './types';

export class AnimationController {
  private config: SpriteSheetConfig;
  private currentAnimation: AnimationName;
  private previousAnimation: AnimationName;
  private currentFrame: number;
  private elapsedSinceLastFrame: number;

  constructor(config: SpriteSheetConfig) {
    this.config = config;
    this.currentAnimation = 'idle';
    this.previousAnimation = 'idle';
    this.currentFrame = 0;
    this.elapsedSinceLastFrame = 0;

    this.validateAllAnimations();
    this.setAnimation('idle');
  }

  setAnimation(name: AnimationName): void {
    const nextName = this.config.animations[name] ? name : 'idle';
    this.validateAnimation(nextName);

    if (this.currentAnimation === nextName) {
      return;
    }

    this.previousAnimation = this.currentAnimation;
    this.currentAnimation = nextName;
    this.currentFrame = this.config.animations[nextName].startFrame;
    this.elapsedSinceLastFrame = 0;
  }

  tick(deltaMs: number): void {
    const animation = this.config.animations[this.currentAnimation];
    if (!animation) return;

    this.elapsedSinceLastFrame += Math.max(0, deltaMs);

    while (this.elapsedSinceLastFrame >= animation.frameDuration) {
      this.elapsedSinceLastFrame -= animation.frameDuration;
      if (this.currentFrame >= animation.endFrame) {
        this.currentFrame = animation.startFrame;
      } else {
        this.currentFrame += 1;
      }
    }
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getBackgroundPosition(scale: number): { x: number; y: number } {
    const col = this.currentFrame % this.config.cols;
    const row = Math.floor(this.currentFrame / this.config.cols);
    return {
      x: -(col * this.config.frameWidth * scale),
      y: -(row * this.config.frameHeight * scale),
    };
  }

  isTransitioning(): boolean {
    return this.currentAnimation !== this.previousAnimation;
  }

  forceFrame(index: number): void {
    const maxFrame = Math.max(0, this.config.frames - 1);
    this.currentFrame = Math.min(maxFrame, Math.max(0, index));
    this.elapsedSinceLastFrame = 0;
  }

  private validateAllAnimations(): void {
    (Object.keys(this.config.animations) as AnimationName[]).forEach((name) => this.validateAnimation(name));
  }

  private validateAnimation(name: AnimationName): void {
    const anim = this.config.animations[name];
    if (!anim) {
      throw new Error(`Missing animation '${name}' in sprite config`);
    }

    this.validateRange(name, anim);
  }

  private validateRange(name: AnimationName, range: AnimationRange): void {
    if (range.startFrame < 0 || range.endFrame < 0) {
      throw new Error(`Animation '${name}' has negative frame indices`);
    }

    if (range.startFrame > range.endFrame) {
      throw new Error(`Animation '${name}' has startFrame > endFrame`);
    }

    if (range.endFrame >= this.config.frames) {
      throw new Error(`Animation '${name}' exceeds frame bounds (${this.config.frames})`);
    }
  }
}
