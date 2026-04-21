# Pet Interaction System — Implementation Plan

> **Status:** Approved plan, pre-implementation
> **Date:** 2026-04-10
> **Scope:** Foundation of a deep interactive pet-touch system with 6 core interactions

---

## Table of Contents

1. [Audit Summary](#1-audit-summary)
2. [Hand Assets](#2-hand-assets)
3. [Architecture Overview](#3-architecture-overview)
4. [New Files](#4-new-files)
5. [Modified Files](#5-modified-files)
6. [Layer 1 — Types & Data Definitions](#6-layer-1--types--data-definitions)
7. [Layer 2 — Engine Systems](#7-layer-2--engine-systems)
8. [Layer 3 — Pet Type Extensions](#8-layer-3--pet-type-extensions)
9. [Layer 4 — Components](#9-layer-4--components)
10. [Layer 5 — Hooks](#10-layer-5--hooks)
11. [Layer 6 — GameSceneShell Integration](#11-layer-6--gamesceneshell-integration)
12. [Layer 7 — Economy Integration](#12-layer-7--economy-integration)
13. [Layer 8 — Pet Feel (Mood-Aware Responses)](#13-layer-8--pet-feel-mood-aware-responses)
14. [The 6 Interactions](#14-the-6-interactions)
15. [Placeholder & Animation Drop-In Guide](#15-placeholder--animation-drop-in-guide)
16. [Debug / Dev Mode](#16-debug--dev-mode)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Implementation Order](#18-implementation-order)

---

## 1. Audit Summary

### Existing Systems That Will Be Reused

| System | Location | Reuse Strategy |
|--------|----------|----------------|
| **Pet state/needs** (`hunger`, `happiness`, `cleanliness`, `health`) | `src/types/pet.ts` | Extend with `trust`, `discipline`, `groomingScore`, `stress` |
| **Pet mood** (`calm`, `playful`, `curious`, `anxious`, `angry`) | `src/engine/systems/MoodSystem.ts` | Interaction responses key off mood |
| **Bond** (single number on `Pet`) | `src/types/pet.ts` | Enhance with streak/tier logic |
| **Intent system** (drives animations) | `src/engine/systems/PetIntentSystem.ts` | Add interaction intents (`being_petted`, `being_washed`, etc.) |
| **Animation fallback** (black box with "MISSING" label) | `src/components/pet/PetSprite.tsx` | Reuse for pet reaction placeholders |
| **Economy** (tokens, coins, MP) | `src/config/shopConfig.ts`, reducer | Add care tool shop items |
| **Reducer pattern** (100+ action types, pure functions) | `src/engine/state/engineReducer.ts` | Add `PET_INTERACTION_*` actions |
| **Scene rendering** (400x224 native, scaled to viewport) | `src/config/sceneConfig.ts`, `SceneStage.tsx` | Hand cursor at `Z.PET + 2` |
| **Existing care actions** (`FEED`, `CLEAN`, `PLAY`, `BOOST_MOOD`) | Reducer + `PetNeedSystem.ts` | Interaction system supersedes these on home screen |
| **ReactionBurst** (emoji particle explosion) | `src/components/pet/ReactionBurst.tsx` | Extend for interaction VFX |
| **Pet wander** (eased X movement with pauses) | `src/hooks/useIdleWander.ts` | Pause wander during active interactions |
| **Z-band system** | `src/config/zBands.ts` | Add `HAND`, `INTERACTION_VFX` bands |
| **Sprite sheet config & AnimationController** | `src/engine/animation/AnimationController.ts` | Reuse for hand sprite animation |
| **SpriteRenderer** (`computeSpriteStyle`) | `src/engine/animation/SpriteRenderer.ts` | Reuse for rendering hand frames |
| **useSceneScale** | `src/hooks/useSceneScale.ts` | Scale hand + touch zones to viewport |

### What Does NOT Exist Yet

- No pet touch/click handlers (pet sprite is rendering-only)
- No custom cursor system
- No direct hand-to-pet interaction mechanic
- No `trust`, `discipline`, `groomingScore`, or `stress` stats
- No care tool items in shop
- No interaction state in engine

---

## 2. Hand Assets

### Available Sprite Sheets

Source directory: `/home/dre/Documents/art/art 3/`

| Source File | Frames | Description | Maps To |
|-------------|--------|-------------|---------|
| `idlehands.png` | ~9 frames, horizontal strip | Hand relaxed/waving, palm forward | `HAND_IDLE` — hover/default state |
| `hand move-sheet.png` | 4 frames, horizontal strip | Hand reaching downward, fingers pointing down | `HAND_RUB` / `HAND_TAP` — petting/touching |
| `hand1.png` – `hand9.png` | Individual frames | Single hand poses from idle animation | Backup/reference |
| `pixellab-Base-Prompt--Interaction-Hand-*.png` | 1 frame | PixelLab source prompt reference | Not used in-game |

### Asset Copy Plan

```
Source                                          → Destination (in public/)
─────────────────────────────────────────────────────────────────────────
art 3/idlehands.png                             → public/assets/hand/hand_idle.png
art 3/hand move-sheet.png                       → public/assets/hand/hand_rub.png
```

### Future Hand Animation Naming Convention

When creating new hand state animations, save them as:

```
public/assets/hand/hand_idle.png      ← exists (idle/hover)
public/assets/hand/hand_rub.png       ← exists (pet/rub/tap)
public/assets/hand/hand_scrub.png     ← TODO: wash/scrub motion
public/assets/hand/hand_hold.png      ← TODO: comfort/hold still
public/assets/hand/hand_drag.png      ← TODO: brush/drag motion
public/assets/hand/hand_point.png     ← TODO: training/point
```

Each file should be a horizontal sprite sheet (single row, equal-width frames).

### Fallback Strategy

Until a state-specific sheet exists, the system:
1. Falls back to `hand_idle.png` for any missing state
2. Applies a CSS transform hint (rotation, scale) to suggest the action
3. Shows a small TODO label: `"TODO: hand [state] animation"`

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GameSceneShell                            │
│                                                             │
│  z-20  PetSprite (existing)                                 │
│  z-21  PetTouchZone ← pointer events captured here          │
│  z-22  HandCursor ← follows pointer in interaction mode     │
│  z-23  InteractionVFX ← particles/effects near pet          │
│  z-24  InteractionFeedback ← reaction text bubbles          │
│  z-30  TopHUD (existing)                                    │
│  z-32  InteractionToolbar ← 6 mode buttons at bottom        │
│                                                             │
│  ┌───────────────────────────────────────┐                  │
│  │         useHandInteraction            │                  │
│  │  • pointer position tracking          │                  │
│  │  • hover-over-pet detection           │                  │
│  │  • gesture detection (tap/drag/hold)  │                  │
│  │  • hand mode state                    │                  │
│  └──────────────┬────────────────────────┘                  │
│                 │ dispatches                                 │
│  ┌──────────────▼────────────────────────┐                  │
│  │         Engine Reducer                │                  │
│  │  SET_HAND_MODE                        │                  │
│  │  START_PET_INTERACTION                │                  │
│  │  END_PET_INTERACTION                  │                  │
│  │  INTERACTION_TICK                     │                  │
│  │  PURCHASE_CARE_TOOL                   │                  │
│  └──────────────┬────────────────────────┘                  │
│                 │ calls                                      │
│  ┌──────────────▼────────────────────────┐                  │
│  │      InteractionSystem (pure)         │                  │
│  │  • canInteract()                      │                  │
│  │  • applyInteraction()                 │                  │
│  │  • updateStreak()                     │                  │
│  │  • getReactionText()                  │                  │
│  │  • calculateMoodMultiplier()          │                  │
│  └───────────────────────────────────────┘                  │
│                                                             │
│  ┌───────────────────────────────────────┐                  │
│  │         usePetReaction                │                  │
│  │  • reaction animation state machine   │                  │
│  │  • anticipation → reaction → settle   │                  │
│  │  • text selection                     │                  │
│  │  • VFX type selection                 │                  │
│  └───────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. New Files

```
src/types/interaction.ts                          — Core interaction types
src/config/interactionConfig.ts                   — Data-driven definitions for all 6 interactions
src/config/careToolConfig.ts                      — Purchasable tool upgrades for shop
src/engine/systems/InteractionSystem.ts           — Pure functions: validation, stat application, streaks
src/components/interaction/HandCursor.tsx          — Floating hand sprite component
src/components/interaction/InteractionToolbar.tsx  — Mode selector UI (6 action buttons)
src/components/interaction/PetTouchZone.tsx        — Invisible pointer capture overlay on pet
src/components/interaction/InteractionVFX.tsx      — Placeholder particles and effects
src/components/interaction/InteractionFeedback.tsx — Reaction text bubbles near pet
src/components/interaction/InteractionDebug.tsx    — Dev debug panel (toggle with I key)
src/hooks/useHandInteraction.ts                   — Hand position, mode, gesture detection
src/hooks/usePetReaction.ts                       — Pet response state machine
```

---

## 5. Modified Files

```
src/types/pet.ts                          — Add trust, discipline, groomingScore, stress
src/types/engine.ts                       — Add InteractionState to EngineState
src/engine/core/ActionTypes.ts            — Add PET_INTERACTION_* actions
src/engine/state/engineReducer.ts         — Handle new interaction actions
src/engine/state/createInitialEngineState.ts — Default InteractionState + new pet stats
src/engine/systems/PetIntentSystem.ts     — Add interaction-override intents
src/engine/systems/PetNeedSystem.ts       — Decay for trust, groomingScore; stress buildup
src/engine/animation/types.ts             — Extend AnimationName with interaction states
src/config/zBands.ts                      — Add HAND, INTERACTION_VFX, INTERACTION_TEXT bands
src/config/assetManifest.ts               — Add hand sprite sheet configs
src/config/shopConfig.ts                  — Add care tool items
src/components/scene/GameSceneShell.tsx    — Layer in hand + touch zone + toolbar + VFX
src/components/scene/SceneStage.tsx        — Allow pointer events for touch detection
```

---

## 6. Layer 1 — Types & Data Definitions

### `src/types/interaction.ts`

```ts
export type HandMode = 'idle' | 'pet' | 'wash' | 'brush' | 'comfort' | 'train' | 'play';

export type HandAnimState =
  | 'HAND_IDLE'
  | 'HAND_RUB'
  | 'HAND_TAP'
  | 'HAND_SCRUB'
  | 'HAND_HOLD'
  | 'HAND_DRAG';

export interface InteractionDef {
  id: HandMode;
  name: string;
  description: string;
  icon: string;
  handAnimState: HandAnimState;
  unlockRequirement: InteractionUnlock | null;   // null = always available
  cooldownMs: number;
  durationMs: number;
  spamProtection: { maxPerMinute: number };
  statEffects: Partial<InteractionStatEffects>;
  economyCost: number;                            // token cost per use (0 = free)
  toolTier: number;                               // 0 = base, 1+ = upgraded
  textFeedback: {
    success: string[];
    neutral: string[];
    fail: string[];
  };
  placeholderLabel: string;
  moodModifiers: Partial<Record<PetMood, number>>; // multiplier by current mood
}

export interface InteractionStatEffects {
  bond: number;
  happiness: number;
  cleanliness: number;
  trust: number;
  discipline: number;
  stress: number;            // negative value = reduces stress
  groomingScore: number;
}

export type InteractionUnlock =
  | { kind: 'free' }
  | { kind: 'level'; threshold: number }
  | { kind: 'bond'; threshold: number }
  | { kind: 'purchase'; itemId: string };

export interface InteractionState {
  activeMode: HandMode;
  isInteracting: boolean;
  currentInteractionStart: number | null;
  streak: { count: number; lastInteractionTime: number };
  cooldowns: Record<HandMode, number>;            // timestamp of last use per mode
  usageCounts: Record<HandMode, number>;           // today's usage per mode
  unlockedTools: HandMode[];
  equippedToolTiers: Record<HandMode, number>;     // tier level per mode
  lastReactionText: string | null;
  petResponseAnim: string | null;
}
```

### `src/config/interactionConfig.ts`

All 6 interactions fully defined as data objects. See [Section 14](#14-the-6-interactions) for complete specs.

### `src/config/careToolConfig.ts`

Purchasable upgrades. See [Section 12](#12-layer-7--economy-integration) for item table.

---

## 7. Layer 2 — Engine Systems

### `src/engine/systems/InteractionSystem.ts` — Pure Functions

```
canInteract(pet, mode, interactionState, playerTokens)
  → checks: pet alive, not sleeping (unless comfort), cooldown elapsed,
    mode unlocked, can afford cost, spam limit not hit
  → returns { allowed: boolean; reason?: string }

applyInteraction(pet, mode, toolTier, interactionState)
  → reads InteractionDef for this mode
  → applies mood multiplier to stat effects
  → applies tool tier bonus (1.5x at tier 1, 2x at tier 2)
  → returns updated Pet + updated InteractionState

updateStreak(interactionState, mode)
  → if same mode used within 10s of last, increment streak
  → streak bonuses at 3 (1.2x), 5 (1.5x), 8 (2x)
  → if different mode or timeout, reset streak to 1

getReactionText(mode, pet, result)
  → picks from success/neutral/fail pool based on:
    - was interaction allowed?
    - mood multiplier result (high = success, low = neutral)
    - specific mood overrides (angry pet + wash = fail text)

getPetResponseAnim(mode, pet)
  → returns animation key the pet should play during interaction
  → e.g. 'being_petted', 'being_washed', etc.
  → falls through to existing fallback system if sprite missing

calculateMoodMultiplier(pet, interactionDef)
  → reads pet.mood, looks up moodModifiers on the def
  → returns float multiplier (0.3 – 2.0)
```

### New Action Types (added to `ActionTypes.ts`)

```ts
| { type: 'SET_HAND_MODE'; mode: HandMode }
| { type: 'START_PET_INTERACTION'; mode: HandMode }
| { type: 'END_PET_INTERACTION' }
| { type: 'INTERACTION_TICK'; deltaMs: number }
| { type: 'PURCHASE_CARE_TOOL'; toolId: string; cost: number }
| { type: 'UPGRADE_TOOL_TIER'; mode: HandMode; tier: number }
```

### New Engine State Field

Added to `EngineState` in `src/types/engine.ts`:

```ts
interaction: InteractionState;
```

### Reducer Handling

Each action case in `engineReducer.ts` calls the appropriate `InteractionSystem` pure function and returns the new state. Pattern matches the existing reducer style (deductTokens, logEvent, etc.).

---

## 8. Layer 3 — Pet Type Extensions

### New Fields on `Pet` (in `src/types/pet.ts`)

```ts
trust: number;          // 0–100, grows with consistent positive interaction
discipline: number;     // 0–100, grows with training
groomingScore: number;  // 0–100, decays slowly, affects appearance state
stress: number;         // 0–100, builds from neglect/negative events
```

### Decay Integration (in `PetNeedSystem.ts`)

| Stat | Decay Rate | Notes |
|------|------------|-------|
| `trust` | -0.5/min | Very slow; represents lasting relationship |
| `groomingScore` | -1/min | Moderate; pet gets messy over time |
| `stress` | +0.3/min when needs are low | Builds when hunger < 30 or happiness < 20 |
| `discipline` | -0.2/min | Very slow decay; training sticks |

### Save Migration

Existing saves that lack these fields get sensible defaults:

```ts
trust: 20,
discipline: 0,
groomingScore: 50,
stress: 0,
```

---

## 9. Layer 4 — Components

### `HandCursor.tsx` — The Floating Hand

- Renders the hand sprite sheet using the same `AnimationController` + `computeSpriteStyle` system as `PetSprite`
- Follows pointer position via CSS `transform: translate()` (not actual cursor replacement — works on mobile)
- Picks sprite sheet based on `HandAnimState`:
  - `HAND_IDLE` → `hand_idle.png` (9 frames)
  - `HAND_RUB` / `HAND_TAP` → `hand_rub.png` (4 frames)
  - Other states → falls back to `hand_idle.png` + CSS transform + TODO label
- Z-index: `Z.HAND` (above pet, below UI)
- Only visible on home screen when interaction toolbar is active
- Hand hides browser cursor via `cursor: none` on the scene container

### `PetTouchZone.tsx` — Pointer Capture Over Pet

- Invisible `<div>` positioned over the pet sprite using `petX`, `groundY`, `scale`
- Sized to pet's bounding box (~128px * petScale in native coords)
- Captures `onPointerDown`, `onPointerMove`, `onPointerUp`
- Translates viewport coords → native 400x224 space using `useSceneScale`
- Detects gesture type:
  - **Tap**: pointerDown + pointerUp within 300ms, < 10px movement
  - **Rub/Drag**: pointerDown + pointerMove > 10px
  - **Hold**: pointerDown held > 800ms without significant movement
- Dispatches `START_PET_INTERACTION` / `END_PET_INTERACTION` to reducer
- Shows subtle hover effect when hand is over pet (pet leans toward hand)

### `InteractionToolbar.tsx` — Mode Selector

- Horizontal bar at bottom of home screen, 6 circular buttons
- Each button: icon + label + lock state + cooldown ring
- Selected mode: glowing border, slightly enlarged
- Locked mode: dimmed, lock icon overlay, tooltip with unlock hint
- Cooldown: circular progress ring around button, grayed until ready
- Z-index: `Z.UI_HUD`
- Closes/minimizes when not in use (small toggle handle like RightSidePanel)

### `InteractionVFX.tsx` — Placeholder Effects

Built on `ReactionBurst` pattern. Each interaction has a unique VFX:

| Interaction | VFX | Implementation |
|-------------|-----|----------------|
| Pet/Rub | Heart particles rising | Emoji hearts + CSS float-up animation |
| Wash | Bubbles floating up | CSS circles with opacity + float animation |
| Brush | Fluff/dust drifting | Small particles with lateral drift |
| Comfort | Soft radial pulse glow | CSS radial gradient + breathing scale animation |
| Training | Energy burst | Star emoji particles + quick pop animation |
| Play | Bouncy confetti | Mixed emoji particles + random trajectory |

Each also shows a TODO label overlay: `"TODO: [specific final animation name]"`

### `InteractionFeedback.tsx` — Reaction Text

- Small floating text bubble positioned above pet
- Shows reaction phrases like `"Mmm... that's nice~"`, `"Hey, too rough!"`, `"Good focus!"`
- CSS fade-in → hold 2s → fade-out
- Queue system: if rapid interactions, messages queue and display sequentially
- Text color varies: green (success), white (neutral), orange (fail)

### `InteractionDebug.tsx` — Dev Panel

- Toggle with `I` key (alongside `D` for sprite debug, `H` for hide UI)
- Displays:
  - Current hand mode + animation state
  - Active interaction timer
  - Cooldown timers for all 6 modes
  - Streak count + multiplier
  - All pet interaction stats: trust, discipline, groomingScore, stress
  - Unlock states for all tools
  - Tool tier levels
  - Current mood multiplier
- Quick-action buttons:
  - Unlock all tools
  - Reset all cooldowns
  - Set pet mood (calm/playful/curious/anxious/angry)
  - Force trigger each interaction
  - Reset interaction state

---

## 10. Layer 5 — Hooks

### `useHandInteraction.ts`

```
Input: dispatch, pet, interactionState, scale
Output: {
  handPos: { x: number, y: number },      // viewport coords
  handMode: HandMode,
  isOverPet: boolean,
  interactionGesture: 'none' | 'tap' | 'rub' | 'hold',
  setHandMode: (mode: HandMode) => void,
}
```

- Throttled pointer tracking (every 16ms / 60fps)
- Pet bounding box computed from `petX`, `groundY`, `petScale`, `scale`
- Gesture detection based on pointer event sequence

### `usePetReaction.ts`

```
Input: interactionState, pet
Output: {
  reactionAnim: string | null,      // animation override key
  reactionText: string | null,      // display text
  vfxType: string | null,           // which VFX to show
  isReacting: boolean,              // true during + shortly after interaction
  anticipation: boolean,            // true when hand hovers over pet
}
```

State machine phases:
1. **Idle** — no interaction, pet does normal intent-driven animation
2. **Anticipation** — hand hovers over pet; pet shows subtle lean/notice
3. **Reacting** — interaction active; pet plays reaction animation + text + VFX
4. **Afterglow** — interaction ended; pet settles back with brief positive/negative expression
5. **Cooldown** — returns to idle

---

## 11. Layer 6 — GameSceneShell Integration

### New Z-Band Allocations (added to `zBands.ts`)

```ts
// Interaction system
TOUCH_ZONE: 21,          // Invisible pointer capture
HAND: 22,                // Floating hand cursor
INTERACTION_VFX: 23,     // Particle effects
INTERACTION_TEXT: 24,     // Reaction text bubbles
// ...
UI_INTERACTION_BAR: 32,  // Interaction toolbar
```

### GameSceneShell Changes

New layers added between pet (z-20) and UI (z-30):

```tsx
{/* z-21: Touch detection zone over pet */}
<PetTouchZone
  petX={petX} groundY={scene.groundY} scale={scale}
  petScale={scene.petScale} handMode={handMode}
  onInteractionStart={(mode) => dispatch({ type: 'START_PET_INTERACTION', mode })}
  onInteractionEnd={() => dispatch({ type: 'END_PET_INTERACTION' })}
/>

{/* z-22: Floating hand cursor */}
<HandCursor
  handPos={handPos} handMode={handMode}
  animState={handAnimState} scale={scale}
/>

{/* z-23: Interaction VFX */}
{isReacting && (
  <InteractionVFX
    type={vfxType} petX={petX} groundY={scene.groundY} scale={scale}
  />
)}

{/* z-24: Reaction text */}
{reactionText && (
  <InteractionFeedback
    text={reactionText} petX={petX} groundY={scene.groundY} scale={scale}
  />
)}

{/* z-32: Interaction toolbar (below existing UI) */}
<InteractionToolbar
  activeMode={handMode}
  interactionState={state.interaction}
  pet={pet}
  playerTokens={state.player.currencies.tokens}
  onSelectMode={(mode) => dispatch({ type: 'SET_HAND_MODE', mode })}
/>
```

### Wander Pause

The `useIdleWander` hook already accepts a `paused` boolean. During active interaction, pass `true` so the pet holds position while being touched.

```tsx
const wanderPaused = intent === 'sleep' || intent === 'dead' || state.interaction.isInteracting;
```

---

## 12. Layer 7 — Economy Integration

### New Shop Category: "Care Tools"

Added to `shopConfig.ts` as `category: 'care_tool'`:

| Item | Cost | Unlock Requirement | Effect |
|------|------|--------------------|--------|
| Soap Kit | 25 tokens | Level 2 | Unlocks Wash interaction |
| Brush Set | 30 tokens | Bond >= 10 | Unlocks Brush interaction |
| Training Manual | 40 tokens | Level 3 | Unlocks Training interaction |
| Premium Soap | 60 tokens | Level 4 | 1.5x wash cleanliness gain |
| Grooming Kit | 80 tokens | 5 battles won | 1.5x groom effectiveness + calm bonus |
| Training Weights | 100 tokens | Level 5 | 1.5x discipline gain |
| Comfort Blanket | 45 tokens | Level 3 | 2x stress reduction from Comfort |
| Deluxe Toy | 65 tokens | Bond >= 20 | 1.5x play happiness gain |

### Progression Loop

```
Earn tokens from math problems
  → Buy care tools in shop
    → Unlock richer pet interactions
      → Pet grows stronger (trust, discipline, stats)
        → Better performance in battles
          → Earn more tokens from battle wins
            → Buy upgraded tools
              → Even deeper pet responses + multiplied gains
```

### Base Interactions (Always Free)

These require no purchase and are available from the start:
- **Pet / Rub** — free, always unlocked
- **Comfort / Soothe** — free, always unlocked
- **Play / Bond** — free, always unlocked

### Per-Use Costs

Some interactions cost tokens per use (on top of tool unlock cost):

| Interaction | Per-Use Cost | Notes |
|-------------|-------------|-------|
| Pet / Rub | 0 | Always free |
| Wash | 5 tokens | Soap consumable feel |
| Brush | 3 tokens | Light maintenance cost |
| Comfort | 0 | Always free |
| Training | 8 tokens | Investment in growth |
| Play | 0 | Always free |

---

## 13. Layer 8 — Pet Feel (Mood-Aware Responses)

### Mood Multiplier Table

How the pet's current mood modifies each interaction's effectiveness:

| Pet Mood | Pet/Rub | Wash | Brush | Comfort | Train | Play |
|----------|---------|------|-------|---------|-------|------|
| **Playful** | 1.3x (leans in eagerly) | 1.0x (tolerates cheerfully) | 1.0x | 0.5x (doesn't need it) | 1.2x (focused energy) | 1.3x (bouncy, extra fun) |
| **Calm** | 1.0x (relaxed lean) | 1.2x (best response) | 1.2x (loves it) | 0.7x (mild acknowledgment) | 1.0x (normal focus) | 1.0x (normal energy) |
| **Curious** | 1.1x (interested) | 0.9x (distracted) | 0.9x (fidgety) | 0.6x (not needed) | 1.1x (eager to learn) | 1.2x (wants to explore) |
| **Anxious** | 0.7x (flinches first) | 0.5x (resists) | 0.6x (slight resistance) | 2.0x (strong response) | 0.7x (poor focus) | 0.5x (too nervous) |
| **Angry** | 0.5x (pulls away) | 0.3x (hates it) | 0.4x (refuses) | 1.5x (slow melt) | 0.3x (refuses) | 0.3x (refuses) |

### Behavioral Responses by Mood

**When hand hovers near pet (anticipation phase):**
- Happy/Playful: Subtle lean toward hand, slight bounce
- Calm: Looks toward hand, gentle acknowledgment
- Curious: Perks up, slight head tilt
- Anxious: Leans away slightly, hesitant
- Angry: Turns away, flinch

**State lockouts:**
- **Sleeping**: No interactions except gentle Comfort (half effect)
- **Sick**: Only Comfort works (halved effectiveness)
- **Dead**: No interactions possible

---

## 14. The 6 Interactions

### 1. Pet / Rub

| Property | Value |
|----------|-------|
| **Purpose** | Basic affection, fast bonding, makes pet feel alive |
| **Unlock** | Always available |
| **Cost** | Free |
| **Gesture** | Tap or rub (click-drag) on pet |
| **Cooldown** | 3 seconds |
| **Duration** | Instant (tap) or continuous (rub) |
| **Hand state** | `HAND_RUB` (uses `hand_rub.png` sheet) |
| **Stat effects** | +8 bond, +5 happiness, +3 trust |
| **Streak bonus** | 3-tap: 1.2x, 5-tap: 1.5x, 8-tap: 2x gains |
| **Placeholder label** | `"TODO: Pet happy nuzzle animation"` |
| **VFX** | Heart particles rising |
| **Pet reaction** | Lean toward hand, happy face, slight bounce |
| **Success text** | `"Mmm... that's nice~"`, `"More please!"`, `"*happy chirp*"` |
| **Diminishing returns** | After 10 uses in 2 min: gains halved, text: `"I need a break~"` |

### 2. Wash

| Property | Value |
|----------|-------|
| **Purpose** | Hygiene / care interaction |
| **Unlock** | Purchase "Soap Kit" (25 tokens, level 2) |
| **Cost** | 5 tokens per use |
| **Gesture** | Rub/drag across pet body |
| **Cooldown** | 30 seconds |
| **Duration** | 10 seconds (progress bar) |
| **Hand state** | `HAND_SCRUB` (falls back to `hand_rub.png` + CSS transform) |
| **Stat effects** | +30 cleanliness, +5 happiness (calm mood), +2 bond |
| **Placeholder label** | `"TODO: Soap scrub loop animation"` |
| **VFX** | Bubble particles floating up, shine on completion |
| **Pet reaction** | Flinch → acceptance → happy shake-off |
| **Success text** | `"Squeaky clean!"`, `"That feels refreshing"`, `"*shakes off water*"` |
| **Fail text (angry)** | `"Not now!"`, `"*dodges soap*"` |
| **Future hooks** | Disease/neglect prevention system |

### 3. Brush / Groom

| Property | Value |
|----------|-------|
| **Purpose** | Grooming / calming / visual care |
| **Unlock** | Purchase "Brush Set" (30 tokens, bond >= 10) |
| **Cost** | 3 tokens per use |
| **Gesture** | Drag across pet (directional strokes) |
| **Cooldown** | 20 seconds |
| **Duration** | 8 seconds |
| **Hand state** | `HAND_DRAG` (falls back to `hand_rub.png` + CSS rotation) |
| **Stat effects** | +15 cleanliness, +8 bond, +10 groomingScore, +3 happiness |
| **Placeholder label** | `"TODO: Brush fluff animation"` |
| **VFX** | Fluff/dust particles drifting laterally, shine streak |
| **Pet reaction** | Relaxed face, slight lean, satisfied expression |
| **Success text** | `"So fluffy..."`, `"Looking sharp!"`, `"*purrs contentedly*"` |
| **Future hooks** | Style/appearance score for cosmetic system |

### 4. Comfort / Soothe

| Property | Value |
|----------|-------|
| **Purpose** | Emotionally support the pet when distressed |
| **Unlock** | Always available |
| **Cost** | Free |
| **Gesture** | Hold (press and wait 800ms+) |
| **Cooldown** | 15 seconds |
| **Duration** | 5 seconds hold |
| **Hand state** | `HAND_HOLD` (falls back to `hand_idle.png` + still + glow) |
| **Stat effects** | -20 stress, +10 trust, +5 bond |
| **Effectiveness** | 2x when pet is anxious/angry; 0.5x when pet is already happy |
| **Placeholder label** | `"TODO: Comfort settle animation"` |
| **VFX** | Soft radial pulse glow (warm yellow), calming breath rhythm |
| **Pet reaction** | Tense → breathing slows → relaxes → safe expression |
| **Success text** | `"...it's okay"`, `"I'm here."`, `"*deep breath*"`, `"*relaxes*"` |
| **Special** | Works on sleeping pets (half effect), best interaction for sick pets |

### 5. Training

| Property | Value |
|----------|-------|
| **Purpose** | Hands-on active growth, stat building |
| **Unlock** | Purchase "Training Manual" (40 tokens, level 3) |
| **Cost** | 8 tokens per session |
| **Gesture** | Tap sequence (3-5 timed taps within windows) |
| **Cooldown** | 45 seconds |
| **Duration** | ~6 seconds (tap timing mini-sequence) |
| **Hand state** | `HAND_TAP` (uses `hand_rub.png` sheet) |
| **Stat effects** | +10 discipline, +3 bond, +15 XP |
| **Placeholder label** | `"TODO: Training practice animation"` |
| **VFX** | Energy burst particles, determination sparkle |
| **Pet reaction** | Alert face → focused → success celebration or tired slouch |
| **Success text** | `"Good job!"`, `"Focus up!"`, `"Nice form!"`, `"*determined look*"` |
| **Fail text** | `"Let's try again..."`, `"Almost!"` |
| **Future hooks** | Combat stat scaling, mini-game expansion |

### 6. Play / Bond Activity

| Property | Value |
|----------|-------|
| **Purpose** | Joy and relationship building, not just maintenance |
| **Unlock** | Always available |
| **Cost** | Free |
| **Gesture** | Quick taps and drags (follow-the-hand, boop) |
| **Cooldown** | 10 seconds |
| **Duration** | 6 seconds |
| **Hand state** | `HAND_RUB` (uses `hand_rub.png` sheet) |
| **Stat effects** | +15 happiness, +5 bond, -3 hunger (energy cost) |
| **Placeholder label** | `"TODO: Play chase animation"` |
| **VFX** | Bouncy star bursts, confetti pop |
| **Pet reaction** | Excited bounce, hop motion, tail wag |
| **Success text** | `"Wheee!"`, `"*excited hop*"`, `"Again again!"`, `"So fun!"` |
| **Special** | 0.5x effectiveness if pet is anxious/angry (needs comfort first) |

---

## 15. Placeholder & Animation Drop-In Guide

### Placeholder System

Every interaction that lacks final art uses this fallback approach:

1. **Pet reaction animation**: Falls through to PetSprite's existing `SpriteFallback` component (black box with "MISSING ANIMATION" label + animation name)
2. **Hand animation**: Falls back to `hand_idle.png` sheet with CSS transform hint + small TODO label
3. **VFX**: CSS/emoji particles (hearts, bubbles, sparkles) — no sprite art needed
4. **Sound**: Function call placeholder `playSound('interaction_pet_rub')` with no audio file — logs to console

### How to Drop In Final Animations Later

#### Pet Reaction Animations

1. Create Aseprite sprite sheet for the reaction (e.g., koala being petted)
2. Export as horizontal PNG strip
3. Save to: `public/assets/pets/{species}/{interaction}/sheet.png`
   - Example: `public/assets/pets/blue-koala/being_petted/sheet.png`
4. Add entry to `assetManifest.ts`:
   ```ts
   koala_sprite__being_petted: {
     url: '/assets/pets/blue-koala/being_petted/sheet.png',
     // ... sprite sheet config
   }
   ```
5. The override key system in `PetSprite.tsx` picks it up automatically — **no code changes needed**

#### Hand Animations

1. Create sprite sheet for the hand state
2. Save to: `public/assets/hand/hand_{state}.png`
   - Example: `public/assets/hand/hand_scrub.png`
3. Update the `HAND_ASSETS` config in `assetManifest.ts`
4. `HandCursor` component picks it up automatically

#### Sound Effects

1. Save audio file to: `public/assets/sounds/{interaction}_{result}.mp3`
2. Update sound config (future sound system)
3. The `playSound()` placeholder calls become real

---

## 16. Debug / Dev Mode

### Toggle: Press `I` Key on Home Screen

Adds a debug panel alongside existing `D` (sprite debug) and `H` (hide UI) toggles.

### Panel Contents

```
┌─ INTERACTION DEBUG ───────────────────────┐
│ Mode: [pet]  State: HAND_RUB              │
│ Interacting: YES  Duration: 2.3s          │
│ Streak: 4 (1.5x bonus)                   │
│                                           │
│ Cooldowns:                                │
│   pet: READY   wash: 12s   brush: READY   │
│   comfort: 8s  train: 30s  play: READY    │
│                                           │
│ Pet Stats:                                │
│   trust: 45    discipline: 22             │
│   grooming: 78  stress: 12               │
│   bond: 67                                │
│                                           │
│ Unlocks: [pet] [comfort] [play]           │
│ Locked:  [wash:L2] [brush:B10] [train:L3] │
│                                           │
│ Mood: playful  Multiplier: 1.3x           │
│                                           │
│ [Unlock All] [Reset CDs] [Set Mood ▾]     │
│ [Force Pet] [Force Wash] [Force Train]    │
│ [Reset State]                             │
└───────────────────────────────────────────┘
```

---

## 17. Risks & Mitigations

### Missing Art (All Handled)

| Asset | Placeholder | Ready for Drop-In |
|-------|-------------|-------------------|
| Hand states (scrub, hold, drag, point) | CSS transform on idle sheet + TODO label | Yes — `HandAssetConfig` slot per state |
| Pet reaction anims (6 interactions) | `SpriteFallback` black box (existing system) | Yes — override key system |
| Sound effects | Console log placeholder | Yes — `playSound()` function |
| Interaction-specific VFX sprites | CSS/emoji particles | Yes — replaceable component |

### Save Migration

New `Pet` fields (`trust`, `discipline`, `groomingScore`, `stress`) and new `EngineState.interaction` field need defaults for existing saves.

**Mitigation:** `createInitialEngineState` and save loading apply defaults via nullish coalescing:

```ts
trust: pet.trust ?? 20,
discipline: pet.discipline ?? 0,
groomingScore: pet.groomingScore ?? 50,
stress: pet.stress ?? 0,
```

### Performance

- Hand cursor tracking is throttled to 60fps via `requestAnimationFrame`
- VFX particles are limited to 10-15 per burst
- Touch zone uses a single event listener, not per-pixel detection
- No collision detection — simple bounding box overlap check

### Mobile / Touch Support

- `HandCursor` uses pointer events (works for both mouse and touch)
- No hover state on mobile — anticipation triggers on first touch instead
- Touch zone sized generously to account for finger precision
- No `cursor: none` on mobile (hand cursor component handles visibility)

---

## 18. Implementation Order

Each step is a self-contained, testable increment:

### Step 1: Types & Config
- [ ] Create `src/types/interaction.ts`
- [ ] Create `src/config/interactionConfig.ts` (all 6 interaction defs)
- [ ] Create `src/config/careToolConfig.ts`

### Step 2: Engine Extension
- [ ] Add actions to `src/engine/core/ActionTypes.ts`
- [ ] Create `src/engine/systems/InteractionSystem.ts`
- [ ] Add `InteractionState` to `src/types/engine.ts`
- [ ] Add reducer cases to `src/engine/state/engineReducer.ts`
- [ ] Add defaults to `src/engine/state/createInitialEngineState.ts`

### Step 3: Pet Type Extension
- [ ] Add `trust`, `discipline`, `groomingScore`, `stress` to `Pet` in `src/types/pet.ts`
- [ ] Add decay for new stats in `src/engine/systems/PetNeedSystem.ts`
- [ ] Add save migration defaults

### Step 4: Intent System Extension
- [ ] Add interaction intents to `PetIntentSystem.ts`
- [ ] Add animation name mappings
- [ ] Extend `AnimationName` type in `src/engine/animation/types.ts`

### Step 5: Hand Cursor
- [ ] Copy hand assets to `public/assets/hand/`
- [ ] Add hand sprite configs to `src/config/assetManifest.ts`
- [ ] Add `HAND` z-band to `src/config/zBands.ts`
- [ ] Create `src/components/interaction/HandCursor.tsx`

### Step 6: Touch Zone & Hooks
- [ ] Create `src/hooks/useHandInteraction.ts`
- [ ] Create `src/hooks/usePetReaction.ts`
- [ ] Create `src/components/interaction/PetTouchZone.tsx`

### Step 7: Interaction Toolbar
- [ ] Create `src/components/interaction/InteractionToolbar.tsx`

### Step 8: VFX & Feedback
- [ ] Create `src/components/interaction/InteractionVFX.tsx`
- [ ] Create `src/components/interaction/InteractionFeedback.tsx`

### Step 9: Economy Integration
- [ ] Add care tool items to `src/config/shopConfig.ts`
- [ ] Wire unlock checks into `InteractionSystem`

### Step 10: Debug Panel
- [ ] Create `src/components/interaction/InteractionDebug.tsx`
- [ ] Add `I` key toggle in `GameSceneShell`

### Step 11: GameSceneShell Integration
- [ ] Wire all new components into `GameSceneShell.tsx`
- [ ] Add wander pause during interactions
- [ ] Connect hooks to dispatch

### Step 12: Pet Feel Tuning
- [ ] Implement mood multiplier table
- [ ] Add anticipation hover behavior
- [ ] Add streak bonus system
- [ ] Add diminishing returns for spam
- [ ] Test all 6 interactions across all moods

---

## Post-Implementation Report Template

After building, provide:

- [ ] Files changed (with what each file now does)
- [ ] Placeholder animations still needed (with exact naming convention)
- [ ] Where to plug in final Aseprite animations
- [ ] What future interactions this system makes easy to add
- [ ] Known issues or rough edges
