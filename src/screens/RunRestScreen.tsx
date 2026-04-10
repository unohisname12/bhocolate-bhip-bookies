import React from 'react';
import type { ActiveRunState } from '../types/run';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { BattlePetSprite } from '../components/battle/BattleEffects';
import { LeaveDungeonButton } from '../components/run/LeaveDungeonButton';
import type { Pet } from '../types';

interface RunRestScreenProps {
  run: ActiveRunState;
  pet: Pet | null;
  dispatch: (action: GameEngineAction) => void;
}

const WHISPERS = [
  'The equations here hold steady. For now.',
  "Your Auralith's form solidifies in the calm.",
  'You feel the fracture pulsing in the distance.',
  'A faint harmonic resonance fills the air.',
  'The instability quiets, if only for a moment.',
  'Equation energy drifts upward like embers.',
  'Structure reasserts itself in this pocket of calm.',
];

export const RunRestScreen: React.FC<RunRestScreenProps> = ({ run, pet, dispatch }) => {
  const hpPercent = Math.round(run.playerHPPercent * 100);
  const whisper = WHISPERS[Math.abs(run.seed) % WHISPERS.length];

  return (
    <div
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #0a1025 40%, #0a0a12 100%)' }}
    >
      {/* Calm atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(60,80,180,0.08) 0%, transparent 60%)',
      }} />

      <LeaveDungeonButton dispatch={dispatch} />

      {/* Top label */}
      <div className="relative z-10 px-4 pt-4 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400/60">
          Rest Node
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Pet sprite with calming glow */}
        {pet && (
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full blur-2xl" style={{
              background: 'radial-gradient(circle, rgba(60,80,180,0.15) 0%, transparent 70%)',
              transform: 'scale(1.8)',
            }} />
            <div className="relative" style={{ animation: 'pulse 3s ease-in-out infinite' }}>
              <BattlePetSprite speciesId={pet.speciesId} />
            </div>
          </div>
        )}

        {/* Whisper text */}
        <p className="text-slate-500 text-xs mb-6 text-center italic max-w-[260px]">
          "{whisper}"
        </p>

        {/* HP display */}
        <div
          className="w-full max-w-xs rounded-lg p-3 mb-6"
          style={{
            background: 'linear-gradient(180deg, rgba(20,15,30,0.9) 0%, rgba(15,10,25,0.95) 100%)',
            border: '1px solid rgba(60,80,120,0.2)',
          }}
        >
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            <span>Current HP</span>
            <span className={hpPercent <= 25 ? 'text-red-400' : hpPercent <= 50 ? 'text-yellow-400' : 'text-green-400'}>
              {hpPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${hpPercent}%`, transition: 'width 0.3s ease' }}
            />
          </div>
        </div>

        {/* Three rest options */}
        <div className="w-full max-w-xs flex flex-col gap-2">
          {/* Rest (safe) */}
          <button
            onClick={() => dispatch({ type: 'REST_LIGHT' })}
            className="w-full rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,20,0.9) 0%, rgba(15,25,15,0.95) 100%)',
              border: '1px solid rgba(34,197,94,0.2)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-sm font-black text-green-400 mb-0.5">Rest</div>
            <div className="text-[9px] text-slate-500">Heal 20% HP. Safe and reliable.</div>
          </button>

          {/* Stabilize (risky) */}
          <button
            onClick={() => dispatch({ type: 'REST_STABILIZE' })}
            className="w-full rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,40,0.9) 0%, rgba(15,15,35,0.95) 100%)',
              border: '1px solid rgba(100,80,200,0.2)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-sm font-black text-violet-400 mb-0.5">Stabilize</div>
            <div className="text-[9px] text-slate-500">
              Trace event. Miss: 10% heal. Basic: 20%. Good: 30%. Perfect: 40%.
            </div>
            <div className="text-[8px] text-violet-500/60 mt-1">Higher ceiling, but miss heals less than Rest.</div>
          </button>

          {/* Fortify (preparation) */}
          <button
            onClick={() => dispatch({ type: 'REST_FORTIFY' })}
            className="w-full rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(180deg, rgba(30,20,15,0.9) 0%, rgba(25,15,10,0.95) 100%)',
              border: '1px solid rgba(180,120,50,0.2)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-sm font-black text-amber-400 mb-0.5">Fortify</div>
            <div className="text-[9px] text-slate-500">
              No healing. Gain 2-turn DEF buff + 10 bonus energy for next fight.
            </div>
            <div className="text-[8px] text-amber-500/60 mt-1">Prepare for a tough encounter ahead.</div>
          </button>
        </div>
      </div>

      {/* Instability reduction note */}
      <div className="relative z-10 px-6 pb-6 pt-2 text-center">
        <span className="text-[8px] text-slate-600">
          Resting reduces instability by 1.
        </span>
      </div>
    </div>
  );
};
