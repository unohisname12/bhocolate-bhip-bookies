import React from 'react';
import { PetSprite } from '../components/pet/PetSprite';
import { StakeDisplay } from '../components/battle/StakeDisplay';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { estimateDifficulty, calculateTokenStake } from '../engine/systems/MatchmakingSystem';
import { getPetReadiness } from '../engine/systems/BattleSystem';
import type { ClassmateProfile } from '../types/classroom';
import type { Pet } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface ChallengerPreviewScreenProps {
  opponent: ClassmateProfile;
  playerPet: Pet;
  playerTokens: number;
  ticketCount: number;
  dispatch: (action: GameEngineAction) => void;
  onBack: () => void;
}

const MOOD_DISPLAY: Record<string, { label: string; color: string }> = {
  thriving: { label: 'Thriving', color: 'text-green-400' },
  okay:     { label: 'Doing okay', color: 'text-yellow-400' },
  struggling: { label: 'Struggling', color: 'text-red-400' },
};

const DIFF_DISPLAY: Record<string, { label: string; flavor: string; color: string }> = {
  easier: { label: 'Easier', flavor: 'Reduced rewards', color: 'text-slate-400' },
  even:   { label: 'Even Match', flavor: 'Fair fight!', color: 'text-green-400' },
  harder: { label: 'Harder', flavor: 'Higher risk, higher reward!', color: 'text-orange-400' },
};

export const ChallengerPreviewScreen: React.FC<ChallengerPreviewScreenProps> = ({
  opponent,
  playerPet,
  playerTokens,
  ticketCount,
  dispatch,
  onBack,
}) => {
  const difficulty = estimateDifficulty(playerPet.progression.level, opponent.petSnapshot.level);
  const stake = calculateTokenStake(playerPet.progression.level, opponent.petSnapshot.level, playerTokens);
  const readiness = getPetReadiness(playerPet);
  const isReady = readiness >= 40;
  const mood = MOOD_DISPLAY[opponent.petSnapshot.moodHint] ?? MOOD_DISPLAY.okay;
  const diff = DIFF_DISPLAY[difficulty];

  const wins = opponent.matchHistory.filter(m => m.outcome === 'win').length;
  const losses = opponent.matchHistory.filter(m => m.outcome === 'loss').length;

  const canFight = ticketCount > 0 && isReady && playerPet.state !== 'sick' && playerPet.state !== 'dead';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 max-w-lg mx-auto text-white gap-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <GameButton variant="secondary" size="sm" onClick={onBack}>
          Back
        </GameButton>
        <h1 className="text-lg font-black uppercase tracking-widest text-slate-100">Challenge</h1>
        <div className="w-16" />
      </div>

      {/* Opponent card */}
      <GameCard className="w-full" glow>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden shrink-0">
            <PetSprite speciesId={opponent.petSnapshot.speciesId} animationName="idle" scale={0.7} />
          </div>
          <div className="flex-1">
            <div className="text-lg font-black text-slate-100">{opponent.displayName}</div>
            <div className="text-sm text-slate-400">
              {opponent.petSnapshot.name} — Lv.{opponent.petSnapshot.level}
            </div>
            <div className="text-sm text-slate-400">
              {opponent.petSnapshot.stage} {opponent.petSnapshot.speciesId.replace('_', ' ')}
            </div>
            <div className={`text-sm font-bold ${mood.color}`}>
              Pet mood: {mood.label}
            </div>
          </div>
        </div>
      </GameCard>

      {/* Difficulty */}
      <div className="w-full text-center">
        <span className={`text-lg font-black ${diff.color}`}>{diff.label}</span>
        <p className="text-xs text-slate-400 mt-1">{diff.flavor}</p>
      </div>

      {/* Your record vs this opponent */}
      <div className="text-sm text-slate-400">
        Your record vs {opponent.displayName}: <span className="font-bold text-slate-200">{wins}W {losses}L</span>
      </div>

      {/* Stake display */}
      <StakeDisplay stake={stake} playerTokens={playerTokens} difficulty={difficulty} />

      {/* Readiness */}
      <div className={`w-full text-center text-sm font-bold ${isReady ? 'text-green-400' : 'text-red-400'}`}>
        Your pet readiness: {readiness}% {isReady ? '— Ready!' : '— Too weak to battle'}
      </div>

      {/* Ticket cost */}
      <div className="text-sm text-slate-400">
        <span className="flex items-center gap-1">Cost: 1 <img src="/assets/generated/final/icon_ticket.png" alt="ticket" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} /> ({ticketCount} remaining)</span>
      </div>

      {/* Action buttons */}
      <div className="w-full flex flex-col gap-3 mt-auto pb-4">
        <GameButton
          variant="primary"
          fullWidth
          size="lg"
          disabled={!canFight}
          onClick={() => canFight && dispatch({ type: 'START_PVP_BATTLE', opponentId: opponent.id })}
        >
          {!isReady ? 'Pet Not Ready' : ticketCount <= 0 ? 'No Tickets' : 'Battle!'}
        </GameButton>
        <GameButton variant="secondary" fullWidth onClick={onBack}>
          Cancel
        </GameButton>
      </div>
    </div>
  );
};
