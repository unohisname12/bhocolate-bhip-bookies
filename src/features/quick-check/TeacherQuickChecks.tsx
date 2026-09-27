import { MIDDLE_SCHOOL_GAPS } from './coverage';
import { useCallback, useEffect, useState } from 'react';
import { downloadJSON, pilotAPI } from '../../pilot/api';
import { gradeLabel } from '../../services/game/curriculum';
import type { TeacherChecks } from './model';
import './quick-check.css';

export function TeacherQuickChecks({ disabled = false }: { disabled?: boolean }) {
  const [data, setData] = useState<TeacherChecks | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const refresh = useCallback(async () => { const next = await pilotAPI<TeacherChecks>('quick-checks'); setData(next); }, []);
  useEffect(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]);
  const act = async (op: string, body: unknown) => {
    if (busy || disabled) return; setBusy(true); setMessage('');
    try { await pilotAPI(`quick-checks/${op}`, 'POST', body); await refresh(); setMessage('Check settings saved. Learning levels and pet progress are unchanged.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update checks.'); }
    finally { setBusy(false); }
  };
  return <section className="pilot-card quick-check-teacher" aria-label="Class skill checks"><h2>Short skill checks — every grade</h2>
    <p>Three untimed responses on first visit, then on your schedule. One finished check unlocks every game until the next one is due. Students can answer or tap “I don’t know this yet” — a skip counts as a response, is listed below as a gap, and that skill stops appearing for them until you clear it.</p>
    <details><summary>Curriculum coverage and remaining gaps</summary><p>Grades 6–8 each have 24 objectives across eight topics, with examples and targeted practice. Other grades currently have six objectives across two topics. Completing the listed objectives is not completing a grade. Teacher-assigned topics limit the rotation. High-school content is a selection of topics, not a complete Algebra, Geometry, or Calculus course.</p>
      {MIDDLE_SCHOOL_GAPS.map(g=><article key={g.grade}><h3>Grade {g.grade}</h3><p>Available samples: {g.available}.</p><p>Still missing or incomplete: {g.gaps}.</p><a href={g.source} target="_blank" rel="noreferrer">Compare grade {g.grade} standards</a></article>)}
    </details>
    {message && <p role="status">{message}</p>}
    <button disabled={busy} onClick={() => void refresh().catch(e => setMessage(e.message))}>Refresh skill checks</button>
    {data && (() => {
      const gaps = data.students.filter(s => s.active).flatMap(s => s.check.gaps.map(g => ({ ...g, student: s })));
      const exhausted = data.students.filter(s => s.active && s.check.exhausted);
      return <>{(gaps.length > 0 || exhausted.length > 0) && <section className="quick-check-gaps" aria-label="Skill gaps to teach"><h3>Skill gaps to teach ({gaps.length})</h3>
        {exhausted.map(s => <p key={s.id}><strong>{s.alias}</strong>: {s.check.outOfQuestions ? 'every supported skill at and below this level is marked not learned, so checks are paused.' : `fewer than three ${gradeLabel(s.check.learning.grade)} skills are left to check, so earlier-grade questions are filling in.`} Consider changing this learner’s grade or topic in Learning settings, or clear gaps you have taught.</p>)}
        {gaps.length > 0 && <div className="quick-check-table"><table><thead><tr><th>Student</th><th>Skill</th><th>Flagged</th><th/></tr></thead><tbody>{gaps.sort((a, b) => b.at - a.at).map(g => <tr key={`${g.student.id}:${g.skillId}`}><td>{g.student.alias}</td><td>{g.skillName}{g.grade !== g.student.check.learning.grade && <small> · {gradeLabel(g.grade)}</small>}</td><td>{new Date(g.at).toLocaleDateString()}</td><td><button disabled={busy || disabled} onClick={() => void act('clear-gap', { studentId: g.student.id, skillId: g.skillId, revision: g.student.check.revision })}>Taught it — allow again</button></td></tr>)}</tbody></table></div>}
      </section>}
      <label>Class check schedule<select value={data.cadence === 'play' ? 'weekly' : data.cadence} disabled={busy || disabled} onChange={e => void act('policy', { cadence: e.target.value })}><option value="weekly">First visit, then every seven days</option><option value="daily">First visit, then every 24 hours</option><option value="teacher">Only when I request a check</option></select></label>
      <p>A running round is never interrupted, and switching games never asks again. When a check is due, the game the student picked opens as soon as they finish.</p><p>A check samples what to teach next. One correct answer does not establish mastery. “Not learned yet” and “Not checked” are separate from an incorrect response. A current check keeps its original questions if you change a learner’s settings.</p>
      <button onClick={() => downloadJSON(`vpet-skill-checks-${new Date().toISOString().slice(0, 10)}.json`, data)}>Download check report</button>
      {data.students.map(s => <details key={s.id}><summary>{s.alias} · {gradeLabel(s.check.learning.grade)} · {s.check.waivedUntil > s.check.serverNow ? 'Teacher exception active' : s.check.due ? s.check.round?.current ? 'In progress' : 'Check due' : s.check.round?.completedAt ? 'Latest check complete' : 'Not checked'}</summary>
        <p>{s.check.learning.topic === 'mixed' ? 'Mixed supported topics' : s.check.learning.topic} · {s.check.coverage.filter(c => c.outcome !== 'not-checked').length}/{s.check.coverage.length} supported objectives sampled.</p>
        <div className="quick-check-table"><table><thead><tr><th>Objective</th><th>Latest sample</th><th>Next action</th></tr></thead><tbody>{s.check.coverage.map(c => <tr key={c.id}><th>{c.name}</th><td>{c.outcome === 'not-checked' ? 'Not checked' : c.outcome === 'correct' ? 'Correct on this sample' : c.outcome === 'not-learned' ? 'Not learned yet' : 'Needs practice'}{c.at && <small> · {new Date(c.at).toLocaleDateString()}</small>}</td><td>{c.outcome === 'correct' ? 'Check again later with a different problem.' : c.outcome === 'not-learned' ? 'Confirm whether taught; introduce an example.' : c.outcome === 'needs-practice' ? 'Discuss the response and assign this skill.' : 'Gather a sample before judging.'}</td></tr>)}</tbody></table></div>
        {s.check.round?.activity && <p>Latest check linked to: {s.check.round.activity}.</p>}{s.check.round?.completedAt && <details><summary>Latest questions and responses</summary>{s.check.round.results.map(r => <p key={r.id}><strong>{r.skillName}</strong><br/>{r.text}<br/>Response: {r.response || 'Not learned yet'} · Expected: {r.expected}<br/>{r.explanation}</p>)}</details>}
        <button disabled={busy || disabled || !s.active} onClick={() => void act('require', { studentId: s.id, revision: s.check.revision })}>Request next check</button>
        <button disabled={busy || disabled || !s.active} onClick={() => void act('waive', { studentId: s.id, revision: s.check.revision })}>Allow play without a check this {data.cadence === 'daily' ? 'day' : 'week'}</button>
        <p>Allowing play records an exception; it does not create answers or claim mastery. Games already in progress and teacher-focused lessons are not interrupted.</p>
      </details>)}
    </>; })()}
  </section>;
}
