import type { HandMode } from '../../types/interaction';

export type CareMode = Exclude<HandMode, 'idle'>;
export const CARE_PRESENTATION = {
  pet: { title: 'Little love notes', short: 'Pet & cuddle', instruction: 'Tap the hearts around your companion. Each gentle touch builds your friendship.', benefit: 'Bond · trust · happiness', color: '#f4a8ba', animation: 'being_petted', effect: 'heart', symbol: '♥' },
  wash: { title: 'Bubble bath', short: 'Wash', instruction: 'Rub each muddy patch until it sparkles. You can also tap or press Enter on a patch to clean it.', benefit: 'Cleanliness · happiness', color: '#85dce7', animation: 'being_washed', effect: 'bubble', symbol: '○' },
  brush: { title: 'A little glow-up', short: 'Brush', instruction: 'Swipe in the arrow’s direction. Arrow keys or the brush button work too.', benefit: 'Grooming · cleanliness · bond', color: '#c3b2f4', animation: 'being_brushed', effect: 'spark', symbol: '✦' },
  comfort: { title: 'A quiet moment', short: 'Comfort', instruction: 'Hold the comfort button and breathe slowly. Release whenever you like. Space or Enter works too.', benefit: 'Less stress · more trust', color: '#b9dbb0', animation: 'being_comforted', effect: 'heart', symbol: '♥' },
  train: { title: 'Follow the stars', short: 'Train', instruction: 'Tap the glowing star to guide your companion. Watch for its next spot!', benefit: 'Focus · bond · XP', color: '#f7ce7c', animation: 'being_trained', effect: 'spark', symbol: '✦' },
  play: { title: 'One more catch!', short: 'Play', instruction: 'Tap the ball to send it back to your companion. Every catch is a little celebration.', benefit: 'Happiness · bond', color: '#f3b783', animation: 'playing_with_hand', effect: 'spark', symbol: '●' },
} as const;

export const CARE_TARGETS = [[31, 38], [65, 37], [42, 59], [61, 62], [50, 29], [27, 58], [73, 52], [50, 65]] as const;
export const BRUSH_DIRECTIONS = ['right', 'down', 'left', 'up'] as const;
