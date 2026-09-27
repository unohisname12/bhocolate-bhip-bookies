import { createContext, useContext } from 'react';
import { useLearningSettings } from '../components/LearningContext';
import type { LearningSettings } from '../services/game/curriculum';
export const NextQuestionContext = createContext<(() => Promise<LearningSettings>) | null>(null);
export function useNextQuestionSettings() {
  const refresh = useContext(NextQuestionContext), learning = useLearningSettings();
  return refresh ?? (async () => learning);
}
