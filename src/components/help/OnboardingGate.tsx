import React from 'react';
import { TutorialOverlay } from './TutorialOverlay';
import { ONBOARDING_TUTORIAL_ID } from '../../config/help/onboardingTutorial';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface OnboardingGateProps {
  showOnboarding: boolean;
  dispatch: (action: GameEngineAction) => void;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({
  showOnboarding,
  dispatch,
}) => {
  if (!showOnboarding) return null;

  return (
    <TutorialOverlay
      featureId={ONBOARDING_TUTORIAL_ID}
      dispatch={dispatch}
      onComplete={() => {
        dispatch({ type: 'COMPLETE_ONBOARDING' });
      }}
    />
  );
};
