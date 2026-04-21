# Implementation Plan: Pet Care Screen GUI

**Spec**: `docs/superpowers/specs/2026-04-10-pet-care-gui-and-bugfixes-design.md`  
**Date**: 2026-04-10

All audit bugfixes (TopHUD re-render, shop category, save migration, care tool purchase wiring, XP application, type safety) are **already applied**. This plan covers only the remaining work: building the Pet Care GUI screen and reconciling old care buttons.

---

## Step 1: Add `pet_care` to ScreenName type

**File**: `src/types/session.ts`

- Add `'pet_care'` to the `ScreenName` union type

**Verify**: `tsc --noEmit` passes

---

## Step 2: Add `care` to RoomConfig ActionId

**File**: `src/config/roomConfig.ts`

- Add `'care'` to the `ActionId` union type
- Add `'care'` to `primaryActions` array for **both** rooms (inside and outside — care is always available)

**Verify**: `tsc --noEmit` passes

---

## Step 3: Build `CareStatBar` component

**New file**: `src/components/care/CareStatBar.tsx`

A reusable horizontal stat bar showing label, filled portion, and numeric value.

Props:
- `label: string` — "Trust", "Discipline", etc.
- `value: number` — 0–100
- `max?: number` — default 100
- `color: string` — bar fill color (tailwind class or CSS)
- `icon?: string` — optional small icon path

Rendering:
- Full-width row: icon (16px) + label (text-xs) + bar container + value number
- Bar container: dark slate background, inner filled div with `width: ${value}%`, rounded
- Color thresholds: green (`≥60`), yellow (`30–59`), red (`<30`) — applied automatically unless explicit color given
- Smooth CSS transition on width change (`transition-all duration-500`)

**Verify**: Component exports correctly, no type errors

---

## Step 4: Build `InteractionCard` component

**New file**: `src/components/care/InteractionCard.tsx`

A card for a single interaction mode, showing its status and stat effects.

Props:
- `mode: Exclude<HandMode, 'idle'>`
- `interaction: InteractionState`
- `pet: Pet`

Rendering:
- 90×100px card with rounded corners, dark background
- Top: icon from `INTERACTION_DEFS[mode].icon` (32px, pixelated)
- Middle: name (text-[10px] bold uppercase)
- Bottom status:
  - Locked: "🔒" + unlock hint text
  - Cooldown: countdown seconds display
  - Ready: green "RDY" badge
- Equipped tier: small badge in top-right corner if tier > 0 ("T1", "T2")
- Tap opens a small tooltip showing stat effects list from `INTERACTION_DEFS[mode].statEffects`
- Locked cards get `opacity-50 grayscale` treatment

**Verify**: Component renders correctly with mock data

---

## Step 5: Build `CareToolList` component

**New file**: `src/components/care/CareToolList.tsx`

Shows owned care tools from inventory.

Props:
- `inventory: InventoryState` (from engine state)
- `interaction: InteractionState`

Rendering:
- Header: "CARE TOOLS" with a "Shop →" button (right-aligned)
- List of owned care tool items (cross-reference `CARE_TOOL_ITEMS` with inventory contents)
- Each row: checkmark icon + tool name + "(affects Mode TN)" badge
- If no tools owned: "No care tools yet. Visit the shop!" placeholder text
- "Shop →" calls the `onGoToShop` callback

**Verify**: Component exports, no type errors

---

## Step 6: Build `CareTips` component

**New file**: `src/components/care/CareTips.tsx`

Contextual tips based on pet state.

Props:
- `pet: Pet`
- `interaction: InteractionState`

Logic (priority order, show first matching):
1. `stress ≥ 60` → "Your pet is stressed! Try the Comfort interaction to calm them down."
2. `groomingScore < 30` → "Your pet needs grooming — use Brush to improve their appearance!"
3. `trust < 30` → "Build trust by petting your companion regularly."
4. `discipline < 20 && 'train' unlocked` → "Training sessions will boost discipline and earn XP."
5. `happiness < 40` → "Your pet seems unhappy — try Playing together!"
6. Fallback → "Your pet is doing well! Keep up the great care."

Rendering:
- Light purple info box with "💡" prefix, italic text, rounded corners

**Verify**: Component exports, tip logic works

---

## Step 7: Build `PetCareScreen` main screen

**New file**: `src/screens/PetCareScreen.tsx`

Props:
- `pet: Pet`
- `interaction: InteractionState`
- `inventory: InventoryState`
- `playerTokens: number`
- `dispatch: (action: GameEngineAction) => void`
- `onClose: () => void`

Layout (scrollable, max-w-lg mx-auto):
1. **Header bar**: "← PET CARE" back button (calls `onClose`) + token display
2. **Stat bars section**: 4 `CareStatBar` components:
   - Trust (pet.trust ?? 20, purple)
   - Discipline (pet.discipline ?? 0, blue)
   - Grooming (pet.groomingScore ?? 50, cyan)
   - Stress (pet.stress ?? 0, red — note: high = bad, so bar color inverts: green when low, red when high)
3. **Interactions grid**: 2×3 grid of `InteractionCard` for each of the 6 modes
4. **Care tools list**: `CareToolList` with shop link
5. **Tips**: `CareTips` at the bottom

Style: Same dark slate/purple theme as other screens. Uses `GameButton` for the back button.

**Verify**: `tsc --noEmit` passes. Screen renders without crashing.

---

## Step 8: Wire PetCareScreen into App.tsx

**File**: `src/App.tsx`

- Import `PetCareScreen`
- Add `pet_care` case in the screen routing logic:
  ```tsx
  if (state.screen === 'pet_care' && state.pet) {
    return <PetCareScreen
      pet={state.pet}
      interaction={state.interaction}
      inventory={state.inventory}
      playerTokens={state.player.currencies.tokens}
      dispatch={devDispatch}
      onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
    />;
  }
  ```

**Verify**: Navigating to pet_care screen works. Back button returns home.

---

## Step 9: Update RightSidePanel — add Care, remove Play/Clean

**File**: `src/config/roomConfig.ts`

- Add `'care'` to `ActionId` type (done in Step 2)

**File**: `src/components/scene/RightSidePanel.tsx`

- Add `care` action config entry:
  ```ts
  care: {
    icon: '/assets/generated/final/icon_heart.png',
    label: 'Care',
    glowColor: 'hover:shadow-purple-500/40',
    getOnClick: (p) => p.onCare,
  }
  ```
- Add `onCare: () => void` to props interface
- Remove `play` and `clean` from `ACTION_CONFIG` (their functionality is now in the interaction system)

**File**: `src/config/roomConfig.ts`

- Replace `'play'` with `'care'` in outside room's `primaryActions`
- Replace `'clean'` with `'care'` in inside room's `primaryActions`

**File**: `src/components/scene/GameSceneShell.tsx`

- Add `onCare` prop to `RightSidePanel`: `onCare={() => dispatch({ type: 'SET_SCREEN', screen: 'pet_care' })}`
- Remove `onPlay` and `onClean` callbacks (no longer needed — interaction system handles these)

**Verify**: Care button appears in RightSidePanel. Old Play/Clean buttons gone. Care button opens PetCareScreen.

---

## Step 10: Build verification + test in browser

- Run `tsc --noEmit` — zero errors
- Run `vite build` — successful build
- Start dev server
- Test flow:
  1. Home screen loads normally
  2. Care button visible in side panel
  3. Clicking Care opens PetCareScreen
  4. All 4 stat bars render with correct values
  5. Interaction cards show correct lock/ready state
  6. Shop link navigates to shop
  7. Back button returns to home
  8. Shop now shows "Care Tools" category tab
  9. Buying a care tool (e.g., Soap Kit) unlocks the Wash interaction
  10. Interaction toolbar (bottom "Touch" button) still works
  11. Old save loads without crash (migration v9→v10)
  12. Press I key — debug panel shows correct data
