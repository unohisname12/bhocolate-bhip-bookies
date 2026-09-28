import { useEffect } from 'react';
import type { View } from './model';

type Me = View['players'][number];
/** The spark check pop-up: one big question, three big answers (or keys 1–3), and a shrinking timer. */
// The result flashes for about 1.4 s of match time (40 ticks a second), read straight from the shared clock.
const FLASH_TICKS = 56;
export function SparkPanel({ me, tick, answer }: { me: Me; tick: number; answer: (choice: number, id: number) => void }) {
  const check = me.check, revival=me.evo?.returnMath;
  const flash = me.lastCheck && tick - me.lastCheckTick < FLASH_TICKS ? { right: me.lastCheck === 'right' } : null;
  useEffect(() => {
    if (!check) return;
    const key = (e: KeyboardEvent) => { const n = ['1', '2', '3'].indexOf(e.key); if (n >= 0) { e.preventDefault(); answer(n, check.id); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [check, answer]);
  if (!check && revival) return <div className="hunt-spark evo-return" role="status"><p className="hunt-spark-eyebrow">SECOND LIFE · RAPID FIRE</p><p className="evo-return-progress">{revival.correct} / 5 correct</p><p className="evo-return-feedback">{revival.feedback}</p></div>;
  if (!check) return flash ? <div className={`hunt-spark-flash ${flash.right ? 'right' : 'wrong'}`} role="status">{flash.right ? '✦ SPARK! Beacon boost' : 'Fizzle… the hunter heard that'}</div> : null;
  return <div className={`hunt-spark ${revival?'evo-return':''}`} role="dialog" aria-label={revival?'Second life math challenge':'Spark check'}>
    <p className="hunt-spark-eyebrow">{revival?'SECOND LIFE · RAPID FIRE':'SPARK CHECK'}</p>{revival&&<><p className="evo-return-progress">{revival.correct} / 5 correct</p><p className="evo-return-feedback">{revival.feedback}</p></>}
    <strong className="hunt-spark-prompt">{check.prompt}</strong>
    <div className="hunt-spark-choices">{check.choices.map((c, i) => <button key={i} type="button" onClick={() => answer(i, check.id)}><kbd>{i + 1}</kbd>{c}</button>)}</div>
    <div className="hunt-spark-timer" aria-hidden="true"><i style={{ width: `${Math.max(0, check.left / check.total) * 100}%` }}/></div>
  </div>;
}
