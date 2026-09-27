import { useEffect, useState, type CSSProperties } from 'react';
import type { Egg } from '../types';
import { COMPANIONS, companionForEgg, GROWTH_ART } from '../config/companionConfig';
import { ASSETS } from '../config/assetManifest';
import { IncubationPanel } from '../components/pet/IncubationPanel';
import { PetSprite } from '../components/pet/PetSprite';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface IncubationScreenProps {
  onPlay?: () => void;
  egg: Egg; onTap: () => void; onHatch: () => void;
  onChoose?: (id: string) => void; ownedSpecies?: string[];
}
export function IncubationScreen({ egg, onPlay, onTap, onHatch, onChoose, ownedSpecies = [] }: IncubationScreenProps) {
  const [hatching, setHatching] = useState(false);
  const [phase, setPhase] = useState(0);
  const reduced = useReducedMotion();
  const id = companionForEgg(egg.type);
  useEffect(() => {
    if (!hatching) return;
    const delay = reduced ? 120 : 620;
    const timers = [1, 2, 3, 4, 5].map(next => window.setTimeout(() => setPhase(next), next * delay));
    return () => timers.forEach(clearTimeout);
  }, [hatching, reduced]);
  useEffect(() => { if (hatching && phase === 5) onHatch(); }, [hatching, phase, onHatch]);
  const isReady = egg.state === 'ready';
  return <main className="hatch-nursery"><div className="hatch-inner">
    <p className="eyebrow">Every great adventure starts small</p><h1>The woodland nursery</h1><p className="text-slate-300 mt-3">{isReady ? 'Your pet is ready. Press Hatch my pet to meet them!' : 'Tap the egg to warm it to 100%. Then press Hatch my pet.'}</p>
    <button className="growth-button primary mt-5" disabled={!isReady || hatching} onClick={() => { setPhase(0); setHatching(true); }}>{hatching ? 'Hatching…' : isReady ? 'Hatch my pet' : `Warm the egg first · ${Math.round(egg.progress)}%`}</button>
    {onChoose && <div className="egg-choices" aria-label="Choose a companion">{Object.entries(COMPANIONS).map(([key, info]) => <button key={key} disabled={hatching || ownedSpecies.includes(key)} aria-pressed={id === key} onClick={() => onChoose(key)}><img src={ASSETS.petPortraits[key]} alt="" /><strong>{info.name}</strong>{ownedSpecies.includes(key) && <span className="block text-xs">In nursery</span>}</button>)}</div>}
    <button className={'hatch-stage w-full ' + (hatching ? 'hatch-running' : '')} aria-label="Tap egg to warm it" disabled={isReady || hatching} onClick={onTap}>
      {phase >= 4 ? <div className="hatch-reveal"><PetSprite speciesId={id ?? (egg.type === 'mech' ? 'mech_bot' : 'slime_baby')} stage="baby" animationName="happy" scale={1.8} /></div>
      : id && id !== 'subtrak' ? <div className="hatch-egg" style={{ backgroundImage: 'url(' + GROWTH_ART + '/' + id + '-hatch.png)', backgroundPosition: -(hatching ? phase : egg.progress >= 60 ? 1 : 0) * 192 + 'px 0' }} />
      : <img src={(ASSETS.eggs[egg.type] ?? ASSETS.eggs.basic).url} alt="Your egg" className="w-40" />}
      {hatching && Array.from({ length: 8 }, (_, i) => <span key={i} className="hatch-spark" style={{ '--angle': i * 45 + 'deg', animationDelay: i * 60 + 'ms' } as CSSProperties} aria-hidden="true">✦</span>)}
    </button>
    <p role="status" className="min-h-8 font-bold text-amber-100">{hatching ? phase >= 4 ? 'Hello, ' + (id ? COMPANIONS[id].name : 'little friend') + '!' : ['A little wobble…', 'A tiny crack…', 'A warm glow…', 'Someone is ready to meet you!'][phase] : id ? COMPANIONS[id].name + ' is waiting to meet you.' : 'Your companion is waiting.'}</p>
    <IncubationPanel progress={egg.progress} />
    {onPlay && <button className="growth-button primary mt-5" onClick={onPlay}>Play Egg Dash, Shellguard & Nest Café →</button>}

    <p className="text-xs text-slate-400 mt-5">Baby → Juvenile → Adult. Two evolutions, new powers, and new activities. All existing mini-games stay available from the start.</p>
  </div></main>;
}
