import { describe, expect, it } from 'vitest';
import type { LearningEvidence } from '../../types/woodland';
import { newScanMemo, scanEvidence } from './evidence';

const row = (id: string, o: Partial<LearningEvidence> = {}): LearningEvidence => ({ questionId: id, topic: 'Fractions', skillId: 'g5-s3', grade: 5, source: 'practice', attempts: 1, support: 'none', correct: false, firstAttemptCorrect: false, updatedAt: 1, ...o });

describe('scanEvidence', () => {
  it('reports only newly solved questions and marks copied ones', () => {
    const memo = newScanMemo();
    const wrong = row('a');
    expect(scanEvidence([], [wrong], memo, true, 5).attempts).toEqual([]);
    const solved = row('a', { attempts: 2, correct: true });
    expect(scanEvidence([wrong], [solved], memo, true, 6).attempts).toEqual([{ questionId: 'a', at: 6, correct: true, revealed: false }]);
    expect(scanEvidence([solved], [solved], memo, true, 7).attempts).toEqual([]);
    const copied = row('b', { attempts: 2, correct: true, answerRevealed: true, support: 'explanation' });
    expect(scanEvidence([row('b', { attempts: 1, answerRevealed: true })], [copied], memo, true, 8).attempts[0].revealed).toBe(true);
  });
  it('three first-try misses in a row on one skill report it once', () => {
    const memo = newScanMemo();
    let rows: LearningEvidence[] = [], stuck: unknown[] = [];
    for (const id of ['1', '2', '3', '4']) { const next = [...rows, row(id)]; stuck = [...stuck, ...scanEvidence(rows, next, memo, false, 1).stuck]; rows = next; }
    expect(stuck).toEqual([{ skillId: 'g5-s3', topic: 'Fractions' }]);
    const other = newScanMemo();
    const mixed = [row('x'), row('y', { correct: true, firstAttemptCorrect: true }), row('z'), row('w')];
    let seen: unknown[] = [];
    mixed.forEach((_, i) => { seen = [...seen, ...scanEvidence(mixed.slice(0, i), mixed.slice(0, i + 1), other, false, 1).stuck]; });
    expect(seen).toEqual([]);
  });
  it('worked example then a real try on a fresh question claims the floor, not the example question itself', () => {
    const memo = newScanMemo();
    const helped = row('q', { attempts: 0, answerRevealed: true, support: 'explanation' });
    expect(scanEvidence([], [helped], memo, true, 1).floor).toBe(false);
    expect(scanEvidence([helped], [helped, row('q2')], memo, true, 2).floor).toBe(true);
    expect(scanEvidence([row('q2')], [row('q2'), row('q3')], memo, true, 3).floor).toBe(false);
    const noFloor = newScanMemo();
    scanEvidence([], [helped], noFloor, false, 1);
    expect(scanEvidence([helped], [helped, row('q2')], noFloor, false, 2).floor).toBe(false);
  });
});
