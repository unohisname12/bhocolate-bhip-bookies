import { useState } from 'react';
import { PetSprite } from '../components/pet/PetSprite';
import { WOODLAND_ART } from '../config/woodlandArt';

export function WoodlandArtPreview() {
  const [animation, setAnimation] = useState('idle');
  const [room, setRoom] = useState('home');
  const [paused, setPaused] = useState(false);
  return <section className="woodland-art-preview rounded-xl border border-amber-200/30 bg-teal-950/40 p-4 mb-5" aria-label="Woodland art preview">
    <h2 className="text-xl font-bold text-amber-100">Woodland v1 • Live art preview</h2>
    <p className="text-sm text-slate-300 my-2">New production artwork. Try each pose cycle without changing your pet or save.</p>
    <div className="flex flex-wrap gap-2 my-3">{['idle', 'walking', 'happy', 'eating', 'sleeping', 'being_trained'].map(name => <button key={name} aria-pressed={animation === name} onClick={() => setAnimation(name)} className="rounded-lg border border-teal-400/40 px-3 py-2 min-h-11 aria-pressed:bg-teal-800">{name === 'being_trained' ? 'Action' : name.charAt(0).toUpperCase() + name.slice(1)}</button>)}<button className="rounded-lg border px-3 min-h-11" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play animation' : 'Pause animation'}</button><button className="rounded-lg border px-3 min-h-11" onClick={() => setRoom(room === 'home' ? 'yard' : 'home')}>Show {room === 'home' ? 'yard' : 'home'}</button></div>
    <div className="relative overflow-hidden rounded-xl mx-auto" style={{ maxWidth: 600, aspectRatio: '400 / 224', background: `url(${WOODLAND_ART}/${room}.png) center / 100% 100%`, imageRendering: 'pixelated' }}>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[16.5%]"><PetSprite speciesId="koala_sprite" stage="baby" animationName={animation} scale={1} paused={paused} /></div>
    </div>
    <p className="text-xs text-slate-400 mt-3">Four frames per cycle. Care uses shared reaction poses; dedicated care/hurt art and growth stages are still planned. Legacy experiments remain below.</p>
  </section>;
}
