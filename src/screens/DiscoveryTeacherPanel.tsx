import { useState } from 'react';
import type { EngineState } from '../types/engine';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { AdventureStyle } from '../types/discovery';
import { ADVENTURE_STYLES, STYLE_KEYS } from '../config/discoveryConfig';
import { discoveryDays, quizComplete } from '../services/game/eggDiscovery';
import { careDate } from '../services/game/petGrowth';
import { COMPANIONS } from '../config/companionConfig';

export function DiscoveryTeacherPanel({ state, dispatch, onClose }: { state: EngineState; dispatch: (a: GameEngineAction) => void; onClose: () => void }) {
  const [style, setStyle] = useState<AdventureStyle>('help');
  const [confirmed, setConfirmed] = useState(false);
  const d = state.eggDiscovery, todayDone = d?.stamps.some(s => s.day === careDate());
  const canCredit = d && d.status === 'collecting' && !todayDone && discoveryDays(d) < 5
    && !state.battle.active && !state.run.active && !state.momentum.active;
  return <section className="rounded-2xl border border-amber-800/60 bg-slate-900 p-5 space-y-4" aria-label="Discovery week controls"><h2 className="text-xl font-bold text-amber-200">Companion discovery week</h2>
    <p>Five different learning days, no consecutive-day streak required. A learning attempt, completed game, delivery, group-game action, or teacher-guided activity can earn today’s stamp. Dedicated discovery missions also count.</p>
    <p className="text-sm text-slate-300">Match recipe: +1 for each quiz preference, +2 for each daily activity style. Pure and mixed interests favor different companions. Highest available match wins; ties use a saved surprise pick. Quiz skips add no points. Accuracy, speed, grades and personal information never rank a child or select a “better” pet.</p>
    {d ? <><p className="font-bold">{discoveryDays(d)} / 5 discovery days · Quiz {quizComplete(d) ? 'ready' : 'not finished'}{d.companion ? ` · Matched: ${COMPANIONS[d.companion].name}` : ''}</p>
      <button className="growth-button" onClick={() => { dispatch({ type: 'SET_SCREEN', screen: 'discovery' }); onClose(); }}>View discovery passport</button>
      {d.status === 'collecting' && <div className="space-y-3 border-t border-slate-700 pt-4"><h3 className="font-bold">Paper / read-aloud alternative</h3><p className="text-sm text-slate-300">Let the learner choose a theme and complete a short classroom activity with support. No notes or student names are needed. This credits today only; it cannot fill the whole week.</p><label className="block">Classroom activity theme<select className="block w-full p-3 mt-2 rounded-lg bg-slate-800" value={style} onChange={e => setStyle(e.target.value as AdventureStyle)}>{STYLE_KEYS.map(s => <option key={s} value={s}>{ADVENTURE_STYLES[s].label} · {ADVENTURE_STYLES[s].mission}</option>)}</select></label><label className="flex gap-3 items-start"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>I guided a classroom activity with this learner today.</span></label><button className="growth-button" disabled={!canCredit || !confirmed} onClick={() => { dispatch({ type: 'CREDIT_DISCOVERY_CLASSROOM_DAY', style }); setConfirmed(false); }}>{todayDone ? 'Today’s stamp is already recorded' : 'Record today’s classroom stamp'}</button>{!quizComplete(d) && <p className="text-amber-200 text-sm">The quiz is optional. Classroom activity can count now.</p>}</div>}
    </> : <p>Existing pets and already-issued eggs are unchanged. Start the next discovery week from Home → Growth.</p>}
    <p className="text-xs text-slate-400">This is a playful preference match, not a personality assessment or behavior grade. Saved on this browser only. Teacher controls and DEV are not access-protected in this prototype.</p>
  </section>;
}
