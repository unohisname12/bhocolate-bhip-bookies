import type { PetMood } from './pet';

/** Which tool / mode the hand is in. 'idle' means no tool selected. */
export type HandMode = 'idle' | 'pet' | 'wash' | 'brush' | 'comfort' | 'train' | 'play';

/** Low-level animation state of the hand sprite. */
export type HandAnimState =
  | 'HAND_IDLE'
  | 'HAND_RUB'
  | 'HAND_TAP'
  | 'HAND_SCRUB'
  | 'HAND_HOLD'
  | 'HAND_DRAG';

/** What the player physically did with the pointer. */
export type InteractionGesture = 'none' | 'tap' | 'rub' | 'hold';

// ── Unlock requirements ──────────────────────────────────────────────

export type InteractionUnlock =
  | { kind: 'free' }
  | { kind: 'level'; threshold: number }
  | { kind: 'bond'; threshold: number }
  | { kind: 'purchase'; itemId: string };

// ── Stat effects ─────────────────────────────────────────────────────

export interface InteractionStatEffects {
  bond: number;
  happiness: number;
  cleanliness: number;
  trust: number;
  discipline: number;
  stress: number;        // negative = reduces stress
  groomingScore: number;
  xp: number;
}

// ── Interaction definition (data-driven) ─────────────────────────────

export interface InteractionDef {
  id: HandMode;
  name: string;
  description: string;
  icon: string;
  handAnimState: HandAnimState;
  unlockRequirement: InteractionUnlock | null;
  cooldownMs: number;
  durationMs: number;
  spamProtection: { maxPerMinute: number };
  statEffects: Partial<InteractionStatEffects>;
  economyCost: number;
  toolTier: number;
  textFeedback: {
    success: string[];
    neutral: string[];
    fail: string[];
  };
  placeholderLabel: string;
  moodModifiers: Partial<Record<PetMood, number>>;
}

// ── Runtime interaction state (lives in EngineState) ─────────────────

export interface InteractionStreak {
  count: number;
  lastInteractionTime: number;
  lastMode: HandMode;
}

export interface InteractionState {
  activeMode: HandMode;
  isInteracting: boolean;
  /** True while a care mini-game is in progress — prevents END_PET_INTERACTION from killing it. */
  careGameActive: boolean;
  currentInteractionStart: number | null;
  streak: InteractionStreak;
  cooldowns: Record<HandMode, number>;
  usageCounts: Record<HandMode, number>;
  unlockedTools: HandMode[];
  equippedToolTiers: Record<HandMode, number>;
  lastReactionText: string | null;
  petResponseAnim: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

const HAND_MODES: HandMode[] = ['idle', 'pet', 'wash', 'brush', 'comfort', 'train', 'play'];

export function createDefaultInteractionState(): InteractionState {
  const zeroCooldowns = Object.fromEntries(HAND_MODES.map(m => [m, 0])) as Record<HandMode, number>;
  const zeroUsage = Object.fromEntries(HAND_MODES.map(m => [m, 0])) as Record<HandMode, number>;
  const zeroTiers = Object.fromEntries(HAND_MODES.map(m => [m, 0])) as Record<HandMode, number>;

  return {
    activeMode: 'idle',
    isInteracting: false,
    careGameActive: false,
    currentInteractionStart: null,
    streak: { count: 0, lastInteractionTime: 0, lastMode: 'idle' },
    cooldowns: zeroCooldowns,
    usageCounts: zeroUsage,
    unlockedTools: ['pet', 'comfort', 'play'], // free from start
    equippedToolTiers: zeroTiers,
    lastReactionText: null,
    petResponseAnim: null,
  };
}
