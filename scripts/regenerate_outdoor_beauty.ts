/**
 * Outdoor beauty pass — regenerate all 5 outdoor layers and optional
 * props to match the warm sunset cozy yard reference image.
 *
 * Run: npx vite-node scripts/regenerate_outdoor_beauty.ts
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

const BEAUTY_PASS: RetryDef[] = [
  /* ---- OUTDOOR LAYERS (warm sunset mood) ---- */
  {
    filename: 'layer_outdoor_sky',
    prompt: `warm sunset sky gradient strip, bright blue at top transitioning to soft peach and golden orange near horizon, 1-2 small fluffy white clouds with warm pink undersides, clean simple shapes, horizontal background strip, ${STYLE}`,
    width: 400, height: 60, noBackground: false, seed: 900,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },
  {
    filename: 'layer_outdoor_far_bg',
    prompt: `distant rolling green hills landscape strip at sunset, 2-3 soft green tones with warm golden haze at horizon line, gentle rounded hill silhouettes fading into warm atmospheric perspective, horizontal background layer, ${STYLE}`,
    width: 400, height: 60, noBackground: false, seed: 901,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },
  {
    filename: 'layer_outdoor_mid_bg',
    prompt: `white wooden picket fence line spanning full width with lush green hedges and flowering bushes behind it, small red and pink roses growing on fence, warm sunset glow from behind casting golden light through fence gaps, mid-distance garden layer, horizontal strip, ${STYLE}`,
    width: 400, height: 80, noBackground: false, seed: 902,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },
  {
    filename: 'layer_outdoor_ground',
    prompt: `bright green grass ground surface with gentle winding brown dirt path through center, vibrant 2-tone green grass on sides with worn earthy brown path in middle, path slightly wider at bottom narrowing toward top, thin brown dirt edge at very bottom, flat terrain, horizontal strip for a game, ${STYLE}`,
    width: 400, height: 48, noBackground: false, seed: 903,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },
  {
    filename: 'layer_outdoor_below',
    prompt: `underground brown earth and stone cross-section horizontal strip, warm rich brown dirt tones with small embedded grey cobblestones, clean simple texture, not too dark, horizontal strip, ${STYLE}`,
    width: 400, height: 32, noBackground: false, seed: 904,
    outDir: 'public/assets/generated/review/environment/outdoor/layers',
  },

  /* ---- SUNSET-WARMED CLOUDS ---- */
  {
    filename: 'prop_cloud_a',
    prompt: `fluffy white cumulus cloud with warm pink and peach tones on underside from sunset light, simple rounded shape, 3-tone white-pink-peach, single cloud centered on empty canvas, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 917,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
  },
  {
    filename: 'prop_cloud_b',
    prompt: `small wispy white cloud with subtle warm pink sunset tinge on bottom, thin delicate shape, 2-tone white with warm shadow, single small cloud centered on empty canvas, ${STYLE}`,
    width: 48, height: 32, noBackground: true, seed: 918,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
  },

  /* ---- SUNSET-WARMED PROPS (conditional — included to have them ready) ---- */
  {
    filename: 'prop_cottage',
    prompt: `small cozy stone cottage house with warm glowing yellow-orange windows, wooden door, chimney with wispy smoke, brown shingled roof, warm sunset light from behind casting golden glow on front face, clear readable silhouette, front view, single building centered on empty canvas, no ground, ${STYLE}`,
    width: 128, height: 128, noBackground: true, seed: 910,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
  },
  {
    filename: 'prop_tree_large',
    prompt: `large leafy deciduous tree with round full canopy in 2-3 green tones, thick brown trunk, warm golden sunset highlight on right side of canopy, single tree centered on empty canvas, no ground, ${STYLE}`,
    width: 96, height: 128, noBackground: true, seed: 912,
    outDir: 'public/assets/generated/review/environment/outdoor/props',
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
  console.log('Outdoor beauty pass — regenerating layers and props for sunset reference...\n');

  let success = 0;
  let failed = 0;

  for (const def of BEAUTY_PASS) {
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

  console.log(`\nDone: ${success} succeeded, ${failed} failed out of ${BEAUTY_PASS.length} total`);
}

main().catch(console.error);
