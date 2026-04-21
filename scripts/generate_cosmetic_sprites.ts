/**
 * Generate pixel-art cosmetic sprites via PixelLab.
 * Run with: npx vite-node scripts/generate_cosmetic_sprites.ts
 *
 * Outputs go to public/assets/generated/raw/cosmetics/. Originals preserved.
 * After visual QA, keepers are copied to public/assets/cosmetics/ and the
 * COSMETICS entries in src/config/cosmeticConfig.ts are hand-swapped to
 * point at the PNG path instead of the emoji glyph.
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
  /** Matches the COSMETICS id so final swap is obvious. */
  name: string;
  description: string;
  width: number;
  height: number;
  seed: number;
}

async function generate(opts: GenOpts): Promise<{ buf: Buffer; usd: number }> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: opts.description,
      image_size: { width: opts.width, height: opts.height },
      no_background: true,
      text_guidance_scale: 10,
      seed: opts.seed,
    }),
  });
  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }
  const data = (await response.json()) as {
    usage: { usd: number };
    image: { base64: string };
  };
  return { buf: Buffer.from(data.image.base64, 'base64'), usd: data.usage.usd };
}

const COSMETICS: GenOpts[] = [
  {
    name: 'cos_cozy_cap',
    width: 36, height: 36, seed: 5101,
    description:
      'Pixel-art knitted beanie hat, warm wool #b8522b cap body with folded brim #8b3a1a, tiny highlight stitch line #d97a4a. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'cos_party_hat',
    width: 36, height: 36, seed: 5102,
    description:
      'Pixel-art conical party hat, #ec4899 body with white #ffffff zigzag trim at base, small #fde047 pompom on top, 1px darker #be185d shadow side. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_star_beret',
    width: 32, height: 32, seed: 5103,
    description:
      'Pixel-art soft blue beret, round #2563eb cap with 1px #1e3a8a shadow under rim, small #fde047 star shape stitched on front. Transparent background, 3-color palette, crisp 1px outlines.',
  },
  {
    name: 'cos_witch_hat',
    width: 44, height: 44, seed: 5104,
    description:
      'Pixel-art witch hat, tall pointy black #1a0a2b cone with wide brim, purple #7c3aed band around base, gold #fde047 star buckle. Transparent background, 4-color palette, crisp 1px outlines.',
  },
  {
    name: 'cos_season_crown',
    width: 38, height: 38, seed: 5105,
    description:
      'Pixel-art golden crown with 5 points, rich #fbbf24 body with 1px #d97706 shadow, 3 red #dc2626 gem inlays across band, tiny white #fff5d0 sparkle on tallest point. Transparent background, 4-color palette.',
  },
  {
    name: 'cos_sun_shades',
    width: 30, height: 18, seed: 5201,
    description:
      'Pixel-art horizontal sunglasses, thick #1a0a0a frame with two dark #0a0a1a lens squares connected by bridge, tiny white #ffffff glint on upper-left lens. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_3d_glasses',
    width: 30, height: 18, seed: 5202,
    description:
      'Pixel-art horizontal 3D movie glasses, black #1a0a0a frame, left lens #dc2626 red, right lens #2563eb blue, small white #ffffff highlight. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_eye_patch',
    width: 28, height: 28, seed: 5203,
    description:
      'Pixel-art pirate eye patch, black #0a0a0a oval pad with 1px #3a3a3a rim, thin dark strap line crossing diagonally. Transparent background, 2-color palette, crisp 1px outlines.',
  },
  {
    name: 'cos_red_collar',
    width: 28, height: 14, seed: 5301,
    description:
      'Pixel-art horizontal red #dc2626 pet collar band with 1px #7f1d1d shadow line, gold #fbbf24 round buckle centered, tiny heart tag. Transparent background, 3-color palette.',
  },
  {
    name: 'cos_bell_collar',
    width: 28, height: 14, seed: 5302,
    description:
      'Pixel-art horizontal brown #5a3a1a pet collar with gold #fbbf24 round bell hanging at center front, 1px darker #3a2415 shadow along bottom. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_flower_crown',
    width: 34, height: 18, seed: 5401,
    description:
      'Pixel-art flower crown headband, thin green #16a34a vine with 5 alternating #ec4899 pink and #fbbf24 yellow flowers along top, tiny white #ffffff dot centers. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_pirate_hat',
    width: 42, height: 28, seed: 5402,
    description:
      'Pixel-art pirate tricorne hat, black #0a0a0a body with gold #fbbf24 trim along edges, white #ffffff skull and crossbones centered on front. Transparent background, 3-color palette.',
  },
  {
    name: 'cos_chef_hat',
    width: 38, height: 38, seed: 5403,
    description:
      'Pixel-art tall chef toque hat, puffy white #f8fafc body with soft #cbd5e1 shadow folds, thin gray #94a3b8 band around base. Transparent background, 3-color palette, crisp 1px outlines.',
  },
  {
    name: 'cos_heart_glasses',
    width: 30, height: 18, seed: 5404,
    description:
      'Pixel-art horizontal heart-shaped sunglasses, #ec4899 pink frame in two heart silhouettes, dark #0a0a0a lenses, tiny white #ffffff sparkle on upper-right. Transparent background, crisp 1px outlines.',
  },
  {
    name: 'cos_scarf_red',
    width: 32, height: 18, seed: 5405,
    description:
      'Pixel-art knitted red #dc2626 scarf wrap around a neck area, tied with dangling ends on one side, 1px darker #7f1d1d shadow at folds and tiny #f87171 highlight stripes for knit texture. Transparent background, 3-color palette.',
  },
];

async function main() {
  const outDir = path.resolve('public/assets/generated/raw/cosmetics');
  fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  const manifest: Array<{ name: string; file: string; usd: number }> = [];
  for (const opts of COSMETICS) {
    const outPath = path.join(outDir, `${opts.name}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`SKIP (exists): ${opts.name}`);
      continue;
    }
    try {
      console.log(`GEN: ${opts.name} @ ${opts.width}x${opts.height}`);
      const { buf, usd } = await generate(opts);
      fs.writeFileSync(outPath, buf);
      total += usd;
      manifest.push({ name: opts.name, file: outPath, usd });
      console.log(`  → ${outPath}  (\$${usd.toFixed(4)})`);
    } catch (err) {
      console.error(`  FAIL: ${opts.name}`, err);
    }
  }
  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({ totalUsd: total, items: manifest }, null, 2),
  );
  console.log(`\nDone. Total cost \$${total.toFixed(4)}.`);
  console.log('Next: QA the PNGs, copy keepers to public/assets/cosmetics/,');
  console.log('then update COSMETICS.icon in src/config/cosmeticConfig.ts.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
