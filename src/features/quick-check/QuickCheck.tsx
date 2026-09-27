import { SkillPractice } from '../middle-school/SkillPractice';
import { useEffect, useRef, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import { LessonView, QuantityModel } from '../skill-challenge/LessonView';
import { parseMathAnswer } from '../../services/game/curriculum';
import type { CheckView } from './model';
import type { useQuickCheck } from './useQuickCheck';
import './quick-check.css';

export function QuickCheck({ check }: { check: ReturnType<typeof useQuickCheck> }) {
  const { data, error, open, setOpen, accept, refresh, send } = check;
  const dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [answer, setAnswer] = useState('');
  const round = data?.round, current = round?.current;
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const run = async (operation: () => Promise<CheckView>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { accept(await operation()); setAnswer(''); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save. Retry your answer.'); try { await refresh(); } catch { /* Keep the last received question and the retry message. */ } }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = (notLearned: boolean) => {
    if (!data || !current) return;
    if (!notLearned && !Number.isFinite(parseMathAnswer(answer))) { setMessage('Enter a number or fraction.'); return; }
    const questionId = current.id;
    void run(() => send((revision, latest) => latest && latest.round?.current?.id !== questionId ? latest
      : pilotAPI<CheckView>('quick-checks/answer', 'POST', { revision, questionId, answer, notLearned }), data.revision));
  };
  return <>

    <dialog ref={dialog} className="quick-check-dialog" aria-labelledby="quick-check-title" onCancel={e => { if (busy) e.preventDefault(); else setOpen(false); }} onClose={() => { if (!lock.current) setOpen(false); }}>
      <div className="quick-check-content"><p className="quick-check-eyebrow">A small check. A useful next step.</p><h2 id="quick-check-title">My skill check</h2>
        <p>Untimed. No leaderboard or lost rewards. Try on your own. If you haven’t learned something yet, tap <strong>I don’t know this yet</strong> — that counts as your answer, your teacher finds out, and you won’t get that skill again until they teach it. Every game unlocks when all three are answered or skipped.</p>
        {(message || error) && <p role="alert">{message || error}</p>}
        {!data ? <button disabled={busy} onClick={() => void run(refresh)}>Retry loading</button> : <>
          {(!round || round.completedAt && data.due) && <><p>This checks three selected skills at your assigned level. It does not test a whole grade or course.</p><button disabled={busy} onClick={() => void run(() => send((revision, latest) => latest && !latest.due ? latest
            : pilotAPI<CheckView>('quick-checks/start', 'POST', { revision, activity: data.activity }), data.revision))}>Start three-question check</button></>}
          {current && <section key={current.id} aria-label="Skill check question"><p>Question {round!.answered + 1} of {round!.total} · {current.skillName}</p><QuantityModel visual={current.visual}/><h3>{current.text}</h3>
            <form onSubmit={e => { e.preventDefault(); submit(false); }}><label>Your check answer<input key={current.id} autoFocus value={answer} onChange={e => setAnswer(e.target.value)} autoComplete="off" maxLength={80} disabled={busy}/></label><button disabled={busy || !answer.trim()}>Save answer & continue</button></form>
            <button className="quick-check-skip" disabled={busy} onClick={() => submit(true)}>I don’t know this yet — skip</button><p>Your response is saved before the next question. Examples appear after the check.</p>
          </section>}
          {round?.completedAt && <section aria-label="Skill check results"><h3>{data.due ? 'Your previous check' : 'Check complete — your games are ready.'}</h3><p>These are samples, not a mastery grade. “Not learned yet” stays separate from incorrect answers.</p>
            {round.results.map(r => <article key={r.id}><h4>{r.skillName}</h4><p>{r.outcome === 'correct' ? 'Correct on this sample' : r.outcome === 'not-learned' ? 'Not learned yet — your teacher has been told, and this skill is paused for you' : 'A skill to practice'}</p><details><summary>Review this question and an example</summary><p>{r.text}</p><p>Your response: {r.response || 'Not learned yet'} · Expected: {r.expected}</p><p>{r.explanation}</p><LessonView id={r.skillId} level={round.learning.challenge}/><details><summary>Practice this exact skill</summary><SkillPractice key={`${round.id}:${r.skillId}`} id={r.skillId} settings={round.learning}/></details></details></article>)}
          </section>}
          <details><summary>What has been checked?</summary><p>These are the supported objectives at your current settings. New checks rotate through them. Your teacher’s assigned topic stays in control.</p><ul>{data.coverage.map(s => <li key={s.id}>{s.name}: {s.outcome === 'not-checked' ? 'Not checked' : s.outcome === 'correct' ? 'Correct on latest sample' : s.outcome === 'not-learned' ? 'Not learned yet' : 'Needs practice'}</li>)}</ul></details>
        </>}
        <button disabled={busy} onClick={() => { setAnswer(''); setOpen(false); }}>{round?.completedAt && !data?.due ? 'Back to my games' : 'Close for now'}</button>
      </div>
    </dialog>
  </>;
}

export function QuickCheckCard({ check }: { check: ReturnType<typeof useQuickCheck> }) {
  const { data, error, setOpen } = check;
  const round = data?.round;
  return <section className="quick-check-card" aria-label="My skill check">
      <div><strong>{data?.due ? 'Your short skill check is ready' : 'Your skills, one step at a time'}</strong>
        <p>{data?.due ? 'Three untimed questions before play. Answer or skip each one — you do not need a perfect score.' : data ? `${data.coverage.filter(s => s.outcome !== 'not-checked').length} of ${data.coverage.length} supported skills sampled at your current settings.` : 'Checking your next learning step…'}</p></div>
      <button onClick={() => { setOpen(true); }}>{data?.due ? round?.current ? 'Continue skill check' : 'Open skill check' : 'View skill check'}</button>
      {error && <p role="alert">{error}</p>}
    </section>;
}
