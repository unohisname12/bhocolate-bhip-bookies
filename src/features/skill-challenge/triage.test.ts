import { describe, expect, it } from 'vitest';
import { DEFAULT_LEARNING } from '../../services/game/curriculum';
import { ENHANCED_POLICY, newTarget, type Event, type Progress, type Stage } from './model';
import { autoConfirm, oralPrompt, triage, undoConfirm } from './triage';

const H = 3600000, t0 = Date.UTC(2026, 8, 21, 17);
let n = 0;
const ev = (stage: Stage, correct: boolean, at: number, o: Partial<Event> = {}): Event => ({ id: `e${++n}`, skill: 'g5-s3', stage, text: `Q${n}: 3/4 of 20`, answer: correct ? '15' : '12', expected: 15, correct, supported: false, at, set: 1, ...o });

function run(opts: { followMiss?: boolean; transferMiss?: boolean; delay?: number; set?: number; revealed?: boolean } = {}): Progress {
  const base = [ev('baseline', false, t0), ev('baseline', true, t0 + 1), ev('baseline', false, t0 + 2)];
  const practice = [1, 2, 3].map(i => ev('practice', true, t0 + H * i, { answerRevealed: opts.revealed }));
  const check = [1, 2, 3, 4, 5].map(i => ev('check', true, t0 + 5 * H + i));
  const transfer = [...(opts.transferMiss ? [ev('transfer', false, t0 + 6 * H)] : []), ev('transfer', true, t0 + 6 * H + 1), ev('transfer', true, t0 + 6 * H + 2)];
  const followAt = t0 + 6 * H + (opts.delay ?? 30 * H);
  const follow = [...(opts.followMiss ? [ev('follow', false, followAt - 2 * H)] : []), ev('follow', true, followAt - 1), ev('follow', true, followAt)];
  const t = { ...newTarget('g5-s3', 'test'), baseline: 1, baselineIds: base.map(e => e.id), set: opts.set ?? 1, checkIds: check.map(e => e.id),
    reflection: 'Find one share, then scale.', passedAt: t0 + 5 * H + 5, transferIds: transfer.slice(-2).map(e => e.id), transferAt: t0 + 6 * H + 2, followIds: follow.slice(-2).map(e => e.id), followAt, lessonAt: t0 };
  return { version: 2, learning: { ...DEFAULT_LEARNING, grade: 5 }, targets: [t], events: [...base, ...practice, ...check, ...transfer, ...follow], current: null, archived: [] };
}

describe('teacher triage', () => {
  it('a clean run still waits for the learner’s written explanation', () => {
    const p = run(); p.targets[0].reflection = undefined;
    expect(autoConfirm(p, ENHANCED_POLICY, t0 + 40 * H)).toBe(p);
    expect(triage(p, p.targets[0], ENHANCED_POLICY)).toMatchObject({ group: 'in-progress' });
  });
  it('an oral-explanation request waits for the teacher instead of auto-confirming', () => {
    const p = run();p.targets[0].reflection = 'I will explain to my teacher.';
    expect(autoConfirm(p, ENHANCED_POLICY, t0 + 40 * H)).toBe(p);
    expect(triage(p, {...p.targets[0], confirmedAt:t0+40*H,autoConfirmed:true}, ENHANCED_POLICY).group).toBe('needs-you');
    expect(triage(p, p.targets[0], ENHANCED_POLICY)).toMatchObject({group:'needs-you',reasons:expect.arrayContaining([expect.stringContaining('oral explanation')])});
  });
  it('a clean next-day run confirms itself and can be undone', () => {
    const done = autoConfirm(run(), ENHANCED_POLICY, t0 + 40 * H);
    expect(done.targets[0]).toMatchObject({ confirmedAt: t0 + 40 * H, autoConfirmed: true });
    expect(triage(done, done.targets[0], ENHANCED_POLICY).group).toBe('auto-confirmed');
    const undone = undoConfirm(done, 'g5-s3');
    expect(undone.targets[0]).toMatchObject({ confirmedAt: null, autoConfirmed: false });
    expect(() => undoConfirm(undone, 'g5-s3')).toThrow();
    expect(autoConfirm(undone, ENHANCED_POLICY, t0 + 50 * H)).toBe(undone);
    expect(triage(undone, undone.targets[0], ENHANCED_POLICY).group).toBe('ready');
  });
  it('contradictions wait for the teacher with a reason', () => {
    for (const [opts, text] of [[{ followMiss: true }, 'missed the follow-up'], [{ transferMiss: true }, 'different-use'], [{ set: 2 }, '2 tries'], [{ revealed: true }, 'worked answer'], [{ delay: 1 * H }, 'same-class']] as const) {
      const p = run(opts), policy = { ...ENHANCED_POLICY, delayHours: 'delay' in opts ? 0.5 : 24 };
      expect(autoConfirm(p, policy, t0 + 40 * H)).toBe(p);
      const view = triage(p, p.targets[0], policy);
      expect(view.group).toBe('needs-you');
      expect(view.reasons.join(' ')).toContain(text);
    }
  });
  it('a skill-check miss or "I don’t know" after starting flags the target, even after confirmation', () => {
    const outside = [{ skillId: 'g5-s3', outcome: 'not-learned' as const, at: t0 + 50 * H }];
    expect(autoConfirm(run(), ENHANCED_POLICY, t0 + 60 * H, outside).targets[0].confirmedAt).toBeNull();
    const done = autoConfirm(run(), ENHANCED_POLICY, t0 + 40 * H);
    const view = triage(done, done.targets[0], ENHANCED_POLICY, outside);
    expect(view.group).toBe('needs-you');
    expect(view.reasons[0]).toContain('I don’t know this yet');
    expect(triage(done, done.targets[0], ENHANCED_POLICY, [{ skillId: 'g5-s3', outcome: 'not-learned', at: t0 - DAYMS }]).group).toBe('auto-confirmed');
  });
  it('older challenges and teachers who turn it off keep manual confirmation', () => {
    const p = run();
    expect(autoConfirm({ ...p, version: undefined }, { ...ENHANCED_POLICY, version: 1 }, t0 + 40 * H)).toEqual({ ...p, version: undefined });
    expect(autoConfirm(p, { ...ENHANCED_POLICY, autoConfirm: false }, t0 + 40 * H)).toBe(p);
    expect(triage(p, p.targets[0], { ...ENHANCED_POLICY, autoConfirm: false }).group).toBe('needs-you');
  });
  it('the oral prompt quotes the question they missed and the strategy to listen for', () => {
    const p = run({ followMiss: true }), missed = p.events.find(e => e.stage === 'follow' && !e.correct)!;
    const prompt = oralPrompt(p, p.targets[0]);
    expect(prompt).toContain(missed.text);
    expect(prompt).toContain('They answered 12; the answer is 15.');
    expect(prompt).toContain('Listen for:');
    expect(oralPrompt(run(), run().targets[0])).toMatch(/^Ask: /);
  });
});
const DAYMS = 86400000;
