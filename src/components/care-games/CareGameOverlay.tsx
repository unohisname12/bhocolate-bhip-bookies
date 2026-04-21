import React from 'react';
import type { InteractionState } from '../../types/interaction';
import type { CareGameProps } from './types';
import { PetSweetSpots } from './PetSweetSpots';
import { WashScrubZones } from './WashScrubZones';
import { BrushStrokes } from './BrushStrokes';
import { ComfortHoldZone } from './ComfortHoldZone';
import { TrainQuickTap } from './TrainQuickTap';
import { PlayCatch } from './PlayCatch';

interface CareGameOverlayProps {
  interaction: InteractionState;
  scale: number;
  onComplete: (quality: number) => void;
  onCancel: () => void;
}

const GAME_MAP: Record<string, React.FC<CareGameProps>> = {
  pet: PetSweetSpots,
  wash: WashScrubZones,
  brush: BrushStrokes,
  comfort: ComfortHoldZone,
  train: TrainQuickTap,
  play: PlayCatch,
};

export const CareGameOverlay: React.FC<CareGameOverlayProps> = ({
  interaction, scale, onComplete, onCancel,
}) => {
  const mode = interaction.activeMode;
  if (mode === 'idle' || !interaction.careGameActive) return null;

  const GameComponent = GAME_MAP[mode];
  if (!GameComponent) return null;

  return (
    <GameComponent
      mode={mode}
      onComplete={onComplete}
      onCancel={onCancel}
      scale={scale}
    />
  );
};
