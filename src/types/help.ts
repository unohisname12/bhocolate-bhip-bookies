/** Help system types — general helper that can teach any mini-game or feature. */

/** A single step in a first-time tutorial sequence. */
export interface TutorialStep {
  id: string;
  /** Dialogue or instruction text shown to the player. */
  text: string;
  /** CSS selector of the element to spotlight (omit for dialogue-only). */
  target?: string;
  /** Where to position the dialogue bubble relative to the target. */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** What the player must do to advance (tap = click the target, wait = auto-advance). */
  action?: 'tap' | 'drag' | 'wait';
  /** Who is speaking. */
  speaker?: 'guide' | 'narrator';
  /** Spotlight cutout radius in px (default 48). */
  highlightRadius?: number;
}

/** An entry in the on-demand quick-reference panel. */
export interface QuickRefEntry {
  title: string;
  body: string;
  icon?: string;
}

/** A rule for showing contextual micro-hints during gameplay. */
export interface HintRule {
  id: string;
  /** Game event type string that triggers this hint. */
  trigger: string;
  /** Short one-liner shown in the hint toast. */
  text: string;
  /** Stop showing after this many times. */
  maxShows: number;
  /** Minimum ms between consecutive shows. */
  cooldown: number;
}

/** Full help configuration for a single feature/mini-game. */
export interface HelpConfig {
  id: string;
  name: string;
  icon: string;
  tutorial: TutorialStep[];
  quickRef: QuickRefEntry[];
  hints?: HintRule[];
}

/** Persisted help progress tracked in engine state. */
export interface HelpState {
  /** Feature IDs whose tutorials are fully completed. */
  completedTutorials: string[];
  /** Feature IDs the player has encountered (shown in help panel). */
  encounteredFeatures: string[];
  /** Per-hint show counts (key = hintRule.id). */
  hintCounts: Record<string, number>;
  /** Per-hint last-shown timestamps (key = hintRule.id). */
  hintTimestamps: Record<string, number>;
}
