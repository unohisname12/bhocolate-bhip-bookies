import { useEffect, useState } from 'react';
import { PetSprite } from '../components/pet/PetSprite';
import { ASSETS, type CombatSheetConfig } from '../config/assetManifest';
import { GROWING_PETS, GROWTH_STAGES, isGrowingPet, isCompanion, petVisualKey } from '../config/companionConfig';
import { PET_ANIMATIONS, COMBAT_ANIMATIONS } from '../config/petAnimationCoverage';
import { SPECIES_CONFIG } from '../config/speciesConfig';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { usePageVisible } from '../hooks/usePageVisible';
import type { PetStage } from '../types/pet';

export function SheetPreview({ sheet, paused, label }: { sheet: CombatSheetConfig; paused: boolean; label: string }) {
  const [frame, setFrame] = useState(0);
  const reduced = useReducedMotion(), visible = usePageVisible();
  useEffect(() => {
    if (paused || reduced || !visible) return;
    const timer = setInterval(() => setFrame(f => (f + 1) % sheet.frameCount), sheet.frameDuration);
    return () => clearInterval(timer);
  }, [sheet, paused, reduced, visible]);
  return <div role="img" aria-label={label} data-gallery-sheet style={{ width: 128, height: 128, backgroundImage: `url("${sheet.url}")`, backgroundRepeat: 'no-repeat', backgroundSize: `${sheet.frameCount * 128}px 128px`, backgroundPosition: `${-frame * 128}px 0`, imageRendering: 'pixelated' }}/>;
}
const title = (value: string) => value.replaceAll('_', ' ');
export function PetGallery() {
  const [stage, setStage] = useState('all');
  const [action, setAction] = useState('idle');
  const [paused, setPaused] = useState(false);
  const forms = Object.keys(SPECIES_CONFIG).flatMap(id => (isGrowingPet(id) ? stage === 'all' ? GROWTH_STAGES : [stage as PetStage] : ['baby'] as const).map(growth => ({ id, growth, key: petVisualKey({ speciesId: id, stage: growth }) })));
  const combat = (COMBAT_ANIMATIONS as readonly string[]).includes(action);
  return <section aria-label="All pets gallery">
    <p>Every companion in one place. Compare growth stages, care reactions, battle poses and hatching. This gallery never changes your save.</p>
    <div className="dev-utility-row">
      <label>Growth stage <select style={{ background: '#1b2b3c', color: '#f0f4fa', padding: 8, borderRadius: 6 }} aria-label="Gallery growth stage" value={stage} onChange={e => setStage(e.target.value)}><option value="all">All growth stages</option>{GROWTH_STAGES.map(s => <option key={s} value={s}>{title(s)}</option>)}</select></label>
      <label>Animation <select style={{ background: '#1b2b3c', color: '#f0f4fa', padding: 8, borderRadius: 6 }} aria-label="Gallery animation" value={action} onChange={e => setAction(e.target.value)}><optgroup label="Care & life">{PET_ANIMATIONS.map(a => <option key={a} value={a}>{title(a)}</option>)}</optgroup><optgroup label="Battle">{COMBAT_ANIMATIONS.map(a => <option key={a} value={a}>{title(a)}</option>)}</optgroup><option value="hatch">Egg hatching</option></select></label>
      <button onClick={() => setPaused(p => !p)}>{paused ? 'Resume animations' : 'Pause animations'}</button>
      <span>9 companions + 3 legacy pets · {forms.length} forms</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
      {forms.map(({ id, growth, key }) => {
        const info = isGrowingPet(id) ? GROWING_PETS[id] : null;
        const sheet = combat ? ASSETS.combatAnims[key]?.[action] : action === 'hatch' && isCompanion(id) ? { url: `/assets/companions-v1/${id}-hatch.png`, frameWidth: 128, frameHeight: 128, frameCount: 4, frameDuration: 400 } : null;
        return <article data-gallery-pet={key} key={key} style={{ background: '#f5f0e2', color: '#243c36', borderRadius: 16, padding: 12, display: 'grid', justifyItems: 'center', alignContent: 'start' }}>
          <div style={{ height: 145, display: 'grid', alignItems: 'end' }}>{sheet ? <SheetPreview key={`${key}-${action}`} sheet={sheet} paused={paused} label={`${info?.name ?? SPECIES_CONFIG[id].name} ${title(action)}`}/> : action === 'hatch' ? <img src={ASSETS.petPortraits[id]} alt="Legacy pet" width="128" height="128"/> : <PetSprite speciesId={id} stage={growth} animationName={action} scale={1} paused={paused}/>}</div>
          <h2 style={{ margin: '8px 0 2px', color: '#243c36', fontSize: 18 }}>{info?.name ?? SPECIES_CONFIG[id].name}</h2>
          <p style={{ margin: 0, fontSize: 13 }}>{info ? `${title(growth)} · ${info.title}` : 'Legacy · shared growth artwork'}</p>
          <small>{action === 'hatch' && !isCompanion(id) ? 'Uses the original egg system' : title(action)}</small>
        </article>;
      })}
    </div>
    <p>14 care animations + 6 battle actions per pet, plus a still death state. Drawn poses and shared body motion work together. Reduced-motion preferences are respected.</p>
  </section>;
}
