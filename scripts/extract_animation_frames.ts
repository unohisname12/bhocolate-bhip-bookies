/**
 * Extract frames from animation grid images and build horizontal sprite sheets.
 *
 * Generalised version of extract_hatching_frames.ts. For each animation:
 * 1. Read grid.png (640x512, 5x4 grid of 128x128 cells)
 * 2. Extract non-empty frames
 * 3. Save individual frames to frames/frame_00.png etc.
 * 4. Stitch into horizontal sprite sheet: blue-koala-[action].png
 *
 * Usage:
 *   npx vite-node scripts/extract_animation_frames.ts              # all
 *   npx vite-node scripts/extract_animation_frames.ts --action eating  # one
 */
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_BASE = path.resolve('public/assets/generated/review/animations');
// API max is 400x400, so we generate 384x384 (3x3 grid of 128x128).
// The script auto-detects grid dimensions from image size.
const FRAME_W = 128;
const FRAME_H = 128;

interface AnimDef {
  id: string;
  action: string;
  label: string;
}

async function extractAnimation(sharp: typeof import('sharp').default, action: string): Promise<void> {
  const animDir = path.join(OUTPUT_BASE, action);
  const gridPath = path.join(animDir, 'grid.png');

  if (!fs.existsSync(gridPath)) {
    console.log(`  SKIP ${action} — no grid.png`);
    return;
  }

  const framesDir = path.join(animDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const img = sharp(gridPath);
  const meta = await img.metadata();
  const COLS = Math.floor(meta.width! / FRAME_W);
  const ROWS = Math.floor(meta.height! / FRAME_H);
  console.log(`  ${action}: grid ${meta.width}x${meta.height} → ${COLS}x${ROWS} cells`);

  const frames: Buffer[] = [];
  let frameIndex = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const left = col * FRAME_W;
      const top = row * FRAME_H;

      const frameBuf = await sharp(gridPath)
        .extract({ left, top, width: FRAME_W, height: FRAME_H })
        .png()
        .toBuffer();

      // Check if frame is mostly empty (transparent/white)
      const { data, info } = await sharp(frameBuf).raw().toBuffer({ resolveWithObject: true });
      let nonTransparentPixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 20) nonTransparentPixels++;
      }
      const fillRatio = nonTransparentPixels / (info.width * info.height);

      if (fillRatio > 0.01) {
        const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(2, '0')}.png`);
        fs.writeFileSync(framePath, frameBuf);
        frames.push(frameBuf);
        frameIndex++;
      }
    }
  }

  console.log(`    Extracted ${frames.length} non-empty frames`);

  if (frames.length === 0) {
    console.error(`    WARNING: No frames found for ${action}!`);
    return;
  }

  // Build horizontal sprite sheet
  const sheetWidth = frames.length * FRAME_W;
  const sheetHeight = FRAME_H;

  const composites = frames.map((buf, i) => ({
    input: buf,
    left: i * FRAME_W,
    top: 0,
  }));

  const sheetPath = path.join(animDir, `blue-koala-${action}.png`);
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(sheetPath);

  console.log(`    Sprite sheet: ${sheetPath} (${sheetWidth}x${sheetHeight}, ${frames.length} frames)`);
  console.log(`    Config: cols=${frames.length}, rows=1, frameWidth=${FRAME_W}, frameHeight=${FRAME_H}, frames=${frames.length}`);
}

async function main() {
  const sharpMod = await import('sharp');
  const sharp = sharpMod.default;

  const args = process.argv.slice(2);
  const actionIdx = args.indexOf('--action');
  const singleAction = actionIdx >= 0 ? args[actionIdx + 1] : null;

  const { ANIMATION_DEFINITIONS } = await import('../src/config/animationManifest');

  const targets: AnimDef[] = singleAction
    ? ANIMATION_DEFINITIONS.filter((a: AnimDef) => a.action === singleAction)
    : ANIMATION_DEFINITIONS;

  if (targets.length === 0) {
    console.error(`No animation found for action: ${singleAction}`);
    process.exit(1);
  }

  console.log(`\n=== Extracting frames for ${targets.length} animations ===\n`);

  for (const anim of targets) {
    await extractAnimation(sharp, anim.action);
  }

  console.log(`\n=== Done ===`);
}

main().catch(console.error);
