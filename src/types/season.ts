export type SeasonRewardKind =
  | { kind: 'tokens'; amount: number }
  | { kind: 'coins'; amount: number }
  | { kind: 'shards'; amount: number }
  | { kind: 'cosmetic'; cosmeticId: string }
  | { kind: 'title'; titleId: string }
  | { kind: 'room_bg'; backgroundId: string };

export interface SeasonTier {
  tier: number;
  pointsRequired: number;
  reward: SeasonRewardKind;
  label: string;
}

export interface SeasonDefinition {
  id: string;
  name: string;
  /** Theme flavor — kids see this on the season pass screen. */
  theme: string;
  /** ISO date string — the season starts on this day. */
  startDate: string;
  /** Length in days (default 42 = 6 weeks). */
  lengthDays: number;
  tiers: SeasonTier[];
}

export interface SeasonState {
  /** ID of the current active season (matches SeasonDefinition.id). */
  activeSeasonId: string;
  /** Earned season points this season — never goes down. */
  points: number;
  /** Tiers already claimed in this season. */
  claimedTiers: number[];
  /** Earned titles across all seasons (survives season rollover). */
  titles: string[];
}
