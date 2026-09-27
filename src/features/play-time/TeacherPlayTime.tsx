import { useCallback, useEffect, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import type { PlayPolicy, TeacherPlayTime as Data } from './model';
import { getSkill } from '../skill-challenge/catalog';
import './play-time.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const minutes = (ms: number) => `${Math.ceil(ms / 60000)} min`;

/** `compact` is the Today view: live controls and stuck students only; rules and per-student rows live under More tools. */
export function TeacherPlayTime({ disabled = false, compact = false }: { disabled?: boolean; compact?: boolean }) {
  const [data, setData] = useState<Data | null>(null), [draft, setDraft] = useState<PlayPolicy | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const refresh = useCallback(async () => { const next = await pilotAPI<Data>('play-time'); setData(next); setDraft(next.policy); }, []);
  useEffect(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]);
  const act = async (op: string, body: unknown, done: string) => {
    if (busy || disabled) return; setBusy(true); setMessage('');
    try { await pilotAPI(`play-time/${op}`, 'POST', body); await refresh(); setMessage(done); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update game time.'); }
    finally { setBusy(false); }
  };
  if (!data || !draft) return <section className="pilot-card"><h2>Game time</h2><p role="status">{message || 'Loading game time…'}</p></section>;
  const p = data.policy, classMathOnly = p.mathOnlyUntil > data.serverNow, overridden = p.classOverride !== 'auto' && p.overrideUntil > data.serverNow;
  const num = (key: keyof PlayPolicy, label: string, max: number) => <label>{label}<input type="number" min={1} max={max} value={draft[key] as number} disabled={busy || disabled} onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })}/></label>;
  return <section className="pilot-card play-time-teacher" aria-label="Game time"><h2>Game time</h2>
    <p>Students earn game minutes by solving math (wrong answers and copied answers earn nothing). Math games never use minutes. A stuck student can earn a small daily amount by studying a worked example and trying again. Right now it is <strong>{data.mode === 'class' ? 'class time' : 'home time'}</strong>{overridden ? ' (set by you for today)' : ''}.</p>
    {message && <p role="status">{message}</p>}
    {data.students.some(s => s.active && s.stuck.length) && <section className="quick-check-gaps" aria-label="Stuck students"><h3>Stuck — needs you</h3>
      <p>These students missed three first tries in a row on one skill. Wrong answers don’t earn game time, so a quick check-in or a time grant is your call.</p>
      <ul>{data.students.filter(s => s.active && s.stuck.length).map(s => <li key={s.id}><strong>{s.alias}</strong>: {s.stuck.map(x => getSkill(x.skillId)?.name ?? x.topic).join(', ')}{' '}
        <button disabled={busy || disabled} onClick={() => void act('grant', { studentId: s.id, minutes: 10 }, `Gave ${s.alias} 10 minutes.`)}>Give 10 minutes</button>
        <button disabled={busy || disabled} onClick={() => void act('dismiss-stuck', { studentId: s.id }, `Cleared ${s.alias}’s alert.`)}>Dismiss</button></li>)}</ul>
    </section>}
    <div className="play-time-actions">
      <button disabled={busy || disabled} onClick={() => void act('class', { state: data.mode === 'class' ? 'off' : 'on' }, 'Class time updated.')}>{data.mode === 'class' ? 'Turn class time off' : 'Turn class time on'}</button>
      {overridden && <button disabled={busy || disabled} onClick={() => void act('class', { state: 'auto' }, 'Back to your school hours.')}>Use school hours</button>}
      <button disabled={busy || disabled} onClick={() => void act('math-only', { on: !classMathOnly }, classMathOnly ? 'Games are back on.' : 'Games paused for the whole class.')}>{classMathOnly ? 'Resume games for everyone' : 'Math only right now (whole class)'}</button>
    </div>
    {!compact && <><details><summary>Rules and school hours</summary>
      <label><input type="checkbox" checked={draft.enabled} disabled={busy || disabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })}/> Require earned game time</label>
      <div className="play-time-grid">{num('questionsPerRound', 'Questions per round', 20)}{num('minutesPerRound', 'Minutes earned per round', 60)}{num('classCapMinutes', 'Most minutes held in class', 120)}{num('homeCapMinutes', 'Most minutes saved at home', 600)}<label>Daily “stuck” minutes (0 = off)<input type="number" min={0} max={30} value={draft.floorMinutes} disabled={busy || disabled} onChange={e => setDraft({ ...draft, floorMinutes: Number(e.target.value) })}/></label>
        <label>School starts<input type="time" value={draft.schoolStart} disabled={busy || disabled} onChange={e => setDraft({ ...draft, schoolStart: e.target.value })}/></label>
        <label>School ends<input type="time" value={draft.schoolEnd} disabled={busy || disabled} onChange={e => setDraft({ ...draft, schoolEnd: e.target.value })}/></label></div>
      <fieldset><legend>School days</legend>{DAYS.map((d, i) => <label key={d}><input type="checkbox" checked={draft.schoolDays.includes(i)} disabled={busy || disabled} onChange={e => setDraft({ ...draft, schoolDays: e.target.checked ? [...draft.schoolDays, i] : draft.schoolDays.filter(x => x !== i) })}/> {d}</label>)}</fieldset>
      <p>Class minutes can't be saved up: they disappear when class time ends. Home minutes can't be spent during school hours. Time zone: {draft.timeZone}.</p>
      <button disabled={busy || disabled} onClick={() => { const { enabled, questionsPerRound, minutesPerRound, classCapMinutes, homeCapMinutes, schoolDays, schoolStart, schoolEnd, floorMinutes } = draft; void act('policy', { enabled, questionsPerRound, minutesPerRound, classCapMinutes, homeCapMinutes, schoolDays, schoolStart, schoolEnd, floorMinutes }, 'Game-time rules saved.'); }}>Save game-time rules</button>
    </details>
    <details><summary>Students ({data.students.filter(s => s.active).length})</summary><div className="quick-check-table"><table><thead><tr><th>Student</th><th>Minutes</th><th>Toward next</th><th/></tr></thead><tbody>
      {data.students.filter(s => s.active).map(s => { const paused = s.mathOnlyUntil > data.serverNow; return <tr key={s.id}><td>{s.alias}</td><td>{minutes(s.view.balanceMs)}</td><td>{s.view.progress}/{s.view.questionsPerRound}</td>
        <td><button disabled={busy || disabled} onClick={() => void act('math-only', { studentId: s.id, on: !paused }, paused ? `Games back on for ${s.alias}.` : `Math only for ${s.alias}.`)}>{paused ? 'Resume games' : 'Math only'}</button></td></tr>; })}
    </tbody></table></div></details></>}
  </section>;
}
