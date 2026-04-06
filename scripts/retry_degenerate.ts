/**
 * Retry generation for degenerate assets (< 300 bytes).
 * Uses bumped seeds and slightly adjusted prompts.
 *
 * Run: npx vite-node scripts/retry_degenerate.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, 16-bit SNES RPG style, clean crisp pixel edges, 2-3 tone cel shading on every surface, warm top-left directional lighting with soft ambient glow, saturated but harmonious palette, no dithering, no blur, no anti-aliasing, no gradients within pixels, cozy modern pixel art game';

const STYLE_NEGATIVE = 'photorealistic, painterly, blurry, noisy, dithered, too much detail, muddy colors, dark, desaturated, anti-aliased, smooth gradients';

interface RetryDef {
  filename: string;
  prompt: string;
  width: number;
  height: number;
  noBackground: boolean;
  seed: number;
  outDir: string;
}

const RETRIES: RetryDef[] = [
  {
    filename: 'layer_outdoor_ground',
    prompt: `lush green grass ground surface with visible grass blades on top and brown dirt layer at bottom edge, vibrant 2-tone green shading, flat horizontal terrain strip for a game, ${STYLE}`,
    width: 400, height: 48, noBackground: false, seed: 703,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },
  {
    filename: 'layer_indoor_floor',
    prompt: `warm honey-brown wooden plank floor boards seen from above, visible wood grain texture, 2-tone warm brown shading with highlights from left, horizontal floor strip for a game room, ${STYLE}`,
    width: 400, height: 48, noBackground: false, seed: 741,
    outDir: 'public/assets/generated/review/environment/indoor/layers',
  },
  {
    filename: 'accent_rug_large',
    prompt: `ornate oval area rug with warm red and gold decorative pattern and fringe edges, seen from above at slight angle, cozy floor decoration for a room, 4-5 colors, ${STYLE}`,
    width: 128, height: 48, noBackground: true, seed: 770,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },
];

async function generate(apiKey: string, def: RetryDef): Promise<boolean> {
  const outPath = path.join(def.outDir, `${def.filename}.png`);
  process.stdout.write(`  ${def.filename} (seed ${def.seed})...`);

  try {
    const response = await fetch(PIXELLAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: def.prompt,
        negative_description: STYLE_NEGATIVE,
        image_size: { width: def.width, height: def.height },
        no_background: def.noBackground,
        text_guidance_scale: 12,
        seed: def.seed,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      usage: { usd: number };
      image: { base64: string };
    };

    const buf = Buffer.from(data.image.base64, 'base64');
    fs.mkdirSync(def.outDir, { recursive: true });
    fs.writeFileSync(outPath, buf);

    if (buf.length < 300) {
      console.log(` STILL DEGENERATE (${buf.length}b) — try different seed`);
      return false;
    }

    console.log(` OK (${buf.length}b)`);
    return true;
  } catch (err) {
    console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main() {
  const apiKey = getApiKey();
  console.log('Retrying degenerate assets with new seeds...\n');

  for (const def of RETRIES) {
    let ok = await generate(apiKey, def);

    // Try 2 more seeds if still degenerate
    if (!ok) {
      def.seed += 10;
      ok = await generate(apiKey, def);
    }
    if (!ok) {
      def.seed += 10;
      ok = await generate(apiKey, def);
    }

    if (!ok) {
      console.log(`  ✗ ${def.filename} — GAVE UP after 3 attempts\n`);
    } else {
      console.log(`  ✓ ${def.filename} — success\n`);
    }
  }
}

main().catch(console.error);
