import type { Egg, Pet, PetState, PetStage } from '../../types';
import { EGG_CONFIG } from '../../config/gameConfig';
import { COMPANIONS, companionForEgg } from '../../config/companionConfig';
import { careProgress, getGrowth } from './petGrowth';

export const getXPForLevel = (level: number): number => Math.floor(100 * level * 1.5);

export const addXP = (pet: Pet, amount: number): Pet => {
  if (pet.state === 'dead' || !Number.isFinite(amount) || amount <= 0) return pet;
  const total = pet.progression.xp + amount;
  const initial = Math.max(1, pet.progression.level);
  // Sum of the level costs (150 * level); handles many level-ups without a long loop.
  const level = Math.floor((1 + Math.sqrt((2 * initial - 1) ** 2 + 8 * total / 150)) / 2);
  const spent = 75 * (level * (level - 1) - initial * (initial - 1));
  return { ...pet, progression: { ...pet.progression, level, xp: total - spent } };
};

export const EVOLUTION_REQUIREMENTS: Record<string, { level: number; bond: number; lifetimeMathCorrect: number }> = {
  juvenile: { level: 3, bond: 15, lifetimeMathCorrect: 10 },
  adult:    { level: 10, bond: 40, lifetimeMathCorrect: 30 },
};

const STAGE_ORDER: PetStage[] = ['baby', 'juvenile', 'adult'];

export type EvolutionBlocker = 'level' | 'bond' | 'math' | 'age' | 'care' | 'health' | null;

export const checkEvolution = (
  pet: Pet,
  lifetimeMathCorrect: number = 0,
  now: number = Date.now(),
): { canEvolve: boolean; nextStage: PetStage | null; blocker: EvolutionBlocker; requirement?: { level: number; bond: number; lifetimeMathCorrect: number } } => {
  const currentIdx = STAGE_ORDER.indexOf(pet.stage);
  if (currentIdx < 0 || currentIdx >= STAGE_ORDER.length - 1) {
    return { canEvolve: false, nextStage: null, blocker: null };
  }
  const nextStage = STAGE_ORDER[currentIdx + 1];
  const req = EVOLUTION_REQUIREMENTS[nextStage];
  if (!req) return { canEvolve: false, nextStage: null, blocker: null };
  const levelOK = pet.progression.level >= req.level;
  const bondOK = pet.bond >= req.bond;
  const mathOK = lifetimeMathCorrect >= req.lifetimeMathCorrect;
  const progress = careProgress(pet, now);
  const ageOK = pet.stage === 'baby' ? progress.ageDays >= 7 : progress.stageDays >= 7;
  const careOK = progress.days >= (pet.stage === 'baby' ? 7 : 14);
  const healthy = pet.state !== 'dead' && pet.needs.health > 0;
  const canEvolve = levelOK && bondOK && mathOK && ageOK && careOK && healthy;
  const blocker: EvolutionBlocker = canEvolve ? null : !healthy ? 'health' : !ageOK ? 'age' : !careOK ? 'care' : !levelOK ? 'level' : !bondOK ? 'bond' : 'math';
  return { canEvolve, nextStage: canEvolve ? nextStage : null, blocker, requirement: req };
};

export const evolvePet = (pet: Pet, lifetimeMathCorrect: number = 0, now = Date.now()): Pet => {
  const { canEvolve, nextStage } = checkEvolution(pet, lifetimeMathCorrect, now);
  if (!canEvolve || !nextStage) return pet;
  return {
    ...pet,
    stage: nextStage,
    growth: { ...getGrowth(pet, now), stageStartedAt: now },
    stats: {
      strength: Math.floor(pet.stats.strength * 1.3),
      speed: Math.floor(pet.stats.speed * 1.3),
      defense: Math.floor(pet.stats.defense * 1.3),
    },
    progression: {
      ...pet.progression,
      evolutionFlags: [...pet.progression.evolutionFlags, `evolved_to_${nextStage}`],
    },
  };
};

export const interactWithEgg = (egg: Egg, amount: number): Egg => {
  if (egg.state === 'ready') return egg;
  const newProgress = Math.min(EGG_CONFIG.maxProgress, egg.progress + amount);
  const newState = newProgress >= EGG_CONFIG.maxProgress ? 'ready' : 'incubating';
  return { ...egg, progress: newProgress, state: newState };
};

export const hatchEgg = (egg: Egg): Pet | null => {
  if (egg.state !== 'ready') return null;

  let petType = 'slime_baby';
  if (egg.type === 'mech') petType = 'mech_bot';
  if (egg.type === 'subtrak') petType = 'subtrak';
  if (egg.type === 'koala') petType = 'koala_sprite';
  const companion = companionForEgg(egg.type);
  if (companion) petType = companion;

  const now = new Date().toISOString();
  return {
    id: `pet_${Date.now()}`,
    ownerId: 'player_1',
    speciesId: petType,
    name: companion ? COMPANIONS[companion].name : 'New Pet',
    type: petType,
    stage: 'baby',
    mood: 'curious',
    state: 'idle' as PetState,
    needs: { health: 100, hunger: 100, happiness: 100, cleanliness: 100 },
    stats: companion ? { ...COMPANIONS[companion].stats } : { strength: 10, speed: 10, defense: 10 },
    growth: { startedAt: Date.now(), stageStartedAt: Date.now(), careDays: [] },
    bond: 0,
    progression: { level: 1, xp: 0, evolutionFlags: [] },
    timestamps: {
      createdAt: now,
      lastInteraction: now,
      lastFedAt: now,
      lastCleanedAt: now,
    },
  };
};
