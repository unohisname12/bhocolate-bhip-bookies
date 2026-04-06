/**
 * Generate 2 full scene background images for Outside (yard) and Inside (home interior).
 * These are full-viewport pixel-art scenes, NOT transparent objects.
 * Run: npx vite-node scripts/generate_scene_backgrounds.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const SCENES = [
  {
    filename: 'scene_outside',
    prompt: 'pixel art outdoor scene background, bright colorful daytime, blue sky with fluffy white clouds and yellow sun, green trees and grass, wooden picket fence, small cozy stone cottage house with wooden door and chimney, red mailbox, colorful flowers along dirt path, cheerful welcoming yard, 16-bit RPG style, clean pixel edges, vibrant saturated colors, no characters or creatures, empty clear ground area in lower third for character placement',
    width: 400,
    height: 224,
  },
  {
    filename: 'scene_inside',
    prompt: 'pixel art cozy interior room background, warm brown wood tones, wooden ceiling beams and rafters, stone fireplace with warm crackling fire on left wall, tall bookshelf against back wall filled with colorful books, window showing mountain landscape, grandfather clock, desk with glowing lamp, ornate patterned rug on wooden floor, potted green plant in corner, wooden door on right side, warm ambient lighting, 16-bit RPG style, clean pixel edges, no characters or creatures, clear open floor area in lower third for character placement',
    width: 400,
    height: 224,
  },
];

async function generate(apiKey: string, scene: typeof SCENES[0], outPath: string): Promise<boolean> {
  try {
    process.stdout.write(`  ${scene.filename}...`);
    const response = await fetch(PIXELLAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: scene.prompt,
        image_size: { width: scene.width, height: scene.height },
        no_background: false,
        text_guidance_scale: 10,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status}: ${body}`);
    }

    const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
    const buf = Buffer.from(data.image.base64, 'base64');
    fs.writeFileSync(outPath, buf);
    console.log(` OK (${buf.length}b, $${data.usage.usd})`);
    return true;
  } catch (err) {
    console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main() {
  const reviewDir = path.resolve('public/assets/generated/review');
  fs.mkdirSync(reviewDir, { recursive: true });
  const apiKey = getApiKey();
  let success = 0;
  let failed = 0;

  console.log(`\nGENERATING ${SCENES.length} SCENE BACKGROUNDS (480x270)\n`);

  for (const scene of SCENES) {
    const outPath = path.join(reviewDir, `${scene.filename}.png`);
    let ok = await generate(apiKey, scene, outPath);

    // Retry once on failure
    if (!ok) {
      ok = await generate(apiKey, scene, outPath);
    }

    if (ok) success++;
    else failed++;
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
  if (success > 0) {
    console.log(`\nScene backgrounds saved to: ${reviewDir}/`);
    console.log('Review them, then copy approved ones to public/assets/generated/final/');
  }
}

main().catch(console.error);
