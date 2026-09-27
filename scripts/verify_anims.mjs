#!/usr/bin/env node
/**
 * Playwright visual verification for generated animation sheets.
 *
 * For each final sheet in animations_final/, opens a simple HTML page that
 * CSS-animates the sheet frame-by-frame, captures screenshots at each frame,
 * and saves them for visual review.
 *
 * Run: node scripts/verify_anims.mjs
 */
import { chromium } from 'playwright';
import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FINAL_ROOT = path.join(ROOT, 'public/assets/generated/new/animations_final');
const SHOTS_ROOT = path.join(FINAL_ROOT, '_playwright_shots');

const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 128;
const DISPLAY_SCALE = 4;  // show @ 512×512 for visibility

// Discover sheets
async function findSheets() {
  const sheets = [];
  const chars = await fs.readdir(FINAL_ROOT, { withFileTypes: true });
  for (const c of chars) {
    if (!c.isDirectory() || c.name.startsWith('_')) continue;
    const charDir = path.join(FINAL_ROOT, c.name);
    const files = await fs.readdir(charDir);
    for (const f of files) {
      if (f.endsWith('-south-sheet.png')) {
        sheets.push({
          character: c.name,
          action: f.replace('-south-sheet.png', ''),
          path: path.join(charDir, f),
        });
      }
    }
  }
  return sheets;
}

function renderPage(sheetUrl, frameCount) {
  const sheetWidth = FRAME_WIDTH * frameCount * DISPLAY_SCALE;
  const size = FRAME_WIDTH * DISPLAY_SCALE;
  return `<!doctype html><html><body style="margin:0;background:#222;display:flex;align-items:center;justify-content:center;height:100vh;">
<div id="anim" style="width:${size}px;height:${size}px;
  background-image:url('${sheetUrl}');
  background-repeat:no-repeat;
  background-size:${sheetWidth}px ${size}px;
  background-position:0 0;
  image-rendering:pixelated;"></div>
<script>
  window.showFrame = (i) => {
    document.getElementById('anim').style.backgroundPosition = (-i * ${size}) + 'px 0';
  };
</script>
</body></html>`;
}

async function main() {
  const sheets = await findSheets();
  if (!sheets.length) {
    console.log('no sheets found in', FINAL_ROOT);
    return;
  }
  await fs.mkdir(SHOTS_ROOT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 640, height: 640 } });
  const page = await ctx.newPage();

  const report = [];
  for (const s of sheets) {
    // Compute frame count from sheet width
    const { width } = await import('sharp').then(m => m.default(s.path).metadata()).catch(() => ({ width: null }));
    const frameCount = width ? Math.round(width / FRAME_WIDTH) : 3;
    const dataUrl = 'data:image/png;base64,' + (await fs.readFile(s.path)).toString('base64');
    const html = renderPage(dataUrl, frameCount);
    await page.setContent(html);

    const perFrame = [];
    for (let i = 0; i < frameCount; i++) {
      await page.evaluate((idx) => window.showFrame(idx), i);
      await page.waitForTimeout(50);
      const shotPath = path.join(SHOTS_ROOT, `${s.character}_${s.action}_f${i}.png`);
      await page.locator('#anim').screenshot({ path: shotPath });
      perFrame.push(path.relative(ROOT, shotPath));
    }
    report.push({ ...s, path: path.relative(ROOT, s.path), frameCount, perFrame });
    console.log(`  📸 ${s.character}/${s.action} — ${frameCount} frame screenshots`);
  }
  await browser.close();

  await fs.writeFile(
    path.join(SHOTS_ROOT, '_report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(`✅ ${report.length} sheets verified. Shots at ${path.relative(ROOT, SHOTS_ROOT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
