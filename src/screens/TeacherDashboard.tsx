import { TeacherShortcuts } from '../components/teacher/TeacherShortcuts';
import '../components/teacher/teacher-modern.css';
import { LearnerSettings } from '../components/teacher/LearnerSettings';
import { RosterSpreadsheet } from './RosterSpreadsheet';
import { assignDemo, demoAssignment } from '../demo/demoClassroom';
import type { ScreenName } from '../types/session';
import { DEMO_MODE } from '../demo/demoMode';
import { useEffect, useRef, useState } from 'react';
import type { EngineState } from '../types/engine';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { generateLearningProblem, gradeLabel, normalizeLearning, type LearningSettings } from '../services/game/curriculum';
import { DiscoveryTeacherPanel } from './DiscoveryTeacherPanel';
import type { TeacherSaveResult } from '../services/persistence/saveTeacherSettings';
import type { LearnerIndex } from '../services/persistence/learnerIndex';
import type { ProfileResult } from '../services/persistence/learnerProfiles';
import { TeacherAdvancedPanel } from './TeacherAdvancedPanel';
import { TeacherLearnersPanel } from './TeacherLearnersPanel';
import './teacher.css';
import { TeacherLearningReport } from './TeacherLearningReport';

export function TeacherDashboard({ state, dispatch, onSave, onClose, learners, onSelectLearner, onCreateLearner }: { state: EngineState; dispatch: (action: GameEngineAction) => void; onSave: (settings: LearningSettings) => TeacherSaveResult; onClose: () => void; learners: LearnerIndex; onSelectLearner: (id: string) => ProfileResult; onCreateLearner: (label: string) => ProfileResult }) {
  const [draft, setDraft] = useState(state.learning);
  const [sample, setSample] = useState(() => generateLearningProblem(draft));
  const [result, setResult] = useState<TeacherSaveResult | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.learning);
  const preview = !DEMO_MODE && (state.devPreview || state.mode === 'test');
  const [tab, setTab] = useState<'overview' | 'learners' | 'learning' | 'rewards' | 'progress' | 'tools'>('overview');
  const [profileError, setProfileError] = useState('');
  const [pendingLearner, setPendingLearner] = useState<string | null>(null);
  const learnerLabel = learners.profiles.find(p => p.id === learners.activeId)?.label ?? 'Learner';
  const selectLearner = (id: string, discard = false) => {
    if (!discard && (dirty || result?.status === 'error')) { setPendingLearner(id); setConfirmDiscard(true); return; }
    const selected = onSelectLearner(id);
    if (!selected.ok) setProfileError(selected.error);
  };
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = () => { if (dirty || result?.status === 'error') setConfirmDiscard(true); else onClose(); }; }, [onClose, dirty, result]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled)');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  const change = (patch: Partial<LearningSettings>) => {
    const next = normalizeLearning({ ...draft, ...patch });
    setDraft(next); setSample(generateLearningProblem(next)); setResult(null); setConfirmDiscard(false);
  };
  return <div className="teacher-dashboard teacher-modern fixed inset-0 z-[150] overflow-y-auto text-slate-100 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="teacher-title" ref={dialog} tabIndex={-1}>
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <header className="flex items-start justify-between gap-4"><div><p className="text-teal-300 text-sm font-bold">V-Pet for teachers</p><h1 id="teacher-title" className="text-3xl font-black mt-2">Teacher dashboard</h1><p className="text-slate-400 mt-2">A little encouragement. The right support. Everything in one place.</p></div><button className="rounded-xl border border-slate-600 p-3" onClick={() => closeRef.current()}>Close</button></header>
      <section className="teacher-profile-banner"><div><p className="eyebrow">{preview ? 'Preview only' : 'Selected learner'}</p><h2>{learnerLabel}</h2><p>Settings and rewards below belong to this learner only.</p><button className="growth-button mt-3" onClick={() => { setTab('learning'); requestAnimationFrame(() => { const field = document.getElementById('learner-grade-level'); field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'center' }); }); }}>Edit grade & learning settings</button></div><label>Choose learner<select aria-label="Choose learner" value={learners.activeId} disabled={preview} onChange={e => selectLearner(e.target.value)}>{learners.profiles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="teacher-summary"><span><strong>{gradeLabel(state.learning.grade)}</strong>saved math level</span><span><strong>{(state.companionRoster?.length ?? 0) + (state.pet ? 1 : 0)}</strong>companions</span><span><strong>{state.player.currencies.tokens}</strong>tokens</span></div></section>
      {tab==='progress'&&<>      <dl className="learner-facts" aria-label="Learner profile details"><div><dt>Current companion</dt><dd>{state.pet ? `${state.pet.name} · ${state.pet.stage}` : state.egg ? 'Egg ready for care' : 'Discovery week'}</dd></div><div><dt>Pet level</dt><dd>{state.pet?.progression.level ?? 'Not hatched'}</dd></div><div><dt>Correct answers today</dt><dd>{state.dailyGoals.mathSolved}</dd></div><div><dt>Lifetime correct answers</dt><dd>{state.player.lifetimeMathCorrect}</dd></div><div><dt>Saved practice topic</dt><dd>{state.learning.topic === 'mixed' ? 'Mixed practice' : state.learning.topic}</dd></div><div><dt>Hints and explanations</dt><dd>{state.learning.learningHelp !== false ? 'On' : 'Off'}</dd></div></dl>
<TeacherLearningReport rows={state.learningEvidence ?? []}/></>}
      {profileError && <p role="alert" className="text-amber-200">{profileError}</p>}
      {learners.error && <p role="alert" className="text-amber-200">{learners.error}</p>}
      <div hidden={tab!=='learning'&&!dirty&&!confirmDiscard} className="sticky top-0 z-10 rounded-2xl border border-teal-800 bg-slate-950/95 p-4 shadow-xl space-y-3">
        <div className="teacher-save-controls"><button className="min-h-12 rounded-xl bg-teal-300 text-slate-950 px-6 py-3 font-black" onClick={() => { setResult(onSave(draft)); setConfirmDiscard(false); }}>{preview ? 'Apply to preview' : 'Save settings'}</button><button className="growth-button" disabled={!dirty} onClick={() => { setDraft(state.learning); setSample(generateLearningProblem(state.learning)); setResult(null); setConfirmDiscard(false); setPendingLearner(null); }}>Reset changes</button><span role="status" className={result?.status === 'error' ? 'text-amber-200' : 'text-teal-300'}>{result?.status === 'error' ? `Not saved. ${result.message}` : result?.status === 'saved' ? (DEMO_MODE ? 'Saved for this demo learner until reload.' : 'Saved for this learner’s whole profile on this browser.') : result?.status === 'preview' ? 'Preview updated only. Your real learner’s saved settings are unchanged.' : dirty ? 'Unsaved changes—press Save to keep them.' : 'Settings apply to all companions. Save to confirm.'}</span></div>
        {confirmDiscard && <div role="alert"><p>{result?.status === 'error' ? 'Saving failed. Settings are active in this session but may be lost if you leave.' : pendingLearner ? 'Discard unsaved math changes before switching learners?' : 'You have unsaved changes. Discard them and close?'}</p><div className="flex gap-3 mt-2"><button className="growth-button" onClick={() => { setConfirmDiscard(false); setPendingLearner(null); }}>Keep editing</button><button className="growth-button" onClick={() => pendingLearner ? selectLearner(pendingLearner, true) : onClose()}>{pendingLearner ? 'Discard and switch' : result?.status === 'error' ? 'Close without saving' : 'Discard changes'}</button></div></div>}
      </div>
      {preview && <div className="text-amber-200 space-y-3"><p>Developer preview: changes here are temporary, not profile-wide saves.</p>{!DEMO_MODE && <button className="growth-button" onClick={() => dispatch({ type: state.devPreview ? 'EXIT_DEV_PREVIEW' : 'EXIT_TEST_MODE' })}>Edit real learner settings</button>}</div>}
      <nav className="teacher-tabs" aria-label="Teacher sections">{([['overview','Overview'], ['learners', 'Learners'], ['learning', 'Learning'], ['rewards', 'Gifts & eggs'], ['progress','Progress'], ['tools','Class tools']] as const).map(([id, title]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{title}</button>)}</nav>
      {tab === 'overview' && <TeacherShortcuts learner={learnerLabel} onEgg={()=>setTab('rewards')} onGifts={()=>setTab('rewards')} onLearning={()=>setTab('learning')} onTools={()=>setTab('tools')}/>}
      {tab === 'learners' && <TeacherLearnersPanel profiles={learners.profiles} activeId={learners.activeId} disabled={!!preview} onSelect={selectLearner} onCreate={label => dirty ? { ok: false, error: 'Save or discard math changes before adding a learner.' } : onCreateLearner(label)} />}
      {tab === 'learning' && <div className="space-y-6">
      <LearnerSettings value={draft} onChange={change}/>
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 grid sm:grid-cols-2 gap-5" aria-label="Learning settings">
        <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" aria-label="School-safe care" className="mt-1 w-6 h-6" checked={draft.schoolSafe !== false} onChange={e => change({ schoolSafe: e.target.checked })}/><span><strong>School-safe care</strong><span className="block text-slate-400 text-sm mt-2">On by default: no passive need decay or missed-day penalties, free essential care, and 150 growth XP per complete care date, plus 70 bonus XP on each of the first five completed math questions per day. Turning it off restores the legacy pet simulation. Save this choice.</span></span></label>
        <label className="flex items-start gap-3 pt-2"><input type="checkbox" className="mt-1 w-6 h-6" checked={draft.timedWarmup} onChange={e => change({ timedWarmup: e.target.checked })}/><span><strong>Timed battle warmup</strong><span className="block text-slate-400 text-sm mt-2">Optional 15-second challenge. Off by default. Practice and Catch Math have no answer timer; action and tracing games keep their own mechanics.</span></span></label>
        <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" aria-label="Learning help prompts" className="mt-1 w-6 h-6" checked={draft.learningHelp !== false} onChange={e => change({ learningHelp: e.target.checked })}/><span><strong>Learning help prompts</strong><span className="block text-slate-400 text-sm mt-2">Offer a hint and a worked explanation after an incorrect math answer. On by default; students can dismiss each offer. Turn off for independent practice. Retries stay available. Save this choice for the selected learner.</span></span></label>
      </section>
      <section className="rounded-2xl border border-teal-800 bg-teal-950/40 p-5"><div className="flex justify-between gap-3"><h2 className="font-bold text-teal-300">Question preview · {gradeLabel(draft.grade)}</h2><button className="underline min-h-11" onClick={() => setSample(generateLearningProblem(draft))}>Another example</button></div><p className="text-2xl font-bold my-4">{sample.question}</p><p>Answer: <strong>{sample.answer}</strong></p><p className="text-sm text-slate-300 mt-2">Teaching hint: {sample.hint}</p></section>
      <p className="text-sm text-slate-300">Saving covers every current and future companion, discovery, evolution, Math Practice, Catch Math, and battle math. Unanswered discovery/evolution questions update without losing completed work. Strategy games use the challenge setting when starting a new game; active boards are not reset.</p>
      </div>}
      {tab === 'rewards' && <><TeacherAdvancedPanel state={state} dispatch={dispatch} learnerLabel={learnerLabel}/><DiscoveryTeacherPanel state={state} dispatch={dispatch} onClose={() => closeRef.current()} /></>}
      <div hidden={tab!=='tools'}>{DEMO_MODE && <section className="teacher-card"><h2>Playable classroom demo</h2><p>Add learners, switch accounts, set math levels, give rewards, and play their assigned activity. Demo learners and progress reset on reload. For children playing across devices, use the classroom game with private login cards and online saves.</p><a className="growth-button primary" href="https://auralith-classroom-pilot.deandresample3.workers.dev">Open classroom game · teacher & student sign-in</a><label className="block my-4">Assigned activity<select className="teacher-input" defaultValue={demoAssignment(learners.activeId)} onChange={e => assignDemo(learners.activeId, e.target.value as ScreenName)}>{([['math', 'Math practice'], ['catch_math', 'Catch Math'], ['pet_care', 'Companion care'], ['woodland', 'Woodland adventure'], ['home_builder', 'Build your home']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="growth-button" onClick={() => { dispatch({ type: 'SET_SCREEN', screen: demoAssignment(learners.activeId) }); onClose(); }}>Play this learner’s activity</button></section>}
      <RosterSpreadsheet rows={learners.profiles.map(p => ({ id: p.id, alias: p.label }))}/>
      <details className="teacher-card mt-5"><summary>About learning & device saves</summary><h2 className="font-bold">This device’s learner</h2><p className="mt-2 text-slate-300">Correct today: {state.dailyGoals.mathSolved} · Lifetime correct: {state.player.lifetimeMathCorrect} · Pet level: {state.pet?.progression.level ?? 'Not hatched'}</p><p className="text-sm text-slate-400 mt-3">Settings cover Math Practice, Catch Math, discovery and evolution missions, battle questions, and solve-before-trace challenges. Momentum and Number Merge remain strategy games with their own difficulty controls.</p><p className="text-sm text-slate-400 mt-3">K–12 presets provide starter practice topics, not a complete or certified curriculum. Grades 9–12 are suggested course groupings; choose what matches your class.</p><p className="text-sm text-slate-400 mt-3">Local device only. This is not an authenticated teacher account or synced class roster; anyone using this browser can change settings.</p></details></div>
    </div>
  </div>;
}
