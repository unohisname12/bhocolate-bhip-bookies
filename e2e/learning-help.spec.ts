import { expect, test, type Page } from '@playwright/test';
import { seedLegacyEgg } from './legacy-egg';

async function configure(page: Page, grade: number, topic: string, enabled = true) {
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Grade level').selectOption(String(grade));
  await page.getByLabel('Practice topic').selectOption(topic);
  await page.getByLabel('Learning help prompts').setChecked(enabled);
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

async function practice(page: Page) {
  await page.getByRole('button', { name: 'Math Practice', exact: true }).click();
}

async function wrongAnswer(page: Page) {
  await page.getByLabel('Your answer', { exact: true }).fill('-99999');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
}

test('battle math keeps mistakes available and offers an explanation before retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await configure(page, 12, 'Derivatives');
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.locator('[data-preview-screen="battle"]').click();
  await page.getByRole('button', { name: 'Type Answer', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Battle math' });
  await panel.getByLabel('Battle answer').fill('-9999');
  await panel.getByRole('button', { name: 'Submit', exact: true }).click();
  await panel.getByRole('button', { name: 'Explain the answer' }).click();
  const steps = panel.getByRole('region', { name: 'Worked explanation' });
  await expect(steps).toContainText('power rule');
  const answer = (await steps.locator('strong').innerText()).replace('Answer: ', '');
  await expect(page.getByRole('button', { name: /^DEFEND/ })).toBeDisabled();
  await panel.getByRole('button', { name: 'I’m ready to try again' }).click();
  await panel.getByLabel('Battle answer').fill(answer);
  await panel.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Math Active', exact: true }).first()).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('timed warmup pauses for learning and allows a correct retry without losing the question', async ({ page }) => {
  await seedLegacyEgg(page);
  await page.goto('/');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch my pet', exact: true }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  await configure(page, 12, 'Derivatives');
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Timed battle warmup').check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: /Battle & Tracing/ }).click();
  await page.getByLabel('Warmup answer').fill('-9999');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText(/^Paused ·/)).toBeVisible();
  const paused = await page.getByText(/^Paused ·/).innerText();
  await page.getByRole('button', { name: 'Explain the answer' }).click();
  const steps = page.getByRole('region', { name: 'Worked explanation' });
  const answer = (await steps.locator('strong').innerText()).replace('Answer: ', '');
  await page.waitForTimeout(1200);
  await expect(page.getByText(/^Paused ·/)).toHaveText(paused);
  await page.getByRole('button', { name: 'I’m ready to try again' }).click();
  await page.getByLabel('Warmup answer').fill(answer);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByLabel('Warmup answer')).toHaveCount(0);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
  expect(state.battle.active).toBe(true);
  expect(state.battle.warmupAtkBonus).toBe(3);
});

for (const [grade, topic] of [[0, 'Counting'], [12, 'Derivatives']] as const) {
  test(`phone: grade ${grade} help offers steps, no automatic credit, and a successful retry`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await configure(page, grade, topic);
    await page.getByRole('button', { name: 'Skip quiz—use my activities instead', exact: true }).click();
    await practice(page);
    const question = await page.locator('h2').innerText();
    await wrongAnswer(page);
    const progress = () => page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('vpet_save_auto')!).state;
      return { correct: state.player.lifetimeMathCorrect, tokens: state.player.currencies.tokens };
    });
    const before = await progress();
    const help = page.getByRole('complementary', { name: 'Learning help' });
    await expect(help).toBeVisible();
    await expect(page.getByRole('region', { name: 'Worked explanation' })).toHaveCount(0);
    await help.getByRole('button', { name: 'Give me a hint' }).click();
    await expect(help.getByRole('status')).not.toBeEmpty();
    await help.getByRole('button', { name: 'Explain the answer' }).click();
    const explanation = page.getByRole('region', { name: 'Worked explanation' });
    await expect(explanation.locator('li').first()).toBeVisible();
    const answer = (await explanation.locator('strong').innerText()).replace('Answer: ', '');
    expect(await progress()).toEqual(before);
    await expect(page.locator('h2')).toHaveText(question);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (grade === 12) await page.screenshot({ path: 'docs/verification/learning-help-mobile.png', fullPage: true });
    await help.getByRole('button', { name: 'I’m ready to try again' }).click();
    await expect(help).toHaveCount(0);
    await expect(page.getByLabel('Your answer', { exact: true })).toBeFocused();
    await page.getByLabel('Your answer', { exact: true }).fill(answer);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect.poll(async () => (await progress()).correct).toBe(before.correct + 1);
  });
}

test('saved opt-out survives reload; learners keep separate preferences and retries still work', async ({ page }) => {
  await page.goto('/');
  await configure(page, 0, 'Counting', false);
  await page.reload();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Learning help prompts')).not.toBeChecked();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learners', exact: true }).click();
  await page.getByLabel('Learner nickname or class code').fill('Help on');
  await page.getByRole('button', { name: 'Create learner profile' }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Learning help prompts')).toBeChecked();
  await page.getByLabel('Choose learner').selectOption('default');
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Learning help prompts')).not.toBeChecked();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Skip quiz—use my activities instead', exact: true }).click();
  await practice(page);
  const question = await page.locator('h2').innerText();
  await wrongAnswer(page);
  await expect(page.getByRole('complementary', { name: 'Learning help' })).toHaveCount(0);
  await expect(page.locator('h2')).toHaveText(question);
  await expect(page.getByLabel('Your answer', { exact: true })).toBeEnabled();
});

test('Catch Math keeps the round and keyboard help does not accidentally throw', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await configure(page, 0, 'Counting');
  await page.getByRole('button', { name: 'Skip quiz—use my activities instead', exact: true }).click();
  await page.getByRole('button', { name: 'Catch Math', exact: true }).click();
  const question = await page.getByTestId('catch-prompt').innerText();
  const answer = (question.match(/★/g) ?? []).length;
  const radios = page.getByRole('radio');
  for (const radio of await radios.all()) {
    if (await radio.getAttribute('aria-label') !== String(answer)) { await radio.click(); break; }
  }
  await page.getByTestId('catch-throw').click();
  const help = page.getByRole('complementary', { name: 'Learning help' });
  await expect(help).toBeVisible();
  const explain = help.getByRole('button', { name: 'Explain the answer' });
  await explain.focus();
  await explain.press('Enter');
  await expect(page.getByRole('region', { name: 'Worked explanation' })).toContainText(`Answer: ${answer}`);
  await expect(page.getByTestId('catch-prompt')).toHaveText(question, { useInnerText: true });
  await help.getByRole('button', { name: 'I’m ready to try again' }).click();
  const selected = await page.getByRole('radio', { checked: true }).getAttribute('aria-label');
  await page.getByRole('radio', { checked: true }).press('ArrowRight');
  await expect(page.getByRole('radio', { checked: true })).not.toHaveAttribute('aria-label', selected!);
  await page.getByRole('radio', { name: String(answer), exact: true }).click();
  await page.getByTestId('catch-throw').click();
  await expect(help).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
