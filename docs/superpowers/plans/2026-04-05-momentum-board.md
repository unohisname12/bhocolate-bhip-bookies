# Momentum Board — Production-Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a math-thinking tactical board game mini-game ("Momentum Board") that feels like a real game moment inside the pet's universe — not a school math quiz. Gameplay IS the math: counting, energy management, and tactical movement planning on a 5x5 battlefield with spirit creatures, a reactive pet companion, and dramatic Flash Moment sequences.

**Architecture:** Self-contained feature module following the existing BattleSystem pattern. Core logic in pure functions (`MomentumSystem.ts`), visual layer in dedicated components with a config-driven theme system (`MomentumTheme.ts`). Pet integration via a non-invasive wrapper component. Flash Moment as a multi-phase cinematic sequence reusing existing animation patterns (screen shake, impact burst, glow pulses). All visuals support future pixel-art asset swap.

**Tech Stack:** React 19, TypeScript (strict), Tailwind CSS, CSS keyframe animations, Vitest

---

## Context

The V-pet game needs a new mini-game that teaches math through gameplay rather than quizzes. The Momentum Board embeds arithmetic into energy management, movement cost, and rank progression — the player IS doing math by playing the game.

**Critical design constraint:** This must feel like part of the pet's world. The pet watches and reacts. The board is a living battlefield with terrain, spirit creatures, and dramatic moments. If it looks like a classroom tool, it's wrong.

**Protected files (Stage 2 agent):** GameSceneShell.tsx, SceneStage.tsx, SceneLayerRenderer.tsx, sceneConfig.ts, zBands.ts, PetSprite.tsx — DO NOT MODIFY.

---

## 1. System Overview

### Game Rules (Unchanged from V1 Plan)

| Concept | Rule |
|---------|------|
| Board | 5x5 themed battlefield grid |
| Players | Player (bottom) vs AI (top) |
| Pieces per side | 3 spirit creatures |
| Movement | 4-directional, 1 energy per tile |
| Turns | One piece per turn, alternating |
| Energy grant | Start of each team's turn: +rank energy (capped) |
| Combat | Move onto enemy = capture. Attacker always wins |
| Rank promotion | Lower rank captures higher → +1 rank (permanent, max 3) |
| Flash Moment | Triggered by exact-energy-kill or underdog-win (player only) |
| Flash reward A | Upgrade: piece rank+1 (rank 3→temp rank 4 for 2 turns) |
| Flash reward B | Fusion: two rank 2 pieces → one rank 3 (0 energy) |
| Win condition | Eliminate all enemy pieces |
| Loss condition | All player pieces eliminated, or 50-turn limit |

### Starting Layout

```
     Col:  0     1     2     3     4
Row 0:    [e1]  [ ]   [e2]  [ ]   [e3]     Enemy: shadow spirits (R1, R2, R1)
Row 1:    [ ]   [ ]   [ ]   [ ]   [ ]
Row 2:    [ ]   [ ]   [ ]   [ ]   [ ]      Neutral zone (mixed terrain)
Row 3:    [ ]   [ ]   [ ]   [ ]   [ ]
Row 4:    [p1]  [ ]   [p2]  [ ]   [p3]     Player: light spirits (R1, R2, R1)
```

---

## 2. Visual Design System

### 2a. Board Theme (`MomentumTheme.ts` — config-driven)

The board is NOT a plain grid. It's a battlefield environment.

```typescript
export interface TileTheme {
  baseColor: string;        // CSS color or gradient
  borderColor: string;      // subtle tile border
  shadowInset: string;      // inner shadow for depth
  texture?: string;         // future: path to tile sprite
}

export interface BoardTheme {
  name: string;
  backdrop: string;         // CSS gradient for area behind board
  tiles: {
    grass: TileTheme;
    stone: TileTheme;
    crystal: TileTheme;
    dirt: TileTheme;
  };
  tileLayout: string[][];   // 5x5 tile type assignments
  boardShadow: string;      // drop shadow under entire board
  boardBorder: string;      // outer board frame
  gridGap: string;          // gap between tiles
}
```

**Default theme ("Twilight Arena"):**
- Backdrop: dark gradient (slate-900 → indigo-950/80)
- Grass tiles: deep green with subtle inner shadow
- Stone tiles: slate-700 with slight texture gradient
- Crystal tiles: indigo accent (where flash moments happened)
- Board sits "floating" with a large drop shadow and subtle border glow
- Tile layout places stone at center and paths, grass at edges, creates visual flow

**All colors and styles are in the theme config — no hardcoded CSS colors for tiles or pieces.** Future pixel-art tile sprites replace `baseColor` with `texture` path.

### 2b. Piece Design (Spirit Creatures, NOT Circles)

Pieces are small spirit/creature tokens that belong in the pet's world.

```typescript
export interface PieceTheme {
  team: Team;
  colors: {
    body: string;           // primary gradient
    glow: string;           // aura color
    badge: string;          // rank badge color
    shadow: string;         // ground shadow
  };
  sprite?: string;          // future: path to piece sprite sheet
}
```

**Player spirits:** Cyan/blue tinted (matching the game's player accent: `cyan-400`)
- Body: radial gradient from `cyan-300` to `blue-600`
- Small "face" details via CSS (two dot eyes, subtle mouth) — replaceable with sprite
- Drop shadow underneath for grounding
- Size scales with rank: rank 1 = 36px, rank 2 = 42px, rank 3 = 48px, rank 4 = 52px

**Enemy spirits:** Red/crimson tinted (matching enemy accent: `red-400`)
- Body: radial gradient from `red-300` to `rose-700`
- Same face details, mirror-styled
- Slightly darker shadow (more menacing)

**Rank badge:** Small star/diamond overlay in top-right corner of piece
- Rank 1: no badge (smallest spirit)
- Rank 2: single star
- Rank 3: double star
- Rank 4 (temp): crown icon with golden glow

### 2c. Energy Aura System

Energy is NOT dots or bars. It's a visual intensity system.

```typescript
export interface EnergyVisualConfig {
  /** 0-1 ratio of current/max energy */
  intensity: number;
  /** true when energy === maxEnergy */
  isMaxed: boolean;
  /** true when energy === 0 */
  isDepleted: boolean;
}
```

**Visual mapping:**
- **0 energy:** No aura. Piece appears slightly dimmed (`opacity: 0.7`, `filter: brightness(0.8)`)
- **Low energy (1-33%):** Faint outer glow (2px box-shadow, team color at 20% opacity)
- **Mid energy (34-66%):** Visible glow (4px box-shadow, team color at 40% opacity)
- **High energy (67-99%):** Strong glow (6px box-shadow, team color at 60% opacity), subtle breathing animation
- **Max energy:** Full pulsing aura. Uses `glow-pulse` keyframe animation (2s infinite). Glow expands 6px→10px rhythmically. Piece has slight scale breathing (1.0→1.03). Optional: faint particle sparkles around piece using a simplified ReactionBurst pattern

**Energy count:** Small number overlaid at bottom of piece (e.g., "3" in bold, semi-transparent). Always visible for tactical clarity. Styled as: white text with dark text-shadow, `font-size: 10px`, `font-weight: 800`.

### 2d. Board Depth & Presence

- **Board container:** `border-radius: 12px`, outer glow (`box-shadow: 0 0 40px rgba(0,0,0,0.6), 0 0 2px rgba(100,130,255,0.15)`), sits over a full-bleed backdrop
- **Tiles:** Each tile has `box-shadow: inset 0 1px 2px rgba(0,0,0,0.3)` for depth. Tile edges use slightly darker border for grid definition
- **Piece shadows:** Each piece has a small oval shadow beneath it (`radial-gradient, opacity 0.3, 80% width, positioned at bottom`)
- **Backdrop:** Full-screen dark gradient with subtle environmental hints (very faint star-field dots or ambient glow, all CSS — no images required initially)

---

## 3. Data Model (TypeScript Interfaces)

**File:** `src/types/momentum.ts` (NEW)

```typescript
export type Team = 'player' | 'enemy';
export type PieceRank = 1 | 2 | 3 | 4;

export interface BoardPosition {
  x: number; // column 0-4
  y: number; // row 0-4 (0=top/enemy, 4=bottom/player)
}

export interface MomentumPiece {
  id: string;
  team: Team;
  rank: PieceRank;
  energy: number;
  position: BoardPosition;
  isTemporaryRank4: boolean;
  rank4TurnsRemaining: number;
  previousRank: PieceRank | null;
}

export type BoardGrid = (string | null)[][]; // [row][col], 5x5

export type FlashTriggerReason = 'exact_energy_kill' | 'underdog_win';

export interface FlashMomentPending {
  triggerReason: FlashTriggerReason;
  attackerPieceId: string;
  capturedPieceId: string;
}

export type FlashChoice = 'upgrade' | 'fusion';

export interface FusionTarget {
  pieceId1: string;
  pieceId2: string;
  resultPosition: BoardPosition;
}

export interface ValidMove {
  destination: BoardPosition;
  energyCost: number;
  isAttack: boolean;
  targetPieceId: string | null;
}

export type MomentumPhase =
  | 'player_select'
  | 'player_move'
  | 'animating_move'    // NEW: piece is visually moving (300ms)
  | 'animating_attack'  // NEW: attack impact playing (400ms)
  | 'resolve_combat'
  | 'flash_sequence'    // RENAMED: full cinematic sequence, not just a modal
  | 'flash_choice'
  | 'animating_flash'   // NEW: flash reward animating (upgrade glow / fusion merge)
  | 'ai_turn'
  | 'animating_ai'      // NEW: AI move animating
  | 'victory'
  | 'defeat';

export interface MomentumLogEntry {
  turn: number;
  actor: Team;
  message: string;
}

export interface MomentumRewards {
  tokens: number;
  xp: number;
}

// --- Visual event system (drives pet reactions + effects) ---

export type MomentumGameEvent =
  | { type: 'piece_moved'; pieceId: string; from: BoardPosition; to: BoardPosition }
  | { type: 'piece_attacked'; attackerId: string; defenderId: string; position: BoardPosition }
  | { type: 'piece_captured'; capturedId: string; capturedBy: string }
  | { type: 'piece_promoted'; pieceId: string; fromRank: PieceRank; toRank: PieceRank }
  | { type: 'flash_triggered'; reason: FlashTriggerReason; position: BoardPosition }
  | { type: 'flash_upgrade'; pieceId: string; newRank: PieceRank }
  | { type: 'flash_fusion'; consumed: [string, string]; resultId: string; position: BoardPosition }
  | { type: 'rank4_expired'; pieceId: string }
  | { type: 'turn_skipped'; team: Team }
  | { type: 'game_won' }
  | { type: 'game_lost' };

export interface ActiveMomentumState {
  active: true;
  phase: MomentumPhase;
  turnCount: number;
  activeTeam: Team;
  pieces: MomentumPiece[];
  board: BoardGrid;
  selectedPieceId: string | null;
  validMoves: ValidMove[];
  flashPending: FlashMomentPending | null;
  flashEligibleForFusion: boolean;
  log: MomentumLogEntry[];
  rewards: MomentumRewards | null;
  lastEvent: MomentumGameEvent | null;  // NEW: drives visual reactions
}

export interface InactiveMomentumState {
  active: false;
}

export type MomentumState = ActiveMomentumState | InactiveMomentumState;
```

---

## 4. Turn Flow

```
PLAYER TURN:
  1. Grant energy to all player pieces (capped by rank max)
  2. Decay rank4 timers for player pieces (revert if expired → lastEvent: rank4_expired)
  3. Phase → player_select
  4. Player clicks piece → compute valid moves via BFS → phase → player_move
     (valid move cells get animated highlight — pulse animation, not static color)
  5. Player clicks destination:
     a. Phase → animating_move (piece slides to destination, 300ms CSS transition)
     b. Deduct energy, update board
     c. If attack:
        - Phase → animating_attack (impact burst + board shake, 400ms)
        - lastEvent: piece_attacked → piece_captured
        - Check rank promotion → lastEvent: piece_promoted
        - Check flash trigger
        - If flash → Phase → flash_sequence (cinematic: freeze → zoom → burst → text)
          → Phase → flash_choice (player picks)
          → Phase → animating_flash (upgrade glow or fusion merge, 500ms)
     d. Check win condition
  6. If no winner → switch to AI turn

AI TURN:
  1. Phase → ai_turn
  2. Grant energy to all enemy pieces
  3. Decay rank4 timers
  4. AI selects piece + move
  5. Phase → animating_ai (show AI move with same smooth transitions)
  6. Execute combat (no flash triggers for AI)
  7. Check win condition
  8. Phase → player_select (new turn)
```

Animation phases (`animating_move`, `animating_attack`, `animating_flash`, `animating_ai`) are resolved client-side via `setTimeout` or `requestAnimationFrame` in the screen component — they dispatch `MOMENTUM_ANIMATION_DONE` when the animation completes to advance the phase. This keeps the reducer pure (no timers in reducer).

---

## 5. Energy System Logic

**Config** (`src/config/momentumConfig.ts`):
```typescript
export const RANK_ENERGY: Record<number, { gain: number; max: number }> = {
  1: { gain: 1, max: 2 },
  2: { gain: 2, max: 4 },
  3: { gain: 3, max: 6 },
  4: { gain: 4, max: 4 },
};
```

**Grant:** `piece.energy = min(piece.energy + RANK_ENERGY[rank].gain, RANK_ENERGY[rank].max)`

**Movement cost:** 1 energy per tile. BFS pathfinding finds all reachable tiles:
- Start at piece position, cost=0
- Expand 4 cardinal neighbors
- Friendly pieces block (can't pass through or land on)
- Enemy pieces are terminal attack destinations (can land on, can't pass through)
- BFS guarantees minimum-cost path

**Visual mapping:** Energy/max ratio → aura intensity (see Section 2c)

---

## 6. Flash System Logic

### Triggers (player attacks only)

```
exactEnergyKill = (energyBeforeMove === move.energyCost)
underdogWin = (attacker.rank < defender.rank)
flashTriggered = exactEnergyKill || underdogWin
```

### Flash Moment Cinematic Sequence (THE CORE FEATURE)

This is NOT a modal. It's a multi-phase dramatic event:

**Phase 1 — Freeze (200ms):**
- Board freezes (pointer-events: none)
- Slight desaturation filter on board (`filter: saturate(0.5)`)
- Time-stop feeling

**Phase 2 — Impact Zoom (300ms):**
- Board scales to 1.05x centered on the attack position
- Dark overlay fades in (`rgba(0,0,0,0.4)`)
- Attack position gets radial glow

**Phase 3 — Energy Burst (400ms):**
- Radial particle burst from attack position (reuse ReactionBurst pattern with energy-themed emojis/shapes)
- Board shake (reuse `battle-screen-shake` from animations.css)
- Screen tint: brief flash of team color at 15% opacity

**Phase 4 — Title Text (600ms):**
- "FLASH MOVE" text animates in:
  - `battle-damage-pop` style animation (scale 0.5→1.3→1.0)
  - Gold color (`amber-400`) with `text-shadow: 0 0 20px rgba(251,191,36,0.6)`
  - Pulse animation after settling (1.5s infinite `glow` keyframe)
- Subtitle shows trigger reason: "EXACT STRIKE!" or "UNDERDOG VICTORY!"

**Phase 5 — Choice (user input):**
- Two buttons slide in from bottom:
  - **UPGRADE** — cyan glow, icon of rising arrow, description text
  - **FUSION** — purple glow, icon of merging, description text (disabled if <2 rank-2 pieces)
- Buttons use `action-btn-ready` pulse animation from existing CSS

**Phase 6 — Resolve (500ms):**
- If Upgrade: piece glows intensely, scale pops 1.0→1.2→1.0, rank badge updates with `combo-pop` animation
- If Fusion: two pieces slide toward merge point, overlap, flash of light, single piece appears with `battle-impact-burst` animation
- Board returns to normal (de-zoom, re-saturate)

### Reward Mechanics

**Upgrade:**
- Attacking piece gets +1 rank
- Rank 1→2, 2→3: permanent
- Rank 3→4: temporary (`isTemporaryRank4=true`, `rank4TurnsRemaining=2`)
- Rank 4 energy capped at 4

**Fusion:**
- Precondition: ≥2 rank-2 player pieces on board
- Player selects two rank-2 pieces (clickable during `flash_choice` phase)
- Player picks which position for the result
- Both pieces removed, new rank-3 piece created at chosen position, 0 energy

### Rank 4 Decay

Start of team's turn: decrement `rank4TurnsRemaining`. At 0: revert to `previousRank` (always 3). Energy stays as-is.

---

## 7. Pet Integration

### PetOverlay Component (`src/components/momentum/PetOverlay.tsx`)

The player's pet watches the game and reacts to events. Positioned in the bottom-left corner of the screen, partially overlapping the board area.

**Implementation:**
- Wraps `PetSprite` (imported, NOT modified) in a container with positioning
- Manages which `animationName` to pass based on `lastEvent` from game state
- Falls back to a labeled placeholder if animation is missing

```typescript
// Event → animation mapping (config-driven)
const EVENT_ANIMATION_MAP: Partial<Record<MomentumGameEvent['type'], string>> = {
  piece_attacked: 'attack',      // aggressive pose
  piece_captured: 'happy',       // when player captures
  flash_triggered: 'special',    // hype/excited
  flash_upgrade: 'happy',        // celebratory
  flash_fusion: 'special',       // amazed
  rank4_expired: 'idle',         // back to watching
  game_won: 'happy',             // victory dance
  game_lost: 'hurt',             // sad
  turn_skipped: 'idle',          // waiting
};
```

**Fallback behavior:**
```tsx
// If PetSprite fails to render the animation (missing sheet), show placeholder
<div className="w-24 h-24 bg-black rounded flex items-center justify-center">
  <span className="text-[10px] text-yellow-400 font-bold text-center">
    MISSING: {animationName.toUpperCase()}
  </span>
</div>
```

**Positioning:** Fixed bottom-left, `z-30`, with subtle dark panel behind it. Semi-transparent so it doesn't obstruct the board. Pet reacts with a 500ms delay after the event (so the game event plays first, then pet reacts).

---

## 8. Game Feel Layer

### 8a. Smooth Piece Movement

Pieces do NOT teleport. They interpolate to their destination.

**Implementation:** CSS transitions on the piece's `transform: translate()` property.
- Duration: 300ms
- Easing: `cubic-bezier(0.25, 1, 0.5, 1)` (snappy deceleration, matches ReactionBurst)
- Multi-tile moves: piece slides through each intermediate tile (path animation via chained keyframes or sequential translate updates at 150ms/tile)

### 8b. Attack Impact

When a piece captures an enemy:
1. Attacker lunges forward slightly (reuse `battle-lunge-right/left` pattern, 6px)
2. Impact burst at target position (reuse `battle-impact-burst` animation — scale 0.3→1.4→1.2, 400ms)
3. Board shake (`battle-screen-shake`, 400ms, 4px displacement)
4. Captured piece fades out (`opacity 1→0`, 300ms, with slight shrink `scale 1→0.5`)
5. Floating text: "CAPTURED!" in team color, floating up (reuse `battle-damage-pop` pattern)

### 8c. Hover & Selection Feedback

- **Tile hover:** Subtle brightness increase (`filter: brightness(1.15)`), 150ms transition
- **Valid move highlight:** Pulsing border animation (`2s infinite ease-in-out`, glow alternates 30%→60% opacity). Green for move, red for attack targets
- **Selected piece:** Bright glow ring around piece (8px `box-shadow` in team color), `scale(1.08)` with breathing animation. Valid move tiles animate in with staggered delay (50ms per tile from piece outward)
- **Piece hover (during select phase):** Piece lifts slightly (`translateY(-2px)`), shadow expands

### 8d. Board Shake Wrapper

Reuse the `ScreenShake` pattern from `BattleEffects.tsx`:
```tsx
// Wrap the board in a shake container
<div className={shakeActive ? 'anim-board-shake' : ''}>
  <MomentumBoard ... />
</div>
```

New CSS keyframe `momentum-board-shake` (lighter than battle shake — 3px max displacement, 300ms):
```css
@keyframes momentum-board-shake {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-3px, 1px); }
  30% { transform: translate(2px, -2px); }
  45% { transform: translate(-1px, 2px); }
  60% { transform: translate(3px, 0px); }
  75% { transform: translate(-2px, -1px); }
}
```

---

## 9. Component Architecture

### File Structure

```
src/components/momentum/
├── theme/
│   └── MomentumTheme.ts           — board theme config (tiles, colors, piece styles)
├── board/
│   ├── MomentumBoard.tsx           — 5x5 grid with depth, shadows, backdrop
│   ├── BoardCell.tsx               — themed tile with hover/highlight states
│   └── BoardPiece.tsx              — spirit creature with energy aura, rank badge
├── effects/
│   ├── EnergyAura.tsx              — glow/pulse wrapper for energy visualization
│   ├── FlashSequence.tsx           — multi-phase flash moment cinematic
│   ├── AttackImpact.tsx            — lunge + burst + shake orchestrator
│   ├── PieceMoveAnimator.tsx       — smooth interpolated piece movement
│   ├── FusionAnimation.tsx         — two pieces merge visually
│   └── MomentumAnimations.css      — all momentum-specific keyframe animations
├── ui/
│   ├── MomentumHUD.tsx             — turn counter, piece counts, team indicator
│   ├── MomentumActionBar.tsx       — skip turn, forfeit buttons
│   ├── MomentumLog.tsx             — scrollable action log
│   └── MomentumResultOverlay.tsx   — victory/defeat with rewards + pet reaction
├── PetOverlay.tsx                  — pet companion reacting to game events
└── index.ts                        — barrel export

src/screens/MomentumScreen.tsx      — top-level screen, animation orchestration
```

### Component Tree

```
MomentumScreen
├── BoardBackdrop                   — full-screen themed background
├── PetOverlay                      — pet companion (bottom-left)
├── MomentumHUD                     — turn info (top bar)
├── BoardShakeWrapper               — shake container
│   └── MomentumBoard               — board frame with shadow/depth
│       ├── BoardCell [x25]          — themed terrain tiles
│       │   └── BoardPiece           — spirit creature (if occupied)
│       │       └── EnergyAura       — glow/pulse based on energy
│       └── PieceMoveAnimator        — handles interpolated movement overlay
├── MomentumActionBar               — bottom actions
├── MomentumLog                     — action history
├── AttackImpact                    — impact burst overlay (renders on attack)
├── FlashSequence                   — full cinematic overlay (renders on flash)
│   └── FusionAnimation             — inline when fusion chosen
└── MomentumResultOverlay           — victory/defeat screen
```

### New Files (22 total)

| File | Purpose |
|------|---------|
| `src/types/momentum.ts` | All type definitions including visual event system |
| `src/config/momentumConfig.ts` | Game constants, starting positions, rank config |
| `src/engine/systems/MomentumSystem.ts` | Core game logic (pure functions) |
| `src/engine/systems/MomentumAI.ts` | AI move selection |
| `src/engine/systems/__tests__/MomentumSystem.test.ts` | System unit tests |
| `src/engine/systems/__tests__/MomentumAI.test.ts` | AI unit tests |
| `src/screens/MomentumScreen.tsx` | Screen + animation orchestration |
| `src/components/momentum/theme/MomentumTheme.ts` | Visual theme config |
| `src/components/momentum/board/MomentumBoard.tsx` | Themed 5x5 grid with depth |
| `src/components/momentum/board/BoardCell.tsx` | Terrain tile with states |
| `src/components/momentum/board/BoardPiece.tsx` | Spirit creature with rank badge |
| `src/components/momentum/effects/EnergyAura.tsx` | Glow/pulse energy visualization |
| `src/components/momentum/effects/FlashSequence.tsx` | Multi-phase cinematic |
| `src/components/momentum/effects/AttackImpact.tsx` | Impact + shake orchestrator |
| `src/components/momentum/effects/PieceMoveAnimator.tsx` | Smooth movement |
| `src/components/momentum/effects/FusionAnimation.tsx` | Merge visual |
| `src/components/momentum/effects/MomentumAnimations.css` | All keyframe animations |
| `src/components/momentum/ui/MomentumHUD.tsx` | Top info bar |
| `src/components/momentum/ui/MomentumActionBar.tsx` | Bottom actions |
| `src/components/momentum/ui/MomentumLog.tsx` | Action log |
| `src/components/momentum/ui/MomentumResultOverlay.tsx` | Win/lose + rewards |
| `src/components/momentum/PetOverlay.tsx` | Pet companion wrapper |

### Files to Modify (8 — all additive, low risk)

| File | Change |
|------|--------|
| `src/types/session.ts:1` | Add `'momentum'` to `ScreenName` union |
| `src/types/engine.ts` | Import `MomentumState`, add `momentum` field to `EngineState` |
| `src/types/index.ts` | Add `export * from './momentum'` |
| `src/engine/core/ActionTypes.ts` | Add 8 momentum actions (7 game + 1 animation-done) |
| `src/engine/state/engineReducer.ts` | Import MomentumSystem, add case handlers |
| `src/engine/state/createInitialEngineState.ts` | Add `momentum: { active: false }` |
| `src/services/persistence/saveMigrations.ts` | Add v5→v6 migration |
| `src/App.tsx` | Import MomentumScreen, add routing case + temp dev button |

---

## 10. Action Types

**File:** `src/engine/core/ActionTypes.ts` — add these to the union:

```typescript
// Momentum Board
| { type: 'START_MOMENTUM' }
| { type: 'MOMENTUM_SELECT_PIECE'; pieceId: string }
| { type: 'MOMENTUM_DESELECT_PIECE' }
| { type: 'MOMENTUM_EXECUTE_MOVE'; moveIndex: number }
| { type: 'MOMENTUM_SKIP_TURN' }
| { type: 'MOMENTUM_FLASH_CHOICE'; choice: FlashChoice; fusionTarget?: FusionTarget }
| { type: 'MOMENTUM_ANIMATION_DONE' }
| { type: 'END_MOMENTUM' }
```

`MOMENTUM_ANIMATION_DONE` is dispatched by the UI when animation phases complete (animating_move, animating_attack, animating_flash, animating_ai). The reducer advances to the next logical phase.

---

## 11. MomentumSystem Function Signatures

**File:** `src/engine/systems/MomentumSystem.ts` (NEW)

```typescript
// Board
export function buildBoard(pieces: MomentumPiece[]): BoardGrid;
export function isInBounds(pos: BoardPosition): boolean;
export function getPieceAt(pieces: MomentumPiece[], pos: BoardPosition): MomentumPiece | null;

// BFS Pathfinding
export function computeValidMoves(piece: MomentumPiece, pieces: MomentumPiece[]): ValidMove[];

// Energy
export function grantEnergy(pieces: MomentumPiece[], team: Team): MomentumPiece[];
export function decayRank4(pieces: MomentumPiece[], team: Team): { pieces: MomentumPiece[]; events: MomentumGameEvent[] };

// Game Init
export function initMomentum(): ActiveMomentumState;

// Piece Selection
export function selectPiece(state: ActiveMomentumState, pieceId: string): ActiveMomentumState;
export function deselectPiece(state: ActiveMomentumState): ActiveMomentumState;

// Move Execution (returns state with phase=animating_move)
export function beginMove(state: ActiveMomentumState, moveIndex: number): ActiveMomentumState;

// Called after animating_move completes
export function resolveMove(state: ActiveMomentumState): ActiveMomentumState;

// Called after animating_attack completes
export function resolveCombat(state: ActiveMomentumState): ActiveMomentumState;

// Flash
export function checkFlashTrigger(attacker: MomentumPiece, defender: MomentumPiece, energySpent: number, energyBefore: number): { triggered: boolean; reason: FlashTriggerReason | null };
export function canFuse(pieces: MomentumPiece[], team: Team): boolean;
export function applyFlashChoice(state: ActiveMomentumState, choice: FlashChoice, fusionTarget?: FusionTarget): ActiveMomentumState;

// Turn Management
export function skipTurn(state: ActiveMomentumState): ActiveMomentumState;
export function checkWinCondition(state: ActiveMomentumState): ActiveMomentumState;
export function startNextTurn(state: ActiveMomentumState): ActiveMomentumState;
export function advanceAfterAnimation(state: ActiveMomentumState): ActiveMomentumState;

// Rewards
export function calculateRewards(state: ActiveMomentumState): MomentumRewards;
```

All functions are **pure**. Animation timing is handled in the UI layer, not in the system.

---

## 12. AI Behavior

**File:** `src/engine/systems/MomentumAI.ts` (NEW)

```typescript
export function selectAIAction(state: ActiveMomentumState): { pieceId: string; moveIndex: number } | null;
export function scoreMove(piece: MomentumPiece, move: ValidMove, allPieces: MomentumPiece[]): number;
export function manhattanDistance(a: BoardPosition, b: BoardPosition): number;
```

**Scoring heuristics** (matches BattleAI.ts pattern):
```
base = 50
attack bonus = +100
underdog capture = +30 per rank difference
closing distance = +max(0, 20 - 5 * manhattan to nearest player)
energy near cap = +10 (use-it-or-lose-it pressure)
random variance = ±10
```

AI does NOT trigger flash moments. AI rank promotions from underdog captures still apply.

---

## 13. Edge Cases

| # | Case | Handling |
|---|------|----------|
| 1 | 0 energy after grant | Valid moves empty, must select different piece or skip |
| 2 | All pieces blocked/0 energy | Force skip with "No moves available" message |
| 3 | Flash fusion with <2 rank-2 pieces | Fusion button disabled, upgrade only |
| 4 | Rank 4 expires | Revert to rank 3, energy stays, lastEvent emitted for pet reaction |
| 5 | Turn limit (50) reached | Defeat |
| 6 | Screen='momentum' but active=false | Redirect to home |
| 7 | Both flash triggers fire | One flash, one choice |
| 8 | AI no valid moves | AI skips turn |
| 9 | Animation interrupted (page hidden) | `MOMENTUM_ANIMATION_DONE` dispatched immediately via visibilitychange listener |
| 10 | Player quits mid-game | END_MOMENTUM resets state, no rewards |
| 11 | Missing pet animation | Fallback placeholder box with label |
| 12 | Missing tile/piece sprite | CSS gradient fallback (always available) |

---

## 14. New Types for Visual Systems

**In `src/components/momentum/theme/MomentumTheme.ts`:**

```typescript
// Tile theming
export interface TileTheme {
  baseColor: string;
  borderColor: string;
  shadowInset: string;
  highlightMove: string;    // glow color for valid move
  highlightAttack: string;  // glow color for attack target
  texture?: string;         // future: tile sprite path
}

// Piece theming
export interface PieceTheme {
  bodyGradient: string;
  glowColor: string;
  shadowColor: string;
  sprite?: string;          // future: piece sprite path
}

// Complete board theme
export interface BoardTheme {
  name: string;
  backdrop: string;
  boardBorder: string;
  boardShadow: string;
  boardBg: string;
  gridGap: number;
  tileTypes: Record<string, TileTheme>;
  tileLayout: string[][];   // 5x5 assignment
  playerPiece: PieceTheme;
  enemyPiece: PieceTheme;
  rankBadgeColors: Record<PieceRank, string>;
  pieceScales: Record<PieceRank, number>;  // px sizes per rank
}

// Flash sequence timing
export interface FlashSequenceTiming {
  freezeMs: number;         // 200
  zoomMs: number;           // 300
  burstMs: number;          // 400
  titleMs: number;          // 600
  resolveMs: number;        // 500
}

// Animation durations
export interface MomentumAnimationConfig {
  pieceMoveMsPerTile: number;   // 150
  attackImpactMs: number;       // 400
  boardShakeMs: number;         // 300
  capturedFadeMs: number;       // 300
  flashSequence: FlashSequenceTiming;
  fusionMergeMs: number;        // 600
  aiTurnDelayMs: number;        // 500 (pause before AI moves)
}
```

---

## 15. Overlap Risk with Stage 2

| Area | Risk | Reason |
|------|------|--------|
| GameSceneShell.tsx | **ZERO** | Not touched |
| SceneStage/LayerRenderer | **ZERO** | Not touched |
| sceneConfig/zBands | **ZERO** | Momentum has own visual system |
| PetSprite.tsx | **ZERO** | Used via import only, wrapped in PetOverlay |
| App.tsx | **LOW** | One if-block + temp dev button |
| EngineState / ActionTypes | **LOW** | Additive fields/actions |
| engineReducer.ts | **LOW** | New case block, no overlap with battle logic |
| animations.css | **LOW** | New keyframes added (prefixed `momentum-*`), no modifications |

---

## 16. Phased Implementation Roadmap

### Phase 1: Foundation (Types + Config + Theme)
**Estimated tasks: 3**
- `src/types/momentum.ts` — all game + visual event types
- `src/config/momentumConfig.ts` — rank config, starting positions, animation timing
- `src/components/momentum/theme/MomentumTheme.ts` — board theme, piece themes, timing config
- Modify: `src/types/session.ts`, `src/types/engine.ts`, `src/types/index.ts`

### Phase 2: Core Logic + Tests (TDD)
**Estimated tasks: 6**
- `src/engine/systems/MomentumSystem.ts` — board helpers, BFS, energy, combat, flash, turns
- `src/engine/systems/MomentumAI.ts` — scoring + selection
- `src/engine/systems/__tests__/MomentumSystem.test.ts`
- `src/engine/systems/__tests__/MomentumAI.test.ts`

### Phase 3: Engine Integration
**Estimated tasks: 3**
- Modify: ActionTypes.ts, createInitialEngineState.ts, engineReducer.ts, saveMigrations.ts

### Phase 4: Board UI (visual core)
**Estimated tasks: 5**
- `MomentumTheme.ts` defaults (Twilight Arena)
- `BoardCell.tsx` — themed tiles with hover/highlight
- `BoardPiece.tsx` — spirit creatures with rank badges
- `EnergyAura.tsx` — glow/pulse system
- `MomentumBoard.tsx` — grid assembly with depth/shadows

### Phase 5: Effects + Animation
**Estimated tasks: 5**
- `MomentumAnimations.css` — all keyframes (shake, glow, pulse, flash, fusion)
- `PieceMoveAnimator.tsx` — smooth interpolated movement
- `AttackImpact.tsx` — lunge + burst + shake + capture fade
- `FlashSequence.tsx` — full cinematic (freeze → zoom → burst → text → choice → resolve)
- `FusionAnimation.tsx` — merge visual

### Phase 6: UI Chrome + Pet
**Estimated tasks: 5**
- `MomentumHUD.tsx` — turn counter, piece counts
- `MomentumActionBar.tsx` — skip, forfeit
- `MomentumLog.tsx` — action history
- `PetOverlay.tsx` — pet companion with event reactions
- `MomentumResultOverlay.tsx` — victory/defeat with pet animation + rewards

### Phase 7: Screen + Routing
**Estimated tasks: 2**
- `MomentumScreen.tsx` — orchestrates all components + animation phase management
- Modify: `App.tsx` (routing + temp dev button)

### Phase 8: Polish + E2E
**Estimated tasks: 2**
- Staggered tile highlight animations, tile hover details, log scroll behavior
- `e2e/momentum-board.spec.ts`

### Future (After Stage 2 Completes)
- Add Momentum entry to BottomActionBar + roomConfig
- Thread through GameSceneShell
- Pet-based reward modifiers (mood/bond bonuses)
- Additional board themes (unlockable)
- Sound integration when sound system is wired

---

## Verification Plan

1. **Unit tests:** `npx vitest run src/engine/systems/__tests__/MomentumSystem.test.ts src/engine/systems/__tests__/MomentumAI.test.ts`
2. **Type check:** `npx tsc --noEmit`
3. **Dev server:** `npm run dev` → launch via dev button → play full game
4. **Visual checks:**
   - Board tiles render with terrain theme (not plain)
   - Pieces are spirit creatures with rank badges (not circles)
   - Energy shows as glow intensity (not dots)
   - Piece movement is smooth (not teleporting)
   - Attack shows impact burst + board shake
   - Flash moment plays full cinematic sequence
   - Pet reacts to events
   - Victory/defeat overlay shows pet animation
5. **Gameplay checks:**
   - Energy grants correctly per rank
   - BFS pathfinding respects blockers
   - Combat resolves correctly (attacker wins, rank promotion)
   - Flash triggers on exact energy and underdog
   - Fusion merges two rank-2 pieces correctly
   - AI makes reasonable moves
   - Win/loss conditions trigger correctly
6. **Edge cases:** 0-energy skip, fusion disabled with <2 rank-2, turn limit, missing animation fallback
