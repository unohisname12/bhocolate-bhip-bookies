import React from 'react';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { GameIcon } from '../components/ui/GameIcon';
import { TROPHY_ICONS } from '../config/pvpConfig';
import type { MatchResult } from '../types/matchResult';
import type { TokenTrophy } from '../types/trophy';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface MatchResultScreenProps {
  result: MatchResult;
  trophy: TokenTrophy | null;
  dispatch: (action: GameEngineAction) => void;
}

const OUTCOME_DISPLAY: Record<string, { title: string; subtitle: string; titleColor: string }> = {
  win:  { title: 'Victory!', subtitle: 'You won the battle!', titleColor: 'text-yellow-400' },
  loss: { title: 'Defeated', subtitle: 'Better luck next time!', titleColor: 'text-red-400' },
  draw: { title: 'Draw', subtitle: 'Neither side could win.', titleColor: 'text-slate-400' },
  fled: { title: 'Fled', subtitle: 'You retreated from battle.', titleColor: 'text-slate-400' },
};

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  result,
  trophy,
  dispatch,
}) => {
  const display = OUTCOME_DISPLAY[result.outcome] ?? OUTCOME_DISPLAY.loss;
  const isWin = result.outcome === 'win';
  const tokenSign = result.tokensTransferred >= 0 ? '+' : '';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-6 text-white max-w-lg mx-auto">
      {/* Title */}
      <h1 className={`text-4xl font-black uppercase tracking-widest ${display.titleColor}`}>
        {display.title}
      </h1>
      <p className="text-slate-300">{display.subtitle}</p>
      <p className="text-sm text-slate-400">vs {result.opponentPetName}</p>

      {/* Rewards / Penalties */}
      <GameCard className="w-full">
        <div className="flex flex-col gap-3">
          {/* Tokens */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Tokens</span>
            <span className={`text-xl font-black ${isWin ? 'text-amber-400' : 'text-red-400'}`}>
              <span className="flex items-center gap-1">{tokenSign}{result.tokensTransferred} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} /></span>
            </span>
          </div>

          {/* XP */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Experience</span>
            <span className="text-xl font-black text-purple-400">+{result.xpEarned} XP</span>
          </div>

          {/* Turns */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Turns played</span>
            <span className="text-sm font-bold text-slate-400">{result.turnsPlayed}</span>
          </div>

          {/* Math bonus */}
          {result.mathBonusUsed && (
            <div className="text-xs text-indigo-300 font-bold text-center">
              Brain Power bonus was used!
            </div>
          )}
        </div>
      </GameCard>

      {/* Trophy reveal */}
      {trophy && (
        <GameCard className="w-full" glow>
          <div className="flex flex-col items-center gap-2">
            <GameIcon icon={TROPHY_ICONS[trophy.rarity] ?? '🏅'} size="w-12 h-12" className="text-3xl" />
            <span className="text-lg font-black text-yellow-300">{trophy.name}</span>
            <span className="text-xs text-slate-400 capitalize">{trophy.rarity} trophy</span>
            <span className="text-xs text-slate-500">{trophy.description}</span>
          </div>
        </GameCard>
      )}

      {/* Continue */}
      <GameButton
        variant="primary"
        size="lg"
        onClick={() => dispatch({ type: 'END_PVP_BATTLE' })}
      >
        Continue
      </GameButton>
    </div>
  );
};
