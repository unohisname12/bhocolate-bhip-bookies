import { showEveryGame } from './fullDashboard';
import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { signInLink } from '../src/pilot/signInLinks';
import type { CheckView, TeacherChecks } from '../src/features/quick-check/model';
import { MIDDLE_TOPICS } from '../src/features/middle-school/catalog';
import type { EngineState } from '../src/types/engine';
const baseURL = 'http://127.0.0.1:8827';
const teachers = () => JSON.parse(readFileSync('.pilot-private/test-teachers.json', 'utf8')) as { code: string }[];
let teacherState: Awaited<ReturnType<APIRequestContext['storageState']>> | undefined;
const api = (storageState?: Awaited<ReturnType<APIRequestContext['storageState']>>) => request.newContext({ baseURL, storageState, extraHTTPHeaders: { 'X-Pilot-Request': '1' } });
async function post<T>(client: APIRequestContext, path: string, data: unknown): Promise<T> { const r = await client.post(`/api/pilot/${path}`, { data }); expect(r.ok(), `${path}: HTTP ${r.status()}`).toBe(true); return r.json(); }
async function get<T>(client: APIRequestContext, path = 'quick-checks'): Promise<T> { const r = await client.get(`/api/pilot/${path}`); expect(r.ok(), `${path}: HTTP ${r.status()}`).toBe(true); return r.json(); }
async function setup(grade: number) {
  const teacher = await api(teacherState), student = await api();
  // Reuse the real teacher session instead of repeatedly signing in with one code.
  if (!teacherState || !(await teacher.get('/api/pilot/teacher/classroom')).ok()) {
    await post(teacher, 'login', { role: 'teacher', code: teachers()[0].code });
    teacherState = await teacher.storageState();
  }
  const created = await post<{ classCode: string; cards: { id: string; code: string; alias: string }[] }>(teacher, 'teacher/students', { count: 1 });
  const card = created.cards[0];
  const roster = await get<{ students: { id: string; settingsVersion: number }[] }>(teacher, 'teacher/classroom');
  await post(teacher, `teacher/students/${card.id}/grade-recovery`, { grade, topic: 'mixed', settingsVersion: roster.students.find(s => s.id === card.id)!.settingsVersion });
  await showEveryGame(teacher, card.id);
  await post(student, 'login', { role: 'student', code: card.code, classCode: created.classCode });
  // Earned game time has its own suite; these journeys isolate the skill check.
  await post(teacher, 'play-time/policy', { enabled: false });
  return { teacher, student, card, link: signInLink(baseURL, { role: 'student', code: card.code, classCode: created.classCode }) };
}

async function assignTopic(teacher: APIRequestContext, id: string, grade: number, topic: string) {
  const roster = await get<{ students: { id: string; settingsVersion: number }[] }>(teacher, 'teacher/classroom');
  await post(teacher, `teacher/students/${id}/grade-recovery`, { grade, topic, settingsVersion: roster.students.find(s => s.id === id)!.settingsVersion });
}

test('every new middle-school topic survives teacher assignment and a server-scored check', async () => {
  for (const grade of [6,7,8] as const) {
    const { teacher, student, card } = await setup(grade);
    try {
      for (const topic of MIDDLE_TOPICS[grade]) {
        await assignTopic(teacher, card.id, grade, topic);
        let check = await get<CheckView>(student);
        expect(check.learning.topic).toBe(topic);expect(check.coverage).toHaveLength(3);
        check = await post<CheckView>(student, 'quick-checks/start', { revision: check.revision, activity: 'dash' });
        for(let n=0;n<3;n++) {
          expect(check.round!.current!.skillId).toMatch(new RegExp(`^g${grade}-s`));
          expect(check.round!.current).not.toHaveProperty('answer');
          check=await post<CheckView>(student,'quick-checks/answer',{revision:check.revision,questionId:check.round!.current!.id,answer:'',notLearned:true});
        }
        expect(check.round!.completedAt).toBeTruthy();
        expect(check.round!.results.every(r=>r.outcome==='not-learned')).toBe(true);
      }
    } finally { await teacher.dispose(); await student.dispose(); }
  }
});

test('grade 8 math lab teaches the assigned skill and saves supported retries without changing check results', async ({page}) => {
  const {teacher,student,card,link}=await setup(8);
  try {
    await assignTopic(teacher,card.id,8,'Volume');
    await page.setViewportSize({width:390,height:844});await page.goto(link);
    await page.getByRole('button',{name:'Open my math lab',exact:true}).click();
    const lab=page.getByRole('dialog',{name:'Middle school math lab',exact:true});
    await lab.getByText('Volume',{exact:true}).click();
    await lab.getByRole('button',{name:'Find cylinder volume',exact:true}).click();
    await expect(lab.locator('.skill-lesson')).toBeVisible();
    await lab.getByRole('button',{name:'Try three practice questions',exact:true}).click();
    const text=await lab.locator('h4').textContent();
    const match=text!.match(/radius (\d+) cm and height (\d+) cm/)!;
    const answer=Math.round(3.14*Number(match[1])**2*Number(match[2])*100)/100;
    await lab.getByLabel('Your answer',{exact:true}).fill('999999');
    await lab.getByRole('button',{name:'Submit',exact:true}).click();
    await expect(lab.getByRole('status')).toContainText('Not yet');
    await lab.getByRole('button',{name:'Show the worked solution',exact:true}).click();
    await lab.getByLabel('Your answer',{exact:true}).fill(String(answer));
    await lab.getByRole('button',{name:'Submit',exact:true}).click();
    await expect.poll(async()=> (await get<{state:EngineState}>(student,'save')).state.learningEvidence?.find(e=>e.context==='math-lab')?.correct).toBe(true);
    const evidence=(await get<{state:EngineState}>(student,'save')).state.learningEvidence!.find(e=>e.context==='math-lab')!;
    expect(evidence).toMatchObject({skillId:'g8-s18',attempts:2,support:'explanation',firstAttemptCorrect:false,answerRevealed:true});
    expect((await get<CheckView>(student)).coverage.every(c=>c.outcome==='not-checked')).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    mkdirSync('docs/verification/middle-school',{recursive:true});
    await page.screenshot({path:'docs/verification/middle-school/math-lab-phone.png',fullPage:true});
    await lab.getByRole('button',{name:'Close math lab',exact:true}).click();await page.reload();
    expect((await get<{state:EngineState}>(student,'save')).state.learningEvidence!.find(e=>e.questionId===evidence.questionId)).toMatchObject({attempts:2,support:'explanation'});
  } finally {await teacher.dispose();await student.dispose();}
});

for (const viewport of [{width:390,height:844},{width:1366,height:768}]) {
  test(`math lab stays reachable with coordinates at ${viewport.width}px`, async ({page}) => {
    const {teacher,student,card,link}=await setup(8);
    try {
      await assignTopic(teacher,card.id,8,'Transformations');
      await page.setViewportSize(viewport);await page.goto(link);
      await page.getByRole('button',{name:'Open my math lab',exact:true}).click();
      const lab=page.getByRole('dialog',{name:'Middle school math lab',exact:true});
      const checkBounds=async()=>{
        const box=(await lab.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
        expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
        expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      };
      await checkBounds();
      await lab.getByText('Transformations',{exact:true}).click();
      await lab.getByRole('button',{name:'Translate a coordinate',exact:true}).click();
      await checkBounds();
      const plot=lab.getByRole('img',{name:/Coordinate plane/});
      await plot.scrollIntoViewIfNeeded();await expect(plot).toBeInViewport();
      mkdirSync('docs/verification/middle-school',{recursive:true});
      await page.screenshot({path:`docs/verification/middle-school/coordinate-${viewport.width}.png`});
      await lab.getByRole('button',{name:'Try three practice questions',exact:true}).click();
      await checkBounds();await expect(lab.getByLabel('Your answer',{exact:true})).toBeInViewport();
      await lab.getByRole('heading',{name:'Grade 8 Math Lab',exact:true}).scrollIntoViewIfNeeded();
      await expect(lab.getByRole('heading',{name:'Grade 8 Math Lab',exact:true})).toBeInViewport();
      await lab.getByRole('button',{name:'← Choose a skill',exact:true}).click();
      await lab.getByRole('button',{name:'Close math lab',exact:true}).click();await expect(lab).not.toBeVisible();
    } finally {await teacher.dispose();await student.dispose();}
  });
}

test('K, middle school and each high-school grade: server privacy, replay, class boundaries and unchanged pets', async () => {
  for (const grade of [0, 6, 7, 8, 9, 10, 11, 12]) {
    const { teacher, student, card } = await setup(grade);
    try {
      const before = await get<{ state: unknown }>(student, 'save');
      let check = await get<CheckView>(student);
      expect(check.due).toBe(true); expect(check.coverage).toHaveLength(grade>=6&&grade<=8?24:6);
      expect((await student.post('/api/pilot/quick-checks/policy', { data: { cadence: 'teacher' } })).status()).toBe(403);
      check = await post<CheckView>(student, 'quick-checks/start', { revision: check.revision });
      const questionId = check.round!.current!.id, oldRevision = check.revision;
      expect(check.round!.current!.skillId).toMatch(new RegExp(`^g${grade}-`));
      expect(check.round!.current).not.toHaveProperty('answer'); expect(check.round!.current).not.toHaveProperty('expected'); expect(check.round!.results).toEqual([]);
      expect((await student.post('/api/pilot/quick-checks/answer', { data: { revision: check.revision, questionId, answer: '3abc', notLearned: false } })).status()).toBe(400);
      check = await post<CheckView>(student, 'quick-checks/answer', { revision: check.revision, questionId, answer: '999999', notLearned: false });
      const replay = await post<CheckView>(student, 'quick-checks/answer', { revision: oldRevision, questionId, answer: '1', notLearned: false });
      expect(replay.revision).toBe(check.revision); expect(replay.round!.answered).toBe(1); expect(replay.round!.results).toEqual([]);
      for (let i = 0; i < 2; i++) check = await post<CheckView>(student, 'quick-checks/answer', { revision: check.revision, questionId: check.round!.current!.id, answer: '', notLearned: true });
      expect(check.due).toBe(false); expect(check.round!.results.map(r => r.outcome)).toEqual(['needs-practice', 'not-learned', 'not-learned']);
      expect((await get<{ state: unknown }>(student, 'save')).state).toEqual(before.state);
      const report = await get<TeacherChecks>(teacher); expect(report.students.find(s => s.id === card.id)!.check.round!.results).toHaveLength(3);
      const other = await api();
      try { await post(other, 'login', { role: 'teacher', code: teachers()[1].code }); expect((await other.post('/api/pilot/quick-checks/waive', { data: { studentId: card.id, revision: check.revision } })).status()).toBe(404); }
      finally { await other.dispose(); }
    } finally { await teacher.dispose(); await student.dispose(); }
  }
});

test('high-school student checks before a new game, resumes after reload, and teacher reviews on phone', async ({ page, browser }) => {
  const { teacher, student, card, link } = await setup(11);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(link); await expect(page.getByRole('navigation', { name: 'Student menus' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name: 'Games', exact: true }).click();
    const dash = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Egg Dash', exact: true }) });
    await dash.getByRole('button', { name: 'Start →', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'My skill check', exact: true }); await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Start three-question check' }).click(); await expect(dialog.getByText(/Question 1 of 3/)).toBeVisible();
    await dialog.getByLabel('Your check answer').fill('999999'); await dialog.getByRole('button', { name: 'Save answer & continue' }).click();
    await expect(dialog.getByText(/Question 2 of 3/)).toBeVisible(); const pending = (await get<CheckView>(student)).round!.current!.id;
    await page.reload(); await page.getByRole('button', { name: 'Continue skill check', exact: true }).click(); await expect(dialog.getByText(/Question 2 of 3/)).toBeVisible();
    expect((await get<CheckView>(student)).round!.current!.id).toBe(pending);
    await dialog.getByRole('button', { name: 'I don’t know this yet — skip' }).click(); await expect(dialog.getByText(/Question 3 of 3/)).toBeVisible();
    await dialog.getByRole('button', { name: 'I don’t know this yet — skip' }).click(); await expect(dialog.getByRole('heading', { name: 'Check complete — your games are ready.' })).toBeVisible();
    await dialog.getByText('Review this question and an example', { exact: true }).first().click(); await expect(dialog.locator('.skill-lesson').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('docs/verification/quick-check', { recursive: true }); await page.screenshot({ path: 'docs/verification/quick-check/high-school-results-phone.png', fullPage: true });
    await dialog.getByRole('button', { name: 'Back to my games' }).click();
    await page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name: 'Games', exact: true }).click();
    await dash.getByRole('button', { name: 'Start →', exact: true }).click();
    await expect(page.locator('.student-shell')).toHaveAttribute('data-view', 'activity'); await expect(dialog).not.toBeVisible();
    const teacherPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await teacherPage.goto(signInLink(baseURL, { role: 'teacher', code: teachers()[0].code, classCode: '' }));
      await teacherPage.getByRole('button', { name: 'Reports Skills & outcomes' }).click();
      const checks = teacherPage.getByRole('region', { name: 'Class skill checks' }); await expect(checks).toBeVisible();
      const learner = checks.locator('details').filter({ has: teacherPage.locator('summary').filter({ hasText: card.alias }) }).first();
      await learner.locator('summary').first().click(); await expect(learner).toContainText('Not learned yet');
      await learner.getByRole('button', { name: 'Request next check' }).click(); await expect.poll(async () => (await get<CheckView>(student)).due).toBe(true);
      await learner.getByRole('button', { name: 'Allow play without a check this week' }).click(); await expect.poll(async () => (await get<CheckView>(student)).due).toBe(false);
      await checks.getByLabel('Class check schedule').selectOption('teacher'); await expect(checks.getByRole('status')).toContainText('Check settings saved');
      expect(await teacherPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await teacherPage.screenshot({ path: 'docs/verification/quick-check/teacher-report-phone.png', fullPage: true });
    } finally { await teacherPage.close(); }
    expect(errors).toEqual([]);
  } finally { await teacher.dispose(); await student.dispose(); }
});

test('concurrent starts and settings changes preserve pending work and request a fresh level next', async () => {
  const { teacher, student, card } = await setup(9);
  try {
    await post(teacher, 'quick-checks/policy', { cadence: 'weekly' });
    const replies = await Promise.all([0, 1].map(() => student.post('/api/pilot/quick-checks/start', { data: { revision: 0 } })));
    expect(replies.map(r => r.status()).sort()).toEqual([200, 409]);
    let check = await get<CheckView>(student); const original = check.round!.current!;
    const roster = await get<{ students: { id: string; settingsVersion: number }[] }>(teacher, 'teacher/classroom');
    await post(teacher, `teacher/students/${card.id}/grade-recovery`, { grade: 10, topic: 'mixed', settingsVersion: roster.students.find(s => s.id === card.id)!.settingsVersion });
    check = await get<CheckView>(student); expect(check.round!.current).toEqual(original); expect(check.learning.grade).toBe(10);
    for (let i = 0; i < 3; i++) check = await post<CheckView>(student, 'quick-checks/answer', { revision: check.revision, questionId: check.round!.current!.id, answer: '', notLearned: true });
    expect(check.due).toBe(true); expect(check.coverage.every(s => s.outcome === 'not-checked')).toBe(true);
    check = await post<CheckView>(student, 'quick-checks/start', { revision: check.revision }); expect(check.round!.current!.skillId).toMatch(/^g10-/);
    expect((await student.post('/api/pilot/quick-checks/answer', { data: { revision: 0, questionId: check.round!.current!.id, answer: '1', notLearned: false } })).status()).toBe(409);
  } finally { await teacher.dispose(); await student.dispose(); }
});

test('grade 7: one check covers every game, skips become teacher gaps, and the chosen game opens by itself', async ({ page }) => {
  const { teacher, student, card, link } = await setup(7);
  try {
    await post(teacher, 'quick-checks/policy', { cadence: 'weekly' });
    expect((await student.get('/api/pilot/quick-checks?activity=unknown')).status()).toBe(400);
    await page.goto(link);
    await page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name: 'Games', exact: true }).click();
    const cafe = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nest Café', exact: true }) });
    await cafe.getByRole('button', { name: 'Start →', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'My skill check', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Start three-question check' }).click();
    for (let i = 1; i <= 3; i++) {
      await expect(dialog.getByText(`Question ${i} of 3`, { exact: false })).toBeVisible();
      await dialog.getByRole('button', { name: 'I don’t know this yet — skip' }).click();
    }
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.student-shell')).toHaveAttribute('data-view', 'activity');
    await expect(page.getByRole('button', { name: 'Plan & play →' })).toBeVisible();
    const done = await get<CheckView>(student);
    expect(done.round!.activity).toBe('cafe');
    expect(done.gaps).toHaveLength(3);
    for (const game of ['dash', 'guard', 'momentum', 'battle']) expect((await get<CheckView>(student, `quick-checks?activity=${game}`)).due).toBe(false);
    const report = await get<TeacherChecks>(teacher);
    const mine = report.students.find(s => s.id === card.id)!;
    expect(mine.check.gaps.map(g => g.skillId).sort()).toEqual(done.gaps.map(g => g.skillId).sort());
    await post(teacher, 'quick-checks/clear-gap', { studentId: card.id, skillId: done.gaps[0].skillId, revision: mine.check.revision });
    expect((await get<CheckView>(student)).gaps).toHaveLength(2);
    await page.getByRole('button', { name: '← Home' }).click();
    await page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name: 'Games', exact: true }).click();
    await cafe.getByRole('button', { name: 'Start →', exact: true }).click();
    await page.getByRole('button', { name: 'Plan & play →' }).click();
    await expect(dialog).not.toBeVisible(); // Lobby and actual round share the check.
    await page.getByRole('button', { name: /^Plan 2 servings/ }).click();
    const plan = page.getByRole('region', { name: 'Math game plan' });
    await expect(plan).toContainText('Percentages');
    const quantities = (await plan.textContent())!.match(/This uses (\d+) of your (\d+)/)!;
    const answer = Math.round(1000 * Number(quantities[1]) / Number(quantities[2])) / 10;
    await plan.getByLabel('Your answer', { exact: true }).fill('999');
    await plan.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(plan.getByRole('status')).toContainText('Your supplies are safe');
    await plan.getByLabel('Your answer', { exact: true }).fill(String(answer));
    await plan.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(plan).not.toBeVisible();
  } finally { await teacher.dispose(); await student.dispose(); }
});

test('grade 8: Number Merge reset cannot bypass a fresh classroom check', async ({ page }) => {
  const { teacher, student, card, link } = await setup(8);
  try {
    await post(teacher, 'quick-checks/policy', { cadence: 'play' });
    let check = await get<CheckView>(student);
    check = await post<CheckView>(student, 'quick-checks/start', { revision: check.revision, activity: 'number_merge' });
    for (let i = 0; i < 3; i++) check = await post<CheckView>(student, 'quick-checks/answer', { revision: check.revision, questionId: check.round!.current!.id, answer: '', notLearned: true });
    await page.goto(link);
    await page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name: 'Games', exact: true }).click();
    await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Number Merge', exact: true }) }).getByRole('button', { name: 'Start →', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reset Run', exact: true })).toBeVisible();
    await post(teacher, 'quick-checks/require', { studentId: card.id, revision: check.revision });
    await page.getByRole('button', { name: 'Reset Run', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'My skill check', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Start three-question check' }).click();
    expect((await get<CheckView>(student)).round!.current!.skillId).toMatch(/^g8-/);
  } finally { await teacher.dispose(); await student.dispose(); }
});
