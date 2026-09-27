import { useState } from 'react';
import { LOOT, lootItem } from './items';
import { contractFor, demandAt, nodes, PLACES, preview, value, type City, type Driver, type Order, type Trade, type ToolClaim } from './model';
import { CREW_COLORS } from './world';

export type CityAction = (op: string, body?: Record<string, unknown>) => Promise<boolean>;
const claimName = (claim: ToolClaim) => ({ none: 'Keep tools private', bike: 'I have an EV bike', teleport: 'I have teleport equipment', van: 'I have a van' })[claim];
export function RivalOverview({ city, me, negotiate }: { city: City; me: string; negotiate: (id: string) => void }) {
  return <section className="delivery-rival-overview" aria-label="Crew intelligence">
    <div className="intel-heading"><h2>Who’s making money?</h2><span>Public information · inventories and sealed choices stay private</span></div>
    <div className="rival-cards">{[...city.players].sort((a,b) => b.score-a.score).map((p,i) => {
      const trip = city.trips.find(t => t.id === p.id), jobs = city.trades?.filter(t => t.owner === p.id) ?? [];
      const claim = [...(city.radio ?? [])].reverse().find(line => line.startsWith(`${p.alias} →`) && line.includes('I have'));
      return <article key={p.id} style={{ borderTopColor: CREW_COLORS[city.players.findIndex(r => r.id === p.id)] }} className={p.id === me ? 'your-crew' : ''}>
        <header><span>#{i+1} {p.alias}{p.id === me ? ' · YOU' : ''}</span><b>{p.score} {city.rules.market ? 'coins' : 'pts'}</b></header>
        <p>{p.bot ? 'Computer crew · ' : ''}{city.phase === 'done' ? 'Finished' : p.submitted ? 'Order sealed · hidden' : 'Planning'}</p>
        <dl><div><dt>Last turn</dt><dd>{trip ? `${trip.points >= 0 ? '+' : ''}${trip.points}` : '—'}</dd></div><div><dt>Trust</dt><dd>{(p.trust ?? 0) >= 0 ? '+' : ''}{p.trust ?? 0}</dd></div><div><dt>Outposts</dt><dd>{p.hubs?.length ?? 0}/3</dd></div></dl>
        <p>At {PLACES[p.node].name}{trip?.destination !== undefined ? ` · last job: ${PLACES[trip.destination].name}` : ''}</p>
        {claim && <p className="public-claim">Says: {claim.split(': ').slice(1).join(': ')} <small>Unverified</small></p>}
        {jobs.map(t => <p key={t.id}>{t.courier ? 'Hired a courier' : t.counterBy ? 'Negotiating' : 'Hiring'}: {PLACES[t.destination].name} · {t.pay} coins</p>)}
        {p.id !== me && city.rules.deals && city.phase === 'planning' && <button onClick={() => negotiate(p.id)}>Talk / negotiate with {p.alias}</button>}
      </article>;
    })}</div>
  </section>;
}
export function RouteMarket({ city, player, order, choose }: { city: City; player: Driver; order: Order; choose: (destination: number, quote?: number) => void }) {
  return <section className="delivery-card route-market" aria-label="Route market"><h2>Routes up for grabs</h2>
    <p>{city.rules.market && city.rules.mode === 'rivals' ? 'Lowest sealed price wins. Undercut the previous price to challenge a rival; they can change their plan too.' : city.rules.market ? 'Protected jobs: choose a customer and compare your costs. Other crews can deliver there too.' : 'Compare destinations before choosing your sealed order.'} Current rival choices are hidden.</p>
    <div className="delivery-table-scroll"><table><thead><tr><th>Customer</th><th>Budget</th><th>Last winner / price</th><th>Your estimate</th><th>Move</th></tr></thead><tbody>{nodes(city).map((place, i) => {
      const owner = city.players.find(p => p.id === city.owners?.[i]);
      const price = city.rules.market && city.rules.mode === 'rivals' ? Math.max(1,Math.min(value(city,i), (city.lastQuotes?.[i] ?? value(city,i)+1)-1)) : undefined;
      const estimate = preview(city,player,{ ...order, destination:i, quote:price, subcontract:undefined });
      return <tr key={place.name} className={i === order.destination ? 'selected-route' : ''}>
        <th>{i+1}. {place.name}<small>{demandAt(city,i)>0?'Demand rising':demandAt(city,i)<0?'Demand cooling':'Steady demand'}{city.event?.kind==='ambush'&&city.event.a===i?' · Ambush':''}{city.closed===i&&!city.bridge?' · Roadwork':''}</small></th>
        <td>{value(city,i)}</td><td>{city.rules.mode==='community'?'Shared routes':owner?.alias ?? 'Open / tied'}<small>{city.lastQuotes?.[i] !== undefined ? `Last paid ${city.lastQuotes[i]} coins` : 'No price history'}</small></td>
        <td className={estimate.points < 0 ? 'negative-profit' : ''}>{estimate.points >= 0 ? '+' : ''}{estimate.points + estimate.contractBonus}<small>{price !== undefined ? `At a ${price}-coin quote` : 'Before competition'}</small></td>
        <td><button aria-label={`${owner && owner.id !== player.id && city.rules.mode==='rivals' ? 'Challenge' : 'Plan'} route to ${place.name}`} disabled={player.submitted || city.phase!=='planning'} onClick={() => choose(i,price)}>{owner && owner.id !== player.id && city.rules.mode==='rivals' ? 'Challenge route' : 'Plan route'}</button></td>
      </tr>;
    })}</tbody></table></div><p className="delivery-note">Estimates use your current route and equipment. A rival may undercut you. Hiring a courier changes the cost.</p>
  </section>;
}
export function InventoryPanel({ city, player, order, change, act, busy, ready }: { city: City; player: Driver; order: Order; change: (o: Order) => void; act: CityAction; busy: boolean; ready: number }) {
  const [family,setFamily] = useState('all'),[catalog,setCatalog]=useState(false);
  const owned = LOOT.filter(item => (player.inventory?.[item.id] ?? 0)>0);
  const locked = busy || player.submitted || city.phase !== 'planning' || player.challenge?.status==='active';
  return <section className="delivery-card delivery-garage" aria-label="Private garage"><h2>Your private garage <span>{owned.reduce((n,i)=>n+(player.inventory?.[i.id]??0),0)} items</span></h2>
    <p>Equip one item or teacher perk per delivery. Rivals cannot see this inventory. {player.evBike && <strong>Permanent EV bike owned: half travel cost.</strong>}</p>
    {city.rules.crates && <><button className="delivery-primary" disabled={locked || ready<2 || player.crateRound===city.round} onClick={() => void act('crate')}>{player.crateRound===city.round?'Supply crate opened this round':'Open math supply crate · 2 items'}</button><p>Three random starter items. Two correct briefing answers unlock one two-item crate each round.</p></>}
    {!!player.lastCrate?.length && <p className="loot-receipt" role="status">Latest loot: {player.lastCrate.map(id=>lootItem(id)?.name ?? id).join(' + ')}</p>}
    <label>Filter inventory<select value={family} onChange={e=>setFamily(e.target.value)}><option value="all">All tools</option>{[...new Set(LOOT.map(i=>i.family))].map(f=><option key={f}>{f}</option>)}</select></label>
    <div className="inventory-grid">{owned.filter(i=>family==='all'||i.family===family).map(item=>{
      const plan=preview(city,player,{...order,item:item.id,perk:''});
      return <article key={item.id} style={{borderColor:item.color}} className={order.item===item.id?'equipped':''}><header><b>{item.name}</b><span>×{player.inventory![item.id]}</span></header><p>{item.description}</p><small>Current route: {plan.points+plan.contractBonus} estimated {city.rules.market?'coins':'points'}</small><button disabled={locked} aria-pressed={order.item===item.id} onClick={()=>change({...order,item:order.item===item.id?'':item.id,perk:''})}>{order.item===item.id?'Unequip':'Equip'} {item.name}</button></article>;
    })}</div>
    {!owned.length && <p>Your garage is empty. Complete the briefing for your next crate, or earn a teacher supply drop.</p>}
    {city.rules.networks && city.rules.market && <div className="garage-upgrades"><button disabled={locked||!!player.evBike||player.score<12} onClick={()=>void act('buy',{tool:'bike'})}>{player.evBike?'EV bike owned':'Buy permanent EV bike · 12 coins'}</button><button disabled={locked||player.score<6||(player.perks.teleport??0)>=5} onClick={()=>void act('buy',{tool:'teleport'})}>Buy teleport charge · 6 coins</button></div>}
    <details onToggle={e=>setCatalog(e.currentTarget.open)}><summary>100-item loot catalog · 10 families × 10 ranks</summary><p>All items are earned in the game. Higher ranks improve a tool’s effect; a costly warp can still be worse than a short drive.</p><div className="loot-catalog">{catalog&&LOOT.map(item=><p key={item.id}><b>{item.name}</b> — {item.description}</p>)}</div></details>
  </section>;
}
function DealCard({ trade:t, city, player, order, select, act, busy }: { trade: Trade; city: City; player: Driver; order: Order; select: (o: Order)=>void; act: CityAction; busy: boolean }) {
  const [pay,setPay]=useState(t.pay),[claim,setClaim]=useState<ToolClaim>('none');
  const mine=t.owner===player.id,owner=city.players.find(p=>p.id===t.owner)!,counter=city.players.find(p=>p.id===t.counterBy),courier=city.players.find(p=>p.id===t.courier);
  const eligible=!mine&&!t.courier&&!t.counterBy&&(!t.target||t.target===player.id)&&!city.trades?.some(j=>j.owner===player.id||j.courier===player.id);
  const projected=preview(city,player,{...order,destination:t.destination,subcontract:t.id,quote:undefined});
  return <article className="negotiation-card"><header><b>{PLACES[t.destination].name}</b><strong>{t.pay} coins to courier</strong></header>
    <p>{owner.alias} is hiring{t.target?` ${city.players.find(p=>p.id===t.target)?.alias}`:' any crew'}{city.owners?.[t.destination]&&city.owners[t.destination]!==t.owner?' to compete for a rival’s route':''}.</p>
    <p>{courier?`Reserved by ${courier.alias}. Both crews spend their one delivery on this job.`:counter?`${counter.alias} asks for ${t.pay}. Claim: ${claimName(t.claim??'none')} (unverified).`:t.target?'Agreed / targeted offer; courier must seal to reserve.':'Open offer; negotiate or choose it for your order.'}</p>
    {mine&&t.counterBy&&<div className="negotiation-actions"><button disabled={busy||player.submitted} onClick={()=>void act('trade',{action:'confirm',id:t.id})}>Accept counteroffer</button><button disabled={busy||player.submitted} onClick={()=>void act('trade',{action:'decline',id:t.id})}>Decline counteroffer</button></div>}
    {mine&&!t.courier&&<button disabled={busy||player.submitted} onClick={()=>void act('trade',{action:'cancel',id:t.id})}>Withdraw unreserved job</button>}
    {t.counterBy===player.id&&<button disabled={busy||player.submitted} onClick={()=>void act('trade',{action:'withdraw',id:t.id})}>Withdraw my counteroffer</button>}
    {eligible&&<><p>Your current equipment: about <b>{projected.points+projected.contractBonus} coins profit</b> if the hiring crew wins. No payment if it loses or parks.</p>
      <label>Tool claim for {owner.alias}<select value={claim} onChange={e=>setClaim(e.target.value as ToolClaim)}>{(['none','bike','teleport','van'] as const).map(c=><option key={c} value={c}>{claimName(c)}</option>)}</select></label>
      <button disabled={busy||player.submitted} onClick={()=>select({...order,destination:t.destination,subcontract:t.id,claim,bid:0,quote:undefined,partner:''})}>Plan this subcontract</button>
      {(!owner.submitted||owner.bot)&&<div className="counteroffer"><label>Counteroffer to {owner.alias}<input type="number" min={1} max={value(city,t.destination)} value={pay} onChange={e=>setPay(+e.target.value)}/></label><button disabled={busy||player.submitted||!Number.isInteger(pay)||pay<1||pay>value(city,t.destination)} onClick={()=>void act('trade',{action:'counter',id:t.id,pay,claim})}>Send counteroffer</button></div>}
    </>}
  </article>;
}
export function Negotiations({ city, player, order, change, act, busy, target, setTarget }: { city: City; player: Driver; order: Order; change: (o:Order)=>void; act: CityAction; busy: boolean; target: string; setTarget: (id:string)=>void }) {
  const [pay,setPay]=useState(5),[claim,setClaim]=useState<ToolClaim>('none');
  const locked=busy||player.submitted||city.phase!=='planning';
  const nextTarget=target||city.players.find(p=>p.id!==player.id)?.id||'';
  return <section id="crew-negotiations" className="delivery-card" aria-label="Crew negotiations"><h2>Driver radio & deals</h2><p>Talk before you seal. Ask about tools, make a claim, or recruit another courier. Claims may be bluffs; one in three completed subcontracts gets an equipment audit. A false claim pays 3 coins to the hiring crew and loses trust.</p>
    <div className="delivery-settings"><label>Talk to crew<select value={nextTarget} onChange={e=>setTarget(e.target.value)}>{city.players.filter(p=>p.id!==player.id).map(p=><option key={p.id} value={p.id}>{p.alias} · trust {p.trust??0}</option>)}</select></label><label>Your public tool claim<select value={claim} onChange={e=>setClaim(e.target.value as ToolClaim)}>{(['none','bike','teleport','van'] as const).map(c=><option key={c} value={c}>{claimName(c)}</option>)}</select></label></div>
    <div className="negotiation-actions"><button disabled={locked||!nextTarget} onClick={()=>void act('radio',{target:nextTarget})}>Ask about their tools</button><button disabled={locked||!nextTarget} onClick={()=>void act('radio',{target:nextTarget,claim})}>Send my tool claim</button></div>
    <ol className="driver-radio" aria-label="Public driver radio" aria-live="polite">{(city.radio??[]).length?(city.radio??[]).map((line,i)=><li key={i}>{line}</li>):<li>No messages this round. Start a conversation.</li>}</ol>
    {city.rules.market&&<><h3>Hire someone for your selected route</h3><p><b>{PLACES[order.destination].name}</b> · customer budget {value(city,order.destination)} coins. You quote the customer; the courier uses its equipment. Both commit one turn. You keep the customer payment minus the courier fee.</p>
      <div className="delivery-settings"><label>Courier payment<input type="number" min={1} max={value(city,order.destination)} value={pay} onChange={e=>setPay(+e.target.value)}/></label></div>
      <div className="negotiation-actions"><button disabled={locked||!!order.subcontract||!Number.isInteger(pay)||pay<1||pay>value(city,order.destination)} onClick={()=>void act('trade',{action:'post',destination:order.destination,pay,target:nextTarget})}>Offer job to selected crew</button><button disabled={locked||!!order.subcontract||!Number.isInteger(pay)||pay<1||pay>value(city,order.destination)} onClick={()=>void act('trade',{action:'post',destination:order.destination,pay,target:''})}>Post job for any crew</button></div>
      <p className="delivery-note">Posting commits you to this customer until you withdraw the unreserved offer. Once a courier seals it, the agreement is locked. No extra delivery is created.</p>
      <h3>Open jobs & negotiations</h3>{(city.trades??[]).map(t=><DealCard key={`${t.id}:${t.pay}:${t.counterBy??''}`} trade={t} city={city} player={player} order={order} select={change} act={act} busy={busy}/>)}{!city.trades?.length&&<p>No jobs posted yet. A rival can carry your route more cheaply if it has the right equipment.</p>}
    </>}
  </section>;
}
export function RoundReport({ city, me }: { city: City; me: string }) {
  const reports=city.reportHistory?.length?city.reportHistory:city.trips.length?[{round:city.round-1,trips:city.trips}]:[];
  const [chosen,setChosen]=useState(0);
  const report=reports.find(r=>r.round===chosen)??reports[reports.length-1];
  if(!report)return null;
  const mine=report.trips.find(t=>t.id===me);
  return <section className="delivery-card round-report" aria-label="Round profit report"><header><h2>Did your choices pay off?</h2><label>Review round<select value={report.round} onChange={e=>setChosen(+e.target.value)}>{reports.map(r=><option key={r.round} value={r.round}>Round {r.round}</option>)}</select></label></header>
    {mine&&<div className="your-round"><b>{mine.points>=0?'+':''}{mine.points} {city.rules.market?'coins':'points'}</b><p>{mine.review??mine.message}</p></div>}
    <div className="delivery-table-scroll"><table><thead><tr><th>Crew / job</th><th>Income</th><th>Costs</th><th>Bonuses</th><th>Net</th></tr></thead><tbody>{[...report.trips].sort((a,b)=>b.points-a.points).map(t=><tr key={t.id} className={t.id===me?'selected-route':''}><th>{city.players.find(p=>p.id===t.id)?.alias}<small>{t.destination!==undefined?PLACES[t.destination].name:'Parked'}{t.quote!==undefined?` · quote ${t.quote}`:''}</small>{t.poachedFrom&&t.customerWon&&<small>Won from {city.players.find(p=>p.id===t.poachedFrom)?.alias}</small>}</th><td>{t.income??'—'}</td><td>{t.cost??'—'}</td><td>{t.bonus??'—'}</td><td>{t.points>=0?'+':''}{t.points}</td></tr>)}</tbody></table></div>
    <p className="delivery-note">Hindsight compares revealed prices, not future plans. Garage purchases, wagers, and ambush losses are recorded separately in your city balance and log.</p>
  </section>;
}
export function ContractStatus({ city, player }: {city:City;player:Driver}) {
  return city.rules.contracts?<p className="delivery-contract"><b>Three-stop contract:</b> {contractFor(city,player).map((n,i)=><span key={i} className={i===(player.contractStep??0)?'next-stop':''}>{i<(player.contractStep??0)?'✓ ':''}{PLACES[n].name}{i<2?' → ':''}</span>)}. Finish in order for +9. {player.contractsCompleted??0} completed.</p>:null;
}
