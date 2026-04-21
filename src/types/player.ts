import type { PowerForgeState } from '../config/powerForgeConfig';

export type QuizOutcome = 'creative' | 'logical' | 'balanced';

/**
 * Math-to-battle "prep" pool.
 * Correct answers accumulate here. On battle start, the whole pool is
 * applied to the player's battle pet (stat boosts + bonus HP) and reset.
 */
export type MathBuffs = {
  atk: number;
  def: number;
  hp: number;
};

export type PlayerProfile = {
  id: string;
  displayName: string;
  activePetId: string | null;
  mathMastery: { // PLACEHOLDER: fully implemented in Step 18
    arithmetic: number;
    geometry: number;
    fractions: number;
  };
  streaks: { // PLACEHOLDER: fully implemented in Step 18
    login: number;
    correctAnswers: number;
  };
  currencies: {
    tokens: number;
    coins: number; // PLACEHOLDER: dual-currency economy fully used in Step 9
    mp: number;
    mpLifetime: number;
    /** Earned from quests; spent on Season Pass tiers. */
    seasonPoints: number;
    /** Gacha duplicate dust — craft missing rares. */
    shards: number;
  };
  /** Math prep carried into the next battle; consumed + reset on battle start. */
  mathBuffs: MathBuffs;
  /** Total correct math answers lifetime — used for evolution thresholds. */
  lifetimeMathCorrect: number;
  /** True once the first-run tutorial has been completed. */
  hasOnboarded: boolean;
  unlockedRoomItems: string[];
  /** Persistent pet buffs bought with MP. */
  powerForge?: PowerForgeState;
  quizOutcome: QuizOutcome | null;
  lastLoginDate?: string; // ISO date string (YYYY-MM-DD)
  pvpRecord?: {
    totalWins: number;
    totalLosses: number;
    currentWinStreak: number;
    bestWinStreak: number;
    totalTokensWon: number;
    totalTokensLost: number;
  };
};