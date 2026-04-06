/**
 * Retry failed assets from batch generation.
 * Run: npx vite-node scripts/retry_failed.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, game asset, clean pixel edges, dark fantasy RPG style, single object centered, transparent background';
const ICON_STYLE = 'pixel art icon, clean crisp edges, game UI icon, single symbol centered, transparent background';
const EFFECT_STYLE = 'pixel art visual effect, game VFX, glowing, transparent background';

const FAILED = [
  { filename: 'item_golden_apple', prompt: `${STYLE}, golden shining apple, rare legendary fruit, glowing gold`, width: 128, height: 128 },
  { filename: 'item_snack_pack', prompt: `${STYLE}, small bag of mixed snacks, chip bag, game food item`, width: 128, height: 128 },
  { filename: 'item_bandage', prompt: `${STYLE}, rolled white bandage wrap with red cross, first aid`, width: 128, height: 128 },
  { filename: 'item_healing_kit', prompt: `${STYLE}, white first aid kit box with red cross, medical bag`, width: 128, height: 128 },
  { filename: 'reward_trophy_bronze', prompt: `${STYLE}, bronze trophy cup, third place award, copper color`, width: 128, height: 128 },
  { filename: 'reward_trophy_diamond', prompt: `${STYLE}, diamond crystal trophy on pedestal, epic glowing blue-white diamond, legendary`, width: 128, height: 128 },
  { filename: 'reward_legendary_token', prompt: `${STYLE}, legendary golden glowing token, radiant currency, epic sparkle`, width: 128, height: 128 },
  { filename: 'room_carpet', prompt: `${STYLE}, ornate red carpet rug, decorative floor mat, top-down view`, width: 128, height: 128 },
  { filename: 'room_toy_box', prompt: `${STYLE}, colorful toy chest box, open lid showing toys inside`, width: 128, height: 128 },
  { filename: 'effect_sparkle', prompt: `${EFFECT_STYLE}, bright white sparkle star burst, shining`, width: 128, height: 128 },
  { filename: 'effect_glow', prompt: `${EFFECT_STYLE}, soft white circular glow aura, radiant light`, width: 128, height: 128 },
  { filename: 'effect_smoke', prompt: `${EFFECT_STYLE}, gray smoke puff cloud, dissipating mist`, width: 128, height: 128 },
  { filename: 'effect_fire', prompt: `${EFFECT_STYLE}, burning fire flames, orange red fire, blazing`, width: 128, height: 128 },
  { filename: 'math_timer', prompt: `${ICON_STYLE}, hourglass sand timer, countdown clock, time`, width: 64, height: 64 },
];

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw');
  const apiKey = getApiKey();
  let success = 0;
  let failed = 0;

  console.log(`\nRETRYING ${FAILED.length} FAILED ASSETS\n`);

  for (const asset of FAILED) {
    const outPath = path.join(rawDir, `${asset.filename}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`SKIP (exists): ${asset.filename}`);
      success++;
      continue;
    }

    try {
      process.stdout.write(`${asset.filename}...`);
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
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
      const buf = Buffer.from(data.image.base64, 'base64');
      fs.writeFileSync(outPath, buf);
      success++;
      console.log(` OK (${buf.length}b)`);
    } catch (err) {
      failed++;
      console.log(` FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
}

main().catch(console.error);
