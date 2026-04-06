import type { MatchResult } from '../../types/matchResult';
import type { TokenTrophy } from '../../types/trophy';
import { TROPHY_ICONS, TROPHY_DISPLAY_CONFIGS } from '../../config/pvpConfig';

interface TrophyCheckResult {
  mint: boolean;
  rarity: TokenTrophy['rarity'];
  name: string;
}

export const shouldMintTrophy = (
  matchResult: MatchResult,
  playerWinStreak: number,
  opponentLevel: number,
  playerLevel: number,
  isFirstPvPWin: boolean,
): TrophyCheckResult | null => {
  if (matchResult.outcome !== 'win') return null;

  // First PvP win ever
  if (isFirstPvPWin) {
    return { mint: true, rarity: 'uncommon', name: 'First Victory' };
  }
  // Won against harder opponent (3+ levels above)
  if (opponentLevel >= playerLevel + 3) {
    return { mint: true, rarity: 'rare', name: 'Giant Slayer' };
  }
  // Win streak milestones
  if (playerWinStreak === 10) {
    return { mint: true, rarity: 'epic', name: 'Champion' };
  }
  if (playerWinStreak === 5) {
    return { mint: true, rarity: 'rare', name: 'Unstoppable' };
  }
  if (playerWinStreak === 3) {
    return { mint: true, rarity: 'uncommon', name: 'Triple Threat' };
  }
  // Quick win (under 5 turns)
  if (matchResult.turnsPlayed < 5) {
    return { mint: true, rarity: 'common', name: 'Swift Victory' };
  }
  // Used math bonus and won
  if (matchResult.mathBonusUsed) {
    return { mint: true, rarity: 'common', name: 'Brain Power' };
  }
  return null;
};

export const createTrophy = (
  check: TrophyCheckResult,
  matchResult: MatchResult,
  opponentDisplayName: string,
): TokenTrophy => ({
  id: `trophy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: check.name,
  description: `Earned in battle against ${opponentDisplayName}`,
  icon: TROPHY_ICONS[check.rarity] ?? '🏅',
  rarity: check.rarity,
  earnedAt: new Date().toISOString(),
  matchId: matchResult.id,
  opponentName: opponentDisplayName,
  tokensWon: matchResult.tokensTransferred,
  displayableInRoom: true,
  roomDisplayConfig: TROPHY_DISPLAY_CONFIGS[check.rarity],
});
