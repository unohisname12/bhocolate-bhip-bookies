import { useCallback, useEffect, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import type { Learner } from '../../pilot/PilotTeacher';
import { gradeLabel } from '../../services/game/curriculum';
import type { InsightsData } from '../teacher-insights/model';
import type { TeacherChecks } from '../quick-check/model';
import { TeacherPlayTime } from '../play-time/TeacherPlayTime';
import { activityNames } from '../student-navigation/model';
import './teacher-today.css';

const SETUP_KEY = 'vpet-teacher-setup-done';
const DAY = 86400000;
const PLAYING_WINDOW = 2 * 60000;
// Activity codes come from the student's current screen; teachers see the game's own name.
const activityLabel = (code: string | null) => !code ? 'Home' : activityNames[code as keyof typeof activityNames] ?? (code.startsWith('run_') ? 'Dungeon adventure' : code === 'play' ? 'Games menu' : 'Playing');
const readFlag = () => { try { return localStorage.getItem(SETUP_KEY) === '1'; } catch { return false; } };

/** The teacher's first screen: the few things that matter during a class period. Everything else is under More tools. */
export function TeacherToday({ learners, insights, refresh, openTab, disabled }: {
  learners: Learner[]; insights: InsightsData | null; refresh: () => Promise<unknown>; openTab: (tab: 'reports' | 'tools' | 'students') => void; disabled: boolean;
}) {
  const [setupDone, setSetupDone] = useState(readFlag);
  const finishSetup = () => { try { localStorage.setItem(SETUP_KEY, '1'); } catch { /* setup shows again next visit */ } setSetupDone(true); };
  const playing = insights ? insights.students.filter(s => s.active && s.lastSeen && insights.serverTime - s.lastSeen < PLAYING_WINDOW) : [];
  return <section className="teacher-today" aria-label="Today">
    {!setupDone && <SetupSteps learners={learners} refresh={refresh} openTab={openTab} onDone={finishSetup} disabled={disabled}/>}
    <TeacherPlayTime compact disabled={disabled}/>
    <GapsToday openTab={openTab} disabled={disabled}/>
    <section className="pilot-card" aria-label="Playing now"><h2>Playing now ({playing.length})</h2>
      {playing.length ? <ul className="today-list">{playing.map(s => <li key={s.id}><strong>{s.alias}</strong> · {activityLabel(s.activity)}</li>)}</ul> : <p>Nobody is signed in right now.</p>}
    </section>
  </section>;
}

function GapsToday({ openTab, disabled }: { openTab: (tab: 'reports') => void; disabled: boolean }) {
  const [data, setData] = useState<(TeacherChecks & { loadedAt: number }) | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const load = useCallback(async () => { const next = await pilotAPI<TeacherChecks>('quick-checks'); setData({ ...next, loadedAt: Date.now() }); }, []);
  useEffect(() => { void load().catch(e => setMessage(e instanceof Error ? e.message : 'Could not load skill gaps.')); }, [load]);
  const clear = async (studentId: string, skillId: string, revision: number) => {
    setBusy(true); setMessage('');
    try { await pilotAPI('quick-checks/clear-gap', 'POST', { studentId, skillId, revision }); await load(); setMessage('Marked as taught.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update.'); } finally { setBusy(false); }
  };
  const now = data?.loadedAt ?? 0;
  const gaps = (data?.students ?? []).filter(s => s.active).flatMap(s => s.check.gaps.map(g => ({ ...g, student: s }))).sort((a, b) => b.at - a.at);
  const today = gaps.filter(g => now - g.at < DAY);
  return <section className="pilot-card" aria-label="Skill gaps today"><h2>New skill gaps ({today.length})</h2>
    <p>Skills students skipped with “I don’t know this yet.” {gaps.length > today.length && `${gaps.length - today.length} older gaps are in Reports.`}</p>
    {message && <p role="status">{message}</p>}
    {today.length ? <ul className="today-list">{today.map(g => <li key={`${g.student.id}:${g.skillId}`}><strong>{g.student.alias}</strong> · {g.skillName}
      <button disabled={busy || disabled} onClick={() => void clear(g.student.id, g.skillId, g.student.check.revision)}>Taught it</button></li>)}</ul> : <p>No new gaps today.</p>}
    <button className="today-link" onClick={() => openTab('reports')}>All skill gaps and checks →</button>
  </section>;
}

function SetupSteps({ learners, refresh, openTab, onDone, disabled }: { learners: Learner[]; refresh: () => Promise<unknown>; openTab: (tab: 'tools') => void; onDone: () => void; disabled: boolean }) {
  const [step, setStep] = useState(1), [grade, setGrade] = useState(String(learners[0]?.learning.grade ?? 4)), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [start, setStart] = useState('08:00'), [end, setEnd] = useState('14:45');
  const active = learners.filter(l => l.active).length;
  const act = async (op: () => Promise<unknown>, next: number) => {
    setBusy(true); setMessage('');
    try { await op(); setStep(next); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save. Try again.'); } finally { setBusy(false); }
  };
  const applyGrade = () => act(async () => {
    const rows = learners.filter(l => l.active).map(l => ({ id: l.id, version: l.settingsVersion, assignment: l.assignment, learning: { ...l.learning, grade: Number(grade), topic: 'mixed' } }));
    if (rows.length) await pilotAPI('teacher/settings-batch', 'POST', { rows, requestId: crypto.randomUUID() });
    await refresh();
  }, 2);
  const saveHours = () => act(() => pilotAPI('play-time/policy', 'POST', { schoolStart: start, schoolEnd: end, schoolDays: [1, 2, 3, 4, 5] }), 3);
  return <section className="pilot-card today-setup" aria-label="Set up your class"><p className="teacher-kicker">Set up your class · step {step} of 3</p>
    {message && <p role="alert">{message}</p>}
    {step === 1 && <><h2>What grade is your class working at?</h2><p>Everyone starts here. You can fine-tune any student later.</p>
      <label>Grade<select value={grade} onChange={e => setGrade(e.target.value)} disabled={busy || disabled}>{Array.from({ length: 13 }, (_, g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>
      <div className="pilot-actions"><button className="pilot-primary" disabled={busy || disabled} onClick={() => void applyGrade()}>Use {gradeLabel(Number(grade))} for {active} {active === 1 ? 'student' : 'students'}</button><button disabled={busy} onClick={() => setStep(2)}>Students are already set</button></div></>}
    {step === 2 && <><h2>When is class?</h2><p>During these hours students earn and spend class game time. Outside them, it's home time.</p>
      <div className="pilot-actions"><label>Starts<input type="time" value={start} onChange={e => setStart(e.target.value)}/></label><label>Ends<input type="time" value={end} onChange={e => setEnd(e.target.value)}/></label></div>
      <div className="pilot-actions"><button className="pilot-primary" disabled={busy || disabled} onClick={() => void saveHours()}>Save · Monday to Friday</button><button disabled={busy} onClick={() => setStep(3)}>Skip</button></div></>}
    {step === 3 && <><h2>Hand out login cards</h2><p>Each student gets a private link that works like a password. Make or print them in Class tools.</p>
      <div className="pilot-actions"><button className="pilot-primary" onClick={() => { onDone(); openTab('tools'); }}>Open login cards</button><button onClick={onDone}>I've done this</button></div></>}
    {step < 3 && <button className="today-link" onClick={onDone}>Skip setup</button>}
  </section>;
}
