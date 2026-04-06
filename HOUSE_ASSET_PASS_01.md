# House Asset Pass 01 — Summary

## Overview

First visual pass on the scene-based room system. Rooms went from 3-4 ghostly floating props to 8-9 layered props with depth, making each room read as a distinct place.

## Stats

- **Existing assets reused:** 9 (2 unused room props + 7 item assets repurposed)
- **New assets generated:** 8 (via Pixel Lab API)
- **Total room props:** 33 (was 14)
- **Rooms completed:** 4/4 (home, kitchen, playroom, bathroom)

## Existing Assets Reused

| Asset | Original Purpose | Now Used In |
|-------|-----------------|-------------|
| `room_chair.png` | Unused room prop | Playroom (midground) |
| `room_bedroom_item.png` | Unused room prop | Home — nightstand (midground) |
| `item_bed.png` | Shop/care item | Home — pet bed (foreground) |
| `item_teddy_bear.png` | Shop/toy item | Playroom — floor toy (foreground) |
| `item_toy_block.png` | Shop/toy item | Playroom — floor toy (foreground) |
| `item_fruit_bowl.png` | Food item | Kitchen — on table (midground) |
| `item_bread.png` | Food item | Kitchen — counter food (foreground) |
| `item_soap.png` | Care item | Bathroom — floor (foreground) |
| `item_towel.png` | Care item | Bathroom — wall/rack (midground) |

## New Assets Generated

| Asset | Room | Purpose |
|-------|------|---------|
| `house_home_couch.png` | Home | Living room anchor — large leather sofa |
| `house_home_fireplace.png` | Home | Warmth/ambiance — stone fireplace with fire |
| `house_kitchen_counter.png` | Kitchen | Kitchen anchor — wooden counter with drawers |
| `house_kitchen_stove.png` | Kitchen | Kitchen identity — stove with pot |
| `house_playroom_banner.png` | Playroom | Playroom personality — pennant banner flags |
| `house_bathroom_bathtub.png` | Bathroom | Bathroom anchor — clawfoot tub with bubbles |
| `house_bathroom_mirror.png` | Bathroom | Bathroom wall — oval vanity mirror |
| `house_shared_doorframe.png` | All (shared) | Structural — arched doorframe at room edge |

## Shared Assets

- `house_shared_doorframe.png` — used in Home, Kitchen, and Bathroom (not Playroom, which uses banner instead)

## Room Breakdown

### Home (Living Room) — 9 props
- Background: doorframe, painting
- Midground: fireplace, lamp, couch, shelf, nightstand
- Foreground: carpet, pet bed

### Kitchen — 8 props
- Background: doorframe, shelf
- Midground: counter, stove, table, fruit bowl
- Foreground: food bowl, bread

### Playroom — 8 props
- Background: banner, poster
- Midground: toy box, books, chair
- Foreground: rug, teddy bear, toy blocks

### Bathroom — 8 props
- Background: doorframe, window, mirror, clock
- Midground: bathtub, plant, towel
- Foreground: soap

## Layer System Added

Props now have an optional `layer` field: `'background' | 'midground' | 'foreground'`

| Layer | Opacity | Use Case |
|-------|---------|----------|
| background | 0.45 | Wall decor, windows, posters, mirrors, doorframes |
| midground | 0.70 | Furniture: couches, tables, shelves (default, backward-compatible) |
| foreground | 0.90 | Floor items: rugs, bowls, toys, soap |

## Files Updated

| File | Change |
|------|--------|
| `src/config/roomConfig.ts` | Added `layer?` to PropPlacement; rewrote all 4 room prop arrays |
| `src/components/scene/SceneProps.tsx` | Added LAYER_CONFIG; render opacity/zIndex from layer |
| `src/config/generatedAssetManifest.ts` | Added 8 new house_* entries |

## Files Created

| File | Purpose |
|------|---------|
| `scripts/generate_house_assets.ts` | Generation script for house assets |
| `HOUSE_ASSET_PASS_01.md` | This summary |

## Still Missing (Future Passes)

- **Room-specific background art** — painted scene backdrops instead of CSS gradients
- **Animated props** — flickering fireplace, bubbling bathtub, swaying plant
- **Wall/floor textures** — tiled flooring, wallpaper patterns
- **Additional rooms** — bedroom, garden, study
- **Interactive props** — clickable furniture that triggers actions
- **Seasonal decorations** — holiday-themed room props
- **Player-purchased decorations** — expand ROOM_DECORATIONS shop with new items

## Manual Review Notes

- All 8 generated assets used `no_background: true` and `text_guidance_scale: 10`
- `house_kitchen_stove` and `house_bathroom_bathtub` required retry (network timeout on first attempt)
- `house_shared_doorframe` required retry (network timeout on first attempt)
- All assets are 128x128 pixel art matching existing style
- No existing assets were overwritten
