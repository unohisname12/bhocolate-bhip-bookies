import React from 'react';
import type { ActiveRunState } from '../types/run';
import type { Pet } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { getSelectableNodes } from '../engine/systems/RunMapGenerator';
import { getEnemyById } from '../config/runEnemyConfig';
import { FRACTURE_MODIFIERS } from '../config/runConfig';
import { LeaveDungeonButton } from '../components/run/LeaveDungeonButton';

interface RunMapScreenProps {
  run: ActiveRunState;
  pet: Pet | null;
  dispatch: (action: GameEngineAction) => void;
}

const NODE_TYPE_ICONS: Record<string, string> = {
  combat: '\u2694\uFE0F',
  elite: '\u{1F480}',
  rest: '\u{1F49A}',
  event: '\u2753',
  boss: '\u{1F525}',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  combat: 'Combat',
  elite: 'Elite',
  rest: 'Rest',
  event: 'Event',
  boss: 'Boss',
};

export const RunMapScreen: React.FC<RunMapScreenProps> = ({ run, pet: _pet, dispatch }) => {
  const selectable = getSelectableNodes(run.map, run.currentNodeId);
  const selectableIds = new Set(selectable.map(n => n.id));
  const modifier = FRACTURE_MODIFIERS[run.fractureModifier];
  const hpPercent = Math.round(run.playerHPPercent * 100);

  // Group nodes by tier
  const tiers: Record<number, typeof run.map.nodes> = {};
  for (const node of run.map.nodes) {
    if (!tiers[node.tier]) tiers[node.tier] = [];
    tiers[node.tier].push(node);
  }

  const tierLabels = ['Tier 1', 'Tier 2', 'Tier 3', 'Boss'];

  return (
    <div
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #12091f 50%, #0a0a12 100%)' }}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(120,60,200,0.06) 0%, transparent 60%)',
      }} />

      {/* Instability visual */}
      {run.instability >= 3 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: run.instability >= 5 ? '2px solid rgba(220,50,50,0.3)' : '1px solid rgba(200,80,80,0.15)',
          animation: run.instability >= 5 ? 'pulse 2s ease-in-out infinite' : undefined,
        }} />
      )}

      <LeaveDungeonButton dispatch={dispatch} />

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {/* retreat now lives in LeaveDungeonButton */}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60">
            Fracture Zone
          </span>
        </div>

        {/* Fracture modifier banner */}
        <div
          className="text-center py-1.5 rounded-lg mb-2"
          style={{ background: 'rgba(80,40,120,0.15)', border: '1px solid rgba(120,80,180,0.15)' }}
        >
          <div className="text-[9px] font-bold text-violet-300 uppercase tracking-wider">{modifier.name}</div>
          <div className="text-[8px] text-slate-500">{modifier.description}</div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-600 uppercase">HP</span>
            <span className={`text-[10px] font-black ${hpPercent <= 25 ? 'text-red-400' : hpPercent <= 50 ? 'text-yellow-400' : 'text-green-400'}`}>
              {hpPercent}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-600 uppercase">Won</span>
            <span className="text-[10px] font-black text-violet-400">{run.encountersWon}</span>
          </div>
          {run.instability > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-600 uppercase">Instability</span>
              <span className={`text-[10px] font-black ${run.instability >= 5 ? 'text-red-400' : run.instability >= 3 ? 'text-orange-400' : 'text-slate-400'}`}>
                {run.instability}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 gap-4">
        {[0, 1, 2, 3].map(tierIdx => {
          const nodes = tiers[tierIdx] ?? [];
          return (
            <div key={tierIdx} className="w-full max-w-sm">
              <div className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.2em] text-center mb-1.5">
                {tierLabels[tierIdx]}
              </div>
              <div className="flex gap-2 justify-center">
                {nodes.map(node => {
                  const isSelectable = selectableIds.has(node.id);
                  const isVisited = node.visited;
                  const enemy = node.enemyId ? getEnemyById(node.enemyId) : null;

                  return (
                    <button
                      key={node.id}
                      onClick={() => isSelectable ? dispatch({ type: 'SELECT_MAP_NODE', nodeId: node.id }) : undefined}
                      disabled={!isSelectable}
                      className={`flex-1 max-w-[140px] rounded-lg p-3 text-center transition-all duration-200 ${
                        isSelectable ? 'hover:scale-[1.03] active:scale-95 cursor-pointer' : ''
                      }`}
                      style={{
                        background: isVisited
                          ? 'rgba(40,30,60,0.4)'
                          : isSelectable
                          ? 'linear-gradient(180deg, rgba(30,22,50,0.95) 0%, rgba(20,15,35,0.98) 100%)'
                          : 'rgba(15,12,25,0.6)',
                        border: isSelectable
                          ? node.type === 'boss'
                            ? '1px solid rgba(220,50,50,0.3)'
                            : node.type === 'elite'
                            ? '1px solid rgba(245,158,11,0.3)'
                            : node.type === 'rest'
                            ? '1px solid rgba(34,197,94,0.3)'
                            : node.type === 'event'
                            ? '1px solid rgba(168,85,247,0.3)'
                            : '1px solid rgba(139,92,246,0.3)'
                          : '1px solid rgba(60,50,80,0.15)',
                        opacity: isVisited ? 0.5 : isSelectable ? 1 : 0.4,
                        boxShadow: isSelectable ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                      }}
                    >
                      <div className="text-lg mb-1">{NODE_TYPE_ICONS[node.type] ?? ''}</div>
                      <div className={`text-[10px] font-black uppercase tracking-wide ${
                        isVisited ? 'text-slate-600' :
                        node.type === 'boss' ? 'text-red-400' :
                        node.type === 'elite' ? 'text-amber-400' :
                        node.type === 'rest' ? 'text-green-400' :
                        node.type === 'event' ? 'text-purple-400' :
                        'text-slate-200'
                      }`}>
                        {enemy ? enemy.name : NODE_TYPE_LABELS[node.type]}
                      </div>
                      {enemy && !isVisited && (
                        <div className="text-[8px] text-slate-500 mt-0.5 italic">{enemy.description}</div>
                      )}
                      {node.type === 'rest' && !isVisited && (
                        <div className="text-[8px] text-green-500/60 mt-0.5">Recover HP</div>
                      )}
                      {node.type === 'event' && !isVisited && (
                        <div className="text-[8px] text-purple-500/60 mt-0.5">Encounter</div>
                      )}
                      {isVisited && (
                        <div className="text-[8px] text-slate-600 mt-0.5">Cleared</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonuses display */}
      {(run.bonuses.maxEnergyBonus > 0 || run.bonuses.statBonus > 0 || run.bonuses.utilityEffects.length > 0 || run.rewardsChosen.length > 0) && (
        <div className="relative z-10 px-6 pb-4 pt-2">
          <div className="text-[8px] uppercase font-bold text-slate-700 tracking-[0.2em] text-center mb-1">Bonuses</div>
          <div className="flex gap-1 flex-wrap justify-center">
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
            {run.bonuses.glassCannon && (
              <span className="text-[8px] font-bold text-red-400/60 bg-red-950/30 px-1.5 py-0.5 rounded">Glass Cannon</span>
            )}
            {run.bonuses.desperatePower && (
              <span className="text-[8px] font-bold text-orange-400/60 bg-orange-950/30 px-1.5 py-0.5 rounded">Desperate Power</span>
            )}
            {run.bonuses.overchargeActive && (
              <span className="text-[8px] font-bold text-yellow-400/60 bg-yellow-950/30 px-1.5 py-0.5 rounded">Overcharge</span>
            )}
            {run.bonuses.focusMastery && (
              <span className="text-[8px] font-bold text-blue-400/60 bg-blue-950/30 px-1.5 py-0.5 rounded">Focus Mastery</span>
            )}
            {run.bonuses.fractureDrain && (
              <span className="text-[8px] font-bold text-green-400/60 bg-green-950/30 px-1.5 py-0.5 rounded">Fracture Drain</span>
            )}
            {run.bonuses.energyRegenBonus > 0 && (
              <span className="text-[8px] font-bold text-cyan-400/60 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                +{run.bonuses.energyRegenBonus} EN/turn
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
  );
};
