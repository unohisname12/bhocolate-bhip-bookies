import type { LearningEvidence } from '../types/woodland';

export function TeacherLearningReport({ rows }: { rows: LearningEvidence[] }) {
  const groups = new Map<string, LearningEvidence[]>();
  for (const row of rows) {
    const key = `Grade ${row.grade} · ${row.topic}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const exportCSV = () => {
    const quote = (value: string | number | boolean) => {
      const text = String(value);
      // Keep imported labels as text when a teacher opens the CSV in a spreadsheet.
      const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv = [['topic', 'grade', 'activity', 'attempts', 'support', 'completed', 'first_try_without_help', 'date', 'skill_id', 'template', 'context', 'answer_revealed'].join(','), ...rows.map(row => [row.topic, row.grade, row.source, row.attempts, row.support, row.correct, row.firstAttemptCorrect, new Date(row.updatedAt).toISOString(), row.skillId ?? '', row.templateId ?? '', row.context ?? '', row.answerRevealed ?? 'unknown'].map(quote).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'auralith-practice-report.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="rounded-2xl border border-teal-800 bg-slate-900 p-5" aria-label="Learning evidence report"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Practice evidence</h2><button className="growth-button" disabled={!rows.length} onClick={exportCSV}>Export practice CSV</button></div><p className="text-sm text-slate-300 my-3">Last 200 saved question records for this learner. First try without help, supported practice, and retries are different evidence—not a mastery grade. Older answers cannot be reconstructed.</p>
    {!rows.length ? <p>No practice records yet. Complete a question to start the report.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Practice grouped by skill</caption><thead><tr>{['Skill', 'Questions', 'First try, no help', 'With support', 'Later checks', 'To revisit'].map(label => <th key={label} scope="col" className="p-3 border-b border-slate-600">{label}</th>)}</tr></thead><tbody>{[...groups].map(([topic, list]) => <tr key={topic}><th scope="row" className="p-3">{topic}</th><td className="p-3">{list.length}</td><td className="p-3">{list.filter(row => row.firstAttemptCorrect).length}</td><td className="p-3">{list.filter(row => row.support !== 'none').length}</td><td className="p-3">{list.filter(row => row.context==='spaced-review' && row.firstAttemptCorrect && !row.answerRevealed).length}</td><td className="p-3">{list.filter(row => !row.correct || !row.firstAttemptCorrect).length}</td></tr>)}</tbody></table></div>}
    <p className="text-sm text-teal-200 mt-4">Next teaching step: ask the learner to explain a game decision, then solve a new problem without the game. Math Practice revisits supported skills with new questions and schedules later checks. First-try game success and later independent checks are separate evidence; neither is a mastery certificate.</p>
  </section>;
}
