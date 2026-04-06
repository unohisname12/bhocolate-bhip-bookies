import React from 'react';
import type { PetNeeds } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface NeedSlidersProps {
  needs: PetNeeds | null;
  dispatch: (action: GameEngineAction) => void;
}

const DEFAULT_NEEDS: PetNeeds = {
  hunger: 75,
  happiness: 80,
  cleanliness: 70,
  health: 90,
};

export const NeedSliders: React.FC<NeedSlidersProps> = ({ needs, dispatch }) => {
  if (!needs) {
    return <p className="text-xs text-slate-300">No active pet in current state.</p>;
  }

  const setNeed = (key: keyof PetNeeds, value: number) => {
    dispatch({ type: 'DEV_SET_NEEDS', payload: { [key]: value } });
  };

  const resetDefaults = () => {
    dispatch({ type: 'DEV_SET_NEEDS', payload: DEFAULT_NEEDS });
  };

  return (
    <div className="space-y-3">
      {(['hunger', 'happiness', 'cleanliness', 'health'] as Array<keyof PetNeeds>).map((key) => (
        <label key={key} className="block text-xs text-slate-100">
          <div className="mb-1 flex items-center justify-between">
            <span className="capitalize">{key}</span>
            <span className="font-mono">{Math.round(needs[key])}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={needs[key]}
            onChange={(event) => setNeed(key, Number(event.target.value))}
            className="w-full"
          />
        </label>
      ))}

      <button
        type="button"
        onClick={resetDefaults}
        className="w-full rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
      >
        Reset To Defaults (75/80/70/90)
      </button>
    </div>
  );
};
