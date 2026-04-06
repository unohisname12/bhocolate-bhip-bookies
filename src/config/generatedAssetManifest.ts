/** Generated asset manifest — split into approved (done) and review-pending assets. */

export type AssetCategory = 'icon' | 'item' | 'reward' | 'room' | 'effect' | 'math' | 'pet' | 'scene' | 'egg';
export type ReviewStatus = 'unreviewed' | 'keep' | 'reject' | 'fix';

export interface GeneratedAsset {
  id: string;
  filename: string;
  category: AssetCategory;
  path: string;
  prompt: string;
  width: number;
  height: number;
}

const BASE = '/assets/generated/raw';

// ---------------------------------------------------------------------------
// APPROVED ASSETS — reviewed and accepted, no longer shown in review screen
// ---------------------------------------------------------------------------
export const APPROVED_ASSETS: GeneratedAsset[] = [
  // === UI / ICONS ===
  { id: 'icon_token', filename: 'icon_token.png', category: 'icon', path: `${BASE}/icon_token.png`, prompt: 'golden energy token, lightning bolt on coin, glowing yellow', width: 64, height: 64 },
  { id: 'icon_coin', filename: 'icon_coin.png', category: 'icon', path: `${BASE}/icon_coin.png`, prompt: 'shiny gold coin with star emblem, round currency', width: 64, height: 64 },
  { id: 'icon_ticket', filename: 'icon_ticket.png', category: 'icon', path: `${BASE}/icon_ticket.png`, prompt: 'golden battle ticket pass, admission stub with star, torn edge', width: 64, height: 64 },
  { id: 'icon_heart', filename: 'icon_heart.png', category: 'icon', path: `${BASE}/icon_heart.png`, prompt: 'red pixel heart, health icon, glowing red', width: 64, height: 64 },
  { id: 'icon_energy', filename: 'icon_energy.png', category: 'icon', path: `${BASE}/icon_energy.png`, prompt: 'blue energy bolt, stamina lightning, electric blue', width: 64, height: 64 },
  { id: 'icon_hunger', filename: 'icon_hunger.png', category: 'icon', path: `${BASE}/icon_hunger.png`, prompt: 'cooked drumstick leg, food hunger indicator, brown meat', width: 64, height: 64 },
  { id: 'icon_clean', filename: 'icon_clean.png', category: 'icon', path: `${BASE}/icon_clean.png`, prompt: 'sparkling soap bubble, cleanliness indicator, blue sparkle', width: 64, height: 64 },
  { id: 'icon_streak_flame', filename: 'icon_streak_flame.png', category: 'icon', path: `${BASE}/icon_streak_flame.png`, prompt: 'orange fire flame, streak counter, blazing hot', width: 64, height: 64 },
  { id: 'icon_back_button', filename: 'icon_back_button.png', category: 'icon', path: `${BASE}/icon_back_button.png`, prompt: 'white left arrow, back navigation, simple arrow', width: 64, height: 64 },
  { id: 'icon_confirm_button', filename: 'icon_confirm_button.png', category: 'icon', path: `${BASE}/icon_confirm_button.png`, prompt: 'green checkmark circle, confirm yes button', width: 64, height: 64 },
  { id: 'icon_cancel_button', filename: 'icon_cancel_button.png', category: 'icon', path: `${BASE}/icon_cancel_button.png`, prompt: 'red X circle, cancel no button, close', width: 64, height: 64 },
  { id: 'icon_warning', filename: 'icon_warning.png', category: 'icon', path: `${BASE}/icon_warning.png`, prompt: 'yellow warning triangle, exclamation mark, alert', width: 64, height: 64 },
  { id: 'icon_info', filename: 'icon_info.png', category: 'icon', path: `${BASE}/icon_info.png`, prompt: 'blue info circle, information i symbol', width: 64, height: 64 },
  { id: 'icon_star', filename: 'icon_star.png', category: 'icon', path: `${BASE}/icon_star.png`, prompt: 'golden five point star, shining achievement star', width: 64, height: 64 },
  { id: 'icon_shield', filename: 'icon_shield.png', category: 'icon', path: `${BASE}/icon_shield.png`, prompt: 'blue steel knight shield with star emblem, protective shield icon', width: 64, height: 64 },
  { id: 'icon_sword', filename: 'icon_sword.png', category: 'icon', path: `${BASE}/icon_sword.png`, prompt: 'golden sword blade pointing up, attack power icon, shining metal sword', width: 64, height: 64 },
  { id: 'icon_settings', filename: 'icon_settings.png', category: 'icon', path: `${BASE}/icon_settings.png`, prompt: 'silver metallic gear cog icon, settings mechanical gear wheel', width: 64, height: 64 },
  { id: 'icon_pvp_swords', filename: 'icon_pvp_swords.png', category: 'icon', path: `${BASE}/icon_pvp_swords.png`, prompt: 'two crossed swords, battle versus PvP icon, golden blades forming X shape', width: 64, height: 64 },
  { id: 'icon_speed_boot', filename: 'icon_speed_boot.png', category: 'icon', path: `${BASE}/icon_speed_boot.png`, prompt: 'winged boot speed icon, golden wing on ankle boot, fast movement', width: 64, height: 64 },
  { id: 'icon_armor', filename: 'icon_armor.png', category: 'icon', path: `${BASE}/icon_armor.png`, prompt: 'steel chestplate armor icon, defensive armor piece, metallic breastplate', width: 64, height: 64 },

  // === FOOD / ITEMS ===
  { id: 'item_apple', filename: 'item_apple.png', category: 'item', path: `${BASE}/item_apple.png`, prompt: 'red apple with green leaf, shiny fruit, game food item', width: 128, height: 128 },
  { id: 'item_cake', filename: 'item_cake.png', category: 'item', path: `${BASE}/item_cake.png`, prompt: 'slice of strawberry cake, pink frosting, game food item', width: 128, height: 128 },
  { id: 'item_potion', filename: 'item_potion.png', category: 'item', path: `${BASE}/item_potion.png`, prompt: 'healing potion bottle, glass flask blue-green liquid, cork stopper', width: 128, height: 128 },
  { id: 'item_berry', filename: 'item_berry.png', category: 'item', path: `${BASE}/item_berry.png`, prompt: 'cluster of purple berries, small fruit, game food item', width: 128, height: 128 },
  { id: 'item_bread', filename: 'item_bread.png', category: 'item', path: `${BASE}/item_bread.png`, prompt: 'loaf of golden bread, fresh baked, game food item', width: 128, height: 128 },
  { id: 'item_fish', filename: 'item_fish.png', category: 'item', path: `${BASE}/item_fish.png`, prompt: 'cooked whole fish on plate, game food item', width: 128, height: 128 },
  { id: 'item_milk', filename: 'item_milk.png', category: 'item', path: `${BASE}/item_milk.png`, prompt: 'glass bottle of white milk, dairy drink, game food item', width: 128, height: 128 },
  { id: 'item_honey', filename: 'item_honey.png', category: 'item', path: `${BASE}/item_honey.png`, prompt: 'jar of golden honey with dipper, game food item', width: 128, height: 128 },
  { id: 'item_cheese', filename: 'item_cheese.png', category: 'item', path: `${BASE}/item_cheese.png`, prompt: 'wedge of yellow cheese with holes, game food item', width: 128, height: 128 },
  { id: 'item_carrot', filename: 'item_carrot.png', category: 'item', path: `${BASE}/item_carrot.png`, prompt: 'orange carrot with green top, vegetable, game food item', width: 128, height: 128 },
  { id: 'item_mushroom', filename: 'item_mushroom.png', category: 'item', path: `${BASE}/item_mushroom.png`, prompt: 'red spotted mushroom, magical toadstool, game food item', width: 128, height: 128 },
  { id: 'item_energy_drink', filename: 'item_energy_drink.png', category: 'item', path: `${BASE}/item_energy_drink.png`, prompt: 'glowing energy drink can, neon blue, game consumable', width: 128, height: 128 },
  { id: 'item_magic_food', filename: 'item_magic_food.png', category: 'item', path: `${BASE}/item_magic_food.png`, prompt: 'glowing rainbow magical food, enchanted sparkly treat', width: 128, height: 128 },
  { id: 'item_golden_apple', filename: 'item_golden_apple.png', category: 'item', path: `${BASE}/item_golden_apple.png`, prompt: 'golden shining apple, rare legendary fruit, glowing gold', width: 128, height: 128 },
  { id: 'item_rotten_food', filename: 'item_rotten_food.png', category: 'item', path: `${BASE}/item_rotten_food.png`, prompt: 'rotten green moldy food, spoiled garbage, flies buzzing', width: 128, height: 128 },
  { id: 'item_rare_meat', filename: 'item_rare_meat.png', category: 'item', path: `${BASE}/item_rare_meat.png`, prompt: 'glowing purple rare steak, magical meat, premium food', width: 128, height: 128 },
  { id: 'item_super_potion', filename: 'item_super_potion.png', category: 'item', path: `${BASE}/item_super_potion.png`, prompt: 'large glowing red super potion, ornate bottle, powerful', width: 128, height: 128 },
  { id: 'item_snack_pack', filename: 'item_snack_pack.png', category: 'item', path: `${BASE}/item_snack_pack.png`, prompt: 'small bag of mixed snacks, chip bag, game food item', width: 128, height: 128 },
  { id: 'item_fruit_bowl', filename: 'item_fruit_bowl.png', category: 'item', path: `${BASE}/item_fruit_bowl.png`, prompt: 'wooden bowl full of mixed colorful fruits, game food item', width: 128, height: 128 },
  { id: 'item_ball', filename: 'item_ball.png', category: 'item', path: `${BASE}/item_ball.png`, prompt: 'bouncy red rubber ball, toy, game play item', width: 128, height: 128 },
  { id: 'item_teddy_bear', filename: 'item_teddy_bear.png', category: 'item', path: `${BASE}/item_teddy_bear.png`, prompt: 'brown stuffed teddy bear, plush toy, cute', width: 128, height: 128 },
  { id: 'item_rope', filename: 'item_rope.png', category: 'item', path: `${BASE}/item_rope.png`, prompt: 'coiled rope toy, tug rope, braided play toy', width: 128, height: 128 },
  { id: 'item_toy_block', filename: 'item_toy_block.png', category: 'item', path: `${BASE}/item_toy_block.png`, prompt: 'colorful wooden toy block, letter block, children toy', width: 128, height: 128 },
  { id: 'item_squeaky_toy', filename: 'item_squeaky_toy.png', category: 'item', path: `${BASE}/item_squeaky_toy.png`, prompt: 'yellow rubber duck squeaky toy, bath toy', width: 128, height: 128 },
  { id: 'item_training_whistle', filename: 'item_training_whistle.png', category: 'item', path: `${BASE}/item_training_whistle.png`, prompt: 'silver metal whistle on lanyard, training tool', width: 128, height: 128 },
  { id: 'item_brush', filename: 'item_brush.png', category: 'item', path: `${BASE}/item_brush.png`, prompt: 'wooden grooming brush, pet care tool, bristle brush', width: 128, height: 128 },
  { id: 'item_soap', filename: 'item_soap.png', category: 'item', path: `${BASE}/item_soap.png`, prompt: 'bar of blue soap with bubbles, cleaning item', width: 128, height: 128 },
  { id: 'item_towel', filename: 'item_towel.png', category: 'item', path: `${BASE}/item_towel.png`, prompt: 'folded fluffy white towel, care item', width: 128, height: 128 },
  { id: 'item_bed', filename: 'item_bed.png', category: 'item', path: `${BASE}/item_bed.png`, prompt: 'cozy pet bed with pillow, round cushion bed, soft', width: 128, height: 128 },
  { id: 'item_bandage', filename: 'item_bandage.png', category: 'item', path: `${BASE}/item_bandage.png`, prompt: 'rolled white bandage wrap with red cross, first aid', width: 128, height: 128 },
  { id: 'item_pill', filename: 'item_pill.png', category: 'item', path: `${BASE}/item_pill.png`, prompt: 'red and white capsule pill, medicine tablet', width: 128, height: 128 },
  { id: 'item_medicine_bottle', filename: 'item_medicine_bottle.png', category: 'item', path: `${BASE}/item_medicine_bottle.png`, prompt: 'brown medicine bottle with label, pharmacy bottle', width: 128, height: 128 },
  { id: 'item_syringe', filename: 'item_syringe.png', category: 'item', path: `${BASE}/item_syringe.png`, prompt: 'medical syringe with blue liquid, injection needle', width: 128, height: 128 },
  { id: 'item_healing_kit', filename: 'item_healing_kit.png', category: 'item', path: `${BASE}/item_healing_kit.png`, prompt: 'white first aid kit box with red cross, medical bag', width: 128, height: 128 },

  // === REWARDS ===
  { id: 'reward_trophy_bronze', filename: 'reward_trophy_bronze.png', category: 'reward', path: `${BASE}/reward_trophy_bronze.png`, prompt: 'bronze trophy cup, third place award, copper color', width: 128, height: 128 },
  { id: 'reward_trophy_gold', filename: 'reward_trophy_gold.png', category: 'reward', path: `${BASE}/reward_trophy_gold.png`, prompt: 'golden trophy cup with handles, first place award, shiny gold', width: 128, height: 128 },
  { id: 'reward_trophy_diamond', filename: 'reward_trophy_diamond.png', category: 'reward', path: `${BASE}/reward_trophy_diamond.png`, prompt: 'diamond crystal trophy on pedestal, epic glowing blue-white diamond, legendary', width: 128, height: 128 },
  { id: 'reward_chest', filename: 'reward_chest.png', category: 'reward', path: `${BASE}/reward_chest.png`, prompt: 'wooden treasure chest, open showing gold inside, reward loot', width: 128, height: 128 },
  { id: 'reward_box', filename: 'reward_box.png', category: 'reward', path: `${BASE}/reward_box.png`, prompt: 'wrapped gift box with ribbon bow, purple present, reward', width: 128, height: 128 },
  { id: 'reward_gem_blue', filename: 'reward_gem_blue.png', category: 'reward', path: `${BASE}/reward_gem_blue.png`, prompt: 'blue sapphire gemstone, cut jewel, shiny', width: 128, height: 128 },
  { id: 'reward_gem_red', filename: 'reward_gem_red.png', category: 'reward', path: `${BASE}/reward_gem_red.png`, prompt: 'red ruby gemstone, cut jewel, glowing red', width: 128, height: 128 },
  { id: 'reward_gem_green', filename: 'reward_gem_green.png', category: 'reward', path: `${BASE}/reward_gem_green.png`, prompt: 'green emerald gemstone, cut jewel, shiny green', width: 128, height: 128 },
  { id: 'reward_gem_purple', filename: 'reward_gem_purple.png', category: 'reward', path: `${BASE}/reward_gem_purple.png`, prompt: 'purple amethyst gemstone, cut jewel, glowing purple', width: 128, height: 128 },
  { id: 'reward_coin_stack', filename: 'reward_coin_stack.png', category: 'reward', path: `${BASE}/reward_coin_stack.png`, prompt: 'stack of gold coins, pile of money, treasure', width: 128, height: 128 },
  { id: 'reward_ticket_bundle', filename: 'reward_ticket_bundle.png', category: 'reward', path: `${BASE}/reward_ticket_bundle.png`, prompt: 'bundle of golden tickets tied with ribbon, multiple passes', width: 128, height: 128 },
  { id: 'reward_rare_token', filename: 'reward_rare_token.png', category: 'reward', path: `${BASE}/reward_rare_token.png`, prompt: 'glowing purple rare token coin, magical currency, shimmering', width: 128, height: 128 },
  { id: 'reward_legendary_token', filename: 'reward_legendary_token.png', category: 'reward', path: `${BASE}/reward_legendary_token.png`, prompt: 'legendary golden glowing token, radiant currency, epic sparkle', width: 128, height: 128 },
  { id: 'reward_achievement_badge', filename: 'reward_achievement_badge.png', category: 'reward', path: `${BASE}/reward_achievement_badge.png`, prompt: 'golden achievement badge medal, star in center, ribbon', width: 128, height: 128 },

  // === ROOM PROPS ===
  { id: 'room_plant', filename: 'room_plant.png', category: 'room', path: `${BASE}/room_plant.png`, prompt: 'small potted green houseplant, clay pot, room decoration', width: 128, height: 128 },
  { id: 'room_lamp', filename: 'room_lamp.png', category: 'room', path: `${BASE}/room_lamp.png`, prompt: 'warm glowing desk lamp, table lamp with shade, cozy light', width: 128, height: 128 },
  { id: 'room_carpet', filename: 'room_carpet.png', category: 'room', path: `${BASE}/room_carpet.png`, prompt: 'ornate red carpet rug, decorative floor mat, top-down view', width: 128, height: 128 },
  { id: 'room_painting', filename: 'room_painting.png', category: 'room', path: `${BASE}/room_painting.png`, prompt: 'framed landscape painting, hanging wall art, ornate gold frame', width: 128, height: 128 },
  { id: 'room_chair', filename: 'room_chair.png', category: 'room', path: `${BASE}/room_chair.png`, prompt: 'wooden chair with cushion, cozy seat, furniture', width: 128, height: 128 },
  { id: 'room_table', filename: 'room_table.png', category: 'room', path: `${BASE}/room_table.png`, prompt: 'small wooden round table, furniture, room prop', width: 128, height: 128 },
  { id: 'room_window', filename: 'room_window.png', category: 'room', path: `${BASE}/room_window.png`, prompt: 'window with curtains showing night sky, moonlight, room prop', width: 128, height: 128 },
  { id: 'room_bedroom_item', filename: 'room_bedroom_item.png', category: 'room', path: `${BASE}/room_bedroom_item.png`, prompt: 'small nightstand with candle, bedroom furniture, cozy', width: 128, height: 128 },
  { id: 'room_shelf', filename: 'room_shelf.png', category: 'room', path: `${BASE}/room_shelf.png`, prompt: 'wooden wall shelf with items, bookshelf, storage', width: 128, height: 128 },
  { id: 'room_books', filename: 'room_books.png', category: 'room', path: `${BASE}/room_books.png`, prompt: 'stack of colorful books, pile of books, knowledge', width: 128, height: 128 },
  { id: 'room_rug', filename: 'room_rug.png', category: 'room', path: `${BASE}/room_rug.png`, prompt: 'round blue decorative rug, floor mat, cozy', width: 128, height: 128 },
  { id: 'room_poster', filename: 'room_poster.png', category: 'room', path: `${BASE}/room_poster.png`, prompt: 'colorful wall poster, motivational art, pinned to wall', width: 128, height: 128 },
  { id: 'room_clock', filename: 'room_clock.png', category: 'room', path: `${BASE}/room_clock.png`, prompt: 'round wall clock, analog clock with numbers, time', width: 128, height: 128 },
  { id: 'room_toy_box', filename: 'room_toy_box.png', category: 'room', path: `${BASE}/room_toy_box.png`, prompt: 'colorful toy chest box, open lid showing toys inside', width: 128, height: 128 },
  { id: 'room_food_bowl', filename: 'room_food_bowl.png', category: 'room', path: `${BASE}/room_food_bowl.png`, prompt: 'pet food bowl, ceramic dish with food, round bowl', width: 128, height: 128 },
  { id: 'room_aquarium', filename: 'room_aquarium.png', category: 'room', path: `${BASE}/room_aquarium.png`, prompt: 'small glass aquarium fish tank with colorful fish inside, bubbles, blue water', width: 128, height: 128 },
  { id: 'room_trophy_shelf', filename: 'room_trophy_shelf.png', category: 'room', path: `${BASE}/room_trophy_shelf.png`, prompt: 'wooden display shelf with trophies and medals on it, achievement wall mount', width: 128, height: 128 },

  // === EFFECTS ===
  { id: 'effect_sparkle', filename: 'effect_sparkle.png', category: 'effect', path: `${BASE}/effect_sparkle.png`, prompt: 'bright white sparkle star burst, shining', width: 128, height: 128 },
  { id: 'effect_hit', filename: 'effect_hit.png', category: 'effect', path: `${BASE}/effect_hit.png`, prompt: 'impact hit burst, red orange explosion, damage', width: 128, height: 128 },
  { id: 'effect_heal', filename: 'effect_heal.png', category: 'effect', path: `${BASE}/effect_heal.png`, prompt: 'green healing glow, plus sign, restoration magic', width: 128, height: 128 },
  { id: 'effect_level_up', filename: 'effect_level_up.png', category: 'effect', path: `${BASE}/effect_level_up.png`, prompt: 'golden level up arrow, upward burst, achievement', width: 128, height: 128 },
  { id: 'effect_energy_burst', filename: 'effect_energy_burst.png', category: 'effect', path: `${BASE}/effect_energy_burst.png`, prompt: 'blue energy burst explosion, electric discharge', width: 128, height: 128 },
  { id: 'effect_glow', filename: 'effect_glow.png', category: 'effect', path: `${BASE}/effect_glow.png`, prompt: 'soft white circular glow aura, radiant light', width: 128, height: 128 },
  { id: 'effect_smoke', filename: 'effect_smoke.png', category: 'effect', path: `${BASE}/effect_smoke.png`, prompt: 'gray smoke puff cloud, dissipating mist', width: 128, height: 128 },
  { id: 'effect_fire', filename: 'effect_fire.png', category: 'effect', path: `${BASE}/effect_fire.png`, prompt: 'burning fire flames, orange red fire, blazing', width: 128, height: 128 },
  { id: 'effect_water_splash', filename: 'effect_water_splash.png', category: 'effect', path: `${BASE}/effect_water_splash.png`, prompt: 'blue water splash droplets, liquid burst', width: 128, height: 128 },
  { id: 'effect_magic_swirl', filename: 'effect_magic_swirl.png', category: 'effect', path: `${BASE}/effect_magic_swirl.png`, prompt: 'purple magic swirl spiral, arcane energy vortex', width: 128, height: 128 },
  { id: 'effect_shield_bubble', filename: 'effect_shield_bubble.png', category: 'effect', path: `${BASE}/effect_shield_bubble.png`, prompt: 'translucent blue magical shield barrier bubble, glowing protective dome', width: 128, height: 128 },
  { id: 'effect_rune_glyph', filename: 'effect_rune_glyph.png', category: 'effect', path: `${BASE}/effect_rune_glyph.png`, prompt: 'glowing purple arcane rune symbol floating in air, magical glyph circle', width: 128, height: 128 },
  { id: 'effect_trace_perfect', filename: 'effect_trace_perfect.png', category: 'effect', path: `${BASE}/effect_trace_perfect.png`, prompt: 'golden starburst explosion with sparkles, perfect score celebration burst', width: 128, height: 128 },
  { id: 'effect_trace_fail', filename: 'effect_trace_fail.png', category: 'effect', path: `${BASE}/effect_trace_fail.png`, prompt: 'gray smoke puff dissipating, fizzle failure cloud', width: 128, height: 128 },

  // === MATH ===
  { id: 'math_number', filename: 'math_number.png', category: 'math', path: `${BASE}/math_number.png`, prompt: 'golden number 1 2 3 text, math numbers, education', width: 64, height: 64 },
  { id: 'math_plus', filename: 'math_plus.png', category: 'math', path: `${BASE}/math_plus.png`, prompt: 'green plus sign, addition symbol, math operator', width: 64, height: 64 },
  { id: 'math_minus', filename: 'math_minus.png', category: 'math', path: `${BASE}/math_minus.png`, prompt: 'red minus sign, subtraction symbol, math operator', width: 64, height: 64 },
  { id: 'math_multiply', filename: 'math_multiply.png', category: 'math', path: `${BASE}/math_multiply.png`, prompt: 'orange multiply X sign, multiplication symbol', width: 64, height: 64 },
  { id: 'math_checkmark', filename: 'math_checkmark.png', category: 'math', path: `${BASE}/math_checkmark.png`, prompt: 'bright green checkmark tick, correct answer, success', width: 64, height: 64 },
  { id: 'math_wrong', filename: 'math_wrong.png', category: 'math', path: `${BASE}/math_wrong.png`, prompt: 'red X cross mark, wrong answer, failure', width: 64, height: 64 },
  { id: 'math_timer', filename: 'math_timer.png', category: 'math', path: `${BASE}/math_timer.png`, prompt: 'hourglass sand timer, countdown clock, time', width: 64, height: 64 },
  { id: 'math_xp', filename: 'math_xp.png', category: 'math', path: `${BASE}/math_xp.png`, prompt: 'purple XP text badge, experience points, RPG', width: 64, height: 64 },

  // === PET PORTRAITS ===
  { id: 'pet_slime_baby', filename: 'pet_slime_baby.png', category: 'pet', path: `${BASE}/pet_slime_baby.png`, prompt: 'cute green slime creature, baby slime monster with big eyes', width: 128, height: 128 },
  { id: 'pet_mech_bot', filename: 'pet_mech_bot.png', category: 'pet', path: `${BASE}/pet_mech_bot.png`, prompt: 'small cute robot companion, chibi mech bot with antenna', width: 128, height: 128 },
  { id: 'pet_koala_sprite', filename: 'pet_koala_sprite.png', category: 'pet', path: `${BASE}/pet_koala_sprite.png`, prompt: 'wild magical koala creature, small purple koala with sparkle aura', width: 128, height: 128 },

  // === EGGS ===
  { id: 'egg_default', filename: 'egg_default.png', category: 'egg', path: `${BASE}/egg_default.png`, prompt: 'large spotted egg on soft nest, colorful speckled egg', width: 128, height: 128 },
  { id: 'egg_cracking', filename: 'egg_cracking.png', category: 'egg', path: `${BASE}/egg_cracking.png`, prompt: 'egg with crack lines and light shining through cracks', width: 128, height: 128 },
  { id: 'egg_glowing', filename: 'egg_glowing.png', category: 'egg', path: `${BASE}/egg_glowing.png`, prompt: 'egg glowing brightly with magical aura, about to hatch', width: 128, height: 128 },

  // === SCENES ===
  { id: 'scene_battle_arena', filename: 'scene_battle_arena.png', category: 'scene', path: `${BASE}/scene_battle_arena.png`, prompt: 'battle arena combat stage, floating island platform', width: 320, height: 200 },
  { id: 'scene_shop_interior', filename: 'scene_shop_interior.png', category: 'scene', path: `${BASE}/scene_shop_interior.png`, prompt: 'cozy magical item shop interior, shelves full of potions', width: 320, height: 200 },

  // === REGENERATED REJECTS (v2) ===
  { id: 'icon_play_button', filename: 'icon_play_button.png', category: 'icon', path: `${BASE}/icon_play_button.png`, prompt: 'green circle play button icon, white right-pointing triangle arrow in center', width: 64, height: 64 },
  { id: 'item_meat', filename: 'item_meat.png', category: 'item', path: `${BASE}/item_meat.png`, prompt: 'golden brown roasted turkey drumstick leg, juicy cooked meat on bone, appetizing', width: 128, height: 128 },
  { id: 'reward_trophy_silver', filename: 'reward_trophy_silver.png', category: 'reward', path: `${BASE}/reward_trophy_silver.png`, prompt: 'shiny silver trophy cup with handles on wooden base, polished chrome finish', width: 128, height: 128 },
  { id: 'math_divide', filename: 'math_divide.png', category: 'math', path: `${BASE}/math_divide.png`, prompt: 'blue division symbol, horizontal line with dot above and below, obelus', width: 64, height: 64 },
  { id: 'math_progress', filename: 'math_progress.png', category: 'math', path: `${BASE}/math_progress.png`, prompt: 'horizontal progress bar, thick rounded rectangle half filled with bright blue', width: 64, height: 64 },

  // === COMBAT EFFECTS (reviewed & approved) ===
  { id: 'effect_slash', filename: 'effect_slash.png', category: 'effect', path: `${BASE}/effect_slash.png`, prompt: 'diagonal white slash claw marks scratching, fast attack swipe trails', width: 128, height: 128 },
  { id: 'effect_slam', filename: 'effect_slam.png', category: 'effect', path: `${BASE}/effect_slam.png`, prompt: 'ground impact shockwave crater, rocks debris flying upward from smash', width: 128, height: 128 },
  { id: 'effect_lightning', filename: 'effect_lightning.png', category: 'effect', path: `${BASE}/effect_lightning.png`, prompt: 'bright yellow electric lightning bolt strike, jagged thunderbolt zap', width: 128, height: 128 },
  { id: 'effect_overcharge', filename: 'effect_overcharge.png', category: 'effect', path: `${BASE}/effect_overcharge.png`, prompt: 'massive electric explosion overload, blue and white energy burst', width: 128, height: 128 },
  { id: 'effect_slime', filename: 'effect_slime.png', category: 'effect', path: `${BASE}/effect_slime.png`, prompt: 'green slime glob splatter impact, sticky goo splash', width: 128, height: 128 },
  { id: 'effect_acid', filename: 'effect_acid.png', category: 'effect', path: `${BASE}/effect_acid.png`, prompt: 'green toxic acid splash with bubbles, corrosive liquid spray', width: 128, height: 128 },
  { id: 'effect_shield_flash', filename: 'effect_shield_flash.png', category: 'effect', path: `${BASE}/effect_shield_flash.png`, prompt: 'translucent blue hexagonal shield barrier, glowing force field', width: 128, height: 128 },
  { id: 'effect_absorb', filename: 'effect_absorb.png', category: 'effect', path: `${BASE}/effect_absorb.png`, prompt: 'green glowing energy orbs spiraling inward, magical absorption vortex', width: 128, height: 128 },
  { id: 'effect_tackle', filename: 'effect_tackle.png', category: 'effect', path: `${BASE}/effect_tackle.png`, prompt: 'white impact collision starburst, body slam hit flash', width: 128, height: 128 },
  { id: 'effect_repair', filename: 'effect_repair.png', category: 'effect', path: `${BASE}/effect_repair.png`, prompt: 'golden mechanical gear with sparkles, wrench and cog repair', width: 128, height: 128 },
  { id: 'effect_energy_nova', filename: 'effect_energy_nova.png', category: 'effect', path: `${BASE}/effect_energy_nova.png`, prompt: 'bright multicolor energy nova explosion, radiant circular shockwave', width: 128, height: 128 },
  { id: 'effect_critical', filename: 'effect_critical.png', category: 'effect', path: `${BASE}/effect_critical.png`, prompt: 'golden starburst explosion with exclamation mark, critical hit celebration', width: 128, height: 128 },

  // === COMBAT ANIMATION SHEETS (approved) ===
  { id: 'anim_fire', filename: 'anim_fire.png', category: 'effect', path: `${BASE}/anim_fire.png`, prompt: '6-frame fire explosion animation sprite sheet', width: 768, height: 128 },
  { id: 'anim_shield', filename: 'anim_shield.png', category: 'effect', path: `${BASE}/anim_shield.png`, prompt: '6-frame shield barrier forming animation sprite sheet', width: 768, height: 128 },
  { id: 'anim_heal', filename: 'anim_heal.png', category: 'effect', path: `${BASE}/anim_heal.png`, prompt: '6-frame healing sparkle animation sprite sheet', width: 768, height: 128 },

  // === HOUSE PROPS ===
  { id: 'house_home_couch', filename: 'house_home_couch.png', category: 'room', path: `${BASE}/house_home_couch.png`, prompt: 'large cozy dark leather couch sofa, three-seat sofa with cushions', width: 128, height: 128 },
  { id: 'house_home_fireplace', filename: 'house_home_fireplace.png', category: 'room', path: `${BASE}/house_home_fireplace.png`, prompt: 'stone brick fireplace with warm orange fire burning, cozy hearth', width: 128, height: 128 },
  { id: 'house_kitchen_counter', filename: 'house_kitchen_counter.png', category: 'room', path: `${BASE}/house_kitchen_counter.png`, prompt: 'wooden kitchen counter with drawers, kitchen cabinet', width: 128, height: 128 },
  { id: 'house_kitchen_stove', filename: 'house_kitchen_stove.png', category: 'room', path: `${BASE}/house_kitchen_stove.png`, prompt: 'small cooking stove with pot on top, kitchen appliance', width: 128, height: 128 },
  { id: 'house_playroom_banner', filename: 'house_playroom_banner.png', category: 'room', path: `${BASE}/house_playroom_banner.png`, prompt: 'colorful triangular pennant banner flags on string, party bunting', width: 128, height: 128 },
  { id: 'house_bathroom_bathtub', filename: 'house_bathroom_bathtub.png', category: 'room', path: `${BASE}/house_bathroom_bathtub.png`, prompt: 'small clawfoot bathtub with bubbles, white porcelain tub', width: 128, height: 128 },
  { id: 'house_bathroom_mirror', filename: 'house_bathroom_mirror.png', category: 'room', path: `${BASE}/house_bathroom_mirror.png`, prompt: 'oval wall mirror with wooden frame, bathroom vanity mirror', width: 128, height: 128 },
  { id: 'house_shared_doorframe', filename: 'house_shared_doorframe.png', category: 'room', path: `${BASE}/house_shared_doorframe.png`, prompt: 'arched wooden doorframe with dark opening, room entrance', width: 128, height: 128 },
];

// ---------------------------------------------------------------------------
// REVIEW-PENDING ASSETS — shown in Asset Review screen for approval
// ---------------------------------------------------------------------------
export const GENERATED_ASSETS: GeneratedAsset[] = [
  // Regenerated animations (anim_slash, anim_lightning, anim_slam) — pending re-review
  { id: 'anim_slash', filename: 'anim_slash.png', category: 'effect', path: `${BASE}/anim_slash.png`, prompt: '6-frame slash claw attack animation sprite sheet (regenerated v2)', width: 768, height: 128 },
  { id: 'anim_lightning', filename: 'anim_lightning.png', category: 'effect', path: `${BASE}/anim_lightning.png`, prompt: '6-frame lightning bolt strike animation sprite sheet (regenerated v2)', width: 768, height: 128 },
  { id: 'anim_slam', filename: 'anim_slam.png', category: 'effect', path: `${BASE}/anim_slam.png`, prompt: '6-frame ground slam impact animation sprite sheet (regenerated v2)', width: 768, height: 128 },
];

export const ASSET_CATEGORIES: AssetCategory[] = ['icon', 'item', 'reward', 'room', 'effect', 'math', 'pet', 'scene', 'egg'];

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  icon: 'UI Icons',
  item: 'Items',
  reward: 'Rewards',
  room: 'Room Props',
  effect: 'Effects',
  math: 'Math/System',
  pet: 'Pet Portraits',
  scene: 'Scenes',
  egg: 'Egg/Evolution',
};
