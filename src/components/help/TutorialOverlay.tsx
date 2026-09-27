import { createPortal } from 'react-dom';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SpotlightMask } from './SpotlightMask';
import { DialogueBubble } from './DialogueBubble';
import { getTutorialSteps } from '../../services/help/tutorialEngine';
import type { TutorialStep } from '../../types/help';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface TutorialOverlayProps {
  featureId: string;
  dispatch: (action: GameEngineAction) => void;
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  featureId,
  dispatch,
  onComplete,
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const steps = getTutorialSteps(featureId);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep: TutorialStep | undefined = steps[stepIndex];

  // Track the anchor position of the current target
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  // Sync anchor position with DOM — this effect measures a target element's
  // layout and stores its center point. The setState calls synchronize React
  // state with the external DOM, which is the intended use of effects.
  useEffect(() => {
    if (!currentStep?.target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with DOM: no target element to anchor to
      setAnchor(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (!el) {
      setAnchor(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setAnchor({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      dispatch({ type: 'HELP_ADVANCE_STEP', featureId, stepId: steps[stepIndex].id });
      setStepIndex(stepIndex + 1);
    } else {
      dispatch({ type: 'HELP_COMPLETE_TUTORIAL', featureId });
      onComplete();
    }
  }, [stepIndex, steps, featureId, dispatch, onComplete]);

  const handleSkip = useCallback(() => {
    dispatch({ type: 'HELP_SKIP_TUTORIAL', featureId });
    onComplete();
  }, [featureId, dispatch, onComplete]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  if (!currentStep) return null;

  const isLast = stepIndex === steps.length - 1;

  return createPortal(
    <div ref={panel} className="fixed inset-0 z-[600]" role="dialog" aria-modal="true" aria-label="Tutorial" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); handleSkip(); } if (e.key === 'Tab') { const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button') ?? []); const first = buttons[0], last = buttons.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}>
      {/* Spotlight mask if we have a target */}
      {currentStep.target && (
        <SpotlightMask
          target={currentStep.target}
          radius={currentStep.highlightRadius}
          onTargetClick={currentStep.action === 'tap' ? handleNext : undefined}
        />
      )}

      {/* Dark overlay when no target (dialogue-only steps) */}
      {!currentStep.target && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70" />
      )}

      {/* Dialogue bubble */}
      <DialogueBubble
        text={currentStep.text}
        speaker={currentStep.speaker}
        position={currentStep.position}
        anchorX={anchor?.x}
        anchorY={anchor?.y}
        onNext={handleNext}
        onSkip={handleSkip}
        isLastStep={isLast}
      />
    </div>, document.body
  );
};
