import React, { useCallback } from 'react';
import { CareStatBar } from '../components/care/CareStatBar';
import { InteractionCard } from '../components/care/InteractionCard';
import { CareToolList } from '../components/care/CareToolList';
import { CareTips } from '../components/care/CareTips';
import { INTERACTION_ORDER } from '../config/interactionConfig';
import { GameButton } from '../components/ui/GameButton';
import type { Pet } from '../types';
import type { HandMode, InteractionState } from '../types/interaction';
import type { Inventory } from '../types/inventory';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface PetCareScreenProps {
  pet: Pet;
  interaction: InteractionState;
  inventory: Inventory;
  playerTokens: number;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

export const PetCareScreen: React.FC<PetCareScreenProps> = ({
  pet, interaction, inventory, playerTokens, dispatch, onClose,
}) => {
  // Start interaction: activate hand mode and go back to home screen
  const handleStartInteraction = useCallback((mode: Exclude<HandMode, 'idle'>) => {
    dispatch({ type: 'SET_HAND_MODE', mode });
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  }, [dispatch]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 w-full max-w-lg mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <GameButton variant="secondary" size="sm" onClick={onClose}>
            &larr;
          </GameButton>
          <h1 className="text-xl font-black text-slate-100 uppercase tracking-widest">
            Pet Care
          </h1>
        </div>
        <span className="text-amber-400 font-black text-sm flex items-center gap-1">
          {playerTokens}
          <img
            src="/assets/generated/final/icon_token.png"
            alt="tokens"
            className="w-4 h-4 inline"
            style={{ imageRendering: 'pixelated' }}
          />
        </span>
      </div>

      {/* Care Stats */}
      <section className="mb-5">
        <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">
          Care Stats
        </h2>
        <div
          className="flex flex-col gap-2 p-3 rounded-xl"
          style={{
            background: 'rgba(20,18,35,0.6)',
            border: '1px solid rgba(60,50,100,0.2)',
          }}
        >
          <CareStatBar
            label="Trust"
            value={pet.trust ?? 20}
            icon="/assets/generated/final/icon_heart.png"
          />
          <CareStatBar
            label="Discipline"
            value={pet.discipline ?? 0}
            icon="/assets/generated/final/icon_energy.png"
          />
          <CareStatBar
            label="Grooming"
            value={pet.groomingScore ?? 50}
            icon="/assets/generated/final/icon_clean.png"
          />
          <CareStatBar
            label="Stress"
            value={pet.stress ?? 0}
            icon="/assets/generated/final/icon_hunger.png"
            invertThreshold
          />
        </div>
      </section>

      {/* Interactions Grid */}
      <section className="mb-5">
        <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">
          Interactions
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {INTERACTION_ORDER.map(mode => (
            <InteractionCard
              key={mode}
              mode={mode}
              interaction={interaction}
              onStart={handleStartInteraction}
            />
          ))}
        </div>
      </section>

      {/* Care Tools */}
      <section
        className="mb-5 p-3 rounded-xl"
        style={{
          background: 'rgba(20,18,35,0.6)',
          border: '1px solid rgba(60,50,100,0.2)',
        }}
      >
        <CareToolList
          inventory={inventory}
          interaction={interaction}
          onGoToShop={() => dispatch({ type: 'SET_SCREEN', screen: 'shop' })}
        />
      </section>

      {/* Tips */}
      <section>
        <CareTips pet={pet} interaction={interaction} />
      </section>
    </div>
  );
};
