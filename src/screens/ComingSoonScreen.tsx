import React from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { CAMPAIGN_CHAPTERS } from '../config/campaignConfig';
import { SEASONAL_EVENTS, getActiveEvents } from '../config/eventConfig';
import { COSMETICS } from '../config/cosmeticConfig';
import { getDexCompletion } from '../engine/systems/DexSystem';

interface ComingSoonScreenProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ state, onClose }) => {
  const dex = getDexCompletion(state, COSMETICS.length); // placeholder total
  const now = new Date();
  const activeEvents = getActiveEvents(now);
  const upcoming = SEASONAL_EVENTS.filter((e) => e.startDate > now.toISOString().slice(0, 10));

  return (
    <div
      className="min-h-screen text-white p-4 pb-20"
      style={{ background: 'linear-gradient(180deg, #060818 0%, #1a2540 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-bold"
        >
          ← Back
        </button>
        <h1 className="text-lg font-black">🔮 What's Coming</h1>
        <div />
      </div>

      <div
        className="rounded-xl p-3 mb-4"
        style={{
          background: 'linear-gradient(90deg, rgba(14,165,233,0.2) 0%, rgba(10,20,40,0.9) 100%)',
          border: '1px solid rgba(14,165,233,0.4)',
        }}
      >
        <div className="text-sm font-bold text-sky-300">🗺️ The Year Ahead</div>
        <div className="text-[11px] text-slate-300 mt-1">
          Your pet's story keeps growing. Here's the roadmap for the next 12 months — new chapters, events,
          and features drop throughout the year.
        </div>
      </div>

      {/* Story Campaign */}
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">📖 Story Campaign</h2>
      <div className="flex flex-col gap-1.5 mb-5">
        {CAMPAIGN_CHAPTERS.map((ch) => {
          const available = ch.status === 'available';
          return (
            <div
              key={ch.id}
              className="rounded-lg p-2.5 flex items-center gap-3"
              style={{
                background: available ? 'rgba(16,185,129,0.15)' : 'rgba(20,25,40,0.7)',
                border: `1px solid ${available ? 'rgba(16,185,129,0.4)' : 'rgba(80,90,130,0.2)'}`,
                opacity: available ? 1 : 0.6,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                style={{ background: available ? '#10b981' : '#334155' }}
              >
                {ch.chapterNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{ch.title}</div>
                <div className="text-[11px] text-slate-400 truncate">{ch.blurb}</div>
              </div>
              <div className="text-[10px] text-slate-500 shrink-0">
                {available ? 'Available' : fmtDate(ch.releaseTarget)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events */}
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">🎪 Seasonal Events</h2>
      {activeEvents.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-emerald-400 mb-1">LIVE NOW</div>
          {activeEvents.map((e) => (
            <div
              key={e.id}
              className="rounded-lg p-3 flex items-center gap-3 mb-1.5"
              style={{
                background: 'linear-gradient(90deg, rgba(16,185,129,0.25) 0%, rgba(10,30,20,0.9) 100%)',
                border: '1px solid rgba(16,185,129,0.5)',
              }}
            >
              <span className="text-3xl">{e.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{e.name}</div>
                <div className="text-[11px] text-slate-300">{e.blurb}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  Ends {fmtDate(e.endDate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5 mb-5">
        {upcoming.map((e) => (
          <div
            key={e.id}
            className="rounded-lg p-2.5 flex items-center gap-3"
            style={{
              background: 'rgba(20,25,40,0.7)',
              border: '1px solid rgba(80,90,130,0.25)',
            }}
          >
            <span className="text-2xl">{e.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{e.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{e.blurb}</div>
            </div>
            <div className="text-[10px] text-slate-500 shrink-0">{fmtDate(e.startDate)}</div>
          </div>
        ))}
      </div>

      {/* Dex Teaser */}
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">📕 Pet Dex</h2>
      <div
        className="rounded-xl p-3 mb-5"
        style={{
          background: 'linear-gradient(90deg, rgba(139,92,246,0.2) 0%, rgba(20,15,40,0.9) 100%)',
          border: '1px solid rgba(139,92,246,0.35)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">📕</span>
          <div className="flex-1">
            <div className="text-sm font-bold">Pet Encyclopedia</div>
            <div className="text-[11px] text-slate-400">
              Track every species you meet. We're already recording your encounters — full Dex UI ships soon.
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Seen: {dex.seen}</span>
          <span className="text-slate-400">Owned: {dex.owned}</span>
          <span className="text-purple-300 font-bold">Coming Soon</span>
        </div>
      </div>

      {/* Ranked Ladder Teaser */}
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">🏆 Ranked Ladder</h2>
      <div
        className="rounded-xl p-3 mb-5"
        style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(40,15,20,0.9) 100%)',
          border: '1px solid rgba(239,68,68,0.35)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div className="flex-1">
            <div className="text-sm font-bold">Classmate Ranked Seasons</div>
            <div className="text-[11px] text-slate-400">
              Climb the school leaderboard against rival classmates. Coming this summer.
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-3 text-center"
        style={{
          background: 'linear-gradient(90deg, rgba(251,191,36,0.15), rgba(30,20,5,0.9))',
          border: '1px solid rgba(251,191,36,0.3)',
        }}
      >
        <div className="text-[11px] text-amber-200">
          The Academy grows every season. Keep playing to unlock it all! ⭐
        </div>
      </div>
    </div>
  );
};
