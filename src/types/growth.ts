import type { MathProblem } from './index';
export type CareTask = 'feed' | 'clean' | 'play';
export interface CareDay { day: string; tasks: CareTask[] }
export interface PetGrowth {
  startedAt: number;
  stageStartedAt: number;
  careDays: CareDay[];
  lastGiftDay?: string;
  lastExpeditionDay?: string;
}
export interface GrowthTrial {
  petId: string;
  stage: string;
  kind: 'evolution' | 'expedition';
  problems: MathProblem[];
  index: number;
  feedback: string;
  complete: boolean;
}
