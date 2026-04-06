/**
 * Retry failed animation frames.
 * Run: npx vite-node scripts/retry_missing_frames.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface MissingFrame {
  dir: string;
  filename: string;
  prompt: string;
  seed: number;
}

const MISSING: MissingFrame[] = [
  {
    dir: 'anim_slash',
    filename: 'frame_0.png',
    prompt: 'pixel art combat VFX frame, very faint thin white diagonal line just starting to appear from top-right, dark fantasy, transparent background, single scratch mark beginning',
    seed: 800,
  },
  {
    dir: 'anim_slam',
    filename: 'frame_0.png',
    prompt: 'pixel art combat VFX frame, small dark shadow appearing on ground below, something about to land, anticipation frame, dark background, game impact effect frame 1',
    seed: 830,
  },
  {
    dir: 'anim_slam',
    filename: 'frame_1.png',
    prompt: 'pixel art combat VFX frame, brown dust cloud starting to burst upward from ground, small rocks starting to fly, beginning of impact, dark background, game slam effect',
    seed: 831,
  },
];

async function generate(prompt: string, seed: number): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: prompt,
      image_size: { width: 128, height: 128 },
      no_background: true,
      text_guidance_scale: 12,
      seed,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  return Buffer.from(data.image.base64, 'base64');
}

async function main() {
  const framesDir = path.resolve('public/assets/generated/frames');

  for (const frame of MISSING) {
    const outPath = path.join(framesDir, frame.dir, frame.filename);
    console.log(`Retrying ${frame.dir}/${frame.filename}...`);
    try {
      const buf = await generate(frame.prompt, frame.seed);
      fs.writeFileSync(outPath, buf);
      console.log(`  OK (${buf.length} bytes)`);
    } catch (err) {
      console.error(`  FAILED: ${err}`);
    }
  }

  console.log('Done. Run stitch_sprite_sheets.ts next.');
}

main().catch(console.error);
