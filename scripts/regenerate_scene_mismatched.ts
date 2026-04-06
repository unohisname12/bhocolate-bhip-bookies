/**
 * Regenerate mismatched scene assets — fixes opaque backgrounds,
 * wrong perspectives, and style mismatches identified in visual audit.
 *
 * Run: npx vite-node scripts/regenerate_scene_mismatched.ts
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

const MISMATCHED: RetryDef[] = [
  /* ---- OUTDOOR ACCENTS (opaque grass backgrounds, fantasy cave scene) ---- */
  {
    filename: 'accent_flowers_red',
    prompt: `tiny cluster of 3-4 bright red flowers with short green stems, simple pixel art wildflower bouquet, isolated single object centered on empty canvas, no ground no dirt no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 820,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_flowers_yellow',
    prompt: `tiny cluster of 3-4 bright yellow wildflowers with short green stems, simple pixel art flower bunch, isolated single object centered on empty canvas, no ground no dirt no grass no sky, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 821,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_flowers_blue',
    prompt: `tiny cluster of 3-4 bright blue flowers with short green stems, simple pixel art wildflower bunch, isolated single object centered on empty canvas, no ground no dirt no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 822,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_rock_a',
    prompt: `one small round grey garden pebble stone, 2-tone grey shading with warm highlight on top-left, simple smooth rock, single tiny object centered on empty canvas, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 823,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_rock_b',
    prompt: `two small mossy grey rocks side by side, 2-3 tones of grey with small green moss patches, simple garden stones, single group centered on empty canvas, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 824,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },

  /* ---- OUTDOOR PROPS (opaque background) ---- */
  {
    filename: 'prop_fence_gate',
    prompt: `white wooden picket fence gate segment with small swinging gate and brown post accents, simple clean 3-color design, isolated single object centered on empty canvas, no ground no sky no grass, ${STYLE}`,
    width: 64, height: 48, noBackground: true, seed: 816,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
  },

  /* ---- INDOOR ACCENTS (top-down perspective, opaque backgrounds) ---- */
  {
    filename: 'accent_rug_large',
    prompt: `ornate oval area rug on floor seen from low side angle, warm red and gold decorative pattern visible, thin foreshortened oval shape with fringe edges, cozy floor decoration, 4-5 colors, single object centered on empty canvas, no floor texture, ${STYLE}`,
    width: 128, height: 48, noBackground: true, seed: 870,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },
  {
    filename: 'accent_rug_small',
    prompt: `small woven brown and cream striped doormat on floor seen from low side angle, thin foreshortened rectangle, simple 3-color woven pattern, no text no words, single object centered on empty canvas, no floor texture, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 871,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },
  {
    filename: 'accent_pet_bed',
    prompt: `soft round pet bed cushion from three-quarter front view, blue fabric with white trim edge visible, cozy plush oval shape, 3-4 colors, single object centered on empty canvas, no floor no background, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 872,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },
  {
    filename: 'accent_food_bowl',
    prompt: `small ceramic pet food bowl with kibble inside, light blue bowl with warm brown kibble, three-quarter front view showing bowl rim and interior, simple 3-color design, single object centered on empty canvas, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 873,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },
  {
    filename: 'accent_slippers',
    prompt: `pair of cozy pink fluffy house slippers from low front angle, soft round shapes, 3 colors, single pair centered on empty canvas, no floor, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 875,
    outDir: 'public/assets/generated/review/environment/indoor/accents',
  },

  /* ---- INDOOR PROPS (opaque wall/floor backgrounds) ---- */
  {
    filename: 'prop_couch',
    prompt: `cozy brown leather couch with soft cushions, strong clear silhouette, 3-4 warm brown tones, front view showing seat and armrests, single furniture piece centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 80, height: 48, noBackground: true, seed: 854,
    outDir: 'public/assets/generated/review/environment/indoor/props',
  },
  {
    filename: 'prop_chair',
    prompt: `wooden armchair with soft green cushion seat, simple readable furniture shape, 3-4 colors, front view, single chair centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 40, height: 48, noBackground: true, seed: 855,
    outDir: 'public/assets/generated/review/environment/indoor/props',
  },
  {
    filename: 'prop_table',
    prompt: `small round wooden side table with simple glowing desk lamp on top, clean pixel art design, 3-4 warm colors, front view, single furniture piece centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 56, height: 40, noBackground: true, seed: 856,
    outDir: 'public/assets/generated/review/environment/indoor/props',
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

    console.log(` OK (${buf.length}b) Cost: $${data.usage.usd.toFixed(4)}`);
    return true;
  } catch (err) {
    console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main() {
  const apiKey = getApiKey();
  console.log('Regenerating mismatched scene assets...\n');

  let success = 0;
  let failed = 0;

  for (const def of MISMATCHED) {
    let ok = await generate(apiKey, def);

    // Try 2 more seeds if degenerate
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
      failed++;
    } else {
      console.log(`  ✓ ${def.filename} — success\n`);
      success++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed out of ${MISMATCHED.length} total`);
}

main().catch(console.error);
