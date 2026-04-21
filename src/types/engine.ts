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
import type { InteractionState } from './interaction';
import type { QuestState } from './quest';
import type { SeasonState } from './season';
import type { CosmeticState } from './cosmetic';
import type { DexState } from './dex';
import type { CampaignState } from './campaign';
import type { EventState } from './event';

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
  interaction: InteractionState;
  quests: QuestState;
  season: SeasonState;
  cosmetics: CosmeticState;
  dex: DexState;
  campaign: CampaignState;
  seasonalEvents: EventState;
  /** Ephemeral UI flag — shows the Daily Ritual "Power Path" modal on app load after midnight rollover. */
  showDailyRitual?: boolean;
  /** Ephemeral UI flag — when true, OnboardingGate mounts the intro tutorial. Set by SHOW_ONBOARDING, cleared by COMPLETE_ONBOARDING. */
  showOnboarding?: boolean;
  /** Ephemeral pre-battle warmup flag — when set, a math question modal gates entry into combat. */
  pendingBattleWarmup?: {
    kind: 'wild' | 'character';
    speciesId?: string;
  } | null;
}
