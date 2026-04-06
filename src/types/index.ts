// Re-export types from domain-specific files
import type { PlayerProfile } from './player';
import type { Pet, Egg } from './pet';
import type { SessionState, ScreenName } from './session';

export * from './player';
export * from './pet';
export * from './session';
export * from './events';
export * from './engine';
export * from './inventory';
export * from './room';
export * from './achievement';
export * from './battle';
export * from './classroom';
export * from './battleTicket';
export * from './matchResult';
export * from './trophy';
export * from './momentum';
export * from './help';

// GameScreen is the union of all navigable screens — matches EngineState.screen
export type GameScreen = ScreenName;

export interface GameState {
  player: PlayerProfile;
  pet: Pet | null;
  egg: Egg | null;
  session: SessionState;
}

export interface FoodItem {
  id: string;
  icon: string;
  label: string;
  cost: number;
  nutrition: number;
}

export interface CareActionConfig {
  id: 'feed' | 'play' | 'heal' | 'train' | 'clean';
  label: string;
  cost: number;
  impact: number;
}

export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface CareLog {
  id: string;
  petId: string;
  action: 'feed' | 'clean' | 'train' | 'play';
  timestamp: number;
}

export interface MathProblem {
  id: string;
  question: string;
  answer: number;
  difficulty: number;
  reward: number;
  hint?: string;
  type?: string;
}
