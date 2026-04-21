/**
 * Retry — regenerate the 4 sub-32 dimension failures at 32+ canvas,
 * and reroll 2 weak results with clearer prompts.
 * Run: npx vite-node scripts/generate_warm_props_retry.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface GenOpts {
  name: string;
  description: string;
  width: number;
  height: number;
  noBackground?: boolean;
  seed: number;
}

async function generate(opts: GenOpts): Promise<{ buf: Buffer; usd: number }> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: opts.description,
      image_size: { width: opts.width, height: opts.height },
      no_background: opts.noBackground ?? true,
      text_guidance_scale: 10,
      seed: opts.seed,
    }),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }
  const data = (await response.json()) as { usage: { usd: number }; image: { base64: string } };
  return { buf: Buffer.from(data.image.base64, 'base64'), usd: data.usage.usd };
}

const PROPS: GenOpts[] = [
  // Failures bumped to 32x32 minimum
  {
    name: 'baseboard_warm',
    width: 32,
    height: 32, // will crop top half post-gen
    seed: 5201,
    description:
      'Pixel-art horizontal wooden baseboard trim strip centered in frame, warm tavern wood. Strip occupies the middle 16 rows of a 32x32 canvas, top and bottom 8 rows are transparent. 1px top highlight #d4a574, 12px mid-tone wood body #8b5a2b with 2 vertical groove seams, 3px deep shadow bottom #3a2415. Left and right edges of the strip tile seamlessly. Flat pixel art, 3-color palette, crisp 1px edges, no anti-alias, no characters.',
  },
  {
    name: 'wall_sconce_warm',
    width: 32,
    height: 48,
    seed: 5202,
    description:
      'Pixel-art iron wall-mounted torch bracket for tavern inn, centered on 32x48 canvas. Iron L-bracket #2a2a2a with #4a4a4a rim highlight, mounted to left edge of frame, small cup at top holding burning rag, teardrop flame core #ffd76a plus edge #ff8c3a, wisp of dark smoke #5a5a5a rising 4px above. Drop shadow #1a0e06 under bracket. Transparent background, 4-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'fire_tools_warm',
    width: 32,
    height: 48,
    seed: 5203,
    description:
      'Pixel-art wrought-iron fireplace tool set on small round base, centered on 32x48 canvas. Vertical stand #2a2a2a core plus #4a4a4a highlight, circular foot at bottom, 2 iron tools (poker with hooked end and shovel) leaning against stand, brass #b8860b cap on each handle. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'pet_bowl_food_warm',
    width: 32,
    height: 32,
    seed: 5204,
    description:
      'Pixel-art wooden pet food bowl, 3/4 view, centered on 32x32 canvas. Round dark wood bowl #5a3a1a with #8b5a2b rim highlight, small pile of brown kibble pellets #6b4423 and #8b5a2b visible inside, tiny dark shadow under bowl. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
  // Rerolls — clearer prompts, different seeds
  {
    name: 'pet_cushion_warm',
    width: 48,
    height: 32,
    seed: 5205,
    description:
      'Pixel-art round plush pet bed viewed from 3/4 angle, flat circular cushion on floor. Deep red velvet top #b91c1c with darker rim #7f1d1d, 1px gold braid trim #fbbf24 along outer edge, soft black shadow underneath at 40 percent opacity. Shape: wide oval, flat top, no food, no fruit, no basket — just a soft plush pet bed. Transparent background, 4-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'wooden_stool_warm',
    width: 32,
    height: 32,
    seed: 5206,
    description:
      'Pixel-art round 3-legged wooden tavern stool, side view. Circular flat seat top #8b5a2b with #d4a574 highlight ridge, 3 straight cylindrical wooden legs #5a3a1a clearly visible angling outward from seat to floor, 1px black shadow line on floor beneath legs. No skirt, no cloth, no hat — just a plain wooden stool. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
];

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw/warm_props');
  fs.mkdirSync(rawDir, { recursive: true });
  console.log(`Retrying/rerolling ${PROPS.length} props...\n`);
  let totalUsd = 0;
  for (let i = 0; i < PROPS.length; i++) {
    const prop = PROPS[i];
    try {
      console.log(`[${i + 1}/${PROPS.length}] ${prop.name} (${prop.width}x${prop.height})...`);
      const { buf, usd } = await generate(prop);
      // Save retry alongside original — suffix retry files for side-by-side review
      const originalPath = path.join(rawDir, `${prop.name}.png`);
      const retryPath = path.join(rawDir, `${prop.name}_retry.png`);
      fs.writeFileSync(retryPath, buf);
      totalUsd += usd;
      console.log(`    saved ${buf.length}b -> ${retryPath} · $${usd.toFixed(4)}`);
      // Keep original if it existed (for comparison)
      if (fs.existsSync(originalPath)) {
        console.log(`    (original kept at ${originalPath})`);
      }
    } catch (e) {
      console.error(`    FAILED: ${(e as Error).message}`);
    }
  }
  console.log(`\nTotal: $${totalUsd.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
