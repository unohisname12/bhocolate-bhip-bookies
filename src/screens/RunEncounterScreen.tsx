import React, { useState } from 'react';
import type { Pet } from '../types';
import type { ActiveRunState } from '../types/run';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { BattlePetSprite } from '../components/battle/BattleEffects';
import { getEnemyForEncounter, RUN_LENGTH } from '../config/runConfig';
import { getEnemyById } from '../config/runEnemyConfig';
import { getNodeById } from '../engine/systems/RunMapGenerator';

interface RunEncounterScreenProps {
  run: ActiveRunState;
  pet: Pet | null;
  dispatch: (action: GameEngineAction) => void;
}

export const RunEncounterScreen: React.FC<RunEncounterScreenProps> = ({ run, dispatch }) => {
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  // Use V2 enemy lookup if available, fallback to V1
  const v2Enemy = run.currentEnemyId ? getEnemyById(run.currentEnemyId) : null;
  const enemy = v2Enemy ?? getEnemyForEncounter(run.currentEncounter);
  const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
  const isBoss = currentNode?.type === 'boss' || run.currentEncounter >= RUN_LENGTH - 1;
  const hpPercent = Math.round(run.playerHPPercent * 100);

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #12091f 40%, #1a0a0a 70%, #0a0a12 100%)' }}
    >
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(100,50,180,0.08) 0%, transparent 70%)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(100,80,160,0.03) 60px, rgba(100,80,160,0.03) 61px)',
      }} />

      {/* Top bar — run progress */}
      <div className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setConfirmRetreat(true)}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded"
            style={{ background: 'rgba(30,20,40,0.6)', border: '1px solid rgba(100,60,120,0.2)' }}
          >
            Retreat
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60">
            Dungeon Run
          </span>
        </div>

        {/* Stage progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {Array.from({ length: RUN_LENGTH }).map((_, i) => {
            const isCompleted = i < run.currentEncounter;
            const isCurrent = i === run.currentEncounter;
            const isBossNode = i === RUN_LENGTH - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className={`h-px w-6 ${isCompleted ? 'bg-violet-500/50' : 'bg-slate-700/50'}`} />
                )}
                <div
                  className={`
                    rounded-full flex items-center justify-center font-black text-[8px]
                    ${isCurrent ? 'ring-2 ring-violet-400/50 ring-offset-1 ring-offset-transparent' : ''}
                    ${isCompleted ? 'bg-violet-600 text-violet-200' : ''}
                    ${isCurrent && !isCompleted ? (isBossNode ? 'bg-red-800 text-red-200' : 'bg-amber-700 text-amber-200') : ''}
                    ${!isCompleted && !isCurrent ? 'bg-slate-800 text-slate-600' : ''}
                  `}
                  style={{ width: isBossNode ? 28 : 22, height: isBossNode ? 28 : 22 }}
                >
                  {isBossNode ? 'B' : i + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Encounter type label */}
        <div className="mb-4">
          <span
            className={`text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full ${
              isBoss
                ? 'text-red-300 bg-red-950/60'
                : 'text-amber-300/80 bg-amber-950/40'
            }`}
            style={{
              border: isBoss ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(180,130,50,0.2)',
              textShadow: isBoss ? '0 0 8px rgba(220,38,38,0.4)' : undefined,
            }}
          >
            {isBoss ? 'BOSS ENCOUNTER' : `ENCOUNTER ${run.currentEncounter + 1}`}
          </span>
        </div>

        {/* Enemy sprite with glow */}
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-full blur-2xl" style={{
            background: isBoss
              ? 'radial-gradient(circle, rgba(180,30,30,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(120,80,200,0.15) 0%, transparent 70%)',
            transform: 'scale(1.5)',
          }} />
          <div className="relative">
            <BattlePetSprite speciesId={enemy.speciesId} flip />
          </div>
        </div>

        {/* Enemy name + description */}
        <h2
          className={`text-2xl font-black uppercase tracking-wide mb-1 ${isBoss ? 'text-red-400' : 'text-slate-100'}`}
          style={{
            textShadow: isBoss
              ? '0 0 16px rgba(220,38,38,0.5), 0 2px 4px rgba(0,0,0,0.8)'
              : '0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          {enemy.name}
        </h2>
        <p className="text-slate-500 text-xs mb-3 max-w-[260px] text-center italic">
          "{enemy.description}"
        </p>

        {/* Counterplay hint / passive effect */}
        {enemy.counterplayHint && (
          <div
            className="rounded-md px-3 py-1.5 mb-6 max-w-[280px]"
            style={{
              background: isBoss ? 'rgba(120,30,30,0.2)' : 'rgba(80,60,120,0.15)',
              border: isBoss ? '1px solid rgba(220,50,50,0.2)' : '1px solid rgba(120,90,180,0.15)',
            }}
          >
            <span className={`text-[9px] font-bold ${isBoss ? 'text-red-400/80' : 'text-violet-400/70'}`}>
              {enemy.counterplayHint}
            </span>
          </div>
        )}

        {!enemy.counterplayHint && <div className="mb-3" />}

        {/* Player status card */}
        <div
          className="w-full max-w-xs rounded-lg p-3"
          style={{
            background: 'linear-gradient(180deg, rgba(20,15,30,0.9) 0%, rgba(15,10,25,0.95) 100%)',
            border: '1px solid rgba(80,60,120,0.2)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            <span>Your HP</span>
            <span className={hpPercent <= 25 ? 'text-red-400' : hpPercent <= 50 ? 'text-yellow-400' : 'text-green-400'}>
              {hpPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full ${
                hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${hpPercent}%`, transition: 'width 0.3s ease' }}
            />
          </div>

          {/* Bonuses */}
          {(run.bonuses.maxEnergyBonus > 0 || run.bonuses.statBonus > 0 || run.bonuses.utilityEffects.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {run.bonuses.maxEnergyBonus > 0 && (
                <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded"
                  style={{ border: '1px solid rgba(34,211,238,0.15)' }}>
                  +{run.bonuses.maxEnergyBonus} EN
                </span>
              )}
              {run.bonuses.statBonus > 0 && (
                <span className="text-[8px] font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded"
                  style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                  +{run.bonuses.statBonus} STR/DEF
                </span>
              )}
              {run.bonuses.utilityEffects.map(e => (
                <span key={e} className="text-[8px] font-bold text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded capitalize"
                  style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
                  {e.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom fight button */}
      <div className="relative z-10 px-6 pb-8 pt-4">
        <button
          onClick={() => dispatch({ type: 'START_RUN_BATTLE' })}
          className="w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-lg transition-all duration-200 active:scale-95"
          style={{
            background: isBoss
              ? 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)'
              : 'linear-gradient(180deg, #b45309 0%, #92400e 100%)',
            boxShadow: isBoss
              ? '0 0 24px rgba(220,38,38,0.3), 0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset'
              : '0 0 20px rgba(180,100,20,0.25), 0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
            border: isBoss
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(245,158,11,0.3)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            color: '#fff',
          }}
        >
          {isBoss ? 'Fight Boss' : 'Fight'}
        </button>
      </div>

      {/* Retreat confirmation modal */}
      {confirmRetreat && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            className="rounded-xl p-5 max-w-[280px] w-full text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(25,20,35,0.98) 0%, rgba(15,10,20,0.99) 100%)',
              border: '1px solid rgba(100,60,120,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2">Abandon Run?</h3>
            <p className="text-xs text-slate-400 mb-4">
              You'll keep partial rewards for encounters already won ({run.encountersWon}/{RUN_LENGTH}).
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRetreat(false)}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors"
                style={{ background: 'rgba(40,35,55,0.8)', border: '1px solid rgba(100,80,140,0.2)' }}
              >
                Keep Going
              </button>
              <button
                onClick={() => dispatch({ type: 'END_RUN' })}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-red-300 hover:text-red-200 transition-colors"
                style={{ background: 'rgba(80,20,20,0.6)', border: '1px solid rgba(200,50,50,0.25)' }}
              >
                Retreat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
