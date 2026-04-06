# Number Merge Prototype

## Rules implemented

- `6x6` board with random starting values from `1-5`
- player selects or drags one tile into an orthogonally adjacent tile
- destination tile becomes the sum, origin tile is removed
- board resolves with downward gravity and top refill
- simple score gain based on merge value, with extra score for chain merges
- cascade rule for v1:
  only the newly created tile may auto-merge again when it ends up touching an equal-value tile after resolution
- pet extension hook via `getPetModifier(...)`
- Blue Koala example passive:
  when the player lands an exact `10`, and the passive cooldown is ready, one random low tile upgrades by `+1`

## Intentionally simplified

- no long animation timeline or tween engine; feedback is lightweight and class-based
- no persistence, progression, or rewards wired into the wider engine yet
- drag support is intentionally simple pointer-down/pointer-up interaction on adjacent tiles
- cascade logic is limited to the created tile, which keeps the rule legible and prevents chaotic whole-board auto-solves

## Best next improvements

- animate tile travel and gravity positions instead of only stateful feedback markers
- add move previews and a clearer score-combo burst layer
- persist best score per pet and connect rewards back into the main game loop
- add more pet modifiers once the passive hook has seen a bit of playtesting
