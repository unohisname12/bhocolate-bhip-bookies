import { ASSETS } from './assetManifest';
import { FOOD_ITEMS, DECAY_RATES } from './gameConfig';
import { REWARD_CONFIG } from './rewardConfig';
import { SPECIES_CONFIG } from './speciesConfig';

export * from './assetManifest';
export * from './animationConfig';
export * from './gameConfig';
export * from './quizOutcomeConfig';
export * from './rewardConfig';
export * from './speciesConfig';

export const validateConfigs = (): void => {
  const warnings: string[] = [];

  for (const [speciesId, species] of Object.entries(SPECIES_CONFIG)) {
    if (!ASSETS.pets[species.assetKey]) {
      warnings.push(`[config] species '${speciesId}' references missing assetKey '${species.assetKey}'`);
    }
  }

  for (const item of FOOD_ITEMS) {
    if (item.cost <= 0) {
      warnings.push(`[config] food item '${item.id}' has non-positive cost (${item.cost})`);
    }
  }

  for (const [key, value] of Object.entries(DECAY_RATES)) {
    if (value <= 0) {
      warnings.push(`[config] decay rate '${key}' must be > 0, got ${value}`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(warning));
  }
};

export { ASSETS, FOOD_ITEMS, REWARD_CONFIG, SPECIES_CONFIG, DECAY_RATES };
