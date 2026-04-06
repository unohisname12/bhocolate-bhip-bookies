import React, { useState } from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import { Toast } from '../ui/Toast';

interface PetNeedsPanelProps {
  health: number;
  hunger: number;
  happiness: number;
  cleanliness: number;
  className?: string;
}

export const PetNeedsPanel: React.FC<PetNeedsPanelProps> = ({
  health,
  hunger,
  happiness,
  cleanliness,
  className = '',
}) => {
  const warnLow = [health, hunger, happiness, cleanliness].some((value) => value < 30);

  const toastMessage = hunger < 30
    ? 'Your pet is hungry!'
    : cleanliness < 30
      ? 'Your pet needs cleaning!'
      : health < 30
        ? 'Your pet is not feeling well!'
        : null;

  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const showToast = toastMessage && toastMessage !== dismissedMessage;

  return (
    <>
      {showToast && (
        <Toast
          message={toastMessage}
          type="warning"
          onClose={() => setDismissedMessage(toastMessage)}
        />
      )}
      <div className={`flex flex-col gap-3 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-700 w-full max-w-sm mx-auto shadow-lg ${warnLow ? 'anim-warning border-red-500' : ''} ${className}`}>
      <div className="flex items-center gap-3">
        <img src="/assets/generated/final/icon_heart.png" alt="health" className="w-6 h-6 drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
        <div className="flex-1">
          <ProgressBar value={health} max={100} color="bg-red-500" label="Health" showValue={false} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <img src="/assets/generated/final/icon_hunger.png" alt="hunger" className="w-6 h-6 drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
        <div className="flex-1">
          <ProgressBar value={hunger} max={100} color="bg-orange-500" label="Hunger" showValue={false} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <img src="/assets/generated/final/icon_star.png" alt="happiness" className="w-6 h-6 drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
        <div className="flex-1">
          <ProgressBar value={happiness} max={100} color="bg-yellow-400" label="Happy" showValue={false} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <img src="/assets/generated/final/icon_clean.png" alt="cleanliness" className="w-6 h-6 drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
        <div className="flex-1">
          <ProgressBar value={cleanliness} max={100} color="bg-sky-400" label="Clean" showValue={false} />
        </div>
      </div>
    </div>
    </>
  );
};
