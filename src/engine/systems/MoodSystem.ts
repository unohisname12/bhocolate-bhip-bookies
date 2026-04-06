import type { Pet } from '../../types';
import { PET_STATE_THRESHOLDS } from '../../config/gameConfig';

export const evaluatePetMood = (pet: Pet): Pet => {
  const { hunger, happiness, cleanliness, health } = pet.needs;

  // Preserve locked states — these are set/cleared by explicit actions,
  // never overridden by needs-based evaluation.
  if (pet.state === 'dead') return pet;
  if (pet.state === 'sleeping') {
    // Stay asleep but allow urgent crises to wake the pet
    if (health <= PET_STATE_THRESHOLDS.sick) {
      return { ...pet, state: 'sick', mood: 'anxious' };
    }
    return pet;
  }

  let newState = pet.state;
  let newMood = pet.mood;

  if (health <= PET_STATE_THRESHOLDS.sick) {
    newState = 'sick';
    newMood = 'anxious';
  } else if (hunger <= PET_STATE_THRESHOLDS.hungry) {
    newState = 'hungry';
    newMood = 'anxious';
  } else if (happiness >= PET_STATE_THRESHOLDS.happy && cleanliness >= PET_STATE_THRESHOLDS.happy) {
    newState = 'happy';
    newMood = 'playful';
  } else {
    newState = 'idle';
    newMood = 'calm';
  }

  return {
    ...pet,
    state: newState,
    mood: newMood,
  };
};
