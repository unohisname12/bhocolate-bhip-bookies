import { useEffect, useRef, useState } from 'react';
const LESSONS = [
  { title: 'Pick a delivery', body: 'Tap a numbered building on the town map. The dispatch desk shows its points and your route. Choose a nearby stop for a cheaper trip.', tip: 'Open Rivals to compare profits, route owners, and prices. Sealed choices and inventories stay hidden.' },
  { title: 'Get your pet ready', body: 'Complete two math questions at your own level. Use hints and explanations whenever you need them. Corrected answers count.', tip: 'Open Items for your two-item math crate after the briefing. Optional wager: stake one item on a harder, timed question without hints to win two random items. It never gives extra turns.' },
  { title: 'Seal your order', body: 'Use Deals to negotiate and Items to equip a tool. On Play, choose your route and price; More options holds route tactics, partners, and teacher perks. Seal only when your deals are settled. A route ambush means fight, detour, or teleport. Losing or retreating costs 3 match coins; winning clears that route for you this round.', tip: 'Price mode: lowest quote wins in Rivals; ties split income but each crew pays its costs. Classic bid mode: highest bid wins. Community protects each job.' },
  { title: 'Watch the deliveries', body: 'When everyone submits, the pets drive and points are awarded together. Highest match balance at the end wins. Open Results to compare: income, costs, bonuses, who won the customer, and what might have worked better.', tip: 'Timed match? Unsubmitted crews park for that round. An untimed campaign waits for everyone.' },
];
export function DeliveryGuide({ learner }: { learner: string }) {
  const [step, setStep] = useState(0), [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(`delivery-guide:${learner}`) === 'seen'; } catch { return false; } });
  const dialog = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const close = () => { setOpen(false); setSeen(true); try { localStorage.setItem(`delivery-guide:${learner}`, 'seen'); } catch { /* Guide remains available without storage. */ } button.current?.focus(); };
  const lesson = LESSONS[step];
  return <><button ref={button} className="delivery-guide-button" onClick={() => { setStep(0); setOpen(true); }}>{seen ? 'How to play' : 'New courier? Learn to play'}</button>
    <dialog ref={dialog} className="delivery-guide-dialog" onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="courier-guide-title"><div className="guide-top"><span>COURIER TRAINING / {step + 1} OF 4</span><button aria-label="Close how to play" onClick={close}>×</button></div><div className="guide-art" data-step={step}><span>{String(step + 1).padStart(2,'0')}</span></div><h2 id="courier-guide-title">{lesson.title}</h2><p>{lesson.body}</p><aside>{lesson.tip}</aside><div className="guide-dots">{LESSONS.map((l,i) => <button key={l.title} aria-label={`Guide step ${i+1}: ${l.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>{i+1}</button>)}</div><footer><button onClick={close}>Skip tour</button>{step > 0 && <button onClick={() => setStep(s => s-1)}>Back</button>}<button className="delivery-primary" onClick={() => step === 3 ? close() : setStep(s => s+1)}>{step === 3 ? 'Let’s deliver' : 'Next →'}</button></footer></dialog>
  </>;
}
export function TurnSteps({ ready, sealed, picked }: { ready: number; sealed: boolean; picked: boolean }) {
  const step = sealed ? 3 : ready >= 2 ? 2 : picked ? 1 : 0;
  return <ol className="delivery-turn-steps" aria-label="Your delivery turn">{['Pick a building','Solve 2 questions','Seal your order','Watch pets deliver'].map((name,i) => <li key={name} className={i === step ? 'current' : i < step ? 'complete' : ''} aria-current={i === step ? 'step' : undefined}><b>{i < step ? '✓' : i+1}</b><span>{name}</span></li>)}</ol>;
}
