export { DevToolsOverlay } from './DevToolsOverlay';
export { StateInspector } from './StateInspector';
export { TimeControl } from './TimeControl';
export { SpriteDebugger } from './SpriteDebugger';
export { ActionLog } from './ActionLog';
export { SnapshotManager } from './SnapshotManager';
export { NeedSliders } from './NeedSliders';

import type React from 'react';

export const DevToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
