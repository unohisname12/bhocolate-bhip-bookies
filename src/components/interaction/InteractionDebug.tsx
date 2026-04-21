import React, { useState, useEffect } from 'react';
import { INTERACTION_ORDER } from '../../config/interactionConfig';
import { getCooldownRemaining, calculateMoodMultiplier, getStreakMultiplier } from '../../engine/systems/InteractionSystem';
import type { InteractionState } from '../../types/interaction';
import type { Pet } from '../../types';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface InteractionDebugProps {
  interaction: InteractionState;
  pet: Pet;
  playerTokens: number;
  dispatch: (action: GameEngineAction) => void;
  reactionPhase?: string;
}

/**
 * Debug overlay for the interaction system. Toggle with I key.
 *
 * Shows all interaction state, cooldowns, pet stats, and provides
 * quick-action buttons for testing.
 */
export const InteractionDebug: React.FC<InteractionDebugProps> = ({
  interaction, pet, playerTokens, dispatch, reactionPhase,
}) => {
  const [, setTick] = useState(0);

  // Refresh every 500ms for live cooldown display
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  const moodMult = interaction.activeMode !== 'idle'
    ? calculateMoodMultiplier(pet, interaction.activeMode).toFixed(2)
    : '—';

  const streakMult = getStreakMultiplier(interaction.streak).toFixed(1);

  return (
    <div
      className="fixed top-16 left-3 pointer-events-auto overflow-y-auto"
      style={{
        zIndex: 100,
        width: 280,
        maxHeight: 'calc(100vh - 100px)',
        background: 'rgba(0,0,0,0.92)',
        border: '1px solid rgba(140,100,255,0.4)',
        borderRadius: 8,
        padding: 10,
        fontSize: 10,
        fontFamily: 'monospace',
        color: 'rgba(200,200,220,0.9)',
        lineHeight: 1.6,
      }}
    >
      <div className="text-purple-300 font-bold text-xs mb-1 uppercase tracking-wider">
        Interaction Debug
      </div>

      {/* Current state */}
      <div className="mb-2 border-b border-slate-700/50 pb-2">
        <Row label="Mode" value={interaction.activeMode} color={interaction.activeMode !== 'idle' ? '#a78bfa' : '#94a3b8'} />
        <Row label="Interacting" value={interaction.isInteracting ? 'YES' : 'no'} color={interaction.isInteracting ? '#4ade80' : '#94a3b8'} />
        <Row label="Reaction" value={reactionPhase ?? 'idle'} />
        <Row label="Streak" value={`${interaction.streak.count} (${streakMult}x)`} />
        <Row label="Mood Mult" value={moodMult} />
        <Row label="Tokens" value={String(playerTokens)} color="#fbbf24" />
      </div>

      {/* Cooldowns */}
      <div className="mb-2 border-b border-slate-700/50 pb-2">
        <div className="text-slate-400 text-[9px] uppercase mb-0.5">Cooldowns</div>
        <div className="flex flex-wrap gap-x-3">
          {INTERACTION_ORDER.map(mode => {
            const cd = getCooldownRemaining(interaction, mode);
            const ready = cd === 0;
            return (
              <span key={mode} style={{ color: ready ? '#4ade80' : '#f87171' }}>
                {mode.slice(0, 4)}: {ready ? 'RDY' : `${Math.ceil(cd / 1000)}s`}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pet interaction stats */}
      <div className="mb-2 border-b border-slate-700/50 pb-2">
        <div className="text-slate-400 text-[9px] uppercase mb-0.5">Pet Stats</div>
        <Row label="Trust" value={String(Math.round(pet.trust ?? 20))} />
        <Row label="Discipline" value={String(Math.round(pet.discipline ?? 0))} />
        <Row label="Grooming" value={String(Math.round(pet.groomingScore ?? 50))} />
        <Row label="Stress" value={String(Math.round(pet.stress ?? 0))} color={(pet.stress ?? 0) > 50 ? '#f87171' : undefined} />
        <Row label="Bond" value={String(Math.round(pet.bond))} color="#c084fc" />
        <Row label="Mood" value={pet.mood} />
      </div>

      {/* Unlocks */}
      <div className="mb-2 border-b border-slate-700/50 pb-2">
        <div className="text-slate-400 text-[9px] uppercase mb-0.5">Unlocks</div>
        <div className="flex flex-wrap gap-1">
          {INTERACTION_ORDER.map(mode => {
            const unlocked = interaction.unlockedTools.includes(mode);
            return (
              <span
                key={mode}
                className="px-1 rounded text-[9px]"
                style={{
                  background: unlocked ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                  color: unlocked ? '#4ade80' : '#f87171',
                  border: `1px solid ${unlocked ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}
              >
                {mode}
              </span>
            );
          })}
        </div>
        <div className="text-slate-500 text-[9px] mt-0.5">
          Tiers: {INTERACTION_ORDER.map(m => `${m[0]}:${interaction.equippedToolTiers[m]}`).join(' ')}
        </div>
      </div>

      {/* Last reaction */}
      {interaction.lastReactionText && (
        <div className="mb-2 border-b border-slate-700/50 pb-2">
          <div className="text-slate-400 text-[9px] uppercase mb-0.5">Last Reaction</div>
          <div className="text-green-300 italic">"{interaction.lastReactionText}"</div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="text-slate-400 text-[9px] uppercase mb-1">Quick Actions</div>
        <div className="flex flex-wrap gap-1">
          <DebugBtn label="Unlock All" onClick={() => {
            INTERACTION_ORDER.forEach(mode => {
              dispatch({ type: 'UNLOCK_INTERACTION', mode });
            });
          }} />
          <DebugBtn label="Reset CDs" onClick={() => {
            // Force reset by setting hand mode (triggers state refresh)
            dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
          }} />
          <DebugBtn label="+100 Tokens" onClick={() => {
            dispatch({ type: 'AWARD_TOKENS', amount: 100 });
          }} />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {INTERACTION_ORDER.map(mode => (
            <DebugBtn
              key={mode}
              label={`Force ${mode}`}
              onClick={() => dispatch({ type: 'START_PET_INTERACTION', mode })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between">
    <span className="text-slate-500">{label}:</span>
    <span style={{ color: color ?? 'inherit' }} className="font-bold">{value}</span>
  </div>
);

const DebugBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-300 hover:text-white transition-colors"
    style={{
      background: 'rgba(60,50,100,0.5)',
      border: '1px solid rgba(100,80,180,0.3)',
    }}
  >
    {label}
  </button>
);
