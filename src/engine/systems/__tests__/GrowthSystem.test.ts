import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { engineReducer } from '../../state/engineReducer';
import { checkEvolution, evolvePet, hatchEgg } from '../../../services/game/evolutionEngine';
import { careDate, careProgress, recordCare } from '../../../services/game/petGrowth';
import { DAY_MS, COMPANIONS, petVisualKey } from '../../../config/companionConfig';
import { initBattle, executePlayerMove, petToBattlePet } from '../BattleSystem';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import { migrate } from '../../../services/persistence/saveMigrations';
import { FOOD_ITEMS } from '../../../config/gameConfig';
import { checkAchievements } from '../AchievementSystem';
import type { EngineState } from '../../../types/engine';

const now = Date.UTC(2026, 8, 20, 18);
function fixture(species = 'ember_fox'): EngineState {
  const state = createInitialEngineState();
  const pet = hatchEgg({ id: 'test-egg', type: species, state: 'ready', progress: 100, createdAt: new Date(now).toISOString() })!;
  return { ...state, egg: null, screen: 'growth', pet: { ...pet, bond: 70, progression: { level: 15, xp: 0, evolutionFlags: [] } }, player: { ...state.player, activePetId: pet.id, lifetimeMathCorrect: 100, currencies: { ...state.player.currencies, tokens: 1000 } } };
}
function ready(state: EngineState): EngineState {
  const pet = state.pet!;
  return { ...state, pet: { ...pet, growth: { startedAt: now - 8 * DAY_MS, stageStartedAt: now - 8 * DAY_MS,
    careDays: Array.from({ length: 7 }, (_, i) => ({ day: careDate(now - (7 - i) * DAY_MS), tasks: ['feed', 'clean', 'play'] })) } } };
}
function finishTrial(state: EngineState) {
  while (state.growthTrial && !state.growthTrial.complete) {
    const q = state.growthTrial.problems[state.growthTrial.index];
    state = engineReducer(state, { type: 'ANSWER_GROWTH_TRIAL', questionId: q.id, answer: String(q.answer) });
  }
  return state;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe('companion nursery and two-step evolution', () => {
  it('hatches each character as its own baby with a new care history', () => {
    for (const [id, info] of Object.entries(COMPANIONS)) {
      const pet = hatchEgg({ id: 'egg', type: info.egg, state: 'ready', progress: 100, createdAt: new Date().toISOString() })!;
      expect(pet.speciesId).toBe(id); expect(pet.stage).toBe('baby'); expect(pet.growth?.careDays).toEqual([]);
    }
  });
  it('requires both a real week AND seven complete care days; spam never creates extra days', () => {
    let state = fixture();
    for (let i = 0; i < 10; i++) for (const task of ['feed', 'clean', 'play'] as const) state.pet = recordCare(state.pet!, task);
    expect(careProgress(state.pet!).days).toBe(1);
    expect(checkEvolution(state.pet!, 100).canEvolve).toBe(false);
    const aged = ready(fixture());
    expect(checkEvolution(aged.pet!, 100).canEvolve).toBe(true);
    aged.pet!.growth!.startedAt = now - 6 * DAY_MS;
    expect(checkEvolution(aged.pet!, 100).blocker).toBe('age');
    aged.pet!.growth!.startedAt = now - 8 * DAY_MS;
    aged.pet!.growth!.careDays[0].tasks = ['feed', 'play'];
    expect(checkEvolution(aged.pet!, 100).blocker).toBe('care');
  });
  it('does not auto-evolve during feeding; requires a complete trial, rejects stale answers and replay', () => {
    let state = ready(fixture());
    state = engineReducer(state, { type: 'FEED_PET', food: FOOD_ITEMS[0] });
    expect(state.pet!.stage).toBe('baby');
    state = engineReducer(state, { type: 'EVOLVE_PET' });
    const question = state.growthTrial!.problems[0];
    state = engineReducer(state, { type: 'ANSWER_GROWTH_TRIAL', questionId: question.id, answer: 'wrong' });
    expect(state.growthTrial!.index).toBe(0);
    state = engineReducer(state, { type: 'ANSWER_GROWTH_TRIAL', questionId: question.id, answer: String(question.answer) });
    const stale = engineReducer(state, { type: 'ANSWER_GROWTH_TRIAL', questionId: question.id, answer: String(question.answer) });
    expect(stale).toBe(state);
    state = finishTrial(state);
    expect(state.pet!.stage).toBe('juvenile');
    expect(state.pet!.progression.evolutionFlags).toEqual(['evolved_to_juvenile']);
    expect(state.events.some(e => e.type === 'pet_evolved')).toBe(true);
    expect(engineReducer(state, { type: 'ANSWER_GROWTH_TRIAL', questionId: question.id, answer: String(question.answer) })).toBe(state);
  });
  it('requires another week and fourteen care days, then stops permanently at adult', () => {
    let state = finishTrial(engineReducer(ready(fixture()), { type: 'START_GROWTH_TRIAL', kind: 'evolution' }));
    expect(checkEvolution(state.pet!, 100).canEvolve).toBe(false);
    for (let day = 1; day <= 7; day++) for (const task of ['feed', 'clean', 'play'] as const) state.pet = recordCare(state.pet!, task, now + day * DAY_MS);
    vi.setSystemTime(now + 7 * DAY_MS);
    state = finishTrial(engineReducer(state, { type: 'START_GROWTH_TRIAL', kind: 'evolution' }));
    expect(state.pet!.stage).toBe('adult'); expect(state.pet!.progression.evolutionFlags).toHaveLength(2);
    expect(evolvePet(state.pet!, 100)).toBe(state.pet);
    expect(checkEvolution({ ...state.pet!, stage: 'elder' }, 100).canEvolve).toBe(false);
  });
  it('unlocks stage-specific powers and implements damage, healing and defense', () => {
    for (const id of ['ember_fox', 'moss_turtle', 'luna_owl']) {
      const pet = fixture(id).pet!;
      expect(petToBattlePet(pet).moves.filter(m => m.id.startsWith('growth_'))).toHaveLength(0);
      const adult = { ...pet, stage: 'adult' as const };
      const battle = initBattle(adult);
      battle.playerPet.energy = 100; battle.playerPet.currentHP = 10;
      const move = battle.playerPet.moves.find(m => m.id === `growth_${id}_2`)!;
      expect(battle.playerPet.speciesId).toBe(petVisualKey(adult));
      expect(battle.playerPet.moves.filter(m => m.id.startsWith('growth_'))).toHaveLength(2);
      const result = executePlayerMove(battle, move.id);
      if (id === 'luna_owl') expect(result.playerPet.currentHP).toBeGreaterThan(10);
      else if (id === 'moss_turtle') expect(result.playerPet.buffs.at(-1)?.multiplier).toBe(1.7);
      else expect(result.enemyPet.currentHP).toBeLessThan(battle.enemyPet.currentHP);
    }
  });
  it('adopts and switches without replacing or duplicating the existing pet', () => {
    let state = fixture('koala'); const original = state.pet!;
    state = { ...state, devPreview: true };
    state = engineReducer(state, { type: 'ADOPT_COMPANION', speciesId: 'ember_fox' });
    expect(state.companionRoster).toEqual([original]); expect(state.pet).toBeNull();
    state = engineReducer(state, { type: 'CHOOSE_COMPANION_EGG', speciesId: 'koala_sprite' });
    expect(state.egg!.type).toBe('ember_fox');
    state = { ...state, egg: { ...state.egg!, state: 'ready' } };
    vi.setSystemTime(now + 1000);
    state = engineReducer(state, { type: 'HATCH_EGG' });
    const fox = state.pet!;
    state = engineReducer(state, { type: 'SWITCH_COMPANION', petId: original.id });
    expect(state.pet).toEqual(original); expect(state.companionRoster).toEqual([fox]);
    expect(engineReducer(state, { type: 'ADOPT_COMPANION', speciesId: 'ember_fox' })).toBe(state);
  });
  it('gates new daily activities and pays each reward once', () => {
    let state = fixture();
    expect(engineReducer(state, { type: 'USE_COMPANION_GIFT' })).toBe(state);
    expect(engineReducer(state, { type: 'START_GROWTH_TRIAL', kind: 'expedition' })).toBe(state);
    state.pet = { ...state.pet!, stage: 'adult' };
    state = engineReducer(state, { type: 'USE_COMPANION_GIFT' });
    expect(engineReducer(state, { type: 'USE_COMPANION_GIFT' })).toBe(state);
    state = checkAchievements({ ...state, events: [...state.events, { id: 'prior-math', playerId: state.player.id, type: 'math_solved', payload: {}, createdAt: new Date().toISOString() }] }).state;
    const tokens = state.player.currencies.tokens;
    state = finishTrial(engineReducer(state, { type: 'START_GROWTH_TRIAL', kind: 'expedition' }));
    expect(state.player.currencies.tokens).toBe(tokens + 125); // 50 practice + 50 daily goal + 25 streak achievement
    expect(engineReducer(state, { type: 'START_GROWTH_TRIAL', kind: 'expedition' })).toBe(state);
  });
  it('migrates old pets without inventing past care; preserves nursery and trial through save roundtrip', () => {
    const old = fixture(); delete old.pet!.growth;
    const migrated = migrate({ version: 14, timestamp: now, state: old, checksum: computeChecksum(old) });
    expect(migrated.pet!.growth!.careDays).toEqual([]); expect(migrated.pet!.id).toBe(old.pet!.id);
    let state = engineReducer(ready(fixture()), { type: 'START_GROWTH_TRIAL', kind: 'evolution' });
    state = { ...state, companionRoster: [fixture('moss_turtle').pet!] };
    const serialized = JSON.parse(JSON.stringify({ version: 17, timestamp: now, state, checksum: computeChecksum(state) }));
    expect(validateSave(serialized).valid).toBe(true);
    expect(migrate(serialized)).toEqual(state);
  });
});
