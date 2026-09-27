import { useState } from 'react';
import { ENEMIES, ENEMY_IDS, type EnemyId } from '../config/enemyConfig';
import { ASSETS } from '../config/assetManifest';
import { SheetPreview } from './PetGallery';
export function EnemyGallery({ onFight }: { onFight: (id: EnemyId) => void }) {
  const [action, setAction] = useState('attack');
  const [paused, setPaused] = useState(false);
  return <section aria-label="Enemy gallery">
    <p>12 rivals with their own attacks. Preview their poses or start a practice fight with your selected companion and growth stage.</p>
    <div className="dev-utility-row"><label>Animation <select aria-label="Enemy animation" className="bg-slate-800 p-2 rounded" value={action} onChange={e => setAction(e.target.value)}>{['idle','attack','special','defend','hurt','heal'].map(a => <option key={a}>{a}</option>)}</select></label><button onClick={() => setPaused(p => !p)}>{paused ? 'Resume animations' : 'Pause animations'}</button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginTop: 20 }}>
      {ENEMY_IDS.map(id => <article data-gallery-enemy={id} key={id} style={{ background: '#e9e4d8', color: '#293333', borderRadius: 16, padding: 16, display: 'grid', justifyItems: 'center' }}>
        <SheetPreview key={`${id}-${action}`} sheet={ASSETS.combatAnims[id][action]} paused={paused} label={`${ENEMIES[id].name} ${action}`}/>
        <h2 style={{ color: '#293333', fontSize: 18 }}>{ENEMIES[id].name}</h2><small>{ENEMIES[id].tier === 'boss' ? 'Boss' : `Tier ${ENEMIES[id].tier}`} · {ENEMIES[id].special}</small>
        <p style={{ fontSize: 13 }}>{ENEMIES[id].hint}</p><button className="growth-button primary" onClick={() => onFight(id)}>Fight {ENEMIES[id].name}</button>
      </article>)}
    </div>
  </section>;
}
