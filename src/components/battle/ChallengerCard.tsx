import React from 'react';
import { PetSprite } from '../pet/PetSprite';
import { GameCard } from '../ui/GameCard';
import type { ClassmateProfile, ActivityLevel } from '../../types/classroom';

interface ChallengerCardProps {
  profile: ClassmateProfile;
  playerLevel: number;
  difficulty: 'easier' | 'even' | 'harder';
  canChallenge: boolean;
  cooldownReason?: string;
  onSelect: (id: string) => void;
}

const ACTIVITY_DOT: Record<ActivityLevel, { color: string; pulse: boolean; label: string }> = {
  very_active: { color: 'bg-green-400', pulse: true, label: 'Working hard!' },
  active:      { color: 'bg-green-400', pulse: false, label: 'Playing regularly' },
  moderate:    { color: 'bg-yellow-400', pulse: false, label: 'Checks in sometimes' },
  quiet:       { color: 'bg-gray-400', pulse: false, label: 'Quiet lately' },
};

const MOOD_EMOJI: Record<string, string> = {
  thriving: '🌟',
  okay: '😊',
  struggling: '😟',
};

const DIFFICULTY_BADGE: Record<string, { label: string; color: string }> = {
  easier: { label: 'Easier', color: 'bg-slate-600 text-slate-300' },
  even:   { label: 'Even Match', color: 'bg-green-700 text-green-200' },
  harder: { label: 'Harder', color: 'bg-orange-700 text-orange-200' },
};

const getRecord = (profile: ClassmateProfile): string => {
  const wins = profile.matchHistory.filter(m => m.outcome === 'win').length;
  const losses = profile.matchHistory.filter(m => m.outcome === 'loss').length;
  return `${wins}W ${losses}L`;
};

export const ChallengerCard: React.FC<ChallengerCardProps> = ({
  profile,
  difficulty,
  canChallenge,
  cooldownReason,
  onSelect,
}) => {
  const activity = ACTIVITY_DOT[profile.activityIndicator];
  const diffBadge = DIFFICULTY_BADGE[difficulty];
  const mood = MOOD_EMOJI[profile.petSnapshot.moodHint] ?? '😊';
  const record = getRecord(profile);

  return (
    <GameCard className="flex flex-col gap-2 p-3">
      {/* Top row: sprite + info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center overflow-hidden shrink-0">
          <PetSprite speciesId={profile.petSnapshot.speciesId} animationName="idle" scale={0.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-slate-100 text-sm truncate">{profile.displayName}</div>
          <div className="text-xs text-slate-400">
            Lv.{profile.petSnapshot.level} {profile.petSnapshot.speciesId.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Activity + Mood row */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${activity.color} ${activity.pulse ? 'animate-pulse' : ''}`} />
        <span className="text-slate-400">{activity.label}</span>
        <span className="ml-auto">{mood} {profile.petSnapshot.moodHint}</span>
      </div>

      {/* Difficulty badge */}
      <div className="flex items-center justify-center">
        <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${diffBadge.color}`}>
          {diffBadge.label}
        </span>
      </div>

      {/* Record */}
      <div className="text-xs text-slate-400 text-center">
        Your record: {record}
      </div>

      {/* Challenge button */}
      <button
        className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
          canChallenge
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_3px_0_0] shadow-rose-800 active:shadow-none active:translate-y-0.5'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
        onClick={() => canChallenge && onSelect(profile.id)}
        disabled={!canChallenge}
      >
        {canChallenge ? 'Challenge' : cooldownReason ?? 'Unavailable'}
      </button>
    </GameCard>
  );
};
