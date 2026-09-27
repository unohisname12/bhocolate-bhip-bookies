import type { CompanionId } from '../config/companionConfig';
import type { MathProblem } from './index';

export type AdventureStyle = 'explore' | 'build' | 'help' | 'wonder';
export interface DiscoveryStamp { day: string; style: AdventureStyle; source: 'mission' | 'classroom' | 'activity' }
export interface EggDiscovery {
  matchingVersion?: 2;
  bonusDays?: number;
  status: 'collecting' | 'matched' | 'claimed';
  startedAt: number;
  /** Choice indexes only. No names, free text, or sensitive personal answers. */
  answers: number[];
  stamps: DiscoveryStamp[];
  candidates: CompanionId[];
  tieBreak: number;
  companion: CompanionId | null;
  teacherChoice?: CompanionId | null;
  mission: { day: string; style: AdventureStyle; problems: MathProblem[]; index: number; feedback: string } | null;
}
