/**
 * Animation Review persistence service.
 * Stores review statuses (keep/reject/fix + notes) in localStorage.
 */
import { ANIMATION_DEFINITIONS } from '../config/animationManifest';
import type { AnimationDefinition } from '../config/animationManifest';

export type ReviewStatus = 'unreviewed' | 'keep' | 'reject' | 'fix';

const STORAGE_KEY = 'vpet_animation_review';

export interface AnimationReviewEntry {
  status: ReviewStatus;
  note: string;
  reviewedAt: string | null;
}

export type AnimationReviewMap = Record<string, AnimationReviewEntry>;

function defaultEntry(): AnimationReviewEntry {
  return { status: 'unreviewed', note: '', reviewedAt: null };
}

export function loadAnimationReviews(): AnimationReviewMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: AnimationReviewMap = raw ? JSON.parse(raw) : {};
    const merged: AnimationReviewMap = {};
    for (const anim of ANIMATION_DEFINITIONS) {
      merged[anim.id] = saved[anim.id] ?? defaultEntry();
    }
    return merged;
  } catch {
    console.error('[AnimationReview] Failed to load reviews, returning defaults');
    const fresh: AnimationReviewMap = {};
    for (const anim of ANIMATION_DEFINITIONS) {
      fresh[anim.id] = defaultEntry();
    }
    return fresh;
  }
}

export function saveAnimationReviews(reviews: AnimationReviewMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.error('[AnimationReview] Failed to save reviews:', e);
  }
}

export function setAnimationReviewStatus(
  reviews: AnimationReviewMap,
  animId: string,
  status: ReviewStatus,
  note?: string,
): AnimationReviewMap {
  const existing = reviews[animId] ?? defaultEntry();
  const updated: AnimationReviewMap = {
    ...reviews,
    [animId]: {
      status,
      note: note ?? existing.note,
      reviewedAt: new Date().toISOString(),
    },
  };
  saveAnimationReviews(updated);
  return updated;
}

export function setAnimationReviewNote(
  reviews: AnimationReviewMap,
  animId: string,
  note: string,
): AnimationReviewMap {
  const existing = reviews[animId] ?? defaultEntry();
  const updated: AnimationReviewMap = {
    ...reviews,
    [animId]: { ...existing, note },
  };
  saveAnimationReviews(updated);
  return updated;
}

export function getAnimationReviewStats(reviews: AnimationReviewMap) {
  const counts = { unreviewed: 0, keep: 0, reject: 0, fix: 0, total: ANIMATION_DEFINITIONS.length };
  for (const entry of Object.values(reviews)) {
    counts[entry.status]++;
  }
  return counts;
}

export function exportAnimationReport(reviews: AnimationReviewMap): string {
  const entries = ANIMATION_DEFINITIONS.map((anim: AnimationDefinition) => {
    const review = reviews[anim.id] ?? defaultEntry();
    return {
      id: anim.id,
      action: anim.action,
      label: anim.label,
      prompt: anim.prompt,
      gridImagePath: anim.gridImagePath,
      spriteSheetPath: anim.spriteSheetPath,
      status: review.status,
      note: review.note,
      reviewedAt: review.reviewedAt,
    };
  });

  const stats = getAnimationReviewStats(reviews);
  return JSON.stringify({ exportedAt: new Date().toISOString(), stats, animations: entries }, null, 2);
}

export function exportAnimationFixList(reviews: AnimationReviewMap): string {
  const fixes = ANIMATION_DEFINITIONS
    .filter((a) => reviews[a.id]?.status === 'fix')
    .map((a) => ({
      id: a.id,
      action: a.action,
      prompt: a.prompt,
      note: reviews[a.id]?.note ?? '',
    }));

  return JSON.stringify({ exportedAt: new Date().toISOString(), count: fixes.length, fixes }, null, 2);
}

export function resetAllAnimationReviews(): AnimationReviewMap {
  const fresh: AnimationReviewMap = {};
  for (const anim of ANIMATION_DEFINITIONS) {
    fresh[anim.id] = defaultEntry();
  }
  saveAnimationReviews(fresh);
  return fresh;
}
