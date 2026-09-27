import { describe, expect, it } from 'vitest';
import { engineReducer } from '../../engine/state/engineReducer';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { generateLearningProblem, GRADE_TOPICS } from '../../services/game/curriculum';
import { freshArcade, practiceTarget, RECIPES, road, validArcade, type ArcadeGame } from './model';
import { computeChecksum, validateSave } from '../../services/persistence/saveValidation';
import { migrate, CURRENT_SAVE_VERSION } from '../../services/persistence/saveMigrations';
const initial = (): import('../../types/engine').EngineState => ({ ...createInitialEngineState(), screen: 'arcade' as const });
describe('Practice to Play', () => {
  it.each(Array.from({length:13}, (_, grade) => grade))('grade %i questions stay on topic, credit corrections once, and mint no play charges', grade => {
    let s = initial(); s.learning = { ...s.learning, grade };
    for (let i = 0; i < practiceTarget(grade); i++) {
      const problem = { ...generateLearningProblem(s.learning), id: `grade-${grade}-${i}` };
      expect(GRADE_TOPICS[grade]).toContain(problem.topic);
      s = engineReducer(s, { type: 'SOLVE_MATH', correct: false, difficulty: problem.difficulty, reward: 0, problem });
      const action = { type: 'SOLVE_MATH' as const, correct: true, difficulty: problem.difficulty, reward: 10, problem };
      s = engineReducer(s, action);
      expect(engineReducer(s, action)).toBe(s);
    }
    expect(s.arcade?.charges ?? 0).toBe(0);
    expect(s.pet).toBeNull();
  });
  it.each(['dash','guard','cafe'] as ArcadeGame[])('%s rounds start without charges and a finished round pays tokens once', game => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game, level: 1 });
    expect(s.arcade?.trials).toEqual([game]);
    expect(engineReducer(s, { type: 'ARCADE_START', game, level: 1 })).toBe(s);
    const tokens = s.player.currencies.tokens;
    s = engineReducer(s, { type: 'ARCADE_END' });
    expect(engineReducer(s, { type: 'ARCADE_END' })).toBe(s);
    expect(s.player.currencies.tokens).toBe(tokens);
    s = engineReducer(s, { type: 'ARCADE_CLOSE' });
    for (const level of [1, 3]) {
      const again = engineReducer(s, { type: 'ARCADE_START', game, level });
      expect(again.arcade?.run?.done).toBe(false);
      expect(again.arcade?.charges).toBe(0);
    }
  });
  it('finishes a full race with collision-free lanes and rewards it once', () => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'dash', level: 1 });
    for (let i = 0; i < 60; i++) {
      const r = s.arcade!.run!;
      s = engineReducer(s, { type: 'ARCADE_LANE', lane: road(r.seed, r.step).coin });
      s = engineReducer(s, { type: 'ARCADE_TICK' });
    }
    expect(s.arcade!.run!.done).toBe(true); expect(s.arcade!.best.dash).toBe(900);
    expect(engineReducer(s, { type: 'ARCADE_TICK' })).toBe(s);
    expect(validArcade(s.arcade)).toBe(true);
  });
  it('three rapid defenses survive five relaxed waves with build breaks', () => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'guard', level: 1 });
    for (let slot = 0; slot < 3; slot++) s = engineReducer(s, { type: 'ARCADE_BUILD', slot, tower: 'rapid' });
    for (let step = 0; step < 80; step++) {
      s = engineReducer(s, { type: 'ARCADE_TICK' });
      if ((step + 1) % 16 === 0) expect(s.arcade!.run!.enemies).toHaveLength(0);
    }
    expect(s.arcade!.run!.step).toBe(80); expect(s.arcade!.run!.health).toBeGreaterThan(0);
    expect(s.arcade!.run!.done).toBe(true); expect(validArcade(s.arcade)).toBe(true);
  });
  it('cafe wrong recipes preserve supplies; nine orders finish a shift', () => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'cafe', level: 1 });
    const stock = s.arcade!.run!.stock;
    s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'serve', value: 0 });
    expect(s.arcade!.run!.stock).toEqual(stock);
    for (let n = 0; n < 9; n++) {
      const recipe = RECIPES[s.arcade!.run!.orders[0]];
      for (const value of recipe.parts) {
        if (s.arcade!.run!.stock[value] < 2) s = engineReducer(s, { type: 'ARCADE_RESTOCK', ingredient: value });
        s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'ingredient', value });
      }
      s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'serve', value: 0 });
    }
    expect(s.arcade!.run!.step).toBe(9); expect(s.arcade!.run!.done).toBe(true);
    const data = { version: CURRENT_SAVE_VERSION, timestamp: Date.now(), checksum: computeChecksum(s), state: s };
    expect(validateSave(data).valid).toBe(true);
    expect(migrate(JSON.parse(JSON.stringify(data))).arcade).toEqual(s.arcade);
  });
  it('keeps learner progress isolated and rejects broken imports', () => {
    const a = freshArcade(), b = freshArcade(); a.charges = 4;
    expect(b.charges).toBe(0); expect(validArcade({ ...a, charges: -1 })).toBe(false);
    expect(validArcade({ ...a, run: {} })).toBe(false);
  });
});

describe('arcade pacing and recovery', () => {
  it('offers exactly one free retry after early failure, preserved across saves', () => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'dash', level: 1 });
    for (let tries = 0; tries < 2; tries++) {
      for (let hit = 0; hit < 5; hit++) {
        const r = s.arcade!.run!;
        s = engineReducer(s, { type: 'ARCADE_LANE', lane: road(r.seed, r.step).rock });
        s = engineReducer(s, { type: 'ARCADE_TICK' });
      }
      expect(s.arcade!.run!.done).toBe(true);
      s = JSON.parse(JSON.stringify(s));
      const retry = engineReducer(s, { type: 'ARCADE_RETRY' });
      if (tries === 0) { expect(retry.arcade!.run!.done).toBe(false); expect(retry.arcade!.charges).toBe(0); s = retry; }
      else expect(retry).toBe(s);
    }
  });
  it('supports capped upgrades without charging for maxed defenses', () => {
    let s = initial(); s.arcade = { ...freshArcade(), charges: 1 };
    s = engineReducer(s, { type: 'ARCADE_START', game: 'guard', level: 3 });
    s.arcade!.run!.energy = 30;
    const build = { type: 'ARCADE_BUILD' as const, slot: 0, tower: 'rapid' as const };
    s = engineReducer(s, build); s = engineReducer(s, build); s = engineReducer(s, build);
    expect(s.arcade!.run!.towerLevels![0]).toBe(3);
    expect(s.arcade!.run!.energy).toBe(16);
    expect(engineReducer(s, build)).toBe(s);
  });
  it('rewards customer variety and unlocks longer recipes without timers', () => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'cafe', level: 1 });
    for (let customer = 0; customer < 3; customer++) {
      s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'select', value: customer });
      for (const value of RECIPES[s.arcade!.run!.orders[customer]].parts) s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'ingredient', value });
      s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'serve', value: 0 });
    }
    expect(s.arcade!.run!.score).toBe(70);
    s.arcade!.run!.orders[2] = 3;
    for (const value of RECIPES[3].parts) s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'ingredient', value });
    expect(s.arcade!.run!.tray).toHaveLength(3);
    s = engineReducer(s, { type: 'ARCADE_CAFE', kind: 'serve', value: 0 });
    expect(s.arcade!.run!.step).toBe(4);
    expect(validArcade(s.arcade)).toBe(true);
  });
  it('provides varied race lanes over many seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rocks = Array.from({length:60}, (_, step) => road(seed, step).rock);
      expect(new Set(rocks).size).toBe(3);
      expect(rocks.filter((n, i) => i > 0 && n === rocks[i - 1]).length).toBeGreaterThan(0);
    }
  });
  it.each([1,2,3])('can defend level %i with upgraded rapid/frost defenses', level => {
    let s = engineReducer(initial(), { type: 'ARCADE_START', game: 'guard', level });
    const towers = ['rapid','frost','rapid'] as const;
    for (let slot = 0; slot < 3; slot++) s = engineReducer(s, { type:'ARCADE_BUILD', slot, tower:towers[slot] });
    for (let step = 0; step < 80; step++) {
      if (step > 0 && step % 16 === 0) for (let slot = 0; slot < 3; slot++) s = engineReducer(s, { type:'ARCADE_BUILD', slot, tower:towers[slot] });
      s = engineReducer(s, { type:'ARCADE_TICK' });
    }
    expect(s.arcade!.run!.step).toBe(80);
    expect(s.arcade!.run!.health).toBeGreaterThan(0);
  });
});
