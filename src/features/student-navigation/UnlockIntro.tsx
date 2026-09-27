import { useState } from 'react';
import { INTROS, type Feature } from './unlocks';

const key = (id: string) => `vpet-intros:${id}`;
function readSeen(id: string, open: Set<Feature>): Set<Feature> | null {
  try {
    const raw = localStorage.getItem(key(id));
    if (raw) return new Set(JSON.parse(raw) as Feature[]);
    // First visit on this device: whatever is already open is not "new", so returning students aren't flooded.
    const seen = new Set(INTROS.filter(i => open.has(i.feature)).map(i => i.feature));
    localStorage.setItem(key(id), JSON.stringify([...seen]));
    return seen;
  } catch { return null; }
}

/** One short Pip card when a new group of games or systems opens. Per-device convenience only. */
export function UnlockIntro({ learnerId, open }: { learnerId: string; open: Set<Feature> }) {
  const [seen, setSeen] = useState(() => readSeen(learnerId, open));
  if (!seen) return null;
  const intro = INTROS.find(i => open.has(i.feature) && !seen.has(i.feature));
  if (!intro) return null;
  const dismiss = () => {
    const next = new Set(seen).add(intro.feature);
    try { localStorage.setItem(key(learnerId), JSON.stringify([...next])); } catch { /* card simply shows again next visit */ }
    setSeen(next);
  };
  return <section className="student-card unlock-intro" role="status" aria-label="Something new opened">
    <img src="/assets/woodland-v1/pip-portrait.png" alt="" width={56} height={56}/>
    <div><p className="student-eyebrow">NEW</p><h2>{intro.title}</h2><p>{intro.line}</p></div>
    <button className="student-primary" onClick={dismiss}>Got it</button>
  </section>;
}
