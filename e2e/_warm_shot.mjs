import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();

// Clear any leftover state, then load fresh
await page.goto('http://localhost:5002/');
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Use Test Mode to seed a pet quickly, then exit back to home
const testModeBtn = page.locator('button', { hasText: /^Test Mode$/ }).first();
if (await testModeBtn.count() > 0) {
  await testModeBtn.click();
  await page.waitForTimeout(700);
  // dismiss any helper/tutorial popup blocking
  const skipBtn = page.locator('button', { hasText: /Skip all/i }).first();
  if (await skipBtn.count() > 0) {
    await skipBtn.click({ force: true });
    await page.waitForTimeout(300);
  }
  const exitBtn = page.locator('button', { hasText: /Exit Test Mode/i }).first();
  if (await exitBtn.count() > 0) {
    await exitBtn.click({ force: true });
    await page.waitForTimeout(700);
  }
}

// Dismiss any leftover tutorial overlay
const skipBtn2 = page.locator('button', { hasText: /Skip all/i }).first();
if (await skipBtn2.count() > 0) {
  await skipBtn2.click({ force: true });
  await page.waitForTimeout(300);
}

// Click the Warm HUD button
const warmBtn = page.locator('button[aria-label="Warm"]').first();
if (await warmBtn.count() > 0) {
  await warmBtn.click({ force: true });
  await page.waitForTimeout(700);
} else {
  console.log('No Warm button — forcing via localStorage');
  const existing = await page.evaluate(() => localStorage.getItem('vpet_save_auto'));
  if (existing) {
    const parsed = JSON.parse(existing);
    parsed.state.screen = 'warm_preview';
    parsed.state.mode = 'normal';
    await page.evaluate((s) => localStorage.setItem('vpet_save_auto', s), JSON.stringify(parsed));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  }
}

// Hide dev overlay
await page.evaluate(() => {
  const roots = document.querySelectorAll('[class*="devtools"], [class*="DevTools"]');
  roots.forEach((el) => { el.style.display = 'none'; });
  document.querySelectorAll('button, div').forEach((el) => {
    const t = (el.textContent || '').trim();
    if (t === 'DevTools (Ctrl+Shift+D)' || t === '?') el.style.display = 'none';
  });
});
await page.waitForTimeout(200);

await page.screenshot({ path: '/tmp/warm_preview.png', fullPage: false });
await page.screenshot({ path: '/tmp/warm_top.png', clip: { x: 0, y: 0, width: 375, height: 180 } });
await page.screenshot({ path: '/tmp/warm_bottom.png', clip: { x: 0, y: 632, width: 375, height: 180 } });
console.log('saved /tmp/warm_preview.png, warm_top.png, warm_bottom.png');
await browser.close();
