# Verification & Hardening Report

**Date:** 2026-04-05
**Purpose:** Prove stabilization fixes are real, harden battle system, validate guardrails

---

## 1. Final Verification — `npm run verify`

**Command:** `tsc -b && eslint . && vitest run && vite build`
**Result:** PASS (exit code 0)

```
> app@0.0.0 verify
> tsc -b && eslint . && vitest run && vite build

 RUN  v4.1.2

 Test Files  4 passed (4)
      Tests  131 passed (131)
   Duration  532ms

vite v8.0.3 building client environment for production...
✓ 171 modules transformed.
dist/index.html                   0.83 kB │ gzip:   0.43 kB
dist/assets/index-kVxx6wxP.css   71.23 kB │ gzip:  12.48 kB
dist/assets/index-r-XxYoct.js   489.48 kB │ gzip: 137.44 kB
✓ built in 1.21s
```

---

## 2. Individual Command Results

### Typecheck — `npm run typecheck`
- **Result:** PASS
- **Output:** clean (no errors)
- **Note:** Required clearing `.tsbuildinfo` cache once — stale cache produced phantom errors on `App.tsx` imports that are actually used. Clean build is reliable.

### Lint — `npm run lint`
- **Result:** PASS (0 errors, 0 warnings)
- **Suppressions remaining:** 1 total
  - `TutorialOverlay.tsx:30` — `react-hooks/set-state-in-effect` — justified DOM measurement pattern
- **Suppressions removed:**
  - `HelpProvider.tsx` — refactored to derive-during-render pattern (no suppression needed)
  - `BattleEffects.tsx` — 2 stale directives removed
  - `useBattleSequence.ts` — 1 stale directive removed

### Unit Tests — `npm run test:unit`
- **Result:** PASS
- **Test Files:** 4 passed
- **Tests:** 131 passed (113 original + 18 new battle guards)
- **Duration:** 532ms

### Build — `npm run build`
- **Result:** PASS
- **Bundle:** 489KB JS (137KB gzipped), 71KB CSS (12KB gzipped)
- **Modules:** 171 transformed

---

## 3. Corrections Found During Verification

| Issue | Found During | Fix |
|-------|-------------|-----|
| `PieceMoveAnimator.tsx:32` — `setHasStarted(false)` in effect | Lint re-run | Removed redundant reset (parent `key` guarantees fresh mount) |
| `HelpProvider.tsx:46` — `setActiveTutorial()` in effect | Lint suppression review | Refactored to derive-during-render pattern |
| Stale `.tsbuildinfo` cache | `npm run verify` | Cleared cache; phantom errors were not real |

---

## 4. Battle Hardening Tests Added

**File:** `src/engine/systems/__tests__/BattleGuards.test.ts` (18 tests)

### Out-of-turn action guards (8 tests)
- `PLAYER_MOVE` rejected when phase is setup/enemy_turn/resolve/victory/defeat
- `PLAYER_FOCUS` rejected when phase is not player_turn
- `PLAYER_DEFEND_ACTION` rejected when phase is not player_turn
- `PLAYER_FLEE_ATTEMPT` rejected when phase is not player_turn
- `PLAYER_MOVE` accepted when phase IS player_turn

### Rapid action resistance (3 tests)
- Double `PLAYER_MOVE` — second is rejected because phase advanced
- `PLAYER_FOCUS` full round advances and resets for next turn
- All 4 actions on inactive battle are rejected

### Turn progression determinism (2 tests)
- `PLAYER_MOVE` advances through player → enemy → resolve in one dispatch
- Turn count increments by exactly 1 per player action

### HP/energy bounds safety (4 tests)
- Enemy HP never goes below 0 after attack
- Player energy never exceeds maxEnergy after focus
- Player energy never goes below 0 after using a move
- Insufficient energy rejects move with log message

### Victory/defeat resolution (2 tests)
- Enemy at 0 HP triggers victory phase after resolve
- Battle rewards are populated on victory

### Combo system bounds (1 test)
- Combo count does not exceed comboMaxStacks (8)

---

## 5. E2E Separation Validation

| Check | Result |
|-------|--------|
| Vitest runs only `src/` test files | 4 files found, 0 from `e2e/` |
| Playwright specs stay in `e2e/` | 15 specs, none touched by Vitest |
| `pixelLab.manual.ts` not picked up | Renamed from `.test.ts`, not found by Vitest |

### Package Scripts
```
dev:        vite
build:      tsc -b && vite build
lint:       eslint .
typecheck:  tsc -b
test:       vitest run
test:unit:  vitest run
test:e2e:   npx playwright test
verify:     tsc -b && eslint . && vitest run && vite build
preview:    vite preview
```

---

## 6. Guardrails Added

### `npm run verify`
Single command that runs all four quality gates in sequence:
1. TypeScript type checking
2. ESLint linting
3. Vitest unit tests
4. Vite production build

Exits on first failure. Suitable for use in:
- Manual pre-commit check: `npm run verify`
- CI/CD pipeline
- Git hooks (once git is initialized)

**No `.git` directory exists in this repo**, so pre-commit hooks were not installed. When git is initialized, add:
```bash
echo 'npm run verify' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

---

## 7. Lint Suppression Audit

| File | Rule | Justification | Verdict |
|------|------|---------------|---------|
| `TutorialOverlay.tsx:30` | `react-hooks/set-state-in-effect` | DOM measurement: `setAnchor(null)` when no target element exists. Part of `useEffect` that reads `getBoundingClientRect()` and stores result in state. This is the standard React pattern for synchronizing with DOM layout. | **Justified — keep** |
| `HelpProvider.tsx` | *(removed)* | Was: `setActiveTutorial()` in effect. Refactored to derive-during-render pattern. | **Fixed — suppression removed** |

---

## Verdict

The repo is **truly green**. All four quality gates pass from a clean state. Battle system has 18 new hardening tests proving the phase guards, bounds checking, and turn progression work correctly. One remaining lint suppression is genuinely justified. The `npm run verify` script provides a single-command go/no-go check.
