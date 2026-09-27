import { test, expect, type Page } from '@playwright/test';
import { createTestEngineState } from '../src/engine/state/createTestEngineState';
import { computeChecksum } from '../src/services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION } from '../src/services/persistence/saveMigrations';
import type { FirstAdventure } from '../src/features/first-adventure/model';
async function seed(page: Page, adventure?: FirstAdventure) {
  const state = createTestEngineState();
  Object.assign(state, { mode: 'normal', devPreview: false, screen: 'home', egg: null, firstAdventure: adventure, test: { active: false, label: '' }, showDailyRitual: false, showOnboarding: false, notifications: [] });
  state.player.hasOnboarded = true; state.player.lastLoginDate = new Date().toISOString().slice(0, 10);
  state.learning = { ...state.learning, grade: 0, topic: 'Counting', timedWarmup: false };
  if (state.pet) state.pet.state = 'idle';
  await page.addInitScript(value => { if (!localStorage.getItem('vpet_save_auto')) localStorage.setItem('vpet_save_auto', value); }, JSON.stringify({ state, version: CURRENT_SAVE_VERSION, timestamp: Date.now(), checksum: computeChecksum(state) }));
  await page.goto('/');
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
test('first adventure: retry math, resume, claim once, place, bond and choose a battle boost', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); await seed(page);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: /YOUR NEXT GOAL/ }).click();
  await page.getByRole('button', { name: 'Start my adventure', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Adventure math progress' })).toContainText('0/3');
  await page.getByLabel('Your answer', { exact: true }).fill('-999');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('Not quite yet. Try again—you can do this.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Adventure math progress' })).toContainText('0/3');
  for (let i = 1; i <= 3; i++) {
    const input = page.getByLabel('Your answer', { exact: true }); await expect(input).toBeEnabled();
    const question = await page.getByRole('heading', { name: /^How many stars/ }).innerText();
    await input.fill(String((question.match(/★/g) ?? []).length));
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect.poll(async () => (await saved(page)).firstAdventure.solved).toBe(i);
    if (i === 1) { await page.reload(); await expect(page.getByRole('region', { name: 'Adventure math progress' })).toContainText('1/3'); }
    else if (i < 3) await expect(input).toBeEnabled();
  }
  await expect(page.getByRole('region', { name: 'Adventure math complete' })).toBeVisible();
  await page.getByRole('button', { name: 'See my reward' }).click();
  await page.screenshot({ path: 'docs/verification/first-adventure-reward.png', fullPage: true });
  await page.getByRole('button', { name: 'Open my reward' }).click();
  await expect.poll(async () => (await saved(page)).firstAdventure.phase).toBe('place');
  const boosts = (await saved(page)).prizes.boosts.defense;
  await page.reload(); await expect(page.getByRole('button', { name: 'Open my reward' })).toHaveCount(0);
  expect((await saved(page)).prizes.boosts.defense).toBe(boosts);
  await page.getByRole('button', { name: 'Decorate my home' }).click();
  await page.getByRole('button', { name: 'Place my Adventure Shelf' }).click();
  await page.getByRole('button', { name: 'Floor tile 1, 5', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Adventure goal' })).toContainText('Time together');
  await page.getByRole('button', { name: '♡ Live here', exact: true }).click();
  await page.getByRole('button', { name: /Cuddle.*A little love/ }).click();
  await expect(page.getByRole('region', { name: 'Adventure goal' })).toContainText('Try a battle');
  await page.getByRole('button', { name: 'View adventure' }).click();
  await page.getByRole('button', { name: /Use a defense boost/ }).click();
  await expect(page.getByRole('button', { name: /Defense boost selected/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Meet my opponent' }).click();
  await expect(page.getByRole('heading', { name: 'Pre-Battle Warmup' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect.poll(async () => (await saved(page)).battle.active).toBe(true);
  expect((await saved(page)).prizes.boosts.defense).toBe(boosts - 1);
  expect(errors).toEqual([]);
});
test('phone goal and reward route remain readable and fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await seed(page, { phase: 'reward', solved: 3 });
  const goal = page.getByRole('button', { name: /YOUR NEXT GOAL/ }); await expect(goal).toBeVisible();
  const goalBox = (await goal.boundingBox())!, sceneBox = (await page.locator('#vpet-scene').boundingBox())!;
  expect(goalBox.y).toBeGreaterThanOrEqual(sceneBox.y + sceneBox.height);
  await page.getByRole('button', { name: 'Build home', exact: true }).click();
  await page.getByRole('button', { name: '← Back to pet', exact: true }).click();
  await goal.click();
  await expect(page.getByRole('button', { name: 'Open my reward' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText('Day 1 streak!', { exact: true })).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator('.screen-reveal')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'docs/verification/first-adventure-phone.png', fullPage: true });
});
test('completed adventure points to the next permanent battle collectible', async ({ page }) => {
  await seed(page, { phase: 'complete', solved: 3 });
  await expect(page.getByRole('button', { name: /YOUR NEXT GOAL/ })).toContainText('Cozy Pet Bed');
  await page.getByRole('button', { name: /YOUR NEXT GOAL/ }).click();
  await expect(page.getByRole('progressbar', { name: 'Next battle collectible' })).toHaveAttribute('value', '0');
  await expect(page.getByRole('button', { name: 'Start my adventure', exact: true })).toHaveCount(0);
});
