import type { PetType } from './assetManifest';
import type { PetStage, PetStats } from '../types';

export interface EvolutionRequirements {
  toJuvenile: { level: number; bond: number };
  toAdult: { level: number; bond: number };
  toElder: { level: number; bond: number };
}

export interface StageConfig {
  spriteKey: PetType;
  statMultiplier: number;
}

export interface DecayModifiers {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
}

export interface CarePreferences {
  feed: number;
  play: number;
  clean: number;
  heal: number;
}

export interface SpeciesConfig {
  id: string;
  name: string;
  description: string;
  assetKey: PetType;
  baseStats: PetStats;
  decayModifiers: DecayModifiers;
  carePreferences: CarePreferences;
  evolutionRequirements: EvolutionRequirements;
  stages: Partial<Record<PetStage, StageConfig>>;
  quizOutcomeAffinity?: 'creative' | 'logical' | 'balanced';
}

export const SPECIES_CONFIG: Record<string, SpeciesConfig> = {
  koala_sprite: {
    id: 'koala_sprite',
    name: 'Blue Koala',
    description: 'Balanced and easygoing. Great for beginners.',
    assetKey: 'koala_sprite',
    baseStats: { strength: 11, speed: 10, defense: 12 },
    decayModifiers: { hunger: 1.0, happiness: 1.0, cleanliness: 1.0, health: 1.0 },
    carePreferences: { feed: 1.0, play: 1.0, clean: 1.0, heal: 1.0 },
    evolutionRequirements: {
      toJuvenile: { level: 5, bond: 20 },
      toAdult: { level: 15, bond: 50 },
      toElder: { level: 30, bond: 80 },
    },
    stages: {
      baby: { spriteKey: 'koala_sprite', statMultiplier: 1.0 },
      juvenile: { spriteKey: 'koala_sprite', statMultiplier: 1.3 },
      adult: { spriteKey: 'koala_sprite', statMultiplier: 1.8 },
      elder: { spriteKey: 'koala_sprite', statMultiplier: 2.4 },
    },
    quizOutcomeAffinity: 'balanced',
  },
  slime_baby: {
    id: 'slime_baby',
    name: 'Slime',
    description: 'Loves to play. Low cleanliness decay, prefers play care.',
    assetKey: 'slime_baby',
    baseStats: { strength: 8, speed: 15, defense: 8 },
    decayModifiers: { hunger: 1.0, happiness: 0.8, cleanliness: 0.6, health: 1.0 },
    carePreferences: { feed: 1.0, play: 1.3, clean: 0.8, heal: 1.0 },
    evolutionRequirements: {
      toJuvenile: { level: 5, bond: 20 },
      toAdult: { level: 15, bond: 50 },
      toElder: { level: 30, bond: 80 },
    },
    stages: {
      baby: { spriteKey: 'slime_baby', statMultiplier: 1.0 },
      juvenile: { spriteKey: 'slime_baby', statMultiplier: 1.3 },
      adult: { spriteKey: 'slime_baby', statMultiplier: 1.8 },
    },
    quizOutcomeAffinity: 'creative',
  },
  mech_bot: {
    id: 'mech_bot',
    name: 'Mech Bot',
    description: 'No hunger decay. High cleanliness decay. Prefers clean care.',
    assetKey: 'mech_bot',
    baseStats: { strength: 14, speed: 9, defense: 16 },
    decayModifiers: { hunger: 0.0, happiness: 1.0, cleanliness: 1.8, health: 0.8 },
    carePreferences: { feed: 0.3, play: 1.0, clean: 1.4, heal: 1.2 },
    evolutionRequirements: {
      toJuvenile: { level: 7, bond: 25 },
      toAdult: { level: 18, bond: 55 },
      toElder: { level: 35, bond: 85 },
    },
    stages: {
      baby: { spriteKey: 'mech_bot', statMultiplier: 1.0 },
      juvenile: { spriteKey: 'mech_bot', statMultiplier: 1.4 },
      adult: { spriteKey: 'mech_bot', statMultiplier: 2.0 },
    },
    quizOutcomeAffinity: 'logical',
  },
  subtrak: {
    id: 'subtrak',
    name: 'Subtrak',
    description: 'A calm creature that restores balance by removing what doesn\'t belong. Specializes in precision and energy drain.',
    assetKey: 'subtrak',
    baseStats: { strength: 10, speed: 12, defense: 14 },
    decayModifiers: { hunger: 0.9, happiness: 1.1, cleanliness: 0.8, health: 0.9 },
    carePreferences: { feed: 0.9, play: 0.8, clean: 1.2, heal: 1.3 },
    evolutionRequirements: {
      toJuvenile: { level: 5, bond: 22 },
      toAdult: { level: 16, bond: 52 },
      toElder: { level: 32, bond: 82 },
    },
    stages: {
      baby: { spriteKey: 'subtrak', statMultiplier: 1.0 },
      juvenile: { spriteKey: 'subtrak', statMultiplier: 1.3 },
      adult: { spriteKey: 'subtrak', statMultiplier: 1.9 },
      elder: { spriteKey: 'subtrak', statMultiplier: 2.5 },
    },
    quizOutcomeAffinity: 'logical',
  },
};

export const getSpeciesForQuizOutcome = (outcome: 'creative' | 'logical' | 'balanced'): string => {
  const match = Object.values(SPECIES_CONFIG).find((s) => s.quizOutcomeAffinity === outcome);
  return match?.id ?? 'koala_sprite';
};
