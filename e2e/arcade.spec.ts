import { test, expect, type Page } from '@playwright/test';
import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { computeChecksum } from '../src/services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION } from '../src/services/persistence/saveMigrations';
async function seed(page: Page) {
  const state = createInitialEngineState();
  state.screen = 'arcade'; state.showDailyRitual = false; state.player.lastLoginDate = new Date().toISOString().slice(0, 10);
  state.learning = { ...state.learning, grade: 0, topic: 'Counting' };
  await page.addInitScript(value => { if (!localStorage.getItem('vpet_save_auto')) localStorage.setItem('vpet_save_auto', value); }, JSON.stringify({state, version: CURRENT_SAVE_VERSION, timestamp: Date.now(), checksum: computeChecksum(state)}));
  await page.goto('/');
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
test('egg-only practice, corrections, charges, cafe completion and persistent rewards', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await seed(page);
  await expect(page.getByRole('heading', { name: 'Nest Café', exact: true })).toBeVisible();
  await page.screenshot({path:'docs/verification/arcade-desktop.png',fullPage:true});
  await page.getByRole('button', { name: 'Practice & earn' }).click();
  await page.getByLabel('Your answer', {exact:true}).fill('-999');
  await page.getByRole('button', {name:'Submit',exact:true}).click();
  await expect(page.getByText('Not quite. Take your time, use the help, and try again.')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const question = await page.locator('.arc-question').innerText();
    await page.getByLabel('Your answer',{exact:true}).fill(String((question.match(/★/g) ?? []).length));
    await page.getByRole('button', {name:'Submit',exact:true}).click();
    await expect(page.getByText('Correct!', {exact:false})).toBeVisible();
    if (i < 2) await page.getByRole('button',{name:'Next question',exact:true}).click();
  }
  expect((await saved(page)).arcade.charges).toBe(1);
  await page.getByRole('button', {name:'Play now →'}).click();
  await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})}).getByRole('button').click();
  for (let n = 0; n < 9; n++) {
    const recipe = await page.locator('.arc-customers button[aria-pressed=true] small').innerText();
    for (const emoji of recipe.split(' + ')) {
      const name = emoji === '🍓' ? 'Berries' : emoji === '🍞' ? 'Bread' : 'Honey';
      const ingredient = page.getByRole('button',{name:new RegExp(name + ' \\(')});
      if (/\([01]\)/.test(await ingredient.innerText())) await ingredient.locator('..').getByRole('button',{name:'Restock +4'}).click();
      await ingredient.click();
    }
    await page.getByRole('button',{name:'Serve order'}).click();
  }
  await expect(page.getByRole('heading',{name:'Round complete!'})).toBeVisible();
  const stars = (await saved(page)).arcade.stars; expect(stars).toBeGreaterThan(0);
  await page.reload(); await expect(page.getByRole('heading',{name:'Round complete!'})).toBeVisible();
  expect((await saved(page)).arcade.stars).toBe(stars);
  await page.getByRole('button',{name:'Collect & choose a game'}).click();
  await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})}).getByRole('button').click();
  expect((await saved(page)).arcade.charges).toBe(0);
  expect(errors).toEqual([]);
});
test('phone controls, pause, race resume and defense build', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await seed(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Egg Dash',exact:true})}).getByRole('button').click();
  await page.getByRole('button',{name:'Lane 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Lane 1',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button',{name:'Lane 2',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Start run',exact:true}).click();
  await expect(page.locator('.arc-score')).not.toContainText('Road 0/60');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const score = await page.locator('.arc-score').innerText();
  await page.waitForTimeout(1100); expect(await page.locator('.arc-score').innerText()).toBe(score);
  await page.getByRole('button',{name:'Lane 3',exact:true}).click(); // checkpoint the run
  await page.reload(); await expect(page.getByRole('button',{name:'Resume run',exact:true})).toBeVisible();
  await page.screenshot({path:'docs/verification/arcade-phone.png',fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Finish round early'}).click();
  await page.getByRole('button',{name:'Collect & choose a game'}).click();
  await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Shellguard',exact:true})}).getByRole('button').click();
  for (let i = 1; i <= 3; i++) await page.getByRole('button',{name:new RegExp('Plot ' + i)}).click();
  await page.getByRole('button',{name:'Start wave'}).click();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start wave'})).toBeVisible({timeout:15000});
  await expect(page.locator('.arc-score')).toContainText('Wave 2/5');
});
