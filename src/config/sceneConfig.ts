import type { RoomId } from '../types/room';
import type { ActionId } from './roomConfig';

/* ------------------------------------------------------------------ */
/*  Scene Layer Types                                                  */
/* ------------------------------------------------------------------ */

export interface SceneLayer {
  id: string;
  asset: string;           // Path to strip sprite PNG
  y: number;               // Bottom offset in px (native 224px space)
  z: number;               // Z-index for stacking
  parallax?: number;       // Optional: 0-1 multiplier for future parallax
  opacity?: number;        // Optional: layer opacity (default 1)
}

export interface SceneProp {
  id: string;
  asset: string;           // Path to prop sprite PNG
  x: number;               // Left offset in px (native 400px space)
  y: number;               // Bottom offset in px
  z: number;               // Z-index
  width: number;           // Native width in px
  height: number;          // Native height in px
  scale?: number;          // Optional scale multiplier (default 1)
  interactive?: string;    // Optional: hotspot action key
}

export interface SceneAccent {
  id: string;
  asset: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  /** When true, renders above the pet (Z.ACCENTS_FG) for depth overlap. */
  foreground?: boolean;
}

export interface ShadowConfig {
  width: number;     // Native px width of shadow ellipse
  height: number;    // Native px height
  opacity: number;   // 0-1
  offsetY: number;   // Native px below feet
}

export interface AmbientTint {
  color: string;     // CSS rgba color (keep very subtle!)
  mode: 'multiply' | 'overlay' | 'soft-light';
}

export interface SceneConfig {
  id: string;
  name: string;

  // Sky/wall base (CSS gradient fallback)
  skyGradient: string;

  // Ordered layers (rendered bottom to top by z)
  layers: SceneLayer[];

  // Individual props (objects, furniture)
  props: SceneProp[];

  // Ground accents (flowers, stones, rugs)
  accents: SceneAccent[];

  // Grounding
  groundY: number;         // Top edge of ground strip in native px from bottom
  groundZ: number;         // Z-index of the ground strip

  // Pet walk bounds (native px from left edge)
  walkBounds: { minX: number; maxX: number };

  // Actions available in this scene
  primaryActions: ActionId[];

  // Environmental FX config
  ambientFx?: 'outdoor' | 'indoor';

  // World-space integration
  shadowConfig: ShadowConfig;
  ambientTint?: AmbientTint;
  petScale?: number;       // Override pet sprite scale (default: ANIMATION_DEFAULTS.scale)
  footEmbed?: number;      // Sink pet into ground by N native px (default 0)
}

/* ------------------------------------------------------------------ */
/*  Native canvas: 400×224                                             */
/* ------------------------------------------------------------------ */

const ENV = '/assets/generated/final/environment';

/* ------------------------------------------------------------------ */
/*  Outdoor Scene — Yard                                               */
/* ------------------------------------------------------------------ */

export const OUTDOOR_SCENE: SceneConfig = {
  id: 'outside',
  name: 'Yard',
  skyGradient: 'linear-gradient(180deg, #87CEEB 0%, #f0c27f 50%, #fc5c7d 100%)',
  layers: [
    { id: 'far_bg',  asset: `${ENV}/outdoor/layers/layer_outdoor_far_bg.png`,  y: 120, z: 1 },
    { id: 'mid_bg',  asset: `${ENV}/outdoor/layers/layer_outdoor_mid_bg.png`,  y: 60,  z: 2 },
    { id: 'ground',  asset: `${ENV}/outdoor/layers/layer_outdoor_ground.png`,  y: 0,   z: 4 },
    { id: 'below',   asset: `${ENV}/outdoor/layers/layer_outdoor_below.png`,   y: -32, z: 3 },
  ],
  props: [
    { id: 'tree_large_l', asset: `${ENV}/outdoor/props/prop_tree_large.png`, x: 20,  y: 48, z: 2, width: 96, height: 128, scale: 1.1 },
    { id: 'cottage',      asset: `${ENV}/outdoor/props/prop_cottage.png`,    x: 240, y: 48, z: 3, width: 128, height: 128, scale: 1.2 },
    { id: 'mailbox',      asset: `${ENV}/outdoor/props/prop_mailbox.png`,    x: 50,  y: 48, z: 3, width: 64, height: 96, scale: 0.6, interactive: 'open_mailbox' },
    { id: 'tree_small_r', asset: `${ENV}/outdoor/props/prop_tree_small.png`, x: 360, y: 48, z: 2, width: 64, height: 96 },
    { id: 'bush_a',       asset: `${ENV}/outdoor/props/prop_bush_a.png`,     x: 100, y: 48, z: 2, width: 48, height: 32 },
    { id: 'bush_b',       asset: `${ENV}/outdoor/props/prop_bush_b.png`,     x: 320, y: 48, z: 2, width: 48, height: 32 },
    { id: 'cloud_a',      asset: `${ENV}/outdoor/props/prop_cloud_a.png`,    x: 60,  y: 185, z: 0, width: 64, height: 32 },
    { id: 'cloud_b',      asset: `${ENV}/outdoor/props/prop_cloud_b.png`,    x: 280, y: 195, z: 0, width: 48, height: 32 },
    // { id: 'fence_gate',   asset: `${ENV}/outdoor/props/prop_fence_gate.png`, x: 180, y: 48, z: 2, width: 64, height: 48 }, // DISABLED — cleanup pass
  ],
  accents: [
    // --- TEMPORARILY DISABLED — cleanup pass, will reintroduce later ---
    // Foreground accents (overlap pet feet for depth)
    // { id: 'flowers_red',    asset: `${ENV}/outdoor/accents/accent_flowers_red.png`,    x: 120, y: 36, z: 5, width: 32, height: 32, foreground: true },
    // { id: 'flowers_yellow', asset: `${ENV}/outdoor/accents/accent_flowers_yellow.png`, x: 260, y: 34, z: 5, width: 32, height: 32, foreground: true },
    // { id: 'grass_tuft_a',   asset: `${ENV}/outdoor/accents/accent_grass_tuft_a.png`,   x: 85,  y: 38, z: 5, width: 32, height: 32, foreground: true },
    // { id: 'grass_tuft_b',   asset: `${ENV}/outdoor/accents/accent_grass_tuft_b.png`,   x: 245, y: 38, z: 5, width: 32, height: 32, foreground: true },
    // Ground-blending foreground edges (break the straight ground line)
    // { id: 'grass_edge_a',   asset: `${ENV}/outdoor/accents/accent_grass_edge_a.png`,   x: 100, y: 40, z: 5, width: 64, height: 24, foreground: true },
    // { id: 'grass_edge_b',   asset: `${ENV}/outdoor/accents/accent_grass_edge_b.png`,   x: 230, y: 40, z: 5, width: 64, height: 24, foreground: true },
    // Background accents (behind pet)
    // { id: 'flowers_blue',   asset: `${ENV}/outdoor/accents/accent_flowers_blue.png`,   x: 340, y: 36, z: 5, width: 32, height: 32 },
    // { id: 'rock_a',         asset: `${ENV}/outdoor/accents/accent_rock_a.png`,         x: 155, y: 34, z: 5, width: 32, height: 32 },
    // { id: 'rock_b',         asset: `${ENV}/outdoor/accents/accent_rock_b.png`,         x: 285, y: 32, z: 5, width: 32, height: 32 },
    // { id: 'mushroom',       asset: `${ENV}/outdoor/accents/accent_mushroom.png`,       x: 370, y: 36, z: 5, width: 32, height: 32 },
    // Organic scatter (leaf and pebble detail along path edges)
    // { id: 'leaf_scatter',   asset: `${ENV}/outdoor/accents/accent_leaf_scatter.png`,   x: 175, y: 34, z: 5, width: 32, height: 32 },
    // { id: 'pebble_scatter', asset: `${ENV}/outdoor/accents/accent_pebble_scatter.png`, x: 210, y: 34, z: 5, width: 32, height: 32 },
  ],
  groundY: 48,
  groundZ: 4,
  walkBounds: { minX: 80, maxX: 320 },
  primaryActions: ['play', 'train', 'arena', 'practice'],
  ambientFx: 'outdoor',
  shadowConfig: { width: 30, height: 5, opacity: 0.45, offsetY: 1 },
  ambientTint: { color: 'rgba(255,220,160,0.06)', mode: 'overlay' },
  petScale: 1.6,
  footEmbed: 3,
};

/* ------------------------------------------------------------------ */
/*  Indoor Scene — Home                                                */
/* ------------------------------------------------------------------ */

export const INDOOR_SCENE: SceneConfig = {
  id: 'inside',
  name: 'Home',
  skyGradient: 'radial-gradient(ellipse at 50% 30%, #5c3d1e 0%, #2a1a0d 100%)',
  layers: [
    { id: 'wall',      asset: `${ENV}/indoor/layers/layer_indoor_wall.png`,      y: 40,  z: 0 },
    { id: 'baseboard', asset: `${ENV}/indoor/layers/layer_indoor_baseboard.png`, y: 28,  z: 1 },
    { id: 'floor',     asset: `${ENV}/indoor/layers/layer_indoor_floor.png`,     y: 0,   z: 4 },
  ],
  props: [
    { id: 'fireplace', asset: `${ENV}/indoor/props/prop_fireplace.png`, x: 24,  y: 48, z: 2, width: 96, height: 96, scale: 1.1, interactive: 'fireplace' },
    { id: 'bookshelf', asset: `${ENV}/indoor/props/prop_bookshelf.png`, x: 130, y: 48, z: 2, width: 64, height: 96, scale: 1.1, interactive: 'bookshelf' },
    { id: 'window',    asset: `${ENV}/indoor/props/prop_window.png`,    x: 210, y: 100, z: 1, width: 64, height: 64, interactive: 'window' },
    { id: 'door',      asset: `${ENV}/indoor/props/prop_door.png`,      x: 310, y: 48, z: 2, width: 48, height: 80, scale: 1.1, interactive: 'exit_house' },
    // { id: 'couch',     asset: `${ENV}/indoor/props/prop_couch.png`,     x: 280, y: 48, z: 3, width: 80, height: 48 }, // DISABLED — opaque wall/floor background baked in
    { id: 'chair',     asset: `${ENV}/indoor/props/prop_chair.png`,     x: 370, y: 48, z: 3, width: 40, height: 48 },
    // { id: 'table',     asset: `${ENV}/indoor/props/prop_table.png`,     x: 350, y: 48, z: 3, width: 56, height: 40 }, // DISABLED — opaque background, scene-within-scene
    { id: 'shelf_wall', asset: `${ENV}/indoor/props/prop_shelf_wall.png`, x: 170, y: 140, z: 1, width: 48, height: 32 },
    { id: 'clock',     asset: `${ENV}/indoor/props/prop_clock.png`,      x: 380, y: 110, z: 1, width: 32, height: 48 },
    { id: 'toy_box',   asset: `${ENV}/indoor/props/prop_toy_box.png`,    x: 90, y: 48, z: 3, width: 48, height: 36 },
    { id: 'painting',  asset: `${ENV}/indoor/props/prop_painting.png`,   x: 270, y: 150, z: 1, width: 40, height: 32 },
    { id: 'plant_pot', asset: `${ENV}/indoor/props/prop_plant_pot.png`,  x: 5,  y: 48, z: 3, width: 32, height: 40 },
  ],
  accents: [
    // --- TEMPORARILY DISABLED — cleanup pass, will reintroduce later ---
    // { id: 'rug_large',  asset: `${ENV}/indoor/accents/accent_rug_large.png`,  x: 140, y: 4,  z: 5, width: 128, height: 48, foreground: true }, // opaque rectangle with room scene baked in
    // { id: 'rug_small',  asset: `${ENV}/indoor/accents/accent_rug_small.png`,  x: 310, y: 4,  z: 5, width: 64,  height: 32 }, // opaque doormat with wood floor
    // { id: 'pet_bed',    asset: `${ENV}/indoor/accents/accent_pet_bed.png`,    x: 60,  y: 4,  z: 5, width: 64,  height: 32 }, // clutters standing area
    // { id: 'food_bowl',  asset: `${ENV}/indoor/accents/accent_food_bowl.png`,  x: 120, y: 4,  z: 5, width: 32,  height: 32, foreground: true }, // top-down perspective mismatch
    // { id: 'toy_ball',   asset: `${ENV}/indoor/accents/accent_toy_ball.png`,   x: 250, y: 4,  z: 5, width: 32,  height: 32, foreground: true }, // floor clutter
    // { id: 'slippers',   asset: `${ENV}/indoor/accents/accent_slippers.png`,   x: 340, y: 2,  z: 5, width: 32,  height: 32 }, // wrong perspective
  ],
  groundY: 48,
  groundZ: 4,
  walkBounds: { minX: 100, maxX: 300 },
  primaryActions: ['feed', 'clean', 'heal', 'shop', 'practice'],
  ambientFx: 'indoor',
  shadowConfig: { width: 30, height: 5, opacity: 0.4, offsetY: 1 },
  ambientTint: { color: 'rgba(255,180,100,0.06)', mode: 'multiply' },
  petScale: 1.6,
  footEmbed: 2,
};

/* ------------------------------------------------------------------ */
/*  Lookup                                                             */
/* ------------------------------------------------------------------ */

const SCENE_MAP: Record<RoomId, SceneConfig> = {
  outside: OUTDOOR_SCENE,
  inside: INDOOR_SCENE,
};

export const getSceneConfig = (roomId: RoomId): SceneConfig => SCENE_MAP[roomId];
