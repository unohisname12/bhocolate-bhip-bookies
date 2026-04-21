import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') console.log('BROWSER ERR:', m.text());
});

await page.goto('http://127.0.0.1:5002/');
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Seed pet via Test Mode
const testModeBtn = page.locator('button', { hasText: /^Test Mode$/ }).first();
if (await testModeBtn.count() > 0) {
  await testModeBtn.click();
  await page.waitForTimeout(500);
  const skipBtn = page.locator('button', { hasText: /Skip all/i }).first();
  if (await skipBtn.count() > 0) { await skipBtn.click({ force: true }); await page.waitForTimeout(200); }
  const exitBtn = page.locator('button', { hasText: /Exit Test Mode/i }).first();
  if (await exitBtn.count() > 0) { await exitBtn.click({ force: true }); await page.waitForTimeout(500); }
}
const skipBtn2 = page.locator('button', { hasText: /Skip all/i }).first();
if (await skipBtn2.count() > 0) { await skipBtn2.click({ force: true }); await page.waitForTimeout(200); }

// Route to Warm preview
const warmBtn = page.locator('button[aria-label="Warm"]').first();
if (await warmBtn.count() > 0) {
  await warmBtn.click({ force: true });
  await page.waitForTimeout(500);
} else {
  const existing = await page.evaluate(() => localStorage.getItem('vpet_save_auto'));
  if (existing) {
    const parsed = JSON.parse(existing);
    parsed.state.screen = 'warm_preview';
    parsed.state.mode = 'normal';
    await page.evaluate((s) => localStorage.setItem('vpet_save_auto', s), JSON.stringify(parsed));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  }
}

// Hide dev overlay
await page.evaluate(() => {
  document.querySelectorAll('[class*="devtools"], [class*="DevTools"]').forEach((el) => { el.style.display = 'none'; });
  document.querySelectorAll('button, div').forEach((el) => {
    const t = (el.textContent || '').trim();
    if (t === 'DevTools (Ctrl+Shift+D)' || t === '?') el.style.display = 'none';
  });
});
await page.waitForTimeout(300);

async function shot(name) {
  await page.screenshot({ path: `/tmp/warm_${name}.png`, fullPage: false });
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="warm-pet"]');
    const hints = Array.from(document.querySelectorAll('[data-testid^="interaction-hint-"]'))
      .map((h) => ({ id: h.getAttribute('data-testid'), active: h.getAttribute('data-active') }));
    if (!el) return null;
    return {
      state: el.getAttribute('data-pet-state'),
      iid: el.getAttribute('data-pet-iid'),
      xy: `${el.getAttribute('data-pet-x')},${el.getAttribute('data-pet-y')}`,
      facing: el.getAttribute('data-pet-facing'),
      hints,
    };
  });
  console.log(`${name}:`, JSON.stringify(info));
}

await shot('idle_home');

// Tap bookshelf (click on the object button)
await page.locator('[data-obj="bookshelf"]').click({ force: true });
await page.waitForTimeout(400);
await shot('walking_to_bookshelf');
await page.waitForTimeout(1800);
await shot('at_bookshelf');

// Tap fireplace
await page.locator('[data-obj="fireplace"]').click({ force: true });
await page.waitForTimeout(600);
await shot('walking_to_fireplace');
await page.waitForTimeout(1800);
await shot('at_fireplace');

// Tap plant (right side)
await page.locator('[data-obj="plant"]').click({ force: true });
await page.waitForTimeout(600);
await shot('walking_to_plant');
await page.waitForTimeout(1800);
await shot('at_plant');

// Tap a raw floor point in the middle-right
const viewport = { width: 375, height: 812 };
await page.mouse.click(viewport.width * 0.3, viewport.height * 0.86);
await page.waitForTimeout(1500);
await shot('free_walk');

// Turn on debug overlay via query prop (remount w/ debug=true)
await page.evaluate(() => {
  const existing = localStorage.getItem('vpet_save_auto');
  if (existing) {
    const parsed = JSON.parse(existing);
    parsed.state.warm_debug = true;
    localStorage.setItem('vpet_save_auto', JSON.stringify(parsed));
  }
});

console.log('done');
await browser.close();
