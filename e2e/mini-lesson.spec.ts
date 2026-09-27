import { test, expect, type Page } from '@playwright/test';
import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { computeChecksum } from '../src/services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION } from '../src/services/persistence/saveMigrations';

async function seed(page: Page, grade = 8, topic = 'Linear equations', help = true) {
  const state = createInitialEngineState();
  state.screen = 'math'; state.showDailyRitual = false;
  state.player.lastLoginDate = new Date().toISOString().slice(0, 10);
  state.learning = { ...state.learning, grade, topic, learningHelp: help };
  await page.addInitScript(value => localStorage.setItem('vpet_save_auto', value), JSON.stringify({ state, version: CURRENT_SAVE_VERSION, timestamp: Date.now(), checksum: computeChecksum(state) }));
  await page.goto('/');
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
test('phone: a learner can finish with support, keep the original question, and earn no duplicate currency or mastery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await seed(page);
  await expect(page.getByRole('button', { name: 'Work through it together' }).first()).toBeVisible();
  const before = await saved(page);
  await page.getByRole('button', { name: 'Work through it together' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Linear equations' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8 && await dialog.getByRole('button', { name: 'Next step', exact: true }).count(); i++) await dialog.getByRole('button', { name: 'Next step', exact: true }).click();
  await dialog.getByRole('button', { name: 'Let’s try one together' }).click();
  await page.screenshot({ path: '/tmp/vpet-mini-lesson-phone.png', fullPage: true });
  await dialog.getByLabel('Your answer', { exact: true }).fill('-9999');
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Try fresh numbers' }).click();
  await dialog.getByLabel('Your answer', { exact: true }).fill('-9999');
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Finish my lesson' }).click();
  await expect(dialog.getByRole('heading', { name: 'You worked through the lesson' })).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Return to my activity' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).learningEvidence.filter((r: { context: string }) => r.context === 'mini-lesson-complete').length).toBe(2);
  const after = await saved(page);
  expect(after.practiceCheckpoint.problem.id).toBe(before.practiceCheckpoint.problem.id);
  expect(after.player.currencies).toEqual(before.player.currencies);
  expect(after.player.lifetimeMathCorrect).toBe(before.player.lifetimeMathCorrect);
  expect(after.learningEvidence.filter((r: { source: string }) => r.source === 'mini-lesson').every((r: { firstAttemptCorrect: boolean; support: string }) => !r.firstAttemptCorrect && r.support !== 'none')).toBe(true);
  expect(errors).toEqual([]);
});
test('Escape closes a lesson and restores focus; disabling help removes the entry', async ({ page }) => {
  await seed(page, 0, 'Counting');
  const button = page.getByRole('button', { name: 'Work through it together' }).first();
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Counting' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Counting' })).toHaveCount(0);
  await expect(button).toBeFocused();
  await seed(page, 12, 'Derivatives', false);
  await expect(page.getByRole('button', { name: 'Work through it together' })).toHaveCount(0);
});
