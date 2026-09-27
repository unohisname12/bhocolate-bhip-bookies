import type { HandMode } from '../../types/interaction';
import type { SkillReview } from '../../types/woodland';

// Every chip is pre-approved, so any combination is safe to show classmates without teacher review.
export const NAME_FIRST = ['', 'Captain', 'Sir', 'Lady', 'Professor', 'Little', 'Big', 'Sparkly', 'Mighty', 'Sleepy', 'Brave', 'Lucky',
  'Cosmic', 'Tiny', 'Fuzzy', 'Swift', 'Golden', 'Silver', 'Starry', 'Sunny', 'Misty', 'Jolly', 'Clever', 'Noble', 'Zippy'] as const;
export const NAME_SECOND = ['Waffles', 'Biscuit', 'Pickles', 'Sprout', 'Comet', 'Pebble', 'Mango', 'Noodle', 'Pepper', 'Maple', 'Nugget',
  'Ziggy', 'Boots', 'Echo', 'Blaze', 'Nimbus', 'Dash', 'Rocket', 'Sparky', 'Thunder', 'Button', 'Jelly', 'Crumpet', 'Taco', 'Pixel',
  'Orbit', 'Clover', 'Juniper', 'Marble', 'Toffee'] as const;
export const MOVE_FIRST = ['Waffle', 'Thunder', 'Star', 'Moon', 'Leaf', 'Bubble', 'Comet', 'Sparkle', 'Shadow', 'Crystal', 'Rainbow',
  'Blizzard', 'Volcano', 'Tornado', 'Pixel', 'Number', 'Fraction', 'Rocket'] as const;
export const MOVE_SECOND = ['Blast', 'Strike', 'Pounce', 'Spin', 'Crash', 'Zap', 'Swipe', 'Burst', 'Dash', 'Slam', 'Whirl', 'Beam',
  'Stomp', 'Wave', 'Boom', 'Flurry'] as const;
export const PERSONALITIES = ['playful', 'sleepy', 'proud'] as const;
export const SNACKS = ['apple', 'bread', 'berry', 'carrot', 'meat', 'cheese', 'cake', 'honey'] as const;
export const ACTIVITIES = ['pet', 'wash', 'brush', 'comfort', 'train', 'play'] as const satisfies readonly HandMode[];
export const EMOTES = ['cheer', 'wave', 'wow', 'think', 'gg', 'heart'] as const;

export type NameFirst = typeof NAME_FIRST[number];
export type NameSecond = typeof NAME_SECOND[number];
export type MoveFirst = typeof MOVE_FIRST[number];
export type MoveSecond = typeof MOVE_SECOND[number];
export type Personality = typeof PERSONALITIES[number];
export type Snack = typeof SNACKS[number];
export type Activity = typeof ACTIVITIES[number];
export type Emote = typeof EMOTES[number];

export const EMOTE_LABELS: Record<Emote, { icon: string; text: string }> = {
  cheer: { icon: '🎉', text: 'Let’s go!' }, wave: { icon: '👋', text: 'Hi!' }, wow: { icon: '😮', text: 'Wow!' },
  think: { icon: '🤔', text: 'Thinking…' }, gg: { icon: '🤝', text: 'Good game!' }, heart: { icon: '💖', text: 'Nice one!' },
};
export const PERSONALITY_LABELS: Record<Personality, { title: string; help: string }> = {
  playful: { title: 'Playful', help: 'Bounces with happy wiggles while waiting.' },
  sleepy: { title: 'Sleepy', help: 'Moves slowly and sneaks in little naps.' },
  proud: { title: 'Proud', help: 'Stands tall and shows off its training.' },
};
export const ACTIVITY_LABELS: Record<Activity, string> = { pet: 'Petting', wash: 'Bath time', brush: 'Brushing', comfort: 'Cuddles', train: 'Training', play: 'Playing' };

export interface PetIdentity {
  /** 'typed' means a teacher-approved name, which lives only on the server and is never trusted from a save. */
  nameSource?: 'species' | 'chips' | 'typed';
  nameWords?: [NameFirst, NameSecond];
  moveWords?: [MoveFirst, MoveSecond];
  personality?: Personality;
  snack?: Snack;
  activity?: Activity;
  title?: TitleId;
}

export const TITLES = {
  solver: { label: 'the Problem Solver', how: 'Solve 25 math problems' },
  knight: { label: 'the Number Knight', how: 'Solve 100 math problems' },
  champion: { label: 'the Math Champion', how: 'Solve 250 math problems' },
  legend: { label: 'Legend of Numbers', how: 'Solve 500 math problems' },
  counting: { label: 'the Counting Star', how: 'Master counting' },
  sums: { label: 'the Sum Seeker', how: 'Master addition' },
  difference: { label: 'the Difference Maker', how: 'Master subtraction' },
  multiplier: { label: 'the Multiplier', how: 'Master multiplication' },
  sharer: { label: 'the Fair Sharer', how: 'Master division' },
  factors: { label: 'the Factor Finder', how: 'Master factors' },
  decimals: { label: 'the Decimal Diver', how: 'Master decimals' },
  fractions: { label: 'the Fraction Tamer', how: 'Master fractions' },
  ratios: { label: 'the Ratio Ranger', how: 'Master ratios or percentages' },
  integers: { label: 'the Integer Ace', how: 'Master signed integers' },
  equations: { label: 'the Equation Explorer', how: 'Master equations' },
  shapes: { label: 'the Shape Sage', how: 'Master a geometry skill' },
  explorer: { label: 'the Skill Explorer', how: 'Master any other skill' },
} as const;
export type TitleId = keyof typeof TITLES;

const SOLVED: [TitleId, number][] = [['solver', 25], ['knight', 100], ['champion', 250], ['legend', 500]];
const TOPIC_TITLES: [RegExp, TitleId][] = [
  [/count/i, 'counting'], [/addition/i, 'sums'], [/subtraction/i, 'difference'], [/multiplication/i, 'multiplier'],
  [/division/i, 'sharer'], [/factor/i, 'factors'], [/decimal/i, 'decimals'], [/fraction/i, 'fractions'],
  [/ratio|percent|proportion/i, 'ratios'], [/integer/i, 'integers'], [/equation|slope|linear|quadratic/i, 'equations'],
  [/pythag|geometr|area|angle|volume|shape/i, 'shapes'],
];
/** A skill counts as mastered once it was answered independently on two separate days (spaced review). */
export const MASTERED_CHECKS = 2;

export function earnedTitles(correct: number, reviews: readonly SkillReview[] = []): TitleId[] {
  const earned = new Set<TitleId>(SOLVED.filter(([, n]) => correct >= n).map(([id]) => id));
  for (const r of reviews) if (r.independentChecks >= MASTERED_CHECKS) earned.add(TOPIC_TITLES.find(([re]) => re.test(r.topic))?.[1] ?? 'explorer');
  return (Object.keys(TITLES) as TitleId[]).filter(id => earned.has(id));
}

export const chipName = (words: readonly string[]) => words.filter(Boolean).join(' ');
export const moveName = (identity?: PetIdentity) => identity?.moveWords ? chipName(identity.moveWords) : null;

/** The one place a pet's display name is decided; the server runs this before anything reaches classmates. */
export function resolvePetName(identity: PetIdentity | undefined, speciesName: string, approved?: string | null): string {
  if (identity?.nameSource === 'typed' && approved) return approved;
  if (identity?.nameSource === 'chips' && identity.nameWords) return chipName(identity.nameWords);
  return speciesName;
}

export function petTitle(identity: PetIdentity | undefined, correct: number, reviews?: readonly SkillReview[]): string | null {
  const t = identity?.title;
  return t && earnedTitles(correct, reviews).includes(t) ? TITLES[t].label : null;
}
