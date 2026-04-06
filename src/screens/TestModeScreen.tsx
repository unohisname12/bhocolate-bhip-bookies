import React, { useState } from 'react';
import { PetSprite } from '../components/pet/PetSprite';
import { PetNeedsPanel } from '../components/pet/PetNeedsPanel';
import { PetChamber } from '../components/pet/PetChamber';
import { SpriteAutoAssist } from '../utils/spriteAutoAssist';
import type { Pet, PetState } from '../types';

interface TestModeScreenProps {
  onExit: () => void;
}

const createTestPet = (): Pet => ({
  id: 'test_pet_1',
  ownerId: 'test_player',
  speciesId: 'koala_sprite',
  name: 'Test Koala',
  type: 'koala_sprite',
  stage: 'baby',
  mood: 'playful',
  state: 'idle',
  needs: {
    hunger: 75,
    happiness: 80,
    cleanliness: 70,
    health: 90,
  },
  stats: {
    strength: 12,
    speed: 14,
    defense: 11,
  },
  bond: 10,
  progression: {
    level: 2,
    xp: 25,
    evolutionFlags: [],
  },
  timestamps: {
    createdAt: new Date().toISOString(),
    lastInteraction: new Date().toISOString(),
    lastFedAt: new Date().toISOString(),
    lastCleanedAt: new Date().toISOString(),
  },
});

export const TestModeScreen: React.FC<TestModeScreenProps> = ({ onExit }) => {
  const [pet, setPet] = useState<Pet>(createTestPet);
  const [currentAnimationId, setCurrentAnimationId] = useState<string>('blue_koala_adult_walk');

  const animationNames = {
    blue_koala_hatching: 'Hatching',
    blue_koala_cleaning: 'Cleaning',
    blue_koala_dancing: 'Dancing',
    blue_koala_adult_walk: 'Adult Walk',
  };

  const handleStateCycle = () => {
    const states: PetState[] = ['idle', 'happy', 'hungry', 'sleeping', 'sick', 'dead'];
    const currentIndex = states.indexOf(pet.state);
    const nextState = states[(currentIndex + 1) % states.length];
    setPet((prev) => ({ ...prev, state: nextState }));
  };

  const handleAnimationSwitch = (animationId: string) => {
    setCurrentAnimationId(animationId);
  };

  const resetTestState = () => {
    setPet(createTestPet());
  };

  // Handle keyboard controls
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        handleAnimationSwitch('blue_koala_hatching');
      } else if (e.key === '2') {
        handleAnimationSwitch('blue_koala_cleaning');
      } else if (e.key === '3') {
        handleAnimationSwitch('blue_koala_dancing');
      } else if (e.key === '4') {
        handleAnimationSwitch('blue_koala_adult_walk');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen p-3 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black">TEST MODE</h1>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded font-semibold"
        >
          Exit Test Mode
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 shadow-sm">
          <h2 className="font-bold text-lg mb-1">Pet Preview - {animationNames[currentAnimationId as keyof typeof animationNames]}</h2>
          <PetChamber variant="chamber">
            <PetSprite speciesId={currentAnimationId} animationName={pet.state} scale={1.5} />
          </PetChamber>
          <p className="mt-2 text-sm text-slate-300">Name: {pet.name}</p>
          <p className="text-sm text-slate-300">State: {pet.state}</p>
          <PetNeedsPanel
            hunger={pet.needs.hunger}
            happiness={pet.needs.happiness}
            cleanliness={pet.needs.cleanliness}
            health={pet.needs.health}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={handleStateCycle} className="py-2 bg-orange-500 rounded col-span-2">Cycle Visual State</button>
            <button onClick={() => handleAnimationSwitch('blue_koala_hatching')} className={`py-2 rounded font-semibold text-sm ${currentAnimationId === 'blue_koala_hatching' ? 'bg-blue-600' : 'bg-slate-600'}`}>1: Hatching</button>
            <button onClick={() => handleAnimationSwitch('blue_koala_cleaning')} className={`py-2 rounded font-semibold text-sm ${currentAnimationId === 'blue_koala_cleaning' ? 'bg-blue-600' : 'bg-slate-600'}`}>2: Cleaning</button>
            <button onClick={() => handleAnimationSwitch('blue_koala_dancing')} className={`py-2 rounded font-semibold text-sm ${currentAnimationId === 'blue_koala_dancing' ? 'bg-blue-600' : 'bg-slate-600'}`}>3: Dancing</button>
            <button onClick={() => handleAnimationSwitch('blue_koala_adult_walk')} className={`py-2 rounded font-semibold text-sm ${currentAnimationId === 'blue_koala_adult_walk' ? 'bg-blue-600' : 'bg-slate-600'}`}>4: Adult Walk</button>
            <button onClick={resetTestState} className="py-2 bg-slate-600 rounded col-span-2">Reset Test State</button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Keyboard shortcuts: Press 1/2/3/4 to switch animations</p>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 shadow-sm">
          <SpriteAutoAssist
            spriteUrl="/assets/koala_sprite.png"
            cols={5}
            rows={4}
            frameWidth={128}
            frameHeight={128}
            onGroupsChange={(groups) => {
              console.log('Suggested animation groups:', groups);
            }}
          />
        </div>
      </div>
    </div>
  );
};
