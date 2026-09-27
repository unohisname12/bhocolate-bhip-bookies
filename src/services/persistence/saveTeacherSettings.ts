import type { GameEngine } from '../../engine/core/GameEngine';
import type { LearningSettings } from '../game/curriculum';
import { computeChecksum, validateSave } from './saveValidation';
import { exportSave, getSaveError, save } from './SaveManager';
import { learnerSlot } from './learnerIndex';

export type TeacherSaveResult = { status: 'saved' | 'preview' } | { status: 'error'; message: string };

/** Confirm the committed profile, not merely that the Save button was clicked. */
export function saveTeacherSettings(engine: GameEngine, settings: LearningSettings): TeacherSaveResult {
  engine.dispatch({ type: 'SET_LEARNING_SETTINGS', settings });
  const state = engine.getState();
  if (state.devPreview || state.mode === 'test') return { status: 'preview' };
  const confirmed = () => {
    try {
      const stored = JSON.parse(exportSave(learnerSlot(state.learnerProfileId ?? 'default')));
      return validateSave(stored).valid && stored.checksum === computeChecksum(state);
    } catch { return false; }
  };
  // The normal action listener saves synchronously. Also support retry and
  // callers without that listener, without writing a second backup on success.
  if (getSaveError() || !confirmed()) save(state);
  if (getSaveError() || !confirmed()) return { status: 'error', message: getSaveError() ?? 'Saving could not be confirmed. Please retry before leaving.' };
  return { status: 'saved' };
}
