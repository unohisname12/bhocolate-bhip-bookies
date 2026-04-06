import type { EngineState } from '../../types/engine';

export interface SaveData {
  version: number;
  timestamp: number;
  checksum: string;
  state: EngineState;
}

const stableStringify = (obj: unknown): string => {
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
};

export const computeChecksum = (state: EngineState): string => {
  const str = stableStringify(state);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

export const validateSave = (data: unknown): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Save data is not an object'] };
  }
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') errors.push('Missing version');
  if (typeof d.timestamp !== 'number') errors.push('Missing timestamp');
  if (!d.state || typeof d.state !== 'object') errors.push('Missing state');
  return { valid: errors.length === 0, errors };
};
