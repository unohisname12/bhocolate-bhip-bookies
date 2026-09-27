import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { GameEngine } from '../../../engine/core/GameEngine';
import { connectPersistence } from '../enginePersistence';
import { getSaveError, load, save } from '../SaveManager';
import { computeChecksum, validateSave } from '../saveValidation';
import { createScreenPreview } from '../../../devtools/screenCatalog';

describe('player persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('saves discovery choices and teacher settings immediately and restores them', () => {
    const engine = new GameEngine();
    const disconnect = connectPersistence(engine, new EventTarget(), new EventTarget());
    engine.dispatch({ type: 'ANSWER_DISCOVERY_QUIZ', question: 0, choice: 1 });
    engine.dispatch({ type: 'SET_LEARNING_SETTINGS', settings: { grade: 12, topic: 'Derivatives', challenge: 'stretch', timedWarmup: false } });
    expect(load()?.eggDiscovery?.answers).toEqual(engine.getState().eggDiscovery?.answers);
    expect(load()?.learning).toEqual(engine.getState().learning);
    disconnect();
  });
  it('flushes passive changes on pagehide and removes listeners on cleanup', () => {
    const engine = new GameEngine(), page = new EventTarget(), visibility = new EventTarget();
    const disconnect = connectPersistence(engine, page, visibility);
    engine.tick(1000);
    page.dispatchEvent(new Event('pagehide'));
    expect(load()?.elapsedMs).toBe(1000);
    disconnect();
    engine.tick(1000);
    page.dispatchEvent(new Event('pagehide'));
    expect(load()?.elapsedMs).toBe(1000);
  });
  it('never replaces the player save with a test fixture and restores normal state on exit', () => {
    const engine = new GameEngine();
    const disconnect = connectPersistence(engine, new EventTarget(), new EventTarget());
    engine.dispatch({ type: 'ANSWER_DISCOVERY_QUIZ', question: 0, choice: 1 });
    const original = engine.getState();
    engine.dispatch({ type: 'ENTER_TEST_MODE' });
    engine.dispatch({ type: 'AWARD_TOKENS', amount: 9000 });
    vi.advanceTimersByTime(30_000);
    expect(load()?.player).toEqual(original.player);
    engine.dispatch({ type: 'EXIT_TEST_MODE' });
    expect(engine.getState().egg).toEqual(original.egg);
    expect(engine.getState().player).toEqual(original.player);
    disconnect();
  });
  it('checks the serialized checksum, including optional undefined fields', () => {
    const state = { ...createInitialEngineState(), showOnboarding: undefined };
    save(state);
    expect(load()?.player.id).toBe(state.player.id);
    const data = JSON.parse(localStorage.getItem('vpet_save_auto')!);
    data.state.player.currencies.tokens++;
    expect(validateSave(data).valid).toBe(false);
    expect(validateSave({ version: 14, timestamp: 0, state: {}, checksum: computeChecksum({} as never) }).valid).toBe(false);
  });
  it('recovers a backup and preserves corrupt data before a new save', () => {
    const state = createInitialEngineState();
    save(state); save(state);
    localStorage.setItem('vpet_save_auto', '{broken');
    expect(load()?.player.id).toBe(state.player.id);
    save(state);
    expect(localStorage.getItem(`vpet_save_auto_recovery_${Date.now()}`)).toBe('{broken');
  });
  it('reports storage failures instead of claiming progress was saved', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    save(createInitialEngineState());
    expect(getSaveError()).toContain('could not be saved');
  });
  it('never persists developer navigation or preview rewards, including on tab hide', () => {
    const engine = new GameEngine(), page = new EventTarget();
    const disconnect = connectPersistence(engine, page, new EventTarget());
    engine.dispatch({ type: 'ANSWER_DISCOVERY_QUIZ', question: 0, choice: 1 });
    const original = load();
    engine.dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview('battle', engine.getState().learning) });
    engine.dispatch({ type: 'AWARD_TOKENS', amount: 90000 });
    page.dispatchEvent(new Event('pagehide'));
    vi.advanceTimersByTime(60_000);
    expect(load()).toEqual(original);
    engine.dispatch({ type: 'EXIT_DEV_PREVIEW' });
    expect(load()?.player).toEqual(original?.player);
    disconnect();
  });
});
