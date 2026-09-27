import { GameRules } from '../game/GameRules';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActivePetContext } from '../ActivePetContext';
import { CareStage } from '../care/CareStage';
import { BRUSH_DIRECTIONS, CARE_PRESENTATION, CARE_TARGETS, type CareMode } from '../care/carePresentation';
import { CARE_GAME_DEFAULTS } from './types';

type Phase = 'ready' | 'playing' | 'result';
const ARROWS = { right: '→', down: '↓', left: '←', up: '↑' };
const BUBBLE_SPOTS = [[12, 30], [88, 34], [12, 63], [88, 65]];

/** One focused care scene; the engine remains the authority for cost and rewards. */
export function CareSession({ mode, onComplete, onCancel }: { mode: CareMode; onComplete: (quality: number) => void; onCancel: () => void }) {
  const pet = useContext(ActivePetContext);
  const theme = CARE_PRESENTATION[mode], config = CARE_GAME_DEFAULTS[mode];
  const [phase, setPhase] = useState<Phase>('ready');
  const [timed, setTimed] = useState(false);
  const [bubbles, setBubbles] = useState<number[]>([]);
  const [popped, setPopped] = useState(0);
  const [ballFrom, setBallFrom] = useState<readonly number[] | null>(null);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(config.durationMs);
  const [pulse, setPulse] = useState(0);
  const [holding, setHolding] = useState(false);
  const [patches, setPatches] = useState([0, 0, 0, 0]);
  const [feedback, setFeedback] = useState('');
  const phaseRef = useRef<Phase>('ready');
  const scoreRef = useRef(0), started = useRef(0), holdingRef = useRef(false);
  const patchesRef = useRef([0, 0, 0, 0]);
  const committed = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const lastScrub = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const end = useCallback(() => { phaseRef.current = 'result'; holdingRef.current = false; setHolding(false); setPhase('result'); }, []);
  const cancel = useCallback(() => { if (committed.current) return; committed.current = true; holdingRef.current = false; onCancel(); }, [onCancel]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primary.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  useEffect(() => { primary.current?.focus(); }, [phase]);
  useEffect(() => { if (mode === 'wash' && phase !== 'ready') primary.current?.focus(); }, [mode, phase, score, popped]);
  useEffect(() => {
    if (phase !== 'playing') return;
    let previous = Date.now();
    const timer = window.setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const now = Date.now(), delta = Math.min(150, now - previous); previous = now;
      const time = Math.max(0, config.durationMs - (now - started.current));
      setRemaining(time);
      if (mode === 'comfort' && holdingRef.current) {
        scoreRef.current = Math.min(1, scoreRef.current + delta / 3000);
        setScore(scoreRef.current);
      }
      if ((timed && time === 0) || scoreRef.current >= config.targetCount) end();
    }, 50);
    const release = () => { holdingRef.current = false; setHolding(false); };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => { window.clearInterval(timer); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release); };
  }, [phase, mode, timed, config.durationMs, config.targetCount, end]);

  const hit = () => {
    if (phaseRef.current !== 'playing') return;
    if (mode === 'play') setBallFrom(CARE_TARGETS[Math.floor(scoreRef.current) % CARE_TARGETS.length]);
    scoreRef.current = Math.min(config.targetCount, scoreRef.current + 1);
    setScore(scoreRef.current); setPulse(p => p + 1);
    const cheers = {
      pet: ['A happy little wiggle!', 'That’s the spot!', 'Someone likes you a lot!'],
      wash: ['Squeaky clean! Pop a bubble for fun.'],
      brush: ['Looking lovely!', 'Ooh, a fancy new look!', 'Ready for a woodland adventure!'],
      comfort: ['A little calmer.'],
      train: ['Found it! Follow the next star.', 'A bright little explorer!', 'You make a great team!'],
      play: ['Boing! Here it comes again!', 'A perfect little catch!', 'Your companion sends it back!'],
    };
    setFeedback(cheers[mode][(scoreRef.current - 1) % cheers[mode].length]);
    if (scoreRef.current >= config.targetCount) end();
  };
  const scrub = (index: number) => {
    if (phaseRef.current !== 'playing' || patchesRef.current[index] >= 1) return;
    const next = patchesRef.current.map((value, i) => i === index ? Math.min(1, value + 0.25) : value);
    patchesRef.current = next; setPatches(next); setPulse(p => p + 1);
    if (next[index] === 1) { setBubbles(current => [...current, index]); hit(); }
  };
  const hold = (value: boolean) => {
    if (phaseRef.current !== 'playing') return;
    holdingRef.current = value; setHolding(value);
    setFeedback(value ? 'A slow breath. A little closer.' : 'Ready when you are.');
  };
  const direction = BRUSH_DIRECTIONS[Math.floor(score) % BRUSH_DIRECTIONS.length];
  const brush = (value: string) => { if (value === direction) hit(); else setFeedback(`Gently follow the arrow ${ARROWS[direction]}. Try again.`); };
  if (!pet) return null;
  const progress = Math.min(1, score / config.targetCount);
  const target = CARE_TARGETS[Math.floor(score) % CARE_TARGETS.length];

  return createPortal(<div className="care-session-backdrop" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onKeyDown={e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    if (e.key === 'Tab') {
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary, [tabindex="0"]') ?? []);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    if (mode === 'brush' && phase === 'playing' && e.key.startsWith('Arrow')) { e.preventDefault(); brush(e.key.slice(5).toLowerCase()); }
  }}><div ref={panel} className="care-session" role="dialog" aria-modal="true" aria-labelledby="care-session-title">
    <header className="care-session-header"><div><p className="care-eyebrow">A little time together</p><h2 id="care-session-title">{theme.title}</h2><p>{pet.name} · {pet.stage}</p></div><button className="care-button quiet" onClick={cancel} aria-label="Close care activity">Close</button></header>
    <CareStage pet={pet} mode={mode} pulse={pulse} toolActive={phase === 'playing'} reacting={phase === 'result' || (phase === 'playing' && (mode === 'comfort' ? holding : pulse > 0))}>
      {mode === 'play' && ballFrom && <div key={`return-${score}`} className="care-return-ball" aria-hidden="true" style={{ '--ball-x': `${ballFrom[0]}%`, '--ball-y': `${ballFrom[1]}%` } as React.CSSProperties} />}
      {mode === 'wash' && phase !== 'ready' && bubbles.map(id => <button key={id} className="care-pop-bubble" style={{ left: `${BUBBLE_SPOTS[id][0]}%`, top: `${BUBBLE_SPOTS[id][1]}%` }} aria-label={`Pop bubble ${id + 1}`} onClick={() => {
        setBubbles(current => current.filter(value => value !== id)); setPopped(value => value + 1); setPulse(value => value + 1); setFeedback('Pop! A tiny bubble celebration.');
      }}><span aria-hidden="true">✧</span></button>)}
      {popped > 0 && <div key={`pops-${popped}`} className="care-pop-count" role="status">Pop! {popped} {popped === 1 ? 'bubble' : 'bubbles'}</div>}
      {phase === 'playing' && <div className={`care-play-surface ${mode === 'wash' ? 'care-wash-surface' : ''}`} onPointerDown={e => { if (mode === 'brush') { swipeStart.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerUp={e => {
        if (!swipeStart.current) return;
        const dx = e.clientX - swipeStart.current.x, dy = e.clientY - swipeStart.current.y; swipeStart.current = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
        brush(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
      }} onPointerCancel={() => { swipeStart.current = null; hold(false); }}>
        {['pet', 'train', 'play'].includes(mode) && <button ref={primary} className={`care-target care-target-${mode}`} style={{ left: `${target[0]}%`, top: `${target[1]}%` }} onClick={hit} aria-label={mode === 'pet' ? 'Pet the heart' : mode === 'play' ? 'Catch the ball' : 'Touch the star'}><span aria-hidden="true">{theme.symbol}</span></button>}
        {mode === 'wash' && patches.map((value, i) => <button key={i} ref={i === patches.findIndex(patch => patch < 1) ? primary : undefined} className={`care-dirt ${value >= 1 ? 'is-clean' : ''}`} style={{ left: `${CARE_TARGETS[i][0]}%`, top: `${CARE_TARGETS[i][1]}%`, '--mud-opacity': 1 - value } as React.CSSProperties} disabled={value >= 1} aria-label={`Wash patch ${i + 1}`} onClick={() => scrub(i)} onPointerMove={e => { if (e.buttons === 1 && Date.now() - lastScrub.current > 55) { lastScrub.current = Date.now(); scrub(i); } }}><span aria-hidden="true">{value >= 1 ? '✦' : '·'}</span></button>)}
        {mode === 'brush' && <div className="care-direction" aria-hidden="true">{ARROWS[direction]}</div>}
      </div>}
      {phase === 'result' && <div className="care-result-ribbon">{progress >= 1 ? 'A lovely little moment!' : progress > 0 ? 'Thanks for spending time together!' : 'Ready for another try?'}</div>}
    </CareStage>
    <div className="care-session-controls"><GameRules name={theme.title}><p>{theme.instruction}</p><p>{theme.benefit}</p></GameRules>
      {phase === 'ready' ? <><p className="care-benefit">{theme.benefit}</p><div className="care-pace" role="group" aria-label="Activity pace"><button className="care-button" aria-pressed={!timed} onClick={() => setTimed(false)}>No rush <small>Take your time</small></button><button className="care-button" aria-pressed={timed} onClick={() => setTimed(true)}>Quick challenge <small>{config.durationMs / 1000} seconds</small></button></div><button ref={primary} className="care-button primary" onClick={() => { started.current = Date.now(); phaseRef.current = 'playing'; setPhase('playing'); }}>Let’s begin</button><p className="care-fineprint">{timed ? 'The timer starts when you’re ready.' : 'No timer. Explore and enjoy your time together. The same care rewards are available at either pace.'} Close any time without spending tokens.</p></>
        : <><div className="care-progress-heading"><span>{phase === 'result' ? 'Care moment complete' : mode === 'comfort' ? 'A little calmer' : `${Math.floor(score)} / ${config.targetCount} little moments`}</span><span>{phase === 'playing' ? timed ? `${Math.ceil(remaining / 1000)}s` : 'No rush' : `${Math.round(progress * 100)}%`}</span></div><div className="care-progress" role="progressbar" aria-label="Care activity progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress * 100}%` }} /></div>
          <p className="care-feedback" role="status">{phase === 'result' ? progress > 0 ? 'Your companion enjoyed your company. Finish to save this care moment.' : 'No care action completed yet. Return and choose No rush to try without a timer.' : feedback || 'Your turn.'}</p>
          {phase === 'playing' && mode === 'brush' && <button ref={primary} className="care-button primary" onClick={() => brush(direction)}>Brush {direction} {ARROWS[direction]}</button>}
          {phase === 'playing' && mode === 'comfort' && <button ref={primary} className={`care-button primary ${holding ? 'is-holding' : ''}`} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); hold(true); }} onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)} onBlur={() => hold(false)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(true); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(false); } }}>Hold to comfort {holding ? '♥' : ''}</button>}
          {phase === 'result' && <>{progress > 0 && <p className="care-benefit">{theme.benefit}</p>}<button ref={primary} className="care-button primary" onClick={() => { if (committed.current) return; committed.current = true; onComplete(progress); }}>{progress > 0 ? 'Finish care' : 'Return to care'}</button></>}
        </>}
    </div>
  </div></div>, document.body);
}
