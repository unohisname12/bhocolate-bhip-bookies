/**
 * Batch asset generation — generates ~100 non-character pixel art assets.
 * Run: npx vite-node scripts/batch_generate.ts
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
  filename: string;
  prompt: string;
  width: number;
  height: number;
}

async function generate(description: string, width: number, height: number): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description,
      image_size: { width, height },
      no_background: true,
      text_guidance_scale: 10,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  return Buffer.from(data.image.base64, 'base64');
}

const STYLE = 'pixel art, game asset, clean pixel edges, dark fantasy RPG style, single object centered, transparent background';
const ICON_STYLE = 'pixel art icon, clean crisp edges, game UI icon, single symbol centered, transparent background';
const EFFECT_STYLE = 'pixel art visual effect, game VFX, glowing, transparent background';

const ASSETS: Asset[] = [
  // === UI / ICONS (15) ===
  { filename: 'icon_token', prompt: `${ICON_STYLE}, golden energy token, lightning bolt on coin, glowing yellow`, width: 64, height: 64 },
  { filename: 'icon_coin', prompt: `${ICON_STYLE}, shiny gold coin with star emblem, round currency`, width: 64, height: 64 },
  { filename: 'icon_ticket', prompt: `${ICON_STYLE}, golden battle ticket pass, admission stub with star, torn edge`, width: 64, height: 64 },
  { filename: 'icon_heart', prompt: `${ICON_STYLE}, red pixel heart, health icon, glowing red`, width: 64, height: 64 },
  { filename: 'icon_energy', prompt: `${ICON_STYLE}, blue energy bolt, stamina lightning, electric blue`, width: 64, height: 64 },
  { filename: 'icon_hunger', prompt: `${ICON_STYLE}, cooked drumstick leg, food hunger indicator, brown meat`, width: 64, height: 64 },
  { filename: 'icon_clean', prompt: `${ICON_STYLE}, sparkling soap bubble, cleanliness indicator, blue sparkle`, width: 64, height: 64 },
  { filename: 'icon_streak_flame', prompt: `${ICON_STYLE}, orange fire flame, streak counter, blazing hot`, width: 64, height: 64 },
  { filename: 'icon_play_button', prompt: `${ICON_STYLE}, green play triangle button, start arrow`, width: 64, height: 64 },
  { filename: 'icon_back_button', prompt: `${ICON_STYLE}, white left arrow, back navigation, simple arrow`, width: 64, height: 64 },
  { filename: 'icon_confirm_button', prompt: `${ICON_STYLE}, green checkmark circle, confirm yes button`, width: 64, height: 64 },
  { filename: 'icon_cancel_button', prompt: `${ICON_STYLE}, red X circle, cancel no button, close`, width: 64, height: 64 },
  { filename: 'icon_warning', prompt: `${ICON_STYLE}, yellow warning triangle, exclamation mark, alert`, width: 64, height: 64 },
  { filename: 'icon_info', prompt: `${ICON_STYLE}, blue info circle, information i symbol`, width: 64, height: 64 },
  { filename: 'icon_star', prompt: `${ICON_STYLE}, golden five point star, shining achievement star`, width: 64, height: 64 },

  // === FOOD / ITEMS (20) ===
  { filename: 'item_apple', prompt: `${STYLE}, red apple with green leaf, shiny fruit, game food item`, width: 128, height: 128 },
  { filename: 'item_meat', prompt: `${STYLE}, cooked meat drumstick, juicy grilled leg, game food item`, width: 128, height: 128 },
  { filename: 'item_cake', prompt: `${STYLE}, slice of strawberry cake, pink frosting, game food item`, width: 128, height: 128 },
  { filename: 'item_potion', prompt: `${STYLE}, healing potion bottle, glass flask blue-green liquid, cork stopper`, width: 128, height: 128 },
  { filename: 'item_berry', prompt: `${STYLE}, cluster of purple berries, small fruit, game food item`, width: 128, height: 128 },
  { filename: 'item_bread', prompt: `${STYLE}, loaf of golden bread, fresh baked, game food item`, width: 128, height: 128 },
  { filename: 'item_fish', prompt: `${STYLE}, cooked whole fish on plate, game food item`, width: 128, height: 128 },
  { filename: 'item_milk', prompt: `${STYLE}, glass bottle of white milk, dairy drink, game food item`, width: 128, height: 128 },
  { filename: 'item_honey', prompt: `${STYLE}, jar of golden honey with dipper, game food item`, width: 128, height: 128 },
  { filename: 'item_cheese', prompt: `${STYLE}, wedge of yellow cheese with holes, game food item`, width: 128, height: 128 },
  { filename: 'item_carrot', prompt: `${STYLE}, orange carrot with green top, vegetable, game food item`, width: 128, height: 128 },
  { filename: 'item_mushroom', prompt: `${STYLE}, red spotted mushroom, magical toadstool, game food item`, width: 128, height: 128 },
  { filename: 'item_energy_drink', prompt: `${STYLE}, glowing energy drink can, neon blue, game consumable`, width: 128, height: 128 },
  { filename: 'item_magic_food', prompt: `${STYLE}, glowing rainbow magical food, enchanted sparkly treat`, width: 128, height: 128 },
  { filename: 'item_golden_apple', prompt: `${STYLE}, golden shining apple, rare legendary fruit, glowing gold`, width: 128, height: 128 },
  { filename: 'item_rotten_food', prompt: `${STYLE}, rotten green moldy food, spoiled garbage, flies buzzing`, width: 128, height: 128 },
  { filename: 'item_rare_meat', prompt: `${STYLE}, glowing purple rare steak, magical meat, premium food`, width: 128, height: 128 },
  { filename: 'item_super_potion', prompt: `${STYLE}, large glowing red super potion, ornate bottle, powerful`, width: 128, height: 128 },
  { filename: 'item_snack_pack', prompt: `${STYLE}, small bag of mixed snacks, chip bag, game food item`, width: 128, height: 128 },
  { filename: 'item_fruit_bowl', prompt: `${STYLE}, wooden bowl full of mixed colorful fruits, game food item`, width: 128, height: 128 },

  // === TOYS / CARE (10) ===
  { filename: 'item_ball', prompt: `${STYLE}, bouncy red rubber ball, toy, game play item`, width: 128, height: 128 },
  { filename: 'item_teddy_bear', prompt: `${STYLE}, brown stuffed teddy bear, plush toy, cute`, width: 128, height: 128 },
  { filename: 'item_rope', prompt: `${STYLE}, coiled rope toy, tug rope, braided play toy`, width: 128, height: 128 },
  { filename: 'item_toy_block', prompt: `${STYLE}, colorful wooden toy block, letter block, children toy`, width: 128, height: 128 },
  { filename: 'item_squeaky_toy', prompt: `${STYLE}, yellow rubber duck squeaky toy, bath toy`, width: 128, height: 128 },
  { filename: 'item_training_whistle', prompt: `${STYLE}, silver metal whistle on lanyard, training tool`, width: 128, height: 128 },
  { filename: 'item_brush', prompt: `${STYLE}, wooden grooming brush, pet care tool, bristle brush`, width: 128, height: 128 },
  { filename: 'item_soap', prompt: `${STYLE}, bar of blue soap with bubbles, cleaning item`, width: 128, height: 128 },
  { filename: 'item_towel', prompt: `${STYLE}, folded fluffy white towel, care item`, width: 128, height: 128 },
  { filename: 'item_bed', prompt: `${STYLE}, cozy pet bed with pillow, round cushion bed, soft`, width: 128, height: 128 },

  // === MEDICINE (5) ===
  { filename: 'item_bandage', prompt: `${STYLE}, rolled white bandage wrap with red cross, first aid`, width: 128, height: 128 },
  { filename: 'item_pill', prompt: `${STYLE}, red and white capsule pill, medicine tablet`, width: 128, height: 128 },
  { filename: 'item_medicine_bottle', prompt: `${STYLE}, brown medicine bottle with label, pharmacy bottle`, width: 128, height: 128 },
  { filename: 'item_syringe', prompt: `${STYLE}, medical syringe with blue liquid, injection needle`, width: 128, height: 128 },
  { filename: 'item_healing_kit', prompt: `${STYLE}, white first aid kit box with red cross, medical bag`, width: 128, height: 128 },

  // === REWARDS (15) ===
  { filename: 'reward_trophy_bronze', prompt: `${STYLE}, bronze trophy cup, third place award, copper color`, width: 128, height: 128 },
  { filename: 'reward_trophy_silver', prompt: `${STYLE}, silver trophy cup, second place award, shiny silver`, width: 128, height: 128 },
  { filename: 'reward_trophy_gold', prompt: `${STYLE}, golden trophy cup with handles, first place award, shiny gold`, width: 128, height: 128 },
  { filename: 'reward_trophy_diamond', prompt: `${STYLE}, diamond crystal trophy on pedestal, epic glowing blue-white diamond, legendary`, width: 128, height: 128 },
  { filename: 'reward_chest', prompt: `${STYLE}, wooden treasure chest, open showing gold inside, reward loot`, width: 128, height: 128 },
  { filename: 'reward_box', prompt: `${STYLE}, wrapped gift box with ribbon bow, purple present, reward`, width: 128, height: 128 },
  { filename: 'reward_gem_blue', prompt: `${STYLE}, blue sapphire gemstone, cut jewel, shiny`, width: 128, height: 128 },
  { filename: 'reward_gem_red', prompt: `${STYLE}, red ruby gemstone, cut jewel, glowing red`, width: 128, height: 128 },
  { filename: 'reward_gem_green', prompt: `${STYLE}, green emerald gemstone, cut jewel, shiny green`, width: 128, height: 128 },
  { filename: 'reward_gem_purple', prompt: `${STYLE}, purple amethyst gemstone, cut jewel, glowing purple`, width: 128, height: 128 },
  { filename: 'reward_coin_stack', prompt: `${STYLE}, stack of gold coins, pile of money, treasure`, width: 128, height: 128 },
  { filename: 'reward_ticket_bundle', prompt: `${STYLE}, bundle of golden tickets tied with ribbon, multiple passes`, width: 128, height: 128 },
  { filename: 'reward_rare_token', prompt: `${STYLE}, glowing purple rare token coin, magical currency, shimmering`, width: 128, height: 128 },
  { filename: 'reward_legendary_token', prompt: `${STYLE}, legendary golden glowing token, radiant currency, epic sparkle`, width: 128, height: 128 },
  { filename: 'reward_achievement_badge', prompt: `${STYLE}, golden achievement badge medal, star in center, ribbon`, width: 128, height: 128 },

  // === ROOM PROPS (15) ===
  { filename: 'room_plant', prompt: `${STYLE}, small potted green houseplant, clay pot, room decoration`, width: 128, height: 128 },
  { filename: 'room_lamp', prompt: `${STYLE}, warm glowing desk lamp, table lamp with shade, cozy light`, width: 128, height: 128 },
  { filename: 'room_carpet', prompt: `${STYLE}, ornate red carpet rug, decorative floor mat, top-down view`, width: 128, height: 128 },
  { filename: 'room_painting', prompt: `${STYLE}, framed landscape painting, hanging wall art, ornate gold frame`, width: 128, height: 128 },
  { filename: 'room_chair', prompt: `${STYLE}, wooden chair with cushion, cozy seat, furniture`, width: 128, height: 128 },
  { filename: 'room_table', prompt: `${STYLE}, small wooden round table, furniture, room prop`, width: 128, height: 128 },
  { filename: 'room_window', prompt: `${STYLE}, window with curtains showing night sky, moonlight, room prop`, width: 128, height: 128 },
  { filename: 'room_bedroom_item', prompt: `${STYLE}, small nightstand with candle, bedroom furniture, cozy`, width: 128, height: 128 },
  { filename: 'room_shelf', prompt: `${STYLE}, wooden wall shelf with items, bookshelf, storage`, width: 128, height: 128 },
  { filename: 'room_books', prompt: `${STYLE}, stack of colorful books, pile of books, knowledge`, width: 128, height: 128 },
  { filename: 'room_rug', prompt: `${STYLE}, round blue decorative rug, floor mat, cozy`, width: 128, height: 128 },
  { filename: 'room_poster', prompt: `${STYLE}, colorful wall poster, motivational art, pinned to wall`, width: 128, height: 128 },
  { filename: 'room_clock', prompt: `${STYLE}, round wall clock, analog clock with numbers, time`, width: 128, height: 128 },
  { filename: 'room_toy_box', prompt: `${STYLE}, colorful toy chest box, open lid showing toys inside`, width: 128, height: 128 },
  { filename: 'room_food_bowl', prompt: `${STYLE}, pet food bowl, ceramic dish with food, round bowl`, width: 128, height: 128 },

  // === EFFECTS (10) ===
  { filename: 'effect_sparkle', prompt: `${EFFECT_STYLE}, bright white sparkle star burst, shining`, width: 128, height: 128 },
  { filename: 'effect_hit', prompt: `${EFFECT_STYLE}, impact hit burst, red orange explosion, damage`, width: 128, height: 128 },
  { filename: 'effect_heal', prompt: `${EFFECT_STYLE}, green healing glow, plus sign, restoration magic`, width: 128, height: 128 },
  { filename: 'effect_level_up', prompt: `${EFFECT_STYLE}, golden level up arrow, upward burst, achievement`, width: 128, height: 128 },
  { filename: 'effect_energy_burst', prompt: `${EFFECT_STYLE}, blue energy burst explosion, electric discharge`, width: 128, height: 128 },
  { filename: 'effect_glow', prompt: `${EFFECT_STYLE}, soft white circular glow aura, radiant light`, width: 128, height: 128 },
  { filename: 'effect_smoke', prompt: `${EFFECT_STYLE}, gray smoke puff cloud, dissipating mist`, width: 128, height: 128 },
  { filename: 'effect_fire', prompt: `${EFFECT_STYLE}, burning fire flames, orange red fire, blazing`, width: 128, height: 128 },
  { filename: 'effect_water_splash', prompt: `${EFFECT_STYLE}, blue water splash droplets, liquid burst`, width: 128, height: 128 },
  { filename: 'effect_magic_swirl', prompt: `${EFFECT_STYLE}, purple magic swirl spiral, arcane energy vortex`, width: 128, height: 128 },

  // === MATH / SYSTEM (10) ===
  { filename: 'math_number', prompt: `${ICON_STYLE}, golden number 1 2 3 text, math numbers, education`, width: 64, height: 64 },
  { filename: 'math_plus', prompt: `${ICON_STYLE}, green plus sign, addition symbol, math operator`, width: 64, height: 64 },
  { filename: 'math_minus', prompt: `${ICON_STYLE}, red minus sign, subtraction symbol, math operator`, width: 64, height: 64 },
  { filename: 'math_multiply', prompt: `${ICON_STYLE}, orange multiply X sign, multiplication symbol`, width: 64, height: 64 },
  { filename: 'math_divide', prompt: `${ICON_STYLE}, blue divide sign, division symbol, math operator`, width: 64, height: 64 },
  { filename: 'math_checkmark', prompt: `${ICON_STYLE}, bright green checkmark tick, correct answer, success`, width: 64, height: 64 },
  { filename: 'math_wrong', prompt: `${ICON_STYLE}, red X cross mark, wrong answer, failure`, width: 64, height: 64 },
  { filename: 'math_timer', prompt: `${ICON_STYLE}, hourglass sand timer, countdown clock, time`, width: 64, height: 64 },
  { filename: 'math_progress', prompt: `${ICON_STYLE}, horizontal progress bar, loading bar, blue fill`, width: 64, height: 64 },
  { filename: 'math_xp', prompt: `${ICON_STYLE}, purple XP text badge, experience points, RPG`, width: 64, height: 64 },
];

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const total = ASSETS.length;
  let success = 0;
  let failed = 0;
  const failures: string[] = [];
  let totalCost = 0;

  console.log(`\n========================================`);
  console.log(`  BATCH GENERATION: ${total} ASSETS`);
  console.log(`========================================\n`);

  for (let i = 0; i < total; i++) {
    const asset = ASSETS[i];
    const outPath = path.join(rawDir, `${asset.filename}.png`);

    // Skip if already generated
    if (fs.existsSync(outPath)) {
      console.log(`[${i + 1}/${total}] SKIP (exists): ${asset.filename}`);
      success++;
      continue;
    }

    try {
      process.stdout.write(`[${i + 1}/${total}] ${asset.filename}...`);
      const apiKey = getApiKey();
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
        const err = await response.text().catch(() => 'unknown');
        throw new Error(`API ${response.status}: ${err.slice(0, 100)}`);
      }

      const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
      const buf = Buffer.from(data.image.base64, 'base64');
      fs.writeFileSync(outPath, buf);
      totalCost += data.usage.usd;
      success++;
      console.log(` OK (${buf.length}b, $${data.usage.usd})`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${asset.filename}: ${msg}`);
      console.log(` FAILED: ${msg}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`  BATCH COMPLETE`);
  console.log(`  Total: ${total}`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Cost: $${totalCost.toFixed(4)}`);
  console.log(`========================================`);

  if (failures.length > 0) {
    console.log(`\nFAILURES:`);
    failures.forEach(f => console.log(`  - ${f}`));
  }

  console.log(`\nAssets saved to: ${rawDir}`);
}

main().catch(console.error);
