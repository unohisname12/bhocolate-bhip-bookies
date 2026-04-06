export type PetState = 'idle' | 'sleeping' | 'hungry' | 'happy' | 'sick' | 'dead';
export type PetStage = 'egg' | 'baby' | 'juvenile' | 'adult' | 'elder';
export type PetMood = 'calm' | 'playful' | 'curious' | 'anxious' | 'angry';

export type PetNeeds = {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
};

export type PetStats = {
  strength: number;
  speed: number;
  defense: number;
};

export type PetProgression = {
  level: number;
  xp: number;
  evolutionFlags: string[];
};

// Egg lives here because it is the incubating stage of a pet
export type EggState = 'incubating' | 'ready' | 'hatched';

export interface Egg {
  id: string;
  type: string;
  state: EggState;
  progress: number;
  createdAt: string;
}

export type Pet = {
  id: string;
  ownerId: string;
  speciesId: string;
  name: string;
  type: string;
  stage: PetStage;
  mood: PetMood;
  state: PetState;
  needs: PetNeeds;
  stats: PetStats;
  bond: number;
  progression: PetProgression;
  graceTimer?: number; // ms timestamp when grace period started (health hit bottom)
  timestamps: {
    createdAt: string;
    lastInteraction: string;
    lastFedAt: string;
    lastCleanedAt: string;
    lastPlayedAt?: string;
    lastHealedAt?: string;
  };
};