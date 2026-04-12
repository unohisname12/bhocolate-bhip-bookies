import type { HandMode } from '../../types/interaction';

/** Props every care mini-game receives. */
export interface CareGameProps {
  /** Which care mode this game is for. */
  mode: Exclude<HandMode, 'idle'>;
  /** Callback when the game round completes. quality is 0..1. */
  onComplete: (quality: number) => void;
  /** Callback if the player cancels mid-game. */
  onCancel: () => void;
  /** Viewport scale factor. */
  scale: number;
}

/** Per-mode game tuning. Added to InteractionDef. */
export interface CareGameConfig {
  /** Time limit in ms. */
  durationMs: number;
  /** Number of targets/zones to clear. */
  targetCount: number;
}

/** Default configs per mode. */
export const CARE_GAME_DEFAULTS: Record<Exclude<HandMode, 'idle'>, CareGameConfig> = {
  pet:     { durationMs: 6000,  targetCount: 5 },
  wash:    { durationMs: 8000,  targetCount: 4 },
  brush:   { durationMs: 7000,  targetCount: 5 },
  comfort: { durationMs: 5000,  targetCount: 1 },
  train:   { durationMs: 6000,  targetCount: 6 },
  play:    { durationMs: 8000,  targetCount: 8 },
};
