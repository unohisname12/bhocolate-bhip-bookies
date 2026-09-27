import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium, request } from '@playwright/test';

// First-deployment smoke only: refuses a classroom that already has learners.
// Never run the normal local e2e database-reset setup against production.
const key = JSON.parse(readFileSync('.pilot-private/remote-teacher.json', 'utf8'));
assert.equal(new URL(key.url).protocol, 'https:');
const api = await request.newContext({ baseURL: key.url, extraHTTPHeaders: { 'X-Pilot-Request': '1' } });
let browser;
let created;
let succeeded = false;
const checks = [];
try {
  assert.equal((await api.get('/api/pilot/health')).status(), 200);
  assert.equal((await api.get('/api/pilot/save')).status(), 401);
  const login = await api.post('/api/pilot/login', { data: { role: 'teacher', code: key.teacherKey } });
  assert.equal(login.status(), 200);
  const cookie = login.headers()['set-cookie'];
  assert.ok(typeof cookie === 'string' && /__Host-/.test(cookie) && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && /SameSite=Strict/i.test(cookie), 'Expected a protected session cookie (value intentionally withheld).');
  const room = await (await api.get('/api/pilot/teacher/classroom')).json();
  assert.equal(room.students.length, 0, 'Use local tests for an occupied classroom; refusing to touch existing learners.');
  checks.push('HTTPS, database health, access denial and secure teacher session');
  const response = await api.post('/api/pilot/teacher/students', { data: { count: 1 } });
  assert.equal(response.status(), 201);
  const cards = await response.json(); created = cards.cards[0];
  writeFileSync('.pilot-private/live-smoke-learner.json', JSON.stringify({ ...created, classCode: cards.classCode }), { mode: 0o600 });
  assert.equal((await api.post(`/api/pilot/teacher/students/${created.id}/egg`, { data: { revision: 1, companion: 'ember_fox' } })).status(), 200);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const openStudent = async code => {
    const context = await browser.newContext({ baseURL: key.url, viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); await page.goto('/');
    await page.getByLabel('Class code', { exact: true }).fill(cards.classCode);
    await page.getByLabel('My secret pet code').fill(code);
    await page.getByRole('button', { name: 'Visit my pet', exact: true }).click();
    return { context, page };
  };
  const { context, page } = await openStudent(created.code);
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Nurture egg' }).click();
  await page.getByRole('button', { name: 'HATCH EGG!' }).click();
  await page.locator('#vpet-scene').waitFor();
  await page.locator('[data-testid="cloud-save-status"]').filter({ hasText: /^Saved online$/ }).waitFor();
  const pet = await (await page.request.get('/api/pilot/save')).json();
  assert.equal(pet.state.pet.speciesId, 'ember_fox');
  assert.equal(await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Save & sign out' }).click();
  await page.getByRole('button', { name: 'Visit my pet', exact: true }).waitFor();
  await page.evaluate(() => localStorage.clear()); await context.close();
  checks.push('Teacher-issued egg, real browser hatch, acknowledged save and sign-out');
  const fresh = await openStudent(created.code);
  await fresh.page.locator('#vpet-scene').waitFor();
  const recovered = await (await fresh.page.request.get('/api/pilot/save')).json();
  assert.equal(recovered.state.pet.id, pet.state.pet.id);
  assert.deepEqual(recovered.state.pet.growth, pet.state.pet.growth);
  const replaced = await (await api.post(`/api/pilot/teacher/students/${created.id}/code`, { data: {} })).json();
  assert.equal((await fresh.page.request.get('/api/pilot/save')).status(), 401);
  await fresh.context.close();
  const again = await openStudent(replaced.code); await again.page.locator('#vpet-scene').waitFor();
  assert.equal((await (await again.page.request.get('/api/pilot/save')).json()).state.pet.id, pet.state.pet.id);
  await again.context.close();
  checks.push('Fresh-device recovery and lost-card replacement retain the exact same pet');
  const history = await (await api.get(`/api/pilot/teacher/students/${created.id}/history`)).json();
  assert.ok(history.recent.length >= 3); assert.ok(history.daily.length >= 1);
  const backup = await (await api.get('/api/pilot/teacher/export')).json();
  assert.equal(backup.students[0].state.pet.id, pet.state.pet.id);
  checks.push('Recovery history and private class backup contain saved progress');
  succeeded = true;
} finally {
  if (browser) await browser.close();
  await api.dispose();
  if (created && succeeded) {
    assert.match(created.id, /^[a-f0-9-]{36}$/); assert.match(key.classroomId, /^[a-f0-9-]{36}$/);
    // Delete only the synthetic learner this invocation created, never a class/teacher.
    const target = `SELECT id FROM students WHERE id='${created.id}' AND classroom_id='${key.classroomId}'`;
    const path = '.pilot-private/live-smoke-cleanup.sql';
    writeFileSync(path, `DELETE FROM sessions WHERE actor_id IN (${target}); DELETE FROM save_versions WHERE student_id IN (${target}); DELETE FROM daily_recovery WHERE student_id IN (${target}); DELETE FROM audit_events WHERE student_id IN (${target}); DELETE FROM students WHERE id='${created.id}' AND classroom_id='${key.classroomId}';`, { mode: 0o600 });
    try { execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', '--remote', '--file', path], { stdio: 'pipe' }); }
    finally { unlinkSync(path); }
    unlinkSync('.pilot-private/live-smoke-learner.json');
    checks.push('Only the synthetic smoke learner was removed; teacher classroom is ready for enrollment');
    writeFileSync('docs/verification/pilot-live-smoke.json', JSON.stringify({ url: key.url, checkedAt: new Date().toISOString(), checks }, null, 2));
    console.log(checks.join('\n'));
  } else if (created) console.error('Smoke failed. The synthetic learner was preserved for investigation; private access is in .pilot-private/live-smoke-learner.json.');
}
