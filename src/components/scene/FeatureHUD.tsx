import React from 'react';
import type { EngineState } from '../../engine/core/EngineTypes';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { getSeasonProgress } from '../../engine/systems/SeasonSystem';

interface FeatureHUDProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
}

/**
 * Floating left-side HUD that surfaces the Phase 1 systems: Quests, Season
 * Pass, Gacha, and the "Coming Soon" roadmap. Kids see quest progress + a
 * growing roadmap as soon as they land on home.
 */
export const FeatureHUD: React.FC<FeatureHUDProps> = ({ state, dispatch }) => {
  const quests = [...state.quests.daily, ...state.quests.weekly];
  const claimable = quests.filter((q) => !q.claimed && q.current >= q.target).length;
  const total = quests.length;
  const { fraction, earned } = getSeasonProgress(state);
  const seasonPct = Math.round(fraction * 100);

  const go = (screen: 'quest_log' | 'season_pass' | 'gacha' | 'coming_soon' | 'warm_preview' | 'power_forge') =>
    dispatch({ type: 'SET_SCREEN', screen });

  const Btn: React.FC<{
    onClick: () => void;
    icon: string;
    label: string;
    badge?: number;
    progress?: number;
  }> = ({ onClick, icon, label, badge, progress }) => (
    <button
      onClick={onClick}
      className="relative pointer-events-auto w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95"
      style={{
        background: 'linear-gradient(180deg, rgba(45,52,75,0.92) 0%, rgba(20,24,42,0.95) 100%)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
        border: '1px solid rgba(100,120,180,0.25)',
      }}
      aria-label={label}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[7px] uppercase font-bold text-slate-400 tracking-wide mt-0.5 leading-none">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center px-1 animate-pulse"
          style={{ border: '1px solid #0b1022', boxShadow: '0 0 6px rgba(244,63,94,0.7)' }}
        >
          {badge}
        </span>
      )}
      {progress !== undefined && (
        <div className="absolute bottom-1 left-1.5 right-1.5 h-[3px] rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#f59e0b,#f97316)',
            }}
          />
        </div>
      )}
    </button>
  );

  return (
    <div
      className="fixed left-1.5 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col gap-2"
      data-testid="feature-hud"
    >
      <Btn onClick={() => go('quest_log')} icon="📜" label="Quests" badge={claimable || (total === 0 ? 0 : undefined)} />
      <Btn onClick={() => go('season_pass')} icon="⭐" label={`T${earned}`} progress={seasonPct} />
      <Btn onClick={() => go('gacha')} icon="🥚" label="Egg" />
      <Btn onClick={() => go('power_forge')} icon="🧠" label="Forge" />
      <Btn onClick={() => go('coming_soon')} icon="🔮" label="Soon" />
      <Btn onClick={() => go('warm_preview')} icon="🔥" label="Warm" />
    </div>
  );
};
