import React from 'react';
import type { ActiveRunState } from '../types/run';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { getRewardsForEncounter } from '../config/runConfig';
import { generateRewardChoices } from '../config/runRewardConfig';
import { getNodeById } from '../engine/systems/RunMapGenerator';
import { LeaveDungeonButton } from '../components/run/LeaveDungeonButton';

interface RunRewardScreenProps {
  run: ActiveRunState;
  dispatch: (action: GameEngineAction) => void;
}

export const RunRewardScreen: React.FC<RunRewardScreenProps> = ({ run, dispatch }) => {
  // Use V2 reward generation if map exists, otherwise V1 fallback
  const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
  const isGenerous = run.fractureModifier === 'generous';
  const rewards = currentNode
    ? generateRewardChoices(
        currentNode.rewardTier,
        2,
        run.rewardsChosen,
        run.seed + run.encountersWon * 31,
        isGenerous,
      )
    : getRewardsForEncounter(run.currentEncounter);

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #1a1008 40%, #12091f 100%)' }}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(200,150,40,0.06) 0%, transparent 60%)',
      }} />

      <LeaveDungeonButton dispatch={dispatch} />

      {/* Top label */}
      <div className="relative z-10 px-4 pt-4 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60">
          Dungeon Run
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <h1
          className="text-2xl font-black uppercase tracking-wider mb-1"
          style={{
            textShadow: '0 0 16px rgba(245,158,11,0.4), 0 2px 4px rgba(0,0,0,0.8)',
            color: '#fbbf24',
          }}
        >
          Victory
        </h1>
        <p className="text-slate-500 text-xs mb-8">Choose a reward to carry forward</p>

        {/* Reward cards */}
        <div className="flex gap-3 mb-8 w-full max-w-sm">
          {rewards.map(reward => (
            <button
              key={reward.id}
              onClick={() => dispatch({ type: 'SELECT_RUN_REWARD', rewardId: reward.id })}
              className="flex-1 rounded-xl p-4 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer group"
              style={{
                background: 'linear-gradient(180deg, rgba(25,20,35,0.95) 0%, rgba(18,14,28,0.98) 100%)',
                border: '1px solid rgba(100,70,150,0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{
                  background: 'radial-gradient(circle, rgba(80,60,140,0.3) 0%, rgba(40,30,60,0.4) 100%)',
                  border: '1px solid rgba(120,90,180,0.15)',
                }}
              >
                <img
                  src={reward.icon}
                  alt=""
                  className="w-9 h-9"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Text */}
              <div className="text-center">
                <div className="text-sm font-black text-amber-300 mb-0.5">{reward.name}</div>
                <div className="text-[9px] text-slate-500 leading-tight">{reward.description}</div>
              </div>

              {/* Choose indicator */}
              <div
                className="w-full py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest text-center text-slate-500 group-hover:text-amber-300 transition-colors"
                style={{ background: 'rgba(60,40,80,0.2)', border: '1px solid rgba(100,70,150,0.1)' }}
              >
                Choose
              </div>
            </button>
          ))}
        </div>

        {/* Current bonuses */}
        {(run.bonuses.maxEnergyBonus > 0 || run.bonuses.statBonus > 0 || run.bonuses.utilityEffects.length > 0) && (
          <div className="text-center">
            <div className="text-[8px] uppercase font-bold text-slate-700 tracking-[0.2em] mb-1.5">Collected Bonuses</div>
            <div className="flex gap-1.5 justify-center flex-wrap">
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
          </div>
        )}
      </div>
    </div>
  );
};
