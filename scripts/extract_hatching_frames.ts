/**
 * Extract frames from the hatching reference image (640x512, ~5x4 grid)
 * and assemble into a horizontal sprite sheet.
 *
 * Run: npx vite-node scripts/extract_hatching_frames.ts
 */
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const sharp = (await import('sharp')).default;

  const refPath = '/home/dre/Documents/art/ref anime/pixellab-Create-a-16-frame-pixel-art-an-1774925377296.png';
  const outDir = path.resolve('public/assets/generated/review');
  fs.mkdirSync(outDir, { recursive: true });

  const img = sharp(refPath);
  const meta = await img.metadata();
  console.log(`Reference image: ${meta.width}x${meta.height}`);

  // Grid: 5 cols x 4 rows, but some cells may be empty
  // 640 / 5 = 128px per col, 512 / 4 = 128px per row
  const COLS = 5;
  const ROWS = 4;
  const FRAME_W = Math.floor(meta.width! / COLS);
  const FRAME_H = Math.floor(meta.height! / ROWS);
  console.log(`Frame size: ${FRAME_W}x${FRAME_H}, Grid: ${COLS}x${ROWS}`);

  // Extract each frame
  const frames: Buffer[] = [];
  let frameIndex = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const left = col * FRAME_W;
      const top = row * FRAME_H;

      const frameBuf = await sharp(refPath)
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
        // Save individual frame for review
        const framePath = path.join(outDir, `hatching_ref_${String(frameIndex).padStart(2, '0')}.png`);
        fs.writeFileSync(framePath, frameBuf);
        console.log(`  Frame ${frameIndex}: row=${row} col=${col}, fill=${(fillRatio * 100).toFixed(1)}%`);
        frames.push(frameBuf);
        frameIndex++;
      } else {
        console.log(`  SKIP: row=${row} col=${col}, fill=${(fillRatio * 100).toFixed(1)}% (empty)`);
      }
    }
  }

  console.log(`\nExtracted ${frames.length} non-empty frames`);

  if (frames.length === 0) {
    console.error('No frames found!');
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

  const sheetPath = path.join(outDir, 'blue-koala-hatching-from-ref.png');
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

  console.log(`\nSprite sheet: ${sheetPath} (${sheetWidth}x${sheetHeight}, ${frames.length} frames)`);
  console.log(`\nAsset manifest config:`);
  console.log(`  cols: ${frames.length}`);
  console.log(`  rows: 1`);
  console.log(`  frameWidth: ${FRAME_W}`);
  console.log(`  frameHeight: ${FRAME_H}`);
  console.log(`  frames: ${frames.length}`);
}

main().catch(console.error);
