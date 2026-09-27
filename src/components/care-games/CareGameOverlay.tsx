import React from 'react';
import type { InteractionState } from '../../types/interaction';
import { CareSession } from './CareSession';

interface CareGameOverlayProps {
  interaction: InteractionState;
  scale: number;
  onComplete: (quality: number) => void;
  onCancel: () => void;
}

export const CareGameOverlay: React.FC<CareGameOverlayProps> = ({
  interaction, onComplete, onCancel,
}) => {
  const mode = interaction.activeMode;
  if (mode === 'idle' || !interaction.careGameActive) return null;

  return (
    <CareSession
      key={`${mode}-${interaction.currentInteractionStart}`}
      mode={mode}
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
};
