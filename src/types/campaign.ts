/**
 * Foundation for the Story Campaign (Phase 4). Chapters are defined now
 * so the roadmap is visible in-code. All chapters start locked; only the
 * first one unlocks as part of Phase 1 to let kids taste the feature.
 */

export interface CampaignChapter {
  id: string;
  chapterNumber: number;
  title: string;
  blurb: string;
  unlockRequirement:
    | { kind: 'immediate' }
    | { kind: 'level'; level: number }
    | { kind: 'prev_chapter' };
  /** When this chapter is targeted for release (display-only). */
  releaseTarget: string;
  status: 'available' | 'locked' | 'coming_soon';
}

export interface CampaignState {
  /** ID of the chapter currently in progress (null if none started). */
  activeChapterId: string | null;
  /** Chapter IDs the player has finished. */
  completedChapters: string[];
}
