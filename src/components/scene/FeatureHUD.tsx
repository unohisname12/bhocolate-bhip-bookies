import { useState } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { ScreenName } from '../../types/session';

export function FeatureHUD({ state, dispatch }: { state: EngineState; dispatch: (action: GameEngineAction) => void }) {
  const [journal, setJournal] = useState(false);
  const go = (screen: ScreenName) => dispatch({ type: 'SET_SCREEN', screen });
  const claimable = [...state.quests.daily, ...state.quests.weekly].filter(q => !q.claimed && q.current >= q.target).length;
  const entries: [string, ScreenName][] = [['Quests', 'quest_log'], ['Season rewards', 'season_pass'], ['Cosmetic eggs', 'gacha'], ['Power Forge', 'power_forge'], ['Shop', 'shop'], ...(import.meta.env.MODE === 'pilot' ? [] : [['Class arena', 'class_roster'] as [string, ScreenName]]), ['Dungeon expeditions', 'run_start']];
  return <>
    {journal && <section className="fixed z-[72] bottom-24 left-3 right-3 max-w-lg mx-auto rounded-2xl border border-slate-600 bg-slate-950 p-4 text-white shadow-2xl" aria-label="Journal"><header className="flex justify-between items-center mb-3"><h2 className="font-bold">Your journal & collection</h2><button className="min-h-11 px-3" onClick={() => setJournal(false)}>Close</button></header><div className="grid grid-cols-2 gap-2">{entries.map(([label, screen]) => <button key={screen} className="p-3 rounded-xl bg-slate-800 text-left" onClick={() => go(screen)}>{label}</button>)}</div></section>}
    <nav aria-label="Main navigation" data-testid="feature-hud" className="fixed bottom-3 inset-x-3 z-[71] max-w-lg mx-auto grid grid-cols-4 rounded-2xl border border-slate-600 bg-slate-950/95 p-2 gap-1 shadow-xl text-white">
      <button aria-current="page" className="rounded-xl min-h-12 bg-teal-900 text-teal-100 font-bold" onClick={() => dispatch({ type: 'HOME_OPEN' })}>Home</button>
      <button className="rounded-xl min-h-12 hover:bg-slate-800 text-sm font-bold" onClick={() => dispatch({ type: 'OPEN_WOODLAND' })}>Adventure</button>
      <button className="rounded-xl min-h-12 hover:bg-slate-800 font-bold" onClick={() => go('play')}>Play</button>
      <button aria-expanded={journal} className="rounded-xl min-h-12 hover:bg-slate-800 text-sm font-bold" onClick={() => setJournal(!journal)}>Journal{claimable > 0 ? ' (' + claimable + ')' : ''}</button>
    </nav>
  </>;
}
