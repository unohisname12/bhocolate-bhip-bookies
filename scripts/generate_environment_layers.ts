/**
 * Generate all environment layer, prop, and accent assets for the
 * layered scene system. Uses Pixel Lab pixflux API.
 *
 * Run:  npx vite-node scripts/generate_environment_layers.ts
 * Args: --outdoor-only | --indoor-only | (default: both)
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

/* ------------------------------------------------------------------ */
/*  Style system — consistent art direction across all assets          */
/* ------------------------------------------------------------------ */

const STYLE = 'pixel art, 16-bit SNES RPG style, clean crisp pixel edges, 2-3 tone cel shading on every surface, warm top-left directional lighting with soft ambient glow, saturated but harmonious palette, no dithering, no blur, no anti-aliasing, no gradients within pixels, cozy modern pixel art game';

const STYLE_NEGATIVE = 'photorealistic, painterly, blurry, noisy, dithered, too much detail, muddy colors, dark, desaturated, anti-aliased, smooth gradients';

/* ------------------------------------------------------------------ */
/*  Asset definitions                                                  */
/* ------------------------------------------------------------------ */

interface AssetDef {
  filename: string;
  prompt: string;
  width: number;
  height: number;
  noBackground: boolean;
  seed: number;
}

/* ---------- OUTDOOR LAYERS ---------- */

const OUTDOOR_LAYERS: AssetDef[] = [
  {
    filename: 'layer_outdoor_sky',
    prompt: `warm sunset sky gradient strip, bright blue at top transitioning to soft peach and golden orange near horizon, 1-2 small fluffy white clouds with warm pink undersides, clean simple shapes, horizontal background strip, ${STYLE}`,
    width: 400, height: 60, noBackground: false, seed: 900,
  },
  {
    filename: 'layer_outdoor_far_bg',
    prompt: `distant rolling green hills landscape strip at sunset, 2-3 soft green tones with warm golden haze at horizon line, gentle rounded hill silhouettes fading into warm atmospheric perspective, horizontal background layer, ${STYLE}`,
    width: 400, height: 60, noBackground: false, seed: 901,
  },
  {
    filename: 'layer_outdoor_mid_bg',
    prompt: `white wooden picket fence line spanning full width with lush green hedges and flowering bushes behind it, small red and pink roses growing on fence, warm sunset glow from behind casting golden light through fence gaps, mid-distance garden layer, horizontal strip, ${STYLE}`,
    width: 400, height: 80, noBackground: false, seed: 902,
  },
  {
    filename: 'layer_outdoor_ground',
    prompt: `bright green grass ground surface with gentle winding brown dirt path through center, vibrant 2-tone green grass on sides with worn earthy brown path in middle, path slightly wider at bottom narrowing toward top, thin brown dirt edge at very bottom, flat terrain, horizontal strip for a game, ${STYLE}`,
    width: 400, height: 48, noBackground: false, seed: 903,
  },
  {
    filename: 'layer_outdoor_below',
    prompt: `underground brown earth and stone cross-section horizontal strip, warm rich brown dirt tones with small embedded grey cobblestones, clean simple texture, not too dark, horizontal strip, ${STYLE}`,
    width: 400, height: 32, noBackground: false, seed: 904,
  },
];

/* ---------- OUTDOOR PROPS ---------- */

const OUTDOOR_PROPS: AssetDef[] = [
  {
    filename: 'prop_cottage',
    prompt: `small cozy stone cottage house with warm glowing yellow-orange windows, wooden door, chimney with wispy smoke, brown shingled roof, warm sunset light from behind casting golden glow on front face, clear readable silhouette, front view, single building centered on empty canvas, no ground, ${STYLE}`,
    width: 128, height: 128, noBackground: true, seed: 910,
  },
  {
    filename: 'prop_mailbox',
    prompt: `cute red mailbox on wooden post with small flag, simple 3-color design, crisp clean edges, single object centered, ${STYLE}`,
    width: 64, height: 64, noBackground: true, seed: 611,
  },
  {
    filename: 'prop_tree_large',
    prompt: `large leafy deciduous tree with round full canopy in 2-3 green tones, thick brown trunk, warm golden sunset highlight on right side of canopy, single tree centered on empty canvas, no ground, ${STYLE}`,
    width: 96, height: 128, noBackground: true, seed: 912,
  },
  {
    filename: 'prop_tree_small',
    prompt: `small young tree sapling with bright green leaves in 2-3 tones, thin brown trunk, simple clean design, single small tree centered, ${STYLE}`,
    width: 64, height: 96, noBackground: true, seed: 613,
  },
  {
    filename: 'prop_bush_a',
    prompt: `simple round green garden bush, 2-3 green tones with highlight on top-left, single bush centered, ${STYLE}`,
    width: 48, height: 32, noBackground: true, seed: 614,
  },
  {
    filename: 'prop_bush_b',
    prompt: `round green bush with small pink flower dots, 2-3 green tones plus pink accents, single flowering bush centered, ${STYLE}`,
    width: 48, height: 32, noBackground: true, seed: 615,
  },
  {
    filename: 'prop_fence_gate',
    prompt: `white wooden picket fence gate section, small swinging gate between two white fence posts, clean white-painted wood planks with pointed tops, warm golden sunset glow on right side of planks, simple 3-color design white wood with warm brown post caps, matches white picket fence style, isolated single object centered on empty canvas, no ground no sky no grass no iron no metal, ${STYLE}`,
    width: 64, height: 48, noBackground: true, seed: 1210,
  },
  {
    filename: 'prop_cloud_a',
    prompt: `fluffy white cumulus cloud with warm pink and peach tones on underside from sunset light, simple rounded shape, 3-tone white-pink-peach, single cloud centered on empty canvas, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 917,
  },
  {
    filename: 'prop_cloud_b',
    prompt: `small wispy white cloud with subtle warm pink sunset tinge on bottom, thin delicate shape, 2-tone white with warm shadow, single small cloud centered on empty canvas, ${STYLE}`,
    width: 48, height: 32, noBackground: true, seed: 918,
  },
];

/* ---------- OUTDOOR ACCENTS ---------- */

const OUTDOOR_ACCENTS: AssetDef[] = [
  {
    filename: 'accent_flowers_red',
    prompt: `tiny cluster of 3-4 bright red flowers with short green stems, simple pixel art wildflower bouquet, isolated single object centered on empty canvas, no ground no dirt no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 820,
  },
  {
    filename: 'accent_flowers_yellow',
    prompt: `tiny cluster of 3-4 bright yellow wildflowers with short green stems, simple pixel art flower bunch, isolated single object centered on empty canvas, no ground no dirt no grass no sky, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 821,
  },
  {
    filename: 'accent_flowers_blue',
    prompt: `tiny cluster of 3-4 bright blue flowers with short green stems, simple pixel art wildflower bunch, isolated single object centered on empty canvas, no ground no dirt no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 822,
  },
  {
    filename: 'accent_rock_a',
    prompt: `one small warm-toned garden pebble stone, rounded smooth shape, 2-tone warm grey and tan shading with golden sunset highlight on top-left edge, simple cozy garden rock, single tiny object centered on empty canvas, no ground no grass no dirt no cave no crystals, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1200,
  },
  {
    filename: 'accent_rock_b',
    prompt: `two small warm garden stones side by side, rounded smooth shapes, warm grey-brown tones with tiny green moss patch on top, soft golden sunset highlight on left edges, simple cozy garden pebbles, single group centered on empty canvas, no ground no grass no cave, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1201,
  },
  {
    filename: 'accent_grass_tuft_a',
    prompt: `small cluster of vibrant green grass blades growing upward, 2-3 tones of rich warm green with golden sunset highlight tips on tallest blades, wild natural grass clump, single small object centered on empty canvas, no ground no dirt no soil, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1220,
  },
  {
    filename: 'accent_grass_tuft_b',
    prompt: `tiny tuft of grass with one small white daisy flower, 3 colors, ground detail, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 626,
  },
  {
    filename: 'accent_mushroom',
    prompt: `small cute red mushroom with white spots, classic toadstool, 3-4 colors total, single tiny mushroom, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 627,
  },
  {
    filename: 'accent_grass_edge_a',
    prompt: `thin horizontal strip of wild grass blades and small wildflowers growing from bottom edge, warm rich green grass with tiny yellow and white flower dots, uneven natural grass edge silhouette, wide thin horizontal strip, no ground no dirt, ${STYLE}`,
    width: 64, height: 24, noBackground: true, seed: 1230,
  },
  {
    filename: 'accent_grass_edge_b',
    prompt: `thin horizontal strip of tall wild grass and seed heads growing from bottom edge, warm green with golden-tipped seed heads catching sunset light, uneven natural ragged grass silhouette, wide thin horizontal strip, no ground no dirt, ${STYLE}`,
    width: 64, height: 24, noBackground: true, seed: 1231,
  },
  {
    filename: 'accent_leaf_scatter',
    prompt: `3-4 tiny fallen autumn leaves scattered loosely, warm orange and golden brown tones, simple flat leaf shapes at different angles, small delicate scattered objects centered on empty canvas, no ground no grass, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1250,
  },
  {
    filename: 'accent_pebble_scatter',
    prompt: `4-5 tiny warm-toned pebbles scattered loosely on empty canvas, warm tan and brown tones with subtle golden highlights, very small simple round stones scattered naturally, no ground no grass no dirt, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 1250,
  },
];

/* ---------- INDOOR LAYERS ---------- */

const INDOOR_LAYERS: AssetDef[] = [
  {
    filename: 'layer_indoor_wall',
    prompt: `cozy room interior wall background strip, warm brown wood panel walls with 2-tone shading, amber highlight from top-left, simple wainscoting trim detail, horizontal strip, ${STYLE}`,
    width: 400, height: 130, noBackground: false, seed: 640,
  },
  {
    filename: 'layer_indoor_floor',
    prompt: `wooden plank floor surface horizontal strip, warm honey-brown hardwood boards with 2-tone shading, lit from left side, seamless, ${STYLE}`,
    width: 400, height: 48, noBackground: false, seed: 641,
  },
  {
    filename: 'layer_indoor_baseboard',
    prompt: `wooden baseboard molding trim strip, dark brown decorative trim, simple 2-color design, thin horizontal strip, ${STYLE}`,
    width: 400, height: 16, noBackground: false, seed: 642,
  },
];

/* ---------- INDOOR PROPS ---------- */

const INDOOR_PROPS: AssetDef[] = [
  {
    filename: 'prop_fireplace',
    prompt: `stone fireplace hearth with warm crackling orange fire, wooden mantle shelf, warm glow radiating from fire, 4-5 colors, front view, ${STYLE}`,
    width: 96, height: 96, noBackground: true, seed: 650,
  },
  {
    filename: 'prop_bookshelf',
    prompt: `tall wooden bookshelf with colorful book spines in simple clean rows, warm brown wood frame, no individual book details just color blocks, front view, ${STYLE}`,
    width: 64, height: 96, noBackground: true, seed: 651,
  },
  {
    filename: 'prop_window',
    prompt: `arched window showing bright blue sky outside, warm wooden frame with cozy curtains pulled aside, sunlight beam coming through, front view, ${STYLE}`,
    width: 64, height: 64, noBackground: true, seed: 652,
  },
  {
    filename: 'prop_door',
    prompt: `simple wooden interior door with arched top and brass door handle, 3 brown tones with golden handle highlight, front view, ${STYLE}`,
    width: 48, height: 80, noBackground: true, seed: 653,
  },
  {
    filename: 'prop_couch',
    prompt: `cozy brown leather couch with soft cushions, strong clear silhouette, 3-4 warm brown tones, front view showing seat and armrests, single furniture piece centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 80, height: 48, noBackground: true, seed: 854,
  },
  {
    filename: 'prop_chair',
    prompt: `wooden armchair with soft green cushion seat, simple readable furniture shape, 3-4 colors, front view, single chair centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 40, height: 48, noBackground: true, seed: 855,
  },
  {
    filename: 'prop_table',
    prompt: `small round wooden side table with simple glowing desk lamp on top, clean pixel art design, 3-4 warm colors, front view, single furniture piece centered on empty canvas, no wall no floor no room background, ${STYLE}`,
    width: 56, height: 40, noBackground: true, seed: 856,
  },
  {
    filename: 'prop_shelf_wall',
    prompt: `wall-mounted wooden shelf with small potted green plant and framed photo, simple clean design, front view, ${STYLE}`,
    width: 48, height: 32, noBackground: true, seed: 657,
  },
  {
    filename: 'prop_clock',
    prompt: `grandfather clock with warm wooden case, simple face design, pendulum detail, 3-4 brown tones, front view, ${STYLE}`,
    width: 32, height: 48, noBackground: true, seed: 658,
  },
  {
    filename: 'prop_toy_box',
    prompt: `wooden toy chest with lid slightly open, colorful toys peeking out, simple shapes, 4-5 bright colors, ${STYLE}`,
    width: 48, height: 36, noBackground: true, seed: 659,
  },
  {
    filename: 'prop_painting',
    prompt: `small framed landscape painting on wall, simple gold frame, mountain scene inside in 3-4 colors, front view, ${STYLE}`,
    width: 40, height: 32, noBackground: true, seed: 660,
  },
  {
    filename: 'prop_plant_pot',
    prompt: `potted green leafy houseplant in round ceramic pot, simple 3-color design, single indoor plant centered, ${STYLE}`,
    width: 32, height: 40, noBackground: true, seed: 661,
  },
];

/* ---------- INDOOR ACCENTS ---------- */

const INDOOR_ACCENTS: AssetDef[] = [
  {
    filename: 'accent_rug_large',
    prompt: `ornate oval area rug on floor seen from low side angle, warm red and gold decorative pattern visible, thin foreshortened oval shape with fringe edges, cozy floor decoration, 4-5 colors, single object centered on empty canvas, no floor texture, ${STYLE}`,
    width: 128, height: 48, noBackground: true, seed: 870,
  },
  {
    filename: 'accent_rug_small',
    prompt: `small woven brown and cream striped doormat on floor seen from low side angle, thin foreshortened rectangle, simple 3-color woven pattern, no text no words, single object centered on empty canvas, no floor texture, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 871,
  },
  {
    filename: 'accent_pet_bed',
    prompt: `soft round pet bed cushion from three-quarter front view, blue fabric with white trim edge visible, cozy plush oval shape, 3-4 colors, single object centered on empty canvas, no floor no background, ${STYLE}`,
    width: 64, height: 32, noBackground: true, seed: 872,
  },
  {
    filename: 'accent_food_bowl',
    prompt: `small ceramic pet food bowl with kibble inside, light blue bowl with warm brown kibble, three-quarter front view showing bowl rim and interior, simple 3-color design, single object centered on empty canvas, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 883,
  },
  {
    filename: 'accent_toy_ball',
    prompt: `small colorful rubber bouncy ball, red and blue stripes, 3 colors, single round toy centered, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 674,
  },
  {
    filename: 'accent_slippers',
    prompt: `pair of cozy pink fluffy house slippers from low front angle, soft round shapes, 3 colors, single pair centered on empty canvas, no floor, ${STYLE}`,
    width: 32, height: 32, noBackground: true, seed: 875,
  },
];

/* ------------------------------------------------------------------ */
/*  Generation logic                                                   */
/* ------------------------------------------------------------------ */

async function generateAsset(
  apiKey: string,
  asset: AssetDef,
  outPath: string,
): Promise<{ ok: boolean; cost: number }> {
  try {
    process.stdout.write(`  ${asset.filename} (${asset.width}×${asset.height})...`);

    const response = await fetch(PIXELLAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: asset.prompt,
        negative_description: STYLE_NEGATIVE,
        image_size: { width: asset.width, height: asset.height },
        no_background: asset.noBackground,
        text_guidance_scale: 12,
        seed: asset.seed,
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
    fs.writeFileSync(outPath, buf);
    console.log(` OK (${buf.length}b, $${data.usage.usd.toFixed(3)})`);
    return { ok: true, cost: data.usage.usd };
  } catch (err) {
    console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    return { ok: false, cost: 0 };
  }
}

async function runBatch(
  apiKey: string,
  label: string,
  assets: AssetDef[],
  outDir: string,
): Promise<{ success: number; failed: number; cost: number }> {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n── ${label} (${assets.length} assets) → ${outDir}\n`);

  let success = 0;
  let failed = 0;
  let totalCost = 0;

  for (const asset of assets) {
    const outPath = path.join(outDir, `${asset.filename}.png`);
    let result = await generateAsset(apiKey, asset, outPath);

    // Retry once on failure
    if (!result.ok) {
      console.log('    ↳ retrying...');
      result = await generateAsset(apiKey, asset, outPath);
    }

    if (result.ok) success++;
    else failed++;
    totalCost += result.cost;
  }

  console.log(`  → ${success} ok, ${failed} failed, $${totalCost.toFixed(3)}`);
  return { success, failed, cost: totalCost };
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const outdoorOnly = args.includes('--outdoor-only');
  const indoorOnly = args.includes('--indoor-only');

  const apiKey = getApiKey();
  const reviewBase = path.resolve('public/assets/generated/review/environment');

  const totals = { success: 0, failed: 0, cost: 0 };

  const add = (r: { success: number; failed: number; cost: number }) => {
    totals.success += r.success;
    totals.failed += r.failed;
    totals.cost += r.cost;
  };

  if (!indoorOnly) {
    add(await runBatch(apiKey, 'Outdoor Layers',  OUTDOOR_LAYERS,  path.join(reviewBase, 'outdoor/layers')));
    add(await runBatch(apiKey, 'Outdoor Props',   OUTDOOR_PROPS,   path.join(reviewBase, 'outdoor/props')));
    add(await runBatch(apiKey, 'Outdoor Accents', OUTDOOR_ACCENTS, path.join(reviewBase, 'outdoor/accents')));
  }

  if (!outdoorOnly) {
    add(await runBatch(apiKey, 'Indoor Layers',  INDOOR_LAYERS,  path.join(reviewBase, 'indoor/layers')));
    add(await runBatch(apiKey, 'Indoor Props',   INDOOR_PROPS,   path.join(reviewBase, 'indoor/props')));
    add(await runBatch(apiKey, 'Indoor Accents', INDOOR_ACCENTS, path.join(reviewBase, 'indoor/accents')));
  }

  console.log('\n════════════════════════════════════════');
  console.log(`TOTAL: ${totals.success} ok, ${totals.failed} failed, $${totals.cost.toFixed(3)}`);
  console.log(`Review: ${reviewBase}/`);
  console.log('Promote approved to public/assets/generated/final/environment/');
  console.log('════════════════════════════════════════\n');
}

main().catch(console.error);
