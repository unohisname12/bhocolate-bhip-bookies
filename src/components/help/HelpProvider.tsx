import React, { useState, useCallback } from 'react';
import { TutorialOverlay } from './TutorialOverlay';
import { HelpPanel } from './HelpPanel';
import { HelpButton } from './HelpButton';
import { HintToast } from './HintToast';
import type { HelpState } from '../../types/help';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface HelpProviderProps {
  helpState: HelpState;
  dispatch: (action: GameEngineAction) => void;
  children: React.ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({
  helpState,
  dispatch,
  children,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const handleTutorialComplete = useCallback(() => {
    setActiveTutorial(null);
  }, []);

  const handleReplayTutorial = useCallback((featureId: string) => {
    setShowPanel(false);
    dispatch({ type: 'HELP_START_TUTORIAL', featureId });
    setActiveTutorial(featureId);
  }, [dispatch]);

  const handleReplayIntro = useCallback(() => {
    setShowPanel(false);
    dispatch({ type: 'SHOW_ONBOARDING' });
  }, [dispatch]);

  const handleHintDone = useCallback(() => {
    setActiveHint(null);
  }, []);

  return (
    <>
      {children}

      {/* Help button — always visible */}
      <HelpButton onClick={() => setShowPanel(true)} />

      {/* Help panel (on-demand) */}
      {showPanel && (
        <HelpPanel
          encounteredFeatures={helpState.encounteredFeatures}
          onClose={() => setShowPanel(false)}
          onReplayTutorial={handleReplayTutorial}
          onReplayIntro={handleReplayIntro}
        />
      )}

      {/* Active tutorial overlay */}
      {activeTutorial && (
        <TutorialOverlay
          featureId={activeTutorial}
          dispatch={dispatch}
          onComplete={handleTutorialComplete}
        />
      )}

      {/* Contextual hint toast */}
      {activeHint && (
        <HintToast text={activeHint} onDone={handleHintDone} />
      )}
    </>
  );
};
