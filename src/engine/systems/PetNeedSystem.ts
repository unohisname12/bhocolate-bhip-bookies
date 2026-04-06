import type { Pet } from '../../types';
import { DECAY_RATES, GRACE_PERIOD_MS } from '../../config/gameConfig';
import { SPECIES_CONFIG } from '../../config/speciesConfig';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export const applyPetDecay = (pet: Pet, deltaMs: number): Pet => {
  if (pet.state === 'dead') return pet;

  const decayFactor = deltaMs / 60000;
  const species = SPECIES_CONFIG[pet.speciesId];
  const dm = species?.decayModifiers ?? { hunger: 1, happiness: 1, cleanliness: 1, health: 1 };

  // Cross-need multipliers
  const hungerMultiplier = pet.needs.happiness < 20 ? 1.3 : 1.0;
  const healthMultiplier = pet.needs.hunger < 20 ? 2.0 : pet.needs.cleanliness < 20 ? 1.5 : 1.0;

  const newHunger = clamp(pet.needs.hunger - (DECAY_RATES.hunger / 5) * decayFactor * hungerMultiplier * dm.hunger);
  const newHappiness = clamp(pet.needs.happiness - (DECAY_RATES.happiness / 3.333) * decayFactor * dm.happiness);
  const newCleanliness = clamp(pet.needs.cleanliness - (DECAY_RATES.cleanliness / 7.5) * decayFactor * dm.cleanliness);
  const rawHealth = pet.needs.health - (DECAY_RATES.health / 5) * decayFactor * healthMultiplier * dm.health;

  // Grace period: clamp health to 1 minimum; track when it bottomed out
  const now = Date.now();
  let newHealth = clamp(rawHealth);
  let graceTimer = pet.graceTimer;

  if (rawHealth <= 1) {
    newHealth = 1;
    if (!graceTimer) {
      graceTimer = now;
    } else if (now - graceTimer > GRACE_PERIOD_MS) {
      newHealth = 0;
    }
  } else {
    graceTimer = undefined;
  }

  return {
    ...pet,
    graceTimer,
    needs: {
      hunger: newHunger,
      happiness: newHappiness,
      cleanliness: newCleanliness,
      health: newHealth,
    },
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
    },
  };
};

export const applyCatchUpDecay = (pet: Pet, lastUpdateMs: number): Pet => {
  const now = Date.now();
  const elapsed = Math.min(now - lastUpdateMs, 24 * 60 * 60 * 1000);
  if (elapsed <= 0) return pet;
  return applyPetDecay(pet, elapsed);
};

export const applyPetFeed = (pet: Pet, nutrition: number): Pet => {
  const pref = SPECIES_CONFIG[pet.speciesId]?.carePreferences?.feed ?? 1.0;
  return {
    ...pet,
    needs: {
      ...pet.needs,
      hunger: clamp(pet.needs.hunger + nutrition * pref),
      happiness: clamp(pet.needs.happiness + nutrition * 0.2 * pref),
    },
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
      lastFedAt: new Date().toISOString(),
    },
  };
};

export const applyPetClean = (pet: Pet, amount: number): Pet => {
  const pref = SPECIES_CONFIG[pet.speciesId]?.carePreferences?.clean ?? 1.0;
  return {
    ...pet,
    needs: {
      ...pet.needs,
      cleanliness: clamp(pet.needs.cleanliness + amount * pref),
      happiness: clamp(pet.needs.happiness + amount * 0.1 * pref),
    },
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
      lastCleanedAt: new Date().toISOString(),
    },
  };
};

export const applyPetPlay = (pet: Pet, amount: number): Pet => {
  const pref = SPECIES_CONFIG[pet.speciesId]?.carePreferences?.play ?? 1.0;
  return {
    ...pet,
    needs: {
      ...pet.needs,
      happiness: clamp(pet.needs.happiness + amount * pref),
      hunger: clamp(pet.needs.hunger - amount * 0.2),
    },
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
    },
  };
};

export const applyMoodBoost = (pet: Pet, amount: number): Pet => {
  const pref = SPECIES_CONFIG[pet.speciesId]?.carePreferences?.heal ?? 1.0;
  return {
    ...pet,
    needs: {
      ...pet.needs,
      happiness: clamp(pet.needs.happiness + amount * pref),
      health: clamp(pet.needs.health + amount * 0.2 * pref),
    },
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
      lastHealedAt: new Date().toISOString(),
    },
  };
};
