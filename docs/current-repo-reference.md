# Current Repo Reference

## Purpose

This repo is a React + TypeScript + Vite virtual-pet game with several connected game modes:

- pet incubation and home care
- feeding / cleaning / mood management
- classroom / challenger selection
- battle and PvP-style systems
- run / roguelite progression
- math mini-games
- momentum board mode
- Number Merge / Overseer mode
- asset and animation review tools
- built-in devtools and test mode

This document is a practical reference for the repo as it exists now. It does not explain every single line of code, but it captures the current architecture, major systems, file layout, and the most important implementation details visible from the codebase.

## Repo Snapshot

- Root path: `/home/dre/Documents/jules_session_6038930338873785630`
- Frontend stack: `React 19`, `TypeScript 5`, `Vite 8`
- Styling: CSS + Tailwind utility classes
- Testing: `Vitest` for unit tests, `Playwright` for e2e
- External services present in repo:
  - Firebase
  - PixelLab service integration
- Approximate file counts:
  - `src`: `246` files
  - `public`: `1063` files

## Tooling And Scripts

From [package.json](/home/dre/Documents/jules_session_6038930338873785630/package.json):

- `npm run dev`: starts Vite dev server
- `npm run build`: runs TypeScript build then Vite build
- `npm run lint`: ESLint
- `npm run typecheck`: `tsc -b`
- `npm run test`: Vitest
- `npm run test:e2e`: Playwright
- `npm run verify`: full validation pipeline
- `npm run preview`: Vite preview

## Entry Flow

### App bootstrap

The app starts in [main.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/main.tsx):

- imports global CSS
- mounts `<App />`
- wraps the app in a UI error boundary

### App orchestration

[App.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/App.tsx) is the high-level router/orchestrator.

It is responsible for:

- loading initial engine state
- restoring saves through `SaveManager`
- migrating a legacy save format if needed
- booting the engine through `useGameEngine`
- routing between the active screens
- enabling dev-only review and picker flows
- registering help content at module load

Important details:

- The app uses a central engine state instead of per-screen local app state for the main game.
- Number Merge is currently mounted as its own screen and uses its own feature-local state hook, separate from the main engine reducer.
- The current `README.md` is still mostly the default Vite template and does not describe the actual game repo.

## High-Level Architecture

The repo is split into these major layers:

### `src/engine`

The main game state machine.

- `core`: engine class, action types, core engine types
- `state`: initial state creation and reducer
- `systems`: domain systems for battle, pet needs, runs, momentum, room logic, achievements, etc.
- `hooks`: React bindings for the engine
- `selectors`: exported selector helpers
- `animation`: sprite/animation controller pieces

### `src/screens`

Top-level screen components. `App.tsx` chooses one of these based on engine state or feature state.

### `src/components`

UI and game-mode components grouped by domain:

- `battle`
- `help`
- `math`
- `momentum`
- `pet`
- `scene`
- `trace`
- `ui`

### `src/features`

Feature-local state and logic. Right now the notable self-contained feature folder is:

- [number-merge](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge)

This is separate from the main engine and has its own pure game logic, types, difficulty presets, React hook, board renderer, and Overseer entity renderer.

### `src/services`

Service-like helpers that sit outside the reducer:

- save/persistence
- Firebase config/api
- PixelLab integration
- help engines
- game-specific evolution/math/trace engines
- asset and animation review services

### `src/config`

Static config and balance data:

- species
- rooms
- run enemies and rewards
- battle config
- momentum config
- achievement config
- shop config
- help config
- scene and animation manifests
- generated asset manifest

### `public`

Runtime-served art and generated assets. This repo has a large amount of image content, including:

- pet art
- generated room/environment pieces
- effect sprites
- generated Number Merge Overseer art
- review and backup outputs

## Engine Model

### GameEngine class

[GameEngine.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/core/GameEngine.ts) is a thin engine runtime:

- stores current `EngineState`
- starts and stops a tick loop
- dispatches actions
- runs the central reducer
- keeps a recent action log
- supports state subscribers and action subscribers

Default behavior:

- tick loop runs on `window.setInterval`
- engine dispatches `TICK` actions
- reducer owns actual game logic

### React binding

[useGameEngine.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/hooks/useGameEngine.ts) wraps the engine for React:

- creates one engine instance
- subscribes component state to engine state
- auto-starts the engine if not initialized
- exposes `state`, `engine`, and `dispatch`

### Initial engine state

[createInitialEngineState.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/state/createInitialEngineState.ts) defines the base application state.

Key domains in initial state:

- engine lifecycle fields
- pet and egg
- player currencies and streaks
- inventory
- room and current room
- battle
- run
- momentum
- events / notifications / achievements
- animation state
- daily goals
- classroom / roster / opponent selection
- battle tickets
- match history
- trophy case
- mailbox
- contextual help state

### Central reducer

[engineReducer.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/state/engineReducer.ts) is the main orchestration point.

It delegates to many domain systems, including:

- `PetNeedSystem`
- `MoodSystem`
- `InventorySystem`
- `RoomSystem`
- `AchievementSystem`
- `BattleSystem`
- `StreakSystem`
- `ClassroomSimulator`
- `MatchmakingSystem`
- `TrophySystem`
- `MomentumSystem`
- `MomentumAI`
- `RunSystem`
- `RunPassiveEffects`
- `CombatFeelSystem`
- evolution helpers from `services/game/evolutionEngine`

This reducer is where most core game mode transitions and reward updates happen.

## Screen Inventory

Current screen files under `src/screens` include:

- [IncubationScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/IncubationScreen.tsx)
- [PetHomeScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/PetHomeScreen.tsx)
- [FeedingScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/FeedingScreen.tsx)
- [ShopScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/ShopScreen.tsx)
- [MathScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/MathScreen.tsx)
- [MomentumScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/MomentumScreen.tsx)
- [NumberMergeScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/NumberMergeScreen.tsx)
- [BattleScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/BattleScreen.tsx)
- [RunStartScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunStartScreen.tsx)
- [RunMapScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunMapScreen.tsx)
- [RunEncounterScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunEncounterScreen.tsx)
- [RunRewardScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunRewardScreen.tsx)
- [RunRestScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunRestScreen.tsx)
- [RunEventScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunEventScreen.tsx)
- [RunOverScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/RunOverScreen.tsx)
- [ClassRosterScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/ClassRosterScreen.tsx)
- [ChallengerPreviewScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/ChallengerPreviewScreen.tsx)
- [MatchResultScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/MatchResultScreen.tsx)
- [AssetReviewScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/AssetReviewScreen.tsx)
- [AnimationReviewScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/AnimationReviewScreen.tsx)
- [TestModeScreen.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/screens/TestModeScreen.tsx)

In practice, `App.tsx` uses these as the visible app routes.

## Number Merge Feature

The Number Merge mode is one of the clearest feature-isolated parts of the repo.

Files:

- [types.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/types.ts)
- [difficulty.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/difficulty.ts)
- [game.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/game.ts)
- [useNumberMergeGame.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/useNumberMergeGame.ts)
- [NumberMergeBoard.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/NumberMergeBoard.tsx)
- [NumberMergeOverseerEntity.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/NumberMergeOverseerEntity.tsx)
- [pets.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/pets.ts)
- [game.test.ts](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge/game.test.ts)

Current design themes visible in code:

- adjacent tile movement
- merges by addition
- empty cells matter
- local board state is independent of the main engine reducer
- difficulty presets gate mechanics
- Overseer acts as hostile pressure
- pet passive hook exists for subtle assistance

Recent state of the mode from the current code:

- multiple difficulties exist
- goals are turn-based
- empty cells can be created and preserved
- moving into empty cells costs a turn
- goals are intended to be reachable from current board state
- impossible goals can reroll with a half-star penalty
- floating goal tracker exists in the screen UI
- Overseer has portrait and entity art in `public/assets/generated/final/number-merge`

## Battle / Run / Momentum Presence

The repo contains substantial systems for three other gameplay areas:

### Battle

Presence is visible in:

- `src/components/battle/*`
- `src/engine/systems/BattleSystem.ts`
- `src/engine/systems/BattleAI.ts`
- `src/config/battleConfig.ts`
- `src/config/combatFeelConfig.ts`

This appears to support:

- player and enemy moves
- effects/status handling
- combo / combat feel layers
- enemy intent
- collapse / trace / weak point mechanics

### Momentum

Presence is visible in:

- `src/components/momentum/*`
- `src/engine/systems/MomentumSystem.ts`
- `src/engine/systems/MomentumAI.ts`
- `src/config/momentumConfig.ts`

This appears to be another board-based mode with:

- piece movement
- attack/effect animations
- HUD/action bar/log UI

### Run / Roguelite Flow

Presence is visible in:

- run screens
- `RunSystem.ts`
- `RunPassiveEffects.ts`
- run config files

This appears to support:

- starting a run
- map traversal
- encounters
- rewards
- rest nodes
- events
- run over flow

## Services Layer

Important service groups:

### Persistence

- [SaveManager.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/persistence/SaveManager.ts)
- [saveValidation.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/persistence/saveValidation.ts)
- [saveMigrations.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/persistence/saveMigrations.ts)

These handle save loading, validation, and migrations.

### Help System

- `src/services/help/*`
- `src/config/help/*`
- `src/components/help/*`

This is a real in-app help/tutorial/hint subsystem, not just a static FAQ.

### Firebase

- [config.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/firebase/config.ts)
- [api.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/firebase/api.ts)

Firebase is integrated in the repo, though this document does not verify which features are actively used at runtime.

### PixelLab

- [pixelLab.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/pixelLab.ts)
- [pixelLab.manual.ts](/home/dre/Documents/jules_session_6038930338873785630/src/services/__tests__/pixelLab.manual.ts)

This repo includes a service interface around PixelLab and generated asset outputs in `public/assets/generated`.

## Config Layer

The config directory is large and acts as a tuning/data layer.

Important examples:

- [speciesConfig.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/speciesConfig.ts)
- [assetManifest.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/assetManifest.ts)
- [generatedAssetManifest.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/generatedAssetManifest.ts)
- [gameConfig.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/gameConfig.ts)
- [battleConfig.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/battleConfig.ts)
- [runConfig.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/runConfig.ts)
- [shopConfig.ts](/home/dre/Documents/jules_session_6038930338873785630/src/config/shopConfig.ts)

This suggests the repo tries to keep tuning values and content data outside UI components where possible.

## Assets

Asset structure is broad. A few notable patterns:

- `public/assets/pets/blue-koala/*`
- `public/assets/generated/final/*`
- `public/assets/generated/final/number-merge/*`
- `public/assets/generated/rejected/*`
- `public/assets/backups/*`

The repo keeps both approved/generated assets and rejected/review material. That is useful for development history, but it also makes the asset tree large and noisy.

## Devtools And Internal Review Tools

There is a meaningful internal tooling layer under `src/devtools`.

Examples:

- action log
- time control
- snapshot manager
- state inspector
- sprite debugger
- devtools overlay

There are also dedicated review screens:

- asset review
- animation review

This repo is not just a runtime app; it includes a lot of build-and-review tooling for content iteration.

## Saves And Migration Behavior

`App.tsx` currently does the following on startup:

- creates a base state
- attempts to load a newer save through `SaveManager`
- falls back to a legacy save key
- migrates parts of the older save shape into the current engine state

That means save compatibility has already mattered in this repo, and changes to core state shape should be made carefully.

## Testing State

The repo includes many unit tests, especially around engine systems:

- battle
- combat feel
- momentum
- run events
- run passive effects
- run battle adapter
- Number Merge

Important practical note from the current working state:

- Number Merge tests have been passing during recent work.
- Full repo `typecheck` and `build` have previously been blocked by unrelated existing run-system TypeScript issues, especially around run files such as `RunSystem.ts`, `RunBattleAdapter.ts`, and related run tests.

Treat that as current known repo state unless those files are cleaned up.

## Current Architectural Pattern

This repo uses two patterns side by side:

### Pattern 1: central engine-driven game state

Used for:

- pet lifecycle
- battle
- run
- momentum
- room/home flow
- progression and rewards

### Pattern 2: feature-local React state with pure logic helpers

Used clearly by Number Merge.

That split is important:

- not every mini-game is routed through the main reducer
- newer or more experimental features may be intentionally isolated
- this keeps high-risk iteration scoped while preserving the engine for mainline systems

## What Looks Good

- clear separation between config, engine, screens, and components
- substantial amount of pure/system logic outside JSX
- good use of feature-local folders for Number Merge
- test coverage exists for several non-trivial systems
- strong asset pipeline presence
- built-in tooling for debugging and content review

## What Looks Risky Or Costly

- `README.md` is stale and does not explain the actual project
- asset tree is large and can be hard to audit
- central reducer is very broad and likely expensive to reason about
- there is a mixed architecture between engine-owned and feature-local game modes
- known repo-wide TypeScript issues in run-system files can block full validation

## Suggested Reading Order

If someone is new to the repo, the fastest orientation path is:

1. [App.tsx](/home/dre/Documents/jules_session_6038930338873785630/src/App.tsx)
2. [createInitialEngineState.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/state/createInitialEngineState.ts)
3. [engineReducer.ts](/home/dre/Documents/jules_session_6038930338873785630/src/engine/state/engineReducer.ts)
4. one screen of interest
5. one matching system/config pair
6. [src/features/number-merge](/home/dre/Documents/jules_session_6038930338873785630/src/features/number-merge) if you want the cleanest recent feature example

## Related Docs Already In Repo

Existing docs worth reading:

- [repo-audit-2026-04-05.md](/home/dre/Documents/jules_session_6038930338873785630/docs/repo-audit-2026-04-05.md)
- [verification-report-2026-04-05.md](/home/dre/Documents/jules_session_6038930338873785630/docs/verification-report-2026-04-05.md)
- [number-merge-prototype.md](/home/dre/Documents/jules_session_6038930338873785630/docs/number-merge-prototype.md)
- [2026-04-06-number-merge-overseer.md](/home/dre/Documents/jules_session_6038930338873785630/docs/worklogs/2026-04-06-number-merge-overseer.md)
- [run-v1.md](/home/dre/Documents/jules_session_6038930338873785630/docs/run-v1.md)
- [LORE.md](/home/dre/Documents/jules_session_6038930338873785630/docs/LORE.md)

## Bottom Line

This repo is no longer a simple Vite app. It is a fairly large game project with:

- a central reducer-driven simulation core
- several independent game modes
- a significant asset pipeline
- content review tooling
- persistence and migration concerns
- live experimentation in newer feature folders like Number Merge

If you want a deeper follow-up doc, the most useful next passes would be:

- a screen-by-screen flow document
- a reducer action catalog
- a save schema reference
- a Number Merge-only design/architecture note
