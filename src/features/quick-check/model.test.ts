import { describe, expect, it } from 'vitest';
import { answerCheck, checkDue, clearGap, coverage, DAY, emptyCheck, publicCheck, startCheck, type CheckState } from './model';
import { skillsForGrade } from '../skill-challenge/catalog';
import { DEFAULT_LEARNING } from '../../services/game/curriculum';
const now = 2_000_000_000_000;
const ids = () => { let i = 0; return () => `q-${++i}`; };
const finish = (s: CheckState) => s.round!.items.reduce((state, item, index) => answerCheck(state, item.id, String(item.problem.answer), false, now + index + 1), s);
describe('short checks across K–12', () => {
  it('one completed check covers every game until the schedule renews it', () => {
    const done = finish(startCheck(emptyCheck(), DEFAULT_LEARNING, now, () => .4, ids(), 'dash'));
    for (const cadence of ['play', 'weekly'] as const) {
      expect(checkDue(done, DEFAULT_LEARNING, cadence, now + 4)).toBe(false);
      expect(checkDue(done, DEFAULT_LEARNING, cadence, now + 7 * DAY - 1)).toBe(false);
      expect(checkDue(done, DEFAULT_LEARNING, cadence, now + 7 * DAY + 3)).toBe(true);
    }
    expect(checkDue({ ...done, required: true, waivedUntil: now + DAY }, DEFAULT_LEARNING, 'play', now + 4)).toBe(false);
    expect(publicCheck(done, DEFAULT_LEARNING, 'play', 4, now + 4, 'cafe').activity).toBe('cafe');
    expect(publicCheck(done, DEFAULT_LEARNING, 'play', 4, now + 4).round?.activity).toBe('dash');
  });
  it('“I haven’t learned this” records a gap that later checks skip until cleared', () => {
    let state = startCheck(emptyCheck(), DEFAULT_LEARNING, now, () => .3, ids());
    const skipped = state.round!.items[0];
    state = answerCheck(state, skipped.id, '', true, now + 1);
    expect(state.gaps).toEqual([expect.objectContaining({ skillId: skipped.skillId, skillName: skipped.skillName, at: now + 1 })]);
    for (let round = 0; round < 4; round++) {
      state = finish(state);
      state = startCheck(state, DEFAULT_LEARNING, now + (round + 1) * 8 * DAY, () => .5, ids());
      expect(state.round!.items.map(i => i.skillId)).not.toContain(skipped.skillId);
    }
    expect(clearGap(state, skipped.skillId).gaps).toEqual([]);
    expect(() => clearGap(clearGap(state, skipped.skillId), skipped.skillId)).toThrow();
  });
  it('fills from earlier grades when gaps exhaust the assigned grade, and never blocks when nothing is left', () => {
    const learning = { ...DEFAULT_LEARNING, grade: 3 };
    const gaps = skillsForGrade(3).slice(1).map(s => ({ skillId: s.id, skillName: s.name, grade: 3, at: now }));
    const state = startCheck({ ...emptyCheck(), gaps }, learning, now, () => .3, ids());
    expect(state.round!.items).toHaveLength(3);
    expect(state.round!.items.filter(i => i.grade === 3)).toHaveLength(1);
    expect(state.round!.items.filter(i => i.grade === 2)).toHaveLength(2);
    expect(publicCheck(state, learning, 'weekly', 1, now).exhausted).toBe(true);
    const everything = Array.from({ length: 2 }, (_, g) => skillsForGrade(g)).flat().map(s => ({ skillId: s.id, skillName: s.name, grade: s.grade, at: now }));
    const empty = { ...emptyCheck(), gaps: everything, required: true };
    const k1 = { ...DEFAULT_LEARNING, grade: 1 };
    expect(checkDue(empty, k1, 'weekly', now)).toBe(false);
    expect(publicCheck(empty, k1, 'weekly', 1, now).outOfQuestions).toBe(true);
    expect(startCheck(empty, k1, now, () => .3, ids()).round).toBeNull();
  });
  for (let grade = 0; grade <= 12; grade++) it(`Grade ${grade}: distinct objectives, private answers, completion and rotation`, () => {
    const learning = { ...DEFAULT_LEARNING, grade };
    const initial = startCheck(emptyCheck(), learning, now, () => .4, ids());
    expect(initial.round!.items).toHaveLength(3);
    expect(new Set(initial.round!.items.map(i => i.skillId)).size).toBe(3);
    expect(initial.round!.items.every(i => i.skillId.startsWith(`g${grade}-`))).toBe(true);
    const view = publicCheck(initial, learning, 'weekly', 1, now);
    expect(view.round!.current).not.toHaveProperty('answer');
    expect(view.round!.current).not.toHaveProperty('problem');
    expect(view.round!.results).toEqual([]);
    const done = finish(initial);
    expect(checkDue(done, learning, 'weekly', now + 10)).toBe(false);
    const next = startCheck(done, learning, now + 8 * DAY, () => .6, ids());
    expect(new Set([...initial.round!.items, ...next.round!.items].map(i => i.skillId)).size).toBe(6);
    expect(coverage(next, learning).filter(s => s.outcome === 'correct')).toHaveLength(3);
  });
  it('wrong and untaught responses complete without falsely awarding correctness', () => {
    let state = startCheck(emptyCheck(), DEFAULT_LEARNING, now, () => .3, ids());
    const items = state.round!.items;
    state = answerCheck(state, items[0].id, '99999', false, now + 1);
    state = answerCheck(state, items[1].id, '', true, now + 2);
    state = answerCheck(state, items[2].id, String(items[2].problem.answer), false, now + 3);
    expect(state.round!.items.map(i => i.outcome)).toEqual(['needs-practice', 'not-learned', 'correct']);
    expect(checkDue(state, DEFAULT_LEARNING, 'weekly', now + 4)).toBe(false);
    expect(answerCheck(state, items[0].id, String(items[0].problem.answer), false, now + 5)).toEqual(state);
  });
  it('retains the pending questions over restart and settings changes', () => {
    const state = startCheck(emptyCheck(), DEFAULT_LEARNING, now, () => .3, ids());
    expect(startCheck(state, { ...DEFAULT_LEARNING, grade: 12 }, now + 1, () => .9, ids())).toEqual(state);
    expect(checkDue(finish(state), { ...DEFAULT_LEARNING, grade: 12 }, 'weekly', now + 20)).toBe(true);
  });
  it('honors teacher topic constraints and schedule/exception without fabricating evidence', () => {
    const learning = { ...DEFAULT_LEARNING, grade: 11, topic: 'Arithmetic sequences' };
    const done = finish(startCheck(emptyCheck(), learning, now, () => .3, ids()));
    expect(done.round!.items.every(i => Number(i.skillId.split('-s')[1]) >= 3)).toBe(true);
    expect(checkDue(done, learning, 'daily', now + DAY)).toBe(false);
    expect(checkDue(done, learning, 'daily', now + DAY + 4)).toBe(true);
    expect(checkDue(emptyCheck(), learning, 'teacher', now)).toBe(false);
    expect(checkDue({ ...emptyCheck(), required: true }, learning, 'teacher', now)).toBe(true);
    const waived = { ...emptyCheck(), waivedUntil: now + DAY };
    expect(checkDue(waived, learning, 'weekly', now)).toBe(false);
    expect(coverage(waived, learning).every(s => s.outcome === 'not-checked')).toBe(true);
  });
  it('rejects truncated/empty numeric answers and out-of-order questions', () => {
    const state = startCheck(emptyCheck(), DEFAULT_LEARNING, now, () => .3, ids());
    expect(() => answerCheck(state, state.round!.items[0].id, '2abc', false, now)).toThrow();
    expect(() => answerCheck(state, state.round!.items[0].id, '', false, now)).toThrow();
    expect(() => answerCheck(state, state.round!.items[1].id, '4', false, now)).toThrow();
    const item = state.round!.items[0];
    expect(answerCheck(state, item.id, `${item.problem.answer * 2}/2`, false, now + 1).round!.items[0].outcome).toBe('correct');
  });
  it('does not present support-level samples as evidence at a new challenge level', () => {
    const done = finish(startCheck(emptyCheck(), { ...DEFAULT_LEARNING, challenge: 'support' }, now, () => .3, ids()));
    expect(coverage(done, DEFAULT_LEARNING).every(s => s.outcome === 'not-checked')).toBe(true);
    expect(checkDue(done, DEFAULT_LEARNING, 'weekly', now + 10)).toBe(true);
  });
});
