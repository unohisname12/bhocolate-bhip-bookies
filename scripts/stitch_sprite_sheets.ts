/**
 * Stitch individual animation frames into horizontal sprite sheets.
 * Reads from public/assets/generated/frames/<effect_name>/frame_0..N.png
 * Outputs to public/assets/generated/final/<effect_name>.png
 *
 * Run: npx vite-node scripts/stitch_sprite_sheets.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const FRAME_SIZE = 128; // each frame is 128x128

interface SheetConfig {
  name: string;
  frameCount: number;
}

const SHEETS: SheetConfig[] = [
  { name: 'anim_slash', frameCount: 6 },
  { name: 'anim_fire', frameCount: 6 },
  { name: 'anim_lightning', frameCount: 6 },
  { name: 'anim_slam', frameCount: 6 },
  { name: 'anim_shield', frameCount: 6 },
  { name: 'anim_heal', frameCount: 6 },
];

async function stitchSheet(config: SheetConfig): Promise<void> {
  const framesDir = path.resolve(`public/assets/generated/frames/${config.name}`);
  const outputRaw = path.resolve(`public/assets/generated/raw/${config.name}.png`);
  const outputFinal = path.resolve(`public/assets/generated/final/${config.name}.png`);

  // Read all frame files
  const framePaths: string[] = [];
  for (let i = 0; i < config.frameCount; i++) {
    const fp = path.join(framesDir, `frame_${i}.png`);
    if (!fs.existsSync(fp)) {
      console.warn(`  Missing frame: ${fp} — skipping this sheet`);
      return;
    }
    framePaths.push(fp);
  }

  // Create horizontal strip: width = frameCount * FRAME_SIZE, height = FRAME_SIZE
  const sheetWidth = config.frameCount * FRAME_SIZE;
  const sheetHeight = FRAME_SIZE;

  // Build composite operations
  const composites = framePaths.map((fp, i) => ({
    input: fp,
    left: i * FRAME_SIZE,
    top: 0,
  }));

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
    .toFile(outputRaw);

  // Copy to final
  fs.copyFileSync(outputRaw, outputFinal);

  console.log(`  ${config.name}: ${sheetWidth}x${sheetHeight} → ${outputFinal}`);
}

async function main() {
  console.log(`\n=== Stitching ${SHEETS.length} sprite sheets ===\n`);

  for (const sheet of SHEETS) {
    try {
      await stitchSheet(sheet);
    } catch (err) {
      console.error(`  FAILED ${sheet.name}: ${err}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
