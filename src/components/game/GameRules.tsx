import type { ReactNode } from 'react';
import './gameRules.css';

/** Instructions stay in normal page flow and are collapsed until requested. */
export function GameRules({ name, children, onOpen }: { name: string; children: ReactNode; onOpen?: () => void }) {
  return <details className="game-rules" aria-label={`${name} rules`} onToggle={event => { if (event.currentTarget.open) onOpen?.(); }}>
    <summary><span className="game-rules-show">How to play · show rules</span><span className="game-rules-hide">Hide rules</span></summary>
    <div className="game-rules-content">{children}<button type="button" className="game-rules-close" onClick={event => {
      const panel = event.currentTarget.closest('details');
      if (panel) { panel.open = false; panel.querySelector('summary')?.focus(); }
    }}>Hide rules</button></div>
  </details>;
}
