import { expect, test } from '@playwright/test';
import { classroomDiscovery } from './discovery-helpers';

test('fresh phone learner: quiz, real daily mission, retries, reload and no extra-day grinding', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-05T17:00:00Z'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your week. Your companion.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tap egg to warm it', exact: true })).toHaveCount(0);
  for (const choice of ['Follow a new trail', 'A treasure map', 'Design an obstacle path', 'A treasure hunt']) await page.getByRole('button', { name: choice, exact: true }).click();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('12');
  await page.getByLabel('Practice topic').selectOption('Derivatives');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: /Star Detectives/ }).click();
  const mission = page.getByRole('region', { name: 'Daily discovery mission' });
  await expect(mission).toContainText('Grade 12');
  for (let i = 0; i < 3; i++) {
    const question = await mission.locator('.growth-question').innerText();
    if (i === 1) {
      await page.reload();
      await expect(mission.locator('.growth-question')).toHaveText(question);
    }
    const match = question.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
    expect(match).toBeTruthy();
    await mission.getByLabel('Discovery answer').fill('-9999');
    await mission.getByRole('button', { name: 'Add an adventure piece' }).click();
    await expect(mission.getByRole('status')).toContainText('Try again!');
    await mission.getByRole('button', { name: 'Explain the answer' }).click();
    await expect(mission.getByRole('region', { name: 'Worked explanation' })).toContainText('power rule');
    await expect(mission.locator('.growth-question')).toHaveText(question);
    await mission.getByLabel('Discovery answer').fill(String(2 * Number(match[1]) * Number(match[2])));
    await mission.getByRole('button', { name: 'Add an adventure piece' }).click();
  }
  await expect(page.getByRole('region', { name: 'Discovery passport' })).toContainText('1 / 5 learning days');
  await expect(page.getByRole('button', { name: /Star Detectives/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Discovery passport' })).toContainText('1 / 5 learning days');
  await expect(page.getByRole('button', { name: 'Reveal my companion' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Math Practice', exact: true }).click();
  await page.getByRole('button', { name: '← Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your week. Your companion.' })).toBeVisible();
});

test('five classroom days match Luna, survive refresh, lock the egg and start a new baby care week', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await classroomDiscovery(page, 'wonder');
  await expect(page.getByRole('heading', { name: 'Meet Luna!', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Meet Luna!', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bring my egg to the nursery', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ember', exact: true })).toHaveCount(0);
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch my pet', exact: true }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  const result = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('vpet_save_auto')!).state;
    return { species: s.pet.speciesId, stage: s.pet.stage, care: s.pet.growth.careDays, status: s.eggDiscovery.status, stamps: s.eggDiscovery.stamps.length };
  });
  expect(result).toEqual({ species: 'luna_owl', stage: 'baby', care: [], status: 'claimed', stamps: 5 });
});

test('DEV previews both quiz and ready-to-reveal discovery without altering real answers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Follow a new trail', exact: true }).click();
  const original = await page.evaluate(() => localStorage.getItem('vpet_save_auto'));
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Preview companion').selectOption('moss_turtle');
  await page.locator('[data-preview-screen="discovery"]').click();
  await page.getByRole('button', { name: 'Reveal my companion' }).click();
  await expect(page.getByRole('heading', { name: 'Meet Moss!' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vpet_save_auto'))).toBe(original);
  await page.getByRole('button', { name: '← Exit preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pick a make-believe tool for today’s adventure.' })).toBeVisible();
});
