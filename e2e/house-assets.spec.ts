import { test, expect } from '@playwright/test';

// Scene background assets
const SCENE_ASSETS = [
  'scene_outside.png',
  'scene_inside.png',
];

// Room icon assets still referenced by config
const ROOM_ICON_ASSETS = [
  'room_plant.png',
  'room_lamp.png',
];

test.describe('Game loads and renders', () => {
  test('app boots without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('home screen renders (pet or egg)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Asset files are accessible via HTTP', () => {
  for (const asset of SCENE_ASSETS) {
    test(`scene asset loads: ${asset}`, async ({ page }) => {
      const response = await page.goto(`/assets/generated/final/${asset}`);
      expect(response?.status()).toBe(200);
      const contentType = response?.headers()['content-type'] ?? '';
      expect(contentType).toContain('image/png');
    });
  }

  for (const asset of ROOM_ICON_ASSETS) {
    test(`room icon loads: ${asset}`, async ({ page }) => {
      const response = await page.goto(`/assets/generated/final/${asset}`);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Scene backgrounds render correctly', () => {
  test('check all image requests for 404s', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/assets/') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${url}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    if (failedRequests.length > 0) {
      console.log('FAILED ASSET REQUESTS:');
      failedRequests.forEach((r) => console.log('  ', r));
    }
    expect(failedRequests).toEqual([]);
  });

  test('navigate between 2 rooms and check for 404s', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/assets/') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${url}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // If on game scene, navigate between the 2 rooms
    const rightArrow = page.locator('button:has-text("›")');
    if (await rightArrow.count() > 0) {
      await rightArrow.click();
      await page.waitForTimeout(1000);
      await rightArrow.click();
      await page.waitForTimeout(1000);
    }

    if (failedRequests.length > 0) {
      console.log('FAILED ASSET REQUESTS DURING ROOM NAVIGATION:');
      failedRequests.forEach((r) => console.log('  ', r));
    }
    expect(failedRequests).toEqual([]);
  });
});
