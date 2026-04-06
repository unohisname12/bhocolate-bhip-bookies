# Interactive Scene Pass

## Interactive Objects

| Object | Room | Type | Behavior |
|--------|------|------|----------|
| House Door | Outside | Navigation | Click to enter house. Hover shows tooltip + arrow hint. |
| Mailbox | Outside | Interactive | Click to open mailbox popup. Pulsing gold indicator when reward available. Ambient sparkle. |
| Exit Door | Inside | Navigation | Click to go outside. Hover shows tooltip + arrow hint. |
| Fireplace | Inside | Interactive | Hover highlights. Warm glow ambient effect. (Future: rest/sleep interaction) |
| Bookshelf | Inside | Interactive | Hover highlights. (Future: lore/tips/achievements) |
| Window | Inside | Decorative+ | Ambient light glow effect. (Future: weather/time display) |

## Feedback Behaviors

- **Hover**: Subtle warm radial glow overlay + tooltip label with icon (dark panel, game UI style)
- **Click**: Scale-down press feedback (0.96), 150ms transition
- **Navigation doors**: Arrow hint icon (circle with direction arrow) on hover
- **Mailbox indicator**: Pulsing gold dot when unclaimed reward available
- **Mailbox sparkle**: Drifting sparkle particle near mailbox when reward waiting
- **Tooltips**: Fade-in from below, styled to match hotbar panel aesthetic

## House Entry/Exit

- **Outside**: Clicking the house door dispatches `CHANGE_ROOM` to `'inside'`
- **Inside**: Clicking the exit door dispatches `CHANGE_ROOM` to `'outside'`
- Original arrow navigation still works alongside door clicks
- Room dots still work as before

## Mailbox System

- Daily reward: base 15 tokens, +2 per lifetime claim (caps at 50)
- First-ever claim shows welcome message
- Popup styled as game UI card (dark gradient, gold reward display)
- Claim button triggers `CLAIM_MAILBOX` engine action
- State persisted: `MailboxState { lastClaimedDate, totalClaimed }`
- Save migration v4 -> v5 adds mailbox state to existing saves

## Environmental Life Effects

### Outside
- Sun rays: slow-rotating conic gradient near sun position
- Tree sway: extremely subtle scaleX oscillation (transform-origin: bottom)
- Flower sway: gentle 1-degree rotation on bottom flower strip

### Inside
- Fireplace glow: warm orange radial gradient with brightness flicker
- Window glow: soft blue-white light pulse through window area
- Clock pendulum: tiny highlight with 2-degree swing

All effects are CSS-only, no JS timers, performance-safe for school computers.

## Generated Assets

No new PixelLab assets were generated. All interaction feedback uses CSS effects (gradients, shadows, transforms). The existing scene backgrounds already contain well-painted objects (house, mailbox, fireplace, bookshelf, clock) that work perfectly as interactive hotspot targets.

## Gameplay Hooks Added

- `CLAIM_MAILBOX` action type in engine
- `MailboxState` on `EngineState` (persisted)
- Save migration v4 -> v5
- Hotspot system extensible for future objects

## Files Created

| File | Purpose |
|------|---------|
| `src/components/scene/InteractiveObjects.tsx` | Hotspot overlay with hover/click signals |
| `src/components/scene/MailboxPopup.tsx` | Mailbox reward popup modal |
| `src/components/scene/EnvironmentalLife.tsx` | Ambient scene life effects |
| `e2e/interactive-scene.spec.ts` | 9 Playwright tests for interactive scene |
| `INTERACTIVE_SCENE_PASS.md` | This document |

## Files Modified

| File | Change |
|------|--------|
| `src/components/scene/GameSceneShell.tsx` | Added InteractiveObjects, EnvironmentalLife, MailboxPopup layers |
| `src/types/engine.ts` | Added `MailboxState` interface and field on `EngineState` |
| `src/engine/core/ActionTypes.ts` | Added `CLAIM_MAILBOX` action |
| `src/engine/state/engineReducer.ts` | Added `CLAIM_MAILBOX` handler |
| `src/engine/state/createInitialEngineState.ts` | Added default `mailbox` field |
| `src/services/persistence/saveMigrations.ts` | Added v4->v5 migration, bumped version to 5 |
| `src/animations.css` | Added 12 new animation keyframes for scene interactions + environmental life |
| `src/App.tsx` | Passes `mailbox` state to GameSceneShell |

## Follow-up Ideas

1. **Fireplace rest**: Click fireplace to trigger a "rest" action that slowly restores pet health
2. **Bookshelf tips**: Click bookshelf to show game tips, lore entries, or achievement progress
3. **Window weather**: Show time-of-day or weather effects through the window
4. **Mailbox streaks**: Consecutive daily claims increase reward multiplier
5. **Garden patch**: Interactive flower garden outside for growing items
6. **Treehouse**: Clickable tree that opens a mini-game or training area
7. **Pet interaction zones**: Let the pet walk toward clicked objects
8. **Seasonal decorations**: Holiday-themed object overlays on the scene
