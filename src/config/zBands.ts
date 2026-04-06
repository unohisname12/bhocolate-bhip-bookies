/**
 * Z-index band allocations for the scene rendering pipeline.
 * Single source of truth — all scene components import from here.
 *
 * Render order (back to front):
 *   SKY → SCENE layers → AMBIENT_FX → PROPS → ACCENTS_BG →
 *   LEGACY_PROPS → PET_SHADOW → HOTSPOTS → PET → ACCENTS_FG →
 *   OVERLAY → UI layers
 */
export const Z = {
  // Scene foundation
  SKY: 0,
  SCENE_FAR: 1,
  SCENE_MID: 2,
  SCENE_BELOW: 3,
  SCENE_GROUND: 4,

  // World layers
  AMBIENT_FX: 5,
  PROPS_BG: 6,
  PROPS_MID: 8,
  ACCENTS_BG: 9,
  LEGACY_PROPS: 10,
  PET_SHADOW: 12,
  HOTSPOTS: 15,

  // Entity layer
  PET: 20,

  // Foreground world (overlaps pet)
  ACCENTS_FG: 21,
  PROPS_FG: 22,

  // Post-processing
  OVERLAY: 28,

  // UI
  UI_HUD: 30,
  UI_DRAWER: 35,
  UI_NAV: 35,
  UI_PANEL: 40,
  UI_NAV_DOTS: 45,
  UI_MODAL: 60,
} as const;
