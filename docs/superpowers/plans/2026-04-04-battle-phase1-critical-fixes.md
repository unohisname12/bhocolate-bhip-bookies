# Phase 1: Battle Critical Fixes + Minimum Viable Layout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make battle combat functional — attacks deal real damage, fights resolve in 5-8 turns, screen is readable with larger sprites and wider action bar.

**Architecture:** Four changes: (1) replace subtractive damage formula with multiplicative, (2) normalize HP to 150-300 range for both sides with level-based stat scaling, (3) simplify energy by removing on-hit gain, (4) widen action bar and increase sprite size. All changes are in existing files — no new components.

**Tech Stack:** React 19, TypeScript, Playwright (verification)

---

## File Map

| File | Action | What Changes |
|------|--------|-------------|
| `src/engine/systems/BattleSystem.ts` | Modify | `calcDamage` formula, `petToBattlePet` level-scaled stats, `generateEnemyPet` stat generation, heal cap adjustment |
| `src/config/battleConfig.ts` | Modify | `baseHPMultiplier` 10→2.5, `energyOnHitTaken` 4→0 |
| `src/components/battle/BattleEffects.tsx` | Modify | Sprite display size 96→144, impact burst 72→96 |
| `src/screens/BattleScreen.tsx` | Modify | Action bar `max-w-2xl`→`max-w-5xl`, shadow sizes |
| `e2e/battle-system-fixes.spec.ts` | Modify | Update heal value assertion range for new HP scale |

---

### Task 1: Rewrite damage formula from subtractive to multiplicative

**Files:**
- Modify: `src/engine/systems/BattleSystem.ts:178-218`

The current formula `(ATK * power/100) - (DEF * 0.6)` always returns 1. Replace with multiplicative: `ATK * power/40 * (100 / (100 + DEF))`. Defense buff now reduces incoming damage by 40% instead of increasing DEF subtraction.

- [ ] **Step 1: Replace calcDamage function**

In `src/engine/systems/BattleSystem.ts`, replace lines 178-218 (the comment + entire `calcDamage` function) with:

```typescript
// --- DAMAGE FORMULA ---

const calcDamage = (
  attacker: BattlePet,
  defender: BattlePet,
  move: BattleMove,
  mathBuff: boolean,
  traceBuffs?: TraceBuffState,
  combo?: ComboState,
): { damage: number; isCrit: boolean } => {
  if (Math.random() * 100 > move.accuracy) return { damage: 0, isCrit: false };

  // Multiplicative formula: ATK * power/40 * (100 / (100 + DEF))
  // - Never produces 0 (no subtractive cliff)
  // - DEF reduces damage asymptotically (100 DEF = 50% reduction, 200 DEF = 33%)
  const atk = attacker.strength;
  const def = defender.defense;
  const raw = (atk * move.power / 40) * (100 / (100 + def));

  // Defense buff reduces incoming damage by 40%
  const hasDefBuff = defender.buffs.some(b => b.stat === 'defense');
  const defReduction = hasDefBuff ? 0.6 : 1.0;
  const base = Math.max(1, raw * defReduction);

  // Variance: ±10%
  const variance = 0.9 + Math.random() * 0.2;
  let total = base * variance;

  // Crit check
  const isCrit = Math.random() < BATTLE_CONSTANTS.critChance;
  if (isCrit) total *= BATTLE_CONSTANTS.critMultiplier;

  // Combo multiplier
  if (combo && combo.count > 0) {
    total *= combo.multiplier;
  }

  // Trace/math buff multiplier (existing logic preserved)
  let bestMult = 1;
  if (mathBuff && move.type !== 'heal') bestMult = Math.max(bestMult, 1.5);
  if (traceBuffs?.mathTraceTier) bestMult = Math.max(bestMult, TRACE_TIER_MULTIPLIERS[traceBuffs.mathTraceTier]);
  if (traceBuffs?.runeBoostTier) bestMult = Math.max(bestMult, TRACE_TIER_MULTIPLIERS[traceBuffs.runeBoostTier]);
  if (move.type !== 'heal') total *= bestMult;

  return { damage: Math.max(1, Math.floor(total)), isCrit };
};
```

- [ ] **Step 2: Verify compilation**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/engine/systems/BattleSystem.ts
git commit -m "fix(battle): replace subtractive damage formula with multiplicative

Old: (ATK * power/100) - (DEF * 0.6) → always 1 damage
New: ATK * power/40 * (100 / (100 + DEF)) → scales smoothly
Defense buff now reduces incoming damage by 40% instead of
increasing DEF subtraction."
```

---

### Task 2: Normalize HP and stats — player 150-300, enemy same range

**Files:**
- Modify: `src/config/battleConfig.ts:38`
- Modify: `src/engine/systems/BattleSystem.ts:35-88`

Current player HP = `needs.health * 10` = 999. Current enemy HP = `10 * level * 0.9 * 10` = 270-450. Player strength = raw `pet.stats.strength` (~8), doesn't scale with level. All need fixing.

- [ ] **Step 1: Reduce baseHPMultiplier from 10 to 2.5**

In `src/config/battleConfig.ts`, change line 38:

```typescript
  baseHPMultiplier: 2.5,
```

This changes player HP from `100 * 10 = 1000` to `100 * 2.5 = 250` (right in the 150-300 target).

- [ ] **Step 2: Add level-based stat scaling to petToBattlePet**

In `src/engine/systems/BattleSystem.ts`, in the `petToBattlePet` function (lines 35-64), replace lines 58-60:

```typescript
    strength: Math.floor(pet.stats.strength * strengthMod),
    speed: Math.floor(pet.stats.speed * speedMod),
    defense: pet.stats.defense,
```

With:

```typescript
    strength: Math.max(10, Math.floor(pet.stats.strength * strengthMod * (1 + pet.progression.level * 0.15))),
    speed: Math.max(10, Math.floor(pet.stats.speed * speedMod * (1 + pet.progression.level * 0.15))),
    defense: Math.max(8, Math.floor(pet.stats.defense * (1 + pet.progression.level * 0.12))),
```

This gives a level 5 slime (base str=8): `max(10, floor(8 * 1.0 * 1.75))` = **14 strength**. Without this, raw str=8 produces tiny damage even with the new formula.

- [ ] **Step 3: Rewrite generateEnemyPet to use species base stats**

In `src/engine/systems/BattleSystem.ts`, replace the `generateEnemyPet` function (lines 66-88) with:

```typescript
const generateEnemyPet = (playerLevel: number): BattlePet => {
  const level = Math.max(1, playerLevel + Math.floor((Math.random() - 0.5) * ENEMY_SCALING.levelVariance * 2));
  const speciesIds = ['slime_baby', 'mech_bot', 'koala_sprite'];
  const speciesId = speciesIds[Math.floor(Math.random() * speciesIds.length)];

  // Use species base stats + level scaling (same approach as PvP)
  const speciesBase = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  const levelScale = 1 + level * 0.15;
  const str = Math.floor(speciesBase.str * levelScale * ENEMY_SCALING.statMultiplier);
  const spd = Math.floor(speciesBase.spd * levelScale * ENEMY_SCALING.statMultiplier);
  const def = Math.floor(speciesBase.def * levelScale * ENEMY_SCALING.statMultiplier);

  // HP uses same formula as player: base health value * multiplier
  // Enemy "health" is 70 + level*8 (capped at 100), so HP lands in 150-250 range
  const healthValue = Math.min(100, 70 + level * 8);
  const maxHP = Math.max(1, Math.floor(healthValue * BATTLE_CONSTANTS.baseHPMultiplier));

  return {
    petId: `enemy_${Date.now()}`,
    name: `Wild ${SPECIES_CONFIG[speciesId]?.name ?? speciesId}`,
    speciesId,
    level,
    maxHP,
    currentHP: maxHP,
    energy: BATTLE_CONSTANTS.startingEnergy,
    maxEnergy: BATTLE_CONSTANTS.maxEnergy,
    strength: str,
    speed: spd,
    defense: def,
    moves: getMoves(speciesId),
    buffs: [],
  };
};
```

`SPECIES_BASE_STATS` is already imported on line 10 — verify it's present in the import from `battleConfig`.

- [ ] **Step 4: Adjust heal cap for new HP range**

In `src/engine/systems/BattleSystem.ts`, find the heal calculation in `executePlayerMove` (search for `player.maxHP * 0.4`):

```typescript
    const healAmt = Math.max(1, Math.min(Math.floor(player.maxHP * 0.4), healBase + Math.floor(Math.random() * healVariance)));
```

Change `0.4` to `0.35` so heals don't fully negate a turn of damage at the new HP scale:

```typescript
    const healAmt = Math.max(1, Math.min(Math.floor(player.maxHP * 0.35), healBase + Math.floor(Math.random() * healVariance)));
```

- [ ] **Step 5: Verify compilation**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/config/battleConfig.ts src/engine/systems/BattleSystem.ts
git commit -m "fix(battle): normalize HP to 150-300 range, add level stat scaling

- baseHPMultiplier 10 → 2.5 (player HP: ~250 instead of ~999)
- petToBattlePet: stats now scale with level (1 + level*0.15)
- Enemy uses species base stats + level scaling instead of raw 10*level*0.9
- Enemy HP: 150-250 range via healthValue formula
- Heal cap reduced to 35% maxHP for new scale"
```

---

### Task 3: Simplify energy economy — remove on-hit gain

**Files:**
- Modify: `src/config/battleConfig.ts:34`

- [ ] **Step 1: Set energyOnHitTaken to 0**

In `src/config/battleConfig.ts`, change line 34:

```typescript
  energyOnHitTaken: 0,        // removed: Focus is primary recovery method
```

- [ ] **Step 2: Verify compilation**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/config/battleConfig.ts
git commit -m "fix(battle): remove on-hit energy gain, Focus is primary recovery

energyOnHitTaken 4 → 0. Players must use Focus (12 EN) or
Defend (6 EN) to manage energy strategically."
```

---

### Task 4: Increase sprite size from 96px to 144px

**Files:**
- Modify: `src/components/battle/BattleEffects.tsx:146,178-179,80`
- Modify: `src/screens/BattleScreen.tsx` (shadow divs, AnimatedEffect displaySize if present)

The `BattlePetSprite` component hardcodes 96px in three places (combat sheet render, portrait render, fallback sprite render). Change to 144px.

- [ ] **Step 1: Update combat sheet display size**

In `src/components/battle/BattleEffects.tsx`, find line 146:

```typescript
    const displaySize = 96;
```

Change to:

```typescript
    const displaySize = 144;
```

- [ ] **Step 2: Update portrait render size**

In the same file, find lines 178-179:

```typescript
            width: 96,
            height: 96,
```

Change to:

```typescript
            width: 144,
            height: 144,
```

- [ ] **Step 3: Update fallback sprite scale**

In the same file, find line 190 where `computeSpriteStyle` is called with scale 0.75:

```typescript
  const spriteStyle = computeSpriteStyle(petAsset, 0, 0.75);
```

Change scale to 1.125 (proportional: 144/96 * 0.75):

```typescript
  const spriteStyle = computeSpriteStyle(petAsset, 0, 1.125);
```

- [ ] **Step 4: Update impact burst size**

In `src/components/battle/BattleEffects.tsx`, find the ImpactBurst component, the line with `width: 72, height: 72` (around line 80):

```typescript
        style={{ width: 72, height: 72, imageRendering: 'pixelated' }}
```

Change to:

```typescript
        style={{ width: 96, height: 96, imageRendering: 'pixelated' }}
```

- [ ] **Step 5: Update shadow under sprites**

In `src/screens/BattleScreen.tsx`, find the two shadow divs (`w-20 h-3`). Change both to `w-28 h-4` to match the larger sprites:

```html
<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-black/40 rounded-[100%] blur-sm" />
```

There are 2 of these — one after the enemy sprite and one after the player sprite. Search for `w-20 h-3` to find both.

- [ ] **Step 6: Verify compilation**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/battle/BattleEffects.tsx src/screens/BattleScreen.tsx
git commit -m "fix(battle): increase sprite size from 96px to 144px

Sprites, combat sheets, portraits, effects, and shadows all scale up.
Impact burst 72→96px. Shadows w-20→w-28."
```

---

### Task 5: Widen action bar — remove max-w-2xl cap

**Files:**
- Modify: `src/screens/BattleScreen.tsx` (two `max-w-2xl` occurrences)

- [ ] **Step 1: Widen action bar container**

In `src/screens/BattleScreen.tsx`, search for the action bar `max-w-2xl` (around line 363):

```typescript
            <div className="max-w-2xl mx-auto">
```

Change to:

```typescript
            <div className="max-w-5xl mx-auto">
```

- [ ] **Step 2: Widen brain boost / power rune row**

In the same file, search for the second `max-w-2xl` (around line 400):

```typescript
            <div className="max-w-2xl mx-auto mt-2 flex gap-2 items-center">
```

Change to:

```typescript
            <div className="max-w-5xl mx-auto mt-2 flex gap-2 items-center">
```

- [ ] **Step 3: Verify compilation**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/screens/BattleScreen.tsx
git commit -m "fix(battle): widen action bar from max-w-2xl to max-w-5xl

Action bar and brain boost row now use up to 1024px instead
of 672px, reducing dead space on wider screens."
```

---

### Task 6: Update E2E test assertions for new balance

**Files:**
- Modify: `e2e/battle-system-fixes.spec.ts` (heal value assertion)

The heal value test (TEST 3) asserts `healAmt <= 500`. With new HP range (150-300), max heal is ~87 (250 * 0.35). Update the upper bound.

- [ ] **Step 1: Adjust heal value assertion**

In `e2e/battle-system-fixes.spec.ts`, find the heal assertion lines:

```typescript
      expect(healAmt).toBeGreaterThanOrEqual(1);
      expect(healAmt).toBeLessThanOrEqual(500);
```

Change upper bound to 150 (generous margin for the new scale):

```typescript
      expect(healAmt).toBeGreaterThanOrEqual(1);
      expect(healAmt).toBeLessThanOrEqual(150);
```

- [ ] **Step 2: Commit**

```bash
git add e2e/battle-system-fixes.spec.ts
git commit -m "test(battle): adjust heal value assertion for new HP scale

Max heal is now ~87 (250*0.35) instead of ~400 (999*0.4).
Upper bound adjusted from 500 to 150."
```

---

### Task 7: Run Playwright verification and review screenshots

- [ ] **Step 1: Run all battle E2E tests**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx playwright test e2e/battle-feedback.spec.ts e2e/battle-system-fixes.spec.ts e2e/battle-desync.spec.ts --reporter=list 2>&1 | tail -40`

Expected: All tests pass (some may need adjustment — report any failures)

- [ ] **Step 2: If any tests fail, diagnose and fix**

Common expected failures:
- Battle log text assertions may fail if damage messages change format (unlikely — format is the same, just different numbers)
- Energy loop test may fail if energy economy is too tight (if so, may need to bump `energyPerTurn` from 4 to 5)
- Screenshot pixel comparisons will differ (expected — new sprite sizes, different damage numbers)

- [ ] **Step 3: Take fresh battle screenshots and review**

Run one additional screenshot pass:
```bash
npx playwright test e2e/battle-feedback.spec.ts --reporter=list 2>&1 | tail -20
```

Then review screenshots for:
- Sprites are visibly larger (144px vs 96px)
- Action bar is wider
- Damage numbers show values > 1
- HP bars show visible change after attack

- [ ] **Step 4: Commit any test fixes**

```bash
git add e2e/
git commit -m "test(battle): update E2E tests for Phase 1 balance changes"
```

---

## Balance Verification

Expected damage output with the final formula `ATK * power / 40 * (100 / (100 + DEF))`:

**Player stats at level 5** (with level scaling `1 + level * 0.15 = 1.75x`):

| Species | Base STR | Scaled STR | Base DEF | Scaled DEF |
|---------|----------|-----------|----------|-----------|
| slime_baby | 8 | 14 | ~8 | ~11 |
| koala_sprite | 11 | 19 | ~12 | ~16 |
| mech_bot | 14 | 24 | ~16 | ~21 |

**Enemy stats at level 5** (species base × 1.75 × 0.9):

| Species | STR | DEF | HP (min(100,110)*2.5) |
|---------|-----|-----|----|
| slime_baby | 12 | 12 | 250 |
| koala_sprite | 17 | 18 | 250 |
| mech_bot | 22 | 25 | 250 |

**Damage: Player → Enemy (slime def=12)**:

| Species | Basic ATK | Special ATK | Turns to kill (mixed) |
|---------|-----------|-------------|----------------------|
| slime_baby (str=14) | Slime Toss(35): **11** | Acid Splash(70): **22** | ~15 |
| koala_sprite (str=19) | Scratch(40): **17** | Dropbear(80): **34** | ~10 |
| mech_bot (str=24) | Laser(50): **27** | Overcharge(90): **48** | ~7 |

**Notes:**
- mech_bot hits the 5-8 turn target. koala is close at ~10. slime_baby is slower (~15) but benefits most from combo stacking (1.4x max) and crits (1.5x).
- All species can now WIN within 30 turns. Currently, zero species can.
- Fine-tuning species balance to exactly 5-8 turns for all is a Phase 4 task (adjusting move powers per species or the divisor constant).
- Enemy damage back at player (player def ~16-21) is in the 7-25 range, meaning players take real damage and must use heals strategically.
