# Virtual Pet Game — Full Roadmap & Implementation Plan

## Context

This is an active React + TypeScript (Vite) virtual pet game with ~3000 lines across 47 source files. The codebase has a working egg incubation flow, pet care screen, math training game, feeding modal, and partial test mode. Critical architectural problems: dual state system (useGameState + GameEngine running in parallel), bug-prone sprite renderer, game logic tangled with React, no real persistence, and placeholder systems (battle, evolution, mastery, streaks) that exist as types but have no implementation.

This plan defines steps 0–20. Each step is expanded into exact file-level implementation instructions.

---

## STEP 0: CODEBASE AUDIT & DEAD CODE CLEANUP

### What You Will Build
- Clean baseline with no dead imports, unused variables, or orphaned code paths
- Verified build (zero TS errors, zero lint errors)
- Documented list of placeholder types that have no implementation yet

### Exact File Changes

**MODIFY:**
- `src/types/player.ts` — Mark `mathMastery`, `streaks`, `unlockedRoomItems` with `// PLACEHOLDER: implemented in Step 18, 11` comments so they're not accidentally deleted
- `src/types/session.ts` — Mark `battleState`, `eggInteractionState` with step references
- `src/services/firebase/config.ts` — Remove if truly unused; if the firebase import in api.ts references it, keep but mark as placeholder
- `src/assets/react.svg`, `src/assets/vite.svg` — Delete (Vite boilerplate, unused)
- `eslint.config.js` — Enable `noUnusedLocals` and `noUnusedParameters` temporarily to catch dead code, then fix all violations
- `src/App.tsx` — Audit: both `useGameState` and `useGameEngine` are called here; document which one actually drives each screen. Currently `useGameState` drives IncubationScreen/PetHomeScreen/MathScreen/FeedingScreen and `useGameEngine` drives TestModeScreen + animation state. This dual ownership is the root bug — documented here, fixed in Step 6.

**DELETE:**
- `src/assets/react.svg`
- `src/assets/vite.svg`
- `virtual-pet-game.zip` (build artifact in project root)

### Code Structure
No new code. This is audit-only.

### Integration Points
- Run `npx tsc --noEmit` — fix all type errors
- Run `npx eslint .` — fix all lint errors
- Run `npm run build` — must succeed with zero warnings

### Order of Implementation
A. Run `tsc --noEmit`, fix errors → B. Run eslint, fix errors → C. Delete dead assets → D. Add placeholder comments to unused type fields → E. Run `npm run build` → F. Verify dev server starts and all 5 screens render

### Test / Validation
- `npm run dev` — navigate to each screen (incubation, pet home, math, feeding, test mode)
- Confirm no console errors
- Confirm build passes

### Failure Modes
- Deleting a file that's actually imported somewhere (check imports before deleting)
- Breaking the firebase mock API by removing config.ts (check if api.ts imports it)

---

## STEP 1: TYPE SYSTEM HARDENING

### What You Will Build
- Single source of truth for all game types
- Strict union types for all state enums
- Branded ID types to prevent ID mixups
- All optional fields explicitly marked

### Exact File Changes

**MODIFY `src/types/pet.ts`:**
- Change `state: PetState` to use literal union: `'idle' | 'sleeping' | 'hungry' | 'happy' | 'sick' | 'dead'`
- Change `stage` to literal union: `'egg' | 'baby' | 'juvenile' | 'adult' | 'elder'`
- Change `mood` to literal union: `'calm' | 'playful' | 'curious' | 'anxious' | 'angry'`
- Add `PetNeeds` as a named type: `{ hunger: number; happiness: number; cleanliness: number; health: number }`
- Add `PetStats` as named type: `{ strength: number; speed: number; defense: number }`
- Add `PetProgression` as named type: `{ level: number; xp: number; evolutionFlags: string[] }`
- Make `timestamps.lastFedAt`, `lastCleanedAt` required (default to `createdAt` value)

**MODIFY `src/types/player.ts`:**
- Make `currencies.coins` required (default `0`)
- Add `QuizOutcome` type: `'creative' | 'logical' | 'balanced'`
- Type `quizOutcome` field as `QuizOutcome | null`

**MODIFY `src/types/session.ts`:**
- Define `ScreenName = 'incubation' | 'home' | 'math' | 'feeding' | 'battle' | 'test'`
- Type `currentScreen` as `ScreenName`
- Define `BattleState` interface (placeholder for Step 16): `{ active: false }` | full battle state
- Define `EggInteractionState` interface properly

**MODIFY `src/types/index.ts`:**
- Re-export all new named types
- Add `GameScreen` type alias matching engine's screen values
- Ensure `Egg` has `state: 'incubating' | 'ready' | 'hatched'` (already does, verify)

**MODIFY `src/types/events.ts`:**
- Define `GameEventType` literal union: `'egg_tapped' | 'pet_hatched' | 'pet_fed' | 'pet_cleaned' | 'pet_played_with' | 'pet_healed' | 'math_solved' | 'battle_won' | 'battle_lost' | 'item_purchased' | 'pet_evolved'`
- Type the `type` field as `GameEventType` instead of `string`

**CREATE `src/types/engine.ts`:**
- Move `EngineState` from `src/engine/core/EngineTypes.ts` into shared types
- Define `EngineMode = 'normal' | 'test'`
- Define `AnimationState` interface (currently inline in EngineTypes)
- Define `TestState` interface

### Code Structure
```
types/
  index.ts      — re-exports everything
  pet.ts        — Pet, PetState, PetNeeds, PetStats, PetStage, PetMood
  player.ts     — PlayerProfile, QuizOutcome, MathMastery
  session.ts    — SessionState, ScreenName, BattleState, EggInteractionState
  events.ts     — GameEvent, GameEventType
  engine.ts     — EngineState, EngineMode, AnimationState, TestState (NEW)
```

### Integration Points
- `src/engine/core/EngineTypes.ts` — replace with import from `types/engine.ts`, keep file as re-export for backward compat during migration
- `src/engine/core/ActionTypes.ts` — update action payloads to use new types
- Every file importing from `types/` will get stricter types — fix resulting type errors

### Order of Implementation
A. Create `types/engine.ts` → B. Update `types/pet.ts` → C. Update `types/player.ts` → D. Update `types/session.ts` → E. Update `types/events.ts` → F. Update `types/index.ts` re-exports → G. Update `EngineTypes.ts` to re-export from `types/engine.ts` → H. Fix all resulting type errors across codebase → I. `tsc --noEmit` passes

### Test / Validation
- `npx tsc --noEmit` must pass
- All screens still render
- No runtime errors in console

### Failure Modes
- Changing a type that breaks the engineReducer switch cases (test each action type)
- Making a field required that's undefined at runtime in existing save data (add defaults in load path)

---

## STEP 2: CONFIG CONSOLIDATION

### What You Will Build
- Unified config system with typed, validated configs
- All magic numbers extracted from service files into config
- Config validation at startup

### Exact File Changes

**MODIFY `src/config/gameConfig.ts`:**
- Add `DECAY_RATES` object: `{ hunger: 5, happiness: 2, cleanliness: 3, health: 1, healthMultiplierThreshold: 30, healthMultiplierFactor: 2 }` — extracted from `careEngine.ts` and `PetNeedSystem.ts`
- Add `TICK_INTERVAL_MS = 1000` — extracted from `useGameEngine.ts`
- Add `DECAY_INTERVAL_MS = 60000` — extracted from `useGameState.ts`
- Add `PET_STATE_THRESHOLDS` object: `{ dead: 0, sick: 25, hungry: 30, happy: 80, sleepStart: 22, sleepEnd: 6 }` — extracted from `petStateMachine.ts` and `MoodSystem.ts`
- Add `ANIMATION_DEFAULTS` object: `{ defaultFrameDuration: 175, scale: 3.0 }` — extracted from `PetSprite.tsx`
- Add `EGG_CONFIG` object: `{ maxProgress: 100, tapIncrement: 10 }` — extracted from `evolutionEngine.ts` and `rewardConfig.ts`
- Type all config objects with `as const` for literal types

**MODIFY `src/config/rewardConfig.ts`:**
- Already well-structured. Add `STREAK_THRESHOLDS` array for Step 18 placeholder: `[]`

**MODIFY `src/config/speciesConfig.ts`:**
- Ensure each species has `assetKey` matching `assetManifest.ts` pet keys
- Add `koala` species entry (currently only `slime_baby`, `mech_bot`, `basic`)

**MODIFY `src/config/assetManifest.ts`:**
- Type the ASSETS object: `Record<string, AssetConfig>` with proper `AssetConfig` interface
- Define `SpriteSheetConfig` interface: `{ url: string; spriteSheet: true; cols: number; rows: number; frames: number; frameWidth: number; frameHeight: number; animations: Record<PetState, AnimationRange> }`
- Define `AnimationRange`: `{ startFrame: number; endFrame: number; frameDuration: number }`

**CREATE `src/config/index.ts`:**
- Re-export all configs
- Add `validateConfigs()` function that runs at startup (dev mode only):
  - Checks every species in speciesConfig has a matching asset in assetManifest
  - Checks every food item cost > 0
  - Checks decay rates are positive numbers
  - Logs warnings to console

### Integration Points
- `src/services/game/careEngine.ts` — replace hardcoded decay rates with `DECAY_RATES` import
- `src/services/game/petStateMachine.ts` — replace threshold numbers with `PET_STATE_THRESHOLDS`
- `src/engine/systems/PetNeedSystem.ts` — replace hardcoded rates with `DECAY_RATES`
- `src/engine/systems/MoodSystem.ts` — replace threshold numbers with `PET_STATE_THRESHOLDS`
- `src/components/pet/PetSprite.tsx` — replace `3.0` scale with `ANIMATION_DEFAULTS.scale`
- `src/engine/hooks/useGameEngine.ts` — replace `1000` with `TICK_INTERVAL_MS`
- `src/App.tsx` — call `validateConfigs()` in dev mode on mount

### Order of Implementation
A. Define typed config interfaces in `assetManifest.ts` → B. Add constants to `gameConfig.ts` → C. Create `config/index.ts` with validation → D. Update `careEngine.ts` to use config → E. Update `petStateMachine.ts` → F. Update `PetNeedSystem.ts` → G. Update `MoodSystem.ts` → H. Update `PetSprite.tsx` → I. Update `useGameEngine.ts` → J. Add `validateConfigs()` call in `App.tsx`

### Test / Validation
- All screens render identically (no visual change)
- Pet decay rates unchanged (compare by feeding pet, waiting, checking need drop)
- Console shows no config validation warnings
- `tsc --noEmit` passes

### Failure Modes
- Off-by-one if decay rate extraction doesn't match both careEngine AND PetNeedSystem (they use different formulas — careEngine uses ticks, PetNeedSystem uses deltaMs/60000)
- Config validation false-positives blocking startup

---

## STEP 3: TEST MODE → REAL DEV TOOL (SPECIAL FOCUS)

### What You Will Build
- Full developer console overlay accessible from any screen
- State inspector (view and edit any game state field live)
- Time control (pause, 2x, 10x, step-by-tick)
- Sprite frame debugger with per-animation scrubbing
- Action log (real-time feed of dispatched actions)
- State snapshot save/load (separate from game saves)
- Need sliders (drag to set any need to any value)
- Screen jump (navigate to any screen instantly)
- Pet state override (force any PetState)

### Exact File Changes

**CREATE `src/devtools/DevToolsOverlay.tsx`:**
- Fixed-position overlay panel (bottom-right, collapsible)
- Tab system: State | Time | Sprite | Actions | Snapshots
- Only rendered when `import.meta.env.DEV` is true
- Toggle with keyboard shortcut: `Ctrl+Shift+D`
- Z-index: 9999

**CREATE `src/devtools/StateInspector.tsx`:**
- Tree view of entire `EngineState`
- Click any numeric field to edit inline
- Click any string/enum field to get dropdown of valid values
- Highlights fields that changed in last tick (yellow flash)
- Dispatches `DEV_SET_STATE` action on edit

**CREATE `src/devtools/TimeControl.tsx`:**
- Buttons: Pause | Play | Step (1 tick) | 2x | 10x
- Displays: current tickCount, elapsedMs, deltaMs per tick
- Dispatches: `DEV_SET_SPEED` action that modifies tick interval
- Pause: calls `GameEngine.pause()`
- Step: calls `GameEngine.pause()` then `GameEngine.tick()` once

**CREATE `src/devtools/SpriteDebugger.tsx`:**
- Renders current sprite at 4x scale with grid overlay
- Frame scrubber slider (0 to totalFrames-1)
- Animation range selector (dropdown of animation names from assetManifest)
- Play/pause current animation
- Shows: current frame index, row/col, background-position values
- Pixel grid toggle (shows individual pixels)
- Replaces sprite debug section currently in TestModeScreen

**CREATE `src/devtools/ActionLog.tsx`:**
- Scrollable log of last 100 dispatched actions
- Each entry: timestamp, action type, payload summary
- Click to expand full payload
- Filter by action type
- Clear button

**CREATE `src/devtools/SnapshotManager.tsx`:**
- Save current EngineState to named snapshot (stored in sessionStorage)
- Load any saved snapshot
- List of snapshots with timestamps
- Delete snapshot
- Export as JSON / Import from JSON

**CREATE `src/devtools/NeedSliders.tsx`:**
- Four range sliders (hunger, happiness, cleanliness, health) 0–100
- Live-updates pet needs via `DEV_SET_NEEDS` action
- Shows numeric value next to each slider
- "Reset to defaults" button (75/80/70/90)

**CREATE `src/devtools/index.ts`:**
- Exports `DevToolsOverlay` and `DevToolsProvider`

**CREATE `src/devtools/devToolsActions.ts`:**
- New action types: `DEV_SET_STATE`, `DEV_SET_SPEED`, `DEV_SET_NEEDS`, `DEV_FORCE_PET_STATE`, `DEV_JUMP_SCREEN`, `DEV_SNAPSHOT_SAVE`, `DEV_SNAPSHOT_LOAD`
- These are dev-only actions, stripped in production build

**MODIFY `src/engine/core/ActionTypes.ts`:**
- Add dev action types to the EngineAction union (conditionally typed, only in dev)
- Add: `| { type: 'DEV_SET_NEEDS'; payload: Partial<PetNeeds> }` etc.

**MODIFY `src/engine/state/engineReducer.ts`:**
- Add cases for all DEV_* actions
- `DEV_SET_NEEDS`: directly overwrite pet.needs with payload
- `DEV_FORCE_PET_STATE`: override pet.state and pet.mood
- `DEV_JUMP_SCREEN`: set `state.screen` to payload
- `DEV_SET_STATE`: deep merge payload into state (dangerous — dev only)

**MODIFY `src/engine/core/GameEngine.ts`:**
- Add `tick()` public method (single manual tick for step mode)
- Add `setTickInterval(ms: number)` for speed control
- Add `getActionLog(): EngineAction[]` — stores last 100 actions dispatched
- Add `onAction` callback hook for ActionLog subscriber

**MODIFY `src/App.tsx`:**
- Import and render `<DevToolsOverlay />` conditionally: `{import.meta.env.DEV && <DevToolsOverlay engine={engine} dispatch={dispatch} />}`
- Pass engine instance and dispatch to overlay

**MODIFY `src/screens/TestModeScreen.tsx`:**
- Remove sprite debug section (moved to SpriteDebugger)
- Remove manual need buttons (moved to NeedSliders)
- Keep the SpriteAutoAssist tool as standalone utility
- TestModeScreen becomes a dedicated sprite analysis workspace only

### Code Structure
```
devtools/
  index.ts              — exports DevToolsOverlay
  DevToolsOverlay.tsx   — container with tab navigation
  StateInspector.tsx    — state tree viewer/editor
  TimeControl.tsx       — pause/play/step/speed
  SpriteDebugger.tsx    — frame-level sprite inspection
  ActionLog.tsx         — action feed
  SnapshotManager.tsx   — save/load state snapshots
  NeedSliders.tsx       — direct need manipulation
  devToolsActions.ts    — DEV_* action type definitions
```

Data flow: `DevToolsOverlay` receives `engine` instance + `dispatch` function → each tab component calls `dispatch(DEV_*)` → `engineReducer` processes → state updates → React re-renders

### Integration Points
- `GameEngine` class gets new methods (tick, setTickInterval, onAction)
- `engineReducer` gets new DEV_* cases
- `App.tsx` renders overlay
- TestModeScreen loses sprite debug (replaced by SpriteDebugger)
- Keyboard shortcut listener added in DevToolsOverlay (useEffect with keydown)

### Order of Implementation
A. Create `devtools/devToolsActions.ts` → B. Add DEV_* cases to `engineReducer.ts` → C. Add `tick()`, `setTickInterval()`, `onAction` to `GameEngine.ts` → D. Create `NeedSliders.tsx` → E. Create `TimeControl.tsx` → F. Create `StateInspector.tsx` → G. Create `ActionLog.tsx` → H. Create `SpriteDebugger.tsx` → I. Create `SnapshotManager.tsx` → J. Create `DevToolsOverlay.tsx` (tabs + container) → K. Wire into `App.tsx` → L. Strip TestModeScreen of moved features

### Test / Validation
- Open dev server, press `Ctrl+Shift+D` — overlay appears
- Drag hunger slider to 0 — pet shows hungry state immediately
- Click Pause — pet stops decaying, animation freezes
- Click Step — one tick advances (check tickCount increments by 1)
- Click 10x — decay happens 10x faster
- Force pet state to "sick" — PetSprite shows sick animation
- Save snapshot, change state, load snapshot — state reverts
- Action log shows every dispatch in real time
- Sprite debugger shows correct frame index and bg-position

### Failure Modes
- DEV_SET_STATE without deep clone corrupts engine state (always spread/clone)
- Speed multiplier makes deltaMs huge, causing needs to drop to 0 in one tick (cap deltaMs to max 5000ms equivalent)
- Overlay z-index conflicts with modals (test with FeedingScreen open)
- Memory leak from action log growing unbounded (cap at 100, FIFO)

---

## STEP 4: SPRITE SYSTEM REBUILD (SPECIAL FOCUS)

### What You Will Build
- Deterministic sprite renderer with zero auto-detection heuristics
- All sprite config driven by `assetManifest.ts` (no runtime grid guessing)
- Animation controller separated from React render cycle
- Proper animation state machine (idle → transition → target state)
- Frame validation at load time

### Exact File Changes

**CREATE `src/engine/animation/AnimationController.ts`:**
- Pure class, no React dependency
- Constructor: `(config: SpriteSheetConfig)`
- Methods:
  - `setAnimation(name: string)` — sets active animation range, resets frame to startFrame
  - `tick(deltaMs: number)` — advances frame based on elapsed time vs frameDuration
  - `getCurrentFrame(): number` — returns current frame index
  - `getBackgroundPosition(scale: number): { x: number; y: number }` — computes CSS bg-position
  - `isTransitioning(): boolean`
  - `forceFrame(index: number)` — for debug/dev tools
- Internal state: `currentAnimation`, `currentFrame`, `elapsedSinceLastFrame`, `previousAnimation`
- Frame math: `col = frame % cols`, `row = Math.floor(frame / cols)`, `x = -(col * frameWidth * scale)`, `y = -(row * frameHeight * scale)`
- Validates animation ranges on `setAnimation`: throws if startFrame/endFrame out of bounds

**CREATE `src/engine/animation/SpriteRenderer.ts`:**
- Pure function: `computeSpriteStyle(config: SpriteSheetConfig, frame: number, scale: number): CSSProperties`
- Returns: `{ width, height, backgroundImage, backgroundPosition, backgroundSize, imageRendering, overflow }`
- No state, no side effects — just math
- This replaces the inline style computation in PetSprite.tsx

**CREATE `src/engine/animation/types.ts`:**
- `SpriteSheetConfig` (move from assetManifest proposal in Step 2)
- `AnimationRange` — `{ startFrame: number; endFrame: number; frameDuration: number }`
- `AnimationName` — union of valid animation names
- `SpriteRenderStyle` — the CSSProperties subset returned by SpriteRenderer

**MODIFY `src/components/pet/PetSprite.tsx` — MAJOR REWRITE:**
- Remove ALL auto-detection logic (GCD calculation, horizontal strip fallback)
- Remove internal `useState` for frame tracking
- Remove internal `setInterval` for animation
- Accept props: `speciesId: string`, `animationName: string`, `scale?: number`, `paused?: boolean`, `onFrameChange?: (frame: number) => void`
- Create `AnimationController` instance via `useRef`
- Drive frame updates from `requestAnimationFrame` loop (not setInterval)
- Use `SpriteRenderer.computeSpriteStyle()` for all CSS
- Lookup config from `ASSETS.pets[speciesId]`
- When `animationName` prop changes, call `controller.setAnimation(animationName)`
- When `paused` is true, stop rAF loop

**MODIFY `src/config/assetManifest.ts`:**
- Every pet entry MUST have explicit: `cols`, `rows`, `frames`, `frameWidth`, `frameHeight`
- Every pet entry MUST have `animations` object with entries for every `PetState`
- Remove any auto-detection fallback URLs
- Add `'sick'` and `'dead'` animation ranges to `koala_sprite` (reuse frames if needed):
  - `sick: { startFrame: 5, endFrame: 9, frameDuration: 300 }` (slow hungry anim)
  - `dead: { startFrame: 15, endFrame: 15, frameDuration: 1000 }` (single sleeping frame, static)

**MODIFY `src/engine/systems/AnimationSystem.ts`:**
- Replace current `applyAnimationStep` with call to `AnimationController.tick(deltaMs)`
- Or remove entirely if AnimationController is owned by PetSprite component (preferred — animation is a render concern, not engine concern)
- Decision: AnimationController lives in PetSprite component (via useRef). Engine only provides `petState` → PetSprite maps to animation name.

**MODIFY `src/utils/spriteAutoAssist.tsx`:**
- Keep as standalone dev utility
- Update to use `SpriteSheetConfig` type from `animation/types.ts`
- No changes to core logic

**MODIFY `src/screens/TestModeScreen.tsx`:**
- Use new PetSprite API: `<PetSprite speciesId="koala_sprite" animationName={currentTestState} />`

**MODIFY `SPRITE_SYSTEM_RULES.md`:**
- Update rules to reflect new system: no auto-detection, config-driven only

### Code Structure
```
engine/animation/
  types.ts              — SpriteSheetConfig, AnimationRange, SpriteRenderStyle
  AnimationController.ts — stateful frame progression (pure, no React)
  SpriteRenderer.ts     — stateless CSS computation (pure function)
```

Data flow:
```
assetManifest.ts (config) → PetSprite.tsx (component)
  → creates AnimationController(config)
  → rAF loop calls controller.tick(deltaMs)
  → controller.getCurrentFrame() → SpriteRenderer.computeSpriteStyle(config, frame, scale)
  → applies CSSProperties to div
```

### Integration Points
- PetSprite.tsx is used in: PetHomeScreen, TestModeScreen, DevTools SpriteDebugger
- All consumers must pass `speciesId` + `animationName` instead of raw asset data
- Engine no longer manages animation frames — only pet state
- `petStateMachine.evaluatePetState()` output maps directly to animation name

### Order of Implementation
A. Create `engine/animation/types.ts` → B. Create `SpriteRenderer.ts` (pure function, test with known values) → C. Create `AnimationController.ts` → D. Update `assetManifest.ts` with full explicit configs → E. Rewrite `PetSprite.tsx` to use new system → F. Update all PetSprite consumers (PetHomeScreen, TestModeScreen) → G. Remove old AnimationSystem.ts usage from engineReducer → H. Update SPRITE_SYSTEM_RULES.md

### Test / Validation
- Pet on home screen shows idle animation looping smoothly
- Feed pet → hunger goes up → if happiness ≥80, shows happy animation
- Let pet get hungry (hunger <30) → shows hungry animation
- Force sick state in devtools → shows sick animation
- Frame debugger in devtools shows correct frame index matching visible sprite
- No animation "jump" when switching states (frame resets to startFrame of new anim)
- 60fps rAF loop (check with browser devtools Performance tab)

### Failure Modes
- rAF loop not cleaned up on unmount → memory leak, ghost animations (must `cancelAnimationFrame` in useEffect cleanup)
- Wrong scale factor → sprite offset looks shifted (test at 1x, 2x, 3x)
- Missing animation name in config → crash (add fallback to 'idle' with console.warn)
- Frame index exceeds total frames → blank or wrong tile shown (AnimationController must clamp/wrap)

---

## STEP 5: GAME ENGINE EXTRACTION (SPECIAL FOCUS)

### What You Will Build
- Pure game engine that runs independently of React
- React layer becomes a thin render shell
- All game logic callable without UI
- Engine emits typed events, React subscribes

### Exact File Changes

**REWRITE `src/engine/core/GameEngine.ts`:**
- Remove all React-specific code
- Class `GameEngine`:
  - `constructor(initialState: EngineState)`
  - `start()` — begins tick loop via `setInterval`
  - `stop()` — clears interval
  - `pause()` / `resume()`
  - `tick()` — single manual tick
  - `dispatch(action: EngineAction)` — applies action through reducer, notifies subscribers
  - `getState(): EngineState` — returns current immutable state
  - `subscribe(listener: (state: EngineState) => void): () => void` — returns unsubscribe
  - `onAction(listener: (action: EngineAction, prevState: EngineState, nextState: EngineState) => void): () => void` — for devtools/logging
  - `setTickInterval(ms: number)` — for speed control
- NO imports from React
- NO imports from hooks
- This is a standalone class usable in Node.js tests

**CREATE `src/engine/core/engineMiddleware.ts`:**
- Middleware pipeline for actions (like Redux middleware)
- `type Middleware = (engine: GameEngine, action: EngineAction, next: () => void) => void`
- Built-in middleware:
  - `loggingMiddleware` — console.log every action in dev mode
  - `validationMiddleware` — validates action payloads
  - `persistenceMiddleware` — triggers save after state-changing actions (placeholder for Step 14)

**REWRITE `src/engine/state/engineReducer.ts`:**
- Pure function: `(state: EngineState, action: EngineAction) => EngineState`
- Must NOT mutate state (always spread/return new objects)
- Move all system calls here:
  - `TICK` → calls `PetNeedSystem.applyDecay()`, `MoodSystem.evaluatePetMood()`
  - `FEED_PET` → calls `PetNeedSystem.feedPet()`
  - `PLAY_PET` → calls `PetNeedSystem.playWithPet()`
  - `CLEAN_PET` → calls `PetNeedSystem.cleanPet()`
  - `BOOST_MOOD` → calls `PetNeedSystem.boostMood()`
  - `TAP_EGG` → calls `evolutionEngine.interactWithEgg()`
  - `HATCH_EGG` → calls `evolutionEngine.hatchEgg()`
  - `SOLVE_MATH` → calls `rewardEngine.awardTokens()`
  - All care/reward/evolution logic flows through the reducer

**REWRITE `src/engine/hooks/useGameEngine.ts`:**
- Thin React wrapper around `GameEngine` class
- `useGameEngine(initialState?: EngineState)`:
  - Creates `GameEngine` instance via `useRef`
  - Subscribes to state changes via `engine.subscribe()` → `setState()`
  - Returns `{ state: EngineState, dispatch: (action: EngineAction) => void, engine: GameEngine }`
  - Cleanup: calls `engine.stop()` on unmount
  - NO game logic in this hook — just wiring

**DELETE `src/hooks/useGameState.ts`:**
- All functionality migrated into `engineReducer.ts`
- Save/load moves to persistence middleware (Step 14)
- Decay loop already handled by engine TICK
- Care actions already handled by engine reducer
- This eliminates the dual-state-system bug

**MODIFY `src/App.tsx`:**
- Remove `useGameState()` call entirely
- Use only `useGameEngine(createInitialEngineState())` or loaded state
- All screen components receive `state` and `dispatch` from engine
- Load saved state on mount: `const saved = loadGameState(); const initial = saved ? migrateState(saved) : createInitialEngineState();`
- Pass `dispatch` to all screens instead of individual callbacks

**MODIFY all screen components to use dispatch pattern:**

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Props: `{ state: EngineState; dispatch: (action: EngineAction) => void }`
- Replace `onFeed()`, `onPlay()`, etc. with `dispatch({ type: 'FEED_PET', payload: {...} })`
- Read pet from `state.pet`
- Read tokens from `state.player.currencies.tokens`

**MODIFY `src/screens/IncubationScreen.tsx`:**
- Props: `{ state: EngineState; dispatch: (action: EngineAction) => void }`
- Replace `onTapEgg()` with `dispatch({ type: 'TAP_EGG' })`
- Replace `onHatchEgg()` with `dispatch({ type: 'HATCH_EGG' })`
- Read egg from `state.egg`

**MODIFY `src/screens/MathScreen.tsx`:**
- Props: `{ state: EngineState; dispatch: (action: EngineAction) => void }`
- Replace direct reward calls with `dispatch({ type: 'SOLVE_MATH', payload: { difficulty, correct: true } })`
- Math problem generation stays local to component (UI concern)

**MODIFY `src/screens/FeedingScreen.tsx`:**
- Props: `{ state: EngineState; dispatch: (action: EngineAction) => void }`
- Replace `onFeed(item)` with `dispatch({ type: 'FEED_PET', payload: { foodItem: item } })`

### Code Structure
```
Engine (pure, no React):
  GameEngine.ts         — singleton class, tick loop, dispatch, subscribe
  engineMiddleware.ts   — action pipeline
  engineReducer.ts      — pure state transitions
  systems/*             — pure functions called by reducer

React (thin render shell):
  useGameEngine.ts      — creates engine, subscribes to state, returns {state, dispatch}
  App.tsx               — mounts engine, passes state+dispatch to screens
  screens/*             — receive state+dispatch, render UI, dispatch actions
```

### Integration Points
- This is the biggest refactor. Every screen component changes props signature.
- `useGameState.ts` is deleted — its load/save logic temporarily goes into App.tsx (moved to persistence middleware in Step 14)
- All `careEngine.ts` functions are now called from `engineReducer.ts`, not from React components
- `petStateMachine.ts` is called from reducer on every TICK to re-evaluate pet state
- `rewardEngine.ts` is called from reducer on SOLVE_MATH action

### Order of Implementation
A. Rewrite `GameEngine.ts` (pure class) → B. Create `engineMiddleware.ts` → C. Rewrite `engineReducer.ts` (all logic flows through here) → D. Rewrite `useGameEngine.ts` (thin wrapper) → E. Update `App.tsx` (remove useGameState, wire engine) → F. Update `IncubationScreen.tsx` → G. Update `PetHomeScreen.tsx` → H. Update `MathScreen.tsx` → I. Update `FeedingScreen.tsx` → J. Delete `useGameState.ts` → K. Full integration test

### Test / Validation
- Start fresh (clear localStorage) — egg appears, tap to incubate, hatch
- Pet appears on home screen with correct needs
- Feed/Play/Clean/Heal buttons work, needs update, tokens deducted
- Math screen: solve problems, tokens awarded
- Let pet decay — needs drop over time
- Pet state transitions work (idle → hungry → sick)
- Refresh page — state loads from save (temporarily via App.tsx useEffect)
- DevTools (Step 3) still work — dispatch goes through same engine

### Failure Modes
- Deleting `useGameState.ts` before all its logic is migrated → screens break
- Reducer mutation instead of immutable update → stale renders, bugs
- Engine not started → no ticks → no decay → pet needs never change
- Missing action handler in reducer → action silently dropped (add default case with console.warn)
- Save/load gap between deleting useGameState and implementing Step 14 — must add temporary save in App.tsx

---

## STEP 6: STATE UNIFICATION

### What You Will Build
- Single state tree owned by GameEngine
- Elimination of all parallel state (no more useState for game data in components)
- Derived state computed via selectors

### Exact File Changes

**CREATE `src/engine/selectors/index.ts`:**
- `selectPet(state: EngineState): Pet | null` → `state.pet`
- `selectEgg(state: EngineState): Egg | null` → `state.egg`
- `selectPlayer(state: EngineState): PlayerProfile` → `state.player`
- `selectTokens(state: EngineState): number` → `state.player.currencies.tokens`
- `selectPetState(state: EngineState): PetState | null` → `state.pet?.state ?? null`
- `selectScreen(state: EngineState): ScreenName` → `state.screen`
- `selectIsTestMode(state: EngineState): boolean` → `state.mode === 'test'`
- `selectPetNeeds(state: EngineState): PetNeeds | null` → `state.pet?.needs ?? null`
- `selectCanAfford(state: EngineState, cost: number): boolean` → `state.player.currencies.tokens >= cost`

**MODIFY all screen/component files:**
- Replace `state.pet?.needs.hunger` with `selectPetNeeds(state)?.hunger`
- Use selectors consistently instead of reaching deep into state
- This makes future state shape changes safe (only selectors need updating)

**MODIFY `src/engine/state/createInitialEngineState.ts`:**
- Ensure this returns a COMPLETE EngineState with all required fields
- No undefined values — every field has a default
- `player` gets full defaults: `{ id: 'player_1', displayName: 'Player', activePetId: null, mathMastery: { arithmetic: 0, geometry: 0, fractions: 0 }, streaks: { login: 0, correctAnswers: 0 }, currencies: { tokens: 100, coins: 0 }, unlockedRoomItems: [], quizOutcome: null }`

**MODIFY `src/engine/state/createTestEngineState.ts`:**
- Ensure complete state with full player profile
- Test pet has all fields populated

**DELETE any remaining `useState` calls in screens that hold game data:**
- Check PetHomeScreen, MathScreen for local state that duplicates engine state
- MathScreen: `currentProblem` and `streak` are local UI state — keep these (they're not game state)
- FeedingScreen: no game state, just UI

### Integration Points
- Selectors are imported by every screen component
- If state shape changes later, only selectors need updating
- DevTools StateInspector should display selector outputs too

### Order of Implementation
A. Create `engine/selectors/index.ts` → B. Update `createInitialEngineState.ts` with complete defaults → C. Update `createTestEngineState.ts` → D. Replace direct state access with selectors in all screens → E. Audit every `useState` in screens, remove any that duplicate engine state → F. Verify with devtools that one state tree drives everything

### Test / Validation
- All screens render identically to before
- Change state via devtools → all screens reflect changes immediately
- No stale state bugs (change pet name in devtools, see it update everywhere)

### Failure Modes
- Removing a useState that was actually needed for local UI (don't remove streak counter in MathScreen, that's UI state)
- Selector returning stale reference causing unnecessary re-renders (selectors are simple property access, so this is fine)

---

## STEP 7: CARE LOOP REFINEMENT

### What You Will Build
- Time-aware decay (catches up if app was closed)
- Mood system with multi-factor evaluation
- Care cooldowns (can't spam feed)
- Care effectiveness based on pet mood
- Death prevention grace period
- Needs interaction effects (hunger affects health decay rate, etc.)

### Exact File Changes

**MODIFY `src/engine/systems/PetNeedSystem.ts`:**
- Add `applyCatchUpDecay(pet: Pet, lastInteractionMs: number, nowMs: number): Pet` — calculates elapsed time since last interaction and applies proportional decay (capped at 24 hours to prevent death-on-return)
- Add `CARE_COOLDOWNS`: `{ feed: 30000, play: 60000, clean: 45000, heal: 0 }` (ms)
- Add `canPerformCare(pet: Pet, action: string, now: number): boolean` — checks cooldown against `pet.timestamps.lastFedAt` etc.
- Add `getCareEffectiveness(pet: Pet, action: string): number` — returns 0.5-1.5 multiplier based on mood (happy pet gets more from care)
- Add cross-need effects: if hunger < 20, health decays 2x. If cleanliness < 20, health decays 1.5x. If happiness < 20, hunger decays 1.3x.

**MODIFY `src/engine/systems/MoodSystem.ts`:**
- Expand `evaluatePetMood` to return both `state: PetState` and `mood: PetMood`
- Mood is separate from state: a pet can be in `hungry` state but `anxious` mood
- Mood affects care effectiveness and animation variations
- Add `PetMood` evaluation: `calm` (all needs 40-70), `playful` (happiness >80), `curious` (after math session), `anxious` (any need <30), `angry` (multiple needs <20)

**MODIFY `src/engine/state/engineReducer.ts`:**
- `TICK` handler: call `applyCatchUpDecay` if `lastTickTimestamp` is stale
- Store `lastTickTimestamp` in engine state
- Check cooldowns before applying care actions (return state unchanged + flag if on cooldown)
- Apply effectiveness multiplier to care action effects
- Add `GRACE_PERIOD_MS = 300000` (5 min) — if health would reach 0, set to 1 and start grace timer. Pet dies only after grace period with no interaction.

**MODIFY `src/types/pet.ts`:**
- Add to `timestamps`: `lastPlayedAt?: number`, `lastCleanedAt: number`, `lastHealedAt?: number`
- Add `graceTimer?: number` — ms remaining in death grace period

**MODIFY `src/engine/core/EngineTypes.ts` (or `types/engine.ts`):**
- Add `lastTickTimestamp: number` to EngineState

### Order of Implementation
A. Add timestamps to `Pet` type → B. Update `PetNeedSystem` with catch-up decay → C. Add cooldowns → D. Add effectiveness multiplier → E. Add cross-need effects → F. Expand `MoodSystem` → G. Add grace period to reducer → H. Update screens to show cooldown state on buttons

### Test / Validation
- Close app for 5 minutes, reopen → needs have dropped proportionally (not zeroed)
- Close app for 24+ hours → needs at minimum but pet not dead (grace period)
- Spam feed button → second click within 30s shows cooldown indicator
- Happy pet (+80 happiness) → feeding gives more hunger than sad pet
- Pet with hunger <20 → health drops noticeably faster
- Pet at health=1 → "grace period" warning, 5 min to save it

### Failure Modes
- Catch-up decay miscalculation → pet dies instantly on app open (cap elapsed time)
- Cooldown preventing all care → frustrating UX (keep heal at 0 cooldown)
- Effectiveness multiplier making care useless when pet is sad (floor at 0.5x)

---

## STEP 8: MATH ENGINE EXPANSION

### What You Will Build
- Multiple problem types (arithmetic, word problems, fractions, geometry basics)
- Adaptive difficulty based on performance history
- Problem pool system (no repeats in session)
- Hint system (costs tokens)
- Timer mode for bonus rewards

### Exact File Changes

**REWRITE `src/services/game/mathEngine.ts`:**
- `MathProblemType = 'arithmetic' | 'comparison' | 'missing_number' | 'word_problem'`
- `generateProblem(type: MathProblemType, difficulty: number): MathProblem`
- `generateArithmeticProblem(difficulty)` — current implementation, refined
- `generateComparisonProblem(difficulty)` — "Which is bigger: 3×4 or 2×7?"
- `generateMissingNumberProblem(difficulty)` — "_ + 5 = 12"
- `generateWordProblem(difficulty)` — template-based: "If you have {a} apples and buy {b} more..."
- `getHint(problem: MathProblem): string` — returns a hint string (costs 5 tokens)
- `calculateReward(problem: MathProblem, timeMs: number, usedHint: boolean): number` — base reward + time bonus - hint penalty
- `getAdaptiveDifficulty(mastery: MathMastery): number` — returns 1-5 based on mastery scores

**CREATE `src/services/game/mathProblemPool.ts`:**
- `MathProblemPool` class:
  - Constructor: `(difficulty: number, poolSize: number = 20)`
  - `next(): MathProblem` — returns next unseen problem
  - `remaining(): number`
  - `refill()` — generates new pool
- Prevents duplicate problems in a session

**MODIFY `src/types/index.ts`:**
- Update `MathProblem` type: add `type: MathProblemType`, `hint?: string`, `timeLimit?: number`
- Add `MathSession` type: `{ startTime: number; problemsSolved: number; correctCount: number; currentStreak: number; bestStreak: number; totalTimeMs: number }`

**MODIFY `src/screens/MathScreen.tsx`:**
- Add problem type selector (tabs or buttons for each type)
- Add timer display when problem has timeLimit
- Add hint button (shows hint, deducts tokens via dispatch)
- Show time bonus in reward popup
- Track session stats locally
- At end of session (10 problems or user exits), dispatch `COMPLETE_MATH_SESSION` with stats

**MODIFY `src/engine/state/engineReducer.ts`:**
- Add `COMPLETE_MATH_SESSION` action handler — updates `player.mathMastery` based on performance
- Add `USE_HINT` action — deducts 5 tokens

**MODIFY `src/config/rewardConfig.ts`:**
- Add `HINT_COST = 5`
- Add `TIME_BONUS` thresholds: `[{ maxMs: 3000, bonus: 5 }, { maxMs: 5000, bonus: 3 }, { maxMs: 10000, bonus: 1 }]`
- Add `SESSION_COMPLETION_BONUS = 20` (bonus for finishing 10 problems)

### Order of Implementation
A. Update `MathProblem` type → B. Rewrite `mathEngine.ts` with new problem types → C. Create `mathProblemPool.ts` → D. Update `rewardConfig.ts` → E. Add reducer actions → F. Update `MathScreen.tsx` with new UI → G. Wire adaptive difficulty

### Test / Validation
- Each problem type generates valid, solvable problems
- Difficulty scaling produces harder problems at higher levels
- No duplicate problems in a 20-problem session
- Hints display correctly and cost tokens
- Time bonus awards extra tokens for fast answers
- Session completion shows summary
- Mastery updates persist (via engine state)

### Failure Modes
- Word problem templates producing nonsensical text (test all templates)
- Division problems producing non-integer answers at low difficulty (ensure clean division)
- Adaptive difficulty stuck at 1 (ensure mastery actually increments)

---

## STEP 9: REWARD & ECONOMY SYSTEM

### What You Will Build
- Dual currency: tokens (earned) + coins (premium/rare)
- Shop system for buying food, items, cosmetics
- Price balancing
- Spending validation
- Reward multipliers from streaks

### Exact File Changes

**REWRITE `src/services/game/rewardEngine.ts`:**
- `awardTokens(state: EngineState, amount: number, source: string): EngineState`
- `awardCoins(state: EngineState, amount: number, source: string): EngineState`
- `spendTokens(state: EngineState, amount: number): { state: EngineState; success: boolean }`
- `spendCoins(state: EngineState, amount: number): { state: EngineState; success: boolean }`
- `getStreakMultiplier(streak: number): number` — 1.0 base, +0.1 per streak, max 2.0
- `calculateMathReward(difficulty: number, streak: number, timeBonus: number): { tokens: number; coins: number }` — coins only for streak ≥5

**CREATE `src/config/shopConfig.ts`:**
- `SHOP_ITEMS`: array of purchasable items with `{ id, name, description, icon, cost: { tokens?: number; coins?: number }, category: 'food' | 'toy' | 'medicine' | 'cosmetic', effect: {...} }`
- Categories: Food (consumable, feeds pet), Toy (consumable, plays with pet), Medicine (consumable, heals), Cosmetic (permanent, unlocks visual)

**CREATE `src/screens/ShopScreen.tsx`:**
- Grid layout of shop items grouped by category
- Each item card: icon, name, cost, buy button
- Disabled if can't afford
- Buy dispatches `PURCHASE_ITEM` action
- Currency display at top

**MODIFY `src/engine/state/engineReducer.ts`:**
- Add `PURCHASE_ITEM` action: validates funds, deducts cost, applies item effect or adds to inventory
- Add `AWARD_TOKENS` and `AWARD_COINS` actions (replace direct state manipulation)

**MODIFY `src/engine/core/ActionTypes.ts`:**
- Add `PURCHASE_ITEM`, `AWARD_TOKENS`, `AWARD_COINS`

**MODIFY `src/App.tsx`:**
- Add shop screen to routing: `screen === 'shop'` → `<ShopScreen />`

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Add Shop button to action bar
- Dispatches `{ type: 'SET_SCREEN', payload: 'shop' }`

### Order of Implementation
A. Rewrite `rewardEngine.ts` → B. Create `shopConfig.ts` → C. Add actions to `ActionTypes.ts` → D. Add reducer cases → E. Create `ShopScreen.tsx` → F. Add routing in `App.tsx` → G. Add shop button to PetHomeScreen

### Test / Validation
- Earn tokens from math → see balance increase
- Open shop → items display with correct prices
- Buy food item → tokens deducted, pet fed (or item added to inventory)
- Try to buy when broke → button disabled
- Streak ≥5 → earn coins
- Coins display in UI alongside tokens

### Failure Modes
- Negative balance (always validate before deducting)
- Race condition: two purchases in rapid succession overspend (reducer is synchronous, so this is safe)

---

## STEP 10: EVOLUTION & GROWTH SYSTEM

### What You Will Build
- Pet growth through stages: baby → juvenile → adult → elder
- XP system with level progression
- Evolution requirements (level + bond + special conditions)
- Visual changes per stage (different sprite or animation set)
- Stat growth on evolution

### Exact File Changes

**REWRITE `src/services/game/evolutionEngine.ts`:**
- Keep `interactWithEgg` and `hatchEgg`
- Add `addXP(pet: Pet, amount: number): Pet` — adds XP, checks for level up
- Add `checkEvolution(pet: Pet): { canEvolve: boolean; nextStage: PetStage; requirements: EvolutionRequirement[] }`
- Add `evolvePet(pet: Pet): Pet` — advances stage, applies stat boosts, resets XP for next tier
- Add `getXPForLevel(level: number): number` — `100 * level * 1.5` curve
- Add `getStatBoost(species: string, fromStage: PetStage, toStage: PetStage): PetStats` — per-species stat gains

**MODIFY `src/config/speciesConfig.ts`:**
- Each species gets: `stages: { baby: { spriteKey, statMultiplier }, juvenile: {...}, adult: {...}, elder: {...} }`
- Each stage has its own `spriteKey` (or same key with different animation set)
- `evolutionRequirements`: `{ toJuvenile: { level: 5, bond: 20 }, toAdult: { level: 15, bond: 50 }, toElder: { level: 30, bond: 80 } }`

**MODIFY `src/engine/state/engineReducer.ts`:**
- `TICK` handler: after care actions, call `addXP` for time-based passive XP (1 XP per minute alive)
- Add `EVOLVE_PET` action: calls `evolvePet()`, updates sprite key
- Add `CHECK_EVOLUTION` on relevant actions (after leveling up)

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Show level + XP bar below pet name
- When evolution is available, show glowing "Evolve!" button
- Evolution triggers animation sequence (can be simple flash for now)

**MODIFY `src/types/pet.ts`:**
- Ensure `progression` type has `xpToNextLevel: number`

### Order of Implementation
A. Update `speciesConfig.ts` → B. Rewrite `evolutionEngine.ts` → C. Add reducer actions → D. Update PetHomeScreen with XP bar and evolve button → E. Test full evolution path

### Test / Validation
- Pet earns XP from math sessions and passive time
- Level up triggers at correct XP thresholds
- Evolution check triggers when requirements met
- Evolving changes pet stage and stats
- DevTools: force level to 5, set bond to 20 → evolution available

### Failure Modes
- XP curve too steep → player never levels (test with real play session)
- Evolution resetting stats instead of boosting (verify stat merge logic)
- Sprite key change breaking animation (new stage must have valid asset entry)

---

## STEP 11: INVENTORY & ITEMS SYSTEM

### What You Will Build
- Persistent inventory for purchased and earned items
- Item usage system (use food from inventory instead of buying each time)
- Item categories: consumable, equipment, cosmetic
- Stack system for consumables

### Exact File Changes

**CREATE `src/types/inventory.ts`:**
- `InventoryItem = { itemId: string; quantity: number; acquiredAt: number }`
- `Inventory = { items: InventoryItem[]; maxSlots: number }`
- `ItemDefinition = { id: string; name: string; description: string; icon: string; category: 'consumable' | 'equipment' | 'cosmetic'; stackable: boolean; maxStack: number; effect: ItemEffect }`
- `ItemEffect = { type: 'feed' | 'play' | 'heal' | 'clean' | 'buff'; value: number; duration?: number }`

**CREATE `src/engine/systems/InventorySystem.ts`:**
- `addItem(inventory: Inventory, itemId: string, quantity: number): Inventory`
- `removeItem(inventory: Inventory, itemId: string, quantity: number): Inventory`
- `hasItem(inventory: Inventory, itemId: string): boolean`
- `getItemCount(inventory: Inventory, itemId: string): number`
- `useItem(state: EngineState, itemId: string): EngineState` — applies item effect to pet

**MODIFY `src/engine/core/EngineTypes.ts`:**
- Add `inventory: Inventory` to EngineState

**MODIFY `src/engine/state/createInitialEngineState.ts`:**
- Add `inventory: { items: [], maxSlots: 20 }`

**MODIFY `src/engine/state/engineReducer.ts`:**
- Add `ADD_ITEM`, `REMOVE_ITEM`, `USE_ITEM` action handlers
- `PURCHASE_ITEM` (from Step 9) now adds to inventory instead of applying immediately
- `USE_ITEM` applies the item effect and decrements quantity

**MODIFY `src/screens/FeedingScreen.tsx`:**
- Rename to `InventoryScreen.tsx` or add tabs: Shop | Inventory
- Inventory tab shows owned items with "Use" button
- Shop tab shows purchasable items (current behavior)

### Order of Implementation
A. Create `types/inventory.ts` → B. Create `InventorySystem.ts` → C. Add to EngineState → D. Add reducer actions → E. Update FeedingScreen/create InventoryScreen → F. Update PURCHASE_ITEM to add to inventory

### Test / Validation
- Buy apple → appears in inventory with quantity 1
- Buy another apple → quantity becomes 2
- Use apple → pet fed, quantity becomes 1
- Use last apple → item removed from inventory
- Inventory persists across screen changes

### Failure Modes
- Using item that doesn't exist in inventory (validate before applying)
- Negative quantity (clamp to 0, remove entry)
- Save format change breaking old saves (handled in Step 14)

---

## STEP 12: ROOM / ENVIRONMENT SYSTEM

### What You Will Build
- Customizable room background for pet
- Placeable decorations (purchased from shop)
- Room affects pet mood (decorated room = happiness bonus)
- Visual room rendering layer behind pet sprite

### Exact File Changes

**CREATE `src/types/room.ts`:**
- `RoomItem = { itemId: string; position: { x: number; y: number }; placed: boolean }`
- `Room = { backgroundId: string; items: RoomItem[]; moodBonus: number }`

**CREATE `src/engine/systems/RoomSystem.ts`:**
- `calculateRoomMoodBonus(room: Room): number` — sum of item mood values
- `placeItem(room: Room, itemId: string, position: { x: number; y: number }): Room`
- `removeItem(room: Room, itemId: string): Room`
- `changeBackground(room: Room, backgroundId: string): Room`

**CREATE `src/components/pet/PetRoom.tsx`:**
- Renders room background (gradient or image from assetManifest)
- Renders placed items at their positions (absolute positioned icons/sprites)
- PetSprite renders on top (z-index layering)
- Replaces or wraps PetChamber

**CREATE `src/config/roomConfig.ts`:**
- `ROOM_BACKGROUNDS`: `{ id, name, url, cost }`
- `ROOM_DECORATIONS`: `{ id, name, icon, cost, moodBonus }`

**MODIFY `src/engine/core/EngineTypes.ts`:**
- Add `room: Room` to EngineState

**MODIFY `src/engine/state/engineReducer.ts`:**
- Add `PLACE_ROOM_ITEM`, `REMOVE_ROOM_ITEM`, `CHANGE_BACKGROUND`
- `TICK` handler: add `room.moodBonus` to happiness decay offset

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Replace PetChamber with PetRoom
- Add "Decorate" button → opens room editor mode
- Room editor: drag items to position, save layout

### Order of Implementation
A. Create types → B. Create `RoomSystem.ts` → C. Create `roomConfig.ts` → D. Create `PetRoom.tsx` → E. Add to EngineState and reducer → F. Update PetHomeScreen → G. Add room items to shop

### Test / Validation
- Default room renders with basic background
- Buy decoration → place in room → visible at position
- Room mood bonus increases happiness decay offset
- Change background → visual update

### Failure Modes
- Overlapping items at same position (allow it, just z-index stack)
- Room items lost on state reset (ensure save includes room)

---

## STEP 13: EVENT & ACHIEVEMENT SYSTEM

### What You Will Build
- Persistent event log (replace in-memory array)
- Achievement definitions with unlock conditions
- Achievement notifications
- Progress tracking for multi-step achievements

### Exact File Changes

**REWRITE `src/services/game/eventService.ts`:**
- Events now stored in EngineState, not in-memory array
- `createEvent(state: EngineState, event: GameEvent): EngineState` — appends to `state.events` (capped at 500, FIFO)
- Events automatically created by reducer on relevant actions

**CREATE `src/types/achievement.ts`:**
- `Achievement = { id: string; name: string; description: string; icon: string; condition: AchievementCondition; reward: { tokens?: number; coins?: number; itemId?: string } }`
- `AchievementCondition = { type: 'event_count' | 'need_threshold' | 'level_reached' | 'streak'; target: number; eventType?: GameEventType }`
- `AchievementProgress = { achievementId: string; current: number; unlocked: boolean; unlockedAt?: number }`

**CREATE `src/config/achievementConfig.ts`:**
- Define 15-20 achievements: "First Feeding", "Math Whiz (50 problems)", "Clean Machine (10 cleans)", "Evolve!", "Streak Master (10 streak)", "Rich (1000 tokens)", etc.

**CREATE `src/engine/systems/AchievementSystem.ts`:**
- `checkAchievements(state: EngineState): { unlocked: Achievement[]; state: EngineState }` — scans conditions against state, returns newly unlocked
- Called by reducer after every state-changing action

**MODIFY `src/engine/core/EngineTypes.ts`:**
- Add `events: GameEvent[]` and `achievements: AchievementProgress[]` to EngineState

**MODIFY `src/engine/state/engineReducer.ts`:**
- After every action, call `checkAchievements()`
- If achievements unlocked, add to `state.notifications` queue

**CREATE `src/components/ui/AchievementPopup.tsx`:**
- Toast-style popup showing achievement name + icon
- Auto-dismisses after 3 seconds
- Renders from `state.notifications` queue

### Order of Implementation
A. Create types → B. Create `achievementConfig.ts` → C. Rewrite `eventService.ts` → D. Create `AchievementSystem.ts` → E. Wire into reducer → F. Create `AchievementPopup.tsx` → G. Add to App.tsx render

### Test / Validation
- Feed pet → "First Feeding" achievement unlocks, popup shows
- Solve 10 math problems → "Math Apprentice" unlocks
- Check devtools: events array grows, achievements track progress

### Failure Modes
- Achievement checking on every action is expensive (optimize: only check achievements relevant to the action type)
- Events array growing unbounded (cap at 500)
- Duplicate achievement unlocks (check `unlocked` flag before awarding)

---

## STEP 14: SAVE SYSTEM (SPECIAL FOCUS)

### What You Will Build
- Versioned save format with migration pipeline
- Auto-save on state changes (debounced)
- Manual save/load slots
- Export/import saves as JSON
- Firebase persistence (optional, behind feature flag)
- Save integrity validation

### Exact File Changes

**CREATE `src/services/persistence/SaveManager.ts`:**
- `SAVE_VERSION = 1` (increment on breaking changes)
- `SaveData = { version: number; timestamp: number; checksum: string; state: EngineState }`
- `save(state: EngineState, slot: string = 'auto'): void` — serializes to localStorage with version + checksum
- `load(slot: string = 'auto'): EngineState | null` — deserializes, validates checksum, runs migrations
- `listSlots(): SaveSlot[]` — returns all save slots with metadata
- `deleteSlot(slot: string): void`
- `exportSave(slot: string): string` — returns JSON string for download
- `importSave(json: string): EngineState` — parses, validates, migrates

**CREATE `src/services/persistence/saveMigrations.ts`:**
- `migrations: Record<number, (state: any) => any>` — keyed by version
- `migrate(saveData: SaveData): EngineState` — runs all migrations from saved version to current
- Example: `migrations[1] = (state) => ({ ...state, inventory: { items: [], maxSlots: 20 } })` — adds inventory to saves that predate Step 11
- Each migration is a pure function: old shape in, new shape out

**CREATE `src/services/persistence/saveValidation.ts`:**
- `computeChecksum(state: EngineState): string` — simple hash of JSON stringified state
- `validateSave(data: SaveData): { valid: boolean; errors: string[] }` — checks version, checksum, required fields
- `repairSave(state: EngineState): EngineState` — fills missing fields with defaults (defensive against corruption)

**CREATE `src/services/persistence/FirebaseAdapter.ts`:**
- `interface PersistenceAdapter { save(data: SaveData): Promise<void>; load(slot: string): Promise<SaveData | null>; list(): Promise<SaveSlot[]> }`
- `LocalStorageAdapter` implements the interface (current behavior, extracted)
- `FirebaseAdapter` implements the interface (uses Firestore)
- Feature flag: `const PERSISTENCE_BACKEND = import.meta.env.VITE_PERSISTENCE || 'local'`

**MODIFY `src/engine/core/engineMiddleware.ts`:**
- `persistenceMiddleware`: after state-changing actions, debounce (500ms) and call `SaveManager.save()`
- Exclude `TICK` from auto-save triggers (too frequent)
- Save triggers: `FEED_PET`, `PLAY_PET`, `CLEAN_PET`, `HEAL_PET`, `HATCH_EGG`, `EVOLVE_PET`, `PURCHASE_ITEM`, `SOLVE_MATH`, `COMPLETE_MATH_SESSION`

**MODIFY `src/services/firebase/api.ts`:**
- Deprecate in favor of `SaveManager.ts`
- Keep temporarily as import target, re-export from SaveManager

**MODIFY `src/services/firebase/config.ts`:**
- Real Firebase config (from environment variables)
- `const firebaseConfig = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, ... }`

**MODIFY `src/App.tsx`:**
- On mount: `const savedState = SaveManager.load('auto')`
- If saved, migrate and use as initial state
- If not saved, use `createInitialEngineState()`
- Remove any temporary save logic from Step 5

**CREATE `src/screens/SaveScreen.tsx` (optional, can be modal):**
- List of save slots with timestamps
- Save to new slot / overwrite existing
- Load slot (with confirmation)
- Export / Import buttons
- Delete slot (with confirmation)

### Code Structure
```
services/persistence/
  SaveManager.ts        — main save/load API
  saveMigrations.ts     — version migration pipeline
  saveValidation.ts     — integrity checks
  FirebaseAdapter.ts    — pluggable backend
```

### Integration Points
- `persistenceMiddleware` in engine handles auto-save
- `App.tsx` handles initial load
- `SaveScreen` is optional UI for manual save management
- All existing save data (localStorage key `vpet_gamestate_v1`) must be migrated on first load:
  - Detect old format (no `version` field)
  - Wrap in SaveData format with `version: 0`
  - Run migrations from 0 to current

### Order of Implementation
A. Create `saveValidation.ts` → B. Create `saveMigrations.ts` → C. Create `SaveManager.ts` → D. Create `LocalStorageAdapter` inside `FirebaseAdapter.ts` → E. Update `persistenceMiddleware` → F. Update `App.tsx` load path → G. Add migration for old saves → H. Create `SaveScreen.tsx` (optional) → I. Create `FirebaseAdapter` (behind feature flag)

### Test / Validation
- Fresh start → auto-save triggers after first action
- Refresh page → state loads correctly from auto-save
- Manually save to slot "test1" → shows in slot list
- Load slot "test1" → state reverts to that point
- Export save → download JSON file
- Import save JSON → state loads correctly
- Old localStorage save (pre-migration) → loads and migrates successfully
- Corrupt save (modify localStorage manually) → validation catches, uses repaired or default state
- Set `VITE_PERSISTENCE=firebase` → saves to Firestore (if config present)

### Failure Modes
- Migration function has a bug → all old saves break (test each migration with fixture data)
- Checksum mismatch false positive (ensure deterministic JSON serialization — sort keys)
- Debounce race condition: save starts, state changes, save completes with stale data (debounce should always use latest state at flush time)
- Firebase quota exceeded → fallback to localStorage with warning
- Breaking the old `vpet_gamestate_v1` key without migration → user loses progress

---

## STEP 15: SPECIES & VARIANTS

### What You Will Build
- Multiple selectable species with unique sprites, stats, and evolution paths
- Species selection on game start (quiz outcome determines recommendation)
- Species-specific care preferences (some pets like being fed more, others prefer play)

### Exact File Changes

**MODIFY `src/config/speciesConfig.ts`:**
- Expand to 5+ species with full configs:
  - `koala`: balanced stats, standard decay
  - `slime`: high health regen, low cleanliness decay, prefers play
  - `mech_bot`: no hunger decay, high cleanliness decay, prefers clean
  - `phoenix`: high happiness, low health, prefers feed
  - `crystal`: slow decay on all, hard to evolve, high stats at adult
- Each species: `{ id, name, description, assetKey, baseStats, decayModifiers, carePreferences, evolutionRequirements, stages }`
- `decayModifiers`: `{ hunger: 1.0, happiness: 1.0, cleanliness: 1.0, health: 1.0 }` — multiplier on base decay rates
- `carePreferences`: `{ feed: 1.0, play: 1.2, clean: 0.8, heal: 1.0 }` — multiplier on care effectiveness

**MODIFY `src/services/game/evolutionEngine.ts`:**
- `hatchEgg` now takes `speciesId` parameter
- Creates pet with species-specific base stats from speciesConfig

**MODIFY `src/engine/systems/PetNeedSystem.ts`:**
- Decay functions read `decayModifiers` from species config
- Care functions read `carePreferences` from species config

**CREATE `src/screens/SpeciesSelectScreen.tsx`:**
- Shows after quiz outcome determines recommendation
- Grid of species cards with: sprite preview, name, description, stats radar
- Recommended species highlighted based on `quizOutcome`
- Player can choose any species (recommendation is just highlighted)
- Dispatches `SELECT_SPECIES` action → creates egg of that type

**MODIFY `src/config/quizOutcomeConfig.ts`:**
- Map each `QuizOutcome` to a recommended species: `creative → slime`, `logical → mech_bot`, `balanced → koala`

**MODIFY `src/App.tsx`:**
- Add species selection screen to flow: quiz → species select → incubation
- New screen: `screen === 'species_select'`

### Order of Implementation
A. Expand `speciesConfig.ts` → B. Update `PetNeedSystem.ts` to use modifiers → C. Update `evolutionEngine.ts` → D. Update `quizOutcomeConfig.ts` → E. Create `SpeciesSelectScreen.tsx` → F. Wire into App.tsx routing

### Test / Validation
- Select each species → verify different base stats
- Koala decays normally, mech_bot has no hunger decay
- Play with slime → more happiness than playing with mech_bot
- Quiz recommends correct species

### Failure Modes
- Missing species in assetManifest → sprite won't render (validate on startup)
- Decay modifier of 0 making a need never drop (intended for mech_bot hunger, but validate others)

---

## STEP 16: BATTLE SYSTEM CORE (SPECIAL FOCUS)

### What You Will Build
- Turn-based battle engine (pet vs AI opponent)
- Move system (4 moves per pet, typed: attack/defend/special/heal)
- Damage calculation using pet stats
- HP system separate from pet health need
- Battle state machine (setup → player_turn → enemy_turn → resolve → victory/defeat)
- AI opponent decision making

### Exact File Changes

**CREATE `src/types/battle.ts`:**
```typescript
BattleMove = {
  id: string;
  name: string;
  type: 'attack' | 'defend' | 'special' | 'heal';
  power: number;
  accuracy: number; // 0-100
  cost: number; // energy cost
  description: string;
}

BattlePet = {
  petId: string;
  name: string;
  speciesId: string;
  level: number;
  maxHP: number;
  currentHP: number;
  energy: number;
  maxEnergy: number;
  stats: PetStats; // strength, speed, defense
  moves: BattleMove[];
  buffs: Buff[];
}

Buff = {
  stat: keyof PetStats | 'defense';
  multiplier: number;
  turnsRemaining: number;
}

BattleState = {
  active: boolean;
  phase: 'setup' | 'player_turn' | 'enemy_turn' | 'resolve' | 'victory' | 'defeat';
  playerPet: BattlePet;
  enemyPet: BattlePet;
  turnCount: number;
  log: BattleLogEntry[];
  pendingAction?: BattleAction;
  rewards?: BattleRewards;
}

BattleLogEntry = {
  turn: number;
  actor: 'player' | 'enemy';
  action: string;
  damage?: number;
  message: string;
}

BattleAction = {
  type: 'use_move';
  moveId: string;
}

BattleRewards = {
  tokens: number;
  xp: number;
  coins?: number;
  itemDrops?: string[];
}
```

**CREATE `src/engine/systems/BattleSystem.ts`:**
- `initBattle(playerPet: Pet, enemySpeciesId: string, enemyLevel: number): BattleState`
  - Converts Pet to BattlePet (HP = health * level, energy = 100, moves from species config)
  - Generates enemy BattlePet from species config
- `executePlayerMove(state: BattleState, moveId: string): BattleState`
  - Validates move (enough energy, valid target)
  - Calculates damage: `power * (attacker.stats.strength / defender.stats.defense) * accuracy_roll * buff_multipliers`
  - Applies damage to enemy HP
  - Deducts energy cost
  - Adds log entry
  - Sets phase to 'enemy_turn'
- `executeEnemyTurn(state: BattleState): BattleState`
  - AI selects move (see AI logic below)
  - Same damage calculation
  - Sets phase to 'resolve'
- `resolveRound(state: BattleState): BattleState`
  - Check win/loss conditions (HP ≤ 0)
  - Decrement buff durations
  - Increment turn count
  - If battle over: calculate rewards, set phase to victory/defeat
  - If continuing: set phase to player_turn
- `calculateRewards(state: BattleState): BattleRewards`
  - Tokens: enemy level * 5
  - XP: enemy level * 10
  - Coins: if turn count < 5, bonus coin
  - Item drops: 10% chance per enemy level

**CREATE `src/engine/systems/BattleAI.ts`:**
- `selectEnemyMove(enemy: BattlePet, player: BattlePet): BattleMove`
- Strategy (simple but functional):
  - If enemy HP < 30% and has heal move → heal
  - If player has buff and enemy has special → use special
  - Otherwise → pick highest power attack that enemy has energy for
  - Random factor: 20% chance of suboptimal choice (makes AI feel less robotic)

**CREATE `src/config/battleConfig.ts`:**
- `SPECIES_MOVES`: `Record<string, BattleMove[]>` — 4 moves per species
  - koala: Scratch (atk), Curl Up (def), Eucalyptus Heal (heal), Dropbear Slam (special)
  - slime: Slime Toss (atk), Absorb (heal), Harden (def), Acid Splash (special)
  - etc.
- `BATTLE_CONSTANTS`: `{ maxTurns: 30, energyPerTurn: 10, baseHPMultiplier: 10 }`
- `ENEMY_SCALING`: `{ levelVariance: 2, statMultiplier: 0.9 }` — enemies slightly weaker than equivalent player pet

**MODIFY `src/engine/core/ActionTypes.ts`:**
- Add: `START_BATTLE`, `PLAYER_MOVE`, `ENEMY_TURN`, `RESOLVE_ROUND`, `END_BATTLE`, `FLEE_BATTLE`

**MODIFY `src/engine/state/engineReducer.ts`:**
- `START_BATTLE`: creates BattleState, sets `state.session.battleState` and `state.screen = 'battle'`
- `PLAYER_MOVE`: calls `executePlayerMove()`, then immediately calls `executeEnemyTurn()`, then `resolveRound()`
- `END_BATTLE`: applies rewards to player, clears battleState, returns to home screen
- `FLEE_BATTLE`: clears battleState, no rewards, returns to home screen

**MODIFY `src/types/session.ts`:**
- Replace `battleState` placeholder with full `BattleState` type

### Code Structure
```
engine/systems/
  BattleSystem.ts    — battle logic (init, moves, resolve)
  BattleAI.ts        — enemy decision making

types/
  battle.ts          — all battle-related types

config/
  battleConfig.ts    — moves, constants, scaling
```

Data flow:
```
User taps "Battle" → dispatch(START_BATTLE) → reducer calls initBattle()
→ BattleScreen renders → User selects move → dispatch(PLAYER_MOVE)
→ reducer calls executePlayerMove() → executeEnemyTurn() → resolveRound()
→ state updates → BattleScreen re-renders with results
→ victory/defeat → dispatch(END_BATTLE) → rewards applied → back to home
```

### Order of Implementation
A. Create `types/battle.ts` → B. Create `battleConfig.ts` → C. Create `BattleSystem.ts` → D. Create `BattleAI.ts` → E. Add actions to ActionTypes → F. Add reducer cases → G. Battle screen created in Step 17

### Test / Validation
- `initBattle` produces valid BattleState with correct HP/stats
- `executePlayerMove` applies correct damage formula
- `executeEnemyTurn` picks reasonable move
- Battle ends when HP reaches 0
- Rewards calculated correctly
- All battle math can be tested with unit-style functions (pure inputs/outputs)
- DevTools: start battle, step through turns manually

### Failure Modes
- Infinite battle loop if neither side can damage (ensure minimum 1 damage per hit)
- Negative HP (clamp to 0)
- Energy cost exceeding available energy → move should fail gracefully (select different move or skip turn)
- Speed stat unused initially (okay for MVP — add turn order in polish)

---

## STEP 17: BATTLE INTEGRATION WITH CARE LOOP (SPECIAL FOCUS)

### What You Will Build
- Battle screen UI
- Pet health/needs affect battle stats (hungry pet is weaker)
- Battle outcomes affect pet needs (winning boosts happiness, losing hurts it)
- Math bonus rounds in battle (solve problem for damage boost)
- Battle availability tied to pet state (can't battle if sick/sleeping)

### Exact File Changes

**CREATE `src/screens/BattleScreen.tsx`:**
- Layout:
  - Top: enemy pet sprite + HP bar + name/level
  - Middle: battle log (scrollable, last 5 entries visible)
  - Bottom-middle: player pet sprite + HP bar + energy bar
  - Bottom: 4 move buttons (styled by type: red=attack, blue=defend, green=heal, purple=special)
  - Each move button: name, power, energy cost
  - Disabled moves: insufficient energy → grayed out
  - Flee button (small, corner)
- Animations:
  - Attack: player sprite slides right, enemy shakes
  - Defend: shield icon appears
  - Heal: green particles
  - Damage numbers float up from hit target
- Victory screen: rewards display, XP gained, tokens earned, "Continue" button
- Defeat screen: "Your pet is exhausted" message, reduced needs

**CREATE `src/components/battle/BattleHPBar.tsx`:**
- Horizontal HP bar with color gradient (green → yellow → red)
- Shows `currentHP / maxHP`
- Animate width transition (CSS transition)

**CREATE `src/components/battle/BattleMoveButton.tsx`:**
- Icon + name + power/cost display
- Color-coded by move type
- Disabled state when insufficient energy
- Press animation

**CREATE `src/components/battle/BattleLog.tsx`:**
- Scrollable list of BattleLogEntry messages
- Auto-scrolls to bottom
- Color-coded by actor (blue=player, red=enemy)

**CREATE `src/components/battle/MathBonusRound.tsx`:**
- During battle, every 3rd turn, a math bonus round appears
- Reuses MathPromptCard + MathAnswerInput from math screen
- Correct answer: next attack does 1.5x damage (buff applied)
- Wrong answer: no penalty, bonus missed
- 10-second timer

**MODIFY `src/engine/systems/BattleSystem.ts`:**
- `initBattle`: apply need modifiers to battle stats:
  - If hunger < 30: strength * 0.7
  - If happiness < 30: speed * 0.7
  - If health < 50: maxHP * 0.8
  - If happiness > 80: strength * 1.1, speed * 1.1 (happy buff)
- `applyBattleOutcome(state: EngineState, outcome: 'victory' | 'defeat'): EngineState`:
  - Victory: happiness +20, bond +5, XP from rewards
  - Defeat: happiness -15, hunger -10 (exhaustion)
  - Both: health -5 (battle fatigue)

**MODIFY `src/engine/state/engineReducer.ts`:**
- `START_BATTLE`: check pet state — reject if `pet.state === 'sick' || pet.state === 'sleeping' || pet.state === 'dead'`
- `MATH_BONUS_CORRECT`: apply 1.5x damage buff for next turn
- `END_BATTLE`: call `applyBattleOutcome()`

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Add "Battle" button to action bar (sword icon)
- Disabled when pet is sick, sleeping, or dead
- Shows pet state requirement as tooltip
- Dispatches `START_BATTLE` with random enemy species and level (player level ± 2)

**MODIFY `src/App.tsx`:**
- Add routing: `screen === 'battle'` → `<BattleScreen state={state} dispatch={dispatch} />`

### Integration Points
- **Care loop → Battle**: Pet needs directly modify battle stats at battle init
- **Battle → Care loop**: Battle outcome modifies pet needs post-battle
- **Math → Battle**: Math bonus rounds reuse existing math components
- **Rewards → Economy**: Battle rewards feed into token/coin/XP system from Steps 9-10

### Order of Implementation
A. Create `BattleHPBar.tsx` → B. Create `BattleMoveButton.tsx` → C. Create `BattleLog.tsx` → D. Create `BattleScreen.tsx` (compose above) → E. Add need modifiers to `initBattle` → F. Add `applyBattleOutcome` → G. Create `MathBonusRound.tsx` → H. Wire battle button in PetHomeScreen → I. Add routing in App.tsx → J. Full battle flow integration test

### Test / Validation
- Tap Battle on healthy pet → battle starts with correct stats
- Hungry pet → lower strength visible in battle
- Select each move type → correct animation and damage
- Math bonus round appears every 3rd turn → correct answer gives buff
- Win battle → return to home, happiness increased, tokens awarded
- Lose battle → return to home, happiness decreased
- Sick pet → Battle button disabled
- DevTools: force battle state, step through turns

### Failure Modes
- Battle screen not cleaning up on unmount (ensure battle state cleared on navigate away)
- Math bonus round timer continuing after battle ends
- Need modifiers making pet impossibly weak (floor stats at 50% of base)
- Battle button enabled for dead pet (check all invalid states)

---

## STEP 18: STREAK & MASTERY SYSTEM

### What You Will Build
- Daily login streak tracking
- Consecutive correct answer streaks with escalating rewards
- Subject mastery (arithmetic, word problems, etc.) with progression levels
- Streak-based unlocks

### Exact File Changes

**CREATE `src/engine/systems/StreakSystem.ts`:**
- `checkLoginStreak(player: PlayerProfile, now: number): { streak: number; isNewDay: boolean; reward?: number }`
  - If last login was yesterday: increment streak
  - If last login was today: no change
  - If last login was 2+ days ago: reset to 1
- `updateMathStreak(player: PlayerProfile, correct: boolean): PlayerProfile`
  - Correct: increment `streaks.correctAnswers`
  - Wrong: reset to 0
- `getMasteryLevel(score: number): 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master'`
  - 0-20: novice, 21-50: apprentice, 51-80: journeyman, 81-95: expert, 96-100: master
- `updateMastery(player: PlayerProfile, problemType: string, correct: boolean): PlayerProfile`
  - Correct: +2 to relevant mastery score (capped at 100)
  - Wrong: -1 (floored at 0)

**MODIFY `src/types/player.ts`:**
- Add `lastLoginDate: string` (ISO date, not timestamp — for day comparison)
- Add `streaks.bestCorrectAnswers: number`

**MODIFY `src/engine/state/engineReducer.ts`:**
- `START_ENGINE` (or equivalent init action): call `checkLoginStreak`, award daily bonus if new day
- `SOLVE_MATH` / `COMPLETE_MATH_SESSION`: call `updateMathStreak` and `updateMastery`

**MODIFY `src/screens/MathScreen.tsx`:**
- Display mastery level for current problem type
- Show streak counter with visual flair at milestones (5, 10, 25)
- Streak break notification

**MODIFY `src/screens/PetHomeScreen.tsx`:**
- Login streak badge (e.g., "Day 7 🔥" in header)
- Daily reward popup on new day

**CREATE `src/config/streakConfig.ts`:**
- `DAILY_REWARDS`: `[10, 15, 20, 25, 30, 50, 100]` — tokens for days 1-7, resets weekly
- `STREAK_MILESTONES`: `{ 5: 'Bronze', 10: 'Silver', 25: 'Gold', 50: 'Platinum' }`

### Order of Implementation
A. Create `streakConfig.ts` → B. Create `StreakSystem.ts` → C. Update player types → D. Wire into reducer → E. Update MathScreen → F. Update PetHomeScreen with login streak

### Test / Validation
- Open app first time today → streak = 1, daily reward
- Open app again today → no additional reward
- Open next day → streak = 2
- Skip a day → streak resets to 1
- Solve 5 problems correctly → streak counter shows 5
- Get one wrong → streak resets, notification shows

### Failure Modes
- Timezone issues with day comparison (use UTC consistently)
- Streak rewards stacking on page refresh (check `isNewDay` properly)

---

## STEP 19: POLISH & ANIMATION JUICE

### What You Will Build
- Screen transitions (fade/slide between screens)
- Particle effects for rewards and achievements
- Sound effect hooks (no actual audio files, just the API)
- Micro-interactions on buttons and cards
- Loading states and skeleton screens
- Error boundary with recovery

### Exact File Changes

**CREATE `src/components/ui/ScreenTransition.tsx`:**
- Wraps screen content
- CSS transition: fade + slide-up on mount, fade + slide-down on unmount
- Uses `key` prop tied to `state.screen` to trigger transitions
- 200ms duration

**CREATE `src/components/ui/ParticleEffect.tsx`:**
- Renders N particles at a source position
- Props: `emoji: string`, `count: number`, `position: {x, y}`, `onComplete: () => void`
- Particles fly outward with random velocity, fade out
- Uses `requestAnimationFrame` for smooth animation
- Generalizes `ReactionBurst` (which can be replaced by this)

**CREATE `src/hooks/useSound.ts`:**
- `useSound()` returns `{ play: (sound: SoundName) => void }`
- `SoundName = 'tap' | 'feed' | 'reward' | 'levelUp' | 'battleHit' | 'achievement' | 'error'`
- Stub implementation: logs to console in dev, no-op in prod
- Ready for real audio files to be plugged in later

**CREATE `src/components/ui/Skeleton.tsx`:**
- Animated loading placeholder
- Variants: `line`, `circle`, `rect`
- Used while engine initializes

**CREATE `src/components/ui/ErrorBoundary.tsx`:**
- React error boundary that catches render errors
- Shows friendly message + "Reset Game" button
- "Reset Game" clears save and reloads

**MODIFY `src/animations.css`:**
- Add screen transition keyframes
- Add particle keyframes
- Add button press micro-interaction
- Add card hover lift effect

**MODIFY `src/App.tsx`:**
- Wrap screen rendering in `<ScreenTransition key={state.screen}>`
- Wrap entire app in `<ErrorBoundary>`
- Show `<Skeleton />` while engine not initialized

**MODIFY `src/components/ui/GameButton.tsx`:**
- Add haptic-style press animation (scale 0.95 on mousedown, 1.0 on mouseup)
- Add sound hook: `play('tap')` on click

### Order of Implementation
A. Create `ErrorBoundary.tsx` → B. Create `Skeleton.tsx` → C. Create `ScreenTransition.tsx` → D. Create `ParticleEffect.tsx` → E. Create `useSound.ts` → F. Update `animations.css` → G. Wire into App.tsx and components → H. Replace ReactionBurst with ParticleEffect

### Test / Validation
- Navigate between screens → smooth transition animation
- Earn reward → particles fly from reward source
- All buttons have press feedback
- Force an error (temporarily throw in component) → ErrorBoundary catches, shows reset
- Slow connection simulation → skeleton shows during init

### Failure Modes
- Screen transition causing double-render (ensure proper key management)
- Particle effect memory leak (must cleanup rAF on unmount)
- ErrorBoundary not catching async errors (they go to window.onerror — add handler)

---

## STEP 20: PRODUCTION READINESS

### What You Will Build
- Environment-based configuration
- Build optimization
- PWA setup (offline support)
- Analytics hooks (no actual analytics, just the API shape)
- Performance audit and optimization
- Final integration test pass

### Exact File Changes

**CREATE `src/config/environment.ts`:**
- `const ENV = { isDev: import.meta.env.DEV, isProd: import.meta.env.PROD, firebaseEnabled: !!import.meta.env.VITE_FIREBASE_API_KEY, version: import.meta.env.VITE_APP_VERSION || '0.1.0' }`
- Single import for all env checks

**CREATE `public/manifest.json`:**
- PWA manifest: name, short_name, icons, start_url, display: standalone, theme_color
- Enables "Add to Home Screen" on mobile

**CREATE `src/serviceWorker.ts`:**
- Basic service worker registration
- Cache static assets for offline play
- Network-first strategy for Firebase (if enabled)

**MODIFY `vite.config.ts`:**
- Add `vite-plugin-pwa` (or manual service worker registration)
- Configure code splitting: engine chunk, ui chunk, battle chunk
- Enable gzip/brotli compression
- Set chunk size warning limit

**MODIFY `index.html`:**
- Add meta tags: viewport, theme-color, apple-mobile-web-app-capable
- Add manifest link
- Add apple-touch-icon

**CREATE `src/hooks/useAnalytics.ts`:**
- `useAnalytics()` returns `{ track: (event: string, data?: Record<string, unknown>) => void }`
- Stub: logs to console in dev
- Shape ready for Mixpanel/Amplitude/Firebase Analytics

**MODIFY `src/App.tsx`:**
- Register service worker on mount
- Add version display in footer or settings
- Strip DevToolsOverlay from production build (already gated by `import.meta.env.DEV`)

**CREATE `src/components/ui/PerformanceMonitor.tsx` (dev only):**
- Displays FPS counter
- Shows React render count per tick
- Warns if renders exceed threshold
- Only rendered in dev mode

**MODIFY `package.json`:**
- Add scripts: `"build:prod": "VITE_APP_VERSION=$(date +%Y%m%d) tsc -b && vite build"`, `"preview": "vite preview"`, `"analyze": "vite-bundle-visualizer"`

### Order of Implementation
A. Create `environment.ts` → B. Update `vite.config.ts` → C. Create `manifest.json` + update `index.html` → D. Create `serviceWorker.ts` → E. Create `useAnalytics.ts` → F. Create `PerformanceMonitor.tsx` → G. Run `npm run build` and verify output → H. Test PWA install on mobile → I. Performance audit (Lighthouse)

### Test / Validation
- `npm run build` succeeds with no errors
- Built output is <500KB gzipped
- Lighthouse score: Performance >90, PWA >90
- Install as PWA on mobile → opens standalone
- Offline mode: app loads and plays (no Firebase features)
- All 5 original screens + new screens work in production build
- DevTools NOT present in production build
- Complete play-through: create account → quiz → species select → incubate egg → hatch → care for pet → do math → earn tokens → buy items → battle → evolve

### Failure Modes
- Service worker caching stale code (use versioned cache names, clear on update)
- PWA not installable (check manifest requirements: icons, start_url, display)
- Code splitting breaking lazy imports (test all routes in prod build)
- Analytics stub accidentally sending data (ensure no network calls in stub)

---

## Verification: Full End-to-End Test Plan

After all 20 steps, run this full flow:

1. Clear all localStorage
2. Open app → initial state loads → quiz screen (or incubation if no quiz yet)
3. Incubate egg → tap to progress → hatch
4. Pet appears with correct species sprite
5. Needs decay over time → feed, play, clean, heal
6. Open math screen → solve problems → earn tokens → streak builds
7. Open shop → buy food → check inventory → use item
8. Decorate room → mood bonus applies
9. Pet levels up → evolution available → evolve
10. Start battle → math bonus round → win → rewards
11. Check achievements → verify unlocks
12. Save game → refresh → state persists
13. Export save → clear game → import save → state restored
14. Open devtools → manipulate state → verify all tools work
15. Build for production → deploy → Lighthouse audit
16. Install as PWA → play offline
