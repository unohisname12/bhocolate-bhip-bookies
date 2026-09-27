import type { EngineState } from '../../types/engine';
import { computeChecksum, validateSave, type SaveData } from './saveValidation';
import { migrate, CURRENT_SAVE_VERSION } from './saveMigrations';
import { activeLearnerSlot, learnerSlot, readLearnerIndex } from './learnerIndex';

const SAVE_KEY_PREFIX = 'vpet_save_';
let saveError: string | null = null;
export const getSaveError = () => saveError;
const reportError = (message: string | null) => {
  saveError = message;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vpet-save-status'));
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const save = (state: EngineState, slot?: string): void => {
  if (state.mode === 'test' || state.devPreview) return;
  const data: SaveData = {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    checksum: computeChecksum(state),
    state,
  };
  try {
    if (slot === undefined) {
      const index = readLearnerIndex();
      if (index.error) throw new Error(index.error);
      slot = learnerSlot(state.learnerProfileId ?? 'default');
    }
    const old = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (old) {
      // Retain one previous valid save; never destroy unreadable recovery data.
      let valid = false;
      try { valid = validateSave(JSON.parse(old)).valid; } catch { /* retain below */ }
      localStorage.setItem(SAVE_KEY_PREFIX + slot + (valid ? '_backup' : `_recovery_${Date.now()}`), old);
    }
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(data));
    reportError(null);
  } catch (e) {
    reportError('Progress could not be saved on this device. Keep this tab open and free browser storage.');
    console.error('[SaveManager] Failed to save:', e);
  }
};

export const load = (slot?: string): EngineState | null => {
  try {
    slot ??= activeLearnerSlot();
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    const { valid, errors } = validateSave(data);
    if (!valid) {
      console.warn('[SaveManager] Invalid save data:', errors);
      reportError('The latest save could not be read. Its original data has been kept for recovery.');
      return !slot.endsWith('_backup') ? load(`${slot}_backup`) : null;
    }
    if ((data as SaveData).version < 18 && !localStorage.getItem(SAVE_KEY_PREFIX + slot + '_before_economy_v1')) localStorage.setItem(SAVE_KEY_PREFIX + slot + '_before_economy_v1', raw);
    return migrate(data as SaveData);
  } catch (e) {
    reportError('The save could not be read. Its original data has been kept for recovery.');
    console.error('[SaveManager] Failed to load:', e);
    return slot && !slot.endsWith('_backup') ? load(`${slot}_backup`) : null;
  }
};

export const listSlots = (): { slot: string; timestamp: number }[] => {
  const slots: { slot: string; timestamp: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SAVE_KEY_PREFIX)) {
      try {
        const raw = localStorage.getItem(key)!;
        const data = JSON.parse(raw) as { timestamp?: number };
        slots.push({ slot: key.slice(SAVE_KEY_PREFIX.length), timestamp: data.timestamp ?? 0 });
      } catch {
        // skip corrupt entry
      }
    }
  }
  return slots.sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteSlot = (slot: string): void => {
  localStorage.removeItem(SAVE_KEY_PREFIX + slot);
};

export const exportSave = (slot: string = activeLearnerSlot()): string => {
  return localStorage.getItem(SAVE_KEY_PREFIX + slot) ?? '';
};

export const importSave = (json: string): EngineState | null => {
  try {
    const data = JSON.parse(json) as unknown;
    const { valid, errors } = validateSave(data);
    if (!valid) {
      console.warn('[SaveManager] Invalid import:', errors);
      return null;
    }
    return migrate(data as SaveData);
  } catch (e) {
    console.error('[SaveManager] Failed to import:', e);
    return null;
  }
};

/** Debounced save — waits 500ms after last call before writing */
export const debouncedSave = (state: EngineState, slot: string = learnerSlot(state.learnerProfileId ?? 'default')): void => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    save(state, slot);
    saveTimer = null;
  }, 500);
};
