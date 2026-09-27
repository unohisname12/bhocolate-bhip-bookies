import { expect, test, type Page } from '@playwright/test';
import { seedLegacyEgg } from './legacy-egg';

async function preview(page: Page, species = 'ember_fox', stage = 'juvenile') {
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Preview companion').selectOption(species);
  await page.getByLabel('Preview growth stage').selectOption(stage);
  await page.locator('[data-preview-screen="pet_care"]').click();
  await expect(page.getByRole('region', { name: 'Care activities' })).toBeVisible();
}

test('cursor stays visible through care, tool tracking, completion and cancellation', async ({ page }) => {
  await page.goto('/');
  await preview(page);
  await page.getByRole('button', { name: 'Start Play', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const stage = dialog.getByTestId('care-stage');
  const cursorVisible = async () => {
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');
    expect(await stage.evaluate(el => getComputedStyle(el).cursor)).not.toBe('none');
  };
  await cursorVisible();
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  await stage.hover({ position: { x: 45, y: 40 } });
  const tool = stage.locator('.care-follow-tool');
  await expect(tool).toBeVisible();
  const first = await tool.evaluate(el => el.style.transform);
  await stage.hover({ position: { x: 95, y: 70 } });
  expect(await tool.evaluate(el => el.style.transform)).not.toBe(first);
  await expect(tool).toHaveCSS('pointer-events', 'none');
  await cursorVisible();
  await dialog.getByRole('button', { name: 'Catch the ball' }).click();
  await expect(stage.locator('.care-return-ball')).toHaveCount(1);
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13');
  await dialog.getByRole('button', { name: 'Close care activity' }).hover();
  await expect(tool).toBeHidden();
  for (let i = 1; i < 8; i++) await dialog.getByRole('button', { name: 'Catch the ball' }).click();
  await cursorVisible();
  await expect(tool).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Finish care' }).click();
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');
  await preview(page);
  await page.getByRole('button', { name: 'Start Brush', exact: true }).click();
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');
});

test('no-rush care stays open beyond the old timer; quick challenge still ends', async ({ page }) => {
  await page.goto('/'); await preview(page);
  await page.getByRole('button', { name: 'Start Pet & cuddle' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /No rush/ })).toHaveAttribute('aria-pressed', 'true');
  await page.clock.install();
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  await page.clock.fastForward(15_000);
  await expect(dialog.getByRole('button', { name: 'Pet the heart' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Finish care' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close care activity' }).click();
  await preview(page);
  await page.getByRole('button', { name: 'Start Pet & cuddle' }).click();
  await dialog.getByRole('button', { name: /Quick challenge/ }).click();
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  await page.clock.fastForward(7_000);
  await expect(dialog.getByRole('button', { name: 'Return to care' })).toBeVisible();
  await expect(dialog).toContainText('No care action completed yet');
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('phone bath bubbles are optional fun, not extra care credit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await preview(page);
  await page.getByRole('button', { name: 'Start Wash', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Wash patch 1' }).click();
  await expect(dialog.getByRole('button', { name: 'Wash patch 2' })).toBeFocused();
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await expect(dialog.getByRole('button', { name: 'Pop bubble 1' })).toBeVisible();
  await page.screenshot({ path: 'docs/verification/care-bubble-play-mobile.png', animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Pop bubble 1' }).click();
  await expect(dialog.getByText('Pop! 1 bubble', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await expect(dialog.getByRole('button', { name: 'Wash patch 2' })).toBeFocused();
  for (let i = 2; i <= 4; i++) {
    for (let j = 0; j < 4; j++) await dialog.getByRole('button', { name: `Wash patch ${i}` }).press('Enter');
  }
  await expect(dialog.getByRole('button', { name: 'Finish care' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Pop bubble/ })).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Pop bubble 4' }).click();
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(dialog.getByRole('button', { name: 'Finish care' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Finish care' }).click();
  await expect(dialog).toHaveCount(0);
});

test.describe('touchscreen care', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('tapping washes and pops bubbles without leaving a tool over the pet', async ({ page }) => {
    await page.goto('/'); await preview(page);
    await page.getByRole('button', { name: 'Start Wash', exact: true }).tap();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Let’s begin' }).tap();
    for (let i = 0; i < 4; i++) await dialog.getByRole('button', { name: 'Wash patch 1' }).tap();
    await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    await dialog.getByRole('button', { name: 'Pop bubble 1' }).tap();
    await expect(dialog.getByText('Pop! 1 bubble', { exact: true })).toBeVisible();
    await expect(dialog.locator('.care-follow-tool')).toBeHidden();
    await dialog.getByRole('button', { name: 'Close care activity' }).tap();
    await expect(dialog).toHaveCount(0);
  });
});

test('all four companions and all three stages have a visible care preview', async ({ page }) => {
  await page.goto('/');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const species of ['koala_sprite', 'ember_fox', 'moss_turtle', 'luna_owl']) for (const stage of ['baby', 'juvenile', 'adult']) {
    await preview(page, species, stage);
    await expect(page.getByTestId('care-stage')).toHaveAttribute('data-species', species);
    await expect(page.getByTestId('care-stage')).toHaveAttribute('data-stage', stage);
    await expect(page.locator('.care-companion [style*="background-image"]')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(6);
  }
  await page.screenshot({ path: 'docs/verification/care-lodge-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('phone: all six care activities are completable and respect reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const mode of ['Pet & cuddle', 'Wash', 'Brush', 'Comfort', 'Train', 'Play']) {
    await preview(page);
    await page.getByRole('button', { name: `Start ${mode}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('care-stage')).toHaveAttribute('data-species', 'ember_fox');
    await expect(dialog.getByRole('progressbar')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Let’s begin' }).click();
    if (mode === 'Wash') {
      for (let i = 1; i <= 4; i++) {
        const patch = dialog.getByRole('button', { name: `Wash patch ${i}` });
        for (let j = 0; j < 4; j++) await patch.click();
      }
    } else if (mode === 'Brush') {
      for (const direction of ['Right', 'Down', 'Left', 'Up', 'Right']) await dialog.press(`Arrow${direction}`);
    } else if (mode === 'Comfort') {
      const hold = dialog.getByRole('button', { name: /Hold to comfort/ });
      await hold.focus(); await page.keyboard.down('Space');
      await expect(dialog.getByRole('button', { name: 'Finish care' })).toBeVisible();
      await page.keyboard.up('Space');
    } else {
      const label = mode === 'Pet & cuddle' ? 'Pet the heart' : mode === 'Play' ? 'Catch the ball' : 'Touch the star';
      const count = mode === 'Pet & cuddle' ? 5 : mode === 'Play' ? 8 : 6;
      for (let i = 0; i < count; i++) await dialog.getByRole('button', { name: label }).click();
    }
    await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await expect(dialog.locator('.care-particle').first()).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (mode === 'Wash') await page.screenshot({ path: 'docs/verification/care-wash-mobile.png' });
    await dialog.getByRole('button', { name: 'Finish care' }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test('real care saves once; cancellation costs nothing and locked tools stay locked', async ({ page }) => {
  await seedLegacyEgg(page); await page.goto('/');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch my pet', exact: true }).click();
  const openCare = async () => page.getByRole('button', { name: 'Care', exact: true }).click();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
  await openCare();
  await expect(page.getByRole('button', { name: 'Start Wash', exact: true })).toBeDisabled();
  const before = await saved();
  await page.getByRole('button', { name: 'Start Pet & cuddle' }).click();
  await page.getByRole('button', { name: 'Close care activity' }).click();
  const cancelled = await saved();
  expect(cancelled.player.currencies.tokens).toBe(before.player.currencies.tokens);
  expect(cancelled.pet.bond).toBe(before.pet.bond);
  expect(cancelled.interaction.careGameActive).toBe(false);
  await openCare();
  await page.getByRole('button', { name: 'Start Pet & cuddle' }).click();
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Pet the heart' }).click();
  expect((await saved()).pet.bond).toBe(before.pet.bond);
  await page.getByRole('button', { name: 'Finish care' }).click();
  const after = await saved();
  expect(after.pet.bond).toBeGreaterThan(before.pet.bond);
  expect(after.interaction.usageCounts.pet).toBe(before.interaction.usageCounts.pet + 1);
  await page.reload();
  expect((await saved()).pet.bond).toBe(after.pet.bond);
});

test('feeding choices are keyboard buttons and the picnic fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await preview(page, 'luna_owl', 'adult');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Feed', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Feed Pet' });
  await expect(dialog.getByText('A treat for Luna')).toBeVisible();
  const snack = dialog.getByRole('button', { name: /^Feed .* for \d+ tokens$/ }).first();
  await snack.focus();
  await page.screenshot({ path: 'docs/verification/care-feeding-mobile.png' });
  await snack.press('Enter');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('phone quick-care tray clears DEV controls; releasing comfort stops progress and Escape cancels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await preview(page, 'luna_owl', 'adult');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Time together', exact: true }).click();
  await page.getByRole('button', { name: 'Touch: Comfort', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Let’s begin' }).click();
  const hold = dialog.getByRole('button', { name: 'Hold to comfort', exact: true });
  await hold.focus(); await page.keyboard.down('Space');
  await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(10);
  await page.keyboard.up('Space');
  const stopped = await dialog.getByRole('progressbar').getAttribute('aria-valuenow');
  await page.waitForTimeout(300);
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', stopped!);
  await page.screenshot({ path: 'docs/verification/care-comfort-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Time together', exact: true })).toBeVisible();
});
