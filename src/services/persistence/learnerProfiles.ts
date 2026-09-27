import type { GameEngine } from '../../engine/core/GameEngine';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { exportSave, getSaveError, load, save } from './SaveManager';
import { learnerSlot, readLearnerIndex, writeLearnerIndex } from './learnerIndex';

export type ProfileResult = { ok: true } | { ok: false; error: string };
export function selectLearner(engine: GameEngine, id: string): ProfileResult {
  if (engine.getState().devPreview || engine.getState().mode === 'test') return { ok: false, error: 'Exit preview before switching learners.' };
  const index = readLearnerIndex();
  if (index.error) return { ok: false, error: index.error };
  if (id === (engine.getState().learnerProfileId ?? 'default')) return { ok: true };
  const profile = index.profiles.find(p => p.id === id);
  if (!profile) return { ok: false, error: 'That learner profile was not found.' };
  try {
    save(engine.getState());
    if (getSaveError()) return { ok: false, error: getSaveError()! };
    const target = load(learnerSlot(id));
    if (!target) return { ok: false, error: 'This learner’s save could not be loaded. No profile was replaced.' };
    writeLearnerIndex({ ...index, activeId: id });
    engine.dispatch({ type: 'LOAD_LEARNER_PROFILE', state: { ...target, learnerProfileId: id } });
    return { ok: true };
  } catch { return { ok: false, error: 'Could not switch learners. Check browser storage and retry.' }; }
}
export function createLearner(engine: GameEngine, label: string): ProfileResult {
  if (engine.getState().devPreview || engine.getState().mode === 'test') return { ok: false, error: 'Exit preview before adding learners.' };
  const name = label.trim();
  if (!name || name.length > 30) return { ok: false, error: 'Use a nickname or class code, between 1 and 30 characters.' };
  const index = readLearnerIndex();
  if (index.error) return { ok: false, error: index.error };
  if (index.profiles.some(p => p.label.toLowerCase() === name.toLowerCase())) return { ok: false, error: 'Choose a different nickname so learners are easy to tell apart.' };
  try {
    save(engine.getState());
    if (getSaveError()) return { ok: false, error: getSaveError()! };
    const id = `student_${crypto.randomUUID()}`;
    const state = createInitialEngineState();
    state.learnerProfileId = id;
    state.player = { ...state.player, id, displayName: name };
    save(state, learnerSlot(id));
    if (getSaveError() || !exportSave(learnerSlot(id))) return { ok: false, error: getSaveError() ?? 'New learner could not be saved.' };
    writeLearnerIndex({ activeId: id, profiles: [...index.profiles, { id, label: name }] });
    engine.dispatch({ type: 'LOAD_LEARNER_PROFILE', state });
    return { ok: true };
  } catch { return { ok: false, error: 'Could not create a learner. Your existing profiles are unchanged.' }; }
}
