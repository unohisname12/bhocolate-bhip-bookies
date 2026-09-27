import type { PetDecision } from './decisions';
import type { TogetherKind } from './voice';
import './pet-invite.css';

const ACCEPT: Record<TogetherKind, string> = { fetch: 'Throw the ball!', dance: 'Let’s dance!', cuddle: 'Cuddle time', talk: 'Let’s chat' };

/** One-tap answer to a pet's invitation; shown only while the pet is still asking. */
export function PetInvite({ decision, bubble, accept, later, prompt = false }: { decision?: PetDecision; bubble: string; accept: (kind: TogetherKind) => void; later: () => void; prompt?: boolean }) {
  if (!decision?.ask || decision.bubble !== bubble) return null;
  const ask = decision.ask;
  return <div className={`pet-invite${prompt ? ' pet-invite-panel' : ''}`} role="group" aria-label="Your pet is asking you">
    {prompt && <p>{decision.bubble}</p>}
    <button type="button" className="pet-invite-yes" onClick={() => accept(ask)}>{ACCEPT[ask]}</button>
    <button type="button" onClick={later}>Maybe later</button>
  </div>;
}
