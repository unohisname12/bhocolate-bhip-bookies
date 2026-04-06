# Dungeon Run V1

## What Was Implemented

A minimal but complete roguelike run loop integrated with the existing battle system.

### Core Loop
- **3 encounters + 1 boss** (linear progression, no branching)
- **HP persists** between encounters (`playerHPPercent` carried forward)
- **2 reward choices** after each non-boss victory
- **Victory** = defeat the boss; **Defeat** = player HP reaches 0 or flee

### Enemy System
- 3 normal enemies + 1 boss, defined in `src/config/runConfig.ts`
- Behavior expressed through stat distribution (aggressive = +STR/-DEF, defensive = +DEF/-STR)
- Boss has 1.3x stats and 1.4x HP

### Reward System
- 3 reward types: Energy boost, Stat boost (+STR/DEF), Utility (lifesteal or shield start)
- Fixed reward pairs per encounter (not randomized in V1)
- Bonuses stack across the run

### Battle Integration
- `RunBattleAdapter` builds modified `BattlePet` objects with run bonuses
- Existing `BattleSystem` and `BattleScreen` are reused unchanged
- `END_BATTLE`, `FLEE_BATTLE`, and `PLAYER_FLEE_ATTEMPT` route through run system when a run is active

### UI Screens
- `RunStartScreen` — entry point with run description
- `RunEncounterScreen` — enemy preview with HP bar and bonuses display
- `RunRewardScreen` — 2 reward cards to choose from
- `RunOverScreen` — victory/defeat summary with rewards breakdown

### Entry Point
- "Dungeon" button in the outside room's command deck

## New Files
```
src/types/run.ts
src/config/runConfig.ts
src/engine/systems/RunSystem.ts
src/engine/systems/RunBattleAdapter.ts
src/screens/RunStartScreen.tsx
src/screens/RunEncounterScreen.tsx
src/screens/RunRewardScreen.tsx
src/screens/RunOverScreen.tsx
src/engine/systems/__tests__/RunSystem.test.ts
src/engine/systems/__tests__/RunBattleAdapter.test.ts
```

## Modified Files
```
src/types/engine.ts
src/types/session.ts
src/engine/core/ActionTypes.ts
src/engine/state/createInitialEngineState.ts
src/services/persistence/saveMigrations.ts
src/engine/state/engineReducer.ts
src/App.tsx
src/config/roomConfig.ts
src/components/scene/RightSidePanel.tsx
src/components/scene/BottomActionBar.tsx
src/components/scene/GameSceneShell.tsx
```

## What Was Intentionally Skipped (V2)

- Map generation / branching paths
- Events and rest nodes
- Meta progression / permanent unlocks
- Lockout system after defeat
- Currency system within runs
- Full enemy behavior archetypes (scaling, punisher, berserker, tactician)
- Weighted reward pools / randomized rewards
- Move unlock rewards
- Seeded PRNG for deterministic runs
- Run history tracking

## V2 Plan

The full roguelike system design exists in the plan file. V2 would add:
1. Branching map with node choices (EASY/NORMAL/ELITE/EVENT/REST/BOSS)
2. 6 enemy behavior archetypes with AI score modifiers
3. Events and rest stops
4. Meta progression with permanent unlocks
5. Loss lockout (math + care tasks to re-enter)
6. Seeded PRNG for reproducible runs
