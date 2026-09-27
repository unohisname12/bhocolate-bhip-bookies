import { TeacherToday } from '../features/teacher-today/TeacherToday';
import { TeacherPlayTime } from '../features/play-time/TeacherPlayTime';
import { PetHuntLauncher } from '../features/pet-hunt/PetHuntLauncher';
import {PetDuels} from '../features/pet-duel/PetDuels';
import { TeacherBattleLauncher } from '../features/teacher-battle/TeacherBattle';
import { TeacherQuickChecks } from '../features/quick-check/TeacherQuickChecks';
import { TeacherSkillChallenge } from '../features/skill-challenge/SkillChallenge';
import { PortalTeacher } from '../features/portal-party/PortalParty';
import { TeacherInsights } from '../features/teacher-insights/TeacherInsights';
import { useTeacherInsights } from '../features/teacher-insights/useTeacherInsights';
import { SignInCard, TeacherSignInShortcut, ExistingStudentShortcut } from './SignInCard';
import { TeacherShortcuts } from '../components/teacher/TeacherShortcuts';
import { TeacherPrizePicker } from '../features/clash/TeacherPrizePicker';
import { DeliveryTeacher } from '../features/delivery/DeliveryTeacher';
import '../components/teacher/teacher-modern.css';
import { ADVENTURE_STYLES, STYLE_KEYS } from '../config/discoveryConfig';
import type { AdventureStyle } from '../types/discovery';
import { BulkSettings } from './BulkSettings';
import { GradeRecovery } from './GradeRecovery';
import { NicknameTools } from './NicknameTools';
import { PetNameTools } from './PetNameTools';
import { RivalBoard } from '../features/rivals/RivalBoard';
import { RosterImport } from './RosterImport';
import { LearnerSettings } from '../components/teacher/LearnerSettings';
import { RosterSpreadsheet } from '../screens/RosterSpreadsheet';
import { ClassroomClash } from '../features/clash/ClassroomClash';
import { useEffect, useState } from 'react';
import { generateLearningProblem, normalizeLearning, gradeLabel, type LearningSettings } from '../services/game/curriculum';
import { COMPANIONS } from '../config/companionConfig';
import { TeacherLearningReport } from '../screens/TeacherLearningReport';
import type { LearningEvidence } from '../types/woodland';
import { pilotAPI, downloadJSON } from './api';

export interface Learner { discovery?: { days: number; status: string; quizAnswered: number; creditedToday: boolean } | null; settingsVersion: number; nicknameVersion: number; nicknameAt: number; id: string; alias: string; active: boolean; revision: number; updatedAt: number; assignment: string; learning: LearningSettings; pet: { name: string; species: string; stage: string } | null; correct: number; evidence: LearningEvidence[]; needsRecovery: boolean }
interface Classroom { classCode: string; maxStudents: number; students: Learner[] }
interface Card { id?: string; alias: string; code: string }
interface History { recent: { revision: number; created_at: number }[]; daily: { revision: number; created_at: number; day: string }[] }
const activityNames: Record<string, string> = { discovery: 'Discovery week', bridge: 'Woodland bridge adventure', practice: 'Math practice', care: 'Companion care', free: 'Choose a mini-game' };
const displayCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code;

function LearnerEditor({ learner, busy, submit, replaceCode, pause, recover, onDirtyChange, onGift }: { onGift: () => void; onDirtyChange: (dirty: boolean) => void; learner: Learner; busy: boolean; submit: (data: unknown) => void; replaceCode: () => void; pause: () => void; recover: () => void }) {
  const [section, setSection] = useState<'learning'|'egg'|'progress'|'access'>('learning');
  const [learning, setLearning] = useState(learner.learning);
  const [assignment, setAssignment] = useState(learner.assignment);
  const [companion, setCompanion] = useState('');
  const [activityStyle, setActivityStyle] = useState<AdventureStyle>('help');
  const [activityConfirmed, setActivityConfirmed] = useState(false);
  const dirty = JSON.stringify(learning) !== JSON.stringify(learner.learning) || assignment !== learner.assignment;
  const [sample, setSample] = useState(() => generateLearningProblem(learner.learning));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  const changeLearning = (patch: Partial<LearningSettings>) => { const next = normalizeLearning({ ...learning, ...patch }); setLearning(next); setSample(generateLearningProblem(next)); };
  const reset = () => { setLearning(learner.learning); setAssignment(learner.assignment); setCompanion(''); setSample(generateLearningProblem(learner.learning)); };

  return <section className="pilot-card pilot-editor" aria-label="Selected learner profile"><header><p className="pilot-eyebrow">Private teacher controls</p><h2>{learner.alias}</h2><p>{learner.pet ? `${learner.pet.name} · ${learner.pet.stage}` : 'Growing toward their first companion'}</p><button onClick={() => { setSection('learning'); requestAnimationFrame(() => { const field = document.getElementById('learner-grade-level'); field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'center' }); }); }}>Edit grade & learning settings</button></header>
    <nav className="teacher-segmented" aria-label="Student controls">{([['learning','Learning'],['egg','Egg progress'],['progress','Progress'],['access','Login & recovery']] as const).map(([id,label])=><button key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</nav>
    {section==='progress'&&<>    <dl className="learner-facts" aria-label="Learner profile details"><div><dt>Saved math level</dt><dd>{gradeLabel(learner.learning.grade)}</dd></div><div><dt>Saved practice topic</dt><dd>{learner.learning.topic === 'mixed' ? 'Mixed practice' : learner.learning.topic}</dd></div><div><dt>Current activity</dt><dd>{activityNames[learner.assignment] ?? learner.assignment}</dd></div><div><dt>Correct practice answers</dt><dd>{learner.correct}</dd></div><div><dt>Login access</dt><dd>{learner.active ? 'Active' : 'Paused'}</dd></div><div><dt>Last saved progress</dt><dd>{new Date(learner.updatedAt).toLocaleString()}</dd></div></dl>
    <details><summary>Account identifier for your private roster</summary><p className="pilot-code">{learner.id}</p><p>Match this account to the name in your downloaded spreadsheet.</p></details>
<TeacherLearningReport rows={learner.evidence}/></>}
    {learner.needsRecovery && <p role="alert">This save needs recovery. Open Login & recovery, then Saved history & recovery; do not create another learner to replace it.</p>}
    <div hidden={section!=='learning'}><form onSubmit={event => { event.preventDefault(); submit({ operation: 'settings', learning, assignment }); }}>
      <LearnerSettings value={learning} onChange={changeLearning} disabled={busy}/>
      <fieldset disabled={busy}><legend className="mt-5 font-bold">Activity and learning support</legend><div className="pilot-form-grid">
      <label>Assigned activity<select value={assignment} onChange={e => setAssignment(e.target.value)}>{Object.entries(activityNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="pilot-check"><input type="checkbox" checked={learning.learningHelp !== false} onChange={e => changeLearning({ learningHelp: e.target.checked })}/>Offer hints and explanations</label>
      <label className="pilot-check"><input type="checkbox" checked={learning.showAllGames === true} onChange={e => changeLearning({ showAllGames: e.target.checked })}/>Show every game from the start (otherwise games unlock as the student plays)</label></div></fieldset>
      <p className="pilot-small">No changes apply until saved. School-safe care and untimed warmups stay on for this pilot. Assignments guide the next activity; other mini-games remain available.</p>
      <section className="teacher-question-preview"><h3>Question preview · {gradeLabel(learning.grade)}</h3><p>{sample.question}</p><p>Answer: <strong>{sample.answer}</strong></p><p>Teaching hint: {sample.hint}</p><button type="button" disabled={busy} onClick={() => setSample(generateLearningProblem(learning))}>Another example</button></section>
      <div className="learner-save-actions"><span>{busy ? 'Saving…' : dirty ? `Unsaved changes for ${learner.alias}` : 'Showing saved settings'}</span><button type="button" disabled={busy || !dirty} onClick={reset}>Reset changes</button><button className="pilot-primary" disabled={busy}>Save learner settings</button></div>
    </form></div>
    <div hidden={section!=='egg'}><section className="teacher-egg-explainer"><h3>Help their egg journey along.</h3><p>Activities count toward five discovery days. Give a pass to save one day, or record work you did together in class.</p><button className="pilot-primary" onClick={onGift} disabled={busy || dirty}>Give an early egg pass</button></section>
      <label>Next discovery companion<select value={companion} onChange={e => setCompanion(e.target.value)}><option value="">Keep existing choice</option><option value="automatic">Let activities decide</option>{Object.entries(COMPANIONS).map(([id, pet]) => <option key={id} value={id}>{pet.name}</option>)}</select><button type="button" disabled={busy || dirty || !companion} onClick={() => submit({ operation: 'companion', companion: companion === 'automatic' ? null : companion })}>Save companion choice</button></label>
    <p>Companion choices affect an unissued discovery egg. Existing pets stay with the student.</p>
    {learner.discovery && <section aria-label="Egg activity progress"><h3>Egg activity progress · {learner.discovery.days} / 5 days</h3><p>Optional questionnaire: {learner.discovery.quizAnswered} / 4 preferences answered. Activities count even without it.</p>{learner.discovery.status === 'collecting' && <><label>Completed classroom activity theme<select value={activityStyle} onChange={e => setActivityStyle(e.target.value as AdventureStyle)}>{STYLE_KEYS.map(style => <option key={style} value={style}>{ADVENTURE_STYLES[style].label}</option>)}</select></label><label><input type="checkbox" checked={activityConfirmed} onChange={e => setActivityConfirmed(e.target.checked)}/> I guided a classroom activity with this learner today.</label><button disabled={busy || dirty || !activityConfirmed || learner.discovery.creditedToday || learner.discovery.days >= 5} onClick={() => { submit({ operation: 'activity', style: activityStyle, confirmed: true }); setActivityConfirmed(false); }}>{learner.discovery.creditedToday ? 'Today’s activity already counts' : 'Record today’s classroom activity'}</button></>}</section>}
    {!learner.pet && <p className="pilot-small">Eggs need five separate activity days. Students keep a mystery egg while their daily adventure choices shape the companion they hatch. A teacher’s early egg pass can replace one day.</p>}</div>
    <div hidden={section!=='access'}><p>Help {learner.alias} sign in again, pause access, or recover saved progress.</p><div className="pilot-actions"><button disabled={busy || dirty} onClick={replaceCode}>Replace lost login card</button><button disabled={busy || dirty} onClick={pause}>{learner.active ? 'Pause this login' : 'Resume this login'}</button><button disabled={busy || dirty} onClick={recover}>Saved history & recovery</button></div>
    </div>
  </section>;
}

export function PilotTeacher({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'today'|'overview'|'students'|'alerts'|'reports'|'gifts'|'activities'|'challenges'|'tools'>(new URLSearchParams(window.location.search).has('skillChallenge')?'challenges':'today');
  // Most teachers only need Today; the full dashboard stays one click away and remembers being opened.
  const [moreTools, setMoreTools] = useState(() => { try { return localStorage.getItem('vpet-teacher-more-tools') === '1'; } catch { return false; } });
  const toggleMore = () => { const next = !moreTools; setMoreTools(next); try { localStorage.setItem('vpet-teacher-more-tools', next ? '1' : '0'); } catch { /* per-device preference only */ } if (!next) setTab('today'); };
  const openTab = (next: typeof tab) => { if (!moreTools) { setMoreTools(true); try { localStorage.setItem('vpet-teacher-more-tools', '1'); } catch { /* per-device preference only */ } } setTab(next); };
  const [insightDays,setInsightDays]=useState(7),[reportStudent,setReportStudent]=useState('');
  const insights=useTeacherInsights(insightDays);
  const [giftPreset, setGiftPreset] = useState('');
  const openGifts = (early = false) => { setGiftPreset(early ? 'gift_early_hatch' : ''); setTab('gifts'); requestAnimationFrame(()=>document.getElementById('teacher-content')?.scrollIntoView({behavior:'smooth',block:'start'})); };
  const [room, setRoom] = useState<Classroom | null>(null), [selected, setSelected] = useState('');
  const [count, setCount] = useState(1), [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const mayLeave = () => !dirty || window.confirm('Discard unsaved learner settings?');
  useEffect(() => { const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave); }, [dirty]);
  const [history, setHistory] = useState<History | null>(null);
  const learner = room?.students.find(row => row.id === selected);
  const refresh = async () => { const data = await pilotAPI<Classroom>('teacher/classroom'); setRoom(data); setSelected(current => data.students.some(row => row.id === current) ? current : data.students[0]?.id ?? ''); return data; };
  useEffect(() => { void refresh().catch(error => setMessage(error instanceof Error ? error.message : 'Could not load your classroom.')); }, []);
  const run = async (operation: () => Promise<void>) => { if (busy) return; setBusy(true); setMessage(''); try { await operation(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not finish. Refresh and retry.'); } finally { setBusy(false); } };
  const change = (data: unknown) => { void run(async () => {
    if (!learner) return;
    const { operation, ...body } = data as Record<string, unknown>;
    await pilotAPI(`teacher/students/${learner.id}/${operation}`, 'POST', { ...body, revision: learner.revision, settingsVersion: learner.settingsVersion, requestId: crypto.randomUUID() });
    await refresh(); setMessage(operation==='activity' ? `Today’s classroom activity is recorded for ${learner.alias}.` : operation==='companion' ? `Next companion choice saved for ${learner.alias}.` : `Saved for ${learner.alias}. Learning changes apply on the next question.`);
  }); };
  const restore = async (targetRevision?: number, backup?: unknown) => {
    if (!learner || !window.confirm(`Restore ${learner.alias}'s selected recovery copy? This replaces current progress. The current server copy remains in recent history.`)) return;
    await pilotAPI(`teacher/students/${learner.id}/restore`, 'POST', { revision: learner.revision, targetRevision, backup, confirm: 'RESTORE' });
    await refresh(); setHistory(null); setMessage(`Recovered ${learner.alias}. Ask the learner to reload their saved pet.`);
  };
  return <main className="pilot-teacher teacher-modern"><div className="pilot-teacher-inner"><header className="pilot-teacher-heading"><div><p className="pilot-eyebrow">V-Pet for teachers</p><h1>Your classroom.</h1><p>Learning, support, and a next step for every student.</p></div><div className="pilot-actions"><button onClick={()=>openGifts(true)}>Give an early egg pass</button><button disabled={busy} onClick={() => { if (!mayLeave()) return; void run(async () => { await pilotAPI('logout', 'POST', {}); onLogout(); }); }}>Teacher sign out</button></div></header>
    <p role="status" className="pilot-message">{message}</p>
    <div className="teacher-student-bar"><div><span className="teacher-kicker">Helping today</span><strong>{learner?.alias ?? 'Choose a student'}</strong></div><label>Selected student<select aria-label="Selected student" value={selected} disabled={busy} onChange={e=>{if(!mayLeave())return;setSelected(e.target.value);setDirty(false);setHistory(null);}}>{room?.students.map(row=><option key={row.id} value={row.id}>{row.alias}</option>)}</select></label><span>{room?.students.length??0} students · {room?.students.filter(s=>s.active).length??0} active</span></div>
    <nav className="teacher-main-nav" aria-label="Classroom menus">{([['today','Today','What matters this period'],...(moreTools?[['overview','Overview','Your class at a glance'],['students','Students','Learning & progress'],['alerts','Alerts','Live teaching suggestions'],['reports','Reports','Skills & outcomes'],['gifts','Gifts','Encourage & celebrate'],['challenges','Skill challenges','Growth & mastery'],['activities','Class activities','Play & learn together'],['tools','Class tools','Logins & class setup']] as const:[])] as const).map(([id,label,hint])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}><strong>{label}{id==='alerts'&&insights.data?.enabled&&<small> · {insights.data.alerts.filter(a=>a.active&&a.status==='new').length}</small>}</strong><span>{hint}</span></button>)}<button className="teacher-more-tools" aria-expanded={moreTools} onClick={toggleMore}><strong>{moreTools?'Fewer tools':'More tools'}</strong><span>{moreTools?'Back to just Today':'Reports, alerts, gifts, challenges…'}</span></button></nav>
    <div id="teacher-content" className="teacher-content">
    {tab==='today'&&<TeacherToday learners={room?.students??[]} insights={insights.data} refresh={refresh} openTab={openTab} disabled={busy||dirty}/>}
    {tab==='overview'&&<TeacherPlayTime disabled={busy||dirty}/>}
    {tab==='reports'&&<TeacherQuickChecks disabled={busy||dirty}/>}
    {(['overview','alerts','reports'] as string[]).includes(tab)&&<TeacherInsights mode={tab as 'overview'|'alerts'|'reports'} {...insights} days={insightDays} onDays={setInsightDays} focusStudent={reportStudent} disabled={busy||dirty} onApplied={refresh} onStudent={id=>{if(!mayLeave())return;setSelected(id);setReportStudent(id);setTab('reports');}}/>}
    {tab==='overview'&&<TeacherShortcuts learner={learner?.alias} onEgg={()=>openGifts(true)} onGifts={()=>openGifts()} onLearning={()=>{setTab('students');requestAnimationFrame(()=>document.querySelector('.pilot-editor')?.scrollIntoView({behavior:'smooth',block:'start'}));}} onTools={()=>setTab('tools')}/>}

    {tab==='gifts'&&<section className="pilot-card"><p className="teacher-kicker">Encourage their next step</p><h2>Something to smile about.</h2><p>Send a gift to one student or your whole class. Students collect it when they are ready.</p><TeacherPrizePicker key={`${selected}-${giftPreset}`} standings={[]} initialStudentId={selected} initialPrizeId={giftPreset} defaultOpen/></section>}
    {tab==='challenges'&&<TeacherSkillChallenge/>}
    {tab==='activities'&&<><RivalBoard teacher/><section className="pilot-card"><h2>Learn together. Play together.</h2><p>Start a math challenge in Classroom Clash, or run a team delivery activity. Gifts have their own menu above.</p></section><PetHuntLauncher teacher/><PetDuels teacher/><TeacherBattleLauncher/><PortalTeacher/><ClassroomClash teacher showTeacherTools={false}/><DeliveryTeacher/></>}
    <div hidden={tab!=='students'}><section className="pilot-card"><div className="pilot-actions"><h2>Learner profiles</h2><button disabled={busy || dirty} onClick={() => { void run(async () => { await refresh(); setMessage('Roster refreshed.'); }); }}>Refresh roster</button><button disabled={busy} onClick={() => { void run(async () => { const data = await pilotAPI('teacher/export'); downloadJSON(`auralith-class-backup-${new Date().toISOString().slice(0, 10)}.json`, data); setMessage('Backup downloaded. Store it privately with your school’s approved files.'); }); }}>Download class backup</button></div><p>Save settings, choose the next activity, or help a learner recover. Use the same learner entry each time—not a new account.</p><label>Find learner account<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Learner number or account ID"/></label><div className="pilot-roster">{room?.students.filter(row => `${row.alias} ${row.id}`.toLowerCase().includes(search.toLowerCase())).map(row => <button className={selected === row.id ? 'selected' : ''} key={row.id} aria-pressed={selected === row.id} disabled={busy} onClick={() => { if (selected === row.id || !mayLeave()) return; setSelected(row.id); setDirty(false); setHistory(null); }}><strong>{row.alias}</strong><span>{row.active ? row.pet ? `${row.pet.name} · ${row.pet.stage}` : 'Awaiting hatch' : 'Login paused'}</span><span>{gradeLabel(row.learning.grade)} · {row.learning.challenge}</span><span>{row.learning.topic === 'mixed' ? 'Mixed practice' : row.learning.topic} · {row.correct} correct</span><small>{selected === row.id ? 'Editing this learner below' : 'Open profile & settings →'}</small><small>{row.needsRecovery ? 'Needs recovery' : `Saved ${new Date(row.updatedAt).toLocaleString()}`}</small></button>)}</div></section>
    {learner && <LearnerEditor key={`${learner.id}-${learner.settingsVersion}`} learner={learner} busy={busy} onDirtyChange={setDirty} submit={change} onGift={()=>openGifts(true)} replaceCode={() => { if (window.confirm(`Replace ${learner.alias}'s login code? Their pet stays. Old cards and sessions stop working.`)) void run(async () => { const result = await pilotAPI<Card>(`teacher/students/${learner.id}/code`, 'POST', {}); setCards([result]); setTab('tools'); requestAnimationFrame(()=>document.querySelector('.pilot-cards')?.scrollIntoView({block:'start'})); setMessage('Replacement card ready. The pet and progress are unchanged.'); }); }} pause={() => { void run(async () => { await pilotAPI(`teacher/students/${learner.id}/pause`, 'POST', { active: !learner.active }); await refresh(); setMessage('Login access updated. Pet data is preserved.'); }); }} recover={() => { void run(async () => { setHistory(await pilotAPI<History>(`teacher/students/${learner.id}/history`)); }); }}/>} 
    {learner && history && <section className="pilot-card" aria-label="Saved history and recovery"><h2>Recover {learner.alias}</h2><p>Recent versions and the first save of each day are retained. Recovery intentionally replaces progress, but does not delete the current version immediately.</p><div className="pilot-history">{history.recent.filter(row => row.revision !== learner.revision).map(row => <button key={row.revision} disabled={busy} onClick={() => { void run(() => restore(row.revision)); }}>Restore version {row.revision} · {new Date(row.created_at).toLocaleString()}</button>)}</div><details><summary>Daily recovery copies</summary>{history.daily.map(row => <button key={row.day} disabled={busy} onClick={() => { void run(() => restore(row.revision)); }}>Restore {row.day} · version {row.revision}</button>)}</details><label>Or choose a downloaded class backup / device recovery file<input type="file" accept="application/json,.json" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; void run(async () => { if (file.size > 32 * 1024 * 1024) throw new Error('Choose a backup smaller than 32 MB.'); const data = JSON.parse(await file.text()); const backup = data.format === 'auralith-class-backup-v1' ? data.students.find((row: { studentId: string }) => row.studentId === learner.id) : data; if (!backup || backup.studentId !== learner.id) throw new Error('That file does not contain this learner. Nothing was changed.'); await restore(undefined, backup); }); }}/></label></section>}
    </div>
    <div hidden={tab!=='tools'}><section className="pilot-card"><h2>A well-organized classroom.</h2><p>Manage the class list, change settings for several students, and replace lost login cards from a student’s profile.</p></section>
    <TeacherSignInShortcut/>
    {room && <ExistingStudentShortcut classCode={room.classCode}/>}
    {room && <><BulkSettings learners={room.students} refresh={refresh} disabled={busy || dirty}/><NicknameTools learners={room.students} classCode={room.classCode} refresh={refresh} disabled={busy || dirty}/><PetNameTools disabled={busy || dirty}/></>}
    {room && <GradeRecovery learners={room.students} refresh={refresh} disabled={busy || dirty} onBusyChange={setBusy}/>}
    <section aria-label="Class tools"><h2 className="text-2xl font-bold mt-8">Class tools · login cards, roster spreadsheet & competitions</h2>

    <RosterSpreadsheet rows={room?.students ?? []} classCode={room?.classCode}/>
    {room && <RosterImport classCode={room.classCode} disabled={busy || dirty} onImported={refresh}/>}
    <section className="pilot-card"><h2>1. Give each learner their own card</h2><p>Class code: <strong className="pilot-code">{room ? displayCode(room.classCode) : 'Loading…'}</strong></p><p>Use approved nicknames in this app. Keep the mapping to real names only in your private offline spreadsheet. A lost card can be replaced without starting a new pet.</p>
    <form className="pilot-actions" onSubmit={event => { event.preventDefault(); void run(async () => { const result = await pilotAPI<{ cards: Card[] }>('teacher/students', 'POST', { count }); setCards(result.cards); await refresh(); setMessage('Cards created. Print or save them now—the secret codes are shown only this time.'); }); }}><label>Number of learner cards<input type="number" min="1" max="35" value={count} onChange={e => setCount(Number(e.target.value))}/></label><button disabled={busy || !room || dirty} className="pilot-primary">Create login cards</button></form><p className="pilot-small">{room?.students.length ?? 0} of 35 pilot places used. Pausing a login preserves its place and its pet.</p></section>
    {cards.length > 0 && <section className="pilot-card pilot-cards" aria-label="New private login cards"><h2>Print these private login cards</h2><p>Give only the matching card to each child. These are access credentials; do not post the whole sheet in the classroom.</p><div className="pilot-actions no-print"><button onClick={() => window.print()}>Print login cards</button><button onClick={() => downloadJSON('private-learner-login-cards.json', { url: window.location.origin, classCode: room?.classCode, cards })}>Save private card file</button><button onClick={() => { if (window.confirm('Have you printed or saved these secret codes? They cannot be displayed again.')) setCards([]); }}>Hide cards</button></div><div className="pilot-card-grid">{cards.map(card => <article key={card.alias} className="pilot-login-card"><h3>{card.alias}</h3><SignInCard label={card.alias} card={{role:'student',classCode:room?.classCode ?? '',code:card.code}}/><p>{window.location.origin}</p><p>Class: <strong>{displayCode(room?.classCode ?? '')}</strong></p><p>Secret pet code:<br/><strong className="pilot-code">{displayCode(card.code)}</strong></p><p>Keep this card private. Always Save & sign out.</p></article>)}</div></section>}
    </section>
    <details className="pilot-card pilot-small"><summary>Privacy, backups & classroom guidance</summary><h2>Before children use this pilot</h2><p>Have your school approve the service and its data retention. Tell families how pseudonymous pet/practice data is used where your school requires it. Keep the teacher key, login-card mapping and downloaded backups private. There are no public rosters, student emails, chats or advertisements.</p><p>Practice history is learning support, not a secure test or independently validated mastery measure. This is a supervised pilot, not a promise that data loss is impossible. Check “Saved online” before switching devices and download a class backup after each session.</p></details></div></div>
  </div></main>;
}
