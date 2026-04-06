# Current Repo Map

## Top-Level

### Root files

- [package.json](/home/dre/Documents/jules_session_6038930338873785630/package.json): scripts and dependencies
- [README.md](/home/dre/Documents/jules_session_6038930338873785630/README.md): currently default Vite-oriented, not project-specific
- [tsconfig.app.json](/home/dre/Documents/jules_session_6038930338873785630/tsconfig.app.json)
- [tsconfig.node.json](/home/dre/Documents/jules_session_6038930338873785630/tsconfig.node.json)

## `src`

### App shell

- [main.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/main.tsx)
- [App.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/App.tsx)
- [index.css](/home/dre/Documents/jules_session_6038930338873785630/src/index.css)
- [App.css](/home/dre/Documents/jules_session_6038930338873785630/src/App.css)
- [animations.css](/home/dre/Documents/jules_session_6038930338873785630/src/animations.css)

### Main directories

- `src/assets`: local imported art assets
- `src/components`: reusable UI/game components
- `src/config`: static config and manifests
- `src/devtools`: debug tooling
- `src/engine`: central game engine
- `src/features`: feature-local modules
- `src/hooks`: shared React hooks
- `src/screens`: top-level screens
- `src/services`: persistence, Firebase, help, PixelLab, game helpers
- `src/types`: shared type definitions
- `src/utils`: sprite and analysis helpers

## `src/components`

### `battle`

Battle presentation and sequencing:

- action bars
- HP bars
- combo meters
- enemy intent
- battle effects
- trace event control
- collapse overlays
- combat timing helpers

### `help`

In-app help UI:

- help panel
- tutorial overlay
- dialogue bubble
- hint toast
- help provider
- spotlight mask

### `math`

Math interaction UI:

- prompt card
- answer input

### `momentum`

Momentum board mode UI and effects:

- board
- board cells and pieces
- HUD and logs
- action bar
- result overlays
- effect animations
- theme files

### `pet`

Pet presentation and care UI:

- pet sprite
- egg sprite
- chamber/panel components
- needs panel
- incubation panel
- reaction bursts

### `scene`

Home/room scene shell:

- stage and layers
- background
- top HUD
- right side panel
- room navigation
- interactive objects
- overlays
- mailbox popup

### `trace`

Trace interaction UI:

- HUD
- overlay
- target path
- player stroke
- result flash

### `ui`

Generic app UI primitives:

- buttons
- cards
- modal
- toast
- progress bar
- icon badge
- error boundary
- currency display
- achievement popup

## `src/config`

Main config groups:

- battle tuning
- momentum tuning
- run tuning
- species definitions
- reward tables
- room config
- shop config
- PvP config
- scene config
- asset and animation manifests
- help content config
- generated asset manifest

This folder is effectively the data layer for balance/content.

## `src/devtools`

Current devtools components:

- action log
- time control
- snapshot manager
- state inspector
- need sliders
- sprite debugger
- overlay index and actions

## `src/engine`

### `core`

- engine runtime class
- core engine/action types
- middleware scaffold

### `state`

- initial state creation
- reducer
- test engine state creation

### `systems`

Systems currently present include:

- achievements
- animation
- battle
- battle AI
- classroom simulation
- combat feel
- inventory
- matchmaking
- momentum
- momentum AI
- mood
- pet intent
- pet need
- room
- run
- run battle adapter
- run map generator
- run passive effects
- streak
- test mode
- trophies

There is also a substantial test suite under `src/engine/systems/__tests__`.

### `animation`

- sprite renderer
- animation controller
- animation types

### `hooks`

- `useGameEngine`

### `selectors`

- selector exports

## `src/features`

### `number-merge`

Feature-local Number Merge implementation:

- board/component rendering
- game logic
- difficulty presets
- React state hook
- types
- pet modifiers
- tests
- animated Overseer entity

## `src/hooks`

Shared hooks include:

- analytics
- sound
- scene scaling
- idle wander
- trace interaction

## `src/screens`

Top-level screens currently checked into repo:

- animation review
- asset review
- battle
- challenger preview
- class roster
- feeding
- incubation
- match result
- math
- momentum
- Number Merge
- pet home
- run encounter
- run event
- run map
- run over
- run rest
- run reward
- run start
- shop
- test mode

## `src/services`

### Main service groups

- `firebase`
- `help`
- `persistence`
- game-specific services
- PixelLab and review helpers

### Notable files

- [pixelLab.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/pixelLab.ts)
- [animationReview.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/animationReview.ts)
- [assetReview.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/assetReview.ts)
- [SaveManager.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/persistence/SaveManager.ts)
- [mathEngine.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/game/mathEngine.ts)
- [traceEngine.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/game/traceEngine.ts)
- [evolutionEngine.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/game/evolutionEngine.ts)

## `src/types`

Shared domain types cover:

- achievements
- battles
- battle tickets
- classroom
- engine
- events
- help
- inventory
- match results
- momentum
- pets
- players
- rooms
- runs
- sessions
- traces
- trophies

## `public`

### High-level asset groups

- `public/assets/pets/*`
- `public/assets/generated/final/*`
- `public/assets/generated/final/number-merge/*`
- `public/assets/generated/rejected/*`
- `public/assets/backups/*`

### Number Merge generated assets

- [overseer-portrait.png](/home/dre/Documents/jules_session_6038930338873785630/public/assets/generated/final/number-merge/overseer-portrait.png)
- [corruption-tile.png](/home/dre/Documents/jules_session_6038930338873785630/public/assets/generated/final/number-merge/corruption-tile.png)
- [overseer-warning-sigil.png](/home/dre/Documents/jules_session_6038930338873785630/public/assets/generated/final/number-merge/overseer-warning-sigil.png)
- [overseer-meter-eye.png](/home/dre/Documents/jules_session_6038930338873785630/public/assets/generated/final/number-merge/overseer-meter-eye.png)
- [overseer-attack-sheet.png](/home/dre/Documents/jules_session_6038930338873785630/public/assets/generated/final/number-merge/overseer-attack-sheet.png)

## `docs`

Existing docs include:

- repo audit
- verification report
- lore
- run design docs
- superpowers plans/specs
- Number Merge prototype doc
- Number Merge Overseer worklog

Added in this pass:

- [current-repo-reference.md](/home/dre/Documents/jules_session_6038930338873785630/docs/current-repo-reference.md)
- [current-repo-map.md](/home/dre/Documents/jules_session_6038930338873785630/docs/current-repo-map.md)

## Known Practical Notes

- The project is substantially larger than the `README.md` suggests.
- Number Merge is one of the most self-contained feature folders.
- Full repo validation has recently been affected by existing run-system TypeScript issues outside Number Merge.
