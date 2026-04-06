# App Knowledge

## Trace Event System

### What It Is

A combat mini-game system where players trace floating SVG paths during battle for tactical effects. Built as a modular, config-driven system with one shared trace engine powering all event types.

### Event Types (4 total)

| Type | Trigger | Effect | Status |
|------|---------|--------|--------|
| **Trace Shield** | Button appears after enemy heavy hit (>25% max HP) | Retroactive damage mitigation (heal-back) | Implemented |
| **Trace Power Rune** | Button during player turn when energy >= 60 | Next attack gets damage multiplier | Implemented |
| **Trace the Answer** | Math problem, trace the answer digits | Next attack gets damage multiplier | Implemented |
| **Trace the Missing Digit** | Missing digit equation, trace single digit | Next attack gets damage multiplier | Implemented |

### Architecture

```
Types:           src/types/trace.ts
Config:          src/config/traceConfig.ts         (paths, thresholds, multipliers)
Engine:          src/services/game/traceEngine.ts   (pure validation/scoring functions)
Hook:            src/hooks/useTraceInteraction.ts    (pointer capture, session management)
UI Components:   src/components/trace/               (TraceOverlay, TraceTargetPath, TracePlayerStroke, TraceHUD, TraceResultFlash)
Battle Wiring:   src/components/battle/TraceEventController.tsx  (orchestrator)
```

### How Validation Works

1. Target path is divided into N segments with generous hit radii
2. Player's pointer visits segments in approximate order (tolerance window of +/-4)
3. Completion% = visited segments / total segments
4. Tier: miss (<60-70%), basic (60-70%), good (75-85%), perfect (90-95%)
5. Thresholds vary by event type (shield is most generous)

### Scoring Tiers

| Tier | Damage Mult | Shield Reduction |
|------|-------------|-----------------|
| Miss | 1.0x | 0% |
| Basic | 1.3x | 30% |
| Good | 1.5x | 50% |
| Perfect | 2.0x | 80% |

### Engine Integration

- `ActiveBattleState.traceBuffs` holds active trace buffs
- 4 new action types: `TRACE_MATH_COMPLETE`, `TRACE_SHIELD_COMPLETE`, `TRACE_RUNE_COMPLETE`, `TRACE_EVENT_FAILED`
- `calcDamage()` in BattleSystem.ts reads trace buffs alongside existing `mathBuffActive`
- Buffs are one-shot: math/rune clear after player move, shield clears at round resolve
- Shield is retroactive: damage already applied, successful trace heals back a portion

### Brain Boost Compatibility

The existing Brain Boost (keyboard math input) is fully preserved. The single "Brain Boost" button has been replaced with a 3-option choice panel:
- **Type Answer** — original keyboard input flow (`MATH_BONUS_CORRECT`)
- **Trace Digit** — trace a single missing digit (`trace_missing_digit` → `TRACE_MATH_COMPLETE`)
- **Trace Answer** — trace multi-digit answer (`trace_answer` → `TRACE_MATH_COMPLETE`)

All three options grant a damage boost on the next attack. `TRACE_MATH_COMPLETE` also sets `mathBuffActive: true` for backward compatibility with the existing `calcDamage` logic.

### Files Modified

- `src/types/battle.ts` — Added `traceBuffs: TraceBuffState` to `ActiveBattleState`
- `src/engine/core/ActionTypes.ts` — Added 4 trace action types
- `src/engine/state/engineReducer.ts` — Added reducer cases for trace actions + battle log entries for each trace outcome
- `src/engine/systems/BattleSystem.ts` — Trace buff init, consumption in calcDamage, clearing in resolveRound
- `src/screens/BattleScreen.tsx` — Integrated TraceEventController with external start requests, Brain Boost choice panel (Type Answer / Trace Digit / Trace Answer), Power Rune button, rune & math trace buff indicators
- `src/animations.css` — Added trace CSS animations

### What Remains (Future Phases)

- **Unit tests**: Pure function tests for `traceEngine.ts` (buildSegments, updateSegmentProgress, calcCompletion, determineTier)
- **Polish**: Particle effects on perfect traces, screen shake on perfect, floating "+SHIELD!" / "+RUNE!" text
- **Difficulty scaling**: Math problem difficulty tied to battle/pet level instead of hardcoded `1`

### Manual Testing

1. Start a battle (go to outside room, click Practice)
2. **Rune trace**: When energy >= 60, a "Power Rune" button appears below the move buttons. Click it, trace the shape that appears (zigzag/spiral/line). Success gives a damage multiplier on next attack.
3. **Shield trace**: After an enemy heavy hit (>25% of your max HP), a "Shield!" button appears briefly in the arena. Click it quickly, trace the circle. Success heals back a portion of the damage.
4. **Trace Digit**: Click "Trace Digit" in the Brain Boost area. A missing-digit equation appears (e.g., "_ + 4 = 9 — Trace the 5!"). Trace the digit shape. Success boosts next attack.
5. **Trace Answer**: Click "Trace Answer" in the Brain Boost area. A math problem appears with multi-digit answer. Trace each digit in sequence. Success boosts next attack.
6. **Type Answer**: Click "Type Answer" for the original keyboard math input (backward compatible).
7. All trace types use generous hit areas — the validation is forgiving by design.

### E2E Tests

- `e2e/trace-events.spec.ts` — 6 tests covering trace overlay rendering, timer expiry, pointer interaction, all button options
- `e2e/battle-feedback.spec.ts` — 6 tests covering battle arena, attacks, Brain Boost choice panel
- Screenshots saved to `e2e/screenshots/trace-*.png`
