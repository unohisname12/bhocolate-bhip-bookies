# Environment Art & Grounding Overhaul — Design Spec

## Context

The pet currently looks like it's floating on a flat background image. Both the outdoor yard and indoor home use a single 400×224 PNG stretched to fill the viewport via `object-cover`. The "ground" is a 24px CSS gradient darkening strip, and the pet is anchored at a hardcoded `bottom: 38px` from the viewport edge. There is no constructed ground plane, no layered scene composition, and no modular world pieces.

This overhaul replaces the flat-image approach with a **layered parallax composition system** where each scene is built from stacked sprite strips, individual prop sprites, a real ground strip with accent overlays, and a grounding system that anchors the pet to constructed world geometry. The pet will also gain idle-wander behavior, drifting to random positions along the ground.

**Scope:** 1 outdoor scene (yard) + 1 indoor scene (home). Battle arena and shop remain unchanged.

---

## 1. Architecture: Layered Scene Composition

### Design

Each scene is composed of **ordered layers** rendered as absolutely-positioned DOM elements stacked by z-index. This replaces the current approach of one `<img>` with `object-cover`.

**Canvas:** 400×224 native pixel art resolution, scaled up with `image-rendering: pixelated`.

### Outdoor Layer Stack

| Z | Layer Name | Asset Type | Dimensions | Description |
|---|-----------|------------|------------|-------------|
| 0 | Sky | CSS gradient + cloud sprites | full width | Blue gradient sky with 2-3 individual cloud sprite overlays |
| 1 | Far background | Strip sprite | 400×60 | Distant hills/treeline silhouette |
| 2 | Mid background | Strip sprite | 400×80 | Fence line, bushes, mid-distance foliage |
| 3 | World objects | Individual sprites | Varies | Cottage house (~96×80), mailbox (~32×48), trees (~48×80) |
| 4 | Ground strip | Strip sprite | 400×48 | Grass/dirt ground surface — the physical floor |
| 5 | Ground accents | Individual sprites | 16-32px each | Flowers, rocks, grass tufts overlaid on ground strip |
| 6 | Pet shadow | CSS radial gradient | Dynamic | Soft elliptical shadow on ground surface, follows pet X |
| 7 | Pet | PetSprite component | 128×128 @2x | Anchored to top edge of ground strip, idle-wanders |
| 8 | Foreground FX | CSS effects | Overlay | Sun rays, particle effects, atmospheric glow |
| 9 | UI | Existing HUD | Overlay | TopHUD, InfoDrawer, RightSidePanel, RoomNavigator |

### Indoor Layer Stack

| Z | Layer Name | Asset Type | Dimensions | Description |
|---|-----------|------------|------------|-------------|
| 0 | Wall background | Strip sprite | 400×130 | Room walls, ceiling beams, warm tones |
| 1 | Wall decor | Individual sprites | Varies | Window (~48×48), painting (~32×32), clock (~24×32) |
| 2 | Back furniture | Individual sprites | Varies | Fireplace (~64×80), bookshelf (~48×72), door (~32×64) |
| 3 | Mid furniture | Individual sprites | Varies | Couch (~64×40), chair (~32×40), toy box (~40×32) |
| 4 | Floor strip | Strip sprite | 400×48 | Wood plank floor surface — the physical floor |
| 5 | Floor accents | Individual sprites | Varies | Rug (~80×32), pet bed (~48×24), mat (~32×16) |
| 6 | Pet shadow | CSS radial gradient | Dynamic | Follows pet X position |
| 7 | Pet | PetSprite component | 128×128 @2x | Anchored to top edge of floor strip, idle-wanders |
| 8 | Foreground FX | CSS effects | Overlay | Fireplace glow, window light, warm ambience |
| 9 | UI | Existing HUD | Overlay | Same UI layer |

### Layer Rendering

Each layer is rendered by a new **`SceneLayerRenderer`** component that maps over a scene's layer config and outputs positioned `<img>` or `<div>` elements. This replaces `SceneBackground`.

```
SceneLayerRenderer
  ├── for each layer in config.layers:
  │     <img src={layer.asset} style={{ bottom: layer.y, zIndex: layer.z, ... }} />
  ├── for each prop in config.props:
  │     <img src={prop.asset} style={{ left: prop.x, bottom: prop.y, zIndex: prop.z, ... }} />
  └── for each accent in config.accents:
        <img src={accent.asset} style={{ left: accent.x, bottom: accent.y, ... }} />
```

---

## 2. Scene Config Architecture

### New Types

Extend `roomConfig.ts` with layer-aware scene definitions:

```typescript
interface SceneLayer {
  id: string;
  asset: string;           // Path to strip sprite PNG
  y: number;               // Bottom offset in px (native 224px space)
  z: number;               // Z-index for stacking
  parallax?: number;       // Optional: 0-1 multiplier for future parallax
  opacity?: number;        // Optional: layer opacity (default 1)
}

interface SceneProp {
  id: string;
  asset: string;           // Path to prop sprite PNG
  x: number;               // Left offset in px (native 400px space)
  y: number;               // Bottom offset in px
  z: number;               // Z-index
  scale?: number;          // Optional scale multiplier (default 1)
  interactive?: string;    // Optional: hotspot action key (e.g., 'enter_house')
}

interface SceneAccent {
  id: string;
  asset: string;
  x: number;
  y: number;
  z: number;               // Should be between ground strip z and pet z
}

interface SceneConfig {
  id: string;
  name: string;

  // Sky/wall base (CSS gradient fallback + optional sprite)
  skyGradient: string;
  skyAsset?: string;

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
}
```

### Migration Path

The existing `HouseRoom` interface remains for backward compatibility during migration. The new `SceneConfig` is used by the new `SceneLayerRenderer`. Once migration is complete, `HouseRoom` and `SceneBackground` are removed.

**Key change:** Positions shift from viewport-relative CSS percentages to **native pixel coordinates** (400×224 space). The renderer scales everything proportionally to the actual viewport using a single scale factor: `viewportWidth / 400`.

---

## 3. Grounding System

### Current Problem

- `GROUND_CLEARANCE = 38` — hardcoded pixel offset from viewport bottom
- Ground is a CSS gradient strip at `bottom: 55px, height: 24px`
- Pet position is viewport-derived, not world-derived

### New System

**`groundY`** is defined per scene in `SceneConfig`. It represents the **top edge of the ground strip** in native 224px coordinates (measured from bottom).

**Pet foot anchor:**
- Pet container's `bottom` = `groundY * scaleFactor`
- `transformOrigin: 'bottom center'` ensures the pet's feet touch the ground line
- The existing `groundOffsetY` in sprite configs (which collapses transparent padding below feet) continues to work unchanged

**Shadow:**
- Shadow renders at `bottom: (groundY * scaleFactor) - 2px`
- Shadow follows pet's X position during idle wander
- Shadow width/blur scales with pet scale

**Scale factor:** `const scale = viewportWidth / 400` — all native coordinates multiplied by this.

### Files Changed

| File | Change |
|------|--------|
| `SceneStage.tsx` | Replace hardcoded `GROUND_CLEARANCE` with `groundY` from scene config. Accept `groundY`, `walkBounds` as props. Add X-position state for idle wander. |
| `SceneBackground.tsx` | **Replaced** by new `SceneLayerRenderer.tsx` |
| `GameSceneShell.tsx` | Pass `SceneConfig` instead of `HouseRoom`. Use `SceneLayerRenderer` instead of `SceneBackground`. |
| `roomConfig.ts` | Add `SceneConfig` definitions alongside existing `HouseRoom` (migration period). |

---

## 4. Idle Wander System

### Behavior

- Pet slowly drifts to random X positions within `walkBounds.minX` — `walkBounds.maxX`
- Movement speed: ~15-25px/sec (native coords), gentle and organic
- Pauses 3-8 seconds between movements (randomized)
- Pet faces direction of movement (CSS `scaleX(-1)` for left-facing)
- Movement uses eased interpolation (ease-in-out), not linear
- Shadow follows pet X position

### Implementation

New hook: **`useIdleWander(walkBounds, paused)`**

Returns `{ x: number, facingLeft: boolean }` — the current pet X position (in native coords) and facing direction.

Used inside `SceneStage` to position the pet container:

```typescript
const paused = intent === 'sleep' || intent === 'dead';
const { x, facingLeft } = useIdleWander(sceneConfig.walkBounds, paused);
// Pet container: style={{ left: x * scale, bottom: groundY * scale }}
// Pet sprite: style={{ transform: facingLeft ? 'scaleX(-1)' : 'none' }}
```

### States That Pause Wander

- `sleeping` — pet stays in current position
- `dead` — pet stays in current position
- Battle screen active — wander disabled

---

## 5. Asset Generation Plan

All assets generated via **Pixel Lab API** (`pixflux` endpoint) at native pixel-art resolution with `no_background: true` for transparent sprites.

### Outdoor Asset Batch (~22 assets)

**Strip Layers (no_background: false):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `layer_outdoor_sky.png` | 400×60 | pixel art sky gradient strip, blue sky with fluffy white clouds, bright sunny day, 16-bit RPG style |
| `layer_outdoor_far_bg.png` | 400×60 | pixel art distant rolling green hills and tree silhouettes, soft muted colors, background layer, 16-bit style |
| `layer_outdoor_mid_bg.png` | 400×80 | pixel art wooden picket fence with green bushes and hedges, mid-distance foliage, 16-bit RPG style |
| `layer_outdoor_ground.png` | 400×48 | pixel art grass and dirt ground surface strip, green grass top with brown earth below, clean horizontal tile, 16-bit RPG style |
| `layer_outdoor_below.png` | 400×32 | pixel art underground dirt strip, dark brown earth cross-section, 16-bit style |

**Props (no_background: true, 128×128 unless noted):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `prop_cottage.png` | 128×128 | pixel art small cozy stone cottage with wooden door, chimney with smoke, thatched roof, 16-bit RPG style |
| `prop_mailbox.png` | 64×64 | pixel art red mailbox on wooden post, cute friendly style, 16-bit RPG |
| `prop_tree_large.png` | 96×128 | pixel art large leafy green tree, round canopy, brown trunk, 16-bit RPG style |
| `prop_tree_small.png` | 64×96 | pixel art small leafy tree or sapling, 16-bit RPG style |
| `prop_bush_a.png` | 48×32 | pixel art green bush, round shape, 16-bit style |
| `prop_bush_b.png` | 48×32 | pixel art green flowering bush with small pink flowers, 16-bit style |
| `prop_fence_gate.png` | 64×48 | pixel art wooden fence gate segment, 16-bit RPG style |
| `prop_cloud_a.png` | 64×32 | pixel art fluffy white cloud, soft simple shape, 16-bit style |
| `prop_cloud_b.png` | 48×24 | pixel art small white cloud, wispy, 16-bit style |

**Ground Accents (no_background: true):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `accent_flowers_red.png` | 32×16 | pixel art small cluster of red flowers on grass, 16-bit RPG style |
| `accent_flowers_yellow.png` | 32×16 | pixel art small cluster of yellow wildflowers, 16-bit style |
| `accent_flowers_blue.png` | 32×16 | pixel art small cluster of blue flowers, 16-bit style |
| `accent_rock_a.png` | 24×16 | pixel art small grey stone rock, 16-bit RPG style |
| `accent_rock_b.png` | 32×20 | pixel art pair of mossy rocks, 16-bit style |
| `accent_grass_tuft_a.png` | 16×12 | pixel art tuft of tall grass blades, 16-bit style |
| `accent_grass_tuft_b.png` | 16×12 | pixel art tuft of grass with tiny daisy, 16-bit style |
| `accent_mushroom.png` | 16×16 | pixel art small cute red mushroom, 16-bit RPG style |

### Indoor Asset Batch (~21 assets)

**Strip Layers (no_background: false):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `layer_indoor_wall.png` | 400×130 | pixel art cozy room interior wall, warm brown wood panels, ceiling beams, wainscoting trim, 16-bit RPG style |
| `layer_indoor_floor.png` | 400×48 | pixel art wooden plank floor surface strip, warm honey-brown boards, 16-bit RPG style |
| `layer_indoor_baseboard.png` | 400×12 | pixel art wooden baseboard trim strip where wall meets floor, 16-bit style |

**Props (no_background: true):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `prop_fireplace.png` | 96×96 | pixel art stone fireplace with warm crackling fire, mantle with decorations, 16-bit RPG style |
| `prop_bookshelf.png` | 64×96 | pixel art tall wooden bookshelf filled with colorful books, 16-bit RPG style |
| `prop_window.png` | 64×64 | pixel art arched window showing blue sky and green hills, wooden frame, curtains, 16-bit style |
| `prop_door.png` | 48×80 | pixel art wooden interior door, arched top, brass handle, 16-bit RPG style |
| `prop_couch.png` | 80×48 | pixel art cozy brown leather couch with cushions, 16-bit RPG style |
| `prop_chair.png` | 40×48 | pixel art wooden chair with cushion, 16-bit RPG style |
| `prop_table.png` | 56×40 | pixel art small wooden side table with lamp, 16-bit RPG style |
| `prop_shelf_wall.png` | 48×32 | pixel art wall-mounted wooden shelf with potted plant and picture frame, 16-bit style |
| `prop_clock.png` | 32×48 | pixel art grandfather clock, wooden with pendulum, 16-bit RPG style |
| `prop_toy_box.png` | 48×36 | pixel art wooden toy box with toys peeking out, colorful, 16-bit style |
| `prop_painting.png` | 40×32 | pixel art framed landscape painting on wall, ornate gold frame, 16-bit style |
| `prop_plant_pot.png` | 32×40 | pixel art potted green leafy plant in ceramic pot, 16-bit RPG style |

**Floor Accents (no_background: true):**

| Asset | Size | Prompt Core |
|-------|------|-------------|
| `accent_rug_large.png` | 128×40 | pixel art ornate oval area rug, warm red and gold tones, cozy pattern, 16-bit style |
| `accent_rug_small.png` | 64×24 | pixel art small welcome mat, simple woven pattern, 16-bit style |
| `accent_pet_bed.png` | 56×28 | pixel art soft round pet bed with cushion, blue fabric, 16-bit RPG style |
| `accent_food_bowl.png` | 24×16 | pixel art small pet food bowl, ceramic with kibble, 16-bit style |
| `accent_toy_ball.png` | 16×16 | pixel art small colorful bouncy ball, 16-bit style |
| `accent_slippers.png` | 24×12 | pixel art pair of cozy slippers on floor, 16-bit style |

### Generation Script

New script: **`scripts/generate_environment_layers.ts`**

- Batch 1: Outdoor strips (5 calls)
- Batch 2: Outdoor props (9 calls)
- Batch 3: Outdoor accents (8 calls)
- Batch 4: Indoor strips (3 calls)
- Batch 5: Indoor props (12 calls)
- Batch 6: Indoor accents (6 calls)

Total: **~43 API calls** across 6 batches. Sequential within each batch, batches run one at a time to manage API rate limits. Each generated asset goes to `public/assets/generated/review/environment/` first, then promoted to `public/assets/generated/final/environment/` after review.

### Style Consistency

All prompts include these shared suffixes for consistency:
- `"16-bit RPG style, clean pixel edges, vibrant saturated colors"`
- `"matching cozy modern pixel art game aesthetic"`
- Props use `no_background: true` to get clean transparent PNGs
- Strips use `no_background: false` for full opaque layers
- `text_guidance_scale: 10` across all generations
- Fixed seeds per batch for reproducibility

---

## 6. Asset Directory Structure

```
public/assets/generated/
├── final/
│   ├── environment/
│   │   ├── outdoor/
│   │   │   ├── layers/          # Strip layers
│   │   │   │   ├── layer_outdoor_sky.png
│   │   │   │   ├── layer_outdoor_far_bg.png
│   │   │   │   ├── layer_outdoor_mid_bg.png
│   │   │   │   ├── layer_outdoor_ground.png
│   │   │   │   └── layer_outdoor_below.png
│   │   │   ├── props/           # World object sprites
│   │   │   │   ├── prop_cottage.png
│   │   │   │   ├── prop_mailbox.png
│   │   │   │   ├── prop_tree_large.png
│   │   │   │   └── ...
│   │   │   └── accents/         # Ground accent overlays
│   │   │       ├── accent_flowers_red.png
│   │   │       ├── accent_rock_a.png
│   │   │       └── ...
│   │   └── indoor/
│   │       ├── layers/
│   │       │   ├── layer_indoor_wall.png
│   │       │   ├── layer_indoor_floor.png
│   │       │   └── layer_indoor_baseboard.png
│   │       ├── props/
│   │       │   ├── prop_fireplace.png
│   │       │   ├── prop_bookshelf.png
│   │       │   └── ...
│   │       └── accents/
│   │           ├── accent_rug_large.png
│   │           ├── accent_pet_bed.png
│   │           └── ...
│   ├── scene_outside.png        # PRESERVED — old flat bg (backup)
│   ├── scene_inside.png         # PRESERVED — old flat bg (backup)
│   └── ... (existing assets untouched)
```

---

## 7. File-by-File Implementation Plan

### New Files

| File | Purpose |
|------|---------|
| `src/config/sceneConfig.ts` | New `SceneConfig` definitions for outdoor + indoor scenes |
| `src/components/scene/SceneLayerRenderer.tsx` | New component replacing `SceneBackground` — renders all scene layers |
| `src/hooks/useIdleWander.ts` | New hook for pet idle-wander behavior |
| `src/hooks/useSceneScale.ts` | New hook computing viewport-to-native scale factor |
| `scripts/generate_environment_layers.ts` | Asset generation script for all environment pieces |

### Modified Files

| File | Change |
|------|--------|
| `src/components/scene/GameSceneShell.tsx` | Replace `SceneBackground` with `SceneLayerRenderer`. Pass `SceneConfig` to `SceneStage`. Wire up idle wander. |
| `src/components/scene/SceneStage.tsx` | Accept `groundY`, `walkBounds`, `petX`, `facingLeft` props. Remove hardcoded `GROUND_CLEARANCE`. Position pet using scene-derived ground. |
| `src/components/scene/EnvironmentalLife.tsx` | Adapt to work with layered scene (adjust z-indices, positioning). |
| `src/components/scene/InteractiveObjects.tsx` | Convert hotspot positions from percentage-based to native-pixel-based coordinates, scaled by viewport factor. |
| `src/config/roomConfig.ts` | Keep existing `HouseRoom` for backward compat. Add reference to `SceneConfig` per room. |
| `src/config/assetManifest.ts` | Add `environment` section with paths to all new layer/prop/accent assets. |

### Preserved Files (No Changes)

| File | Reason |
|------|--------|
| `src/components/scene/SceneOverlay.tsx` | Atmosphere overlay works as-is on top of any scene |
| `src/components/scene/SceneProps.tsx` | Legacy prop system — unused (props array empty), but kept for potential future use |
| `src/components/pet/PetSprite.tsx` | Pet rendering unchanged — it's the scene that changes, not the pet |
| `src/engine/animation/*` | Animation engine unchanged |
| `src/screens/BattleScreen.tsx` | Battle uses its own flat bg — out of scope |

### Deleted Files (After Migration)

| File | Reason |
|------|--------|
| `src/components/scene/SceneBackground.tsx` | Replaced entirely by `SceneLayerRenderer` |

---

## 8. Risks & Rollback

### Risks

| Risk | Mitigation |
|------|------------|
| Generated assets look inconsistent across batches | Use fixed seeds, shared prompt suffixes, and review step before promoting to final |
| Performance degradation from many DOM layers | Max ~15 img elements per scene. Test on target hardware. All images are tiny PNGs (<5KB each) |
| Pet appears to float at different viewport sizes | Scale factor system ensures proportional rendering. Test at multiple viewport sizes |
| Hotspot positions break after coordinate system change | Convert all existing hotspot coordinates in same PR. Verify with Playwright screenshots |
| API generates unusable assets | Review pipeline exists. Retry with adjusted prompts. Each asset can be regenerated independently |

### Rollback Plan

1. Old `scene_outside.png` and `scene_inside.png` are **never deleted** — preserved in their current location
2. Old `SceneBackground.tsx` can be restored from git history
3. Old `GROUND_CLEARANCE = 38` can be restored in `SceneStage.tsx`
4. `roomConfig.ts` backward-compatible: `HouseRoom` interface unchanged
5. Feature can be gated: if `SceneConfig` exists for a room, use layered renderer; otherwise fall back to flat image

---

## 9. Phased Execution

### Phase 1: Foundation
- Create `sceneConfig.ts` with type definitions
- Create `useSceneScale.ts` hook
- Create `SceneLayerRenderer.tsx` (renders layers from config, initially with placeholder colored divs)
- Wire into `GameSceneShell.tsx` behind a feature check

### Phase 2: Grounding System
- Refactor `SceneStage.tsx` to use `groundY` from scene config
- Remove `GROUND_CLEARANCE` constant
- Implement scale-factor-based positioning
- Verify pet feet touch the ground strip placeholder

### Phase 3: Generate Outdoor Assets
- Run outdoor strip layer generation (5 assets)
- Run outdoor prop generation (9 assets)
- Run outdoor accent generation (8 assets)
- Review and promote to final
- Populate outdoor `SceneConfig` with real asset paths and positions

### Phase 4: Outdoor Scene Live
- Render all outdoor layers, props, accents
- Tune positions and z-ordering
- Verify with Playwright screenshot comparison

### Phase 5: Generate Indoor Assets
- Run indoor strip layer generation (3 assets)
- Run indoor prop generation (12 assets)
- Run indoor accent generation (6 assets)
- Review and promote to final
- Populate indoor `SceneConfig`

### Phase 6: Indoor Scene Live
- Render all indoor layers, props, accents
- Tune positions and z-ordering
- Verify with Playwright screenshot

### Phase 7: Idle Wander
- Implement `useIdleWander` hook
- Wire into `SceneStage` for X positioning
- Add facing-direction flip
- Tune movement speed, pause timing, easing

### Phase 8: Polish & Cleanup
- Convert `InteractiveObjects` hotspots to native-pixel coordinates
- Verify `EnvironmentalLife` FX alignment with new layers
- Remove `SceneBackground.tsx`
- Remove `GROUND_CLEARANCE` references
- Run full Playwright regression suite
- Before/after screenshot comparison

---

## 10. Validation & Success Criteria

### Visual Checks (Playwright screenshots)

- [ ] Pet's feet visually touch the top edge of the ground strip
- [ ] Pet shadow renders ON the ground surface, not floating below it
- [ ] No gap between pet feet and ground at any viewport size
- [ ] Background feels layered and constructed, not flat
- [ ] All scene layers render in correct z-order (no overlapping errors)
- [ ] Props appear at correct positions relative to layers
- [ ] Ground accents sit on the ground strip, not floating
- [ ] Indoor and outdoor scenes both render correctly
- [ ] Room navigation (door clicks) still works
- [ ] Mailbox interaction still works
- [ ] Pet idle-wanders within bounds and doesn't clip scene edges
- [ ] Pet faces correct direction during wander
- [ ] No visible rendering artifacts at viewport edges

### Functional Checks

- [ ] Scene transitions (inside ↔ outside) work without errors
- [ ] Pet animations play correctly at new position
- [ ] HUD and UI elements render above all scene layers
- [ ] Debug mode (H key) still hides UI
- [ ] Sprite debug mode (D key) still works
- [ ] No console errors or warnings
- [ ] Build succeeds (`npm run build`)
- [ ] All existing Playwright tests pass

### Performance Checks

- [ ] No visible frame drops during scene rendering
- [ ] Scene loads within 500ms (all layer images are small PNGs)
- [ ] Idle wander animation is smooth (no jank)
