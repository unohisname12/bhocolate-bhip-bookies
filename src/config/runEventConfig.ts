import type { RunBonuses } from '../types/run';

export interface RunEventChoice {
  label: string;
  description: string;
  effectDescription: string; // shown after choice is made
}

export interface RunEventEffect {
  hpDelta: number;           // fraction: +0.05 = heal 5%, -0.10 = lose 10%
  bonusMod?: (b: RunBonuses) => RunBonuses;
  revealBoss?: boolean;      // shows boss passive in event outcome
}

export interface RunEventTemplate {
  id: string;
  title: string;
  description: string;
  choices: RunEventChoice[];
  /** Resolve a choice into its effect. Index matches choices array. */
  resolve: (choiceIndex: number, seed: number) => RunEventEffect;
}

// --- Event definitions ---

const equationCache: RunEventTemplate = {
  id: 'equation_cache',
  title: 'Equation Fragment Cache',
  description: 'You discover a cluster of dormant equation fragments, pulsing faintly with residual energy.',
  choices: [
    {
      label: 'Absorb Them',
      description: 'Draw the fragments into your Auralith.',
      effectDescription: 'The fragments merge with your Auralith — power gained, but the strain is real.',
    },
    {
      label: 'Leave Them',
      description: 'Let the fragments stabilize the surrounding area.',
      effectDescription: 'The area calms. Your Auralith mends slightly in the quiet.',
    },
  ],
  resolve: (choiceIndex) => {
    if (choiceIndex === 0) {
      // Absorb: gain +3 stat bonus, lose 10% HP
      return {
        hpDelta: -0.10,
        bonusMod: (b) => ({ ...b, statBonus: b.statBonus + 3 }),
      };
    }
    // Leave: gain 5% HP
    return { hpDelta: 0.05 };
  },
};

const fracturedMirror: RunEventTemplate = {
  id: 'fractured_mirror',
  title: 'Fractured Mirror',
  description: 'A reflective surface shimmers ahead, showing your Auralith\'s structural pattern in unsettling detail.',
  choices: [
    {
      label: 'Study the Reflection',
      description: 'Examine your Auralith\'s weaknesses closely.',
      effectDescription: 'The mirror reveals deep structure. Your strongest attribute crystallizes further.',
    },
    {
      label: 'Shatter It',
      description: 'Destroy the mirror. Some things are better unknown.',
      effectDescription: 'Glass scatters. Nothing changes — but nothing was risked.',
    },
  ],
  resolve: (choiceIndex, seed) => {
    if (choiceIndex === 0) {
      // Study: gain +5 stat bonus (high reward for the "risky" choice)
      return {
        hpDelta: 0,
        bonusMod: (b) => ({ ...b, statBonus: b.statBonus + 5 }),
      };
    }
    // Shatter: safe, no effect
    return { hpDelta: 0 };
  },
};

const unstableGround: RunEventTemplate = {
  id: 'unstable_ground',
  title: 'Unstable Ground',
  description: 'The path ahead crackles with raw equation energy. Crossing it will hurt, but you can feel power in the instability.',
  choices: [
    {
      label: 'Push Through',
      description: 'Endure the instability for its power.',
      effectDescription: 'The energy sears through your Auralith — painful, but you emerge stronger.',
    },
    {
      label: 'Find Another Way',
      description: 'Circle around. No cost, no reward.',
      effectDescription: 'You take the long way. Safe, but unchanged.',
    },
  ],
  resolve: (choiceIndex) => {
    if (choiceIndex === 0) {
      // Push: lose 15% HP, gain +3 to all stats
      return {
        hpDelta: -0.15,
        bonusMod: (b) => ({ ...b, statBonus: b.statBonus + 3 }),
      };
    }
    return { hpDelta: 0 };
  },
};

const resonanceWell: RunEventTemplate = {
  id: 'resonance_well',
  title: 'Resonance Well',
  description: 'Your Auralith feels a deep harmonic pull from a well of concentrated equation energy.',
  choices: [
    {
      label: 'Attune',
      description: 'Let your Auralith resonate with the well.',
      effectDescription: 'Harmonic energy washes over you. Your Auralith feels revitalized.',
    },
    {
      label: 'Walk Away',
      description: 'The pull is suspicious. Better to move on.',
      effectDescription: 'You resist the pull. The well fades behind you.',
    },
  ],
  resolve: (choiceIndex) => {
    if (choiceIndex === 0) {
      // Attune: heal 10% HP + gain energy regen
      return {
        hpDelta: 0.10,
        bonusMod: (b) => ({ ...b, energyRegenBonus: b.energyRegenBonus + 1 }),
      };
    }
    return { hpDelta: 0 };
  },
};

const structuralEcho: RunEventTemplate = {
  id: 'structural_echo',
  title: 'Structural Echo',
  description: 'An echo of a previous Linker\'s journey lingers here. Their memories offer foresight — and a small comfort.',
  choices: [
    {
      label: 'Listen to the Echo',
      description: 'Absorb the Linker\'s knowledge of what lies ahead.',
      effectDescription: 'The echo whispers of the boss ahead. You feel its patterns imprint on your mind.',
    },
    {
      label: 'Pay Respects',
      description: 'Honor the fallen Linker. Their residual energy stabilizes yours.',
      effectDescription: 'A moment of silence. Your Auralith steadies itself in the reverence.',
    },
  ],
  resolve: (choiceIndex) => {
    if (choiceIndex === 0) {
      // Listen: reveal boss passive + heal 5%
      return { hpDelta: 0.05, revealBoss: true };
    }
    // Respects: heal 8%
    return { hpDelta: 0.08 };
  },
};

// --- All events ---

export const RUN_EVENTS: RunEventTemplate[] = [
  equationCache,
  fracturedMirror,
  unstableGround,
  resonanceWell,
  structuralEcho,
];

export const getEventById = (id: string): RunEventTemplate | undefined =>
  RUN_EVENTS.find(e => e.id === id);

/** Pick a random event for a map node using a seed-derived index. */
export const getEventForNode = (index: number): RunEventTemplate =>
  RUN_EVENTS[index % RUN_EVENTS.length];
