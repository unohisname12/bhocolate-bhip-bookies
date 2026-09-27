import { expect, test, type Page } from '@playwright/test';
import { seedLegacyEgg } from './legacy-egg';

async function hatch(page: Page) {
  await seedLegacyEgg(page);
  await page.goto('/');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  await page.getByRole('button', { name: 'Hatch my pet' }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
}

async function setGrade(page: Page, grade: string, topic: string) {
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Grade level').selectOption(grade);
  await page.getByLabel('Practice topic').selectOption(topic);
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status')).toContainText('Saved for');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

async function playMenu(page: Page) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Play', exact: true }).click();
}

test('phone: teacher settings, pet, and solved progress survive reload; Back stays clickable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await hatch(page);
  await expect(page.getByRole('button', { name: 'Test Mode', exact: true })).toHaveCount(0);
  await setGrade(page, '12', 'Derivatives');
  await page.reload();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  await playMenu(page);
  await page.getByRole('button', { name: /Math Practice/ }).click();
  const prompt = await page.locator('h2').innerText();
  const match = prompt.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
  expect(match).toBeTruthy();
  await page.getByLabel('Your answer').fill(String(2 * Number(match[1]) * Number(match[2])));
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.player.lifetimeMathCorrect)).toBe(1);
  await page.getByRole('button', { name: '← Back', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Grade level')).toHaveValue('12');
  await expect(page.getByLabel('Practice topic')).toHaveValue('Derivatives');
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Class tools', exact: true }).click();
  await page.getByText('About learning & device saves', {exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Lifetime correct: 1');
  expect(errors).toEqual([]);
});

test('Catch Math uses the teacher topic and gives one reward per throw', async ({ page }) => {
  await hatch(page);
  await setGrade(page, '12', 'Derivatives');
  await playMenu(page);
  await page.getByRole('button', { name: /Catch Math/ }).click();
  const prompt = await page.getByTestId('catch-prompt').innerText();
  const match = prompt.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
  const answer = String(2 * Number(match[1]) * Number(match[2]));
  await page.getByRole('radio', { name: answer, exact: true }).click();
  await page.getByTestId('catch-throw').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.player.lifetimeMathCorrect)).toBe(1);
  await expect(page.getByTestId('catch-throw')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.player.lifetimeMathCorrect)).toBe(1);
});

test('battle uses the player pet; tracing asks for the answer before showing a guide', async ({ page }) => {
  await hatch(page);
  await setGrade(page, '12', 'Derivatives');
  await playMenu(page);
  await page.getByRole('button', { name: /Battle & Tracing/ }).click();
  await expect(page.getByText('No timer', { exact: true })).toBeVisible();
  await expect(page.getByText(/If f\(x\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  const species = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('vpet_save_auto')!).state;
    return [state.pet.speciesId, state.battle.playerPet.speciesId, state.battle.untrained];
  });
  expect(species[0]).toBe(species[1]);
  expect(species[2]).toBe(false);
  await page.getByRole('button', { name: 'Trace Digit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Solve before tracing' });
  await expect(dialog).toBeVisible();
  const match = (await dialog.innerText()).match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
  await dialog.getByLabel('Your answer').fill('-9999');
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Explain the answer' }).click();
  await expect(dialog.getByRole('region', { name: 'Worked explanation' })).toContainText('power rule');
  await dialog.getByLabel('Your answer').fill(String(2 * Number(match[1]) * Number(match[2])));
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText(/Correct!.*Trace your answer/)).toBeVisible();
});

for (const [name, marker] of [['Momentum', 'momentum'], ['Number Merge', 'number_merge'], ['Pet Care', 'pet_care']] as const) {
  test(`${name} stays accessible from Play`, async ({ page }) => {
    await hatch(page);
    await playMenu(page);
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.screen)).toBe(marker);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
}
