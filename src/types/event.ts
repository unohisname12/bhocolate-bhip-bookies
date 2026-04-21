/**
 * Seasonal / holiday events (Phase 4 foundation). Each event is date-gated;
 * the EventSystem returns which events are currently active. UI uses this
 * to show event-only cosmetics in the gacha or quest pools.
 *
 * NOTE: not the same as GameEvent (types/events.ts) which is telemetry.
 */

export interface SeasonalEvent {
  id: string;
  name: string;
  theme: 'spring' | 'summer' | 'autumn' | 'winter' | 'custom';
  icon: string;
  blurb: string;
  /** YYYY-MM-DD (inclusive). */
  startDate: string;
  /** YYYY-MM-DD (inclusive). */
  endDate: string;
  /** IDs of cosmetics, quests, room backgrounds introduced this event. */
  rewardPool: string[];
}

export interface EventState {
  /** Event IDs the player has participated in (claimed at least 1 reward). */
  participated: string[];
  /** Per-event progress (kept even after event ends for trophy display). */
  progress: { eventId: string; points: number }[];
}
