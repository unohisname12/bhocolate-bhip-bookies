# Animation "Alive" System — Audit + Implementation Plan

Date: 2026-04-19
Scope: Make pet sprites feel alive, weighted, emotional, and reactive — with minimal new art, maximum reuse, no 3D, preserve existing architecture.

---

## 1. Current Inventory

### Playable characters
- **Blue Koala** (`blue-koala`) — 19 sprite files (base grid + mood overrides + care + hatching + dancing + cleaning + 6 combat sheets + portrait).
- **Subtrak** (`subtrak`) — 16 sprite files (separate idle, idle_variant, walk, hungry, sad, 6 care sheets, 5 combat sheets + portrait; no mood override sheets; no `defend` combat sheet).
- Legacy `koala_sprite` 5×4 grid still in use for `slime_baby`, `mech_bot`, and the unknown-species fallback.

### Pipeline
- `ASSETS.pets[speciesId]` — base config.
- `ASSETS.pets[speciesId + "__" + animationName]` — mood override sheet (Blue Koala: idle, hungry, happy; Subtrak: has per-mood sheets registered via naming convention not `__idle` overrides).
- `ASSETS.combatAnims[speciesId][action]` — battle one-shots.
- `ASSETS.petPortraits[speciesId]` — static portrait (battle fallback).

### Animation engine
- `AnimationController` (frame sequencer): validate-on-init; `setAnimation` is a **hard swap** that resets frame to `startFrame`; no crossfade; no one-shot support; `tick()` loops within range.
- `SpriteRenderer.computeSpriteStyle` — ground-offset-aware background-position math; integer pixels enforced; no transforms applied to the sprite div (rule).
- `PetSprite.tsx` — initializes controller in effect, runs RAF loop, resolves asset via (override → base → hardcoded `koala_sprite`) cascade, shows black fallback box when sprite sheet or specific animation missing.
- `PetIntentSystem.getPetIntent` — pure function deriving intent from `pet.needs` with priority order (dead > sick > sleep > hunger > dirty > happy > idle).
- `usePetReaction` — care-phase state machine: `idle → anticipation → reacting → afterglow(1500ms) → idle`.
- `useIdleWander` — X-position drift via cubic easing, 3–8 s pauses.
- `GameSceneShell` — orchestrator; picks `displayAnimName` from reaction or intent.

### Existing procedural motion
- CSS `sprite-idle-breath` 2.5 s infinite — 1.5 % scaleY.
- CSS `sprite-happy-glow` 2 s — 4 % scale + brightness.
- CSS `sprite-sleep-float` 4 s — opacity + scale.
- CSS `sprite-hungry-shake` 0.9 s — ±3 px translateX + ±2° rotate.
- CSS `battle-knockback-*` / `battle-lunge-*` — battle-only one-shot transforms.
- No springs, no damping, no one-shot pulses on care/hurt events, no idle variation, no tilt, no anticipation bounce, no landing bounce.

---

## 2. Gap Analysis — Ranked by Impact

### Tier 1 — must-have for "alive" feel

| # | State / behavior | Why it matters | Art needed? |
|---|---|---|---|
| 1.1 | **Squash-on-contact pulse** when care interaction starts (`reaction.phase → 'reacting'`) | The pet currently hard-swaps sprite when you touch it — reads as mechanical. A quick 120 ms squash-stretch = weight + life. | No (code) |
| 1.2 | **Hurt recoil pulse** on HP damage in battle | Current battle knockback is translate-only; adding a squash on the same frame reads as impact. | No (code) |
| 1.3 | **Anticipation bounce** when hand hovers pet (`reaction.phase → 'anticipation'`) | Right now anticipation is invisible. A tiny 2 px upward bump + brightness signals "pet notices you". | No (code) |
| 1.4 | **Idle variation** — cycle into an alternate idle loop every 8–20 s | Static idle is the #1 reason a pet feels "fake". Subtrak already has `idle_variant` sheet; Blue Koala can reuse `dancing` as a rare variant. | No (reuse existing) |
| 1.5 | **Safe missing-animation fallback in release** — quiet console.warn (dedup), degrade to idle | Currently spams console every render; prod already tolerates it but dev feedback is noisy. | No (code) |
| 1.6 | **Motion tilt during movement** — ±3° rotate tied to wander velocity | Currently the pet slides like a cardboard cutout; a tiny lean direction-of-motion makes it feel to be pushing through the world. | No (code) |

### Tier 2 — strong polish

| # | State / behavior | Why it matters | Art needed? |
|---|---|---|---|
| 2.1 | **Afterglow wind-down**: gentle overshoot + slow scale settle at reaction end | Currently reaction ends with just a 1.5 s timer — no visual cadence. | No (code) |
| 2.2 | **Happy-state upgrade**: on full happiness, swap happy anim → `dancing` sheet (already 36 frames, unused) | Immediate payoff, pure reuse. | No (reuse existing) |
| 2.3 | **Wander start/stop bob** — subtle vertical bounce when wander begins/ends, not just mid-walk | Soft "stepping off" / "settling" feel. | No (code) |
| 2.4 | **Blink overlay** — 80 ms scaleY-collapse every 3–6 s on top of idle | Classic game-feel trick; cheap and huge. | No (code) |
| 2.5 | **Eating/feeding animation** — currently aliased to `happy` | Placeholder feels lazy on food interactions. | Yes — 16-frame `eating` sheet per species |

### Tier 3 — luxury

| # | State / behavior | Why | Art needed? |
|---|---|---|---|
| 3.1 | Dedicated `dirty` sprite per species (currently reuses `sick`) | Small correctness win | Yes |
| 3.2 | Dedicated `dead` sprite (currently frozen frame + CSS grayscale) | Tonally helpful | Yes |
| 3.3 | Subtrak `defend` combat sheet (currently missing) | Battle fairness | Yes |
| 3.4 | Particle/dust on pet step during wander | Atmosphere | No (code) |
| 3.5 | Head-tilt on "thinking" state | Personality | Yes |

### States that should be merged / reused (no new art)
- `dirty` → reuse `sick` frames with color filter (already done).
- `happy` peak → reuse existing `dancing` sheet (not currently wired).
- Idle variation → reuse `idle_variant` (Subtrak) / `dancing` rare cut-in (Blue Koala).
- `eating` placeholder → keep aliasing `happy` until tier-2 sheet lands.

### Technical problems in the current animation system
1. `AnimationController.setAnimation` is a **hard cut** — every swap resets to `startFrame`. No way to express "play this care anim once, then return to idle".
2. `SpriteFallback.useEffect` logs **every frame** the fallback renders (React re-renders on parent state). Needs one-shot dedup.
3. `usePetReaction` exposes only a phase enum — no event edge (`onReactStart`). Fake-physics layer needs an edge to trigger a pulse.
4. `PetSprite` directly applies the CSS `anim-sprite-*` class on the outermost wrapper, which is also the same element that owns `transformOrigin`. Layering a JS motion layer on top requires a nested target element.
5. `PetIntentSystem` maps many intents to `idle` (attack, defend, heal, hurt, clean) — fine in home scene but creates dead mapping rows.
6. `ANIMATION_CONFIG.petStates` contains hard-coded class strings with Tailwind utilities embedded (`sick: 'anim-wobble filter grayscale opacity-80'`) — fragile if Tailwind purges.
7. No animation priority stack: if two things want to animate the pet at once (e.g., care reaction + hunger shake), CSS class on wrapper wins and JS has no say.
8. `useIdleWander` never pauses mid-step; target pick blocks are instant. No soft start/stop velocity → "cardboard slide" feel.

### Bottlenecks preventing "alive" feel
- **Bottleneck A**: All motion is event-free. Care, reaction, hurt don't pulse any physics response — they just swap frames.
- **Bottleneck B**: Idle is one 16-frame loop played forever. Zero variation.
- **Bottleneck C**: Wander motion lacks tilt / body language → glides.
- **Bottleneck D**: Animation transitions are cuts, not blends. Even a 40 ms scale cross-fade would hide most of it.

Addressing A–D with pure code (no new art) is the highest-impact move and matches the project's "game feel over classroom" and "never delete assets" preferences.

---

## 3. Minimum Viable "Alive" Set (target)

The current code already covers: idle, sleep, hungry, happy, sick, dead, 6 care sprites per species, 6 combat sheets for Blue Koala / 5 for Subtrak. **We are not missing core states** — what is missing is the motion layer on top, plus a few reuses:

| Category | State | Source | Action |
|---|---|---|---|
| Core | idle | mood override sheet | ✅ exists — add JS bob + blink on top |
| Core | move / wander | `adult-walk` Blue Koala / `walk` Subtrak | ✅ wire walk anim during wander; add tilt |
| Core | idle variation | `idle_variant` Subtrak / `dancing` Blue Koala | ⚠ wire into intent system |
| Core | hurt pulse | — | ➕ code-only (squash + flash) |
| Core | land / settle | — | ➕ code-only (scale bounce) |
| Life | happy peak | `dancing` Blue Koala | ⚠ wire as "elated" state |
| Life | hungry | mood override sheet | ✅ exists |
| Life | tired / sleep | mood override sheet | ✅ exists |
| Life | curious | `anticipation` phase | ➕ code-only pulse |
| Interaction | petting/washing/brushing/comforting/training/playing | care sprites | ✅ exists — add squash-on-start + afterglow settle |
| Transition | start move / stop move | — | ➕ code-only (bob) |
| Transition | blink | — | ➕ code-only |
| Transition | anticipation before care | — | ➕ code-only |
| Transition | recovery after care | — | ➕ code-only (afterglow settle) |

Payoff per item listed in §4 & §7.

---

## 4. Fake 2D Physics / Reaction Layer

### Design

**Hook:** `usePetMotion(ref, opts)` — drives imperative `transform` + `filter` on a DOM node via RAF (no React state churn). All tuning constants in `src/config/petMotion.ts`.

**Composable channels per frame:**
1. **Idle bob** — `translateY(sin(t * ω) * amp)`; amp 1–2 px depending on intent.
2. **Blink** — periodic scaleY dip (0.92) for 80 ms every 3–6 s (idle/happy only).
3. **Movement tilt** — rotate proportional to recent dx/dt, clamped ±3°.
4. **Pulse** (event-driven squash/stretch): target `(sx, sy)` with underdamped spring return to `(1, 1)`. Kinds: `react`, `hurt`, `land`, `jump`, `anticipate`.
5. **Flash filter** on `hurt` pulse — brightness 1.4 → 1 over 120 ms.

All channels compose into a single `transform` string: `translateY(bobY) scale(sx, sy) rotate(tilt)`. `transform-origin: bottom center` keeps feet planted.

**Pixel-art-safe tuning (default):**
- Idle bob: 1.2 px, period 2.2 s.
- Happy bob: 1.8 px, period 1.2 s.
- Hungry: no bob (CSS shake already covers it).
- Sleep: 0.6 px, period 4 s.
- Tilt max: 3°.
- Pulse: stiffness 180, damping 18 → ~350 ms settle.
- React squash: `sy = 0.88, sx = 1.08`.
- Hurt squash: `sy = 0.82, sx = 1.12` + flash.
- Land squash: `sy = 0.78, sx = 1.15`.
- Blink: period rand(3 s, 6 s), duration 80 ms.

### Why this design
- **Zero React re-renders** — transforms written to `style` via ref. No stutter at 60 fps.
- **Composes with existing CSS classes** — the JS motion layer is on an INNER element. The outer wrapper still runs `.anim-sprite-idle` breath — translateY + rotate on an inner child does not conflict visually with scale on the parent.
- **Event-driven but decoupled** — `usePetMotion` takes phase/intent props; GameSceneShell doesn't need to wire a hundred `onReact` callbacks.
- **Pixel-style preserved** — amplitudes are single-digit pixels; no 20 px bouncy-tween modern mobile feel.
- **Tunable in one file** — `petMotion.ts` constants, no magic numbers scattered.

---

## 5. State Machine Improvements

Keep the current intent system (it's fine) but add:

1. **Controller `playOnce(name, onDone)`** — for care finishes and battle actions, to avoid hard cut back to idle. Returns a promise/callback when the full frame range has played once.
2. **Fallback logging dedup** — `PetSprite` fallback warn fires once per species+animation pair, not per render.
3. **Idle variation** — small hook `useIdleVariant` that every 8–20 s rolls a probability and swaps the `displayAnimName` between idle and a species-specific variant for one play-through. Reuses existing `idle_variant` / `dancing`.
4. **Happy peak upgrade** — when `happiness >= 90` **and** no urgent needs, intent becomes `happy_peak` → animation `dancing` (Blue Koala). Fallback: plain `happy`.

Conflict rules:
- Battle takes over (BattlePetSprite renders separate); home-scene motion layer idles out.
- Reaction overrides intent anim (already true).
- Hurt pulse triggers even if a care interaction is active (interrupts gracefully, does not swap animation).
- Motion layer never changes animation NAME; it only adds transforms. Animation selection stays in intent + reaction.

---

## 6. Missing-Animation Fallback (dev vs prod)

Current behavior: red-dashed black box with "MISSING ANIMATION" text, plus `console.warn` on every render.

New behavior:
- **Dev mode** (`import.meta.env.DEV`): keep the black box.
- **Prod mode**: silently render the species's `idle` animation from the base sheet instead of a black box — graceful degrade.
- **Warn dedup**: maintain a module-level `Set<string>` of already-warned `species:animation` keys. Warn once per key, ever.
- Never crash.

---

## 7. High-Value New Sprites

See [HIGH-VALUE NEW SPRITES](#high-value-new-sprites) section below. **Zero Tier-1 sprites required.** All Tier-1 gains are pure code.

Two Tier-2 sprites are recommended (not required) if the user wants to deepen:
- `blue_koala_eating` — replaces the `happy` alias on feeding.
- `subtrak_defend` — fills the one known combat gap.

Nothing else has enough quality-per-effort to justify new art before shipping the code layer.

---

## 8. Implementation Plan

### Step A — Config
- Add `src/config/petMotion.ts` exporting motion constants (spring/damping/amplitudes/periods/blink config).

### Step B — Controller upgrade
- Add `setAnimation(name, { oneShot?: boolean, onComplete?: () => void })` to `AnimationController`.
- Controller calls `onComplete` when frame advances past `endFrame` if `oneShot` was set. Hold on `endFrame` until externally changed.

### Step C — Motion layer
- Add `src/hooks/usePetMotion.ts`. Imperative RAF-driven transform on a ref.
- Exports `{ trigger(kind) }` for event pulses.
- Auto-pulses on reaction phase transitions and hurt events; no extra wiring needed for the common cases.

### Step D — PetSprite integration
- Wrap the sprite render div in a new inner "motion target" div.
- Pass its ref to `usePetMotion`.
- Keep the existing CSS class on the outer wrapper (breathing still works; translateY/rotate add on top cleanly).
- Accept `reactionPhase` prop so the hook can pulse on phase edges.

### Step E — Idle variant + happy peak
- Add `useIdleVariant(intent, speciesId)` hook: returns possibly-substituted animation name.
- Extend `PetIntentSystem` with `happy_peak` intent (happiness ≥ 90) mapping to `dancing` for Blue Koala and falling back to `happy` for others.

### Step F — Fallback hardening
- Change `SpriteFallback` to: render idle-as-fallback in prod; keep black box in dev; dedup warns.

### Step G — Verify
- `npm run typecheck`, `npm test` (vitest). No visual regression expected on non-pet screens.
- Manual: load app, watch pet idle → see blink + bob; hover pet → see anticipation bob; click a care tool and tap pet → see squash-on-contact + sprite swap + afterglow settle.

---

## HIGH-VALUE NEW SPRITES

### Only two, and both are Tier 2 (optional). Code changes unlock all Tier-1 gains without new art.

#### S1 — `blue_koala_eating`
- **State name**: `eating`
- **What it improves**: Feeding currently aliases `happy`, which reads wrong (pet doesn't chew, just beams). A chew anim is the most visible single missing animation during daily play.
- **Why existing sheets aren't enough**: No frames show mouth-open + food-held in existing Blue Koala sheets.
- **Frame count**: 16 frames (match other care sheets)
- **Format**: 16×1 horizontal sprite sheet, 128 × 128 per frame, transparent background
- **File path**: `public/assets/pets/blue-koala/mood/eating-sheet.png`
- **Asset key**: `koala_sprite__eating` (follows existing override pattern)
- **PixelLab prompt**:
  ```
  Create a pixel art sprite sheet, 16 columns 1 row grid, 128x128 pixel frames,
  cute blue koala pet character. Sequence: koala picks up food with both paws,
  brings it to mouth, opens mouth wide, chews with visibly puffed cheeks across
  4 frames (cheek bulge alternating sides), swallows visibly, then happy satisfied
  smile with tiny paw at mouth. 16-bit RPG style, clean pixel edges, transparent
  background, character centered, feet on bottom row of frame, consistent silhouette
  with existing blue-koala idle-sheet.png character design.
  ```

#### S2 — `subtrak_defend`
- **State name**: `defend` (combat sheet)
- **What it improves**: Subtrak currently has no defend sheet; combat system falls back to portrait on defend action, which looks like a bug.
- **Why existing sheets aren't enough**: No defensive pose anywhere in Subtrak's sheets.
- **Frame count**: 16 frames (match Blue Koala's `defend-sheet.png`)
- **Format**: 16×1 horizontal sprite sheet, 128 × 128 per frame, transparent background
- **File path**: `public/assets/pets/subtrak/fighting/defend-sheet.png`
- **Asset key**: add to `ASSETS.combatAnims.subtrak.defend`
- **PixelLab prompt**:
  ```
  Create a pixel art sprite sheet, 16 columns 1 row grid, 128x128 pixel frames,
  Subtrak pet character (referred to as 'subtrak'). Sequence: pet braces into
  defensive stance — lowers body slightly, raises both arms crossed in front,
  slight glow shield FX shimmers around raised arms for 4 frames, then returns
  to relaxed stance. 16-bit RPG style, clean pixel edges, transparent background,
  character centered, feet planted on bottom row of frame, character design MUST
  match existing public/assets/pets/subtrak/idle/sheet.png reference.
  ```

### Not recommended right now
- `dirty`, `dead`, `thinking`, per-species idle variants — all Tier-3 luxury, not worth the art spend until motion layer is live and evaluated.

---

## Summary of intended changes

| File | Change | Type |
|---|---|---|
| `src/config/petMotion.ts` | New — motion tuning constants | ADD |
| `src/hooks/usePetMotion.ts` | New — RAF-driven motion layer | ADD |
| `src/hooks/useIdleVariant.ts` | New — small idle variation roller | ADD |
| `src/engine/animation/AnimationController.ts` | `setAnimation` accepts options (oneShot/onComplete) | MODIFY |
| `src/engine/animation/types.ts` | Add `happy_peak` to `AnimationName` | MODIFY |
| `src/engine/systems/PetIntentSystem.ts` | `happy_peak` intent + mapping | MODIFY |
| `src/components/pet/PetSprite.tsx` | Inner motion-target div; fallback dedup + prod idle-degrade; wire `usePetMotion` | MODIFY |
| `src/components/scene/GameSceneShell.tsx` | Pass `reactionPhase` + `moving` hints to PetSprite; swap in idle variant | MODIFY |
| `src/animations.css` | (no new keyframes required; the JS motion layer supersedes CSS where it needs to) | No edits |

Zero deletions. Zero asset removals. Zero breaking changes to combat or care reducers.
