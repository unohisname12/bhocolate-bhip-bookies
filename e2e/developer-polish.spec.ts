import { expect, test } from '@playwright/test';
import { SCREEN_CATALOG } from '../src/devtools/screenCatalog';
import { seedLegacyEgg } from './legacy-egg';

test.beforeEach(async ({ page }) => { await seedLegacyEgg(page); });

test('new woodland art loads on both rooms, all game tiles, and the pose preview', async ({ page }) => {
  await page.goto('/');
  const jump = async (screen: string) => {
    await page.getByRole('button', { name: 'Open Dev Mode' }).click();
    await page.locator(`[data-preview-screen="${screen}"]`).click();
  };
  await jump('home');
  for (const [room, asset] of [['Home', 'home'], ['Yard', 'yard']]) {
    await page.getByRole('navigation', { name: 'Rooms' }).getByRole('button', { name: room, exact: true }).click();
    if (room === 'Home') { await expect(page.getByLabel('Your saved home')).toBeVisible(); } else {
      const backdrop = page.locator(`#vpet-scene img[src="/assets/woodland-v1/${asset}.png"]`);
      await expect(backdrop).toBeVisible();
      await expect.poll(() => backdrop.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 400)).toBe(true);
    }
  }
  await page.getByRole('navigation', { name: 'Rooms' }).getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Study desk — Math Practice', exact: true }).click();
  await expect(page.locator('[style*="pip-idle.png"]')).toBeVisible();
  await jump('play');
  const tiles = page.locator('.play-tile');
  await expect.poll(() => tiles.count()).toBeGreaterThanOrEqual(6);
  const illustratedTiles = page.locator('.play-tile img[src*="/woodland-v1/"]');
  await expect(illustratedTiles).toHaveCount(6);
  await expect.poll(() => illustratedTiles.evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await jump('test');
  const preview = page.getByRole('region', { name: 'Woodland art preview' });
  await preview.getByRole('button', { name: 'Walking', exact: true }).click();
  const sprite = preview.locator('[style*="pip-walking.png"]');
  await expect(sprite).toBeVisible();
  await preview.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const frame = await sprite.evaluate(el => (el as HTMLElement).style.backgroundPosition);
  await page.waitForTimeout(350);
  expect(await sprite.evaluate(el => (el as HTMLElement).style.backgroundPosition)).toBe(frame);
});

test('DEV reaches every screen with valid fixtures and leaves the real save intact', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap egg to warm it' }).click();
  const original = await page.evaluate(() => localStorage.getItem('vpet_save_auto'));
  for (const screen of Object.keys(SCREEN_CATALOG)) {
    await page.getByRole('button', { name: 'Open Dev Mode' }).click();
    await page.locator(`[data-preview-screen="${screen}"]`).click();
    await expect(page.getByRole('button', { name: '← Exit preview', exact: true })).toBeVisible();
    await expect(page.getByText('Loading your activity…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Something went wrong.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('No event found.', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vpet_save_auto'))).toBe(original);
    // Feeding is a focused dialog above DEV controls; leave it as a user would.
    if (screen === 'feeding') {
      await expect(page.getByRole('dialog', { name: 'Feed Pet' })).toBeVisible();
      await page.getByRole('button', { name: 'Close Feed Pet', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Feed Pet' })).toHaveCount(0);
    }
  }
  await page.getByRole('button', { name: '← Exit preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tap egg to warm it' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Tap egg to warm it' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('phone: developer search, pet greeting, real walking sheets and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Find a screen').fill('Pet home');
  await expect(page.locator('[data-preview-screen]')).toHaveCount(1);
  await page.locator('[data-preview-screen="home"]').click();
  await expect(page.locator('#vpet-scene')).toBeVisible();
  // The home mind may investigate a nearby object before choosing a walking route.
  await expect.poll(() => page.locator('#vpet-scene [data-pet-animation]').evaluateAll(elements => elements.some(el => el.getAttribute('data-pet-animation') === 'walking')), { timeout: 20000 }).toBe(true);
  await page.getByRole('button', { name: 'Say hello', exact: true }).click();
  await expect(page.locator('.pet-greeting span').first()).toBeVisible();
  await expect(page.locator('.world-mote')).toHaveCount(12);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.world-mote').first()).toBeHidden();
  await expect(page.getByRole('button', { name: 'Say hello', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Find a screen').fill('Catch Math');
  await page.locator('[data-preview-screen="catch_math"]').click();
  await expect(page.getByTestId('catch-prompt')).toBeVisible();
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.getByLabel('Find a screen').fill('');
  await page.getByLabel('Find a screen').pressSequentially('Adventure');
  await expect(page.getByLabel('Find a screen')).toHaveValue('Adventure');
});

test('phone: legacy Jump Screen prepares activities and DEV escapes dialogs without changing the save', async ({page}) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/?dev=1');
  await page.getByRole('button',{name:'Nurture egg',exact:true}).click();
  const original=await page.evaluate(()=>localStorage.getItem('vpet_save_auto'));
  const jump=async(screen:string)=>{
    await page.getByRole('button',{name:'DevTools (Ctrl+Shift+D)',exact:true}).click();
    await expect(page.getByLabel('Jump Screen',{exact:true}).locator('option')).toHaveCount(Object.keys(SCREEN_CATALOG).length);
    await page.getByLabel('Jump Screen',{exact:true}).selectOption(screen);
    await expect(page.getByLabel('Jump Screen',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open Dev Mode'})).toHaveAttribute('data-game-screen',screen);
  };
  await jump('test');
  await jump('battle');
  await expect(page.getByRole('button',{name:'ATTACK Deal Damage',exact:true})).toBeVisible();
  await jump('home_builder');
  await expect(page.getByRole('main',{name:'Home Base'})).toBeVisible();
  await expect(page.locator('.hb-room-links button')).toHaveCount(4);
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await page.getByLabel('Find a screen').fill('feeding');
  await page.locator('[data-preview-screen="feeding"]').click();
  await expect(page.getByRole('dialog',{name:'Feed Pet'})).toBeVisible();
  // The DEV launcher is reachable without dismissing the feeding dialog first.
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await expect(page.locator('[data-preview-screen]')).toHaveCount(Object.keys(SCREEN_CATALOG).length);
  await page.locator('[data-preview-screen="run_map"]').click();
  await expect(page.getByRole('dialog',{name:'Feed Pet'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Open Dev Mode'})).toHaveAttribute('data-game-screen','run_map');
  expect(await page.evaluate(()=>localStorage.getItem('vpet_save_auto'))).toBe(original);
  await page.getByRole('button',{name:'← Exit preview',exact:true}).click();
  await expect(page.getByRole('button',{name:'Nurture egg',exact:true})).toBeVisible();
});
