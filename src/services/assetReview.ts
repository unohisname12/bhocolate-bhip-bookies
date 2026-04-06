/**
 * Asset Review persistence service.
 * Stores review statuses (keep/reject/fix + notes) in localStorage.
 */
import type { ReviewStatus } from '../config/generatedAssetManifest';
import { GENERATED_ASSETS } from '../config/generatedAssetManifest';

const STORAGE_KEY = 'vpet_asset_review';

export interface AssetReviewEntry {
  status: ReviewStatus;
  note: string;
  reviewedAt: string | null;
}

export type AssetReviewMap = Record<string, AssetReviewEntry>;

function defaultEntry(): AssetReviewEntry {
  return { status: 'unreviewed', note: '', reviewedAt: null };
}

/** Load all review data from localStorage. Missing assets get default entries. */
export function loadReviews(): AssetReviewMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: AssetReviewMap = raw ? JSON.parse(raw) : {};
    // Ensure every asset in the manifest has an entry
    const merged: AssetReviewMap = {};
    for (const asset of GENERATED_ASSETS) {
      merged[asset.id] = saved[asset.id] ?? defaultEntry();
    }
    return merged;
  } catch {
    console.error('[AssetReview] Failed to load reviews, returning defaults');
    const fresh: AssetReviewMap = {};
    for (const asset of GENERATED_ASSETS) {
      fresh[asset.id] = defaultEntry();
    }
    return fresh;
  }
}

/** Save entire review map to localStorage. */
export function saveReviews(reviews: AssetReviewMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.error('[AssetReview] Failed to save reviews:', e);
  }
}

/** Update a single asset's review status. */
export function setReviewStatus(
  reviews: AssetReviewMap,
  assetId: string,
  status: ReviewStatus,
  note?: string,
): AssetReviewMap {
  const existing = reviews[assetId] ?? defaultEntry();
  const updated: AssetReviewMap = {
    ...reviews,
    [assetId]: {
      status,
      note: note ?? existing.note,
      reviewedAt: new Date().toISOString(),
    },
  };
  saveReviews(updated);
  return updated;
}

/** Update a note for an asset without changing status. */
export function setReviewNote(
  reviews: AssetReviewMap,
  assetId: string,
  note: string,
): AssetReviewMap {
  const existing = reviews[assetId] ?? defaultEntry();
  const updated: AssetReviewMap = {
    ...reviews,
    [assetId]: { ...existing, note },
  };
  saveReviews(updated);
  return updated;
}

/** Get counts by status. */
export function getReviewStats(reviews: AssetReviewMap) {
  const counts = { unreviewed: 0, keep: 0, reject: 0, fix: 0, total: GENERATED_ASSETS.length };
  for (const entry of Object.values(reviews)) {
    counts[entry.status]++;
  }
  return counts;
}

/** Export a JSON report of all reviews, including asset metadata for regeneration. */
export function exportReport(reviews: AssetReviewMap): string {
  const entries = GENERATED_ASSETS.map((asset) => {
    const review = reviews[asset.id] ?? defaultEntry();
    return {
      id: asset.id,
      filename: asset.filename,
      category: asset.category,
      path: asset.path,
      prompt: asset.prompt,
      width: asset.width,
      height: asset.height,
      status: review.status,
      note: review.note,
      reviewedAt: review.reviewedAt,
    };
  });

  const stats = getReviewStats(reviews);

  return JSON.stringify({ exportedAt: new Date().toISOString(), stats, assets: entries }, null, 2);
}

/** Export only assets that need regeneration (status = 'fix'). */
export function exportFixList(reviews: AssetReviewMap): string {
  const fixes = GENERATED_ASSETS
    .filter((a) => reviews[a.id]?.status === 'fix')
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      prompt: a.prompt,
      width: a.width,
      height: a.height,
      note: reviews[a.id]?.note ?? '',
    }));

  return JSON.stringify({ exportedAt: new Date().toISOString(), count: fixes.length, fixes }, null, 2);
}

/** Reset all reviews to unreviewed. */
export function resetAllReviews(): AssetReviewMap {
  const fresh: AssetReviewMap = {};
  for (const asset of GENERATED_ASSETS) {
    fresh[asset.id] = defaultEntry();
  }
  saveReviews(fresh);
  return fresh;
}
