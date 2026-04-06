import { createTestEngineState } from '../state/createTestEngineState';
import type { EngineState } from '../core/EngineTypes';

export const startTestMode = (): EngineState => createTestEngineState();

export const exitTestMode = (prev: EngineState): EngineState => ({
  ...prev,
  mode: 'normal',
  test: { active: false, label: 'Normal Mode' },
});
