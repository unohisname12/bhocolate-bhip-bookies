# Asset Review Mode

Dev-only tool for reviewing the 100 generated pixel art assets in-game before they go live.

## How to Access

1. Run the dev server: `npm run dev`
2. Click the purple **"Review Assets"** button in the top-right corner (visible in DEV mode only)
3. Or dispatch `SET_SCREEN` with `screen: 'asset_review'` from devtools

## Features

- **Large preview** with checkerboard transparency background and 2x pixel-perfect rendering
- **Keep / Reject / Fix** status buttons per asset
- **Notes** — attach a text note to any asset (useful for "fix" items: "too dark", "wrong color")
- **Keyboard shortcuts** for fast reviewing
- **Category filters** (Icons, Items, Rewards, Room Props, Effects, Math)
- **Status filters** (All, Unreviewed, Keep, Reject, Fix)
- **Thumbnail strip** with color-coded status indicators
- **Progress bar** showing overall review completion
- **Context preview** — see the asset on dark/light backgrounds, in a HUD bar, in a shop card, and at 2x scale
- **Export** — download full JSON report or fix-only list for regeneration
- **Persistent** — review data survives page reloads (localStorage key: `vpet_asset_review`)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `K` | Mark as **Keep** |
| `R` | Mark as **Reject** |
| `F` | Mark as **Fix** |
| `U` | Reset to **Unreviewed** |
| `←` / `→` | Navigate previous / next |
| `C` | Toggle context preview |
| `1`-`7` | Filter by category (1=All, 2=Icons, 3=Items, 4=Rewards, 5=Room, 6=Effects, 7=Math) |
| `Esc` | Exit review mode |

## Export Formats

### Full Report (`asset_review_report.json`)
Contains all 100 assets with metadata, review status, notes, and timestamps.

### Fix List (`asset_fix_list.json`)
Contains only assets marked "Fix" with their original prompts and notes — ready to feed into a regeneration script.

## Files

| File | Purpose |
|------|---------|
| `src/config/generatedAssetManifest.ts` | Typed manifest of all 100 assets |
| `src/services/assetReview.ts` | localStorage persistence + export logic |
| `src/screens/AssetReviewScreen.tsx` | Full review UI |
| `src/App.tsx` | Route + dev button |
| `src/types/session.ts` | `asset_review` added to `ScreenName` |

## Data Storage

- **Key:** `vpet_asset_review`
- **Format:** `Record<assetId, { status, note, reviewedAt }>`
- **Reset:** "Reset All" button in the bottom-right of the review screen
