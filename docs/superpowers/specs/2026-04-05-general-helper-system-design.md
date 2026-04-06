# General Helper System Design

**Date:** 2026-04-05
**Status:** Approved

## Overview

A data-driven tutorial and help system that can teach any mini-game or feature in the Auralith pet game. Each feature registers a help config; a central engine renders tutorials, on-demand help, and contextual hints with consistent, immersive presentation.

## Architecture

### Help Registry

Central `Map<string, HelpConfig>` holding all feature help configurations.

```ts
interface HelpConfig {
  id: string;                    // 'momentum' | 'trace-shield' | 'battle' | ...
  name: string;                  // Display name
  icon: string;                  // Sprite/icon path
  tutorial: TutorialStep[];      // First-time tutorial sequence
  quickRef: QuickRefEntry[];     // On-demand quick reference
  hints?: HintRule[];            // Contextual micro-hints
}
```

### Tutorial Steps

```ts
interface TutorialStep {
  id: string;
  text: string;
  target?: string;               // CSS selector to spotlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'tap' | 'drag' | 'wait';
  speaker?: 'guide' | 'narrator';
  highlightRadius?: number;
}
```

Steps play sequentially on first encounter. Player can skip. Progress saved per-feature.

### Quick Reference

```ts
interface QuickRefEntry {
  title: string;
  body: string;
  icon?: string;
}
```

Accessed via persistent "?" HUD button. Shows all encountered features with expandable sections.

### Contextual Hints

```ts
interface HintRule {
  trigger: string;               // Game event ID
  text: string;
  maxShows: number;
  cooldown: number;              // ms
}
```

Toast-style hints during gameplay. Self-limiting to prevent nagging.

## Rendering

Two presentation modes per step:

- **Spotlight Overlay**: Dark semi-transparent overlay with cutout around target element. Used when `target` is specified.
- **Dialogue Bubble**: Guide character speech bubble. Used for narrative/explanatory steps without a target.

## Completion Tracking

Stored in existing game state, persisted via Firebase:

```ts
interface HelpState {
  completedTutorials: string[];
  encounteredFeatures: string[];
  hintCounts: Record<string, number>;
}
```

Integrated into existing game state reducer.

## Components

| Component | Purpose |
|-----------|---------|
| `HelpProvider` | Context provider, manages help state |
| `TutorialOverlay` | Renders current step (spotlight or dialogue) |
| `HelpPanel` | On-demand "?" panel with quick refs |
| `HintToast` | Contextual hint popup |
| `SpotlightMask` | SVG overlay with cutout |
| `DialogueBubble` | Speech bubble with guide character |

## Integration Points

- **Screen entry**: Check if tutorial completed; if not, start it
- **HUD**: Persistent "?" button renders HelpPanel
- **Game events**: Engine dispatches hint triggers; hint system listens
- **Config location**: `src/config/help/<featureId>Help.ts`

## Feature Configs

Initial configs for all existing features:
- Battle (moves, combos, energy, HP)
- Trace Events (shield, power rune, answer, missing digit)
- Momentum (pieces, ranks, flash moments, fusion)
- Pet Care (feeding, needs, mood, evolution)
- Navigation (rooms, hotspots, mailbox)
- Math (problem types, hints, scoring)

## File Structure

```
src/
  types/help.ts                      # All help type definitions
  services/help/
    helpRegistry.ts                  # Registry + registration functions
    tutorialEngine.ts                # Tutorial step sequencing logic
    hintEngine.ts                    # Hint trigger matching + cooldown
  components/help/
    HelpProvider.tsx                 # React context provider
    TutorialOverlay.tsx              # Tutorial step renderer
    HelpPanel.tsx                    # On-demand help panel
    HintToast.tsx                    # Contextual hint toast
    SpotlightMask.tsx                # SVG spotlight overlay
    DialogueBubble.tsx               # Speech bubble component
    HelpButton.tsx                   # "?" HUD button
  config/help/
    battleHelp.ts
    traceHelp.ts
    momentumHelp.ts
    petCareHelp.ts
    navigationHelp.ts
    mathHelp.ts
    index.ts                         # Registers all configs
  engine/state/
    (extend existing reducer with help actions)
```
