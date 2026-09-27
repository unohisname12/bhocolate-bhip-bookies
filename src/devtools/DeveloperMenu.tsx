import { selectEnemyIntent } from '../engine/systems/BattleAI';
import { EnemyGallery } from './EnemyGallery';
import { speciesIdToBattlePet } from '../engine/systems/BattleSystem';
import { PetGallery } from './PetGallery';
import { DEMO_MODE } from '../demo/demoMode';
import { useEffect, useRef, useState } from 'react';
import type { EngineState } from '../types/engine';
import type { ScreenName } from '../types/session';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { createScreenPreview, SCREEN_CATALOG } from './screenCatalog';
import { GROWING_PETS, GROWTH_STAGES, type GrowingPetId } from '../config/companionConfig';
import type { PetStage } from '../types/pet';

export function DeveloperMenu({ state, dispatch, onTeacher }: { state: EngineState; dispatch: (action: GameEngineAction) => void; onTeacher: () => void }) {
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [enemies, setEnemies] = useState(false);
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<GrowingPetId>('koala_sprite');
  const [stage, setStage] = useState<PetStage>(DEMO_MODE ? 'adult' : 'baby');
  const [ready, setReady] = useState(true);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) { if (gallery) panel.current?.querySelector<HTMLButtonElement>('button')?.focus(); else search.current?.focus(); }
    const key = (e: KeyboardEvent) => {
      // Keep game shortcuts (Catch Math's A/D/Enter, etc.) out of the search box.
      if (open) e.stopImmediatePropagation();
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); setOpen(value => !value); }
      if (open && e.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (open && e.key === 'Tab') {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button, input, select');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, gallery]);
  const close = () => { setGallery(false); setEnemies(false); setOpen(false); trigger.current?.focus(); };
  const entries = (Object.entries(SCREEN_CATALOG) as [ScreenName, [string, string]][]).filter(([id, [name, group]]) => `${id} ${name} ${group}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <button style={DEMO_MODE ? { zIndex: 10900 } : undefined} ref={trigger} data-game-screen={state.screen} className={`dev-launcher ${state.devPreview ? 'is-active' : ''}`} onClick={() => { setQuery(''); setGallery(false); setEnemies(false); setOpen(true); }} aria-label={DEMO_MODE ? 'Demo features' : 'Open Dev Mode'} title="Screen browser · Ctrl+Shift+G">{DEMO_MODE ? 'Demo features' : state.devPreview ? 'DEV · Preview' : 'DEV'}</button>
    {(DEMO_MODE || state.devPreview) && <button style={DEMO_MODE ? { zIndex: 10900 } : undefined} data-game-screen={state.screen} className="dev-return" onClick={() => DEMO_MODE ? window.location.reload() : dispatch({ type: 'EXIT_DEV_PREVIEW' })}>{DEMO_MODE ? '↻ Restart demo' : '← Exit preview'}</button>}
    {open && <div ref={panel} className="dev-screen-browser" role="dialog" aria-modal="true" aria-labelledby="dev-title">
      <div className="dev-browser-inner"><header><div><p className="eyebrow">{DEMO_MODE ? 'V-Pet playable demo' : 'Developer playground'}</p><h1 id="dev-title">{enemies ? 'Enemies & combat' : gallery ? 'All pets & animations' : 'Every screen. No grinding.'}</h1></div><button onClick={close}>Close</button></header>
        {enemies ? <><button onClick={() => setEnemies(false)}>← Back to DEV screens</button><EnemyGallery onFight={id => {
          const preview = createScreenPreview('battle', state.learning, { species, stage, ready });
          if (preview.battle.active) {
            const enemyPet = speciesIdToBattlePet(id, preview.pet?.progression.level ?? 20);
            preview.battle = { ...preview.battle, enemyPet, enemyIntent: selectEnemyIntent(enemyPet, preview.battle.playerPet) };
          }
          dispatch({ type: 'DEV_PREVIEW_STATE', state: preview }); close();
        }}/></> : gallery ? <><button onClick={() => setGallery(false)}>← Back to DEV screens</button><PetGallery/></> : <>
        <button className="growth-button primary" onClick={() => setGallery(true)}>All pets & animations</button>
        <button className="growth-button primary" onClick={() => setEnemies(true)}>Enemies & combat</button>
        <p className="dev-explainer">Preview with a level-20 pet, stocked currencies, unlocked care tools, and prepared encounters. Every shortcut prepares a fresh playable activity, including battles and adventures. Home decorating and prizes are unlocked for previews. Your real save stays untouched. Reload to start again.</p>
        <input ref={search} aria-label="Find a screen" placeholder="Search screens, games, or tools…" value={query} onChange={e => setQuery(e.target.value)} />
        {query && <button onClick={() => { setQuery(''); search.current?.focus(); }}>Show all screens</button>}
        <div className="dev-utility-row">
          <label>Companion <select className="bg-slate-800 p-2 rounded" aria-label="Preview companion" value={species} onChange={e => setSpecies(e.target.value as GrowingPetId)}>{Object.entries(GROWING_PETS).map(([id, info]) => <option key={id} value={id}>{info.name}</option>)}</select></label>
          <label>Stage <select className="bg-slate-800 p-2 rounded" aria-label="Preview growth stage" value={stage} onChange={e => setStage(e.target.value as PetStage)}>{GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={ready} onChange={e => setReady(e.target.checked)} style={{ width: 18 }} />Week complete (care / discovery preview)</label>
        </div>
        <div className="dev-utility-row"><button onClick={() => { close(); onTeacher(); }}>Teacher dashboard</button><button onClick={() => { dispatch({ type: 'SET_SCREEN', screen: 'home_builder' }); close(); }}>Build your home</button>{DEMO_MODE && <a href="https://auralith-classroom-pilot.deandresample3.workers.dev">Classroom game · student logins</a>}{!DEMO_MODE && state.devPreview && <button onClick={() => { dispatch({ type: 'EXIT_DEV_PREVIEW' }); close(); }}>Return to my real game</button>}<span>{entries.length} screens · Ctrl+Shift+G</span></div>
        {['Home', 'Games', 'Adventure', 'Collection', 'Art & tools'].map(group => {
          const items = entries.filter(([, [, section]]) => section === group);
          return items.length > 0 && <section key={group}><h2>{group}</h2><div className="dev-screen-grid">{items.map(([screen, [name]]) => <button key={screen} data-preview-screen={screen} onClick={() => { dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview(screen, state.learning, { species, stage, ready }) }); close(); }}><strong>{name}</strong><span>{screen.replaceAll('_', ' ')} →</span></button>)}</div></section>;
        })}
        {!entries.length && <p>No screens match. Try “battle”, “art”, or “home”.</p>}
        </>}
      </div>
    </div>}
  </>;
}
