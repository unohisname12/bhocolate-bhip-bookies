import { useCallback, useEffect, useState } from 'react';
import { pilotAPI } from './api';
interface Request { student_id: string; pet_id: string; proposed: string; request_id: string; approved: string | null; alias: string }
interface Named { student_id: string; pet_id: string; approved: string; alias: string }
interface Inbox { requests: Request[]; named: Named[]; typedPetNames: boolean }

export function PetNameTools({ disabled }: { disabled: boolean }) {
  const [inbox, setInbox] = useState<Inbox>({ requests: [], named: [], typedPetNames: true });
  const [drafts, setDrafts] = useState<Record<string, string>>({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => setInbox(await pilotAPI<Inbox>('teacher/pet-names')), []);
  // Pet names are rarer than nickname traffic; a slow, visibility-gated check keeps idle teacher tabs off the request quota.
  useEffect(() => {
    const check = () => { if (!document.hidden) void load().catch(() => { /* keep the last inbox while reconnecting */ }); };
    check(); const t = setInterval(check, 20000); document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, [load]);
  const run = async (work: () => Promise<string>) => { setBusy(true); setMessage(''); try { setMessage(await work()); await load(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const decide = (studentId: string, body: Record<string, unknown>) => pilotAPI(`teacher/students/${studentId}/pet-name`, 'POST', body);

  return <section className="pilot-card" aria-label="Pet names"><h2>Pet names · {inbox.requests.length} awaiting approval</h2>
    <p>Students can always build a pet name from classroom-safe word chips; those need no review. Typed names stay private until you approve them.</p>
    <label className="pilot-toggle"><input type="checkbox" checked={inbox.typedPetNames} disabled={busy || disabled} onChange={e => { const enabled = e.target.checked; void run(async () => { await pilotAPI('teacher/pet-names/settings', 'POST', { enabled }); return enabled ? 'Students can ask for typed pet names.' : 'Chips only: students build names from word chips.'; }); }}/> Allow students to request typed pet names</label>
    <fieldset disabled={busy || disabled}>{inbox.requests.map(r => { const draft = drafts[r.request_id] ?? r.proposed; return <div className="nickname-request" key={r.request_id}>
      <strong>{r.alias}’s pet → requested: {r.proposed}{r.approved ? ` (now ${r.approved})` : ''}</strong>
      <label>Approved pet name for {r.alias}<input maxLength={24} value={draft} onChange={e => setDrafts({ ...drafts, [r.request_id]: e.target.value })}/></label>
      <button onClick={() => void run(async () => { await decide(r.student_id, { petId: r.pet_id, decision: 'approve', requestId: r.request_id, name: draft }); return `Pet name approved: ${draft}.`; })}>Approve pet name for {r.alias}</button>
      <button onClick={() => void run(async () => { await decide(r.student_id, { petId: r.pet_id, decision: 'decline', requestId: r.request_id }); return 'Request declined.'; })}>Decline pet name for {r.alias}</button>
    </div>; })}
    {inbox.named.length > 0 && <details><summary>{inbox.named.length} approved typed pet names</summary><ul>{inbox.named.map(n => <li key={`${n.student_id}:${n.pet_id}`}>{n.alias}: {n.approved} <button onClick={() => void run(async () => { await decide(n.student_id, { petId: n.pet_id, decision: 'reset' }); return `${n.alias}’s pet goes back to its chip or species name.`; })}>Reset {n.alias}’s pet name</button></li>)}</ul></details>}
    </fieldset>
    <p role="status" className="pilot-message">{message}</p>
  </section>;
}
