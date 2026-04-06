import type { PlayerProfile, Pet } from '../../types';
import type { PetStage } from '../../types/pet';
import type { Classroom, ClassmateProfile, ActivityLevel } from '../../types/classroom';
import { PVP_CONFIG } from '../../config/pvpConfig';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn',
  'Avery', 'Jamie', 'Dakota', 'Skyler', 'Reese', 'Parker', 'Finley', 'Rowan',
  'Sage', 'Blair', 'Kai', 'Emery', 'Hayden', 'Drew', 'Tatum', 'Remy',
];

const PET_NAMES: Record<string, string[]> = {
  koala_sprite: ['Euccy', 'Snuggles', 'Koby', 'Misty', 'Bubbles', 'Fern'],
  slime_baby: ['Goo', 'Blobby', 'Squish', 'Jelly', 'Oozy', 'Splat'],
  mech_bot: ['Sparky', 'Bolt', 'Gear', 'Pixel', 'Chrome', 'Circuit'],
};

const CLASSROOM_NAMES = [
  "Room 101", "Room 204", "Room 312", "The Star Class",
  "Room 107", "Room 215", "The Explorer Class", "Room 110",
];

type Archetype = 'diligent' | 'casual' | 'competitive' | 'struggling';

interface ArchetypeConfig {
  activity: ActivityLevel;
  moodHint: 'thriving' | 'okay' | 'struggling';
  levelDriftMultiplier: number;
}

const ARCHETYPE_CONFIGS: Record<Archetype, ArchetypeConfig> = {
  diligent:    { activity: 'very_active', moodHint: 'thriving',   levelDriftMultiplier: 1.5 },
  casual:      { activity: 'moderate',    moodHint: 'okay',       levelDriftMultiplier: 0.6 },
  competitive: { activity: 'very_active', moodHint: 'thriving',   levelDriftMultiplier: 1.5 },
  struggling:  { activity: 'quiet',       moodHint: 'struggling', levelDriftMultiplier: 0.3 },
};

// Archetype distribution: ~25% diligent, ~35% casual, ~20% competitive, ~20% struggling
const ARCHETYPE_WEIGHTS: { archetype: Archetype; weight: number }[] = [
  { archetype: 'diligent',    weight: 0.25 },
  { archetype: 'casual',      weight: 0.60 },
  { archetype: 'competitive', weight: 0.80 },
  { archetype: 'struggling',  weight: 1.00 },
];

const createSeededRNG = (seed: number) => {
  let s = seed;
  return (): number => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

const gaussianRandom = (rng: () => number): number => {
  // Box-Muller transform
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(0.0001, u1))) * Math.cos(2 * Math.PI * u2);
};

const pickArchetype = (rng: () => number): Archetype => {
  const r = rng();
  for (const { archetype, weight } of ARCHETYPE_WEIGHTS) {
    if (r <= weight) return archetype;
  }
  return 'casual';
};

const stageFromLevel = (level: number): PetStage => {
  if (level >= 30) return 'elder';
  if (level >= 15) return 'adult';
  if (level >= 5) return 'juvenile';
  return 'baby';
};

const generateRecentDate = (rng: () => number): string => {
  const daysAgo = Math.floor(rng() * 3);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export const generateClassroom = (
  playerProfile: PlayerProfile,
  playerPet: Pet,
  seed?: number,
): { classroom: Classroom; classmates: ClassmateProfile[] } => {
  const rng = createSeededRNG(seed ?? Date.now());
  const classmateCount = PVP_CONFIG.minClassmates + Math.floor(rng() * (PVP_CONFIG.maxClassmates - PVP_CONFIG.minClassmates + 1));

  const speciesPool = ['koala_sprite', 'slime_baby', 'mech_bot'];
  const usedNames = new Set<string>();
  const classmates: ClassmateProfile[] = [];

  for (let i = 0; i < classmateCount; i++) {
    const levelOffset = Math.round(gaussianRandom(rng) * PVP_CONFIG.npcLevelVarianceStdDev);
    const level = Math.max(1, playerPet.progression.level + levelOffset);
    const species = speciesPool[Math.floor(rng() * speciesPool.length)];

    let name: string;
    do {
      name = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    } while (usedNames.has(name) && usedNames.size < FIRST_NAMES.length);
    usedNames.add(name);

    const archetype = pickArchetype(rng);
    const config = ARCHETYPE_CONFIGS[archetype];
    const petNamePool = PET_NAMES[species] ?? PET_NAMES.slime_baby;
    const petName = petNamePool[Math.floor(rng() * petNamePool.length)];

    classmates.push({
      id: `npc_${i}_${Math.floor(rng() * 100000)}`,
      displayName: name,
      petSnapshot: {
        name: petName,
        speciesId: species,
        stage: stageFromLevel(level),
        level,
        moodHint: config.moodHint,
      },
      activityIndicator: config.activity,
      lastActiveDate: generateRecentDate(rng),
      isNPC: true,
      matchHistory: [],
    });
  }

  const classroom: Classroom = {
    id: `classroom_${Date.now()}`,
    name: CLASSROOM_NAMES[Math.floor(rng() * CLASSROOM_NAMES.length)],
    createdAt: new Date().toISOString(),
    memberIds: [playerProfile.id, ...classmates.map(c => c.id)],
  };

  return { classroom, classmates };
};

const ACTIVITY_ORDER: ActivityLevel[] = ['quiet', 'moderate', 'active', 'very_active'];

const shiftActivity = (current: ActivityLevel, direction: 'up' | 'down'): ActivityLevel => {
  const idx = ACTIVITY_ORDER.indexOf(current);
  if (direction === 'up') return ACTIVITY_ORDER[Math.min(idx + 1, ACTIVITY_ORDER.length - 1)];
  return ACTIVITY_ORDER[Math.max(idx - 1, 0)];
};

export const refreshNPCClassmates = (
  classmates: ClassmateProfile[],
  _playerLevel: number,
  daysPassed: number,
): ClassmateProfile[] => {
  if (daysPassed <= 0) return classmates;

  return classmates.map(classmate => {
    if (!classmate.isNPC) return classmate;

    const activityXPMultiplier: Record<ActivityLevel, number> = {
      very_active: 1.5,
      active: 1.0,
      moderate: 0.6,
      quiet: 0.3,
    };

    const xpGained = daysPassed * 50 * activityXPMultiplier[classmate.activityIndicator];
    const xpPerLevel = 100 * classmate.petSnapshot.level * 1.5;
    const levelsGained = Math.floor(xpGained / Math.max(1, xpPerLevel));
    const newLevel = classmate.petSnapshot.level + levelsGained;

    // 10% chance per day of activity shift
    const activityShift = Math.random();
    let newActivity = classmate.activityIndicator;
    if (activityShift < 0.1 * daysPassed) newActivity = shiftActivity(classmate.activityIndicator, 'up');
    else if (activityShift < 0.2 * daysPassed) newActivity = shiftActivity(classmate.activityIndicator, 'down');

    const newMood = newActivity === 'very_active' || newActivity === 'active'
      ? 'thriving' as const
      : newActivity === 'moderate' ? 'okay' as const : 'struggling' as const;

    return {
      ...classmate,
      petSnapshot: {
        ...classmate.petSnapshot,
        level: Math.max(1, newLevel),
        stage: stageFromLevel(newLevel),
        moodHint: newMood,
      },
      activityIndicator: newActivity,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    };
  });
};
