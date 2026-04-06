import type { Pet } from './pet';
import type { Egg } from './pet';
import type { PlayerProfile } from './player';
import type { SessionState, ScreenName } from './session';
import type { Inventory } from './inventory';
import type { Room, RoomId } from './room';
import type { GameEvent } from './events';
import type { AchievementProgress } from './achievement';
import type { BattleState } from './battle';
import type { MomentumState } from './momentum';
import type { ClassroomState } from './classroom';
import type { BattleTicketState } from './battleTicket';
import type { MatchResult, MatchupTracker } from './matchResult';
import type { TrophyCase } from './trophy';
import type { HelpState } from './help';
import type { RunState } from './run';

export type EngineMode = 'normal' | 'test';

export interface DailyGoals {
  date: string;           // YYYY-MM-DD — reset trigger
  mathSolved: number;     // problems answered correctly today
  battlesWon: number;     // battles won today
  rewardClaimed: boolean; // prevents double-awarding
}

export interface AnimationState {
  animationName: string;
  frameIndex: number;
  frameCount: number;
  frameDurationMs: number;
  elapsedMs: number;
  autoplay: boolean;
  isFinished: boolean;
}

export interface TestState {
  active: boolean;
  label: string;
}

export interface MailboxState {
  lastClaimedDate: string;    // YYYY-MM-DD — one claim per day
  totalClaimed: number;       // lifetime count (for scaling rewards)
}

export interface EngineState {
  initialized: boolean;
  mode: EngineMode;
  screen: ScreenName; // ScreenName defined in types/session.ts
  elapsedMs: number;
  tickCount: number;
  engineTime: number;
  pet: Pet | null;
  egg: Egg | null; // Egg defined in types/pet.ts
  player: PlayerProfile;
  session: SessionState;
  animation: AnimationState;
  test: TestState;
  inventory: Inventory;
  room: Room;
  currentRoom: RoomId;
  battle: BattleState;
  run: RunState;
  momentum: MomentumState;
  events: GameEvent[];
  achievements: AchievementProgress[];
  notifications: { id: string; message: string; icon: string; timestamp: number }[];
  lastUpdate: number | null;
  dailyGoals: DailyGoals;
  classroom: ClassroomState;
  battleTickets: BattleTicketState;
  matchHistory: MatchResult[];
  matchupTrackers: MatchupTracker[];
  trophyCase: TrophyCase;
  mailbox: MailboxState;
  help: HelpState;
}
