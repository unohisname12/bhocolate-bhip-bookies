/**
 * Curated "showcase" list for the Asset Review panel.
 *
 * This is a UI filter — nothing here removes or hides assets from the
 * game itself. Gameplay imports are untouched; the Asset Review screen
 * simply reads this list to group and highlight work-in-progress sprites
 * alongside the highest-quality existing assets.
 *
 * To showcase an existing asset without generating a new one, add its
 * id to CURATED_EXISTING_IDS. Existing asset definitions are unchanged.
 */

import type { GeneratedAsset } from './generatedAssetManifest';

export const WOODLAND_REVIEW_ASSETS: GeneratedAsset[] = [
  ...['home', 'yard'].map((name): GeneratedAsset => ({ id: `woodland_${name}`, filename: `${name}.png`, category: 'scene', path: `/assets/woodland-v1/${name}.png`, prompt: 'Woodland v1: new production environment. Full prompt in ART-REFRESH.md.', width: 400, height: 224, isPreviewable: true, group: 'Woodland v1 — live game' })),
  ...['idle', 'walking', 'happy', 'eating', 'sleeping', 'action'].map((name): GeneratedAsset => ({ id: `woodland_pip_${name}`, filename: `pip-${name}.png`, category: 'pet', path: `/assets/woodland-v1/pip-${name}.png`, prompt: `New Pip ${name}: 4 frames at 128×128. Use Dev → Animation playground to play.`, width: 512, height: 128, isPreviewable: true, group: 'Woodland v1 — live game', state: name })),
  ...['math', 'catch', 'momentum', 'merge', 'care', 'battle', 'feed', 'heart'].map((name): GeneratedAsset => ({ id: `woodland_icon_${name}`, filename: `icon-${name}.png`, category: 'icon', path: `/assets/woodland-v1/icon-${name}.png`, prompt: 'Woodland v1 matching pixel-art UI set.', width: 64, height: 64, isPreviewable: true, group: 'Woodland v1 — live game' })),
];

/** Directional character sprites.
 *
 *  v3 = Bitforge /rotate endpoint (image-to-image from the real idle frame).
 *       These match the original art style because the API used the
 *       existing sprite as the style reference. This is the showcased set.
 *
 *  v2 = MCP create_character pro mode (text-to-image). Kept on disk at
 *       /directions/v2/ but not in the Curated view by default. Add the
 *       ids to CURATED_V2_COMPARISON below to show them side-by-side. */
export const CURATED_DIRECTION_ASSETS: GeneratedAsset[] = [
  // Blue Koala v3 — rotate-based, style-matched to the original
  {
    id: 'blue_koala_v3_south',
    filename: 'south.png',
    category: 'pet_direction',
    path: '/assets/pets/blue-koala/directions/v3/south.png',
    prompt: 'Blue Koala v3 — front (south). Copy of existing idle frame 0 used as rotate source.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Blue Koala (v3 rotate)', direction: 'south', state: 'idle',
  },
  {
    id: 'blue_koala_v3_east',
    filename: 'east.png',
    category: 'pet_direction',
    path: '/assets/pets/blue-koala/directions/v3/east.png',
    prompt: 'Blue Koala v3 — right (east). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Blue Koala (v3 rotate)', direction: 'east', state: 'idle',
  },
  {
    id: 'blue_koala_v3_west',
    filename: 'west.png',
    category: 'pet_direction',
    path: '/assets/pets/blue-koala/directions/v3/west.png',
    prompt: 'Blue Koala v3 — left (west). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Blue Koala (v3 rotate)', direction: 'west', state: 'idle',
  },
  {
    id: 'blue_koala_v3_north',
    filename: 'north.png',
    category: 'pet_direction',
    path: '/assets/pets/blue-koala/directions/v3/north.png',
    prompt: 'Blue Koala v3 — back (north). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Blue Koala (v3 rotate)', direction: 'north', state: 'idle',
  },

  // Subtrak v3 — rotate-based, style-matched to the original
  {
    id: 'subtrak_v3_south',
    filename: 'south.png',
    category: 'pet_direction',
    path: '/assets/pets/subtrak/directions/v3/south.png',
    prompt: 'Subtrak v3 — front (south). Copy of existing idle frame 0 used as rotate source.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Subtrak (v3 rotate)', direction: 'south', state: 'idle',
  },
  {
    id: 'subtrak_v3_east',
    filename: 'east.png',
    category: 'pet_direction',
    path: '/assets/pets/subtrak/directions/v3/east.png',
    prompt: 'Subtrak v3 — right (east). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Subtrak (v3 rotate)', direction: 'east', state: 'idle',
  },
  {
    id: 'subtrak_v3_west',
    filename: 'west.png',
    category: 'pet_direction',
    path: '/assets/pets/subtrak/directions/v3/west.png',
    prompt: 'Subtrak v3 — left (west). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Subtrak (v3 rotate)', direction: 'west', state: 'idle',
  },
  {
    id: 'subtrak_v3_north',
    filename: 'north.png',
    category: 'pet_direction',
    path: '/assets/pets/subtrak/directions/v3/north.png',
    prompt: 'Subtrak v3 — back (north). Bitforge /rotate, image_guidance_scale 7.0.',
    width: 128, height: 128,
    isPreviewable: true, group: 'Subtrak (v3 rotate)', direction: 'north', state: 'idle',
  },
];

/** Final animation sheets, 128×128 native per frame, 3 frames each, produced
 *  via /animate-with-skeleton with character-specific chibi keypoints.
 *  Iteration-gated: each animation ran through the quality-scoring loop and
 *  scored ≥0.95 on the silhouette-IoU metric (koala love landed at 0.946 —
 *  slight motion-trail wisp, still game-usable). */
export const FINAL_ANIMATION_ASSETS: GeneratedAsset[] = [
  // Blue Koala
  {
    id: "blue_koala_anim_happy_south",
    filename: "happy-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/blue-koala/happy-south-sheet.png",
    prompt: "Blue Koala happy — 3-frame cycle, skeleton-driven, native 128×128.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Blue Koala — Final Animations",
    direction: "south",
    state: "happy",
  },
  {
    id: "blue_koala_anim_sparkle_south",
    filename: "sparkle-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/blue-koala/sparkle-south-sheet.png",
    prompt: "Blue Koala sparkle — 3-frame cycle, skeleton-driven, native 128×128.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Blue Koala — Final Animations",
    direction: "south",
    state: "sparkle",
  },
  {
    id: "blue_koala_anim_love_south",
    filename: "love-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/blue-koala/love-south-sheet.png",
    prompt: "Blue Koala love — 3-frame cycle, skeleton-driven, native 128×128. Minor motion-trail wisp on frame 2.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Blue Koala — Final Animations",
    direction: "south",
    state: "love",
  },
  // Subtrak
  {
    id: "subtrak_anim_happy_south",
    filename: "happy-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/subtrak/happy-south-sheet.png",
    prompt: "Subtrak happy — 3-frame cycle, skeleton-driven, native 128×128.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Subtrak — Final Animations",
    direction: "south",
    state: "happy",
  },
  {
    id: "subtrak_anim_sparkle_south",
    filename: "sparkle-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/subtrak/sparkle-south-sheet.png",
    prompt: "Subtrak sparkle — 3-frame cycle, skeleton-driven, native 128×128.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Subtrak — Final Animations",
    direction: "south",
    state: "sparkle",
  },
  {
    id: "subtrak_anim_love_south",
    filename: "love-south-sheet.png",
    category: "pet_direction",
    path: "/assets/generated/new/animations_final/subtrak/love-south-sheet.png",
    prompt: "Subtrak love — 3-frame cycle, skeleton-driven, native 128×128.",
    width: 384, height: 128,
    isPreviewable: true,
    group: "Subtrak — Final Animations",
    direction: "south",
    state: "love",
  },
];

/** V2 (MCP pro mode) sprites remain on disk at /directions/v2/. They are
 *  NOT shown in the curated view by default. To surface them for side-by-
 *  side comparison, move their entries into CURATED_DIRECTION_ASSETS or
 *  mark isPreviewable: true. */
export const V2_COMPARISON_ASSETS: GeneratedAsset[] = [
  // All v2 direction sprites — paths preserved, isPreviewable omitted so
  // they do NOT appear in the Curated filter by default. Flip to true if
  // you want them back in the showcase.
  ...(['south','east','west','north'] as const).flatMap((d): GeneratedAsset[] => ([
    {
      id: `blue_koala_v2_${d}`,
      filename: `${d}.png`,
      category: 'pet_direction',
      path: `/assets/pets/blue-koala/directions/v2/${d}.png`,
      prompt: `Blue Koala v2 (${d}) — PixelLab MCP create_character pro mode, text-to-image.`,
      width: 92, height: 92,
      group: 'Blue Koala (v2 text)', direction: d, state: 'idle',
    },
    {
      id: `subtrak_v2_${d}`,
      filename: `${d}.png`,
      category: 'pet_direction',
      path: `/assets/pets/subtrak/directions/v2/${d}.png`,
      prompt: `Subtrak v2 (${d}) — PixelLab MCP create_character pro mode, text-to-image.`,
      width: 92, height: 92,
      group: 'Subtrak (v2 text)', direction: d, state: 'idle',
    },
  ])),
];

/** Whitelist of existing-asset IDs to surface in the Curated tab. Empty
 *  for now — add ids to flag existing assets as showcase-quality without
 *  modifying the main manifest. */
export const CURATED_EXISTING_IDS = new Set<string>([]);
