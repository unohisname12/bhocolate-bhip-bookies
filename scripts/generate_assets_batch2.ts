/**
 * Asset generation batch 2 — 20 new assets filling key gaps.
 * Run: npx vite-node scripts/generate_assets_batch2.ts
 *
 * Generates pixel art via Pixel Lab API to public/assets/generated/raw/
 * Review outputs, then copy keepers to public/assets/generated/final/
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface GenerateOptions {
  description: string;
  width: number;
  height: number;
  no_background?: boolean;
  text_guidance_scale?: number;
  seed?: number;
}

async function generate(opts: GenerateOptions): Promise<Buffer> {
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
      no_background: opts.no_background ?? true,
      text_guidance_scale: opts.text_guidance_scale ?? 10,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
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

async function generateAndSave(name: string, opts: GenerateOptions, outDir: string): Promise<string> {
  console.log(`Generating: ${name}...`);
  const buf = await generate(opts);
  const outPath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`  Saved: ${outPath} (${buf.length} bytes)`);
  return outPath;
}

// Style suffix for consistency across all assets
const STYLE = 'pixel art, clean pixel edges, single object centered, dark fantasy RPG game style';
const SCENE_STYLE = 'pixel art, detailed scene background, dark fantasy RPG game, atmospheric lighting';

interface AssetDef {
  name: string;
  prompt: string;
  width: number;
  height: number;
  no_background: boolean;
  seed: number;
}

const ASSETS: AssetDef[] = [
  // === BATTLE / TRACE EFFECTS (6) ===
  {
    name: 'effect_shield_bubble',
    prompt: `translucent blue magical shield barrier bubble, glowing protective dome, circular energy field with rune symbols, defensive magic aura, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 42,
  },
  {
    name: 'effect_rune_glyph',
    prompt: `glowing purple arcane rune symbol floating in air, magical glyph circle with ancient writing, power-up enchantment, mystical purple energy, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 43,
  },
  {
    name: 'effect_trace_perfect',
    prompt: `golden starburst explosion with sparkles, perfect score celebration burst, radiant gold light rays, shimmering achievement flash, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 44,
  },
  {
    name: 'effect_trace_fail',
    prompt: `gray smoke puff dissipating, fizzle failure cloud, small dim gray mist, fading away, disappointed poof, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 45,
  },
  {
    name: 'icon_shield',
    prompt: `blue steel knight shield with star emblem, protective shield icon, metallic blue, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 46,
  },
  {
    name: 'icon_sword',
    prompt: `golden sword blade pointing up, attack power icon, shining metal sword with gem pommel, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 47,
  },

  // === ENEMY PET PORTRAITS (3) ===
  {
    name: 'pet_slime_baby',
    prompt: `cute green slime creature, baby slime monster with big eyes, jelly blob with happy face, small round, bouncy, adorable RPG enemy, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 50,
  },
  {
    name: 'pet_mech_bot',
    prompt: `small cute robot companion, chibi mech bot with antenna, metallic gray body with blue glowing eyes, round robot with little arms, friendly mechanical creature, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 51,
  },
  {
    name: 'pet_koala_sprite',
    prompt: `wild magical koala creature, small purple koala with sparkle aura, mystical forest spirit koala, fluffy with glowing eyes, cute fantasy animal, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 52,
  },

  // === EGG / EVOLUTION (3) ===
  {
    name: 'egg_default',
    prompt: `large spotted egg on soft nest, colorful speckled egg with blue and purple spots, mysterious creature egg, warm glow, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 60,
  },
  {
    name: 'egg_cracking',
    prompt: `egg with crack lines and light shining through cracks, hatching egg breaking open, golden light from inside, fracture lines on shell, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 61,
  },
  {
    name: 'egg_glowing',
    prompt: `egg glowing brightly with magical aura, radiating energy, about to hatch, intense white-gold glow, pulsing light, floating sparkles, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 62,
  },

  // === SCENE BACKGROUNDS (2) ===
  {
    name: 'scene_battle_arena',
    prompt: `battle arena combat stage, floating island platform with magic circles on ground, stormy sky background with lightning, dramatic purple-blue atmosphere, ${SCENE_STYLE}`,
    width: 320, height: 200, no_background: false, seed: 70,
  },
  {
    name: 'scene_shop_interior',
    prompt: `cozy magical item shop interior, shelves full of potions and items, warm lantern lighting, wooden counter with shopkeeper space, fantasy RPG store, ${SCENE_STYLE}`,
    width: 320, height: 200, no_background: false, seed: 71,
  },

  // === UI ICONS (4) ===
  {
    name: 'icon_settings',
    prompt: `silver metallic gear cog icon, settings mechanical gear wheel, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 80,
  },
  {
    name: 'icon_pvp_swords',
    prompt: `two crossed swords, battle versus PvP icon, golden blades forming X shape, combat challenge symbol, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 81,
  },
  {
    name: 'icon_speed_boot',
    prompt: `winged boot speed icon, golden wing on ankle boot, fast movement, agility symbol, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 82,
  },
  {
    name: 'icon_armor',
    prompt: `steel chestplate armor icon, defensive armor piece, metallic breastplate with trim, ${STYLE}`,
    width: 64, height: 64, no_background: true, seed: 83,
  },

  // === ROOM PROPS (2) ===
  {
    name: 'room_aquarium',
    prompt: `small glass aquarium fish tank with colorful fish inside, bubbles, blue water, glowing, room decoration, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 90,
  },
  {
    name: 'room_trophy_shelf',
    prompt: `wooden display shelf with trophies and medals on it, achievement wall mount, golden cups and ribbons displayed, ${STYLE}`,
    width: 128, height: 128, no_background: true, seed: 91,
  },
];

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw');
  const finalDir = path.resolve('public/assets/generated/final');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(finalDir, { recursive: true });

  let totalCost = 0;
  let success = 0;
  let failed = 0;

  console.log(`\n=== Generating ${ASSETS.length} assets ===\n`);

  for (const asset of ASSETS) {
    try {
      const outPath = await generateAndSave(asset.name, {
        description: asset.prompt,
        width: asset.width,
        height: asset.height,
        no_background: asset.no_background,
        text_guidance_scale: 10,
        seed: asset.seed,
      }, rawDir);

      // Also copy to final/ for immediate use
      const finalPath = path.join(finalDir, `${asset.name}.png`);
      fs.copyFileSync(outPath, finalPath);
      console.log(`  Copied to final: ${finalPath}`);

      success++;
    } catch (err) {
      console.error(`  FAILED: ${asset.name} — ${err}`);
      failed++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${success}/${ASSETS.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  console.log(`Generated in: ${rawDir}`);
  console.log(`Copied to: ${finalDir}`);
}

main().catch(console.error);
