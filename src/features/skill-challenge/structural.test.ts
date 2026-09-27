import { describe, expect, it } from 'vitest';
import { learningProblem } from './lessons';
import { consequence, formsFor, STRUCTURAL_SKILLS, structuralTransfer } from './structural';

const seeded = (seed: number) => () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
const levels = ['support', 'standard', 'stretch'] as const;
const nums = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('structural transfer families', () => {
  it('cover all nine grade 6–7 ratio and proportion objectives', () => {
    expect(STRUCTURAL_SKILLS.sort()).toEqual(['g6-s0', 'g6-s1', 'g6-s2', 'g7-s0', 'g7-s1', 'g7-s10', 'g7-s11', 'g7-s2', 'g7-s9']);
    for (const id of STRUCTURAL_SKILLS.filter(id => id.startsWith('g7'))) {
      const forms = formsFor(id);
      expect(forms).toHaveLength(3);
      expect(new Set(forms.map(f => f.world)).size, id).toBe(3);
    }
  });
  it('every form, level, and seed produces a positive whole-number answer and sensible percents', () => {
    for (const id of STRUCTURAL_SKILLS) for (const level of levels) for (let seed = 1; seed < 400; seed++) for (const stage of ['transfer', 'follow', 'retention']) for (const index of [0, 1]) {
      const q = structuralTransfer(id, level, stage, index, seeded(seed));
      if (!q) { expect(id.startsWith('g6') && stage === 'transfer').toBe(true); continue; }
      expect(Number.isInteger(q.answer) && q.answer > 0, `${id} ${q.templateId} ${q.answer}`).toBe(true);
      for (const pct of (q.text.match(/(\d+)%/g) ?? []).map(x => Number(x.slice(0, -1)))) expect(pct > 0 && pct <= 100, q.text).toBe(true);
      expect(q.explanation).toContain(String(q.answer));
    }
  });
  it('transfer, follow-up, and retention use different structures', () => {
    for (const id of STRUCTURAL_SKILLS.filter(id => id.startsWith('g7'))) {
      const r = seeded(7);
      const ids = [structuralTransfer(id, 'standard', 'transfer', 0, r), structuralTransfer(id, 'standard', 'transfer', 1, r), structuralTransfer(id, 'standard', 'follow', 0, r)].map(q => q!.templateId);
      expect(new Set(ids).size, id).toBe(3);
    }
  });
  it('the generator uses structural forms instead of number-only re-rolls, and practice is unchanged', () => {
    expect(learningProblem('g7-s9', 'standard', 'transfer', 0, seeded(3)).templateId).toContain('structural-v1');
    expect(learningProblem('g7-s0', 'standard', 'follow', 0, seeded(3)).templateId).toContain('structural-v1');
    expect(learningProblem('g6-s0', 'standard', 'transfer', 0, seeded(3)).templateId).toContain('transfer-v3');
    expect(learningProblem('g6-s0', 'standard', 'follow', 0, seeded(3)).templateId).toContain('structural-v1');
    expect(learningProblem('g7-s9', 'standard', 'practice', 0, seeded(3)).templateId).not.toContain('structural');
  });
  it('the math checks out independently for representative forms', () => {
    for (let seed = 1; seed < 200; seed++) {
      const whole = structuralTransfer('g7-s1', 'stretch', 'transfer', 0, seeded(seed))!;
      const [part, pct] = nums(whole.text);
      expect(whole.answer * pct / 100).toBeCloseTo(part);
      const left = structuralTransfer('g7-s1', 'stretch', 'transfer', 1, seeded(seed))!;
      const [remaining, pctLeft] = nums(left.text);
      expect(left.answer * pctLeft / 100).toBeCloseTo(remaining);
      const complement = structuralTransfer('g7-s0', 'stretch', 'transfer', 0, seeded(seed))!;
      const [total, removed] = nums(complement.text);
      expect(complement.answer).toBeCloseTo(total * (1 - removed / 100));
      const savings = structuralTransfer('g7-s11', 'standard', 'transfer', 0, seeded(seed))!;
      const [bagsA, costA, bagsB, costB, need] = nums(savings.text);
      expect(savings.answer).toBeCloseTo(Math.abs(costA / bagsA - costB / bagsB) * need);
    }
  });
  it('wrong answers get an in-world consequence', () => {
    const q = structuralTransfer('g7-s1', 'standard', 'transfer', 0, seeded(5))!;
    expect(consequence(q.stakes!, q.answer - 3, q.answer)).toBe('With that answer the EV bike runs out of charge 3 km short of the drop-off.');
    expect(consequence(q.stakes!, q.answer + 2, q.answer)).toContain('2 km');
  });
});
