import type { HelpConfig } from '../../types/help';

export const mathHelp: HelpConfig = {
  id: 'math',
  name: 'Math Training',
  icon: '/assets/generated/final/math_icon.png',
  tutorial: [
    {
      id: 'math-intro',
      text: 'Math training sharpens your mind and earns rewards! Solve problems to gain tokens and battle tickets.',
      speaker: 'guide',
    },
    {
      id: 'math-types',
      text: 'You\'ll face different problem types: arithmetic, comparisons, missing numbers, and word problems.',
      speaker: 'guide',
    },
    {
      id: 'math-hints',
      text: 'Stuck? Some problems have hints. Look for the hint button if you need a nudge.',
      speaker: 'guide',
    },
    {
      id: 'math-streaks',
      text: 'Answer correctly in a row to build a streak! Longer streaks mean bigger rewards.',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Problem Types',
      body: 'Arithmetic (add, subtract, multiply), Comparisons (>, <, =), Missing Number (fill the blank), and Word Problems.',
    },
    {
      title: 'Difficulty',
      body: 'Problems scale with your pet\'s level. Harder problems give better rewards.',
    },
    {
      title: 'Hints',
      body: 'Some problems include hints. Using a hint costs a small token fee but helps you learn.',
    },
    {
      title: 'Battle Tickets',
      body: 'Solve 3 math problems to earn a battle ticket for PvP arena fights!',
    },
  ],
  hints: [
    {
      id: 'math-streak-3',
      trigger: 'math_streak_3',
      text: 'Nice streak! Keep it going for bonus rewards.',
      maxShows: 3,
      cooldown: 120000,
    },
  ],
};
