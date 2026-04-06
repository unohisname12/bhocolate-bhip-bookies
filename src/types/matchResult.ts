export interface MatchResult {
  id: string;
  date: string;
  playerPetId: string;
  opponentId: string;
  opponentPetName: string;
  outcome: 'win' | 'loss' | 'draw' | 'fled';
  turnsPlayed: number;
  tokensTransferred: number;
  xpEarned: number;
  mathBonusUsed: boolean;
  trophyMinted?: string;
}

/** Anti-farming: tracks repeated matchups */
export interface MatchupTracker {
  opponentId: string;
  recentResults: { date: string; outcome: 'win' | 'loss' | 'draw' | 'fled' }[];
  cooldownUntil?: string;
}
