import { DEFAULT_RULES, type Rules } from './model';
export function RulesEditor({ rules: r, change, disabled = false, multiplayer = true }: { rules: Rules; change: (r: Rules) => void; disabled?: boolean; multiplayer?: boolean }) {
  const update = (patch: Partial<Rules>) => change({ ...r, ...patch });
  return <fieldset className="delivery-settings" disabled={disabled}><legend>Remix your city</legend>
    <label>Players<select value={r.format} onChange={e => update({ format: e.target.value as Rules['format'], computers: e.target.value === 'duel' ? 0 : 2 })}><option value="solo">Solo vs computers</option><option value="duel" disabled={!multiplayer}>1-on-1 student duel</option><option value="group" disabled={!multiplayer}>Group · up to 10 crews</option></select></label>
    <label>Game rules<select value={r.mode} onChange={e => update({ mode: e.target.value as Rules['mode'] })}><option value="community">Community Couriers · protected contracts</option><option value="rivals">Corporate Rivals · compete for customers</option></select></label>
    <label>Match length<select value={r.length} onChange={e => update(e.target.value === 'sprint' ? { length: 'sprint', rounds: 4, minutes: 4 } : { length: 'campaign', rounds: 12, minutes: 0 })}><option value="sprint">Class Sprint · about 20 minutes</option><option value="campaign">Saved City Campaign</option></select></label>
    <details className="simple-rule-options"><summary>Customize city rules</summary><div className="delivery-settings">
    {r.length === 'campaign' && <><label>Rounds<select value={r.rounds} onChange={e => update({ rounds: +e.target.value })}>{[12,24].map(n => <option key={n}>{n}</option>)}</select></label><label>Turn deadline<select value={r.minutes} onChange={e => update({ minutes: +e.target.value })}><option value={0}>Wait for everyone · no timer</option><option value={60}>1 hour per turn</option><option value={1440}>1 day per turn</option></select></label></>}
    {r.format !== 'duel' && <label>Computer crews<select value={r.computers} onChange={e => update({ computers: +e.target.value })}>{Array.from({ length: r.format === 'solo' ? 9 : 10 }, (_, i) => i + (r.format === 'solo' ? 1 : 0)).map(n => <option key={n}>{n}</option>)}</select></label>}
    <label>Teacher reward strength<select value={r.rewards} onChange={e => update({ rewards: e.target.value as Rules['rewards'] })}><option value="balanced">Balanced · small perks</option><option value="party">Party · bigger van bonuses</option></select></label>
    <label><input type="checkbox" checked={r.deals} onChange={e => update({ deals: e.target.checked })}/>Allow driver negotiations & warehouse deals</label>
    <label><input type="checkbox" checked={r.tolls} disabled={r.mode !== 'rivals'} onChange={e => update({ tolls: e.target.checked })}/>Rival mode direct-route tolls</label>
    <label><input type="checkbox" checked={!!r.market} onChange={e=>update({market:e.target.checked})}/>Price competition & subcontracting (off: classic points / bids)</label>
    <label><input type="checkbox" checked={!!r.demand} onChange={e=>update({demand:e.target.checked})}/>Demand changes after deliveries</label>
    <label><input type="checkbox" checked={!!r.contracts} onChange={e=>update({contracts:e.target.checked})}/>Three-stop contracts & completion bonuses</label>
    <label><input type="checkbox" checked={!!r.networks} onChange={e=>update({networks:e.target.checked})}/>Outposts, rush tactics & garage upgrades</label>
    <label><input type="checkbox" checked={!!r.events} onChange={e=>update({events:e.target.checked})}/>Random city events & battle ambushes</label>
    <label><input type="checkbox" checked={!!r.crates} onChange={e=>update({crates:e.target.checked})}/>Starter loot, math crates & optional wagers</label>
    <button type="button" onClick={() => change(DEFAULT_RULES)}>Reset rules</button>
    </div></details>
  </fieldset>;
}
