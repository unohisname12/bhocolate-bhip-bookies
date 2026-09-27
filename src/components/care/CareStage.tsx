import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { Pet } from '../../types';
import { PetSprite } from '../pet/PetSprite';
import { CARE_PRESENTATION, type CareMode } from './carePresentation';
import { CareToolIcon } from './CareToolIcon';
import './care-experience.css';

export function CareStage({ pet, mode = 'pet', reacting = false, pulse = 0, toolActive = false, children }: { pet: Pet; mode?: CareMode; reacting?: boolean; pulse?: number; toolActive?: boolean; children?: ReactNode }) {
  const theme = CARE_PRESENTATION[mode];
  const tool = useRef<HTMLDivElement>(null);
  const hideTool = () => { if (tool.current) tool.current.hidden = true; };
  return <div className={`care-stage care-stage-${mode}`} style={{ '--care-accent': theme.color } as CSSProperties} data-testid="care-stage" data-species={pet.speciesId} data-stage={pet.stage} onPointerMove={e => {
    if (!toolActive || !tool.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    tool.current.hidden = false;
    tool.current.style.transform = `translate(${Math.max(0, Math.min(rect.width - 48, e.clientX - rect.left + 16))}px, ${Math.max(0, Math.min(rect.height - 48, e.clientY - rect.top + 16))}px)`;
  }} onPointerLeave={hideTool} onPointerCancel={hideTool} onPointerUp={e => { if (e.pointerType !== 'mouse') hideTool(); }}>
    <div className="care-stage-light" aria-hidden="true" />
    <div className="care-stage-rug" aria-hidden="true" />
    <span className="care-stage-leaf leaf-left" aria-hidden="true">❧</span><span className="care-stage-leaf leaf-right" aria-hidden="true">❧</span>
    <div key={`reaction-${pulse}`} className={`care-companion ${reacting ? `care-react-${mode}` : ''}`}>
      <PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={reacting ? theme.animation : 'idle'} scale={1.7} />
    </div>
    {mode === 'wash' && <div className="care-bath" aria-hidden="true"><i /><i /><i /></div>}
    {mode === 'comfort' && <div className={`care-calm-ring ${reacting ? 'is-breathing' : ''}`} aria-hidden="true" />}
    {mode === 'brush' && <div key={`brush-${pulse}`} className={`care-brush ${reacting ? 'is-brushing' : ''}`} aria-hidden="true"><i /></div>}
    {reacting && <div key={pulse} className="care-particles" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} className={`care-particle ${theme.effect}`} style={{ '--particle-x': `${(i % 5 - 2) * 38}px`, '--particle-y': `${-45 - i % 3 * 32}px`, '--particle-delay': `${i * 45}ms` } as CSSProperties} />)}</div>}
    {children}
    {toolActive && <div ref={tool} className="care-follow-tool" aria-hidden="true" hidden><CareToolIcon mode={mode} /></div>}
  </div>;
}
