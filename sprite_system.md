# Sprite System

This project uses a config-driven sprite pipeline.

## Critical Staging Rule: `/game ready/`

`/game ready/` is the official staging area for all new sprite assets.

From now on, AI agents must follow this order before doing sprite integration work:

1. Check `/game ready/` first.
2. Identify each sprite sheet and determine animation behavior.
3. Move each sheet into the correct structured folder.
4. Rename files for consistency.
5. Only after this, wire assets into `assetManifest.ts` and runtime.

Never assume assets are missing until `/game ready/` has been checked.

## Current Blue Koala Behavior Groups

- `adult-walk` (legacy existing location)
- `hatching`
- `dancing`
- `cleaning`

Target organization:

```text
assets/
  pets/
    blue-koala/
      adult-walk/
      hatching/
      dancing/
      cleaning/
```

Notes:

- Do not move legacy `adult-walk` unless required.
- Keep fail-safes: missing asset should log clearly and not crash the app.
