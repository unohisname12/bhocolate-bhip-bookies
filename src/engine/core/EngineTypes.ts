// Canonical definitions live in src/types/engine.ts — this file re-exports for backward compat.
// Will be deleted in Step 5 (Game Engine Extraction) when all imports are updated.
export type { EngineMode as AppMode, EngineMode, AnimationState, TestState, EngineState } from '../../types/engine';
export type { ScreenName as ScreenMode, ScreenName } from '../../types/session';
