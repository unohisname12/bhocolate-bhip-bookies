import type { GameEngine } from '../engine/core/GameEngine';
import type { EngineState } from '../types/engine';
import type { LearnerIndex } from '../services/persistence/learnerIndex';
import type { ProfileResult } from '../services/persistence/learnerProfiles';
import type { ScreenName } from '../types/session';
import { createDemoState } from './demoMode';

// Presentation data lives in memory only, separate from real browser/cloud saves.
const profiles = new Map<string, { label: string; state: EngineState; assignment?: ScreenName }>();
export function rememberDemo(state: EngineState) {
  const id = state.learnerProfileId ?? 'default';
  const previous = profiles.get(id);
  profiles.set(id, { ...previous, label: previous?.label ?? 'Demo learner 1', state });
}
export function demoLearners(state: EngineState): LearnerIndex {
  rememberDemo(state);
  return { activeId: state.learnerProfileId ?? 'default', profiles: [...profiles].map(([id, row]) => ({ id, label: row.label })) };
}
export function selectDemoLearner(engine: GameEngine, id: string): ProfileResult {
  const row = profiles.get(id);
  if (!row) return { ok: false, error: 'Demo learner not found.' };
  rememberDemo(engine.getState());
  engine.dispatch({ type: 'LOAD_LEARNER_PROFILE', state: row.state });
  return { ok: true };
}
export function createDemoLearner(engine: GameEngine, label: string): ProfileResult {
  const name = label.trim();
  if (!name || name.length > 30) return { ok: false, error: 'Use a nickname or code of 1–30 characters.' };
  if ([...profiles.values()].some(row => row.label.toLowerCase() === name.toLowerCase())) return { ok: false, error: 'Choose a different learner code.' };
  rememberDemo(engine.getState());
  const id = `demo_${crypto.randomUUID()}`;
  const state = { ...createDemoState(), learnerProfileId: id };
  profiles.set(id, { label: name, state });
  engine.dispatch({ type: 'LOAD_LEARNER_PROFILE', state });
  return { ok: true };
}
export function demoAssignment(id: string) { return profiles.get(id)?.assignment ?? 'math'; }
export function assignDemo(id: string, assignment: ScreenName) {
  const row = profiles.get(id);
  if (row) profiles.set(id, { ...row, assignment });
}
