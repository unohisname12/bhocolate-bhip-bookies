import type { EngineState } from '../../types/engine';
import type { DexSpeciesEntry } from '../../types/dex';

/**
 * DexSystem — foundation for the Pet Dex (Phase 2). We track encounters
 * now so the dex is pre-populated by the time the UI ships.
 *
 * Encounters happen when: the player hatches a pet, battles a classmate,
 * or sees a new species in a shop/room. Keep the API small and let
 * reducer hooks decide when to call it.
 */

const findEntry = (state: EngineState, speciesId: string): DexSpeciesEntry | undefined =>
  state.dex.species.find((e) => e.speciesId === speciesId);

export const markSeen = (state: EngineState, speciesId: string): EngineState => {
  const existing = findEntry(state, speciesId);
  if (existing?.seen) return state;
  const now = new Date().toISOString();
  const entry: DexSpeciesEntry = existing
    ? { ...existing, seen: true, firstSeenAt: existing.firstSeenAt ?? now }
    : { speciesId, seen: true, owned: false, variants: [], firstSeenAt: now };
  return {
    ...state,
    dex: {
      ...state.dex,
      species: [
        ...state.dex.species.filter((e) => e.speciesId !== speciesId),
        entry,
      ],
    },
  };
};

export const markOwned = (state: EngineState, speciesId: string): EngineState => {
  const existing = findEntry(state, speciesId);
  const now = new Date().toISOString();
  const entry: DexSpeciesEntry = existing
    ? { ...existing, seen: true, owned: true, firstOwnedAt: existing.firstOwnedAt ?? now }
    : { speciesId, seen: true, owned: true, variants: [], firstSeenAt: now, firstOwnedAt: now };
  return {
    ...state,
    dex: {
      ...state.dex,
      species: [
        ...state.dex.species.filter((e) => e.speciesId !== speciesId),
        entry,
      ],
    },
  };
};

export const markClassmate = (state: EngineState, classmateId: string): EngineState => {
  if (state.dex.classmateIds.includes(classmateId)) return state;
  return {
    ...state,
    dex: {
      ...state.dex,
      classmateIds: [...state.dex.classmateIds, classmateId],
    },
  };
};

export const getDexCompletion = (state: EngineState, totalSpecies: number) => {
  const seen = state.dex.species.filter((e) => e.seen).length;
  const owned = state.dex.species.filter((e) => e.owned).length;
  return {
    seen,
    owned,
    totalSpecies,
    seenFraction: totalSpecies ? seen / totalSpecies : 0,
    ownedFraction: totalSpecies ? owned / totalSpecies : 0,
  };
};
