import React from 'react';
import type { Pet } from '../types';
import type { RunState } from '../types/run';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { RUN_LENGTH } from '../config/runConfig';

interface RunOverScreenProps {
  run: RunState;
  pet: Pet | null;
  dispatch: (action: GameEngineAction) => void;
}

export const RunOverScreen: React.FC<RunOverScreenProps> = ({ run, pet, dispatch }) => {
  const isVictory = run.active && run.phase === 'run_victory';
  const encountersWon = run.active ? run.encountersWon : 0;
  const playerLevel = pet?.progression.level ?? 1;

  const tokenReward = encountersWon * playerLevel * 5;
  const xpReward = encountersWon * playerLevel * 8;

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{
        background: isVictory
          ? 'linear-gradient(180deg, #0a0a12 0%, #1a1505 40%, #12091f 100%)'
          : 'linear-gradient(180deg, #0a0a12 0%, #1a0808 40%, #0a0a12 100%)',
      }}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: isVictory
          ? 'radial-gradient(ellipse at 50% 35%, rgba(200,150,40,0.08) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at 50% 35%, rgba(180,30,30,0.06) 0%, transparent 60%)',
      }} />

      {/* Top label */}
      <div className="relative z-10 px-4 pt-4 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60">
          Dungeon Run
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Result */}
        <h1
          className="text-3xl font-black uppercase tracking-wider mb-1"
          style={{
            textShadow: isVictory
              ? '0 0 24px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.8)'
              : '0 0 16px rgba(220,38,38,0.4), 0 2px 4px rgba(0,0,0,0.8)',
            color: isVictory ? '#fbbf24' : '#f87171',
          }}
        >
          {isVictory ? 'Dungeon Cleared' : 'Defeated'}
        </h1>
        <p className="text-slate-500 text-xs mb-8">
          {isVictory ? 'You conquered all encounters!' : 'Your run has ended.'}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {Array.from({ length: RUN_LENGTH }).map((_, i) => {
            const isWon = i < encountersWon;
            const isBossNode = i === RUN_LENGTH - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className={`h-px w-5 ${isWon ? 'bg-violet-500/50' : 'bg-slate-800/50'}`} />
                )}
                <div
                  className={`rounded-full flex items-center justify-center font-black text-[7px] ${
                    isWon ? 'bg-violet-600 text-violet-200' : 'bg-slate-800/50 text-slate-700'
                  }`}
                  style={{
                    width: isBossNode ? 24 : 18,
                    height: isBossNode ? 24 : 18,
                    border: isWon ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(60,50,80,0.2)',
                  }}
                >
                  {isBossNode ? 'B' : i + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Stats card */}
        <div
          className="w-full max-w-xs rounded-xl p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(20,15,30,0.9) 0%, rgba(15,10,25,0.95) 100%)',
            border: '1px solid rgba(80,60,120,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Encounters Won</span>
              <span className="text-base font-black text-white">{encountersWon}/{RUN_LENGTH}</span>
            </div>
            <div className="border-t border-slate-800/60" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tokens</span>
              <span className="text-base font-black text-yellow-400">+{tokenReward}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">XP</span>
              <span className="text-base font-black text-cyan-400">+{xpReward}</span>
            </div>
          </div>

          {/* Bonuses used */}
          {run.active && (run.bonuses.maxEnergyBonus > 0 || run.bonuses.statBonus > 0 || run.bonuses.utilityEffects.length > 0) && (
            <div className="border-t border-slate-800/60 mt-3 pt-3">
              <div className="text-[8px] uppercase font-bold text-slate-700 tracking-[0.2em] mb-1.5">Bonuses Used</div>
              <div className="flex gap-1 flex-wrap">
                {run.bonuses.maxEnergyBonus > 0 && (
                  <span className="text-[8px] font-bold text-cyan-400/60 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                    +{run.bonuses.maxEnergyBonus} EN
                  </span>
                )}
                {run.bonuses.statBonus > 0 && (
                  <span className="text-[8px] font-bold text-amber-400/60 bg-amber-950/30 px-1.5 py-0.5 rounded">
                    +{run.bonuses.statBonus} STR/DEF
                  </span>
                )}
                {run.bonuses.utilityEffects.map(e => (
                  <span key={e} className="text-[8px] font-bold text-violet-400/60 bg-violet-950/30 px-1.5 py-0.5 rounded capitalize">
                    {e.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom button */}
      <div className="relative z-10 px-6 pb-8 pt-4">
        <button
          onClick={() => dispatch({ type: 'END_RUN' })}
          className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-95"
          style={{
            background: 'linear-gradient(180deg, rgba(40,30,60,0.9) 0%, rgba(25,18,40,0.95) 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
            border: '1px solid rgba(100,70,150,0.2)',
            color: '#94a3b8',
          }}
        >
          Return Home
        </button>
      </div>
    </div>
  );
};
