import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, MINUTE, claimFloor, earn, emptyWallet, grant, modeAt, normalizePolicy, reportStuck, spend, spendsTime, walletView, type Attempt } from './model';

// Wed 2026-09-23 10:00 and 18:00 Pacific (UTC-7).
const classTime = Date.UTC(2026, 8, 23, 17, 0), homeTime = Date.UTC(2026, 8, 24, 1, 0), saturday = Date.UTC(2026, 8, 26, 17, 0);
const attempts = (n: number, start: number, gap = 10000, prefix = 'q'): Attempt[] => Array.from({ length: n }, (_, i) => ({ questionId: `${prefix}${i}`, at: start + i * gap, correct: true }));

describe('play-time wallets', () => {
  it('knows class hours in the school time zone, with teacher overrides', () => {
    expect(modeAt(DEFAULT_POLICY, classTime)).toBe('class');
    expect(modeAt(DEFAULT_POLICY, homeTime)).toBe('home');
    expect(modeAt(DEFAULT_POLICY, saturday)).toBe('home');
    expect(modeAt({ ...DEFAULT_POLICY, classOverride: 'on', overrideUntil: saturday + 1 }, saturday)).toBe('class');
    expect(modeAt({ ...DEFAULT_POLICY, classOverride: 'off', overrideUntil: classTime + 1 }, classTime)).toBe('home');
    expect(modeAt({ ...DEFAULT_POLICY, classOverride: 'off', overrideUntil: classTime - 1 }, classTime)).toBe('class');
  });
  it('five solved questions earn fifteen minutes; class caps at one round ahead', () => {
    const start = classTime - 5 * MINUTE;
    let w = earn(emptyWallet(), DEFAULT_POLICY, attempts(4, start), classTime);
    expect(walletView(w, DEFAULT_POLICY, classTime, 0)).toMatchObject({ progress: 4, balanceMs: 0, canPlay: false, mode: 'class' });
    w = earn(w, DEFAULT_POLICY, attempts(1, start + 60000, 1, 'x'), classTime);
    expect(walletView(w, DEFAULT_POLICY, classTime, 0)).toMatchObject({ progress: 0, balanceMs: 15 * MINUTE, canPlay: true });
    w = earn(w, DEFAULT_POLICY, attempts(10, start + 2 * MINUTE, 10000, 'y'), classTime);
    expect(w.classMs).toBe(15 * MINUTE);
  });
  it('home banks up to its cap, and home minutes cannot be spent in class', () => {
    let w = earn(emptyWallet(), DEFAULT_POLICY, attempts(20, homeTime - 10 * MINUTE), homeTime);
    expect(w.homeMs).toBe(45 * MINUTE);
    expect(walletView(w, DEFAULT_POLICY, classTime + 86400000, 0)).toMatchObject({ mode: 'class', balanceMs: 0, canPlay: false });
    w = spend(w, DEFAULT_POLICY, 60000, homeTime + 60000);
    expect(w.homeMs).toBe(44 * MINUTE);
  });
  it('class minutes vanish once class ends', () => {
    const w = earn(emptyWallet(), DEFAULT_POLICY, attempts(5, classTime - MINUTE), classTime);
    expect(walletView(w, DEFAULT_POLICY, classTime, 0).balanceMs).toBe(15 * MINUTE);
    expect(walletView(w, DEFAULT_POLICY, homeTime, 0).balanceMs).toBe(0);
    expect(walletView(w, DEFAULT_POLICY, classTime + 86400000, 0).balanceMs).toBe(0);
  });
  it('wrong answers and revealed answers earn nothing, so failing fast is worthless', () => {
    const wrong = attempts(20, classTime - 10 * MINUTE, 10000, 'w').map(a => ({ ...a, correct: false }));
    expect(earn(emptyWallet(), DEFAULT_POLICY, wrong, classTime)).toMatchObject({ progress: 0, classMs: 0 });
    const copied = attempts(20, classTime - 10 * MINUTE, 10000, 'c').map(a => ({ ...a, revealed: true }));
    expect(earn(emptyWallet(), DEFAULT_POLICY, copied, classTime)).toMatchObject({ progress: 0, classMs: 0 });
    expect(earn(emptyWallet(), DEFAULT_POLICY, [{ questionId: 'legacy', at: classTime - 1000 }], classTime).progress).toBe(0);
  });
  it('a stuck learner gets a once-a-day floor, the teacher is told, and a teacher grant can exceed the class cap', () => {
    let w = claimFloor(emptyWallet(), DEFAULT_POLICY, classTime);
    expect(w.classMs).toBe(5 * MINUTE);
    expect(walletView(w, DEFAULT_POLICY, classTime, 0).floorAvailable).toBe(false);
    expect(claimFloor(w, DEFAULT_POLICY, classTime + MINUTE).classMs).toBe(5 * MINUTE);
    expect(claimFloor(emptyWallet(), { ...DEFAULT_POLICY, floorMinutes: 0 }, classTime).classMs).toBe(0);
    w = reportStuck(w, [{ skillId: 'g6-s7', topic: 'Fractions' }, { skillId: 'g6-s7', topic: 'Fractions' }, { skillId: '', topic: 'x' }], classTime);
    expect(w.stuck).toEqual([{ skillId: 'g6-s7', topic: 'Fractions', at: classTime }]);
    w = grant(w, DEFAULT_POLICY, 20, classTime);
    expect(w).toMatchObject({ classMs: 25 * MINUTE, stuck: [] });
    expect(() => grant(w, DEFAULT_POLICY, 0, classTime)).toThrow();
  });
  it('earning and the daily floor never shrink a teacher grant above the normal cap', () => {
    const gifted = grant(emptyWallet(), DEFAULT_POLICY, 25, classTime);
    expect(earn(gifted, DEFAULT_POLICY, attempts(5, classTime - MINUTE), classTime).classMs).toBe(25 * MINUTE);
    expect(claimFloor(gifted, DEFAULT_POLICY, classTime).classMs).toBe(25 * MINUTE);
    const home = grant(emptyWallet(), DEFAULT_POLICY, 60, homeTime);
    expect(earn(home, DEFAULT_POLICY, attempts(5, homeTime - MINUTE), homeTime).homeMs).toBe(60 * MINUTE);
  });
  it('ignores malformed attempt entries without losing the wallet', () => {
    const w = grant(emptyWallet(), DEFAULT_POLICY, 25, classTime);
    expect(earn(w, DEFAULT_POLICY, [null, undefined, {}, 'bad'] as unknown as Attempt[], classTime)).toEqual(w);
  });
  it('rapid guesses and repeated questions earn nothing', () => {
    let w = earn(emptyWallet(), DEFAULT_POLICY, attempts(10, classTime - MINUTE, 1000), classTime);
    expect(w.progress).toBeLessThanOrEqual(3);
    const before = w.progress;
    w = earn(w, DEFAULT_POLICY, attempts(10, classTime - MINUTE, 1000), classTime);
    expect(w.progress).toBe(before);
    expect(earn(emptyWallet(), DEFAULT_POLICY, [{ questionId: 'old', at: classTime - 60 * MINUTE }], classTime).progress).toBe(0);
  });
  it('a late batch from a second device still counts', () => {
    let w = earn(emptyWallet(), DEFAULT_POLICY, attempts(3, classTime - 30000, 10000, 'a'), classTime);
    w = earn(w, DEFAULT_POLICY, attempts(2, classTime - 5 * MINUTE, 10000, 'b'), classTime);
    expect(w).toMatchObject({ progress: 0, classMs: 15 * MINUTE });
  });
  it('spending is bounded by the server clock', () => {
    let w = earn(emptyWallet(), DEFAULT_POLICY, attempts(5, classTime - MINUTE), classTime);
    w = spend(w, DEFAULT_POLICY, 60 * MINUTE, classTime);
    expect(w.classMs).toBe(15 * MINUTE - 150000);
    w = spend(w, DEFAULT_POLICY, 60 * MINUTE, classTime + 30000);
    expect(w.classMs).toBe(15 * MINUTE - 150000 - 35000);
  });
  it('math-only pauses games without touching the bank, and disabled means free play', () => {
    const w = earn(emptyWallet(), DEFAULT_POLICY, attempts(5, classTime - MINUTE), classTime);
    expect(walletView(w, { ...DEFAULT_POLICY, mathOnlyUntil: classTime + 1 }, classTime, 0)).toMatchObject({ mathOnly: true, canPlay: false, balanceMs: 15 * MINUTE });
    expect(walletView({ ...w, mathOnlyUntil: classTime + 1 }, DEFAULT_POLICY, classTime, 0).canPlay).toBe(false);
    expect(walletView(emptyWallet(), { ...DEFAULT_POLICY, enabled: false }, classTime, 0).canPlay).toBe(true);
  });
  it('rejects malformed teacher settings and classifies screens', () => {
    const p = normalizePolicy({ questionsPerRound: 0, minutesPerRound: 5, schoolStart: '25:00', timeZone: 'Mars/Base', schoolDays: [1, 9, 1] as number[] });
    expect(p).toMatchObject({ questionsPerRound: 5, minutesPerRound: 5, schoolStart: '08:00', timeZone: 'America/Los_Angeles', schoolDays: [1] });
    expect(spendsTime('arcade')).toBe(true); expect(spendsTime('run_map')).toBe(true);
    expect(spendsTime('math')).toBe(false); expect(spendsTime('home')).toBe(false); expect(spendsTime('catch_math')).toBe(false);
  });
});
