import { useEffect, useState, type CSSProperties } from 'react';
import { Z } from '../../config/zBands';
import { CARE_PRESENTATION } from '../care/carePresentation';
import type { HandMode } from '../../types/interaction';
import '../care/care-experience.css';

interface InteractionVFXProps { type: string | null; mode: HandMode; petX: number; groundY: number; scale: number }

/** Small pixel particles share the care scene's palette, never placeholder labels. */
export function InteractionVFX(props: InteractionVFXProps) {
  return props.type ? <CareBurst key={props.type} {...props} /> : null;
}

function CareBurst({ type, mode, petX, groundY, scale }: InteractionVFXProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 1700); return () => window.clearTimeout(timer); }, []);
  if (!visible) return null;
  const theme = CARE_PRESENTATION[mode === 'idle' ? 'pet' : mode];
  const shape = type === 'bubbles' ? 'bubble' : type === 'hearts' || type === 'glow' ? 'heart' : 'spark';
  return <div className="fixed pointer-events-none" aria-hidden="true" style={{ zIndex: Z.INTERACTION_VFX, left: petX * scale, bottom: (groundY + 70) * scale, '--care-accent': theme.color } as CSSProperties}>
    {Array.from({ length: 9 }, (_, i) => <i key={i} className={`care-particle ${shape}`} style={{ '--particle-x': `${(i % 5 - 2) * 24}px`, '--particle-y': `${-35 - i % 3 * 25}px`, '--particle-delay': `${i * 40}ms` } as CSSProperties} />)}
  </div>;
}
