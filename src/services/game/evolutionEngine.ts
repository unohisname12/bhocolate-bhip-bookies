import type { Egg, Pet, PetState, PetStage } from '../../types';
import { EGG_CONFIG } from '../../config/gameConfig';

export const getXPForLevel = (level: number): number => Math.floor(100 * level * 1.5);

export const addXP = (pet: Pet, amount: number): Pet => {
  if (pet.state === 'dead') return pet;
  const newXP = pet.progression.xp + amount;
  const xpNeeded = getXPForLevel(pet.progression.level);
  if (newXP >= xpNeeded) {
    return {
      ...pet,
      progression: {
        ...pet.progression,
        level: pet.progression.level + 1,
        xp: newXP - xpNeeded,
        evolutionFlags: pet.progression.evolutionFlags,
      },
    };
  }
  return { ...pet, progression: { ...pet.progression, xp: newXP } };
};

export const EVOLUTION_REQUIREMENTS: Record<string, { level: number; bond: number; lifetimeMathCorrect: number }> = {
  juvenile: { level: 3, bond: 15, lifetimeMathCorrect: 10 },
  adult:    { level: 10, bond: 40, lifetimeMathCorrect: 30 },
  elder:    { level: 20, bond: 70, lifetimeMathCorrect: 80 },
};

const STAGE_ORDER: PetStage[] = ['baby', 'juvenile', 'adult', 'elder'];

export type EvolutionBlocker = 'level' | 'bond' | 'math' | null;

export const checkEvolution = (
  pet: Pet,
  lifetimeMathCorrect: number = 0,
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
  const canEvolve = levelOK && bondOK && mathOK;
  const blocker: EvolutionBlocker = canEvolve ? null : !levelOK ? 'level' : !bondOK ? 'bond' : 'math';
  return { canEvolve, nextStage: canEvolve ? nextStage : null, blocker, requirement: req };
};

export const evolvePet = (pet: Pet, lifetimeMathCorrect: number = 0): Pet => {
  const { canEvolve, nextStage } = checkEvolution(pet, lifetimeMathCorrect);
  if (!canEvolve || !nextStage) return pet;
  return {
    ...pet,
    stage: nextStage,
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
  if (egg.type === 'koala') petType = 'koala_sprite';

  const now = new Date().toISOString();
  return {
    id: `pet_${Date.now()}`,
    ownerId: 'player_1',
    speciesId: petType,
    name: 'New Pet',
    type: petType,
    stage: 'baby',
    mood: 'curious',
    state: 'idle' as PetState,
    needs: { health: 100, hunger: 100, happiness: 100, cleanliness: 100 },
    stats: { strength: 10, speed: 10, defense: 10 },
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
