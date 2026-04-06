Good — you’re thinking the right way now.

Your current version is **solid**, but you’re right: if you want AI to stop messing up, it needs to be **more strict, more explicit, and more redundant** (AI needs redundancy).

Below is your **expanded, more detailed, “AI-proof” version** — this is longer, stricter, and removes ambiguity so the AI can’t “interpret” things wrong.

---

# 🎮 SPRITE SYSTEM RULES (DO NOT BREAK)

This project uses a **strict sprite-sheet rendering system** based on:

* `background-image`
* `background-position`
* `background-size`

Animation is **fully config-driven** from:

* `src/config/assetManifest.ts`

Rendered via:

* `src/engine/animation/AnimationController.ts`
* `src/engine/animation/SpriteRenderer.ts`

---

# 🚨 GLOBAL PRINCIPLE (READ FIRST)

This system is **NOT flexible**.

* Do NOT guess
* Do NOT infer
* Do NOT auto-detect
* Do NOT “helpfully fix” missing data
* Do NOT assume sprite layout

If something is unclear → **STOP and use config only**

---

# 🚨 CRITICAL RULES

---

## -1. OFFICIAL STAGING FOLDER: `/game ready/`

This folder is the **ONLY intake point** for new sprite assets.

AI MUST:

* ALWAYS check `/game ready/` before assuming assets are missing
* NEVER ignore files inside `/game ready/`

### AI RESPONSIBILITIES:

For EACH file in `/game ready/`:

1. Inspect the sprite visually (frame count, layout, animation type)
2. Identify its purpose:

   * walking
   * hatching
   * idle
   * cleaning
   * dancing
   * etc.
3. Move it into correct structure:

```text
assets/
   pets/
      blue-koala/
         adult-walk/
         hatching/
         dancing/
         cleaning/
```

4. Rename file using consistent naming rules
5. UPDATE ALL SYSTEMS:

   * `assetManifest.ts`
   * animation ranges
   * frame counts
   * test mode limits
   * any registry or mapping
6. VERIFY it renders correctly in test mode

❗ Moving the file WITHOUT wiring it into config = FAILURE

---

## 0. NO AUTO-DETECTION (HARD RULE)

AI is STRICTLY FORBIDDEN from guessing ANY sprite data.

### DO NOT:

* infer cols or rows
* detect frame size from image
* calculate via GCD
* scan for empty pixels
* assume square frames
* assume equal spacing
* assume single row
* assume animation order

### REQUIRED CONFIG PER SPRITE:

```ts
cols
rows
frames
frameWidth
frameHeight
animations
```

Each animation must define:

```ts
startFrame
endFrame
loop
(optional) fps
```

### FAILURE HANDLING:

If config is invalid:

* LOG a hard error (dev mode)
* DO NOT guess values
* ONLY fallback to `idle` IF:

  * idle exists
  * idle range is valid

If idle is invalid → render frame `0` ONLY

---

## 1. FRAME INDEXING RULE (VERY IMPORTANT)

* ALL frames are **0-based**
* `startFrame` = inclusive
* `endFrame` = inclusive

Valid frame range:

```ts
0 → frames - 1
```

### STRICT RULES:

* NEVER access frame < 0
* NEVER access frame ≥ frames
* NEVER loop outside animation range

Correct loop:

```ts
if (frame > endFrame) frame = startFrame
```

---

## 2. SHEET LAYOUT RULE (NO GUESSING)

Default layout MUST be:

* LEFT → RIGHT first
* THEN TOP → BOTTOM

Frame math MUST be:

```ts
col = frameIndex % cols
row = Math.floor(frameIndex / cols)
```

### DO NOT:

* reverse rows
* assume vertical strip
* assume zig-zag layout

If layout differs → it MUST be defined in config

---

## 3. ONE FRAME ONLY (VISUAL HARD RULE)

At any time:

👉 ONLY ONE FRAME may be visible

### REQUIRED:

```css
overflow: hidden;
```

### FAILURE SYMPTOMS:

* two frames visible
* bleeding edges
* partial frame overlap

If seen → rendering math is wrong

---

## 4. PIXEL-PERFECT SCALING RULE (MOST IMPORTANT)

Scaling MUST be mathematically consistent.

If scale is used, it MUST apply to:

* container width
* container height
* backgroundPosition
* backgroundSize

### CORRECT IMPLEMENTATION:

```ts
width: frameWidth * scale
height: frameHeight * scale

backgroundPosition: `${-col * frameWidth * scale}px ${-row * frameHeight * scale}px`

backgroundSize: `${cols * frameWidth * scale}px ${rows * frameHeight * scale}px`
```

### NEVER:

* scale container but not background
* scale background but not container
* mix scaled and unscaled values

---

## 5. INTEGER PIXEL RULE (ANTI-BREAK RULE)

ALL rendering values MUST be integers.

### DO NOT ALLOW:

* fractional pixels
* decimals in backgroundPosition
* decimals in width/height
* decimals in backgroundSize

### WHY:

Prevents:

* jitter
* blur
* frame bleeding
* subpixel shifting

---

## 6. PIXEL ART RENDERING RULE

Sprites MUST remain crisp.

### REQUIRED:

```css
image-rendering: pixelated;
image-rendering: crisp-edges;
```

### FORBIDDEN:

* smoothing
* anti-aliasing
* blur filters

---

## 7. GRID IS STRICT (NO MISMATCH EVER)

Rules:

* `cols * rows` = total grid capacity
* `frames` = actual usable frames
* animations MUST stay within `frames`

### NEVER ALLOW:

* config says 20 frames but sheet has 16
* wrong column count
* wrong row count

### THIS BREAKS EVERYTHING:

Even ONE mismatch causes:

* wrong cropping
* broken animation
* frame shifting

---

## 8. ANIMATION RANGE RULES

Example:

```ts
idle: { startFrame: 0, endFrame: 4, loop: true }
walk: { startFrame: 5, endFrame: 20, loop: true }
```

### RULES:

* ranges must stay inside frame count
* ranges must not overflow
* ranges must not access empty cells
* looping must stay within range

---

## 9. NO `<img>` FOR SPRITES (HARD RULE)

Sprites MUST use:

* `background-image`
* `background-position`

### DO NOT:

* render sprite sheets with `<img>`
* attempt frame switching via `<img src>`

---

## 10. NO TRANSFORMS ON SPRITE DIV

Do NOT apply:

* transform
* scale
* rotate
* transition-all
* hover effects

### WHY:

Transforms break pixel alignment and cause:

* blur
* jitter
* misalignment

### RULE:

Apply effects ONLY on wrapper div

---

## 11. TEST MODE (NON-OPTIONAL)

A working sprite system MUST include test mode.

### REQUIRED FEATURES:

* display current frame index
* step frame manually (0 → frames - 1)
* preview each animation range
* show config values
* use SAME renderer as runtime

### RULE:

Test mode MUST match runtime EXACTLY

---

## 12. NEW ASSET INTEGRATION (MANDATORY PROCESS)

When new sprite is added:

AI MUST:

1. Move from `/game ready/`
2. Place in correct folder
3. Rename properly
4. Update:

   * `assetManifest.ts`
   * animation ranges
   * frame counts
   * test mode limits
5. Verify in test mode
6. Verify in actual game

❗ If ANY step is skipped → system is considered broken

---

# 🧪 REQUIRED VALIDATION CHECKLIST

Before marking ANY sprite as working:

* only ONE frame visible
* no flicker
* no blank frames
* no frame bleeding
* no blur
* frame 0 correct
* last frame correct
* loop is smooth
* test mode = runtime behavior EXACTLY

---

# ❌ COMMON FAILURE CASES

If animation breaks, check:

* missing scale in backgroundPosition
* missing scale in backgroundSize
* wrong frameWidth / frameHeight
* wrong cols / rows
* frame count mismatch
* incorrect frame math
* invalid animation range
* transforms applied
* fractional math used
* smoothing enabled

---

# ✅ GOLD STANDARD

System is correct ONLY if:

* exactly one frame visible
* animation smooth
* no jitter
* no blur
* no bleeding
* frame stepping is exact
* test mode matches runtime perfectly

---13. FULL FRAME COVERAGE RULE

If a sprite sheet is intended to use 16 frames, the animation must actually play all 16 intended frames unless config explicitly says otherwise.

Examples:
- A 16-frame walk animation must not stop at frame 12 if frames 13-15 are part of the walk.
- A hatching animation must not skip late hatch frames if those frames exist in the sheet.
- A cleaning animation is NOT considered complete if only part of the sheet is used.

If unused frames exist, AI must verify whether:
- they are intentional extra frames
- or the animation config is incomplete

AI must not assume partial playback is correct.

14. PER-ANIMATION VALIDATION RULE

Each named animation must be tested individually.

For every animation:
- verify first frame
- verify last frame
- verify full range is reachable
- verify no frames inside the intended range are skipped
- verify loop behavior is correct
- verify runtime matches test mode

An animation is NOT considered fixed just because some movement appears on screen.

15. PARTIAL SUCCESS IS FAILURE

The sprite system is considered broken if ANY of the following are true:
- an animation uses only some of its intended frames
- a named animation plays the wrong frame range
- one animation works but others are still broken
- test mode and runtime do not match

Do not mark sprite work complete until ALL required animations are correct.

16. REQUIRED ANIMATION MAPPING

For each sprite sheet, AI must explicitly document:

- animation name
- startFrame
- endFrame
- total frames used
- whether looped or one-shot

Example:
- walking: startFrame 0, endFrame 15, total 16, loop true
- hatching: startFrame 0, endFrame 15, total 16, loop false
- cleaning: startFrame 0, endFrame 5, total 6, loop true

If actual playback does not match this mapping, the implementation is wrong.