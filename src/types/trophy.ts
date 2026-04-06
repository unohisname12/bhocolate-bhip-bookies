/** A token trophy earned from PvP victories. Displayable in room. */
export interface TokenTrophy {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  earnedAt: string;
  matchId: string;
  opponentName: string;
  tokensWon: number;
  displayableInRoom: boolean;
  roomDisplayConfig?: {
    spriteKey: string;
    width: number;
    height: number;
  };
}

export interface TrophyCase {
  trophies: TokenTrophy[];
  displayedInRoom: string[];
  maxDisplay: number;
}
