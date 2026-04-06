/**
 * Regenerate 5 rejected assets with improved prompts.
 * Run: npx vite-node scripts/regenerate_rejects.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface Asset {
  name: string;
  prompt: string;
  width: number;
  height: number;
  no_background: boolean;
  seed: number;
}

// Improved prompts for each rejected asset
const REJECTS: Asset[] = [
  {
    name: 'icon_play_button',
    // Original was a messy triangle-in-triangle. Make it a clean circular play button.
    prompt: 'pixel art green circle play button icon, white right-pointing triangle arrow in center of green circle, simple clean game UI button, centered, crisp edges, dark fantasy RPG style',
    width: 64, height: 64, no_background: true, seed: 555,
  },
  {
    name: 'item_meat',
    // Original looked diseased with red spots. Make it a clean appetizing drumstick.
    prompt: 'pixel art golden brown roasted turkey drumstick leg, juicy cooked meat on bone, appetizing game food item, warm brown tones, shiny glaze, single object centered, clean pixel edges',
    width: 128, height: 128, no_background: true, seed: 556,
  },
  {
    name: 'reward_trophy_silver',
    // Original was too small and washed out. Make it bigger and shinier to match gold trophy.
    prompt: 'pixel art shiny silver trophy cup with handles on wooden base, polished chrome silver metallic finish, second place award, bright reflections, large centered, clean pixel edges, dark fantasy RPG game style',
    width: 128, height: 128, no_background: true, seed: 557,
  },
  {
    name: 'math_divide',
    // Original was just a diagonal slash. Make it a proper obelus division symbol.
    prompt: 'pixel art blue division symbol icon, horizontal line with dot above and dot below, obelus math operator sign, bright blue color, bold thick lines, centered, clean pixel edges, game UI icon',
    width: 64, height: 64, no_background: true, seed: 558,
  },
  {
    name: 'math_progress',
    // Original was barely visible thin line. Make it a chunky game-style progress bar.
    prompt: 'pixel art horizontal progress bar icon, thick rounded rectangle bar half filled with bright blue, gray empty portion, game UI loading bar, chunky bold style, centered, clean pixel edges',
    width: 64, height: 64, no_background: true, seed: 559,
  },
];

async function generate(prompt: string, width: number, height: number, no_background: boolean, seed: number): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: prompt,
      image_size: { width, height },
      no_background,
      text_guidance_scale: 12, // slightly higher guidance for more prompt-faithful results
      seed,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  console.log(`  Cost: $${data.usage.usd}`);
  return Buffer.from(data.image.base64, 'base64');
}

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw');
  const finalDir = path.resolve('public/assets/generated/final');

  console.log(`\n=== Regenerating ${REJECTS.length} rejected assets ===\n`);

  for (const asset of REJECTS) {
    console.log(`Regenerating: ${asset.name}...`);
    try {
      const buf = await generate(asset.prompt, asset.width, asset.height, asset.no_background, asset.seed);

      const rawPath = path.join(rawDir, `${asset.name}.png`);
      const finalPath = path.join(finalDir, `${asset.name}.png`);

      fs.writeFileSync(rawPath, buf);
      fs.writeFileSync(finalPath, buf);

      console.log(`  Saved: ${rawPath} (${buf.length} bytes)`);
      console.log(`  Copied to final: ${finalPath}`);
    } catch (err) {
      console.error(`  FAILED: ${asset.name} — ${err}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
