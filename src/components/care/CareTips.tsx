import React from 'react';
import type { Pet } from '../../types';
import type { InteractionState } from '../../types/interaction';

interface CareTipsProps {
  pet: Pet;
  interaction: InteractionState;
}

function getTip(pet: Pet, interaction: InteractionState): string {
  const stress = pet.stress ?? 0;
  const grooming = pet.groomingScore ?? 50;
  const trust = pet.trust ?? 20;
  const discipline = pet.discipline ?? 0;
  const happiness = pet.needs.happiness;
  const trainUnlocked = interaction.unlockedTools.includes('train');

  if (stress >= 60) return 'Your pet is stressed! Try the Comfort interaction to calm them down.';
  if (grooming < 30) return 'Your pet needs grooming \u2014 use Brush to improve their appearance!';
  if (trust < 30) return 'Build trust by petting your companion regularly.';
  if (discipline < 20 && trainUnlocked) return 'Training sessions will boost discipline and earn XP.';
  if (happiness < 40) return 'Your pet seems unhappy \u2014 try Playing together!';
  return 'Your pet is doing well! Keep up the great care.';
}

export const CareTips: React.FC<CareTipsProps> = ({ pet, interaction }) => {
  const tip = getTip(pet, interaction);

  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
      style={{
        background: 'rgba(140,100,255,0.08)',
        border: '1px solid rgba(140,100,255,0.15)',
      }}
    >
      <span className="text-sm flex-shrink-0" aria-hidden>&#x1F4A1;</span>
      <p className="text-[11px] text-purple-200/80 italic leading-relaxed">
        {tip}
      </p>
    </div>
  );
};
