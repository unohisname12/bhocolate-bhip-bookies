import { TOKENS_PER_MEDAL } from '../../services/game/wallet';
import { useEffect, useRef, useState } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { BATTLE_MILESTONES, DECOR_PRIZES, prizeProgress } from './rewards';
import './clash.css';
import { discoveryDays } from '../../services/game/eggDiscovery';
export function DecorSprite({ id, className = '' }: { id: string; className?: string }) {
  const decor = DECOR_PRIZES.find(d => d.id === id);
  return decor ? <img className={`prize-sprite ${className}`} src={`/assets/clash-v1/${id}.png`} alt={decor.name} draggable={false}/> : null;
}
export function PrizeStudio({ state, dispatch, inline = false }: { state: EngineState; dispatch: (action: GameEngineAction) => void; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || inline) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (dialog.current?.closest('[inert]')) return;
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [open,inline]);
  const p = prizeProgress(state), next = BATTLE_MILESTONES.find(m => m.wins > p.wins), tokens = state.player.currencies.tokens;
  const busy = state.battle.active || state.run.active || !!state.pendingBattleWarmup;
  return <section className="prize-studio">
    {!inline && <button className="prize-launcher" onClick={() => setOpen(!open)} aria-expanded={open}>🏆 Prize Studio <small>{next ? `${p.wins}/${next.wins} wins → ${next.name}` : `${5 - p.wins % 5} wins → bonus tokens`}</small></button>}
    {(open || inline) && <>{!inline && <div className="prize-scrim" aria-hidden="true"/>}<div ref={dialog} tabIndex={-1} className={inline ? "prize-inline" : "prize-window"} role={inline ? "region" : "dialog"} aria-modal={inline ? undefined : true} aria-label="Prize Studio"><header><div><h2>Prize Studio</h2><p>{tokens} tokens · {p.wins} victories · Pet level {state.pet?.progression.level ?? 1}</p></div>{!inline && <button onClick={() => setOpen(false)} aria-label="Close Prize Studio">✕</button>}</header>
      <h3>Egg adventure passes</h3><p>{p.earlyHatchPasses??0} early-hatch passes. Each saves one activity day; at most one per egg. Your quiz still counts.</p><button disabled={!p.earlyHatchPasses||state.eggDiscovery?.status!=='collecting'||!!state.eggDiscovery?.bonusDays||(!!state.eggDiscovery&&discoveryDays(state.eggDiscovery)>=5)||busy||state.momentum.active} onClick={()=>dispatch({type:'USE_EARLY_HATCH_PASS'})}>Use one-day-early pass</button>
      <h3>Your battle goals</h3><p>Every victory: {2 * TOKENS_PER_MEDAL} tokens + 1 boost. Every 5 wins: {5 * TOKENS_PER_MEDAL} extra tokens. Every pet level gained: {3 * TOKENS_PER_MEDAL} tokens + 2 boosts. Spend tokens on permanent home items!</p>
      <div className="battle-track">{BATTLE_MILESTONES.map(m => <div key={m.wins} className={p.wins >= m.wins ? 'earned' : ''}><strong>{p.wins >= m.wins ? '✓' : `${p.wins}/${m.wins}`} wins</strong><span>{m.name}</span><progress max={m.wins} value={Math.min(p.wins, m.wins)}/></div>)}</div>
      <h3>Choose a boost for your next fight</h3><p>+20% attack or defense for one fight. Use is optional; an armed boost is spent only when a fight starts, and ends even if you flee. Your pet’s permanent stats stay the same.</p>
      <div className="clash-actions">{(['attack','defense'] as const).map(boost => <div key={boost}><strong>{boost}: {p.boosts[boost]}</strong><button disabled={busy || p.boosts[boost] < 1} aria-pressed={p.armed === boost} onClick={() => dispatch({ type: 'ARM_PRIZE_BOOST', boost: p.armed === boost ? null : boost })}>{p.armed === boost ? 'Unarm' : 'Arm'} {boost}</button><button disabled={tokens < 2 * TOKENS_PER_MEDAL} onClick={() => dispatch({ type: 'BUY_PRIZE', itemId: boost })}>Get one · {2 * TOKENS_PER_MEDAL} tokens</button></div>)}</div>
      <h3>Make this little home yours</h3><button onClick={() => { setOpen(false); dispatch({ type: 'HOME_OPEN' }); }}>Enter Home Base · full room builder</button><p>Collect, place, move, and put away decorations whenever you like. They’re yours permanently. Pet accessories can be equipped in Wardrobe.</p>
      <div className="decor-shop">{DECOR_PRIZES.map(d => { const owned = state.player.unlockedRoomItems.includes(d.id); return <article key={d.id}><DecorSprite id={d.id}/><strong>{d.name}</strong>{owned ? <button onClick={() => { setOpen(false); dispatch({ type: 'HOME_OPEN' }); }}>Arrange in Home Base</button> : <button disabled={tokens < d.price} onClick={() => dispatch({ type: 'BUY_PRIZE', itemId: d.id })}>Unlock · {d.price} tokens</button>}</article>; })}</div>
    </div></>}
  </section>;
}
