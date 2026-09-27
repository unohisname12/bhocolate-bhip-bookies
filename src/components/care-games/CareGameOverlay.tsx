import React, {useContext,useState} from 'react';
import {ActivePetContext} from '../ActivePetContext';
import {Modal} from '../ui/Modal';
import type {Pet} from '../../types';
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
  const pet=useContext(ActivePetContext);
  const [before,setBefore]=useState<Pet|null>(null);
  if(before&&pet){
    const metrics=[['Fullness',before.needs.hunger,pet.needs.hunger],['Happiness',before.needs.happiness,pet.needs.happiness],['Cleanliness',before.needs.cleanliness,pet.needs.cleanliness],['Health',before.needs.health,pet.needs.health],['Friendship',before.bond,pet.bond],['Trust',before.trust??20,pet.trust??20],['Grooming',before.groomingScore??50,pet.groomingScore??50],['Focus',before.discipline??0,pet.discipline??0],['Stress',before.stress??0,pet.stress??0]] as const;
    const changed=metrics.filter(([,a,b])=>Math.abs(b-a)>.01);
    return <Modal isOpen onClose={()=>setBefore(null)} title="Pet care complete" panelClassName="care-receipt" footer={<button className="care-button primary" onClick={()=>setBefore(null)}>Done — back to my pet</button>}><h3>Good care, happy companion!</h3><p>{pet.name} enjoyed your time together.</p><div role="status">{changed.length?changed.map(([label,a,b])=><div className="care-receipt-stat" key={label}><strong>{label}</strong><span>{Math.round(a*10)/10} → {Math.round(b*10)/10} <b>({b>a?'+':''}{Math.round((b-a)*10)/10})</b></span>{label!=='Friendship'&&<div className="feeding-need-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,b))}><i style={{width:`${Math.min(100,Math.max(0,b))}%`}}/></div>}</div>):<p>Your pet's care meters are already topped up. Thanks for checking in!</p>}</div><p>You’re free to explore, play, or choose another care activity.</p></Modal>;
  }
  const mode = interaction.activeMode;
  if (mode === 'idle' || !interaction.careGameActive) return null;

  return (
    <CareSession
      key={`${mode}-${interaction.currentInteractionStart}`}
      mode={mode}
      onComplete={quality=>{if(quality>0&&pet)setBefore(structuredClone(pet));onComplete(quality);}}
      onCancel={onCancel}
    />
  );
};
