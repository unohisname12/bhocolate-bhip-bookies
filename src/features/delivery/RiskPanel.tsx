import { useState } from 'react';
import { parseMathAnswer, gradeLabel } from '../../services/game/curriculum';
import { lootItem, LOOT } from './items';
import type { City, Driver } from './model';
import type { CityAction } from './StrategyPanels';
export function RiskPanel({ city, player, busy, now, act }: { city: City; player: Driver; busy: boolean; now: number; act: CityAction }) {
  const [stake,setStake]=useState(''),[answer,setAnswer]=useState('');
  const challenge=player.challenge, owned=LOOT.filter(i=>(player.inventory?.[i.id]??0)>0), selected=owned.some(i=>i.id===stake)?stake:owned[0]?.id??'';
  const active=challenge?.status==='active', seconds=active?Math.max(0,Math.ceil((challenge.deadline-now)/1000)):0;
  const used=player.riskRound===city.round;
  if(!city.rules.crates)return null;
  return <section className="delivery-card risk-panel" aria-label="Optional math wager"><h2>Challenge roll · risk 1 item, win 2</h2><p>Optional: stake one owned item for a harder question, no hints, one answer, 60 seconds. The item is spent when you start. Correct earns two random items; wrong, timeout, or leaving it unfinished loses the stake. Your normal delivery only needs the regular briefing.</p>
    {active?<><div className="risk-clock" role="timer" aria-label="Challenge time remaining">{seconds}s remaining</div><p>{gradeLabel(challenge.problem.grade??0)} · {challenge.problem.topic} · no hints</p><h3>{challenge.problem.question}</h3>
      <form onSubmit={e=>{e.preventDefault();const value=parseMathAnswer(answer);if(Number.isFinite(value))void act('risk-answer',{id:challenge.id,answer:value});}}><label>Your wager answer<input autoComplete="off" inputMode="decimal" value={answer} onChange={e=>setAnswer(e.target.value)} disabled={busy||seconds===0}/></label><button className="delivery-primary" disabled={busy||seconds===0||!Number.isFinite(parseMathAnswer(answer))}>Submit wager answer · final</button></form><p>Finish this question before sealing a delivery. Refreshing does not reset the timer.</p></>
    :<>{challenge&&<p role="status">{challenge.status==='won'?`Challenge won! Received ${challenge.rewards?.map(id=>lootItem(id)?.name).join(' + ')}.`:'Challenge ended: your staked item was spent. Your delivery is still available.'}</p>}
      <label>Item to wager<select value={selected} onChange={e=>setStake(e.target.value)} disabled={busy||used||player.submitted}>{owned.map(i=><option value={i.id} key={i.id}>{i.name} ×{player.inventory![i.id]}</option>)}{!owned.length&&<option value="">No items available</option>}</select></label>
      <button disabled={busy||used||player.submitted||!selected||city.phase!=='planning'||!!city.deadline&&city.deadline-now<60000||player.ambush?.status==='active'} onClick={()=>{setAnswer('');void act('risk-start',{stake:selected});}}>{used?'Challenge used this round':'Stake item & start 60-second question'}</button></>}
    <details><summary>Your recent challenges</summary><ul>{(player.challengeHistory??[]).slice(-6).reverse().map((r,i)=><li key={i}>Round {r.round} · {gradeLabel(r.grade)} · {r.topic} · {r.correct?'Correct':r.timedOut?'Timed out':'Incorrect'} · {Math.ceil(r.elapsed/1000)}s</li>)}</ul></details>
  </section>;
}
