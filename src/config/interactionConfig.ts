import type { InteractionDef, HandMode } from '../types/interaction';

/**
 * Data-driven definitions for all 6 pet interactions.
 *
 * Adding a new interaction = adding a new entry here + registering the
 * HandMode in types/interaction.ts. No other code changes required.
 */
export const INTERACTION_DEFS: Record<Exclude<HandMode, 'idle'>, InteractionDef> = {
  // ── 1. Pet / Rub ──────────────────────────────────────────────────
  pet: {
    id: 'pet',
    name: 'Pet / Rub',
    description: 'Stroke or tap your pet to build affection.',
    icon: '/assets/generated/final/icon_heart.png',
    handAnimState: 'HAND_RUB',
    unlockRequirement: null, // always free
    cooldownMs: 3_000,
    durationMs: 0, // instant per tap, continuous for rub
    spamProtection: { maxPerMinute: 20 },
    statEffects: {
      bond: 8,
      happiness: 5,
      trust: 3,
    },
    economyCost: 0,
    toolTier: 0,
    textFeedback: {
      success: [
        'Mmm... that\'s nice~',
        'More please!',
        '*happy chirp*',
        'Right there...',
        '*leans into your hand*',
        'So warm...',
      ],
      neutral: [
        '*looks at you*',
        'Hmm?',
        '*blinks*',
      ],
      fail: [
        'I need a break~',
        'Too much!',
        '*pulls away gently*',
      ],
    },
    placeholderLabel: 'TODO: Pet happy nuzzle animation',
    moodModifiers: {
      playful: 1.3,
      calm: 1.0,
      curious: 1.1,
      anxious: 0.7,
      angry: 0.5,
    },
  },

  // ── 2. Wash ───────────────────────────────────────────────────────
  wash: {
    id: 'wash',
    name: 'Wash',
    description: 'Scrub your pet clean with soap and water.',
    icon: '/assets/generated/final/icon_clean.png',
    handAnimState: 'HAND_SCRUB',
    unlockRequirement: { kind: 'purchase', itemId: 'soap_kit' },
    cooldownMs: 30_000,
    durationMs: 10_000,
    spamProtection: { maxPerMinute: 3 },
    statEffects: {
      cleanliness: 30,
      happiness: 5,
      bond: 2,
    },
    economyCost: 5,
    toolTier: 0,
    textFeedback: {
      success: [
        'Squeaky clean!',
        'That feels refreshing',
        '*shakes off water*',
        'All sparkly now!',
      ],
      neutral: [
        '*tolerates the scrubbing*',
        'Fine...',
      ],
      fail: [
        'Not now!',
        '*dodges soap*',
        '*splashes angrily*',
      ],
    },
    placeholderLabel: 'TODO: Soap scrub loop animation',
    moodModifiers: {
      playful: 1.0,
      calm: 1.2,
      curious: 0.9,
      anxious: 0.5,
      angry: 0.3,
    },
  },

  // ── 3. Brush / Groom ──────────────────────────────────────────────
  brush: {
    id: 'brush',
    name: 'Brush / Groom',
    description: 'Brush your pet\'s coat for a clean, polished look.',
    icon: '/assets/generated/final/icon_clean.png',
    handAnimState: 'HAND_DRAG',
    unlockRequirement: { kind: 'purchase', itemId: 'brush_set' },
    cooldownMs: 20_000,
    durationMs: 8_000,
    spamProtection: { maxPerMinute: 4 },
    statEffects: {
      cleanliness: 15,
      bond: 8,
      groomingScore: 10,
      happiness: 3,
    },
    economyCost: 3,
    toolTier: 0,
    textFeedback: {
      success: [
        'So fluffy...',
        'Looking sharp!',
        '*purrs contentedly*',
        'Nice and smooth~',
      ],
      neutral: [
        '*sits still*',
        'Okay...',
      ],
      fail: [
        '*fidgets away*',
        'Too rough!',
        '*swats at brush*',
      ],
    },
    placeholderLabel: 'TODO: Brush fluff animation',
    moodModifiers: {
      playful: 1.0,
      calm: 1.2,
      curious: 0.9,
      anxious: 0.6,
      angry: 0.4,
    },
  },

  // ── 4. Comfort / Soothe ───────────────────────────────────────────
  comfort: {
    id: 'comfort',
    name: 'Comfort / Soothe',
    description: 'Gently hold and calm your pet when they\'re distressed.',
    icon: '/assets/generated/final/icon_heart.png',
    handAnimState: 'HAND_HOLD',
    unlockRequirement: null, // always free
    cooldownMs: 15_000,
    durationMs: 5_000,
    spamProtection: { maxPerMinute: 5 },
    statEffects: {
      stress: -20,
      trust: 10,
      bond: 5,
    },
    economyCost: 0,
    toolTier: 0,
    textFeedback: {
      success: [
        '...it\'s okay',
        'I\'m here.',
        '*deep breath*',
        '*relaxes*',
        'Feeling safer...',
      ],
      neutral: [
        '*looks up*',
        '...',
        '*blinks slowly*',
      ],
      fail: [
        '*too wound up*',
        '*still tense*',
      ],
    },
    placeholderLabel: 'TODO: Comfort settle animation',
    moodModifiers: {
      playful: 0.5,
      calm: 0.7,
      curious: 0.6,
      anxious: 2.0,
      angry: 1.5,
    },
  },

  // ── 5. Training ───────────────────────────────────────────────────
  train: {
    id: 'train',
    name: 'Training',
    description: 'Guide your pet through focus drills to build discipline.',
    icon: '/assets/generated/final/icon_energy.png',
    handAnimState: 'HAND_TAP',
    unlockRequirement: { kind: 'purchase', itemId: 'training_manual' },
    cooldownMs: 45_000,
    durationMs: 6_000,
    spamProtection: { maxPerMinute: 2 },
    statEffects: {
      discipline: 10,
      bond: 3,
      xp: 15,
    },
    economyCost: 8,
    toolTier: 0,
    textFeedback: {
      success: [
        'Good job!',
        'Focus up!',
        'Nice form!',
        '*determined look*',
        'Getting stronger!',
      ],
      neutral: [
        'Keep going...',
        '*tries hard*',
        'Almost...',
      ],
      fail: [
        'Let\'s try again...',
        '*distracted*',
        '*yawns*',
      ],
    },
    placeholderLabel: 'TODO: Training practice animation',
    moodModifiers: {
      playful: 1.2,
      calm: 1.0,
      curious: 1.1,
      anxious: 0.7,
      angry: 0.3,
    },
  },

  // ── 6. Play / Bond ────────────────────────────────────────────────
  play: {
    id: 'play',
    name: 'Play / Bond',
    description: 'Have fun together! Chase, boop, and bond.',
    icon: '/assets/generated/final/item_teddy_bear.png',
    handAnimState: 'HAND_RUB',
    unlockRequirement: null, // always free
    cooldownMs: 10_000,
    durationMs: 6_000,
    spamProtection: { maxPerMinute: 8 },
    statEffects: {
      happiness: 15,
      bond: 5,
    },
    economyCost: 0,
    toolTier: 0,
    textFeedback: {
      success: [
        'Wheee!',
        '*excited hop*',
        'Again again!',
        'So fun!',
        '*bounces around*',
      ],
      neutral: [
        '*watches hand*',
        'Hm?',
        '*tilts head*',
      ],
      fail: [
        '*too tired*',
        '*hides*',
        'Not in the mood...',
      ],
    },
    placeholderLabel: 'TODO: Play chase animation',
    moodModifiers: {
      playful: 1.3,
      calm: 1.0,
      curious: 1.2,
      anxious: 0.5,
      angry: 0.3,
    },
  },
};

/** All interaction IDs in display order. */
export const INTERACTION_ORDER: Exclude<HandMode, 'idle'>[] = [
  'pet', 'wash', 'brush', 'comfort', 'train', 'play',
];

/** Streak bonus multipliers at consecutive interaction thresholds. */
export const STREAK_BONUSES: { threshold: number; multiplier: number }[] = [
  { threshold: 3, multiplier: 1.2 },
  { threshold: 5, multiplier: 1.5 },
  { threshold: 8, multiplier: 2.0 },
];

/** After this many uses within SPAM_WINDOW_MS, gains are halved. */
export const SPAM_DIMINISH_THRESHOLD = 10;
export const SPAM_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
