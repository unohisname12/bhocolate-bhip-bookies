import { useCallback, useContext, useEffect, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import { PetSprite } from '../../components/pet/PetSprite';
import { ActivePetContext } from '../../components/ActivePetContext';
import { SCARS, type ScarKind } from './model';
import './rivals.css';

interface Record { encounters: number; caught: number; escaped: number; lastOutcome: string | null }
interface RivalView { id: string; title: string; species: string; rank: number; rankName: string; wins: number; losses: number; weakness: string; edge: number;
  scars: { kind: ScarKind; by: string; at: number }[]; you?: Record; students?: (Record & { petName: string })[] }
interface Data { taunts: boolean; rivals: RivalView[] }

export function RivalBoard({ teacher = false }: { teacher?: boolean }) {
  const [data, setData] = useState<Data | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => setData(await pilotAPI<Data>('rivals')), []);
  // Rivals only change when a match ends, so a fetch on open and on returning to the tab is enough; no polling.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void load().catch(() => setMessage('Rivals are resting. Try again soon.')); };
    refresh(); document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [load]);
  const run = async (work: () => Promise<string>) => { setBusy(true); try { setMessage(await work()); await load(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  if (!data) return null;
  return <section className="rival-board" aria-label="Class rivals">
    <header><p className="rival-eyebrow">They remember you</p><h2>Class rivals</h2>
      <p>{teacher ? 'Computer hunters that remember each class across matches: who escaped, where pets hide, which tricks worked.' : 'Every rival remembers how you beat it. Master its weakness skill and it loses its edge.'}</p></header>
    {teacher && <label className="rival-toggle"><input type="checkbox" checked={data.taunts} disabled={busy} onChange={e => { const taunts = e.target.checked; setData({ ...data, taunts }); void run(async () => { await pilotAPI('rivals/settings', 'POST', { taunts }); return taunts ? 'Rivals will trash-talk the pets (kindly).' : 'Rivals stay quiet during matches.'; }); }}/> Rivals can taunt during matches</label>}
    <div className="rival-list">{data.rivals.map(r => <article key={r.id} className="rival-card" aria-label={r.title}>
      <RivalPortrait species={r.species} teacher={teacher}/>
      <div className="rival-info">
        <h3>{r.title}</h3>
        <p className="rival-rank"><span className={`rival-badge rank-${r.rank}`}>{r.rankName}</span> {r.wins} catches · {r.losses} escapes against it</p>
        <p className="rival-weak">Weak to <strong>{r.weakness}</strong>{!teacher && r.edge < 1 ? ' — you mastered it, so it’s slower against you!' : ''}</p>
        {r.scars.length > 0 && <ul className="rival-scars" aria-label="Scars">{r.scars.map(s => <li key={s.at}><strong>{SCARS[s.kind]}</strong> — from {s.by}</li>)}</ul>}
        {r.you && <p className="rival-you">{r.you.encounters ? `You: escaped ${r.you.escaped} · caught ${r.you.caught}` : 'You haven’t faced this one yet.'}</p>}
        {teacher && r.students?.length ? <details><summary>{r.students.length} pets remembered</summary><ul>{r.students.map(s => <li key={s.petName}>{s.petName}: escaped {s.escaped}, caught {s.caught}</li>)}</ul></details> : null}
        {teacher && <button type="button" disabled={busy} onClick={() => { if (confirm(`Reset ${r.title}? It forgets every pet and loses its rank and scars.`)) void run(async () => { await pilotAPI('rivals/reset', 'POST', { rivalId: r.id }); return `${r.title} starts fresh.`; }); }}>Reset {r.title}</button>}
      </div>
    </article>)}</div>
    <p role="status" className="rival-message">{message}</p>
  </section>;
}

// Rival rank is not a pet evolution unlock. Never preview an unowned form.
export function RivalPortrait({ species, teacher = false }: { species: string; teacher?: boolean }) {
  const pet = useContext(ActivePetContext);
  return <div className="rival-portrait"><ActivePetContext.Provider value={null}>
    {!teacher && pet?.speciesId === species
      ? <PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName="idle" scale={0.55}/>
      : <span className="rival-mystery" role="img" aria-label="Mystery rival — appearance hidden">?</span>}
  </ActivePetContext.Provider></div>;
}
