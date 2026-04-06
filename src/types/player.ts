export type QuizOutcome = 'creative' | 'logical' | 'balanced';

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
  };
  unlockedRoomItems: string[];
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