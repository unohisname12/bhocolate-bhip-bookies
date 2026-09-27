import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { engineReducer } from '../../state/engineReducer';
import { COMPANIONS, DAY_MS } from '../../../config/companionConfig';
import { ADVENTURE_STYLES, STYLE_KEYS } from '../../../config/discoveryConfig';
import { createEggDiscovery, discoveryReady, matchCompanion, validEggDiscovery } from '../../../services/game/eggDiscovery';
import { careDate } from '../../../services/game/petGrowth';
import { hatchEgg } from '../../../services/game/evolutionEngine';
import { migrate } from '../../../services/persistence/saveMigrations';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import type { EngineState } from '../../../types/engine';
import type { AdventureStyle } from '../../../types/discovery';

const now = Date.UTC(2026, 8, 7, 17);
function quiz(state = createInitialEngineState(), choice = 4) {
  for (let i = 0; i < 4; i++) state = engineReducer(state, { type: 'ANSWER_DISCOVERY_QUIZ', question: i, choice });
  return state;
}
function stamp(state: EngineState, style: AdventureStyle, day: number) {
  vi.setSystemTime(now + day * DAY_MS);
  return engineReducer(state, { type: 'CREDIT_DISCOVERY_CLASSROOM_DAY', style });
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe('school-friendly egg discovery', () => {
  it('starts without an assigned egg, allows an optional quiz, and rejects invalid choices', () => {
    const state = createInitialEngineState();
    expect(state.screen).toBe('discovery'); expect(state.egg).toBeNull();
    expect(engineReducer(state, { type: 'START_DISCOVERY_MISSION', style: 'help' }).eggDiscovery!.mission).not.toBeNull();
    expect(engineReducer(state, { type: 'HATCH_EGG' })).toBe(state);
    expect(engineReducer(state, { type: 'ADOPT_COMPANION', speciesId: 'ember_fox' })).toBe(state);
    for (const choice of [-1, 1.5, 5, NaN]) expect(engineReducer(state, { type: 'ANSWER_DISCOVERY_QUIZ', question: 0, choice })).toBe(state);
    expect(quiz().eggDiscovery!.answers).toEqual([4, 4, 4, 4]);
  });
  it('uses teacher difficulty, persists a mission, accepts retry, and prevents duplicate answer rewards', () => {
    let state = quiz();
    state.learning = { grade: 12, topic: 'Derivatives', challenge: 'support', timedWarmup: false };
    state = engineReducer(state, { type: 'START_DISCOVERY_MISSION', style: 'wonder' });
    const mission = state.eggDiscovery!.mission!;
    expect(mission.problems.every(p => p.question.includes('f′('))).toBe(true);
    expect(engineReducer(state, { type: 'START_DISCOVERY_MISSION', style: 'build' }).eggDiscovery!.mission).toEqual(mission);
    const q = mission.problems[0];
    state = engineReducer(state, { type: 'ANSWER_DISCOVERY_MISSION', questionId: q.id, answer: 'wrong' });
    expect(state.eggDiscovery!.mission!.index).toBe(0);
    expect(state.eggDiscovery!.stamps).toHaveLength(0);
    for (const p of mission.problems) {
      state = engineReducer(state, { type: 'ANSWER_DISCOVERY_MISSION', questionId: p.id, answer: String(p.answer) });
      expect(engineReducer(state, { type: 'ANSWER_DISCOVERY_MISSION', questionId: p.id, answer: String(p.answer) })).toBe(state);
    }
    expect(state.player.lifetimeMathCorrect).toBe(3);
    expect(state.player.currencies.tokens).toBe(140); // 30 question tokens + the shared first-math achievement (10).
    expect(state.eggDiscovery!.stamps).toEqual([{ day: careDate(now), style: 'wonder', source: 'mission' }]);
    expect(engineReducer(state, { type: 'START_DISCOVERY_MISSION', style: 'help' })).toBe(state);
    expect(engineReducer(state, { type: 'CREDIT_DISCOVERY_CLASSROOM_DAY', style: 'build' })).toBe(state);
  });
  it('requires five unique learning days, keeps missed-day progress, and excludes future stamps', () => {
    let state = quiz();
    for (const day of [0, 1, 4, 7]) state = stamp(state, 'help', day);
    expect(discoveryReady(state.eggDiscovery!)).toBe(false);
    expect(engineReducer(state, { type: 'REVEAL_DISCOVERY_EGG' })).toBe(state);
    state = stamp(state, 'help', 10);
    expect(discoveryReady(state.eggDiscovery!)).toBe(true);
    expect(discoveryReady(state.eggDiscovery!, now)).toBe(false);
  });
  it('can match all four companions; activity choices outweigh quiz choices', () => {
    for (const style of STYLE_KEYS) {
      let state = quiz(createInitialEngineState(), (STYLE_KEYS.indexOf(style) + 1) % 4);
      for (let day = 0; day < 5; day++) state = stamp(state, style, day);
      state = engineReducer(state, { type: 'REVEAL_DISCOVERY_EGG' });
      expect(state.eggDiscovery!.companion).toBe(ADVENTURE_STYLES[style].companion);
      expect(engineReducer(state, { type: 'ANSWER_DISCOVERY_QUIZ', question: 0, choice: 4 })).toBe(state);
      expect(engineReducer(state, { type: 'REVEAL_DISCOVERY_EGG' })).toBe(state);
    }
  });
  it('uses a stable tie-break without recording personality labels or personal text', () => {
    const d = { ...createEggDiscovery(), answers: [0, 1, 2, 3], tieBreak: .7 };
    expect(matchCompanion(JSON.parse(JSON.stringify(d)))).toBe(matchCompanion(d));
    expect(Object.keys(d).sort()).toEqual(['answers', 'candidates', 'companion', 'matchingVersion', 'mission', 'stamps', 'startedAt', 'status', 'tieBreak']);
  });
  it('claims exactly one matched egg, locks its species, and preserves existing companions', () => {
    let state = createInitialEngineState();
    const pip = hatchEgg({ id: 'old', type: 'koala', state: 'ready', progress: 100, createdAt: new Date(now).toISOString() })!;
    state = { ...state, eggDiscovery: null, pet: pip, egg: null };
    state = engineReducer(state, { type: 'START_EGG_DISCOVERY' });
    expect(state.eggDiscovery!.candidates).not.toContain('koala_sprite');
    state = quiz(state);
    for (let day = 0; day < 5; day++) state = stamp(state, 'explore', day);
    state = engineReducer(state, { type: 'REVEAL_DISCOVERY_EGG' });
    state = engineReducer(state, { type: 'CLAIM_DISCOVERY_EGG' });
    expect(state.pet).toBeNull(); expect(state.companionRoster).toEqual([pip]); expect(state.egg!.type).toBe('ember_fox');
    expect(engineReducer(state, { type: 'CLAIM_DISCOVERY_EGG' })).toBe(state);
    expect(engineReducer(state, { type: 'CHOOSE_COMPANION_EGG', speciesId: 'luna_owl' })).toBe(state);
    state = engineReducer({ ...state, egg: { ...state.egg!, state: 'ready' } }, { type: 'HATCH_EGG' });
    expect(state.pet!.growth!.careDays).toEqual([]);
    expect(state.pet!.growth!.startedAt).toBe(now + 4 * DAY_MS);
    state = engineReducer(state, { type: 'START_EGG_DISCOVERY' });
    expect(state.eggDiscovery!.candidates).toEqual(Object.keys(COMPANIONS).filter(id => !['koala_sprite', 'ember_fox'].includes(id)));
    expect(state.pet!.speciesId).toBe('ember_fox');
  });
  it('preserves legacy eggs and pets and round-trips in-progress discovery with checksum validation', () => {
    const old = { ...createInitialEngineState(), eggDiscovery: undefined, egg: { id: 'legacy', type: 'koala', state: 'incubating' as const, progress: 70, createdAt: new Date(now).toISOString() } };
    const migrated = migrate({ version: 15, state: old, timestamp: now, checksum: computeChecksum(old) });
    expect(migrated.egg).toEqual(old.egg); expect(migrated.eggDiscovery).toBeNull();
    const state = engineReducer(quiz(), { type: 'START_DISCOVERY_MISSION', style: 'build' });
    const data = JSON.parse(JSON.stringify({ version: 16, state, timestamp: now, checksum: computeChecksum(state) }));
    expect(validateSave(data).valid).toBe(true); expect(migrate(data)).toEqual(state);
    data.state.eggDiscovery.mission.problems[0] = null;
    data.checksum = computeChecksum(data.state);
    expect(validateSave(data).errors).toContain('Invalid egg discovery');
  });
  it('rejects duplicate stamps and impossible matches in malformed saves', () => {
    const d = createEggDiscovery();
    expect(validEggDiscovery(d)).toBe(true);
    expect(validEggDiscovery({ ...d, answers: [0, 1, 2, 99] })).toBe(false);
    expect(validEggDiscovery({ ...d, candidates: ['__proto__'] })).toBe(false);
    expect(validEggDiscovery({ ...d, status: 'matched', companion: Object.keys(COMPANIONS)[0] })).toBe(false);
    const s = { day: careDate(now), style: 'help', source: 'classroom' };
    expect(validEggDiscovery({ ...d, stamps: [s, s] })).toBe(false);
  });
});
