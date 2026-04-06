/**
 * Retry the 5 assets marked "fix" in the review report.
 * Improved prompts for better pixel art quality.
 * Run: npx vite-node scripts/retry_fix_assets.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, game asset, clean pixel edges, dark fantasy RPG style, single object centered, transparent background, high contrast, crisp silhouette';
const ICON_STYLE = 'pixel art icon, clean crisp edges, game UI icon, single symbol centered, transparent background, high contrast, bold outline, 16-bit style';
const MATH_STYLE = 'pixel art icon, clean crisp edges, game UI icon, single math symbol centered, transparent background, bold readable, high contrast';

const FIX_ASSETS = [
  {
    filename: 'icon_play_button',
    prompt: `${ICON_STYLE}, bright green triangular play button, simple right-pointing triangle, solid green fill, clean geometric shape`,
    width: 64,
    height: 64,
  },
  {
    filename: 'item_meat',
    prompt: `${STYLE}, cooked meat drumstick on bone, juicy grilled chicken leg, golden brown crispy skin, game food item, appetizing`,
    width: 128,
    height: 128,
  },
  {
    filename: 'item_ball',
    prompt: `${STYLE}, bouncy red rubber ball, shiny round toy ball, simple red sphere with highlight, game play toy`,
    width: 128,
    height: 128,
  },
  {
    filename: 'reward_trophy_silver',
    prompt: `${STYLE}, silver trophy cup on pedestal, second place award trophy, metallic silver shiny, polished cup with handles`,
    width: 128,
    height: 128,
  },
  {
    filename: 'math_divide',
    prompt: `${MATH_STYLE}, blue division sign, obelus symbol, dot slash dot, blue colored math operator, simple and bold`,
    width: 64,
    height: 64,
  },
];

async function main() {
  const reviewDir = path.resolve('public/assets/generated/review');
  fs.mkdirSync(reviewDir, { recursive: true });
  const apiKey = getApiKey();
  let success = 0;
  let failed = 0;

  console.log(`\nRETRYING ${FIX_ASSETS.length} FIX ASSETS (improved prompts)\n`);

  for (const asset of FIX_ASSETS) {
    const outPath = path.join(reviewDir, `${asset.filename}.png`);

    try {
      process.stdout.write(`  ${asset.filename}...`);
      const response = await fetch(PIXELLAB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          description: asset.prompt,
          image_size: { width: asset.width, height: asset.height },
          no_background: true,
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
      success++;
      console.log(` OK (${buf.length}b, $${data.usage.usd})`);
    } catch (err) {
      failed++;
      console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
  if (success > 0) {
    console.log(`\nRetried assets saved to: ${reviewDir}/`);
    console.log('Review them in-game, then copy approved ones to public/assets/generated/final/');
  }
}

main().catch(console.error);
