import type { HelpConfig } from '../../types/help';

export const traceHelp: HelpConfig = {
  id: 'trace',
  name: 'Trace Events',
  icon: '/assets/generated/final/trace_icon.png',
  tutorial: [
    {
      id: 'trace-intro',
      text: 'Trace events are quick-time challenges during battle. Tracing shapes on screen gives you combat bonuses!',
      speaker: 'guide',
    },
    {
      id: 'trace-shield',
      text: 'When hit hard, a Shield Trace appears. Trace the circle to recover some of the damage!',
      speaker: 'guide',
    },
    {
      id: 'trace-rune',
      text: 'When your energy is high, a Power Rune trace may appear. Complete it to boost your next attack!',
      speaker: 'guide',
    },
    {
      id: 'trace-scoring',
      text: 'Accuracy matters! Perfect traces give the best bonuses. Good and Basic traces give less.',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Shield Trace',
      body: 'Appears after a heavy hit (>25% HP). Trace the circle to restore some HP. Better accuracy = more HP restored.',
    },
    {
      title: 'Power Rune',
      body: 'Appears when energy >= 60. Trace the shape to empower your next attack with a damage multiplier.',
    },
    {
      title: 'Trace the Answer',
      body: 'Trace multi-digit numbers to solve math problems during battle for a damage boost.',
    },
    {
      title: 'Scoring Tiers',
      body: 'Perfect (best bonus), Good (decent), Basic (small bonus), Miss (no effect). Stay within the trace path!',
    },
  ],
  hints: [
    {
      id: 'trace-first-shield',
      trigger: 'trace_shield_triggered',
      text: 'Trace the circle quickly! Better accuracy means more HP restored.',
      maxShows: 2,
      cooldown: 120000,
    },
  ],
};
