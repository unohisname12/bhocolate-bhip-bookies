export type MPTierName = 'bronze' | 'silver';

export const MP_TIERS = [
  { name: 'bronze' as const, threshold: 0, label: 'Bronze', color: 'text-amber-600' },
  { name: 'silver' as const, threshold: 50, label: 'Silver', color: 'text-slate-300' },
] as const;

export const MP_EARN = {
  correct: 2,
  wrong: 1,
} as const;

export function getMPTier(mpLifetime: number): MPTierName {
  if (mpLifetime >= MP_TIERS[1].threshold) return 'silver';
  return 'bronze';
}
