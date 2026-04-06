import React from 'react';
import type { Pet } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { BattlePetSprite } from '../components/battle/BattleEffects';
import { RUN_LENGTH, RUN_ENEMIES } from '../config/runConfig';

interface RunStartScreenProps {
  pet: Pet | null;
  dispatch: (action: GameEngineAction) => void;
}

export const RunStartScreen: React.FC<RunStartScreenProps> = ({ pet, dispatch }) => {
  const canStart = pet && pet.state !== 'sick' && pet.state !== 'dead';
  const bossEnemy = RUN_ENEMIES[RUN_ENEMIES.length - 1];

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #12091f 50%, #0a0a12 100%)' }}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(120,60,200,0.06) 0%, transparent 60%)',
      }} />

      {/* Back button */}
      <div className="relative z-10 px-4 pt-4">
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors px-2 py-1 rounded"
          style={{ background: 'rgba(30,20,40,0.6)', border: '1px solid rgba(100,60,120,0.2)' }}
        >
          Back
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Title */}
        <h1
          className="text-3xl font-black uppercase tracking-[0.15em] mb-1"
          style={{
            textShadow: '0 0 24px rgba(139,92,246,0.4), 0 0 48px rgba(139,92,246,0.15), 0 2px 4px rgba(0,0,0,0.8)',
            color: '#c4b5fd',
          }}
        >
          Dungeon Run
        </h1>
        <p className="text-slate-500 text-xs mb-8 text-center max-w-[240px]">
          Fight through {RUN_LENGTH - 1} enemies and defeat the boss. HP carries between fights.
        </p>

        {/* Pet preview */}
        {pet && (
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full blur-xl" style={{
              background: 'radial-gradient(circle, rgba(100,60,200,0.12) 0%, transparent 70%)',
              transform: 'scale(2)',
            }} />
            <div className="relative">
              <BattlePetSprite speciesId={pet.speciesId} />
            </div>
          </div>
        )}

        {/* Run structure preview */}
        <div className="w-full max-w-xs mb-6">
          <div className="flex items-center justify-center gap-1 mb-4">
            {Array.from({ length: RUN_LENGTH }).map((_, i) => {
              const isBossNode = i === RUN_LENGTH - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <div className="h-px w-5 bg-slate-700/40" />}
                  <div
                    className={`rounded-full flex items-center justify-center font-black text-[7px] ${
                      isBossNode ? 'bg-red-900/60 text-red-400' : 'bg-slate-800/60 text-slate-500'
                    }`}
                    style={{
                      width: isBossNode ? 26 : 20,
                      height: isBossNode ? 26 : 20,
                      border: isBossNode ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(100,80,140,0.15)',
                    }}
                  >
                    {isBossNode ? 'B' : i + 1}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-2.5 text-center"
              style={{ background: 'rgba(20,15,30,0.8)', border: '1px solid rgba(80,60,120,0.15)' }}>
              <div className="text-xl font-black text-violet-400">{RUN_LENGTH - 1}</div>
              <div className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Fights</div>
            </div>
            <div className="rounded-lg p-2.5 text-center"
              style={{ background: 'rgba(20,15,30,0.8)', border: '1px solid rgba(80,60,120,0.15)' }}>
              <div className="text-xl font-black text-red-400">1</div>
              <div className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Boss</div>
            </div>
            <div className="rounded-lg p-2.5 text-center"
              style={{ background: 'rgba(20,15,30,0.8)', border: '1px solid rgba(80,60,120,0.15)' }}>
              <div className="text-xl font-black text-amber-400">3</div>
              <div className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Rewards</div>
            </div>
          </div>
        </div>

        {/* Boss teaser */}
        <div className="text-center mb-6">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-red-500/50">
            Final Boss: {bossEnemy.name}
          </span>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="relative z-10 px-6 pb-8 flex flex-col gap-2">
        <button
          onClick={() => dispatch({ type: 'START_RUN' })}
          disabled={!canStart}
          className="w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-lg transition-all duration-200 active:scale-95"
          style={{
            background: canStart
              ? 'linear-gradient(180deg, #6d28d9 0%, #4c1d95 100%)'
              : 'rgba(30,25,40,0.8)',
            boxShadow: canStart
              ? '0 0 28px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset'
              : 'none',
            border: canStart
              ? '1px solid rgba(167,139,250,0.3)'
              : '1px solid rgba(100,80,140,0.15)',
            textShadow: canStart ? '0 2px 4px rgba(0,0,0,0.5)' : undefined,
            color: canStart ? '#fff' : '#475569',
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          Enter Dungeon
        </button>

        {!canStart && pet && (
          <p className="text-red-400/60 text-[10px] text-center">Your pet must be healthy to enter.</p>
        )}
      </div>
    </div>
  );
};
