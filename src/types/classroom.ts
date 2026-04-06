import type { PetStage } from './pet';

/** A classroom groups students. Local-first: generated once, persisted in EngineState. */
export interface Classroom {
  id: string;
  name: string;
  createdAt: string;
  memberIds: string[];
  schoolId?: string;
}

/** The LIMITED view of an opponent's pet. Exact stats are hidden. */
export interface PetSnapshot {
  name: string;
  speciesId: string;
  stage: PetStage;
  level: number;
  moodHint: 'thriving' | 'okay' | 'struggling';
}

/** Fuzzy effort signal - NOT a power ranking */
export type ActivityLevel = 'very_active' | 'active' | 'moderate' | 'quiet';

/** What the local player stores about each classmate. */
export interface ClassmateProfile {
  id: string;
  displayName: string;
  petSnapshot: PetSnapshot;
  activityIndicator: ActivityLevel;
  lastActiveDate: string;
  isNPC: boolean;
  matchHistory: MatchHistoryEntry[];
}

export interface MatchHistoryEntry {
  matchId: string;
  date: string;
  outcome: 'win' | 'loss' | 'draw' | 'fled';
  turnsPlayed: number;
}

/** What a ChallengerCard displays to the player */
export interface ChallengerCard {
  classmateId: string;
  displayName: string;
  petSnapshot: PetSnapshot;
  activityIndicator: ActivityLevel;
  canChallenge: boolean;
  cooldownReason?: string;
  estimatedDifficulty: 'easier' | 'even' | 'harder';
}

export interface ClassroomState {
  classroom: Classroom | null;
  classmates: ClassmateProfile[];
  selectedOpponentId: string | null;
  lastRosterRefresh: string;
}
