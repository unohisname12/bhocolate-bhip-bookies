import { expect, test, type Page } from '@playwright/test';
import { seedLegacyEgg } from './legacy-egg';

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
}
async function setDerivatives(page: Page) {
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('12');
  await page.getByLabel('Practice topic').selectOption('Derivatives');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}
async function answerPlan(page: Page) {
  const state = await saved(page);
  const problem = state.woodland.problems[state.woodland.index];
  await page.getByLabel('Bridge answer', { exact: true }).fill(String(problem.answer));
  await page.getByRole('button', { name: 'Add a bridge piece', exact: true }).click();
  await expect.poll(async () => (await saved(page)).woodland.index).toBe(state.woodland.index + 1);
}

test('phone: complete a saved bridge chapter with support, catches, guide care and a permanent decoration', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await setDerivatives(page);
  await page.getByRole('button', { name: /Join the bridge adventure/ }).click();
  await page.getByRole('button', { name: 'Start the bridge adventure', exact: true }).click();
  await page.getByLabel('Bridge answer', { exact: true }).fill('-9999');
  await page.getByRole('button', { name: 'Add a bridge piece' }).click();
  await page.getByRole('button', { name: 'Explain the answer', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Worked explanation' })).toContainText('power rule');
  await answerPlan(page);
  const question = (await saved(page)).woodland.problems[1].question;
  await page.reload();
  await expect(page.locator('label[for="bridge-answer"]')).toHaveText(question);
  await answerPlan(page);
  await answerPlan(page);
  await page.getByRole('button', { name: /Deliver with Catch Math/ }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('catch-throw')).toBeEnabled();
    const prompt = await page.getByTestId('catch-prompt').innerText();
    const match = prompt.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
    expect(match).toBeTruthy();
    await page.getByRole('radio', { name: String(2 * Number(match[1]) * Number(match[2])), exact: true }).click();
    await page.getByTestId('catch-throw').click();
    await expect.poll(async () => (await saved(page)).woodland.deliveries.length).toBe(i + 1);
    if (i === 0) {
      await page.reload();
      await expect(page.getByRole('status').filter({ hasText: 'Bridge mission' })).toContainText('1/3 supply deliveries');
      const banner = await page.locator('.woodland-return').boundingBox();
      const back = await page.getByTestId('catch-back').boundingBox();
      expect(back!.y).toBeGreaterThanOrEqual(banner!.y + banner!.height);
      await page.screenshot({ path: 'docs/verification/woodland-catch-mobile.png' });
    }
  }
  await expect(page.getByRole('img', { name: 'A repaired bridge connects the woodland paths' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Give your club guide a high-five/ }).click();
  const tokens = (await saved(page)).player.currencies.tokens;
  await page.getByRole('button', { name: /Meadow flowers/ }).click();
  await expect(page.getByRole('heading', { name: 'A bridge. A memory. A good place to stop.' })).toBeVisible();
  expect((await saved(page)).player.currencies.tokens).toBe(tokens + 30);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A bridge. A memory. A good place to stop.' })).toBeVisible();
  const state = await saved(page);
  expect(state.woodland).toMatchObject({ phase: 'complete', decoration: 'flowers' });
  expect(state.eggDiscovery.stamps).toHaveLength(1);
  expect(state.learningEvidence).toHaveLength(6);
  expect(state.learningEvidence[0]).toMatchObject({ attempts: 2, support: 'explanation', firstAttemptCorrect: false });
  expect(state.pet).toBeNull();
  await expect(page.getByRole('button', { name: /Meadow flowers/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/verification/woodland-complete-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  const report = page.getByRole('region', { name: 'Learning evidence report' });
  await expect(report).toContainText('Grade 12 · Derivatives');
  await expect(report.getByRole('row').last()).toContainText('6');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export practice CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('auralith-practice-report.csv');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'All mini-games', exact: true }).click();
  await expect.poll(() => page.locator('.play-tile').count()).toBeGreaterThanOrEqual(6);
  await expect(page.getByRole('button', { name: /Pet Care/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Battle & Tracing/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Math Practice/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('school care is free, saved, teacher-switchable, and does not skip the baby week', async ({ page }) => {
  await seedLegacyEgg(page);
  await page.goto('/');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: /Pet Care/ }).click();
  const before = await saved(page);
  for (const name of ['Free snack', 'Free clean', 'Free play']) await page.getByRole('button', { name, exact: true }).click();
  await expect.poll(async () => (await saved(page)).pet.growth.careDays[0].tasks.length).toBe(3);
  const after = await saved(page);
  expect(after.player.currencies.tokens).toBeGreaterThanOrEqual(before.player.currencies.tokens);
  expect(after.pet.stage).toBe('baby');
  expect(after.pet.progression.level).toBe(3);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Free essential care' })).toBeVisible();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByLabel('School-safe care', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Free essential care' })).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).learning.schoolSafe).toBe(false);
});

test('desktop: owned companion celebrates the repair through the actual care mini-game', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedLegacyEgg(page);
  await page.goto('/');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  await setDerivatives(page);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: /Repair the Woodland Bridge/ }).click();
  await page.getByRole('button', { name: 'Start the bridge adventure' }).click();
  for (let i = 0; i < 3; i++) await answerPlan(page);
  await page.getByRole('button', { name: /Build with Number Merge/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Bridge mission' })).toContainText('Build a winning board');
  await page.getByRole('button', { name: 'Back to bridge', exact: true }).click();
  await page.getByRole('button', { name: /Deliver with Catch Math/ }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('catch-throw')).toBeEnabled();
    const prompt = await page.getByTestId('catch-prompt').innerText();
    const match = prompt.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
    await page.getByRole('radio', { name: String(2 * Number(match[1]) * Number(match[2])), exact: true }).click();
    await page.getByTestId('catch-throw').click();
    await expect.poll(async () => (await saved(page)).woodland.deliveries.length).toBe(i + 1);
  }
  await page.getByRole('button', { name: /^Celebrate with / }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  for (let i = 0; i < 5; i++) await dialog.getByRole('button', { name: 'Pet the heart' }).click();
  expect((await saved(page)).woodland.phase).toBe('care');
  await dialog.getByRole('button', { name: 'Finish care' }).click();
  await page.getByRole('button', { name: /Golden lanterns/ }).click();
  await expect(page.getByRole('heading', { name: 'A bridge. A memory. A good place to stop.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: 'A repaired bridge connects the woodland paths' })).toBeVisible();
  await page.screenshot({ path: 'docs/verification/woodland-complete-desktop.png', fullPage: true, animations: 'disabled' });
  const state = await saved(page);
  expect(state.woodland.decoration).toBe('lanterns');
  expect(state.pet.growth.careDays[0].tasks).toContain('play');
  expect(state.interaction.usageCounts.pet).toBe(1);
});
