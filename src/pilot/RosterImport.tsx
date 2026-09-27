import { useEffect, useState } from 'react';
import { pilotAPI } from './api';
import type { ImportCard, PreparedRoster } from './rosterWorkbook';

export function RosterImport({ classCode, disabled, onImported }: { classCode: string; disabled: boolean; onImported: () => Promise<unknown> }) {
  const [roster, setRoster] = useState<PreparedRoster | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [complete, setComplete] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (roster && !complete) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [roster, complete]);
  const run = async (work: () => Promise<void>) => { setBusy(true); setMessage(''); try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed. Keep this page open and retry.'); } finally { setBusy(false); } };
  return <section className="pilot-card" aria-label="Import Excel roster"><h2>Import Excel roster & assign pet codes</h2>
    <p>Choose a .xlsx roster with Class code, Account ID, and Learner account columns. New rows need unique IDs such as student-01. Use nicknames only. The real-name column must be completely blank or this file will be rejected before upload. Assign approved nicknames with the Nicknames & roster tool after creating accounts. Demo rows create new classroom pets.</p>
    <label>Choose roster spreadsheet<input type="file" accept=".xlsx" disabled={disabled || busy || !!roster} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      void run(async () => {
        if (file.size > 2 * 1024 * 1024) throw new Error('Choose a roster smaller than 2 MB.');
        const { readRosterWorkbook } = await import('./rosterWorkbook');
        const next = await readRosterWorkbook(await file.arrayBuffer(), classCode);
        setRoster(next); setComplete(false); setMessage(`${next.rows.length} rows ready. Save the recovery sheet first, then create or verify the codes.`);
      });
    }}/></label>
    {roster && <div className="pilot-actions"><button disabled={busy} onClick={() => { void run(async () => { const { downloadRoster } = await import('./rosterWorkbook'); await downloadRoster(roster, complete ? 'private-learner-roster-with-codes.xlsx' : 'private-roster-pending.xlsx'); setMessage(complete ? 'Completed roster downloaded.' : 'Recovery sheet downloaded. Its codes become active after a successful import.'); }); }}>{complete ? 'Download completed spreadsheet' : 'Save recovery sheet'}</button>
    <button disabled={disabled || busy || complete} className="pilot-primary" onClick={() => { void run(async () => {
      const result = await pilotAPI<{ classCode: string; cards: ImportCard[] }>('teacher/roster-import', 'POST', { classCode, rows: roster.rows.map(({ sourceKey, accountId, code }) => ({ sourceKey, accountId, code })) });
      const { completeRoster, downloadRoster } = await import('./rosterWorkbook');
      completeRoster(roster, result.cards, result.classCode, window.location.origin);
      setComplete(true);
      await downloadRoster(roster, 'private-learner-roster-with-codes.xlsx');
      await onImported(); setMessage(`${result.cards.length} codes ready. Completed spreadsheet downloaded. Keep it private and give each learner only their own code.`);
    }); }}>{busy ? 'Working…' : 'Create or verify roster codes'}</button>
    {complete && <button disabled={busy} onClick={() => { setRoster(null); setComplete(false); setMessage(''); }}>Import another spreadsheet</button>}</div>}
    <p aria-live="polite">{message}</p><p className="pilot-small">Keep the completed spreadsheet for future imports. Re-importing it preserves accounts, codes, and progress. Missing or replaced codes require the matching current login card. Nothing is reset by an import.</p>
  </section>;
}
