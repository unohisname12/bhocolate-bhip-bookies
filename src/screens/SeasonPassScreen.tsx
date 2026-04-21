import React from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { getActiveSeason, getSeasonProgress } from '../engine/systems/SeasonSystem';
import { findCosmetic } from '../config/cosmeticConfig';
import type { SeasonTier } from '../types/season';

interface SeasonPassScreenProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

const rewardLabel = (tier: SeasonTier): { icon: string; label: string } => {
  const r = tier.reward;
  switch (r.kind) {
    case 'tokens': return { icon: '🪙', label: `${r.amount} tokens` };
    case 'coins':  return { icon: '💰', label: `${r.amount} coins` };
    case 'shards': return { icon: '💎', label: `${r.amount} shards` };
    case 'cosmetic': {
      const c = findCosmetic(r.cosmeticId);
      return { icon: c?.icon ?? '🎁', label: c?.name ?? r.cosmeticId };
    }
    case 'title':    return { icon: '🏷️', label: r.titleId.replace(/^title_/, '').replace(/_/g, ' ') };
    case 'room_bg':  return { icon: '🖼️', label: r.backgroundId.replace(/^bg_/, '') };
  }
};

export const SeasonPassScreen: React.FC<SeasonPassScreenProps> = ({ state, dispatch, onClose }) => {
  const season = getActiveSeason(state);
  const { earned, nextTier, fraction, pointsToNext } = getSeasonProgress(state);
  const pts = state.player.currencies.seasonPoints;

  return (
    <div
      className="min-h-screen text-white p-4 pb-20"
      style={{ background: 'linear-gradient(180deg, #0c0920 0%, #2a1a4a 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-bold"
        >
          ← Back
        </button>
        <h1 className="text-lg font-black">⭐ Season Pass</h1>
        <div />
      </div>

      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: 'linear-gradient(180deg, rgba(90,60,180,0.35) 0%, rgba(30,20,70,0.7) 100%)',
          border: '1px solid rgba(180,150,255,0.3)',
        }}
      >
        <div className="text-sm font-bold">{season.name}</div>
        <div className="text-[11px] text-slate-300 mt-0.5">{season.theme}</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-amber-300">{pts}</span>
          <span className="text-xs text-slate-400">Season Points</span>
        </div>
        {nextTier ? (
          <>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${fraction * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              Tier {earned} → Tier {nextTier.tier}. {pointsToNext} pts to next reward.
            </div>
          </>
        ) : (
          <div className="mt-2 text-xs text-emerald-300">Season complete! 🎉</div>
        )}
      </div>

      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Rewards Ladder</h2>
      <div className="flex flex-col gap-1.5">
        {season.tiers.map((tier) => {
          const unlocked = pts >= tier.pointsRequired;
          const claimed = state.season.claimedTiers.includes(tier.tier);
          const claimable = unlocked && !claimed;
          const { icon, label } = rewardLabel(tier);
          return (
            <div
              key={tier.tier}
              className="rounded-lg p-2.5 flex items-center gap-3"
              style={{
                background: unlocked
                  ? 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(30,25,60,0.9) 100%)'
                  : 'rgba(25,28,50,0.8)',
                border: `1px solid ${unlocked ? 'rgba(245,158,11,0.35)' : 'rgba(80,90,130,0.25)'}`,
                opacity: claimed ? 0.5 : 1,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{
                  background: unlocked ? 'linear-gradient(180deg,#fbbf24,#d97706)' : '#334155',
                  color: unlocked ? '#1a1200' : '#94a3b8',
                }}
              >
                {tier.tier}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-400">{tier.label}</div>
                <div className="text-sm font-bold text-white truncate">
                  {icon} {label}
                </div>
                <div className="text-[10px] text-slate-500">{tier.pointsRequired} pts</div>
              </div>
              <button
                disabled={!claimable}
                onClick={() => dispatch({ type: 'CLAIM_SEASON_TIER', tier: tier.tier })}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-bold ${
                  claimable
                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                    : claimed
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {claimed ? '✓' : claimable ? 'Claim' : 'Locked'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
