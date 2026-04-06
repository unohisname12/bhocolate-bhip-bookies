import React from 'react';
import { PetChamber } from '../components/pet/PetChamber';
import { EggSprite } from '../components/pet/EggSprite';
import { IncubationPanel } from '../components/pet/IncubationPanel';
import { GameButton } from '../components/ui/GameButton';
import type { EggType } from '../config/assetManifest';
import type { Egg } from '../types';

interface IncubationScreenProps {
  egg: Egg;
  onTap: () => void;
  onHatch: () => void;
}

export const IncubationScreen: React.FC<IncubationScreenProps> = ({
  egg,
  onTap,
  onHatch,
}) => {
  const isReady = egg.state === 'ready';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900 w-full max-w-lg mx-auto">
      
      <div className="w-full mb-8 text-center">
        <h1 className="text-3xl font-black text-slate-100 uppercase tracking-widest drop-shadow-md">
          Incubation Chamber
        </h1>
        <p className="text-slate-400 font-bold mt-2">Nurture your digital companion</p>
      </div>

      <div onClick={isReady ? undefined : onTap} className="w-full cursor-pointer group">
        <PetChamber variant="incubator">
          <EggSprite 
            type={egg.type as EggType} 
            size="lg" 
            animationClass={isReady ? 'anim-wobble anim-glow' : 'anim-breathe'} 
          />
        </PetChamber>
      </div>

      <div className="w-full mt-8">
        <IncubationPanel progress={egg.progress} />
      </div>

      <div className="w-full mt-6 h-16 flex items-center justify-center">
        {isReady && (
          <GameButton 
            size="lg" 
            variant="primary" 
            onClick={onHatch}
            className="w-full max-w-xs anim-pop"
          >
            HATCH EGG!
          </GameButton>
        )}
      </div>

    </div>
  );
};
