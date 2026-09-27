import type { MathProblem } from './index';

export interface SkillReview {
  skillId: string; topic: string; grade: number; lastQuestionId: string;
  lastPracticed: number; dueAt: number; independentChecks: number; needsFreshCheck: boolean;
}

export interface LearningEvidence {
  practiceSettings?: import('../services/game/curriculum').LearningSettings;
  skillId?: string; templateId?: string; context?: string; answerRevealed?: boolean;
  questionId: string;
  topic: string;
  grade: number;
  source: string;
  attempts: number;
  support: 'none' | 'hint' | 'explanation';
  correct: boolean;
  firstAttemptCorrect: boolean;
  updatedAt: number;
}

export interface WoodlandChapter {
  phase: 'learn' | 'route' | 'care' | 'reward' | 'complete';
  problems: MathProblem[];
  index: number;
  feedback: string;
  route: 'catch' | 'merge' | null;
  deliveries: string[];
  decoration: 'flowers' | 'lanterns' | null;
  startedAt: number;
  completedAt?: number;
  summary?: { questions: number; independent: number; supported: number };
}
