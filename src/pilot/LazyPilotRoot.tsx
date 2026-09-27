import { lazy } from 'react';

export const LazyPilotRoot = lazy(() => import('./PilotRoot').then(module => ({ default: module.PilotRoot })));
