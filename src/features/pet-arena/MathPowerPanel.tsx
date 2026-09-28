import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { TRACE_PATHS } from '../../config/traceConfig';
import { buildSegments, calcCompletion, updateSegmentProgress } from '../../services/game/traceEngine';
import type { TracePoint, TraceShapeId } from '../../types/trace';
import { POWER_NAMES, powerDescription, powerGain, type MathPower, type MathPowerCommand } from './mathPower';
import type { Fight } from './combat';
import './math-power.css';

function QuickTrace({ answer, busy, timed, onDone, onExpire }: { answer: string; busy: boolean; timed: boolean; onDone: () => void; onExpire: () => void }) {
  // Check the entire answer, but keep the motor task to one number, even for fractions.
  const label = answer.match(/\d/g)?.at(-1) ?? 'rune';
  const path = label === 'rune' ? TRACE_PATHS.shield_circle : TRACE_PATHS[`digit_${label}` as TraceShapeId];
  const [segments, setSegments] = useState(() => buildSegments(path, 1.5));
  const [stroke, setStroke] = useState<TracePoint[]>([]);
  const [remaining, setRemaining] = useState(6000);
  const time = useRef(6000), finished = useRef(false);
  const dragging = useRef<number | null>(null), previous = useRef<TracePoint | null>(null);
  const progress = calcCompletion(segments);
  useEffect(() => {
    if (progress >= 90 && !busy && !finished.current) { finished.current = true; onDone(); }
  }, [progress, busy, onDone]);
  useEffect(() => {
    if (!timed || busy || finished.current) return;
    let last = performance.now();
    const tick = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) time.current = Math.max(0, time.current - (now - last));
      last = now;
      setRemaining(time.current);
      if (!time.current && !finished.current) { finished.current = true; onExpire(); }
    }, 50);
    // Discard the hidden interval instead of counting it on the first visible tick.
    const visibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', visibility); };
  }, [timed, busy, onExpire]);
  const draw = (event: PointerEvent<SVGSVGElement>) => {
    if (busy || finished.current || dragging.current !== event.pointerId) return;
    const r = event.currentTarget.getBoundingClientRect();
    const p = { x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height };
    const from = previous.current ?? p;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / .015));
    setSegments(old => {
      let next = old;
      for (let i = 0; i <= steps; i++) next = updateSegmentProgress(next, { x: from.x + (p.x - from.x) * i / steps, y: from.y + (p.y - from.y) * i / steps }).segments;
      return next;
    });
    setStroke(old => [...old.slice(-600), p]); previous.current = p;
  };
  const release = () => { dragging.current = null; previous.current = null; };
  return <div className="math-trace">
    <p role="status">Correct! <strong>{answer}</strong> · Trace <strong>{label}</strong> to activate</p>
    <svg viewBox="0 0 100 100" role="img" aria-label={`Trace ${label}`} onPointerDown={e => { if (dragging.current !== null) return; dragging.current = e.pointerId; previous.current = null; e.currentTarget.setPointerCapture(e.pointerId); draw(e); }} onPointerMove={draw} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <polyline points={path.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill="none" stroke="#36556d" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round"/>
      {segments.map((p, i) => <circle key={i} cx={p.center.x * 100} cy={p.center.y * 100} r="2.3" fill={p.visited ? '#7ff5cc' : '#b8cbdf'}/>)}
      {stroke.length > 0 && <polyline points={stroke.map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill="none" stroke="#9dfbe1" strokeOpacity=".65" strokeWidth="1.7"/>}
      <circle cx={path.points[0].x * 100} cy={path.points[0].y * 100} r="3.2" fill="#ffd978"/>
    </svg>
    {timed && <div className="math-qte-clock"><progress aria-label="Trace time remaining" max={6000} value={remaining}/><span>{Math.ceil(remaining / 1000)}s</span></div>}
    <span className="math-power-note">{busy ? 'Powering up…' : 'Finish the trace — power fires automatically.'}</span>
  </div>;
}

export function MathPowerPanel({ fight: f, busy, execute, close }: { fight: Fight; busy: boolean; execute: (c: MathPowerCommand) => Promise<void>; close: (expired?: boolean) => void }) {
  const q = f.mathPower?.challenge;
  const [answer, setAnswer] = useState(''), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [timed, setTimed] = useState(() => { try { return localStorage.getItem('arena-trace-untimed') !== 'true'; } catch { return true; } });
  const lock = useRef(false);
  const send = async (c: MathPowerCommand, finish = false) => {
    if (lock.current || busy) return; lock.current = true; setError('');
    try { await execute(c); if (finish) close(); } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); setRetry(n => n + 1); }
    finally { lock.current = false; }
  };
  const base = { fightId: f.id, round: f.round };
  const activate = (method: 'trace' | 'tap') => { if (q) void send({ ...base, kind: 'math-activate', challengeId: q.id, method }, true); };
  return createPortal(<aside className={`math-power-panel ${q?.solved ? 'is-tracing' : ''}`} aria-label="Math Power" onKeyDown={e => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); close(); } }}>
    <header><strong>{q ? POWER_NAMES[q.power] : 'Choose a boost'}</strong><button aria-label="Back to battle" disabled={busy} onClick={() => close()}>Later ×</button></header>
    {error && <p role="alert">{error}</p>}
    {!q ? <div className="math-power-choices">{(Object.keys(POWER_NAMES) as MathPower[]).map(power => <button key={power} disabled={busy || !powerGain(f, power)} title={powerDescription(f, power)} onClick={() => void send({ ...base, kind: 'math-open', power })}><strong>{POWER_NAMES[power]}</strong><small>{power === 'strike' ? 'Next hit +25% (max +8)' : power === 'shield' ? `+${powerGain(f, power)} shield` : `+${powerGain(f, power)} energy`}</small></button>)}</div> : !q.solved ? <>
      <p className="math-power-question">{q.question}</p>
      <form onSubmit={e => { e.preventDefault(); void send({ ...base, kind: 'math-answer', challengeId: q.id, answer }); }}>
        <input aria-label="Your answer" value={answer} onChange={e => setAnswer(e.target.value)} autoFocus autoComplete="off" maxLength={80} placeholder="Your answer" disabled={busy}/>
        <button disabled={busy || !answer.trim()} type="submit">Charge ↵</button>
      </form>
      {q.attempts > 0 && <p role="status">Not quite yet. Try again or keep fighting.</p>}
      {q.learning.learningHelp && <button disabled={busy} onClick={() => void send({ ...base, kind: 'math-help', challengeId: q.id })}>Show me how</button>}
      {q.help && <ol className="math-power-help">{q.help.map((line, i) => <li key={i}>{line}</li>)}</ol>}
      <p className="math-power-note">Answer + one quick trace. You can keep fighting and finish later.</p>
    </> : <>
      <QuickTrace key={`${q.id}:${retry}`} answer={q.answerText!} busy={busy} timed={timed} onDone={() => activate('trace')} onExpire={() => close(true)}/>
      <button className="math-power-tap" autoFocus disabled={busy} onClick={() => activate('tap')}>Activate without drawing</button>
    </>}
    <label className="math-timing-option"><input type="checkbox" checked={!timed} onChange={e => { setTimed(!e.target.checked); try { localStorage.setItem('arena-trace-untimed', String(e.target.checked)); } catch { /* Optional device preference. */ } }}/> Untimed tracing</label>
  </aside>, document.body);
}
