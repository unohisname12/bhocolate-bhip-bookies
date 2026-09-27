import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../../engine/core/GameEngine';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { saveTeacherSettings } from '../saveTeacherSettings';
import { createLearner, selectLearner } from '../learnerProfiles';
import { learnerSlot, readLearnerIndex } from '../learnerIndex';
import { exportSave, load, save } from '../SaveManager';
import { connectPersistence } from '../enginePersistence';
import { createScreenPreview } from '../../../devtools/screenCatalog';
import { generateLearningProblem } from '../../game/curriculum';
import { matchCompanion } from '../../game/eggDiscovery';

const advanced = { grade: 12, topic: 'Derivatives', challenge: 'stretch' as const, timedWarmup: false, learningHelp: false, schoolSafe: true };
const kinder = { grade: 0, topic: 'Counting', challenge: 'support' as const, timedWarmup: false, learningHelp: true, schoolSafe: true };
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('teacher profile controls', () => {
  it('confirms real saving and leaves progress untouched', () => {
    const engine = new GameEngine();
    const original = engine.getState();
    expect(saveTeacherSettings(engine, advanced).status).toBe('saved');
    expect(load()!.learning).toEqual(advanced);
    expect(load()!.eggDiscovery).toEqual(original.eggDiscovery);
    expect(load()!.player).toEqual(original.player);
  });
  it('reports failed storage, allows retry, and never reports preview changes as saved', () => {
    const engine = new GameEngine();
    const mock = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveTeacherSettings(engine, advanced).status).toBe('error');
    mock.mockRestore();
    expect(saveTeacherSettings(engine, advanced).status).toBe('saved');
    const original = exportSave();
    engine.dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview('home', advanced) });
    expect(saveTeacherSettings(engine, kinder).status).toBe('preview');
    expect(exportSave()).toBe(original);
  });
  it('keeps settings, rewards, egg overrides and discovery separate for each learner', () => {
    const engine = new GameEngine();
    const disconnect = connectPersistence(engine, new EventTarget(), new EventTarget());
    saveTeacherSettings(engine, advanced);
    engine.dispatch({ type: 'SET_TEACHER_EGG_CHOICE', speciesId: 'ember_fox' });
    const first = engine.getState();
    expect(createLearner(engine, 'Blue 3').ok).toBe(true);
    const id = readLearnerIndex().activeId;
    expect(id).not.toBe('default');
    saveTeacherSettings(engine, kinder);
    engine.dispatch({ type: 'AWARD_TOKENS', amount: 25 });
    engine.dispatch({ type: 'SET_TEACHER_EGG_CHOICE', speciesId: 'moss_turtle' });
    expect(load()!.player.currencies.tokens).toBe(125);
    expect(selectLearner(engine, 'default').ok).toBe(true);
    expect(engine.getState().learning).toEqual(advanced);
    expect(engine.getState().eggDiscovery!.teacherChoice).toBe('ember_fox');
    expect(engine.getState().player).toEqual(first.player);
    expect(selectLearner(engine, id).ok).toBe(true);
    expect(engine.getState().learning).toEqual(kinder);
    expect(engine.getState().eggDiscovery!.teacherChoice).toBe('moss_turtle');
    expect(engine.getState().player.currencies.tokens).toBe(125);
    expect(load(learnerSlot('default'))!.learning).toEqual(advanced);
    disconnect();
  });
  it('blocks profile switching on save failure and never overwrites a profile for a corrupt learner list', () => {
    const engine = new GameEngine(); save(engine.getState());
    const original = JSON.parse(exportSave('auto')).state;
    expect(createLearner(engine, 'Green 4').ok).toBe(true);
    const id = readLearnerIndex().activeId;
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(selectLearner(engine, 'default').ok).toBe(false);
    expect(readLearnerIndex().activeId).toBe(id);
    vi.restoreAllMocks();
    localStorage.setItem('vpet_learners_v1', '{broken');
    save(engine.getState());
    expect(JSON.parse(exportSave('auto')).state).toEqual(original);
    expect(createLearner(engine, 'New').ok).toBe(false);
  });
  it('rejects duplicate learner nicknames and prevents switching real profiles inside DEV', () => {
    const engine = new GameEngine();
    expect(createLearner(engine, 'Learner 1').ok).toBe(false);
    expect(createLearner(engine, '  ').ok).toBe(false);
    engine.dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview('home', advanced) });
    expect(createLearner(engine, 'Preview kid').ok).toBe(false);
    expect(selectLearner(engine, 'default').ok).toBe(false);
  });
  it('does not redirect another tab’s saves when the last-selected learner changes', () => {
    const firstTab = new GameEngine();
    saveTeacherSettings(firstTab, advanced);
    const secondTab = new GameEngine(firstTab.getState());
    expect(createLearner(secondTab, 'Second tab learner').ok).toBe(true);
    const id = secondTab.getState().learnerProfileId!;
    saveTeacherSettings(secondTab, kinder);
    // First tab still owns Learner 1, even though the shared index selects tab 2.
    expect(saveTeacherSettings(firstTab, { ...advanced, challenge: 'support' }).status).toBe('saved');
    expect(load(learnerSlot(id))!.learning).toEqual(kinder);
    expect(load('auto')!.learning.challenge).toBe('support');
  });
  it('updates only future mission and evolution questions without losing completed work', () => {
    const state = createInitialEngineState();
    state.learning = advanced;
    const problems = Array.from({ length: 3 }, () => generateLearningProblem(advanced));
    state.eggDiscovery!.mission = { day: '2026-09-05', style: 'help', problems, index: 1, feedback: '' };
    state.growthTrial = { petId: 'pet', stage: 'baby', kind: 'evolution', problems, index: 1, feedback: '', complete: false };
    const engine = new GameEngine(state);
    saveTeacherSettings(engine, kinder);
    const after = engine.getState();
    expect(after.growthTrial!.problems[0]).toEqual(problems[0]);
    expect(after.growthTrial!.index).toBe(1);
    expect(after.growthTrial!.problems[1]).toEqual(problems[1]);
    expect(after.growthTrial!.problems[2].question).toContain('How many stars?');
    expect(after.eggDiscovery!.mission!.problems[1]).toEqual(problems[1]);
    expect(after.eggDiscovery!.mission!.problems[2].id).not.toBe(problems[2].id);
    expect(after.player).toEqual(state.player);
  });
  it('overrides the next egg without awarding it early and can return to automatic matching', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'SET_TEACHER_EGG_CHOICE', speciesId: 'luna_owl' });
    expect(matchCompanion(engine.getState().eggDiscovery!)).toBe('luna_owl');
    engine.dispatch({ type: 'REVEAL_DISCOVERY_EGG' });
    expect(engine.getState().eggDiscovery!.status).toBe('collecting');
    expect(engine.getState().egg).toBeNull();
    engine.dispatch({ type: 'SET_TEACHER_EGG_CHOICE', speciesId: null });
    expect(engine.getState().eggDiscovery!.teacherChoice).toBeNull();
  });
});
