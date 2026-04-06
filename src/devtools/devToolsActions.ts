import type { EngineState } from '../types/engine';
import type { PetNeeds, PetState } from '../types';
import type { ScreenName } from '../types/session';

export type DevToolsAction =
  | { type: 'DEV_SET_STATE'; payload: Partial<EngineState> }
  | { type: 'DEV_SET_SPEED'; payload: { tickIntervalMs: number } }
  | { type: 'DEV_SET_NEEDS'; payload: Partial<PetNeeds> }
  | { type: 'DEV_FORCE_PET_STATE'; payload: { state: PetState } }
  | { type: 'DEV_JUMP_SCREEN'; payload: ScreenName }
  | { type: 'DEV_SNAPSHOT_SAVE'; payload: { name: string } }
  | { type: 'DEV_SNAPSHOT_LOAD'; payload: { name: string } };
