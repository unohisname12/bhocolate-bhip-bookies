import type { Pet } from '../../types/pet';
import type { EggDiscovery } from '../../types/discovery';
import { createMind } from '../../features/pet-mind/memory';

/** The activities shared with the egg carry into its first temperament. */
export function applyDiscoveryBond(pet: Pet, discovery: EggDiscovery | null | undefined): Pet {
  if (!discovery || discovery.status !== 'claimed') return pet;
  const mind = createMind(pet);
  const traits = { ...mind.traits };
  for (const stamp of discovery.stamps) {
    const keys = stamp.style === 'explore' ? ['curiosity', 'playfulness'] as const
      : stamp.style === 'build' ? ['nature', 'comfort'] as const
      : stamp.style === 'help' ? ['sociability', 'comfort'] as const
      : ['curiosity', 'quiet'] as const;
    for (const key of keys) traits[key] = Math.min(1, traits[key] + 0.06);
  }
  return { ...pet, mind: { ...mind, traits } };
}
