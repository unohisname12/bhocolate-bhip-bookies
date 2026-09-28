import { describe, expect, it } from 'vitest';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { hatchEgg } from '../../services/game/evolutionEngine';
import { normalizeLearning } from '../../services/game/curriculum';
import { command, parseCommand, validArena } from './model';
import { challengeID, localPowerProblem, powerGain, type MathPower } from './mathPower';
import { perform, emptyBuild, fighter, type CombatEvent } from './combat';
import type { EngineState, MathProblem } from '../../types';

function start() {
  const s = createInitialEngineState();
  s.pet = hatchEgg({ id: 'egg', type: 'koala', state: 'ready', progress: 100, createdAt: new Date().toISOString() })!;
  s.pet.id = 'math-pet'; s.pet.progression.level = 10;
  s.learning = normalizeLearning({ grade: 1, topic: 'Addition within 20' });
  return command(s, { kind: 'start', mode: 'campaign', encounter: 0 });
}
const base = (s: EngineState) => ({ fightId: s.petArena!.fight!.id, round: s.petArena!.fight!.round });
function solve(s: EngineState, power: MathPower, p?: MathProblem) {
  s = command(s, { ...base(s), kind: 'math-open', power }, p);
  const f = s.petArena!.fight!, q = f.mathPower!.challenge!;
  const problem = p ?? localPowerProblem(f, q.learning);
  return command(s, { ...base(s), kind: 'math-answer', challengeId: q.id, answer: String(problem.answer) }, p);
}
function activate(s: EngineState) {
  return command(s, { ...base(s), kind: 'math-activate', challengeId: s.petArena!.fight!.mathPower!.challenge!.id, method: 'tap' });
}

describe('arena math powers', () => {
  it('uses assigned questions, hides keys, persists offers, and never rewards currency for opening', () => {
    const s = start(), old = JSON.stringify(s), n = command(s, { ...base(s), kind: 'math-open', power: 'shield' });
    expect(JSON.stringify(s)).toBe(old);
    const q = n.petArena!.fight!.mathPower!.challenge!;
    expect(q.learning.topic).toBe('Addition within 20'); expect(q).not.toHaveProperty('answer'); expect(q).not.toHaveProperty('explanation');
    const reopened = command(JSON.parse(JSON.stringify(n)), { ...base(n), kind: 'math-open', power: 'energy' });
    expect(reopened.petArena!.fight!.mathPower!.challenge!.question).toBe(q.question);
    expect(reopened.player.currencies).toEqual(s.player.currencies);
  });
  it('wrong answers and explanations preserve uses and distinguish supported evidence', () => {
    let s = command(start(), { ...base(start()), kind: 'math-open', power: 'shield' });
    const f = s.petArena!.fight!, id = challengeID(f), p = localPowerProblem(f, s.learning);
    s = command(s, { ...base(s), kind: 'math-answer', challengeId: id, answer: String(p.answer + 1000) });
    expect(s.petArena!.fight!.mathPower!.used).toBe(0); expect(s.learningEvidence!.at(-1)!.correct).toBe(false);
    s = command(s, { ...base(s), kind: 'math-help', challengeId: id });
    s = command(s, { ...base(s), kind: 'math-answer', challengeId: id, answer: String(p.answer) });
    expect(s.learningEvidence!.at(-1)).toMatchObject({ correct: true, firstAttemptCorrect: false, support: 'explanation', attempts: 2 });
    expect(s.player.currencies).toEqual(start().player.currencies);
  });
  it('rejects activation before solving and guards fight, turn and pet identity', () => {
    const s = command(start(), { ...base(start()), kind: 'math-open', power: 'strike' });
    const c = { ...base(s), kind: 'math-activate' as const, challengeId: challengeID(s.petArena!.fight!), method: 'tap' as const };
    expect(() => command(s, c)).toThrow(/Solve/);
    expect(() => command(s, { ...c, fightId: 'other' })).toThrow();
    expect(() => command(s, { ...c, round: 2 })).toThrow();
    const other = structuredClone(s); other.pet!.id = 'other'; expect(() => command(other, c)).toThrow();
  });
  it('solved answers survive reload; activation spends once and leaves the normal turn ready', () => {
    let s = solve(start(), 'shield'); const f = s.petArena!.fight!, hp = f.fighters[0].hp, shield = f.fighters[0].shield;
    const c = { ...base(s), kind: 'math-activate' as const, challengeId: challengeID(f), method: 'trace' as const };
    s = command(JSON.parse(JSON.stringify(s)), c);
    expect(s.petArena!.fight!.fighters[0]).toMatchObject({ hp, shield: shield + 10 });
    expect(s.petArena!.fight!.round).toBe(1); expect(s.petArena!.fight!.mathPower!.used).toBe(1);
    expect(() => command(s, c)).toThrow();
    expect(command(s, { ...base(s), kind: 'move', move: 'guard' }).petArena!.fight!.round).toBe(2);
  });
  it('allows only two uses per fight, one per turn, independent of tracing method', () => {
    let s = activate(solve(start(), 'energy'));
    expect(() => solve(s, 'shield')).toThrow(/battle move/);
    s = command(s, { ...base(s), kind: 'move', move: 'guard' });
    s = activate(solve(s, 'shield'));
    s = command(s, { ...base(s), kind: 'move', move: 'strike' });
    expect(() => solve(s, 'shield')).toThrow(/Both/); expect(validArena(s.petArena)).toBe(true);
  });
  it('respects shield/energy caps and refuses choices that cannot help', () => {
    for (const power of ['shield', 'energy'] as const) {
      let s = start(); const f = s.petArena!.fight!, p = f.fighters[0];
      p.shield = Math.floor(p.maxHP * .4) - 2; p.energy = 58;
      expect(powerGain(f, power)).toBe(2);
      s = activate(solve(s, power));
      expect(power === 'shield' ? s.petArena!.fight!.fighters[0].shield : s.petArena!.fight!.fighters[0].energy).toBe(power === 'shield' ? Math.floor(p.maxHP * .4) : 60);
      const full = start(); full.petArena!.fight!.fighters[0].energy = 60;
      expect(() => solve(full, 'energy')).toThrow(/can use/);
    }
  });
  it('keeps Power Strike through Guard and Focus, adds at most eight before protection, then consumes it', () => {
    const s = start(), p = fighter(s.pet!, emptyBuild()), e = fighter(s.pet!, emptyBuild());
    p.mathStrike = true; p.attack = 100;
    perform([p, e], 0, 'guard', []); perform([p, e], 0, 'focus', []); expect(p.mathStrike).toBe(true);
    e.guard = true; e.shield = 5; const before = e.hp;
    const plain = structuredClone(p); plain.mathStrike = false;
    const other = structuredClone(e); perform([plain, other], 0, 'strike', []);
    const events: CombatEvent[] = []; perform([p, e], 0, 'strike', events);
    expect(other.hp - e.hp).toBe(4); // +8 raw, then halved by Guard.
    expect(before - e.hp).toBeGreaterThan(0); expect(p.mathStrike).toBe(false);
    expect(events.some(e => e.text.includes('added 8'))).toBe(true);
  });
  it('uses server-supplied questions and accepts exact fractions without exposing expected answers', () => {
    let s = start(); const p: MathProblem = { id: challengeID(s.petArena!.fight!), question: 'One of four equal parts?', answer: .25, reward: 0, difficulty: 1 };
    s = command(s, { ...base(s), kind: 'math-open', power: 'strike' }, p);
    s = command(s, { ...base(s), kind: 'math-answer', challengeId: p.id, answer: '1/4' }, p);
    expect(s.petArena!.fight!.mathPower!.challenge!.answerText).toBe('1/4');
    expect(() => command(s, { ...base(s), kind: 'math-help', challengeId: p.id }, { ...p, id: 'forged' })).toThrow();
  });
  it('leaves older in-flight battles unchanged and starts new ones with powers', () => {
    const s = start(); delete s.petArena!.fight!.mathPower;
    expect(validArena(s.petArena)).toBe(true); expect(() => solve(s, 'shield')).toThrow();
    expect(command(s, { ...base(s), kind: 'move', move: 'strike' }).petArena!.fight!.mathPower).toBeUndefined();
    const left = command(s, { kind: 'retreat' }); expect(command(left, { kind: 'start', mode: 'campaign', encounter: 0 }).petArena!.fight!.mathPower!.used).toBe(0);
  });
  it('parses only the allowed command vocabulary and rejects fabricated results', () => {
    expect(() => parseCommand({ kind: 'math-activate', fightId: 'a', round: 1, challengeId: 'a', method: 'perfect', correct: true })).toThrow();
    expect(parseCommand({ kind: 'math-answer', fightId: 'a', round: 1, challengeId: 'a', answer: '2', correct: true, gain: 999 })).not.toHaveProperty('correct');
    const s = start(); s.petArena!.fight!.mathPower!.used = 99; expect(validArena(s.petArena)).toBe(false);
  });
});
