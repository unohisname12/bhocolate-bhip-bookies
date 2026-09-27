import { useEffect, useState } from 'react';
import { INTERACTION_DEFS, INTERACTION_ORDER } from '../../config/interactionConfig';
import { canInteract, getCooldownRemaining } from '../../engine/systems/InteractionSystem';
import { CARE_PRESENTATION } from '../care/carePresentation';
import { CareToolIcon } from '../care/CareToolIcon';
import type { HandMode, InteractionState } from '../../types/interaction';
import type { Pet } from '../../types';

interface InteractionToolbarProps {
  activeMode: HandMode;
  interaction: InteractionState;
  pet: Pet;
  playerTokens: number;
  onSelectMode: (mode: HandMode) => void;
}

export function InteractionToolbar({ interaction, pet, playerTokens, onSelectMode }: InteractionToolbarProps) {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { if (!open) return; const id = window.setInterval(() => tick(n => n + 1), 500); return () => window.clearInterval(id); }, [open]);
  return <div className="care-touch-dock">
    <button className="care-button care-touch-toggle" aria-expanded={open} aria-controls="care-touch-tools" onClick={() => setOpen(value => !value)}><img src="/assets/woodland-v1/icon-heart.png" alt="" />{open ? 'Close tools' : 'Time together'}</button>
    {open && <section id="care-touch-tools" className="care-touch-tray" aria-label="Quick care tools">
      <p className="care-eyebrow">Pick a moment with {pet.name}</p><div>{INTERACTION_ORDER.map(mode => {
        const check = canInteract(pet, mode, interaction, playerTokens), cooldown = getCooldownRemaining(interaction, mode);
        return <button key={mode} className="care-button" aria-label={`Touch: ${CARE_PRESENTATION[mode].short}`} disabled={!check.allowed} title={check.reason ?? CARE_PRESENTATION[mode].instruction} onClick={() => { setOpen(false); onSelectMode(mode); }}>
          <CareToolIcon mode={mode} /><span>{CARE_PRESENTATION[mode].short}</span><small>{cooldown > 0 ? `${Math.ceil(cooldown / 1000)}s rest` : !interaction.unlockedTools.includes(mode) ? 'Tool locked' : INTERACTION_DEFS[mode].economyCost ? `Up to ${INTERACTION_DEFS[mode].economyCost} tokens` : 'Free'}</small>
        </button>;
      })}</div>
    </section>}
  </div>;
}
