import { useEffect, useState, type CSSProperties } from 'react';
import { INTERACTION_DEFS } from '../../config/interactionConfig';
import { canInteract, getCooldownRemaining } from '../../engine/systems/InteractionSystem';
import { CARE_PRESENTATION, type CareMode } from './carePresentation';
import { CareToolIcon } from './CareToolIcon';
import type { InteractionState } from '../../types/interaction';
import type { Pet } from '../../types';

export function InteractionCard({ mode, interaction, pet, playerTokens, onStart }: { mode: CareMode; interaction: InteractionState; pet: Pet; playerTokens: number; onStart?: (mode: CareMode) => void }) {
  const def = INTERACTION_DEFS[mode], theme = CARE_PRESENTATION[mode];
  const unlocked = interaction.unlockedTools.includes(mode);
  const cooldown = getCooldownRemaining(interaction, mode);
  const [, tick] = useState(0);
  useEffect(() => { if (cooldown <= 0) return; const id = window.setInterval(() => tick(n => n + 1), 500); return () => window.clearInterval(id); }, [cooldown]);
  const check = canInteract(pet, mode, interaction, playerTokens);
  const status = !unlocked ? 'Find this tool in the shop' : cooldown > 0 ? `Ready in ${Math.ceil(cooldown / 1000)}s` : check.allowed ? 'Ready for a little moment' : check.reason;
  return <article className={`care-activity-card ${!unlocked ? 'is-locked' : ''}`} style={{ '--care-accent': theme.color } as CSSProperties} aria-label={theme.short}>
    <div className="care-tool-plaque"><CareToolIcon mode={mode} /></div><h3>{theme.short}</h3><p>{def.description}</p><p className="care-benefit">{theme.benefit}</p>
    <span className="care-card-status">{status}</span>
    <button type="button" className="care-button" disabled={!check.allowed} onClick={() => onStart?.(mode)} aria-label={`Start ${theme.short}`}>{!unlocked ? 'Tool locked' : def.economyCost ? `Start · up to ${def.economyCost} tokens` : 'Start · Free'}</button>
  </article>;
}
