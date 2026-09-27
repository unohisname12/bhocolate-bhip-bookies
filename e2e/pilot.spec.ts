import { expect, test, request as makeRequest, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { hatchEgg } from '../src/services/game/evolutionEngine';
import validateEngine from '../worker/generated/validate-engine.js';
import { createTestEngineState } from '../src/engine/state/createTestEngineState';
import { createMind, remember } from '../src/features/pet-mind/memory';
import { createHomeBase } from '../src/features/home-base/model';
const baseURL = `http://127.0.0.1:${process.env.PILOT_TEST_PORT || 8788}`;
const teachers = () => JSON.parse(readFileSync('.pilot-private/test-teachers.json', 'utf8')) as { code: string; classCode: string }[];
const teacherSessions = new Map<string, Awaited<ReturnType<APIRequestContext['storageState']>>>();
async function teacher(index = 0) {
  const code = teachers()[index].code;
  const api = await makeRequest.newContext({ baseURL, extraHTTPHeaders: { 'X-Pilot-Request': '1' }, storageState: teacherSessions.get(code) });
  // Reuse valid teacher sessions so the suite does not hit the real per-code login limit.
  if (!teacherSessions.has(code) || !(await api.get('/api/pilot/teacher/classroom')).ok()) {
    const response = await api.post('/api/pilot/login', { data: { role: 'teacher', code } });
    expect(response.ok(), await response.text()).toBe(true);
    teacherSessions.set(code, await api.storageState());
  }
  return api;
}

async function card(api: APIRequestContext) {
  const response = await api.post('/api/pilot/teacher/students', { data: { count: 1 } });
  expect(response.status(), await response.text()).toBe(201);
  const result = await response.json();
  return { ...result.cards[0], classCode: result.classCode } as { id: string; alias: string; code: string; classCode: string };
}
async function student(code: string, classCode: string) {
  const api = await makeRequest.newContext({ baseURL, extraHTTPHeaders: { 'X-Pilot-Request': '1' } });
  expect((await api.post('/api/pilot/login', { data: { role: 'student', code, classCode } })).ok()).toBe(true);
  return api;
}
async function signIn(page: Page, c: { code: string; classCode: string }) {
  await page.goto('/');
  await page.getByLabel('Class code', { exact: true }).fill(c.classCode);
  await page.getByLabel('My secret pet code').fill(c.code);
  await page.getByRole('button', { name: 'Visit my pet', exact: true }).click();
}
async function online(page: Page) { await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online', { timeout: 20000 }); }


// Only local test fixtures may fast-forward the activity week. Production API
// calls still enforce it; subsequent lifecycle tests need an already-earned egg.
async function completedWeekFixture(api: APIRequestContext, id: string, companion: string) {
  expect(baseURL.startsWith('http://127.0.0.1:')).toBe(true);
  expect(id).toMatch(/^[a-f0-9-]{36}$/);
  const saved = (await (await api.get('/api/pilot/teacher/export')).json()).students.find((row: {studentId: string}) => row.studentId === id);
  const style = ({koala_sprite:'help',ember_fox:'explore',moss_turtle:'build',luna_owl:'wonder'} as Record<string,string>)[companion];
  const now = Date.now();
  const discovery = { ...saved.state.eggDiscovery, startedAt: now - 5 * 86400000, answers: [4,4,4,4], status: 'collecting', companion: null, teacherChoice: null, mission: null,
    stamps: [4,3,2,1,0].map(day => ({day: new Date(now - day * 86400000).toISOString().slice(0,10),style,source:'mission'})) };
  const path = `.pilot-private/week-fixture-${randomUUID()}.sql`;
  const value = JSON.stringify(discovery).replaceAll("'", "''");
  writeFileSync(path, `DELETE FROM save_versions WHERE student_id='${id}'; DELETE FROM daily_recovery WHERE student_id='${id}'; UPDATE students SET state_json=json_set(state_json,'$.state.eggDiscovery',json('${value}')) WHERE id='${id}';`, {mode:0o600});
  try { execFileSync('npx',['wrangler','d1','execute','auralith-classroom-pilot','--local','--persist-to','.wrangler/pilot-test-state','--file',path],{stdio:'pipe'}); } finally {unlinkSync(path);}
}
async function earnedEgg(api: APIRequestContext, id: string, companion: string) {
  await completedWeekFixture(api,id,companion);
  return api.post(`/api/pilot/teacher/students/${id}/egg`, {data:{revision:1,companion}});
}

test('Home Base survives a new login and invalid furniture cannot replace its online save', async () => {
  const t = await teacher(1), c = await card(t), s = await student(c.code, c.classCode);
  const first = await (await s.get('/api/pilot/save')).json();
  const state = structuredClone(first.state);
  state.homeBase = createHomeBase(state);
  state.homeBase.rooms.den.wall = 'blue';
  state.homeBase.rooms.den.night = true;
  state.homeBase.owned.push('collection_starlight_armchair');
  state.homeBase.rooms.den.items.push({ id: 'online-collection-chair', furnitureId: 'collection_starlight_armchair', x: 0, y: 5, flipped: true, on: true, finish: 'rose' });
  state.screen = 'home_builder';
  const saved = await s.put('/api/pilot/save', { data: { revision: first.revision, requestId: randomUUID(), state } });
  expect(saved.status(), await saved.text()).toBe(200);
  await s.post('/api/pilot/logout', { data: {} });
  const returning = await student(c.code, c.classCode);
  const restored = await (await returning.get('/api/pilot/save')).json();
  expect(restored.state.homeBase).toEqual(state.homeBase);
  expect(restored.state.screen).toBe('home_builder');
  const invalid = structuredClone(restored.state);
  invalid.homeBase.rooms.den.items[0].x = 999;
  expect((await returning.put('/api/pilot/save', { data: { revision: restored.revision, requestId: randomUUID(), state: invalid } })).ok()).toBe(false);
  expect((await (await returning.get('/api/pilot/save')).json()).state.homeBase).toEqual(state.homeBase);
  await Promise.all([t.dispose(), s.dispose(), returning.dispose()]);
});

test('individual pet memories survive online saves and reject invalid traits', async () => {
  const t=await teacher(1),c=await card(t);
  await earnedEgg(t,c.id,'koala_sprite');
  const s=await student(c.code,c.classCode);
  const first=await (await s.get('/api/pilot/save')).json(),state=structuredClone(first.state);
  state.pet=createTestEngineState().pet;
  state.pet.ownerId=state.player.id;
  state.pet.mind=remember(createMind(state.pet),'dance',Date.now());
  state.egg=null;state.screen='home';
  const response=await s.put('/api/pilot/save',{data:{revision:first.revision,requestId:randomUUID(),state}});
  expect(response.status(),await response.text()).toBe(200);
  await s.post('/api/pilot/logout',{data:{}});
  const returning=await student(c.code,c.classCode),restored=await (await returning.get('/api/pilot/save')).json();
  expect(restored.state.pet.mind).toEqual(state.pet.mind);
  const invalid=structuredClone(restored.state);invalid.pet.mind.traits.curiosity=2;
  expect((await returning.put('/api/pilot/save',{data:{revision:restored.revision,requestId:randomUUID(),state:invalid}})).status()).toBe(422);
  expect((await (await returning.get('/api/pilot/save')).json()).state.pet.mind).toEqual(state.pet.mind);
  await Promise.all([t.dispose(),s.dispose(),returning.dispose()]);
});

test('unauthenticated, cross-site and cross-role requests cannot access pets or teachers', async ({ request }) => {
  expect((await request.get('/api/pilot/save')).status()).toBe(401);
  const t = await teacher(); const c = await card(t); const s = await student(c.code, c.classCode);
  expect((await s.get('/api/pilot/teacher/classroom')).status()).toBe(403);
  expect((await s.post(`/api/pilot/teacher/students/${c.id}/egg`, { data: { revision: 1, companion: 'luna_owl' } })).status()).toBe(403);
  expect((await s.post('/api/pilot/logout', { headers: { Origin: 'https://evil.example' }, data: {} })).status()).toBe(403);
  expect((await s.post('/api/pilot/logout', { headers: { 'X-Pilot-Request': '' }, data: {} })).status()).toBe(403);
  const secondTeacher = await teacher(1);
  expect((await secondTeacher.get(`/api/pilot/teacher/students/${c.id}/history`)).status()).toBe(404);
  const response = await s.get('/api/pilot/save');
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
  expect((await response.json()).state.player.displayName).toBe(c.alias);
  await Promise.all([t.dispose(), s.dispose(), secondTeacher.dispose()]);
});

test('version checks reject stale overwrites; replay does not duplicate a save; teacher restore keeps history', async () => {
  const t = await teacher(), c = await card(t), s = await student(c.code, c.classCode);
  const first = await (await s.get('/api/pilot/save')).json();
  const changed = structuredClone(first.state); changed.screen = 'play';
  const payload = { revision: first.revision, requestId: randomUUID(), state: changed };
  const saved = await s.put('/api/pilot/save', { data: payload });
  expect(saved.status(), await saved.text()).toBe(200);
  const updated = await saved.json(); expect(updated.revision).toBe(first.revision + 1);
  expect((await (await s.put('/api/pilot/save', { data: payload })).json()).revision).toBe(updated.revision);
  expect((await s.put('/api/pilot/save', { data: { ...payload, state: { ...changed, screen: 'woodland' } } })).status()).toBe(409);
  expect((await s.put('/api/pilot/save', { data: { ...payload, requestId: randomUUID() } })).status()).toBe(409);
  const restored = await t.post(`/api/pilot/teacher/students/${c.id}/restore`, { data: { revision: updated.revision, targetRevision: first.revision, confirm: 'RESTORE' } });
  expect(restored.status(), await restored.text()).toBe(200);
  expect((await restored.json()).state.screen).toBe('discovery');
  const history = await (await t.get(`/api/pilot/teacher/students/${c.id}/history`)).json();
  expect(history.recent.length).toBe(3);
  await Promise.all([t.dispose(), s.dispose()]);
});

test('invalid, impersonated, teacher-edited and preview saves never replace the good save', async () => {
  const t = await teacher(), c = await card(t), s = await student(c.code, c.classCode);
  const original = await (await s.get('/api/pilot/save')).json();
  const candidates = [
    { ...original.state, mode: 'test' },
    { ...original.state, devPreview: true },
    { ...original.state, player: { ...original.state.player, id: 'another-child' } },
    { ...original.state, learning: { ...original.state.learning, grade: 12 } },
    { ...original.state, inventory: { items: 'broken' } },
  ];
  for (const state of candidates) expect((await s.put('/api/pilot/save', { data: { revision: original.revision, requestId: randomUUID(), state } })).ok()).toBe(false);
  expect((await (await s.get('/api/pilot/save')).json()).revision).toBe(original.revision);
  expect((await s.put('/api/pilot/save', { data: { padding: 'x'.repeat(2 * 1024 * 1024) } })).status()).toBe(413);
  const longer = { ...original.state, events: Array.from({ length: 500 }, (_, i) => ({ id: `event-${i}`, type: 'care_game_complete', playerId: c.id, createdAt: new Date().toISOString(), payload: { source: 'practice', detail: 'x'.repeat(350) } })) };
  expect(Buffer.byteLength(JSON.stringify(longer))).toBeGreaterThan(192 * 1024);
  const longSave = await s.put('/api/pilot/save', { data: { revision: original.revision, requestId: randomUUID(), state: longer } });
  expect(longSave.status(), await longSave.text()).toBe(200);
  expect((await (await s.get('/api/pilot/save')).json()).state.events).toHaveLength(500);
  await Promise.all([t.dispose(), s.dispose()]);
});

test('replacing a lost card and pausing access preserve the same pet and revoke existing sessions', async () => {
  const t = await teacher(), c = await card(t), s = await student(c.code, c.classCode);
  const issue = await earnedEgg(t, c.id, 'ember_fox');
  expect(issue.ok()).toBe(true); const eggId = (await issue.json()).state.egg.id;
  const replacement = await (await t.post(`/api/pilot/teacher/students/${c.id}/code`, { data: {} })).json();
  expect((await s.get('/api/pilot/save')).status()).toBe(401);
  expect((await s.post('/api/pilot/login', { data: { role: 'student', code: c.code, classCode: c.classCode } })).status()).toBe(401);
  const recovered = await student(replacement.code, c.classCode);
  expect((await (await recovered.get('/api/pilot/save')).json()).state.egg.id).toBe(eggId);
  expect((await t.post(`/api/pilot/teacher/students/${c.id}/pause`, { data: { active: false } })).ok()).toBe(true);
  expect((await recovered.get('/api/pilot/save')).status()).toBe(401);
  expect((await t.post(`/api/pilot/teacher/students/${c.id}/pause`, { data: { active: true } })).ok()).toBe(true);
  const again = await student(replacement.code, c.classCode);
  expect((await (await again.get('/api/pilot/save')).json()).state.egg.id).toBe(eggId);
  await Promise.all([t.dispose(), s.dispose(), recovered.dispose(), again.dispose()]);
});

test('teacher backup import is scoped to one learner and can undo an accidental update', async () => {
  const t = await teacher(), c = await card(t);
  const exported = await (await t.get('/api/pilot/teacher/export')).json();
  const backup = exported.students.find((row: { studentId: string }) => row.studentId === c.id);
  expect(JSON.stringify(exported)).not.toContain('credential_hash');
  expect((await earnedEgg(t, c.id, 'moss_turtle')).ok()).toBe(true);
  const other = await card(t);
  expect((await t.post(`/api/pilot/teacher/students/${other.id}/restore`, { data: { revision: 1, backup, confirm: 'RESTORE' } })).status()).toBe(403);
  const restore = await t.post(`/api/pilot/teacher/students/${c.id}/restore`, { data: { revision: 2, backup, confirm: 'RESTORE' } });
  expect(restore.ok()).toBe(true); expect((await restore.json()).state.egg).toBeNull();
  await t.dispose();
});

test('phone: a teacher-created learner hatches, signs out, clears device storage and gets the SAME pet elsewhere', async ({ page, browser }) => {
  test.setTimeout(60000); await page.setViewportSize({ width: 390, height: 844 });
  const t = await teacher(), c = await card(t);
  await earnedEgg(t, c.id, 'luna_owl');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await signIn(page, c);
  await expect(page.getByRole('button', { name: 'Teacher dashboard', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Dev Mode' })).toHaveCount(0);
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible(); await online(page);
  const before = await (await page.request.get('/api/pilot/save')).json();
  expect(before.state.pet.speciesId).toBe('luna_owl');
  await page.getByRole('button', { name: 'Save & sign out' }).click();
  await expect(page.getByRole('button', { name: 'Visit my pet', exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL });
  try {
    const another = await context.newPage(); await signIn(another, c);
    await expect(another.locator('#vpet-scene')).toBeVisible(); await online(another);
    const after = await (await another.request.get('/api/pilot/save')).json();
    expect(after.state.pet.id).toBe(before.state.pet.id);
    expect(after.state.pet.growth).toEqual(before.state.pet.growth);
    expect(await another.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); await t.dispose(); }
  expect(errors).toEqual([]);
});

test('network failure pauses play, keeps an unsent copy, and retries successfully', async ({ page }) => {
  const t = await teacher(), c = await card(t); await signIn(page, c); await online(page);
  await page.route('**/api/pilot/save', route => route.request().method() === 'PUT' ? route.abort() : route.continue());
  await page.getByRole('button', { name: /Join the bridge adventure/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Protect your saved pet' });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(id => localStorage.getItem(`auralith-pending-${id}`) !== null, c.id)).toBe(true);
  await page.unroute('**/api/pilot/save');
  await dialog.getByRole('button', { name: 'Retry connection' }).click();
  await expect(dialog).toHaveCount(0); await online(page);
  expect((await (await page.request.get('/api/pilot/save')).json()).state.screen).toBe('woodland');
  await t.dispose();
});

test('a stale device cannot overwrite teacher settings; no fresh game is fabricated when server loading fails', async ({ page }) => {
  const t = await teacher(), c = await card(t); await signIn(page, c); await online(page);
  const remote = await (await page.request.get('/api/pilot/save')).json();
  expect((await t.post(`/api/pilot/teacher/students/${c.id}/settings`, { data: { revision: remote.revision, assignment: 'practice', learning: { grade: 12, topic: 'Derivatives', challenge: 'support', learningHelp: true } } })).ok()).toBe(true);
  await page.getByRole('button', { name: /Join the bridge adventure/ }).click();
  await online(page);
  await expect(page.getByRole('dialog', { name: 'Protect your saved pet' })).toHaveCount(0);
  expect((await (await page.request.get('/api/pilot/save')).json()).state.learning.grade).toBe(12);
  await page.route('**/api/pilot/save', route => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your game has not been reset.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tap egg to warm it' })).toHaveCount(0);
  await t.dispose();
});

test('teacher UI creates printable anonymous cards, saves assignments and exports a private backup', async ({ page }) => {
  const seed = await teacher(); await card(seed); await seed.dispose();
  await page.goto('/'); await page.getByRole('button', { name: 'Teacher sign in', exact: true }).click();
  await page.getByLabel('Private teacher key').fill(teachers()[0].code);
  await page.getByRole('button', { name: 'Open teacher classroom' }).click();
  await page.getByLabel('Number of learner cards').fill('1');
  await page.getByRole('button', { name: 'Create login cards' }).click();
  const cards = page.getByRole('region', { name: 'New private login cards' });
  await expect(cards).toBeVisible();
  const alias = await cards.locator('h3').innerText();
  expect(alias).toMatch(/^Learner \d+$/);
  const rosterDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download roster spreadsheet' }).click();
  const rosterFile = await (await rosterDownload).path();
  expect(readFileSync(rosterFile!, 'utf8')).toContain(`"${alias}",""`);
  expect(readFileSync(rosterFile!, 'utf8')).toContain('Child name (fill in privately)');
  await page.locator('.pilot-roster').getByRole('button', { name: new RegExp(alias) }).click();
  await page.getByLabel('Grade level', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Lower grade' }).click();
  await expect(page.getByLabel('Grade level', { exact: true })).toHaveValue('0');
  await page.getByRole('button', { name: 'More support' }).click();
  await expect(page.getByLabel('Challenge level')).toHaveValue('support');
  await expect(page.getByLabel('Offer hints and explanations')).toBeChecked();
  await page.getByRole('button', { name: 'Independent practice' }).click();
  await expect(page.getByLabel('Offer hints and explanations')).not.toBeChecked();
  await page.getByLabel('Practice topic').selectOption('Counting');
  await page.getByLabel('Assigned activity').selectOption('bridge');
  await page.getByRole('button', { name: 'Save learner settings' }).click();
  await expect(page.getByRole('status').filter({hasText:`Saved for ${alias}`})).toBeVisible();
  await page.getByRole('button', { name: 'Higher grade' }).click();
  await expect(page.getByLabel('Grade level', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Practice topic')).toHaveValue('mixed');
  await page.getByRole('button', { name: 'Reset changes' }).click();
  await expect(page.getByLabel('Grade level', { exact: true })).toHaveValue('0');
  await expect(page.getByLabel('Practice topic')).toHaveValue('Counting');
  await page.getByRole('button', { name: 'Higher grade' }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('.pilot-roster button').filter({ hasNotText: alias }).first().click();
  await expect(page.getByRole('region', { name: 'Selected learner profile' }).getByRole('heading', { name: alias, exact: true })).toBeVisible();
  await expect(page.getByLabel('Grade level', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Reset changes' }).click();

  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download class backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/auralith-class-backup/);
  await page.screenshot({ path: 'docs/verification/pilot-teacher-desktop.png', fullPage: true, mask: [cards, page.locator('.pilot-code')] });
});

test('simultaneous saves accept one writer and never silently overwrite the winner', async () => {
  const t = await teacher(), c = await card(t), a = await student(c.code, c.classCode), b = await student(c.code, c.classCode);
  const original = await (await a.get('/api/pilot/save')).json();
  const replies = await Promise.all([
    a.put('/api/pilot/save', { data: { revision: original.revision, requestId: randomUUID(), state: { ...original.state, screen: 'play' } } }),
    b.put('/api/pilot/save', { data: { revision: original.revision, requestId: randomUUID(), state: { ...original.state, screen: 'woodland' } } }),
  ]);
  expect(replies.map(r => r.status()).sort()).toEqual([200, 409]);
  expect((await (await a.get('/api/pilot/save')).json()).revision).toBe(original.revision + 1);
  await Promise.all([t.dispose(), a.dispose(), b.dispose()]);
});

test('teacher can recover a damaged server record; a missing save never becomes a new pet', async () => {
  const t = await teacher(), c = await card(t), s = await student(c.code, c.classCode);
  expect((await earnedEgg(t, c.id, 'moss_turtle')).ok()).toBe(true);
  const good = await (await s.get('/api/pilot/save')).json();
  const path = '.pilot-private/test-corruption.sql';
  writeFileSync(path, `UPDATE students SET state_json='{"broken":true}',revision=revision+1,request_id='${randomUUID()}' WHERE id='${c.id}';`, { mode: 0o600 });
  try { execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', '--local', '--persist-to', '.wrangler/pilot-test-state', '--file', path], { stdio: 'pipe' }); }
  finally { unlinkSync(path); }
  expect((await s.get('/api/pilot/save')).status()).toBe(503);
  const roster = await (await t.get('/api/pilot/teacher/classroom')).json();
  const broken = roster.students.find((row: { id: string }) => row.id === c.id);
  expect(broken.needsRecovery).toBe(true);
  const restored = await t.post(`/api/pilot/teacher/students/${c.id}/restore`, { data: { revision: broken.revision, targetRevision: good.revision, confirm: 'RESTORE' } });
  expect(restored.status(), await restored.text()).toBe(200);
  expect((await restored.json()).state.egg.id).toBe(good.state.egg.id);
  await Promise.all([t.dispose(), s.dispose()]);
});

test('assigned eggs cannot be deleted or changed by a student checkpoint', async () => {
  const t = await teacher(), c = await card(t), s = await student(c.code, c.classCode);
  await earnedEgg(t, c.id, 'ember_fox');
  const original = await (await s.get('/api/pilot/save')).json();
  for (const egg of [null, { ...original.state.egg, type: 'luna_owl' }]) {
    expect((await s.put('/api/pilot/save', { data: { revision: original.revision, requestId: randomUUID(), state: { ...original.state, egg } } })).status()).toBe(409);
  }
  expect((await (await s.get('/api/pilot/save')).json()).state.egg.id).toBe(original.state.egg.id);
  await Promise.all([t.dispose(), s.dispose()]);
});

test('brute-force login attempts are rate limited without exposing a roster', async ({ request }) => {
  let status = 0;
  for (let i = 0; i < 16; i++) status = (await request.post('/api/pilot/login', { data: { role: 'student', classCode: 'NOTACLASS', code: 'NOTAREALPETCODE22' } })).status();
  expect(status).toBe(429);
});

test('a lost server acknowledgment retries without duplication; unreadable device recovery is preserved', async ({ page }) => {
  const t = await teacher(), c = await card(t); await signIn(page, c); await online(page);
  await page.route('**/api/pilot/save', async route => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fetch(); await route.abort();
  });
  await page.getByRole('button', { name: /Join the bridge adventure/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Protect your saved pet' });
  await expect(dialog).toBeVisible();
  const acknowledged = await (await page.request.get('/api/pilot/save')).json();
  await page.unroute('**/api/pilot/save');
  await dialog.getByRole('button', { name: 'Retry connection' }).click(); await online(page);
  expect((await (await page.request.get('/api/pilot/save')).json()).revision).toBe(acknowledged.revision);
  await page.evaluate(id => localStorage.setItem(`auralith-pending-${id}`, '{damaged-device-copy'), c.id);
  await page.reload(); await expect(dialog).toBeVisible();
  expect(await page.evaluate(id => localStorage.getItem(`auralith-pending-${id}`), c.id)).toBe('{damaged-device-copy');
  await page.getByRole('button', { name: 'Use latest saved pet' }).click(); await online(page);
  expect(await page.evaluate(id => Object.keys(localStorage).some(key => key.startsWith(`auralith-pending-${id}-recovery-`) && localStorage.getItem(key) === '{damaged-device-copy'), c.id)).toBe(true);
  await t.dispose();
});

test('online gameplay saves explanations, bridge deliveries, care and baby progress across reloads', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('response', response => {
    if (response.status() === 422 && response.request().method() === 'PUT') {
      validateEngine(response.request().postDataJSON().state);
      console.error('Checkpoint schema paths:', JSON.stringify((validateEngine as any).errors));
    }
  });
  const t = await teacher(), c = await card(t);
  await earnedEgg(t, c.id, 'moss_turtle');
  const settings = await t.post(`/api/pilot/teacher/students/${c.id}/settings`, { data: { revision: 2, assignment: 'bridge', learning: { grade: 12, topic: 'Derivatives', challenge: 'support', learningHelp: true } } });
  expect(settings.ok()).toBe(true);
  const saved = async () => (await (await page.request.get('/api/pilot/save')).json()).state;
  await signIn(page, c);
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible(); await online(page);
  const petId = (await saved()).pet.id;
  await page.getByRole('button', { name: 'Teacher’s activity' }).click();
  await page.getByRole('button', { name: 'Start the bridge adventure' }).click(); await online(page);
  await page.getByLabel('Bridge answer', { exact: true }).fill('-9999');
  await page.getByRole('button', { name: 'Add a bridge piece' }).click();
  await page.getByRole('button', { name: 'Explain the answer', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Worked explanation' })).toContainText('power rule');
  await online(page);
  for (let i = 0; i < 3; i++) {
    const state = await saved();
    await page.getByLabel('Bridge answer', { exact: true }).fill(String(state.woodland.problems[i].answer));
    await page.getByRole('button', { name: 'Add a bridge piece', exact: true }).click();
    await expect.poll(async () => (await saved()).woodland.index).toBe(i + 1); await online(page);
    if (i === 0) { await page.reload(); await online(page); }
  }
  await page.getByRole('button', { name: /Deliver with Catch Math/ }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('catch-throw')).toBeEnabled();
    const match = (await page.getByTestId('catch-prompt').innerText()).match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
    expect(match).toBeTruthy();
    await page.getByRole('radio', { name: String(2 * Number(match[1]) * Number(match[2])), exact: true }).click();
    await page.getByTestId('catch-throw').click();
    await expect.poll(async () => (await saved()).woodland.deliveries.length).toBe(i + 1); await online(page);
    if (i === 0) { await page.reload(); await online(page); await page.screenshot({ path: 'docs/verification/pilot-catch-mobile.png' }); }
  }
  await page.getByRole('button', { name: /^Celebrate with / }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  for (let i = 0; i < 5; i++) await dialog.getByRole('button', { name: 'Pet the heart' }).click();
  await dialog.getByRole('button', { name: 'Finish care' }).click();
  await page.getByRole('button', { name: /Golden lanterns/ }).click();
  await expect(page.getByRole('heading', { name: 'A bridge. A memory. A good place to stop.' })).toBeVisible(); await online(page);
  await page.reload(); await online(page);
  const final = await saved();
  expect(final.woodland).toMatchObject({ phase: 'complete', decoration: 'lanterns' });
  expect(final.pet.id).toBe(petId); expect(final.pet.stage).toBe('baby');
  expect(final.pet.growth.careDays[0].tasks).toContain('play');
  expect(final.learningEvidence).toHaveLength(6);
  expect(final.learningEvidence[0]).toMatchObject({ attempts: 2, support: 'explanation', firstAttemptCorrect: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/verification/pilot-complete-mobile.png', fullPage: true, animations: 'disabled' });
  await t.dispose();
});

test('Classroom Clash shares scores, protects teacher controls and persists prizes exactly once', async ({ browser }) => {
  const t = await teacher(), other = await teacher(1);
  const a = await card(t), b = await card(t);
  const sa = await student(a.code, a.classCode), sb = await student(b.code, b.classCode);
  expect((await sa.post('/api/pilot/clash/start', { data: { minutes: 5 } })).status()).toBe(403);
  expect((await t.post('/api/pilot/clash/start', { data: { minutes: 5 } })).ok()).toBe(true);
  const round = (await (await t.get('/api/pilot/clash')).json()).round;
  expect((await t.post('/api/pilot/clash/start', { data: { minutes: 5 } })).status()).toBe(409);
  expect((await (await other.get('/api/pilot/clash')).json()).round).toBeNull();
  expect((await other.post('/api/pilot/clash/finish', { data: { roundId: round.id } })).status()).toBe(409);
  const saveAnswer = async (api: APIRequestContext, q: string, correct: boolean, source = 'practice') => {
    const current = await (await api.get('/api/pilot/save')).json();
    current.state.learningEvidence = [...(current.state.learningEvidence ?? []).filter((e: { questionId: string }) => e.questionId !== q), { questionId: q, topic: current.state.learning.topic, grade: current.state.learning.grade, source, attempts: 2, support: 'hint', correct, firstAttemptCorrect: false, updatedAt: Date.now() }];
    const payload = { revision: current.revision, requestId: randomUUID(), state: current.state };
    const response = await api.put('/api/pilot/save', { data: payload });
    expect(response.status(), await response.text()).toBe(200);
    expect((await api.put('/api/pilot/save', { data: payload })).status()).toBe(200);
  };
  await saveAnswer(sa, 'clash-q1', false);
  expect((await (await sa.get('/api/pilot/clash')).json()).standings.find((r: { studentId: string }) => r.studentId === a.id).score).toBe(0);
  await saveAnswer(sa, 'clash-q1', true);
  await saveAnswer(sa, 'clash-q1', true);
  await saveAnswer(sb, 'clash-q2', true, 'catch');
  const scores = (await (await sa.get('/api/pilot/clash')).json()).standings.filter((r: { score: number }) => r.score > 0);
  expect(scores).toHaveLength(2); expect(scores.map((r: { score: number }) => r.score)).toEqual([10,10]);
  expect(scores.map((r: { rank: number }) => r.rank)).toEqual([1,1]);
  expect((await sa.post('/api/pilot/clash/claim', { data: { roundId: round.id } })).status()).toBe(409);
  expect((await sb.post('/api/pilot/clash/finish', { data: { roundId: round.id } })).status()).toBe(403);
  expect((await t.post('/api/pilot/clash/finish', { data: { roundId: round.id } })).ok()).toBe(true);
  await saveAnswer(sa, 'after-finish', true);
  expect((await (await sa.get('/api/pilot/clash')).json()).standings.find((r: { studentId: string }) => r.studentId === a.id).score).toBe(10);
  const before = await (await sa.get('/api/pilot/save')).json();
  expect((await sa.post('/api/pilot/clash/claim', { data: { roundId: round.id } })).ok()).toBe(true);
  const claimed = await (await sa.get('/api/pilot/save')).json();
  expect(claimed.state.prizes.classClaims).toContain(round.id);
  expect(claimed.state.player.unlockedRoomItems).toContain('clash_trophy');
  expect(claimed.state.cosmetics.owned.some((c: { cosmeticId: string }) => c.cosmeticId === 'cos_season_crown')).toBe(true);
  expect((await sa.post('/api/pilot/clash/claim', { data: { roundId: round.id } })).ok()).toBe(true);
  expect((await (await sa.get('/api/pilot/save')).json()).revision).toBe(claimed.revision);
  expect((await sa.put('/api/pilot/save', { data: { revision: before.revision, requestId: randomUUID(), state: before.state } })).status()).toBe(409);
  const context = await browser.newContext(); const page = await context.newPage();
  await signIn(page, a); await online(page);
  await page.getByRole('button', { name: /Classroom Clash/ }).click();
  await expect(page.getByRole('list', { name: 'Class standings' })).toContainText(a.alias);
  await expect(page.getByRole('list', { name: 'Class standings' })).toContainText(b.alias);
  await context.close();
  await Promise.all([t.dispose(), other.dispose(), sa.dispose(), sb.dispose()]);
});

test('Prize Studio buys, places, moves and keeps decoration sprites on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const t = await teacher(1), c = await card(t);
  await earnedEgg(t, c.id, 'luna_owl');
  await signIn(page, c);
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible(); await online(page);
  await page.getByRole('button', { name: 'Save & sign out' }).click();
  const s = await student(c.code, c.classCode);
  const saved = await (await s.get('/api/pilot/save')).json();
  saved.state.prizes = { wins: 0, medals: 10, boosts: { attack: 1, defense: 1 }, armed: null, levelClaims: {}, classClaims: [] };
  const result = await s.put('/api/pilot/save', { data: { revision: saved.revision, requestId: randomUUID(), state: saved.state } });
  expect(result.status(), await result.text()).toBe(200);
  await signIn(page, c);
  await page.getByRole('button', { name: /Prize Studio/ }).click();
  const studio = page.getByRole('dialog', { name: 'Prize Studio' });
  await expect(studio).toContainText('Your battle goals');
  const bed = studio.locator('article').filter({ hasText: 'Cozy Pet Bed' });
  await bed.getByRole('button', { name: 'Unlock' }).click();
  await studio.getByRole('button', { name: 'Arm attack', exact: true }).click();
  await bed.getByRole('button', { name: 'Arrange in Home Base' }).click();
  await page.getByRole('button',{name:'✎ Build',exact:true}).click();
  await page.getByRole('button',{name:'treasures',exact:true}).click();
  await page.locator('.hb-catalog article').filter({has:page.getByRole('heading',{name:'Cozy Pet Bed',exact:true})}).getByRole('button',{name:'Place',exact:true}).click();
  await page.getByRole('button',{name:'Floor tile 1, 6',exact:true}).click();
  await page.getByRole('button',{name:'Cozy Pet Bed, placed at 1, 6',exact:true}).click();
  await page.getByRole('button',{name:'Move →',exact:true}).click();
  await page.getByRole('button',{name:'← Back to pet',exact:true}).click();
  const sprite = page.getByLabel('Your saved home').locator('img[data-furniture-id="clash_bed"]');
  await expect(sprite).toBeVisible();
  expect(await sprite.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await online(page); await page.reload(); await online(page);
  await expect(sprite).toBeVisible();
  const persisted = await (await page.request.get('/api/pilot/save')).json();
  expect(persisted.state.prizes.medals).toBe(5);
  expect(persisted.state.prizes.armed).toBe('attack');
  expect(persisted.state.homeBase.rooms.den.items.find((i: { furnitureId: string }) => i.furnitureId === 'clash_bed').x).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/verification/classroom-clash-home-phone.png' });
  await page.getByRole('button', { name: /Prize Studio/ }).click();
  await page.screenshot({ path: 'docs/verification/classroom-clash-prizes-phone.png' });
  await Promise.all([t.dispose(), s.dispose()]);
});

test('Excel roster import is private, repeatable, authenticated, and preserves existing saves', async ({ page }) => {
  const ExcelJS = (await import('exceljs')).default;
  const t = await teacher(2);
  const room = await (await t.get('/api/pilot/teacher/classroom')).json();
  await page.context().addCookies((await t.storageState()).cookies);
  await page.goto('/');
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('Roster');
  sheet.addRow(['Class code', 'Account ID', 'Learner account', 'Child name (fill in privately)']);
  sheet.addRow(['', `demo_${randomUUID()}`, 'Private label', '']);
  const requests: Record<string, unknown>[] = [];
  page.on('request', r => { if (r.url().endsWith('/teacher/roster-import')) requests.push(r.postDataJSON()); });
  await page.getByLabel('Choose roster spreadsheet').setInputFiles({ name: 'roster.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await expect(page.getByText('1 rows ready.', { exact: false })).toBeVisible();
  const recovery = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save recovery sheet' }).click();
  await recovery;
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create or verify roster codes' }).click();
  const download = await downloaded;
  await expect(page.getByText('1 codes ready.', { exact: false })).toBeVisible();
  expect(JSON.stringify(requests)).not.toContain('Private');
  const resultBook = new ExcelJS.Workbook(); await resultBook.xlsx.readFile((await download.path())!);
  const result = resultBook.worksheets[0];
  expect(result.getCell('D2').text).toBe('');
  const id = result.getCell('B2').text, code = result.getCell('E2').text;
  const s = await student(code, room.classCode);
  const before = await (await s.get('/api/pilot/save')).json();
  const retry = await t.post('/api/pilot/teacher/roster-import', { data: requests[0] });
  expect(retry.status(), await retry.text()).toBe(200);
  expect((await retry.json()).cards[0]).toMatchObject({ id, created: false });
  expect(await (await s.get('/api/pilot/save')).json()).toEqual(before);
  expect((await (await t.get('/api/pilot/teacher/classroom')).json()).students.length).toBe(room.students.length + 1);
  expect((await s.post('/api/pilot/teacher/roster-import', { data: requests[0] })).status()).toBe(403);
  const other = await teacher(1);
  expect((await other.post('/api/pilot/teacher/roster-import', { data: requests[0] })).status()).toBe(400);
  const original = requests[0] as { classCode: string; rows: { sourceKey: string; code: string }[] };
  expect((await t.post('/api/pilot/teacher/roster-import', { data: { ...original, rows: [...original.rows, ...original.rows] } })).status()).toBe(400);
  expect((await t.post('/api/pilot/teacher/roster-import', { data: { ...original, rows: [{ ...original.rows[0], code: 'AAAAAAAAAAAAAAAA' }] } })).status()).toBe(409);
  await Promise.all([t.dispose(), s.dispose(), other.dispose()]);
});

test('classroom mystery egg stays through activity days and refuses quick-start or forged days', async ({ page }) => {
  const t = await teacher(2), c = await card(t);
  const shortcut = await t.post(`/api/pilot/teacher/students/${c.id}/egg`, { data: {revision:1,companion:'koala_sprite'} });
  expect(shortcut.status()).toBe(409);
  await signIn(page,c); await online(page);
  await expect(page.getByRole('button',{name:'Greet your mystery egg'})).toBeVisible();
  for (let i=0;i<12;i++) await page.getByRole('button',{name:'Greet your mystery egg'}).click();
  await expect(page.getByRole('button',{name:'HATCH EGG!'})).toHaveCount(0);
  await page.getByRole('button',{name:'Skip quiz—use my activities instead'}).click();
  await page.getByRole('button',{name:/Star Detectives/}).click();
  for (let index=0;index<3;index++) {
    await expect.poll(async () => (await (await page.request.get('/api/pilot/save')).json()).state.eggDiscovery.mission?.index).toBe(index);
    const saved = await (await page.request.get('/api/pilot/save')).json();
    await page.getByLabel('Discovery answer').fill(String(saved.state.eggDiscovery.mission.problems[index].answer));
    await page.getByRole('button',{name:'Add an adventure piece'}).click();
  }
  await expect(page.getByRole('heading',{name:'1 / 5 learning days'})).toBeVisible();
  await page.getByRole('button',{name:'Save & sign out',exact:true}).click();
  await signIn(page,c); await online(page);
  await expect(page.getByRole('heading',{name:'1 / 5 learning days'})).toBeVisible();
  await expect(page.getByRole('button',{name:'HATCH EGG!'})).toHaveCount(0);
  const save = await (await page.request.get('/api/pilot/save')).json();
  const forged = structuredClone(save.state);
  forged.eggDiscovery.stamps = [4,3,2,1,0].map(day => ({day:new Date(Date.now()-day*86400000).toISOString().slice(0,10),style:'wonder',source:'mission'}));
  forged.eggDiscovery.status='claimed'; forged.eggDiscovery.companion='luna_owl';
  const rejected = await page.request.put('/api/pilot/save',{data:{revision:save.revision,requestId:randomUUID(),state:forged}});
  expect(rejected.status()).toBe(409);
  await t.dispose();
});

test('Arcade progress and an upgraded egg-only round survive online save and a fresh login', async () => {
  const { engineReducer } = await import('../src/engine/state/engineReducer');
  const t = await teacher(1), c = await card(t), s = await student(c.code, c.classCode);
  const first = await (await s.get('/api/pilot/save')).json();
  let state = structuredClone(first.state);
  state.screen = 'arcade';
  state = engineReducer(state, { type: 'ARCADE_START', game: 'guard', level: 2 });
  state = engineReducer(state, { type: 'ARCADE_BUILD', slot: 0, tower: 'rapid' });
  state = engineReducer(state, { type: 'ARCADE_BUILD', slot: 0, tower: 'rapid' });
  expect(state.pet).toBeNull();
  const response = await s.put('/api/pilot/save', { data: { revision: first.revision, requestId: randomUUID(), state } });
  expect(response.status(), await response.text()).toBe(200);
  await s.post('/api/pilot/logout', { data: {} });
  const returning = await student(c.code, c.classCode);
  const restored = await (await returning.get('/api/pilot/save')).json();
  expect(restored.state.arcade).toEqual(state.arcade);
  expect(restored.state.screen).toBe('arcade');
  const invalid = structuredClone(restored.state); invalid.arcade.charges = -1;
  expect((await returning.put('/api/pilot/save', { data: { revision: restored.revision, requestId: randomUUID(), state: invalid } })).status()).toBe(422);
  await t.dispose(); await s.dispose(); await returning.dispose();
});

for (const recovery of ['normal', 'retry', 'reload'] as const) {
 test(`math level reward saves and validation recovery: ${recovery}`, async ({page}) => {
  const t=await teacher(),c=await card(t);
  await earnedEgg(t,c.id,'koala_sprite');
  const api=await student(c.code,c.classCode);
  const first=await (await api.get('/api/pilot/save')).json();
  const state=structuredClone(first.state);
  state.pet=hatchEgg({...state.egg,state:'ready',progress:100});state.pet.ownerId=state.player.id;
  state.pet.progression.xp=140;state.player.activePetId=state.pet.id;
  state.egg=null;state.screen='math';
  const seeded=await api.put('/api/pilot/save',{data:{revision:first.revision,requestId:randomUUID(),state}});
  expect(seeded.status(),await seeded.text()).toBe(200);
  let rejected=false;
  if(recovery!=='normal') await page.route('**/api/pilot/save',async route=>{
   const req=route.request();
   if(req.method()==='PUT'&&!rejected&&Object.keys(req.postDataJSON().state.prizes?.levelClaims??{}).length){
    rejected=true;await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'The save did not pass validation. Your last good server save is unchanged.',code:'invalid_save'})});
   }else await route.continue();
  });
  await signIn(page,c);await online(page);
  const prompt=page.getByRole('heading',{level:2}).filter({hasText:/^\d+ [+−-] \d+ = \?$/});
  const parts=(await prompt.innerText()).match(/(\d+) ([+−-]) (\d+)/)!;
  const answer=parts[2]==='+'?Number(parts[1])+Number(parts[3]):Number(parts[1])-Number(parts[3]);
  await page.getByLabel('Your answer',{exact:true}).fill(String(answer));
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  if(recovery!=='normal'){
   await expect(page.getByRole('button',{name:'Retry saving my progress',exact:true})).toBeVisible();
   expect(rejected).toBe(true);
   if(recovery==='reload') await page.reload();
   else await page.getByRole('button',{name:'Retry saving my progress',exact:true}).click();
  }
  await expect.poll(async()=> (await (await api.get('/api/pilot/save')).json()).state.prizes?.levelClaims?.[state.pet.id]).toBe(2);
  await online(page);await page.reload();await online(page);
  const restored=await (await api.get('/api/pilot/save')).json();
  expect(restored.state.pet.progression.level).toBe(2);
  expect(restored.state.player.lifetimeMathCorrect).toBe(state.player.lifetimeMathCorrect+1);
  await Promise.all([t.dispose(),api.dispose()]);
 });
}

test('teacher classroom activity credits a real day without quiz and cannot duplicate or cross classrooms', async () => {
  const t=await teacher(), other=await teacher(1), c=await card(t), s=await student(c.code,c.classCode);
  const before=await(await s.get('/api/pilot/save')).json();
  expect(before.state.eggDiscovery.candidates).toHaveLength(9);
  const data={revision:before.revision,style:'help',confirmed:true};
  expect((await other.post(`/api/pilot/teacher/students/${c.id}/activity`,{data})).status()).toBe(404);
  expect((await s.post(`/api/pilot/teacher/students/${c.id}/activity`,{data})).status()).toBe(403);
  const credited=await t.post(`/api/pilot/teacher/students/${c.id}/activity`,{data});expect(credited.status(),await credited.text()).toBe(200);
  const after=await(await s.get('/api/pilot/save')).json();expect(after.state.eggDiscovery.answers).toEqual([-1,-1,-1,-1]);expect(after.state.eggDiscovery.stamps).toHaveLength(1);
  expect((await t.post(`/api/pilot/teacher/students/${c.id}/activity`,{data:{...data,revision:after.revision}})).status()).toBe(409);
  const roster=await(await t.get('/api/pilot/teacher/classroom')).json();expect(roster.students.find((r:{id:string})=>r.id===c.id).discovery).toMatchObject({days:1,quizAnswered:0,creditedToday:true});
  await Promise.all([t.dispose(),other.dispose(),s.dispose()]);
});
