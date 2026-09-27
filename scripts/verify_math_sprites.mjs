/**
 * Playwright check: the catch-math screen renders digit/operator PNGs from
 * /assets/generated/new/math-throw/... (instead of CSS text labels).
 *
 * Flow:
 *   1. Seed localStorage vpet_dev_mode=1 so dev overlay appears
 *   2. Seed a legacy save (just enough to skip incubation → home)
 *   3. Use state inspector to jump to 'catch_math'
 *   4. Assert at least one <img src=".../math-throw/digits/...png"> or
 *      operators/...png is visible in the choices row
 *   5. Screenshot the whole screen
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'public/assets/generated/new/math-throw/_playwright_check');
mkdirSync(OUT_DIR, { recursive: true });

const URL = process.env.BASE || 'http://localhost:5173/';

const now = new Date().toISOString();
const legacySave = {
  pet: {
    id: 'test_pet',
    ownerId: 'tester',
    name: 'TestPet',
    speciesId: 'blue_koala',
    type: 'blue_koala',
    stage: 'juvenile',
    mood: 'calm',
    state: 'idle',
    needs: { hunger: 80, happiness: 80, health: 100, cleanliness: 80 },
    stats: { strength: 10, speed: 10, defense: 10 },
    bond: 50,
    progression: { level: 3, xp: 0, evolutionFlags: [] },
    trust: 50, discipline: 50, groomingScore: 80, stress: 10,
    timestamps: {
      createdAt: now, lastInteraction: now,
      lastFedAt: now, lastCleanedAt: now, lastPlayedAt: now, lastHealedAt: now,
    },
  },
  player: { currencies: { tokens: 100, coins: 50 } },
  egg: null,
};

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM ||
  `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`;

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[page err]', msg.text());
  });

  // First load just to get localStorage access
  await page.goto(URL);
  await page.evaluate(
    ([devKey, saveKey, saveJson]) => {
      localStorage.setItem(devKey, '1');
      localStorage.setItem(saveKey, saveJson);
    },
    ['vpet_dev_mode', 'vpet_gamestate_v1', JSON.stringify(legacySave)]
  );
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Try to click the test-mode button that jumps to catch_math — otherwise
  // fall back to setting screen via the state inspector toggle. First, find
  // any button labeled to jump to catch-math or math mini-game.
  const tookShortcut = await page.evaluate(() => {
    // Look for any button with text hinting at catch math
    const btns = Array.from(document.querySelectorAll('button'));
    const cand = btns.find((b) => /catch.?math|math.throw/i.test(b.textContent || ''));
    if (cand) {
      cand.click();
      return true;
    }
    return false;
  });

  if (!tookShortcut) {
    // Open state inspector (if dev overlay present)
    await page.evaluate(() => {
      const tb = Array.from(document.querySelectorAll('button')).find((b) =>
        /state|inspect|dev/i.test(b.textContent || '')
      );
      if (tb) tb.click();
    });
    await page.waitForTimeout(300);
    // Click screen=catch_math button in inspector
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cm = btns.find((b) => (b.textContent || '').trim() === 'catch_math');
      if (cm) cm.click();
    });
  }

  await page.waitForTimeout(1500);

  // Assert the catch-prompt testid appears (meaning CatchNumberScreen mounted)
  const hasCatch = await page.locator('[data-testid="catch-prompt"]').count();
  console.log(`catch-prompt visible: ${hasCatch > 0}`);

  if (hasCatch === 0) {
    // Dump what's on screen for debugging
    const bodyText = await page.locator('body').innerText();
    console.log('=== body text (truncated) ===');
    console.log(bodyText.slice(0, 500));
    const dbg = await page.screenshot({ fullPage: true });
    writeFileSync(resolve(OUT_DIR, 'debug_not_catchmath.png'), dbg);
  }

  // Count sprite <img> tags pointing at math-throw assets
  const imgs = await page.$$eval('[data-testid^="catch-choice-"] img', (els) =>
    els.map((e) => ({ src: e.src, w: e.naturalWidth, h: e.naturalHeight }))
  );
  console.log(`sprite <img>s in choices: ${imgs.length}`);
  for (const i of imgs) console.log(`  ${i.src}  (${i.w}x${i.h})`);

  const spriteCount = imgs.filter((i) =>
    /\/assets\/generated\/new\/math-throw\/(digits|operators)\//.test(i.src) && i.w > 0
  ).length;
  console.log(`valid math-throw sprites: ${spriteCount}`);

  // Screenshot the full screen for visual review
  const shot = await page.screenshot({ fullPage: true });
  writeFileSync(resolve(OUT_DIR, 'catch_math_screen.png'), shot);

  // Tight framing of the choice row if found
  const choices = page.locator('[data-testid="catch-choices"]');
  if ((await choices.count()) > 0) {
    const cShot = await choices.screenshot();
    writeFileSync(resolve(OUT_DIR, 'catch_math_choices.png'), cShot);
  }

  await browser.close();
  if (hasCatch === 0) {
    console.error('FAIL: never reached catch-math screen');
    process.exit(2);
  }
  if (spriteCount === 0) {
    console.error('FAIL: no math-throw sprite <img>s found in choices row');
    process.exit(3);
  }
  console.log('PASS: catch-math rendered with PNG sprites');
})();
