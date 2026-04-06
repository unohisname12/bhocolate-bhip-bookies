/**
 * Final Cohesion Pass — regenerate outdoor assets that break immersion.
 *
 * Targets:
 *  1. accent_rock_a — purple/crystalline cave → warm garden pebble
 *  2. accent_rock_b — bland grey blob → warm mossy garden stones
 *  3. prop_fence_gate — pink iron gate → white wooden picket gate matching mid_bg
 *  4. accent_grass_tuft_a — washed-out white → warm green grass clump
 *  5. accent_grass_edge_a — NEW foreground grass edge for ground blending
 *  6. accent_grass_edge_b — NEW foreground grass edge for ground blending
 *  7. accent_leaf_scatter — NEW small fallen leaves for organic scatter
 *  8. accent_pebble_scatter — NEW tiny warm pebbles for path edge detail
 *
 * Run: npx vite-node scripts/regenerate_cohesion_pass.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, 16-bit SNES RPG style, clean crisp pixel edges, 2-3 tone cel shading on every surface, warm sunset directional lighting from horizon center with soft golden ambient glow, saturated but harmonious warm palette, no dithering, no blur, no anti-aliasing, no gradients within pixels, cozy sunset yard pixel art game';

const STYLE_NEGATIVE = 'photorealistic, painterly, blurry, noisy, dithered, too much detail, muddy colors, dark, desaturated, anti-aliased, smooth gradients, cool blue highlights, purple tones, cave, crystal, fantasy';

interface AssetDef {
  filename: string;
  prompt: string;
  width: number;
  height: number;
  noBackground: boolean;
  seed: number;
  outDir: string;
}

const COHESION_ASSETS: AssetDef[] = [
  /* ---- REPLACEMENTS ---- */
  {
    filename: 'accent_rock_a',
    prompt: `one small warm-toned garden pebble stone, rounded smooth shape, 2-tone warm grey and tan shading with golden sunset highlight on top-left edge, simple cozy garden rock, single tiny object centered on empty canvas, no ground no grass no dirt no cave no crystals, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1200,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_rock_b',
    prompt: `two small warm garden stones side by side, rounded smooth shapes, warm grey-brown tones with tiny green moss patch on top, soft golden sunset highlight on left edges, simple cozy garden pebbles, single group centered on empty canvas, no ground no grass no cave, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1201,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'prop_fence_gate',
    prompt: `white wooden picket fence gate section, small swinging gate between two white fence posts, clean white-painted wood planks with pointed tops, warm golden sunset glow on right side of planks, simple 3-color design white wood with warm brown post caps, matches white picket fence style, isolated single object centered on empty canvas, no ground no sky no grass no iron no metal, ${STYLE}`,
    width: 64, height: 48, noBackground: true, seed: 1210,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
  },
  {
    filename: 'accent_grass_tuft_a',
    prompt: `small cluster of vibrant green grass blades growing upward, 2-3 tones of rich warm green with golden sunset highlight tips on tallest blades, wild natural grass clump, single small object centered on empty canvas, no ground no dirt no soil, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1220,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },

  /* ---- NEW GROUND BLENDING ACCENTS (Phase 5) ---- */
  {
    filename: 'accent_grass_edge_a',
    prompt: `thin horizontal strip of wild grass blades and small wildflowers growing from bottom edge, warm rich green grass with tiny yellow and white flower dots, uneven natural grass edge silhouette, wide thin horizontal strip, no ground no dirt, ${STYLE}`,
    width: 64, height: 24, noBackground: true, seed: 1230,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_grass_edge_b',
    prompt: `thin horizontal strip of tall wild grass and seed heads growing from bottom edge, warm green with golden-tipped seed heads catching sunset light, uneven natural ragged grass silhouette, wide thin horizontal strip, no ground no dirt, ${STYLE}`,
    width: 64, height: 24, noBackground: true, seed: 1231,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_leaf_scatter',
    prompt: `3-4 tiny fallen autumn leaves scattered loosely, warm orange and golden brown tones, simple flat leaf shapes at different angles, small delicate scattered objects centered on empty canvas, no ground no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1240,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
  {
    filename: 'accent_pebble_scatter',
    prompt: `4-5 tiny warm-toned pebbles scattered loosely on empty canvas, warm tan and brown tones with subtle golden highlights, very small simple round stones scattered naturally, no ground no grass no dirt, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1250,
    outDir: 'public/assets/generated/review/environment/outdoor/accents',
  },
];

async function generate(apiKey: string, def: AssetDef): Promise<boolean> {
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
  console.log('Final Cohesion Pass — regenerating mismatched + new blending assets...\n');

  let success = 0;
  let failed = 0;

  for (const def of COHESION_ASSETS) {
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

  console.log(`\nDone: ${success} succeeded, ${failed} failed out of ${COHESION_ASSETS.length} total`);
}

main().catch(console.error);
