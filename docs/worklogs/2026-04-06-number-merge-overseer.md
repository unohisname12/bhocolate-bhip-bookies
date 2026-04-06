# Number Merge Overseer Pass

## Files Changed

- `src/features/number-merge/types.ts`
- `src/features/number-merge/game.ts`
- `src/features/number-merge/game.test.ts`
- `src/features/number-merge/pets.ts`
- `src/features/number-merge/useNumberMergeGame.ts`
- `src/features/number-merge/NumberMergeBoard.tsx`
- `src/features/number-merge/NumberMergeOverseerEntity.tsx`
- `src/screens/NumberMergeScreen.tsx`
- `scripts/generate_number_merge_overseer_assets.mjs`

## Gameplay Changes Made

- replaced the endless immediate-refill loop with an unstable-gap loop
- merges now leave temporary empty cells instead of resolving instantly
- a visible chain window opens after each merge; if the player acts fast enough, they can keep stabilizing before refill
- if the player hesitates, the Overseer claims unstable gaps and injects corruption
- added corruption tiles that occupy space and must be cleansed by moving a number into them
- added a corruption meter with a lose state at `100`
- added pressure escalation so chain windows get less forgiving over time
- kept the pet passive hook intact; Blue Koala still rewards exact `10`s
- added an animated Overseer entity layer above the board using a user-provided attack sprite sheet
- attack animation now triggers when the Overseer resolves pressure against the player
- warning pose now shows during the unstable gap window before the strike lands

## PixelLab Assets Generated

- `overseer-portrait.png`
- `corruption-tile.png`
- `overseer-warning-sigil.png`
- `overseer-meter-eye.png`
- `overseer-attack-sheet.png` (user-provided, copied into repo)

## Asset Save Locations

Raw outputs:

- `public/assets/generated/raw/number-merge/overseer-portrait.png`
- `public/assets/generated/raw/number-merge/corruption-tile.png`
- `public/assets/generated/raw/number-merge/overseer-warning-sigil.png`
- `public/assets/generated/raw/number-merge/overseer-meter-eye.png`

Final wired assets:

- `public/assets/generated/final/number-merge/overseer-portrait.png`
- `public/assets/generated/final/number-merge/corruption-tile.png`
- `public/assets/generated/final/number-merge/overseer-warning-sigil.png`
- `public/assets/generated/final/number-merge/overseer-meter-eye.png`
- `public/assets/generated/final/number-merge/overseer-attack-sheet.png`

Sprite sheet metadata:

- `overseer-attack-sheet.png`
- source file inspected at `/home/dre/Documents/art/OVER/OVERE-sheet.png`
- dimensions: `4352x256`
- layout: `17` columns, `1` row
- frame size: `256x256`
- integration uses neutral early frames for idle/warning fallback and the full strip for attack playback

## What Still Needs Polish

- tile motion is still state-snap based; gravity and strikes would feel better with explicit tweened movement
- the chain timer bar is readable but could use stronger audiovisual urgency
- corruption cleansing works, but could use a stronger payoff effect so cleanup feels less like a dead turn
- the Overseer currently uses one strong action family; future passes could add more varied interference patterns

## Known Bugs Or Risks

- no dedicated playtest coverage yet for long sessions, so corruption pacing may need tuning
- corruption tile rules are readable in UI, but the first-time onboarding could be tighter
- the overall app still emits the existing Vite chunk-size warning during production builds
