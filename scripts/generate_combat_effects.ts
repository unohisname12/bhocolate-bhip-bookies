/**
 * Generate 12 combat effect images for the battle system.
 * Run: npx vite-node scripts/generate_combat_effects.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface EffectAsset {
  name: string;
  prompt: string;
  width: number;
  height: number;
  seed: number;
}

const COMBAT_EFFECTS: EffectAsset[] = [
  {
    name: 'effect_slash',
    prompt: 'pixel art three diagonal white slash claw marks scratching across screen, sharp scratching strike lines, fast attack swipe trails, bright white on transparent, centered, game combat VFX',
    width: 128, height: 128, seed: 700,
  },
  {
    name: 'effect_slam',
    prompt: 'pixel art ground impact shockwave crater, brown rocks debris flying upward from smash, heavy landing earthquake crack, dust cloud, game combat VFX effect',
    width: 128, height: 128, seed: 701,
  },
  {
    name: 'effect_lightning',
    prompt: 'pixel art bright yellow electric lightning bolt strike, jagged thunderbolt zap with blue sparks, electric discharge, bright glowing, game combat VFX effect',
    width: 128, height: 128, seed: 702,
  },
  {
    name: 'effect_overcharge',
    prompt: 'pixel art massive electric explosion overload, blue and white energy burst with electric arcs radiating outward, system overcharge, intense bright glow, game combat VFX',
    width: 128, height: 128, seed: 703,
  },
  {
    name: 'effect_slime',
    prompt: 'pixel art green slime glob splatter impact, sticky goo splash on surface, dripping green slime blob, translucent, game combat VFX effect',
    width: 128, height: 128, seed: 704,
  },
  {
    name: 'effect_acid',
    prompt: 'pixel art green toxic acid splash with bubbles, corrosive liquid spray, neon green chemical burst, dripping poison, game combat VFX effect',
    width: 128, height: 128, seed: 705,
  },
  {
    name: 'effect_shield_flash',
    prompt: 'pixel art translucent blue hexagonal shield barrier appearing, glowing protective force field wall, energy shield activation flash, bright blue, game combat VFX',
    width: 128, height: 128, seed: 706,
  },
  {
    name: 'effect_absorb',
    prompt: 'pixel art green glowing energy orbs spiraling inward to center, magical absorption vortex, swirling life drain particles converging, game combat VFX',
    width: 128, height: 128, seed: 707,
  },
  {
    name: 'effect_tackle',
    prompt: 'pixel art white impact collision starburst, body slam hit flash, bright star-shaped impact with speed lines, physical hit burst, game combat VFX effect',
    width: 128, height: 128, seed: 708,
  },
  {
    name: 'effect_repair',
    prompt: 'pixel art golden mechanical gear turning with sparkles, wrench and cog repair animation, metallic shine, self-repair robot maintenance, game combat VFX',
    width: 128, height: 128, seed: 709,
  },
  {
    name: 'effect_energy_nova',
    prompt: 'pixel art bright multicolor energy nova explosion expanding outward, radiant circular shockwave burst, powerful release of magical energy, game combat VFX',
    width: 128, height: 128, seed: 710,
  },
  {
    name: 'effect_critical',
    prompt: 'pixel art golden starburst explosion with exclamation mark, critical hit celebration with sparkles and light rays, bright yellow gold, game combat VFX',
    width: 128, height: 128, seed: 711,
  },
];

async function generate(prompt: string, width: number, height: number, seed: number): Promise<Buffer> {
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
      no_background: true,
      text_guidance_scale: 12,
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

  // Ensure dirs exist
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(finalDir, { recursive: true });

  console.log(`\n=== Generating ${COMBAT_EFFECTS.length} combat effect images ===\n`);

  let totalCost = 0;
  let success = 0;
  let failed = 0;

  for (const asset of COMBAT_EFFECTS) {
    console.log(`[${success + failed + 1}/${COMBAT_EFFECTS.length}] ${asset.name}...`);
    try {
      const buf = await generate(asset.prompt, asset.width, asset.height, asset.seed);

      const rawPath = path.join(rawDir, `${asset.name}.png`);
      const finalPath = path.join(finalDir, `${asset.name}.png`);

      fs.writeFileSync(rawPath, buf);
      fs.writeFileSync(finalPath, buf);

      console.log(`  Saved: ${rawPath} (${buf.length} bytes)`);
      success++;
    } catch (err) {
      console.error(`  FAILED: ${asset.name} — ${err}`);
      failed++;
    }
  }

  console.log(`\n=== DONE: ${success} generated, ${failed} failed ===`);
}

main().catch(console.error);
