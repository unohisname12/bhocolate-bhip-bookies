/**
 * Foundation for the Pet Dex (Phase 2). We start tracking encounters now
 * so that by the time the UI ships, kids already have a populated dex.
 */

export interface DexSpeciesEntry {
  speciesId: string;
  /** True once the kid has *seen* this species (fought, played with). */
  seen: boolean;
  /** True once they've owned/bonded with one. */
  owned: boolean;
  /** Variant IDs observed — e.g. color morphs like 'sunset', 'shadow'. */
  variants: string[];
  firstSeenAt?: string;
  firstOwnedAt?: string;
}

export interface DexState {
  species: DexSpeciesEntry[];
  /** Classmate names encountered — foundation for Phase 3 friend tracking. */
  classmateIds: string[];
}
