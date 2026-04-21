import React from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { QuestProgress } from '../types/quest';
import { DAILY_QUESTS, WEEKLY_QUESTS } from '../config/questConfig';

interface QuestLogScreenProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

const findTemplate = (id: string) =>
  DAILY_QUESTS.find((q) => q.id === id) ?? WEEKLY_QUESTS.find((q) => q.id === id);

const QuestRow: React.FC<{
  progress: QuestProgress;
  onClaim: () => void;
}> = ({ progress, onClaim }) => {
  const tpl = findTemplate(progress.templateId);
  if (!tpl) return null;
  const pct = Math.min(1, progress.current / progress.target);
  const done = progress.current >= progress.target;
  const claimable = done && !progress.claimed;

  return (
    <div
      className="rounded-xl p-3 flex gap-3 items-center"
      style={{
        background: 'linear-gradient(180deg, rgba(40,46,70,0.95) 0%, rgba(22,26,44,0.98) 100%)',
        border: '1px solid rgba(120,140,200,0.25)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        opacity: progress.claimed ? 0.45 : 1,
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {tpl.icon.startsWith('/') ? (
          <img src={tpl.icon} alt="" className="w-9 h-9" style={{ imageRendering: 'pixelated' }} />
        ) : (
          <span className="text-2xl">{tpl.icon}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">{tpl.title}</span>
          {progress.claimed && <span className="text-[10px] text-emerald-400 font-bold">CLAIMED</span>}
        </div>
        <div className="text-[11px] text-slate-300 truncate">{tpl.blurb}</div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct * 100}%`,
              background: done
                ? 'linear-gradient(90deg, #34d399 0%, #10b981 100%)'
                : 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-400">
            {progress.current}/{progress.target}
          </span>
          <span className="text-[10px] text-amber-300 font-bold">
            {tpl.reward.tokens ? `+${tpl.reward.tokens} 🪙  ` : ''}
            {tpl.reward.seasonPoints ? `+${tpl.reward.seasonPoints} ⭐  ` : ''}
            {tpl.reward.shards ? `+${tpl.reward.shards} 💎` : ''}
          </span>
        </div>
      </div>
      <button
        disabled={!claimable}
        onClick={onClaim}
        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold ${
          claimable
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        {progress.claimed ? 'Done' : claimable ? 'Claim' : 'Go'}
      </button>
    </div>
  );
};

export const QuestLogScreen: React.FC<QuestLogScreenProps> = ({ state, dispatch, onClose }) => {
  const claim = (id: string) => dispatch({ type: 'CLAIM_QUEST', templateId: id });

  return (
    <div
      className="min-h-screen text-white p-4 pb-20"
      style={{ background: 'linear-gradient(180deg, #0b1022 0%, #1a1f3a 100%)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-bold"
        >
          ← Back
        </button>
        <h1 className="text-lg font-black">📜 Quests</h1>
        <div className="text-xs text-slate-400">
          ⭐ {state.player.currencies.seasonPoints}
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Today's Quests</h2>
        <div className="flex flex-col gap-2">
          {state.quests.daily.length === 0 && (
            <div className="text-sm text-slate-500 italic p-4 text-center">
              No quests rolled yet. Check back after the next login!
            </div>
          )}
          {state.quests.daily.map((p) => (
            <QuestRow key={p.templateId} progress={p} onClaim={() => claim(p.templateId)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">This Week</h2>
        <div className="flex flex-col gap-2">
          {state.quests.weekly.length === 0 && (
            <div className="text-sm text-slate-500 italic p-4 text-center">
              Weekly quest rolls at the start of each week.
            </div>
          )}
          {state.quests.weekly.map((p) => (
            <QuestRow key={p.templateId} progress={p} onClaim={() => claim(p.templateId)} />
          ))}
        </div>
      </section>
    </div>
  );
};
