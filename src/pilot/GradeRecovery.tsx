import { useState } from 'react';
import type { Learner } from './PilotTeacher';
import { GRADE_TOPICS, gradeLabel } from '../services/game/curriculum';
import { pilotAPI } from './api';

type Change = { id: string; alias: string; version: number; grade: number; topic: string; previousGrade: number; previousTopic: string };
type Result = { alias: string; message: string };

export function GradeRecovery({ learners, refresh, disabled, onBusyChange }: {
  learners: Learner[]; refresh: () => Promise<unknown>; disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [target, setTarget] = useState('');
  const [grade, setGrade] = useState('');
  const [preview, setPreview] = useState<Change[] | null>(null);
  const [backup, setBackup] = useState<Change[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = (value: boolean) => { setBusy(value); onBusyChange(value); };
  const prepare = async () => {
    lock(true); setPreview(null); setResults([]); setMessage('Reading current saved levels…');
    try {
      const room = await pilotAPI<{ students: Learner[] }>('teacher/classroom');
      const chosen = room.students.filter(l => target === 'all' || l.id === target);
      if (!chosen.length) throw new Error('Choose a learner or the entire class.');
      setPreview(chosen.map(l => ({ id: l.id, alias: l.alias, version: l.settingsVersion, grade: Number(grade), topic: 'mixed', previousGrade: l.learning.grade, previousTopic: l.learning.topic })));
      setMessage('Review these saved levels before applying. Each learner is updated separately.');
    } catch (error) { setMessage((error as Error).message); }
    finally { lock(false); }
  };
  const apply = async (changes: Change[], restoring = false) => {
    lock(true); setMessage('Applying and checking saved levels…'); setResults([]); setPreview(null);
    const reports: Result[] = [], saved: Change[] = [], remaining: Change[] = [];
    for (const change of changes) {
      try {
        let failure: unknown;
        try {
          await pilotAPI(`teacher/students/${change.id}/grade-recovery`, 'POST', { grade: change.grade, topic: change.topic, settingsVersion: change.version });
        } catch (error) { failure = error; }
        // Also resolves a response lost after the server committed the update.
        const room = await pilotAPI<{ students: Learner[] }>('teacher/classroom');
        const current = room.students.find(l => l.id === change.id);
        if (!current || current.settingsVersion !== change.version + 1 || current.learning.grade !== change.grade || current.learning.topic !== change.topic) {
          throw failure ?? new Error('Saved level could not be verified. Read current levels and preview again.');
        }
        saved.push({ ...change, version: current.settingsVersion, grade: change.previousGrade, topic: change.previousTopic, previousGrade: change.grade, previousTopic: change.topic });
        reports.push({ alias: change.alias, message: `${gradeLabel(change.grade)} verified on server; applies on the next question.` });
      } catch (error) {
        // Keep a conditional restore even if the connection failed after saving.
        remaining.push(restoring ? change : { ...change, version: change.version + 1, grade: change.previousGrade, topic: change.previousTopic, previousGrade: change.grade, previousTopic: change.topic });
        reports.push({ alias: change.alias, message: `Not confirmed: ${(error as Error).message}` });
      }
      setResults([...reports]);
    }
    setBackup(restoring ? remaining : [...saved, ...remaining]);
    setMessage(`${saved.length} of ${changes.length} ${restoring ? 'restores' : 'overrides'} verified. ${remaining.length ? 'Check the unconfirmed learners below before trying again.' : 'Students can continue playing.'}`);
    try { await refresh(); } catch { setMessage(m => `${m} Roster refresh failed; reconnect and refresh the roster.`); }
    lock(false);
  };
  return <details className="pilot-card" aria-label="Advanced teacher recovery">
    <summary>Advanced teacher tools · grade recovery</summary>
    <section aria-label="Grade level override">
      <h2>Grade level override</h2>
      <p>Use this backup route if normal grade editing fails. Choose one learner or the entire class. Mixed practice removes an incompatible topic; hints, challenge, activities and pet progress stay intact.</p>
      <p>A working server connection is required. Verification confirms the saved level; a connected student receives it on their next question.</p>
      <fieldset disabled={disabled || busy}>
        <div className="pilot-form-grid">
          <label>Recovery learners<select value={target} onChange={e => { setTarget(e.target.value); setPreview(null); }}><option value="">Choose learners</option><option value="all">Entire class (including paused profiles)</option>{learners.map(l => <option key={l.id} value={l.id}>{l.alias}</option>)}</select></label>
          <label>Recovery grade<select value={grade} onChange={e => { setGrade(e.target.value); setPreview(null); }}><option value="">Choose grade</option>{GRADE_TOPICS.map((_, i) => <option key={i} value={i}>{gradeLabel(i)}</option>)}</select></label>
        </div>
        <button disabled={!target || grade === '' || backup.length > 0} onClick={() => void prepare()}>Read saved levels & preview override</button>
        {preview && <div><ul>{preview.map(c => <li key={c.id}>{c.alias}: {gradeLabel(c.previousGrade)} → {gradeLabel(c.grade)} · Mixed practice</li>)}</ul><button onClick={() => void apply(preview)}>Apply backup override to {preview.length} learners</button></div>}
        {backup.length > 0 && <div><p>Previous levels are held while this teacher page stays open. Restore checks for newer teacher edits before changing anything.</p><button onClick={() => void apply(backup, true)}>Restore previous levels</button><button onClick={() => { setBackup([]); setMessage('Previous-level restore cleared. You can preview another override.'); }}>Keep current levels & clear restore</button></div>}
      </fieldset>
      <p role="status">{message}</p>
      <ul>{results.map(r => <li key={r.alias}>{r.alias}: {r.message}</li>)}</ul>
    </section>
  </details>;
}
