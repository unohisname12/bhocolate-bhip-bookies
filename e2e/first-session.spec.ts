import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { signInLink } from '../src/pilot/signInLinks';
const baseURL = 'http://127.0.0.1:8831';
const teachers = () => JSON.parse(readFileSync('.pilot-private/test-teachers.json', 'utf8')) as { code: string }[];
async function post<T>(client: APIRequestContext, path: string, data: unknown): Promise<T> { const r = await client.post(`/api/pilot/${path}`, { data }); expect(r.ok(), `${path}: HTTP ${r.status()}`).toBe(true); return r.json(); }
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Student menus' }).getByRole('button', { name, exact: true });
// Retired or deep-layer money words a brand-new student should never meet.
const HIDDEN_MONEY = /\b(medals?|arcade stars|play charges?|coins?|shards?|MP|math points|season points)\b/i;

test('a brand-new student meets one money, four games and a clear next step; a new teacher meets one page', async ({ page, browser }) => {
  const teacher = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Pilot-Request': '1' } });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await post(teacher, 'login', { role: 'teacher', code: teachers()[0].code });
    await post(teacher, 'quick-checks/policy', { cadence: 'teacher' });
    const created = await post<{ classCode: string; cards: { id: string; code: string }[] }>(teacher, 'teacher/students', { count: 1 });
    const card = created.cards[0];

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(signInLink(baseURL, { role: 'student', code: card.code, classCode: created.classCode }));
    await expect(nav(page, 'Home')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(HIDDEN_MONEY);

    await nav(page, 'Games').click();
    const cards = page.locator('.student-grid article h2');
    await expect(cards).toHaveText(['Math Practice', 'Catch Math', 'Number Merge', 'Egg Dash']);
    await expect(page.getByText(/More games are on the way: Nest Café and Shellguard open after your second day/)).toBeVisible();
    await expect(page.locator('main')).not.toContainText(HIDDEN_MONEY);

    await nav(page, 'Rewards').click();
    await expect(page.locator('.student-grid .student-card strong')).toHaveText(['Shop', 'Arcade decorations']);
    await expect(page.getByRole('region', { name: 'Prize Studio' })).toHaveCount(0);

    await nav(page, 'Together').click();
    await expect(page.getByText('Pet Hunt, class rivals and pet duels open when your egg hatches.')).toBeVisible();

    await nav(page, 'Games').click();
    await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Egg Dash', exact: true }) }).getByRole('button', { name: 'Start →', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Earn game time first' })).toBeVisible();
    mkdirSync('docs/verification/first-session', { recursive: true });
    await page.screenshot({ path: 'docs/verification/first-session/student-first-game.png' });

    const teacherPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await teacherPage.goto(signInLink(baseURL, { role: 'teacher', code: teachers()[0].code, classCode: '' }));
      const menus = teacherPage.getByRole('navigation', { name: 'Classroom menus' });
      await expect(menus.getByRole('button')).toHaveCount(2);
      await expect(menus.getByRole('button', { name: /Today/ })).toHaveAttribute('aria-pressed', 'true');
      await expect(teacherPage.getByRole('region', { name: 'Set up your class' })).toBeVisible();
      for (const region of ['Game time', 'Skill gaps today', 'Playing now']) await expect(teacherPage.getByRole('region', { name: region })).toBeVisible();
      await expect(teacherPage.getByText('Rules and school hours')).toHaveCount(0);
      await teacherPage.screenshot({ path: 'docs/verification/first-session/teacher-today.png', fullPage: true });
      await menus.getByRole('button', { name: /More tools/ }).click();
      await expect(menus.getByRole('button')).toHaveCount(10);
    } finally { await teacherPage.close(); }
    expect(errors).toEqual([]);
  } finally { await teacher.dispose(); }
});
