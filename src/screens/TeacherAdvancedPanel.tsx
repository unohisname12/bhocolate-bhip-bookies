import { useState } from 'react';
import type { EngineState } from '../types/engine';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { COMPANIONS } from '../config/companionConfig';
import { ASSETS } from '../config/assetManifest';

export function TeacherAdvancedPanel({ state, dispatch, learnerLabel }: { state: EngineState; dispatch: (a: GameEngineAction) => void; learnerLabel: string }) {
  const owned = [...(state.companionRoster ?? []), ...(state.pet ? [state.pet] : [])];
  const choice = state.eggDiscovery?.status !== 'claimed' ? state.eggDiscovery?.teacherChoice ?? null : null;
  const [pending, setPending] = useState<string | null>(choice);
  const [message, setMessage] = useState('');
  const blocked = !!state.egg || state.battle.active || state.run.active || state.momentum.active;
  const available = Object.keys(COMPANIONS).filter(id => !owned.some(p => p.speciesId === id));
  return <div className="space-y-6">
    <p role="status" className="text-teal-200">{message}</p>
    <section className="teacher-card teacher-egg-explainer" id="teacher-early-egg"><p className="teacher-kicker">A small head start</p><h2>Give an early egg pass</h2><p>Give <strong>{learnerLabel}</strong> a One-Day-Early Egg Pass. It replaces one of five discovery days. It does not hatch the egg immediately, and the questionnaire is optional.</p><p>They use it in <strong>Egg discovery or Prize Studio</strong>. One pass per egg; it stays saved until they can use it.</p><p>Saved passes: <strong>{state.prizes?.earlyHatchPasses ?? 0}</strong></p><button className="growth-button primary" onClick={()=>{dispatch({type:'GIVE_LOCAL_EARLY_EGG_PASS',receipt:crypto.randomUUID()});setMessage(`Early egg pass added for ${learnerLabel}. Open Egg discovery or Prize Studio to use it.`);}}>Give pass to {learnerLabel}</button></section>
    <section className="teacher-card"><p className="eyebrow">Next companion · {learnerLabel}</p><h2>Choose the next companion</h2><p>Keep the adventure-style match, or choose a specific egg for this learner. Their five learning days and baby-care rules stay in place. Existing companions are never replaced.</p>
      <label className="teacher-auto-choice"><input type="radio" name="teacher-egg" checked={pending === null} onChange={() => setPending(null)} disabled={blocked}/> Automatic · quiz and activities decide</label>
      <div className="teacher-egg-grid">{Object.entries(COMPANIONS).map(([id, info]) => <button key={id} className={pending === id ? 'selected' : ''} aria-pressed={pending === id} disabled={blocked || !available.includes(id)} onClick={() => setPending(id)}><img src={ASSETS.petPortraits[id]} alt=""/><strong>{info.name}</strong><small>{available.includes(id) ? info.title : 'Already in this learner’s family'}</small></button>)}</div>
      <button className="growth-button primary" disabled={blocked || !available.length || (pending !== null && !available.includes(pending))} onClick={() => { dispatch({ type: 'SET_TEACHER_EGG_CHOICE', speciesId: pending }); setMessage('Next egg choice updated.'); }}>Set next egg for {learnerLabel}</button>
      {blocked && <p className="text-amber-200">Finish the current egg or active game first. Already-issued eggs are not changed here.</p>}
      {!available.length && <p>All nine companions are already in this learner’s family.</p>}
    </section>
    <section className="teacher-card"><p className="eyebrow">Encouragement rewards</p><h2>Give a token bonus</h2><p>Selected learner: <strong>{learnerLabel}</strong> · Current tokens: {state.player.currencies.tokens}. This does not change their grades, quiz answers or care days.</p><div className="growth-care-actions">{[10, 25, 50].map(amount => <button key={amount} onClick={() => { dispatch({ type: 'AWARD_TOKENS', amount }); setMessage(`Added ${amount} tokens to ${learnerLabel}. `); }}>Give {amount} tokens</button>)}</div></section>
    <p className="text-xs text-slate-400">These controls are for teacher-guided use. Changes apply to the selected learner. This device dashboard does not require a teacher login.</p>
  </div>;
}
