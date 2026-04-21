/**
 * Generate warm-tavern scene props via PixelLab.
 * Run with: npx vite-node scripts/generate_warm_props.ts
 *
 * Outputs go to public/assets/generated/raw/warm_props/ (originals preserved).
 * After visual QA, keepers are copied to public/assets/generated/final/environment/indoor/warm/props/.
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

// -------------------------------------------------------------------------
// PROMPTS — native pixel sizes, warm tavern palette, 4-color flat pixel-art.
// -------------------------------------------------------------------------
const PROPS: GenOpts[] = [
  {
    name: 'baseboard_warm',
    width: 32,
    height: 16,
    seed: 4201,
    description:
      'Pixel-art seamless horizontal wooden baseboard trim strip, warm tavern wood. 1px top highlight #d4a574, 12px mid-tone wood body #8b5a2b with 2 vertical groove seams, 3px deep shadow bottom #3a2415, 1px black under-line. Must tile seamlessly left to right so left edge continues right edge. Flat pixel art, 3-color palette, crisp 1px edges, no anti-alias, no characters.',
  },
  {
    name: 'candle_warm',
    width: 32,
    height: 48,
    seed: 4202,
    description:
      'Pixel-art single tall ivory taper candle on pewter holder, warm tavern inn. Wax body #e8d9b0 with 1px shadow stripe #b8a678 and drip highlight #fff5d0 at top, pewter round base #3a3a3a with 1px rim highlight #6b6b6b, teardrop flame core #ffd76a plus edge #ff8c3a plus tiny #fff5d0 hot dot. Base at bottom pixel row, flame tip near row 4 with 4px headroom. Transparent background, crisp 1px outlines, no anti-alias, 5-color palette.',
  },
  {
    name: 'ceiling_beam_warm',
    width: 64,
    height: 24,
    seed: 4203,
    description:
      'Pixel-art seamless dark oak ceiling beam running left to right. 2px top shadow #1a0e06, 18px beam body #3a2415 with a darker knot mark every 24px, 2px bottom highlight #5a3a1a, 2px cast shadow below at 50% opacity. Left and right edges tile perfectly. Flat pixel art, 3-color palette, no anti-alias, no characters.',
  },
  {
    name: 'wall_sconce_warm',
    width: 24,
    height: 32,
    seed: 4204,
    description:
      'Pixel-art iron wall-mounted torch bracket for tavern inn. Iron L-bracket #2a2a2a with #4a4a4a rim highlight mounted to left wall, small cup at top holding burning rag, flame teardrop #ffd76a core plus #ff8c3a edge, wisp of dark smoke #5a5a5a rising 4px above flame. Drop shadow #1a0e06 under bracket. Transparent background, 4-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'log_pile_warm',
    width: 48,
    height: 32,
    seed: 4205,
    description:
      'Pixel-art stack of cut firewood logs for tavern hearth. Three logs tan #b8926b on near side, two darker #8b5a2b behind, visible tree-ring circles on each cut end with #6b4423 rings and #3a2415 centers. Pile wider at base and narrower at top. Soft shadow under pile at 50% black opacity. Transparent background, 4-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'fire_tools_warm',
    width: 16,
    height: 48,
    seed: 4206,
    description:
      'Pixel-art wrought-iron fireplace tool set on small round base. Vertical stand #2a2a2a core plus #4a4a4a highlight, circular foot, 2 iron tools (poker with hooked end and shovel) leaning on stand, brass #b8860b cap on each handle. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'mantle_clock_warm',
    width: 32,
    height: 32,
    seed: 4207,
    description:
      'Pixel-art small antique brass mantle clock for tavern. Rectangular wooden case #8b5a2b with arched top, round clock face #e8d9b0 showing black roman numerals and 2 black hands at 10:10, brass trim #b8860b around face. Tiny #3a2415 shadow under base. Transparent background, 5-color palette, crisp 1px outlines.',
  },
  {
    name: 'hanging_lantern_warm',
    width: 32,
    height: 48,
    seed: 4208,
    description:
      'Pixel-art brass hanging lantern on chain for tavern ceiling. 2px chain #6b6b6b running from top to lantern body, rectangular brass frame #b8860b with dark #5a3a00 detail lines, 4 panes of glowing warm yellow glass #ffd76a with brighter #fff5d0 core, small brass cap at bottom. Transparent background, 5-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'pet_cushion_warm',
    width: 48,
    height: 24,
    seed: 4209,
    description:
      'Pixel-art plush round pet cushion bed, top-down oval view. Deep red velvet center #7f1d1d with brighter #b91c1c rim ring, 1px gold braided trim #fbbf24 along outer edge, soft 40 percent black shadow underneath. Transparent background, 4-color palette, crisp 1px outlines.',
  },
  {
    name: 'pet_bowl_food_warm',
    width: 24,
    height: 16,
    seed: 4210,
    description:
      'Pixel-art wooden pet food bowl, 3/4 view. Round dark wood #5a3a1a bowl with #8b5a2b rim highlight, small pile of brown food pellets #6b4423 and #8b5a2b inside, tiny dark shadow under bowl. Transparent background, 3-color palette, crisp 1px outlines.',
  },
  {
    name: 'wooden_stool_warm',
    width: 32,
    height: 32,
    seed: 4211,
    description:
      'Pixel-art round 3-legged wooden stool for tavern. Circular seat top #8b5a2b with #d4a574 highlight ring, 3 visible legs #5a3a1a angled outward, 1px black shadow on floor. Transparent background, 3-color palette, crisp 1px outlines, no anti-alias.',
  },
  {
    name: 'small_barrel_warm',
    width: 32,
    height: 40,
    seed: 4212,
    description:
      'Pixel-art oak barrel with iron bands for tavern storage. Vertical stave pattern alternating #8b5a2b and #6b4423, 3 horizontal iron bands #3a3a3a with #6b6b6b top highlight, slightly wider in middle, circular dark top #3a2415. Shadow under base. Transparent background, 4-color palette, crisp 1px outlines.',
  },
  {
    name: 'framed_tapestry_warm',
    width: 64,
    height: 48,
    seed: 4213,
    description:
      'Pixel-art hanging woven tapestry for tavern wall. Rectangular cloth with ornate pattern: deep #7f1d1d red border, #fbbf24 gold diamond in center with crown motif, #064e3b green accent threads, tasseled bottom edge with 4 small yellow tassels. 2px dark wood rod #3a2415 at top with tie strings. Transparent background, 5-color palette, crisp 1px outlines.',
  },
];

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw/warm_props');
  fs.mkdirSync(rawDir, { recursive: true });

  console.log(`Generating ${PROPS.length} warm-tavern props...`);
  console.log(`Output: ${rawDir}\n`);

  let totalUsd = 0;
  const results: Array<{ name: string; path: string; bytes: number; usd: number }> = [];

  for (const prop of PROPS) {
    try {
      console.log(`[${results.length + 1}/${PROPS.length}] ${prop.name} (${prop.width}x${prop.height})...`);
      const { buf, usd } = await generate(prop);
      const outPath = path.join(rawDir, `${prop.name}.png`);
      fs.writeFileSync(outPath, buf);
      totalUsd += usd;
      results.push({ name: prop.name, path: outPath, bytes: buf.length, usd });
      console.log(`    saved ${buf.length}b · $${usd.toFixed(4)} · running total $${totalUsd.toFixed(4)}`);
    } catch (e) {
      console.error(`    FAILED: ${(e as Error).message}`);
      results.push({ name: prop.name, path: 'FAILED', bytes: 0, usd: 0 });
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Generated ${results.filter((r) => r.path !== 'FAILED').length}/${PROPS.length}`);
  console.log(`Total cost: $${totalUsd.toFixed(4)}`);
  console.log(`\nAll raw outputs in: ${rawDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
