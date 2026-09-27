import { SchoolCare } from '../components/care/SchoolCare';
import React, { useCallback } from 'react';
import { CareStatBar } from '../components/care/CareStatBar';
import { InteractionCard } from '../components/care/InteractionCard';
import { CareToolList } from '../components/care/CareToolList';
import { CareTips } from '../components/care/CareTips';
import { CareStage } from '../components/care/CareStage';
import { INTERACTION_ORDER } from '../config/interactionConfig';
import { canInteract } from '../engine/systems/InteractionSystem';
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

export const PetCareScreen: React.FC<PetCareScreenProps> = ({ pet, interaction, inventory, playerTokens, dispatch, onClose }) => {
  const start = useCallback((mode: Exclude<HandMode, 'idle'>) => {
    if (!canInteract(pet, mode, interaction, playerTokens).allowed) return;
    dispatch({ type: 'START_PET_INTERACTION', mode });
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  }, [pet, interaction, playerTokens, dispatch]);
  return <main className="care-lodge"><div className="care-lodge-inner">
    <header className="care-lodge-header"><button className="care-button quiet" aria-label="Back to home" onClick={onClose}>← Home</button><span className="care-wallet"><img src="/assets/generated/final/icon_token.png" alt="" /> {playerTokens} tokens</span></header>
    <div className="care-overview"><section><p className="care-eyebrow">The companion cottage</p><h1>A little care.<br />A closer friendship.</h1><p className="care-lodge-intro">Wash, play, or just enjoy a quiet moment with {pet.name}. Little things mean a lot.</p><div className="mt-5"><CareStage pet={pet} /></div></section>
      <section className="care-wellbeing" aria-label="Pet wellbeing"><p className="care-eyebrow">{pet.stage} · Level {pet.progression.level}</p><h2>How {pet.name} is feeling</h2><p>Your companion’s wellbeing, one small moment at a time.</p>
        <CareStatBar label="Happiness" value={pet.needs.happiness} color="#f4a8ba" />
        <CareStatBar label="Cleanliness" value={pet.needs.cleanliness} color="#85dce7" />
        <CareStatBar label="Trust" value={pet.trust ?? 20} color="#e2ce95" />
        <CareStatBar label="Grooming" value={pet.groomingScore ?? 50} color="#c3b2f4" />
        <CareStatBar label="Stress" value={pet.stress ?? 0} invertThreshold />
        <p className="care-fineprint">Lower stress is better. No perfect score needed—just a little time together.</p><CareTips pet={pet} interaction={interaction} />
      </section></div>
    <SchoolCare dispatch={dispatch}/>
    <section aria-label="Care activities"><p className="care-eyebrow">Choose a little moment</p><h2>What shall we do together?</h2><div className="care-activity-grid">{INTERACTION_ORDER.map(mode => <InteractionCard key={mode} mode={mode} pet={pet} playerTokens={playerTokens} interaction={interaction} onStart={start} />)}</div></section>
    <section className="care-tools-section"><CareToolList inventory={inventory} interaction={interaction} onGoToShop={() => dispatch({ type: 'SET_SCREEN', screen: 'shop' })} /></section>
  </div></main>;
};
