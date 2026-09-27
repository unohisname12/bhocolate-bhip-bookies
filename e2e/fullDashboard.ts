/** Older suites test features behind the teacher's More tools; they start with the full dashboard opened.
 * The first-session suite deliberately omits this to test what a brand-new teacher sees. */
export const fullDashboard = (baseURL: string) => ({ cookies: [], origins: [{ origin: baseURL, localStorage: [
  { name: 'vpet-teacher-more-tools', value: '1' }, { name: 'vpet-teacher-setup-done', value: '1' },
] }] });

import type { APIRequestContext } from '@playwright/test';
/** Students normally unlock games as they play; suites that test a specific game switch that off for their test student. */
export async function showEveryGame(teacher: APIRequestContext, studentId: string) {
  const roster = await (await teacher.get('/api/pilot/teacher/classroom')).json() as { students: { id: string; settingsVersion: number; assignment: string; learning: Record<string, unknown> }[] };
  const row = roster.students.find(s => s.id === studentId)!;
  const r = await teacher.post('/api/pilot/teacher/settings-batch', { data: { rows: [{ id: row.id, version: row.settingsVersion, assignment: row.assignment, learning: { ...row.learning, showAllGames: true } }], requestId: crypto.randomUUID() } });
  if (!r.ok()) throw new Error(`showEveryGame: HTTP ${r.status()} ${await r.text()}`);
}
