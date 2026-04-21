# Pet Care System GUI + Full-Game Audit Fixes

**Date**: 2026-04-10  
**Status**: Spec  

---

## Audit Summary

Full-game audit performed across all screens, engine, hooks, components, and persistence layer. Bugs found and **already fixed** during the audit session:

### Fixed During Audit

| # | Severity | File | Issue | Fix Applied |
|---|----------|------|-------|-------------|
| 1 | CRITICAL | `TopHUD.tsx` | `setState` called during render body causing infinite re-render loop when MP tier changes | Moved tier-change detection into `useEffect`, added timeout cleanup |
| 2 | HIGH | `ShopScreen.tsx` | `CATEGORIES` array missing `care_tool` — all 8 care tools invisible in shop | Added `{ id: 'care_tool', label: '🧼 Care Tools' }` |
| 3 | HIGH | `saveMigrations.ts` | No migration for new `interaction` field — old saves crash on load | Added v9→v10 migration with full `InteractionState` default |
| 4 | HIGH | `engineReducer.ts` | `PURCHASE_ITEM` doesn't trigger `UNLOCK_INTERACTION` / `UPGRADE_TOOL_TIER` for care tools — buying Soap Kit doesn't unlock Wash | Added `getCareToolById` check inside `PURCHASE_ITEM` case to auto-unlock/upgrade |
| 5 | HIGH | `InteractionSystem.ts` | Training's `xp: 15` stat effect never applied to `pet.progression.xp` | Added XP application with `Math.round` |
| 6 | MEDIUM | `GameSceneShell.tsx` | `as any` cast on `reaction.reactionAnim` hides type mismatch | Changed to `as PetIntent` with proper import |
| 7 | LOW | `usePetReaction.ts` | Unused imports (`getReactionText`, `calculateMoodMultiplier`) | Removed |

### Remaining Issues (Not Yet Fixed — Included in Plan Below)

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 8 | HIGH | Pet Care GUI | No dedicated pet care screen — the interaction system has no UI beyond a small bottom toolbar and debug panel. Player has no way to see pet stats (trust, discipline, grooming, stress), interaction history, care tool inventory, or progress toward unlocking new interactions. |
| 9 | MEDIUM | InteractionToolbar | Toolbar is functional but minimal — no stat feedback, no visual context for what each interaction does to the pet. |
| 10 | MEDIUM | Interaction → RightSidePanel overlap | The old Feed/Play/Clean/Heal buttons in RightSidePanel still exist alongside the new interaction toolbar. Feed/Play/Clean actions overlap conceptually with pet/wash/play interactions. Need to reconcile. |
| 11 | LOW | HandCursor | 4 of 6 hand animation states use fallback sprite with CSS transform hints. Works but looks placeholder. |
| 12 | LOW | InteractionDebug | Dev-only panel (I key); functional but not player-facing. |

---

## Design: Pet Care Screen

### What It Is

A dedicated full-screen panel (slide-up overlay, like FeedingScreen or ShopScreen) that shows:

1. **Pet Status Dashboard** — all 4 new care stats (Trust, Discipline, Grooming, Stress) as visual bars with labels and numeric values
2. **Interaction Tools Grid** — the 6 interaction modes as cards showing: icon, name, unlock state, equipped tier, cooldown, stat effects preview
3. **Care Tool Inventory** — owned care tools from the shop, with "equip" actions for upgrades
4. **Pet Care History** — recent interaction log (last 10 interactions with timestamp, mode, quality, stat changes)
5. **Tips/Hints** — contextual tips based on current pet state ("Your pet is stressed — try Comfort!")

### How It's Accessed

- New "Care" button added to `RightSidePanel` (alongside Feed, Play, Shop, etc.)
- Dispatches `SET_SCREEN` with `screen: 'pet_care'`
- App.tsx routes to `<PetCareScreen />`

### Visual Style

Matches existing screens: dark slate background, pixel art icons, purple accent glow, uppercase tracking-wider headings. Same `GameButton` and `GameIcon` components.

### Layout (Top to Bottom)

```
┌─────────────────────────────────────┐
│ [←] PET CARE              [tokens] │  Header with back button + currency
├─────────────────────────────────────┤
│                                     │
│  ┌─Trust──────────█████░░░░ 62──┐  │  Stat bars section
│  ├─Discipline─────███░░░░░░ 34──┤  │  Each bar: label, filled bar, number
│  ├─Grooming───────██████░░░ 71──┤  │  Color-coded by health:
│  └─Stress─────────██░░░░░░░ 18──┘  │    green ≥60, yellow 30-59, red <30
│                                     │
├─────────────────────────────────────┤
│  INTERACTIONS                       │
│  ┌──────┐ ┌──────┐ ┌──────┐       │  2×3 grid of interaction cards
│  │🖐 Pet│ │🧼Wash│ │🪮Brsh│       │  Each card shows:
│  │ RDY  │ │🔒 L2 │ │🔒bond│       │    - Icon + name
│  └──────┘ └──────┘ └──────┘       │    - Status (ready/locked/cooldown)
│  ┌──────┐ ┌──────┐ ┌──────┐       │    - Equipped tier badge
│  │💆Cmft│ │📖Trn │ │🎾Play│       │    - Tap to see stat effects
│  │ RDY  │ │🔒 L3 │ │ RDY  │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
├─────────────────────────────────────┤
│  CARE TOOLS                [Shop→] │  Owned tools list
│  ✓ Soap Kit (Wash T0)              │  Shows what's owned + what it does
│  ✓ Comfort Blanket (Comfort T1)    │  "Shop→" button links to shop
│                                     │
├─────────────────────────────────────┤
│  TIPS                               │
│  💡 "Pet is a bit dirty — try       │  Context-sensitive tip
│     brushing for +grooming!"        │
└─────────────────────────────────────┘
```

### Data Flow

- Reads from `state.interaction` (unlocks, tiers, cooldowns, usage)
- Reads from `state.pet` (trust, discipline, groomingScore, stress, mood)
- Reads from `state.inventory` (to show owned care tools)
- No new engine state needed — purely a read-only display screen
- "Shop→" button dispatches `SET_SCREEN: 'shop'`
- Back button dispatches `SET_SCREEN: 'home'`

### Reconciling Old Care Buttons

The existing RightSidePanel has Feed/Play/Clean/Heal buttons that overlap with the interaction system:
- **Keep Feed** — it opens FeedingScreen (item-based, separate mechanic)
- **Keep Heal** — instant health restore, distinct from comfort
- **Remove old Play button** — replaced by play interaction in the touch system
- **Remove old Clean button** — replaced by wash/brush interactions
- **Add new Care button** — opens PetCareScreen

### New Files

1. `src/screens/PetCareScreen.tsx` — the main screen component
2. `src/components/care/CareStatBar.tsx` — reusable stat bar (trust/discipline/grooming/stress)
3. `src/components/care/InteractionCard.tsx` — single interaction mode card
4. `src/components/care/CareToolList.tsx` — owned tools list with tier badges
5. `src/components/care/CareTips.tsx` — contextual tip generator

### Modified Files

1. `src/App.tsx` — add `pet_care` screen route
2. `src/engine/core/ActionTypes.ts` — add `'pet_care'` to screen type (if not already a generic string)
3. `src/components/scene/RightSidePanel.tsx` — replace Play/Clean with Care button
4. `src/config/roomConfig.ts` — add `care` action to room action lists
