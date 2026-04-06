import type { EngineState } from '../../types/engine';
import { computeChecksum, validateSave, type SaveData } from './saveValidation';
import { migrate, CURRENT_SAVE_VERSION } from './saveMigrations';

const SAVE_KEY_PREFIX = 'vpet_save_';
const AUTO_SLOT = 'auto';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const save = (state: EngineState, slot: string = AUTO_SLOT): void => {
  const data: SaveData = {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    checksum: computeChecksum(state),
    state,
  };
  try {
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(data));
  } catch (e) {
    console.error('[SaveManager] Failed to save:', e);
  }
};

export const load = (slot: string = AUTO_SLOT): EngineState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    const { valid, errors } = validateSave(data);
    if (!valid) {
      console.warn('[SaveManager] Invalid save data:', errors);
      return null;
    }
    return migrate(data as SaveData);
  } catch (e) {
    console.error('[SaveManager] Failed to load:', e);
    return null;
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

export const exportSave = (slot: string = AUTO_SLOT): string => {
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
export const debouncedSave = (state: EngineState, slot: string = AUTO_SLOT): void => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    save(state, slot);
    saveTimer = null;
  }, 500);
};
