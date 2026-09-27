import { expect, test, type Page } from '@playwright/test';
import { seedLegacyEgg } from './legacy-egg';
import { classroomDiscovery } from './discovery-helpers';

async function hatch(page: Page) {
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Tap egg to warm it', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch my pet', exact: true }).click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
}

async function preview(page: Page, screen: string, species: string, stage: string) {
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Preview companion').selectOption(species);
  await page.getByLabel('Preview growth stage').selectOption(stage);
  await page.locator(`[data-preview-screen="${screen}"]`).click();
}

async function solveTrial(page: Page, count: number) {
  const trial = page.getByRole('region', { name: 'Evolution mini-game' });
  await expect(trial).toContainText('Grade 12');
  for (let i = 0; i < count; i++) {
    const prompt = await trial.locator('.growth-question').innerText();
    const match = prompt.match(/f\(x\) = (\d+)x².*f′\((\d+)\)/)!;
    expect(match).toBeTruthy();
    if (i === 0) {
      await trial.getByLabel('Evolution answer').fill('-99999');
      await trial.getByRole('button', { name: 'Light the next star' }).click();
      await expect(trial.getByRole('status')).toContainText('Try again');
      await trial.getByRole('button', { name: 'Explain the answer' }).click();
      await expect(trial.getByRole('region', { name: 'Worked explanation' })).toContainText('power rule');
      await expect(trial.locator('.growth-question')).toHaveText(prompt);
    }
    await trial.getByLabel('Evolution answer').fill(String(2 * Number(match[1]) * Number(match[2])));
    await trial.getByRole('button', { name: 'Light the next star' }).click();
  }
  return trial;
}

test('phone: hatch, daily care, adopt and switch preserve the original baby', async ({ page }) => {
  test.setTimeout(60_000);
  await seedLegacyEgg(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ember', exact: true }).click();
  await hatch(page);
  const originalId = await page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.pet.id);
  await page.getByRole('navigation', { name: 'Rooms' }).getByRole('button', { name: 'Growth', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play Growth Lanterns' })).toBeDisabled();
  const care = page.getByRole('region', { name: "Today's baby care" });
  for (const task of ['Feed', 'Clean', 'Play']) await care.getByRole('button', { name: new RegExp(task) }).click();
  await expect(page.locator('.growth-care-count')).toContainText('1 complete care days');
  await page.reload();
  await expect(page.locator('.growth-care-count')).toContainText('1 complete care days');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Discover my next egg', exact: true }).click();
  await classroomDiscovery(page, 'build');
  await expect(page.getByRole('heading', { name: 'Meet Moss!', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bring my egg to the nursery', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ember In nursery/ })).toHaveCount(0);
  await hatch(page);
  await page.getByRole('navigation', { name: 'Rooms' }).getByRole('button', { name: 'Growth', exact: true }).click();
  await page.getByRole('button', { name: 'Visit Ember', exact: true }).click();
  await page.reload();
  const result = await page.evaluate(() => {
    const { pet, companionRoster } = JSON.parse(localStorage.getItem('vpet_save_auto')!).state;
    return { id: pet.id, species: pet.speciesId, care: pet.growth.careDays[0].tasks.length, roster: companionRoster.map((p: {speciesId: string}) => p.speciesId) };
  });
  expect(result).toEqual({ id: originalId, species: 'ember_fox', care: 3, roster: ['moss_turtle'] });
});

test('two evolution mini-games use teacher settings and DEV never changes the real save', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('12');
  await page.getByLabel('Practice topic').selectOption('Derivatives');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const original = await page.evaluate(() => localStorage.getItem('vpet_save_auto'));
  await preview(page, 'growth', 'ember_fox', 'baby');
  await page.getByRole('button', { name: 'Play Growth Lanterns' }).click();
  const first = await solveTrial(page, 3);
  await expect(first).toContainText('Unlocked: Spark Rush');
  await expect(page.getByRole('region', { name: 'Active companion growth' })).toContainText('1/2 evolutions');
  await expect(page.getByRole('button', { name: 'Play Guardian Constellation' })).toBeDisabled();
  await preview(page, 'growth', 'ember_fox', 'juvenile');
  await page.getByRole('button', { name: 'Play Guardian Constellation' }).click();
  const second = await solveTrial(page, 5);
  await expect(second).toContainText('Unlocked: Phoenix Flare');
  await expect(page.getByRole('heading', { name: 'Fully evolved', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vpet_save_auto'))).toBe(original);
});

test('all companions expose both evolved powers in the battle menu', async ({ page }) => {
  await page.goto('/');
  const cases = [
    ['koala_sprite', 'ATTACK', 'Tide Pulse', 'Ocean Heart'],
    ['ember_fox', 'ATTACK', 'Spark Rush', 'Phoenix Flare'],
    ['moss_turtle', 'SKILL', 'Leaf Guard', 'Crystal Shelter'],
    ['luna_owl', 'SKILL', 'Moon Mending', 'Starlight Renewal'],
  ];
  for (const [species, menu, first, second] of cases) {
    await preview(page, 'battle', species, 'adult');
    await page.getByRole('button', { name: new RegExp(`^${menu}`) }).click();
    await expect(page.getByRole('button', { name: new RegExp(first) })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(second) })).toBeVisible();
    await page.getByRole('button', { name: '← Back', exact: true }).click();
  }
});
