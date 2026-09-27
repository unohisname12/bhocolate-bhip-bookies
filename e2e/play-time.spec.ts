import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { signInLink } from '../src/pilot/signInLinks';
import type { PlayView, TeacherPlayTime } from '../src/features/play-time/model';
const baseURL = 'http://127.0.0.1:8829';
const teachers = () => JSON.parse(readFileSync('.pilot-private/test-teachers.json', 'utf8')) as { code: string }[];
const api = () => request.newContext({ baseURL, extraHTTPHeaders: { 'X-Pilot-Request': '1' } });
async function post<T>(client: APIRequestContext, path: string, data: unknown): Promise<T> { const r = await client.post(`/api/pilot/${path}`, { data }); expect(r.ok(), `${path}: HTTP ${r.status()}`).toBe(true); return r.json(); }
async function get<T>(client: APIRequestContext, path: string): Promise<T> { const r = await client.get(`/api/pilot/${path}`); expect(r.ok(), `${path}: HTTP ${r.status()}`).toBe(true); return r.json(); }
const nav = (page: import('@playwright/test').Page, name: string) => page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name, exact: true });
const game = (page: import('@playwright/test').Page, name: string) => page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Start →', exact: true });
const tries = (n: number, gap: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ questionId: `${prefix}-${i}`, at: Date.now() - 60000 + i * gap, correct: true }));

test('students earn game time with math; class time cannot be stockpiled; the teacher can pause games', async ({ page, browser }) => {
  const teacher = await api(), student = await api(), other = await api();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await post(teacher, 'login', { role: 'teacher', code: teachers()[0].code });
    await post(teacher, 'quick-checks/policy', { cadence: 'teacher' });
    await post(teacher, 'play-time/policy', { enabled: true, questionsPerRound: 5, minutesPerRound: 15, classCapMinutes: 15, homeCapMinutes: 45 });
    await post(teacher, 'play-time/class', { state: 'on' });
    const created = await post<{ classCode: string; cards: { id: string; code: string; alias: string }[] }>(teacher, 'teacher/students', { count: 2 });
    const [card, card2] = created.cards;
    await post(student, 'login', { role: 'student', code: card.code, classCode: created.classCode });
    await post(other, 'login', { role: 'student', code: card2.code, classCode: created.classCode });
    expect((await other.post('/api/pilot/play-time/policy', { data: { enabled: false } })).status()).toBe(405);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(signInLink(baseURL, { role: 'student', code: card.code, classCode: created.classCode }));
    await nav(page, 'Games').click(); await game(page, 'Egg Dash').click();
    const prompt = page.getByRole('dialog', { name: 'Earn game time first' });
    await expect(prompt).toBeVisible();
    await expect(page.locator('.student-shell')).not.toHaveAttribute('data-view', 'activity');
    mkdirSync('docs/verification/play-time', { recursive: true }); await page.screenshot({ path: 'docs/verification/play-time/earn-prompt-phone.png' });
    await prompt.getByRole('button', { name: 'Go to Math Practice' }).click();
    await expect(page.getByLabel('Your answer')).toBeVisible();
    // A wrong answer is a real try but earns nothing.
    await page.getByLabel('Your answer').fill('99999'); await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('button', { name: '← Home' }).click();
    await expect(page.getByRole('region', { name: 'My game time' })).toContainText('0/5 solved');
    expect((await post<PlayView>(other, 'play-time/sync', { attempts: tries(8, 5000, 'wrong').map(a => ({ ...a, correct: false })) })).progress).toBe(0);
    expect((await post<PlayView>(other, 'play-time/sync', { attempts: tries(8, 5000, 'copied').map(a => ({ ...a, revealed: true })) })).progress).toBe(0);

    // Stuck: the daily floor pays once, the teacher sees the skill and can grant time.
    let floor = await post<PlayView>(other, 'play-time/sync', { floor: true, stuck: [{ skillId: 'g4-s1', topic: 'Multiplication' }] });
    expect(floor).toMatchObject({ balanceMs: 5 * 60000, floorAvailable: false });
    floor = await post<PlayView>(other, 'play-time/sync', { floor: true });
    expect(floor.balanceMs).toBe(5 * 60000);
    let roster2 = await get<TeacherPlayTime>(teacher, 'play-time');
    expect(roster2.students.find(s => s.id === card2.id)!.stuck.map(x => x.skillId)).toEqual(['g4-s1']);
    await post(teacher, 'play-time/grant', { studentId: card2.id, minutes: 20 });
    roster2 = await get<TeacherPlayTime>(teacher, 'play-time');
    expect(roster2.students.find(s => s.id === card2.id)!).toMatchObject({ stuck: [], view: { balanceMs: 25 * 60000 } });
    expect((await post<PlayView>(other, 'play-time/sync', { attempts: tries(5, 5000, 'after-grant') })).balanceMs).toBe(25 * 60000);
    expect((await other.post('/api/pilot/play-time/grant', { data: { studentId: card2.id, minutes: 60 } })).status()).toBe(405);

    // Rapid-fire guessing earns at most one question; spaced real tries earn a round, capped at one round in class.
    expect((await post<PlayView>(student, 'play-time/sync', { attempts: tries(5, 500, 'fast') })).progress).toBe(1);
    let view = await post<PlayView>(student, 'play-time/sync', { attempts: tries(15, 3500, 'real') });
    // The fast batch left one solved question in progress; fifteen more complete three rounds, capped at one in class.
    expect(view).toMatchObject({ mode: 'class', balanceMs: 15 * 60000, canPlay: true });

    await page.reload(); await nav(page, 'Games').click(); await game(page, 'Egg Dash').click();
    await expect(page.locator('.student-shell')).toHaveAttribute('data-view', 'activity');
    await expect(page.locator('.play-time-chip')).toContainText(/Game time 1[45]:/);

    await post(teacher, 'play-time/math-only', { studentId: card.id, on: true });
    expect(await get<PlayView>(student, 'play-time')).toMatchObject({ mathOnly: true, canPlay: false, balanceMs: 15 * 60000 });
    const roster = await get<TeacherPlayTime>(teacher, 'play-time');
    expect(roster.students.find(s => s.id === card.id)!.mathOnlyUntil).toBeGreaterThan(Date.now());
    await post(teacher, 'play-time/math-only', { studentId: card.id, on: false });
    expect((await get<PlayView>(student, 'play-time')).canPlay).toBe(true);

    // Ending class wipes class minutes; home minutes bank to the home cap.
    await post(teacher, 'play-time/class', { state: 'off' });
    expect(await get<PlayView>(student, 'play-time')).toMatchObject({ mode: 'home', balanceMs: 0, canPlay: false });
    view = await post<PlayView>(student, 'play-time/sync', { attempts: tries(15, 3500, 'home') });
    expect(view).toMatchObject({ mode: 'home', balanceMs: 45 * 60000 });
    await post(teacher, 'play-time/class', { state: 'on' });
    expect((await get<PlayView>(student, 'play-time')).balanceMs).toBe(0);

    const teacherPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await teacherPage.goto(signInLink(baseURL, { role: 'teacher', code: teachers()[0].code, classCode: '' }));
      const panel = teacherPage.getByRole('region', { name: 'Game time' });
      await expect(panel).toContainText('class time');
      await panel.getByRole('button', { name: 'Math only right now (whole class)' }).click();
      await expect(panel.getByRole('status')).toContainText('Games paused for the whole class');
      expect((await get<PlayView>(other, 'play-time')).mathOnly).toBe(true);
      await panel.getByRole('button', { name: 'Resume games for everyone' }).click();
      await expect(panel.getByRole('status')).toContainText('Games are back on');
      expect(await teacherPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await teacherPage.screenshot({ path: 'docs/verification/play-time/teacher-panel-phone.png', fullPage: true });
    } finally { await teacherPage.close(); }
    expect(errors).toEqual([]);
  } finally {
    await post(teacher, 'play-time/class', { state: 'auto' }).catch(() => {});
    await teacher.dispose(); await student.dispose(); await other.dispose();
  }
});
