import React, { useMemo, useState } from 'react';
import { ChallengerCard } from '../components/battle/ChallengerCard';
import { TicketDisplay } from '../components/battle/TicketDisplay';
import { GameButton } from '../components/ui/GameButton';
import { estimateDifficulty, canChallenge, shuffleArray } from '../engine/systems/MatchmakingSystem';
import type { ClassmateProfile } from '../types/classroom';
import type { BattleTicketState } from '../types/battleTicket';
import type { MatchupTracker } from '../types/matchResult';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface ClassRosterScreenProps {
  classmates: ClassmateProfile[];
  playerLevel: number;
  ticketState: BattleTicketState;
  matchupTrackers: MatchupTracker[];
  dispatch: (action: GameEngineAction) => void;
  onBack: () => void;
  onPractice: () => void;
}

export const ClassRosterScreen: React.FC<ClassRosterScreenProps> = ({
  classmates,
  playerLevel,
  ticketState,
  matchupTrackers,
  dispatch,
  onBack,
  onPractice,
}) => {
  const [now] = useState(() => Date.now());
  const hasTickets = ticketState.tickets.length > 0;
  const battlesRemaining = 3 - ticketState.todayUsed;

  const shuffledClassmates = useMemo(() => shuffleArray(classmates), [classmates]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 max-w-lg mx-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <GameButton variant="secondary" size="sm" onClick={onBack}>
          Back
        </GameButton>
        <h1 className="text-xl font-black uppercase tracking-widest text-slate-100">Arena</h1>
        <TicketDisplay ticketState={ticketState} />
      </div>

      {/* Status bar */}
      {!hasTickets && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-amber-900/40 border border-amber-600 text-center text-sm text-amber-200">
          No tickets! Earn tickets through math, pet care, or daily goals.
        </div>
      )}
      {battlesRemaining <= 0 && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-red-900/40 border border-red-600 text-center text-sm text-red-200">
          Daily PvP limit reached. Come back tomorrow!
        </div>
      )}

      {/* Roster grid */}
      {shuffledClassmates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-400 text-center">No classmates yet!</p>
          <GameButton variant="primary" onClick={() => dispatch({ type: 'GENERATE_CLASSROOM' })}>
            Find Classmates
          </GameButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pb-20">
          {shuffledClassmates.map((mate) => {
            const diff = estimateDifficulty(playerLevel, mate.petSnapshot.level);
            const challengeCheck = canChallenge(matchupTrackers, mate.id, now);
            const canFight = hasTickets && battlesRemaining > 0 && challengeCheck.allowed;

            return (
              <ChallengerCard
                key={mate.id}
                profile={mate}
                playerLevel={playerLevel}
                difficulty={diff}
                canChallenge={canFight}
                cooldownReason={
                  !hasTickets ? 'No tickets'
                  : battlesRemaining <= 0 ? 'Daily limit'
                  : challengeCheck.reason
                }
                onSelect={(id) => dispatch({ type: 'SELECT_OPPONENT', opponentId: id })}
              />
            );
          })}
        </div>
      )}

      {/* Practice button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-700">
        <div className="max-w-lg mx-auto flex gap-3">
          <GameButton variant="secondary" fullWidth onClick={onPractice}>
            Practice (Free)
          </GameButton>
          <GameButton variant="secondary" size="sm" onClick={() => dispatch({ type: 'REFRESH_CLASSMATES' })}>
            Refresh
          </GameButton>
        </div>
      </div>
    </div>
  );
};
