import type { TutorialStep } from '../../types/help';
import { getHelpConfig } from './helpRegistry';

/** Get the tutorial steps for a feature, or empty array if none. */
export const getTutorialSteps = (featureId: string): TutorialStep[] => {
  return getHelpConfig(featureId)?.tutorial ?? [];
};

/** Get the next step after the current one, or null if done. */
export const getNextStep = (
  featureId: string,
  currentStepId: string,
): TutorialStep | null => {
  const steps = getTutorialSteps(featureId);
  const idx = steps.findIndex((s) => s.id === currentStepId);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1];
};

/** Check if a tutorial should auto-start for this feature. */
export const shouldStartTutorial = (
  featureId: string,
  completedTutorials: string[],
): boolean => {
  if (completedTutorials.includes(featureId)) return false;
  const steps = getTutorialSteps(featureId);
  return steps.length > 0;
};

/** First-run onboarding gate — only fires if the player has never onboarded. */
export const shouldStartOnboarding = (
  hasOnboarded: boolean,
  completedTutorials: string[],
): boolean => {
  if (hasOnboarded) return false;
  return shouldStartTutorial('first-run-onboarding', completedTutorials);
};
