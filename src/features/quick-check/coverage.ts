// A gap inventory, not a claim of standards alignment or exhaustive scope.
export const MIDDLE_SCHOOL_GAPS = [
  { grade: 6, available: 'rates and ratios, signed integers, fraction division, decimal operations, expressions and equations, coordinate distances, area and volume, mean/median/range',
    gaps: 'rational-number ordering, full inequality reasoning, composite figures and nets, data distributions, and deeper conceptual tasks',
    source: 'https://www.thecorestandards.org/Math/Content/6/introduction/' },
  { grade: 7, available: 'percentages, one-step and multi-step equations, rational arithmetic, proportional relationships, scale and geometry, probability, sampling and statistics',
    gaps: 'multi-step tax/discount/interest applications, negative-coefficient inequalities, constructions/cross-sections, and deeper sampling and probability investigations',
    source: 'https://www.thecorestandards.org/Math/Content/7/introduction/' },
  { grade: 8, available: 'linear equations, Pythagorean lengths, exponents and roots, linear functions, systems, coordinate transformations, volume, and data models',
    gaps: 'scientific notation, full function classification, no/infinite-solution systems, rotation and similarity proofs, and interpretation of scatterplots',
    source: 'https://www.thecorestandards.org/Math/Content/8/introduction/' },
] as const;
