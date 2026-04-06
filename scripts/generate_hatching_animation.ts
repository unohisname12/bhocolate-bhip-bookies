/**
 * Generate a 16-frame hatching animation sprite sheet for the blue koala pet.
 *
 * Each frame is generated individually at 128x128 via Pixel Lab,
 * then stitched horizontally into a single sprite sheet.
 *
 * Run: npx vite-node scripts/generate_hatching_animation.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const FRAME_SIZE = 128;
const TOTAL_FRAMES = 16;

// Each frame description progresses through the hatching sequence.
// The style must match: cute blue koala, pixel art, 16-bit RPG style, transparent background.
const FRAME_PROMPTS: string[] = [
  // Frames 0-3: Egg sitting, starting to wobble
  'pixel art blue speckled egg sitting still on ground, cute round egg with white spots, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg tilting slightly left, cute round egg with white spots beginning to wobble, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg tilting slightly right, cute round egg wobbling, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg wobbling strongly with small crack line on top, cute round egg shaking, 16-bit RPG style, clean pixel edges, transparent background, centered',

  // Frames 4-7: Egg cracking open
  'pixel art blue speckled egg with crack lines spreading across shell, pieces starting to chip off top, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg cracking open at top with small blue ears peeking out, shell breaking apart, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg half broken with cute baby blue koala head visible inside, big eyes peeking out from broken shell, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art blue speckled egg mostly broken open, cute baby blue koala emerging upper body visible with big round eyes, broken shell pieces around, 16-bit RPG style, clean pixel edges, transparent background, centered',

  // Frames 8-11: Koala emerging
  'pixel art cute baby blue koala climbing out of broken blue egg shell, round body with big eyes and small arms, egg shell bottom half remaining, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala sitting in broken egg shell bottom, full body visible round and blue with white belly, big sparkly eyes, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala stepping out of egg shell pieces on ground, round blue body white belly big eyes small ears, happy expression, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala standing next to broken egg shell pieces, round blue body white belly big sparkly eyes, looking around curiously, 16-bit RPG style, clean pixel edges, transparent background, centered',

  // Frames 12-15: Newborn koala celebrating
  'pixel art cute baby blue koala standing happily with tiny arms up, round blue body white belly big sparkly eyes small smile, broken egg pieces nearby, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala with arms raised celebrating, round blue body white belly big sparkly eyes wide happy smile, sparkle effects, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala jumping slightly with joy, round blue body white belly big sparkly eyes happy expression, small sparkles around, 16-bit RPG style, clean pixel edges, transparent background, centered',
  'pixel art cute baby blue koala standing happily looking at viewer, round blue body white belly big sparkly eyes gentle smile, ready for adventure, 16-bit RPG style, clean pixel edges, transparent background, centered',
];

async function generateFrame(apiKey: string, prompt: string, frameIndex: number): Promise<Buffer | null> {
  process.stdout.write(`  Frame ${frameIndex}/${TOTAL_FRAMES - 1}...`);
  try {
    const response = await fetch(PIXELLAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: prompt,
        image_size: { width: FRAME_SIZE, height: FRAME_SIZE },
        no_background: true,
        text_guidance_scale: 10,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status}: ${body}`);
    }

    const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
    const buf = Buffer.from(data.image.base64, 'base64');
    console.log(` OK ($${data.usage.usd})`);
    return buf;
  } catch (err) {
    console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Stitch individual PNG frames into a horizontal sprite sheet.
 * Uses raw PNG concatenation via a simple canvas approach with sharp if available,
 * or falls back to writing individual frames + a simple concatenation.
 */
async function stitchFrames(frames: Buffer[], outputPath: string): Promise<void> {
  // Try using sharp for image manipulation
  try {
    const sharp = (await import('sharp')).default;

    // Create a horizontal strip: TOTAL_FRAMES * FRAME_SIZE wide, FRAME_SIZE tall
    const sheetWidth = TOTAL_FRAMES * FRAME_SIZE;
    const sheetHeight = FRAME_SIZE;

    const composites = frames.map((buf, i) => ({
      input: buf,
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
      .toFile(outputPath);

    console.log(`\nSprite sheet saved: ${outputPath} (${sheetWidth}x${sheetHeight})`);
  } catch {
    // If sharp is not available, save individual frames
    console.log('\nsharp not available — saving individual frames instead');
    const dir = path.dirname(outputPath);
    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(dir, `hatching_frame_${String(i).padStart(2, '0')}.png`);
      fs.writeFileSync(framePath, frames[i]);
      console.log(`  Saved: ${framePath}`);
    }
    console.log('\nManually stitch frames into a horizontal sprite sheet.');
    console.log(`Expected: ${TOTAL_FRAMES * FRAME_SIZE}x${FRAME_SIZE} (${TOTAL_FRAMES} cols x 1 row)`);
  }
}

async function main() {
  const reviewDir = path.resolve('public/assets/generated/review');
  fs.mkdirSync(reviewDir, { recursive: true });

  const apiKey = getApiKey();
  console.log(`\nGENERATING ${TOTAL_FRAMES}-FRAME HATCHING ANIMATION (${FRAME_SIZE}x${FRAME_SIZE} per frame)\n`);

  const frames: Buffer[] = [];
  let failed = 0;

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    let buf = await generateFrame(apiKey, FRAME_PROMPTS[i], i);

    // Retry once on failure
    if (!buf) {
      console.log(`  Retrying frame ${i}...`);
      buf = await generateFrame(apiKey, FRAME_PROMPTS[i], i);
    }

    if (buf) {
      frames.push(buf);
      // Also save individual frame for review
      const framePath = path.join(reviewDir, `hatching_frame_${String(i).padStart(2, '0')}.png`);
      fs.writeFileSync(framePath, buf);
    } else {
      failed++;
      // Use a transparent placeholder
      frames.push(Buffer.alloc(0));
    }
  }

  console.log(`\nGeneration complete: ${TOTAL_FRAMES - failed} success, ${failed} failed`);

  if (failed > 0) {
    console.log('WARNING: Some frames failed. Review individual frames and regenerate as needed.');
  }

  // Only stitch if we have all frames
  const validFrames = frames.filter(b => b.length > 0);
  if (validFrames.length === TOTAL_FRAMES) {
    const outputPath = path.join(reviewDir, 'blue-koala-hatching-new.png');
    await stitchFrames(validFrames, outputPath);
  } else {
    console.log(`\nOnly ${validFrames.length}/${TOTAL_FRAMES} frames generated. Fix failures before stitching.`);
  }

  console.log('\nReview frames in:', reviewDir);
  console.log('When approved, copy to: public/assets/pets/blue-koala/hatching/');
  console.log('Update assetManifest.ts: cols=16, frameWidth=128, frameHeight=128, frames=16');
}

main().catch(console.error);
