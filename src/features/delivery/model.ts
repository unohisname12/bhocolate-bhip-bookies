import type { ActiveBattleState } from '../../types/battle';
import { LOOT, lootItem } from './items';
import type { MathProblem } from '../../types';
import { generateLearningProblem, type LearningSettings } from '../../services/game/curriculum';
import { checkAnswer } from '../../services/game/mathEngine';
import type { PetStage } from '../../types/pet';
export const PLACES = [
  { name: 'Pip’s Bakery', icon: '🥐', x: 15, y: 22 }, { name: 'School', icon: '🏫', x: 50, y: 22 }, { name: 'Sunflower Homes', icon: '🏡', x: 85, y: 22 },
  { name: 'Woodland Café', icon: '☕', x: 15, y: 52 }, { name: 'Central Depot', icon: '📦', x: 50, y: 52 }, { name: 'Pet Park', icon: '🌳', x: 85, y: 52 },
  { name: 'Moonlight Market', icon: '🛍️', x: 15, y: 82 }, { name: 'Harbor', icon: '⛵', x: 50, y: 82 }, { name: 'Star Observatory', icon: '🔭', x: 85, y: 82 },
];
export const PERKS = {
  bike: { name: 'EV Bike', description: 'One delivery: halve travel cost, rounded up. A garage bike lasts for this city; buy it with match profit.' },
  teleport: { name: 'Teleport Charge', description: 'One delivery: jump to the destination with no travel cost, toll or road delay.' },
  express: { name: 'Express Pass', description: 'Ignore road closures and tolls for one delivery.' },
  van: { name: 'Loaner Van', description: 'Earn 3 extra points on one successful job, or 5 with Party rewards.' },
  insurance: { name: 'Delivery Insurance', description: 'Earn 5 points if a rival wins your chosen contract.' },
  warehouse: { name: 'Warehouse Key', description: 'Start your next route from the central depot to shorten it.' },
} as const;
export type Perk = keyof typeof PERKS;
export interface Rules { mode: 'community' | 'rivals'; format: 'solo' | 'duel' | 'group'; length: 'sprint' | 'campaign'; rounds: number; minutes: number; computers: number; tolls: boolean; deals: boolean; rewards: 'balanced' | 'party'; demand?: boolean; contracts?: boolean; networks?: boolean; market?: boolean; events?: boolean; crates?: boolean }
export const DEFAULT_RULES: Rules = { mode: 'community', format: 'solo', length: 'sprint', rounds: 4, minutes: 4, computers: 2, tolls: false, deals: true, rewards: 'balanced', demand: true, contracts: true, networks: true, market: true, events: true, crates: true };
export interface Driver { learningPlan?: import('./planning').DeliveryPlan; planningEvidence?: import('../../types/woodland').LearningEvidence[]; id: string; alias: string; pet: { name: string; speciesId: string; stage: PetStage } | null; bot: boolean; node: number; score: number; credits: number; baseline: number; practice: number; perks: Record<Perk, number>; order: Order | null; offer: string; submitted: boolean; joined: boolean; hubs?: number[]; contractStep?: number; contractsCompleted?: number; evBike?: boolean; crateRound?: number; lastLoot?: Perk; trust?: number; income?: number; expenses?: number; bonuses?: number; inventoryHidden?: boolean; inventory?: Record<string,number>; lastCrate?: string[]; challenge?: RiskChallenge; challengeHistory?: RiskResult[]; riskRound?: number; ambush?: {round:number;node:number;status:'active'|'won'|'lost';battle:ActiveBattleState} }
export interface Order { destination: number; route: 'direct' | 'scenic'; bid: number; partner: string; perk: Perk | ''; tactic?: 'standard' | 'rush' | 'invest'; quote?: number; subcontract?: string; claim?: ToolClaim; item?: string }
export interface Trip { id: string; from: number; to: number; route: number[]; points: number; message: string; income?: number; cost?: number; bonus?: number; quote?: number; tool?: string; worldFrom?: number; worldTo?: number; review?: string; round?: number; destination?: number; delivered?: boolean; customerWon?: boolean; poachedFrom?: string; outsourcedTo?: string }
export interface Mission { id: string; targets: string[]; baseline: Record<string, number>; goal: number; reward: Perk | 'bridge' | 'festival' | 'supply'; completed: string[]; amount?: number }
export interface City { version: 1; id: string; host: string; rules: Rules; phase: 'lobby' | 'planning' | 'done'; round: number; deadline: number; players: Driver[]; receipts: string[]; log: string[]; trips: Trip[]; closed: number; bridge: boolean; festival: number; mission: Mission | null; demand?: number[]; seed?: number; layout?: number[]; event?: CityEvent; trades?: Trade[]; radio?: string[]; owners?: string[]; lastQuotes?: number[]; reportHistory?: { round: number; trips: Trip[] }[] }
export interface Room { id: string; revision: number; state: City }
export interface DeliveryData { me: string; teacher: boolean; serverNow: number; classmates: { id: string; alias: string }[]; rooms: Room[] }
export const emptyPerks = (): Driver['perks'] => ({ express: 0, van: 0, insurance: 0, warehouse: 0, bike: 0, teleport: 0 });
export function driver(id: string, alias: string, pet: Driver['pet'], correct = 0, bot = false): Driver {
  return { id, alias, pet, bot, node: 4, score: 0, credits: 6, baseline: correct, practice: 0, perks: emptyPerks(), order: null, offer: '', submitted: false, joined: true };
}
export function validRules(raw: Partial<Rules>): Rules {
  const r = { ...DEFAULT_RULES, ...raw };
  if (!['community','rivals'].includes(r.mode) || !['solo','duel','group'].includes(r.format) || !['sprint','campaign'].includes(r.length) || !['balanced','party'].includes(r.rewards) || typeof r.tolls !== 'boolean' || typeof r.deals !== 'boolean') throw new Error('Choose valid city rules.');
  for (const flag of ['demand','contracts','networks','market','events','crates'] as const) if (typeof r[flag] !== 'boolean') throw new Error('Choose valid strategy rules.');
  if (![4,12,24].includes(r.rounds) || ![0,4,60,1440].includes(r.minutes) || !Number.isInteger(r.computers) || r.computers < 0 || r.computers > 9) throw new Error('Choose valid rounds and computer crews.');
  if (r.length === 'sprint') { r.rounds = 4; r.minutes = 4; }
  if (r.format === 'duel') r.computers = 0;
  if (r.format === 'solo') r.computers = Math.max(1, r.computers);
  return { mode: r.mode, format: r.format, length: r.length, rounds: r.rounds, minutes: r.minutes, computers: r.computers, tolls: r.tolls, deals: r.deals, rewards: r.rewards, demand: r.demand, contracts: r.contracts, networks: r.networks, market: r.market, events: r.events, crates: r.crates };
}
export function createCity(id: string, host: Driver, rules: Rules): City {
  return { seed: crypto.getRandomValues(new Uint32Array(1))[0], version: 1, id, host: host.id, rules: validRules(rules), phase: 'lobby', round: 1, deadline: 0, players: [host], receipts: [], log: ['Welcome to Delivery Districts. Choose routes, make deals, and prepare your pet’s orders.'], trips: [], closed: -1, bridge: false, festival: 0, mission: null };
}
export const nodes = (s: City) => PLACES.slice(0, s.rules.format === 'duel' ? 6 : 9);
const NPC_NAMES = ['Copper Courier','Orbit Express','Comet Cargo','Rocket Relay','Acorn Freight','Meteor Mail','Solar Shipping','Circuit Courier','Lunar Logistics'];
/** Keep saved human identities intact; migrate NPC display names without changing crew IDs. */
export function distinctCrewNames(s: City): City {
  const used = new Set(s.players.filter(p => !p.bot).flatMap(p => [p.alias, p.pet?.name ?? '']).map(n => n.trim().toLowerCase()));
  let index = 0;
  return { ...s, players: s.players.map(p => {
    if (!p.bot) return p;
    const base = NPC_NAMES[index++ % NPC_NAMES.length];
    let alias = base, suffix = 2;
    while (used.has(alias.toLowerCase())) alias = `${base} ${suffix++}`;
    used.add(alias.toLowerCase());
    return p.alias === alias ? p : { ...p, alias };
  }) };
}
export const crewLabel = (p: Driver) => p.bot ? `${p.alias} · NPC` : p.pet ? `${p.pet.name} · ${p.alias}` : p.alias;
export function startCity(s: City, now: number): City {
  if (s.phase !== 'lobby') throw new Error('This city has already started.');
  const humans = s.players.filter(p => p.joined);
  if (s.rules.format === 'duel' && humans.length !== 2) throw new Error('A duel needs exactly two students.');
  if (s.rules.format === 'solo' && humans.length !== 1) throw new Error('Solo games have one student.');
  if (humans.length + s.rules.computers > 10) throw new Error('Choose at most ten crews.');
  const bots = Array.from({ length: s.rules.computers }, (_, i) => driver(`bot-${i}`, NPC_NAMES[i], null, 0, true));
  if (humans.length + bots.length < 2) throw new Error('Invite another student or add a computer crew.');
  if (bots[0] && s.rules.deals) bots[0].offer = humans[0].id;
  return prepareRound(distinctCrewNames({ ...s, phase: 'planning', players: [...humans, ...bots], deadline: s.rules.minutes ? now + s.rules.minutes * 60000 : 0, closed: 1 }));
}
export function pathBetween(from: number, to: number): number[] {
  const path = [from]; let n = from;
  while (n % 3 !== to % 3) { n += n % 3 < to % 3 ? 1 : -1; path.push(n); }
  while (n !== to) { n += n < to ? 3 : -3; path.push(n); }
  return path;
}
/** Old saved games without strategy flags keep their original rules. */
export const demandAt = (s: City, destination: number) => s.rules.demand ? s.demand?.[destination] ?? 0 : 0;
export function contractFor(s: City, p: Driver) {
  const size = nodes(s).length;
  const start = (s.players.findIndex(r => r.id === p.id) * 2 + (p.contractsCompleted ?? 0) * 3) % size;
  return [start, (start + 1) % size, (start + 4) % size];
}
export const tacticCost = (o: Order) => o.tactic === 'invest' ? 3 : o.tactic === 'rush' ? 2 : 0;
export function value(s: City, destination: number) { return Math.max(3, 10 + ((destination * 3 + s.round * 5) % 8) + demandAt(s,destination) + (s.festival === s.round ? 4 : 0)); }
export function preview(s: City, p: Driver, o: Order) {
  const item=lootItem(o.item);
  const from = o.perk === 'warehouse' || item?.family==='warehouse' ? 4 : p.node;
  const path = pathBetween(slot(s,from), slot(s,o.destination));
  const distance = path.length - 1;
  const teleported = o.perk === 'teleport' || item?.family==='teleport';
  const rawTravel=distance*(s.rules.market?2:1);
  const travel = teleported ? 0 : item?.family==='bike'?Math.ceil(rawTravel*(1-item.rank/12)):(o.perk === 'bike' || p.evBike) ? Math.ceil(rawTravel / 2) : rawTravel;
  const toll = s.rules.mode === 'rivals' && s.rules.tolls && o.route === 'direct' && o.perk !== 'express' && !teleported ? 2 : 0;
  const delay = !s.bridge && s.closed === o.destination && o.route === 'direct' && o.perk !== 'express' && !teleported ? 4 : 0;
  const rush = s.rules.networks && o.tactic === 'rush' ? Math.min(2,travel) : 0;
  const investment = s.rules.networks && o.tactic === 'invest' ? 3 : 0;
  const network = s.rules.networks && (p.hubs?.includes(from) || p.hubs?.includes(o.destination)) ? 3 : 0;
  const step = p.contractStep ?? 0;
  const advances = !!s.rules.contracts && contractFor(s,p)[step] === o.destination;
  const contractBonus = advances && step === 2 ? 9 : 0;
  const income = o.subcontract ? (s.trades?.find(t=>t.id===o.subcontract)?.pay ?? 0) : s.rules.market ? o.quote ?? value(s,o.destination) : value(s,o.destination);
  const toolSavings=item?.family==='shield'?Math.min(item.rank,toll+delay):item?.family==='battery'||item?.family==='warehouse'?Math.min(item.rank,Math.max(0,travel-rush)):0;
  const activation=item?.family==='teleport'?11-item.rank:0;
  const cost = activation-toolSavings+travel + (o.route === 'scenic' && !teleported ? 2 : 0) + toll + delay - rush + investment + (s.rules.market ? 0 : o.bid);
  const toolBonus=item?.family==='cargo'?item.rank:item?.family==='scanner'&&demandAt(s,o.destination)>0?item.rank:item?.family==='contract'&&contractBonus?item.rank:item?.family==='broker'&&o.subcontract?item.rank:0;
  const bonus = toolBonus+network + (o.perk === 'van' ? (s.rules.rewards === 'party' ? 5 : 3) : 0);
  return { from, path, distance, travel, toll, delay, rush, investment, network, advances, contractBonus, income, cost, bonus, toolSavings, activation, spend: o.bid + tacticCost(o),
    points: s.rules.market ? income-cost+bonus : Math.max(1,income-cost+bonus) };

}
export function offerDeal(s: City, actor: string, target: string): City {
  const p = s.players.find(p => p.id === actor && p.joined);
  if (s.phase !== 'planning' || !p || p.submitted || !s.rules.deals || target === actor || (target && !s.players.some(p => p.id === target && p.joined))) throw new Error('Choose an available crew before sealing your orders.');
  if (s.rules.mode === 'community' && p.offer && target !== p.offer) throw new Error('Community warehouse promises are binding for this round.');
  return { ...s, players: s.players.map(p => p.id === actor ? { ...p, offer: target } : p) };
}
export function submit(s: City, actor: string, order: Order): City {
  if (!order || typeof order !== 'object' || typeof order.partner !== 'string' || typeof order.perk !== 'string') throw new Error('Choose a valid delivery order.');
  const p = s.players.find(p => p.id === actor && p.joined);
  if (s.phase !== 'planning' || !p || p.submitted) throw new Error('Wait for the next planning round.');
  if (s.rules.mode === 'community' && p.offer) order = { ...order, partner: p.offer };
  if (!p.bot && p.practice < 2) throw new Error('Complete two briefing questions. Hints and corrections count.');
  if (!Number.isInteger(order.destination) || order.destination < 0 || order.destination >= nodes(s).length || !['direct','scenic'].includes(order.route) || !Number.isInteger(order.bid) || order.bid < 0 || order.bid > Math.min(3, p.credits) || (s.rules.mode === 'community' && order.bid !== 0)) throw new Error('Choose a valid delivery order.');
  if (!['standard','rush','invest'].includes(order.tactic ?? 'standard') || (!s.rules.networks && order.tactic && order.tactic !== 'standard')) throw new Error('Choose an available delivery tactic.');
  if (order.bid + tacticCost(order) > p.credits) throw new Error('Your bid and tactic together cost more credits than you have.');
  if (order.tactic === 'invest' && ((p.hubs?.length ?? 0) >= 3 || p.hubs?.includes(order.destination))) throw new Error('Choose a new outpost location. Each crew can build three.');
  if (order.perk && (!(Object.hasOwn(PERKS, order.perk)) || !p.perks[order.perk])) throw new Error('That reward is not available.');
  if (order.partner && (!s.rules.deals || order.partner === actor || !s.players.some(p => p.id === order.partner && p.joined))) throw new Error('Choose a crew to offer warehouse sharing.');
  if (s.rules.market && (order.bid !== 0 || order.quote !== undefined && (!Number.isInteger(order.quote) || order.quote < 1 || order.quote > value(s,order.destination)))) throw new Error('Quote a whole-coin price within the customer budget.');
  if (order.item && (typeof order.item!=='string'||!lootItem(order.item)||!(p.inventory?.[order.item])||order.perk))throw new Error('Choose one tool from your private inventory.');
  const hired = s.trades?.some(t=>t.owner===actor && t.courier);
  if(!hired && s.event?.kind==='ambush' && order.destination===s.event.a && order.route==='direct' && order.perk!=='teleport' && lootItem(order.item)?.family!=='teleport' && !(p.ambush?.round===s.round&&p.ambush.node===s.event.a&&p.ambush.status==='won'))throw new Error('Clear the ambush in battle, take the scenic route, or use teleport equipment.');
  if(p.ambush?.round===s.round&&p.ambush.status==='active')throw new Error('Finish the ambush before sealing.');
  if (p.challenge?.status==='active')throw new Error('Finish your challenge roll before sealing.');
  if (order.claim && !['none','bike','teleport','van'].includes(order.claim)) throw new Error('Choose a tool claim.');
  const own = s.trades?.find(t=>t.owner===actor);
  if (own && (order.destination !== own.destination || order.subcontract)) throw new Error('Your posted job commits this turn to that customer.');
  if(s.trades?.some(t=>t.counterBy===actor))throw new Error('Withdraw or settle your counteroffer before sealing.');
  let trades=s.trades;
  if(order.subcontract){
    const trade=trades?.find(t=>t.id===order.subcontract);
    if(!s.rules.market || !s.rules.deals || !trade || trade.owner===actor || trade.counterBy || trade.courier || trade.target && trade.target!==actor || trade.destination!==order.destination)throw new Error('That subcontract is no longer available.');
    trades=trades!.map(t=>t.id===trade.id?{...t,courier:actor,claim:order.claim ?? trade.claim ?? 'none'}:t);
  }
  return { ...s, trades, players: s.players.map(p => p.id === actor ? { ...p, order: { ...order, quote: s.rules.market ? order.quote ?? value(s,order.destination) : order.quote }, submitted: true } : p) };
}
export function award(s: City, targets: string[], reward: Perk | 'bridge' | 'festival' | 'supply', amount = 1): City {
  if (!Number.isInteger(amount) || amount < 1 || amount > 5) throw new Error('Choose a bundle of one to five tools.');
  if (reward === 'supply') return { ...s, players: s.players.map(p=>targets.includes(p.id)?receive(s,p,amount*2,`teacher:${s.receipts.length}:${s.log.length}`):p), log:[...s.log,`Teacher supply drop: ${amount*2} random items for selected crews.`].slice(-30) };
  if (reward === 'bridge') return { ...s, bridge: true, log: [...s.log, 'The teacher opened the city bridge! Road closures no longer delay deliveries.'].slice(-30) };
  if (reward === 'festival') return { ...s, festival: s.round, log: [...s.log, 'Neighborhood party! Every delivery this round is worth 4 extra points.'].slice(-30) };
  if (!(Object.hasOwn(PERKS, reward))) throw new Error('Choose a delivery reward.');
  return { ...s, players: s.players.map(p => targets.includes(p.id) ? { ...p, perks: { ...p.perks, [reward]: Math.min(5, (p.perks[reward] ?? 0) + amount) } } : p), log: [...s.log, `Teacher reward: ${amount} × ${PERKS[reward].name}. One perk per delivery; extras stay in your garage.`].slice(-30) };
}
export function syncPractice(s: City, totals: Record<string, number>): City {
  if (s.phase === 'done') return s;
  let next = { ...s, players: s.players.map(p => ({ ...p, practice: p.bot ? 2 : Math.max(0, (totals[p.id] ?? p.baseline) - p.baseline) })) };
  const m = next.mission;
  if (m) {
    const earned = m.targets.filter(id => !m.completed.includes(id) && (totals[id] ?? 0) - (m.baseline[id] ?? 0) >= m.goal);
    const completed = [...m.completed, ...earned];
    if (m.reward === 'bridge' || m.reward === 'festival') { if (earned.length && completed.length === m.targets.length) next = award(next, m.targets, m.reward); }
    else if (earned.length) next = award(next, earned, m.reward, m.amount ?? 1);
    next = { ...next, mission: { ...m, completed } };
  }
  return next;
}
function resolveClassic(s: City, now: number, totals: Record<string, number>, force = false): City {
  if (s.phase !== 'planning') return s;
  const humans = s.players.filter(p => !p.bot && p.joined);
  if (!force && !humans.every(p => p.submitted) && !(s.deadline && now >= s.deadline)) return s;
  const players = s.players.map((p, index) => {
    if (!p.bot || !p.joined) return p;
    const bid = s.rules.mode === 'rivals' ? (s.round + index) % Math.min(4,p.credits + 1) : 0;
    const candidates: Order[] = [];
    for(let destination=0;destination<nodes(s).length;destination++)for(const route of ['direct','scenic'] as const)for(const tactic of ['standard','rush','invest'] as const){
      const o: Order = {destination,route,tactic,bid,partner:p.offer,perk:''};
      if(tactic !== 'standard' && !s.rules.networks || tacticCost(o)+bid>p.credits)continue;
      if(tactic==='invest' && ((p.hubs?.length ?? 0)>=3 || p.hubs?.includes(destination) || s.round>=s.rules.rounds-1))continue;
      if(s.event?.kind==='ambush' && destination===s.event.a && route==='direct')continue;
      candidates.push(o);
    }
    // Evaluate only public board information, never another crew's sealed order.
    const utility = (o: Order) => {
      const plan=preview(s,p,o), remaining=s.rules.rounds-s.round;
      const future=plan.advances && remaining >= 2-(p.contractStep ?? 0) ? (plan.contractBonus || 3) : 0;
      const nextStop=contractFor(s,p)[Math.min(2,(p.contractStep ?? 0)+(plan.advances?1:0))];
      const position=s.rules.contracts && remaining>0 ? (4-pathBetween(o.destination,nextStop).length)*.45 : 0;
      const invest=o.tactic==='invest' ? Math.min(5,remaining*.85) : 0;
      return plan.points+future+position+invest-tacticCost(o)*.3+((o.destination+index*3+s.round)%5)*.4;
    };
    const ranked=candidates.map(order=>({order,score:utility(order)})).sort((a,b)=>b.score-a.score);
    return { ...p, order: ranked[0].order, submitted: true };
  });
  const trips: Trip[] = [];
  const served = new Set<number>();
  const updated = players.map(p => {
    const o = p.order;
    if (!o || !p.joined) return { ...p, baseline: totals[p.id] ?? p.baseline, practice: 0, learningPlan: undefined, submitted: false, order: null, offer: '' };
    const rivals = players.filter(r => r.joined && r.order?.destination === o.destination);
    const high = Math.max(...rivals.map(r => r.order!.bid));
    const winners = rivals.filter(r => r.order!.bid === high);
    const winner = s.rules.mode === 'community' || o.bid === high;
    const plan = preview(s,p,o);
    const mutual = o.partner && players.find(r => r.id === o.partner)?.order?.partner === p.id;
    const partner = players.find(r => r.id === o.partner);
    const sharedNetwork = winner && mutual && s.rules.networks && (partner?.hubs?.includes(plan.from) || partner?.hubs?.includes(o.destination)) ? 2 : 0;
    const contractBonus = winner ? plan.contractBonus : 0;
    const builds = winner && o.tactic === 'invest';
    if(winner)served.add(o.destination);
    const points = (winner ? Math.max(1, Math.floor(plan.points / (s.rules.mode === 'rivals' ? winners.length : 1))) + (mutual ? 3 : 0) : o.perk === 'insurance' ? 5 : lootItem(o.item)?.family==='insurance'?lootItem(o.item)!.rank:0) + sharedNetwork + contractBonus;
    trips.push({ id: p.id, round:s.round, destination:o.destination, delivered:winner, from: p.node, to: winner?o.destination:p.node, worldFrom:slot(s,winner?plan.from:p.node),worldTo:slot(s,winner?o.destination:p.node), route: plan.path, points, message: `${p.alias}: ${winner ? `delivered to ${PLACES[o.destination].name}` : 'outbid; contract went to a rival'} · +${points}${mutual && winner ? ' · shared warehouse +3 included' : ''}${sharedNetwork ? ' · partner network +2' : ''}${contractBonus ? ' · contract complete +9' : winner && plan.advances ? ' · contract stop complete' : ''}${builds ? ' · outpost built' : ''}${plan.spend ? ` · spent ${plan.spend} credits` : ''}` });
    return { ...p, inventory:o.item?{...p.inventory,[o.item]:Math.max(0,(p.inventory?.[o.item]??0)-(winner||lootItem(o.item)?.family==='insurance'?1:0))}:p.inventory, node: winner?o.destination:p.node, score: p.score + points, hubs: builds ? [...(p.hubs ?? []),o.destination] : p.hubs, contractStep: winner && plan.advances ? ((p.contractStep ?? 0)+1)%3 : p.contractStep, contractsCompleted: (p.contractsCompleted ?? 0)+(contractBonus?1:0), credits: Math.min(9, p.credits - plan.spend + 2), baseline: totals[p.id] ?? p.baseline, practice: 0, learningPlan: undefined, submitted: false, order: null, offer: '', perks: o.perk ? { ...p.perks, [o.perk]: p.perks[o.perk] - 1 } : p.perks };
  });
  const nextBot = updated.filter(p => p.bot)[s.round % Math.max(1, updated.filter(p => p.bot).length)];
  if (nextBot && humans.length && s.rules.deals) nextBot.offer = humans[s.round % humans.length].id;
  const next: City = { ...s,reportHistory:[...(s.reportHistory??[]),{round:s.round,trips}].slice(-24), demand: s.rules.demand ? nodes(s).map((_,i)=>Math.max(-6,Math.min(6,demandAt(s,i)+(served.has(i)?-3:2)))) : s.demand, players: updated, trips, round: s.round + 1, phase: s.round >= s.rules.rounds ? 'done' : 'planning', deadline: s.rules.minutes ? now + s.rules.minutes * 60000 : 0, closed: (s.round * 2 + 1) % nodes(s).length, log: [...s.log, `Round ${s.round} deliveries`, ...trips.map(t => t.message), ...humans.filter(p => !p.submitted).map(p => `${p.alias} parked this round; no points lost. Return next round.`)].slice(-30) };
  return next.phase === 'planning' ? prepareRound(next) : next;
}
/** Never reveal another crew’s sealed orders or private learning counters. */
export function publicCity(s: City, actor: string, teacher = false): City {
  s = distinctCrewNames(s);
  return { ...s, seed: undefined, receipts: [], players: s.players.map(p => teacher ? p : p.id === actor ? { ...p, learningPlan:p.learningPlan?{...p.learningPlan,problem:{...p.learningPlan.problem,answer:p.learningPlan.support==='explanation'?p.learningPlan.problem.answer:0,hint:p.learningPlan.support!=='none'?p.learningPlan.problem.hint:undefined,explanation:p.learningPlan.support==='explanation'?p.learningPlan.problem.explanation:undefined}}:undefined, challenge: p.challenge ? { ...p.challenge, problem: { ...p.challenge.problem, answer: 0, hint: undefined, explanation: undefined } } : undefined } : { ...p, learningPlan:undefined, planningEvidence:undefined, order: null, baseline: 0, practice: 0, perks: emptyPerks(), evBike: undefined, lastLoot: undefined, crateRound: undefined, inventoryHidden: true, inventory: undefined, lastCrate: undefined, challenge: undefined, challengeHistory: undefined, riskRound: undefined, ambush: undefined }), mission: s.mission ? { ...s.mission, baseline: teacher ? s.mission.baseline : {} } : null };
}

export type ToolClaim = 'none'|'bike'|'teleport'|'van';
export interface Trade { id:string; owner:string; target:string; destination:number; pay:number; counterBy?:string; previousPay?:number; courier?:string; claim?:ToolClaim }
export interface CityEvent { kind:'shift'|'traffic'|'festival'|'quiet'|'ambush'; title:string; text:string; a:number; b:number }
export const slot = (s:City,node:number) => s.layout?.[node] ?? node;
function random(s:City,key:string):number { let h=s.seed ?? 713;for(const c of `${s.round}:${key}`)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,2246822507);return (h>>>0)/4294967296; }
function receive(s:City,p:Driver,n:number,key:string):Driver {
  const inventory={...p.inventory};const received:string[]=[];
  for(let i=0;i<n;i++){const item=LOOT[Math.floor(random(s,`${p.id}:${key}:${i}`)*LOOT.length)];inventory[item.id]=(inventory[item.id]??0)+1;received.push(item.id);}
  return {...p,inventory,lastCrate:received};
}
export function openCrate(s:City,actor:string):City {
  const p=s.players.find(p=>p.id===actor);
  if(!s.rules.crates || s.phase!=='planning' || !p || p.submitted || p.practice<2 || p.crateRound===s.round)throw new Error('Two correct briefing answers earn one supply crate each round.');
  return {...s,players:s.players.map(r=>r.id===actor?{...receive(s,p,2,'math-crate'),crateRound:s.round}:r)};
}
export function buyTool(s:City,actor:string,tool:string):City {
  const p=s.players.find(p=>p.id===actor);const cost=tool==='bike'?12:6;
  if(!s.rules.networks || !s.rules.market || s.phase!=='planning' || !p || p.submitted || !['bike','teleport'].includes(tool) || p.score<cost || tool==='bike'&&p.evBike || tool==='teleport'&&(p.perks.teleport??0)>=5)throw new Error('Choose an affordable upgrade before sealing your order.');
  return {...s,players:s.players.map(r=>r.id!==actor?r:{...p,score:p.score-cost,expenses:(p.expenses??0)+cost,evBike:tool==='bike'||p.evBike,perks:tool==='teleport'?{...p.perks,teleport:(p.perks.teleport??0)+1}:p.perks}),log:[...s.log,`${p.alias} reinvested ${cost} coins in private equipment.`].slice(-30)};
}
export function ownsClaim(p:Driver,claim:ToolClaim){return claim==='none'||claim==='van'||claim==='bike'&&(p.evBike||(p.perks.bike??0)>0||Object.entries(p.inventory??{}).some(([id,n])=>n>0&&lootItem(id)?.family==='bike'))||claim==='teleport'&&((p.perks.teleport??0)>0||Object.entries(p.inventory??{}).some(([id,n])=>n>0&&lootItem(id)?.family==='teleport'));}
export function radioMessage(s:City,actor:string,target:string,claim?:ToolClaim):City {
  const p=s.players.find(p=>p.id===actor),other=s.players.find(p=>p.id===target);
  if(!s.rules.deals||s.phase!=='planning'||!p||p.submitted||!other||actor===target||claim&&!['none','bike','teleport','van'].includes(claim))throw new Error('Choose another driver to talk to before sealing.');
  const line=claim?`${p.alias} → ${other.alias}: ${claim==='none'?'I am keeping my equipment private.':`I have ${claim==='bike'?'an EV bike':claim==='teleport'?'teleport equipment':'a van'}.`}`:`${p.alias} → ${other.alias}: What tools can you bring to a job?`;
  const lines=[...(s.radio??[]),line];
  if(!claim&&other.bot){const says:ToolClaim=ownsClaim(other,'teleport')?'teleport':ownsClaim(other,'bike')?'bike':random(s,`bluff:${other.id}`)<.25?'teleport':'van';lines.push(`${other.alias} → ${p.alias}: I have ${says==='teleport'?'teleport equipment':says==='bike'?'an EV bike':'a van'}. Make me a profitable offer.`);}
  return {...s,radio:lines.slice(-24)};
}
export function tradeAction(s:City,actor:string,op:string,data:{id?:string;destination?:number;pay?:number;target?:string;claim?:ToolClaim}):City {
  const p=s.players.find(p=>p.id===actor);
  if(!s.rules.market||!s.rules.deals||s.phase!=='planning'||!p||p.submitted)throw new Error('Negotiate before sealing your order.');
  const trades=[...(s.trades??[])];let message='';
  if(op==='post'){
    if(trades.some(t=>t.owner===actor||t.courier===actor||t.counterBy===actor)||!Number.isInteger(data.destination)||data.destination!<0||data.destination!>=nodes(s).length||!Number.isInteger(data.pay)||data.pay!<1||data.pay!>value(s,data.destination!)||data.target===actor||data.target&&!s.players.some(p=>p.id===data.target))throw new Error('Post one affordable customer job per turn.');
    trades.push({id:`${s.round}:${actor}`,owner:actor,target:data.target??'',destination:data.destination!,pay:data.pay!});
    message=`${p.alias}: I will pay ${data.pay} coins to deliver ${PLACES[data.destination!].name} if I win that customer. This commits my turn to that route.`;
  }else{
    const i=trades.findIndex(t=>t.id===data.id),t=trades[i];
    if(!t||t.courier)throw new Error('This offer has already been taken or expired.');
    if(op==='counter'){
      if(t.owner===actor||s.players.find(r=>r.id===t.owner)?.submitted&&!s.players.find(r=>r.id===t.owner)?.bot||t.target&&t.target!==actor||t.counterBy||trades.some(t=>t.owner===actor||t.courier===actor||t.counterBy===actor)||!Number.isInteger(data.pay)||data.pay!<1||data.pay!>value(s,t.destination)||data.claim&&!['none','bike','teleport','van'].includes(data.claim))throw new Error('Choose a valid counteroffer.');
      trades[i]={...t,previousPay:t.pay,pay:data.pay!,counterBy:actor,claim:data.claim??'none'};
      message=`${p.alias}: I can take ${PLACES[t.destination].name} for ${data.pay} coins. Tool claim: ${data.claim??'private'}.`;
    }else if(op==='confirm'){
      if(t.owner!==actor||!t.counterBy)throw new Error('Only the hiring crew can accept a counteroffer.');
      trades[i]={...t,target:t.counterBy,counterBy:undefined,previousPay:undefined};message=`${p.alias}: Agreed—${t.pay} coins. Seal the subcontract to reserve it.`;
    }else if(op==='decline'){
      if(t.owner!==actor||!t.counterBy)throw new Error('Only the hiring crew can decline.');
      trades[i]={...t,pay:t.previousPay??t.pay,counterBy:undefined,claim:undefined,previousPay:undefined};message=`${p.alias}: I am keeping my original price.`;
    }else if(op==='cancel'){
      if(t.owner!==actor)throw new Error('Only the hiring crew can withdraw its job.');
      trades.splice(i,1);message=`${p.alias}: I withdrew my unreserved job.`;
    }else if(op==='withdraw'){
      if(t.counterBy!==actor)throw new Error('Only the proposing courier can withdraw this counteroffer.');
      trades[i]={...t,pay:t.previousPay??t.pay,counterBy:undefined,previousPay:undefined,claim:undefined};message=`${p.alias}: I withdrew my counteroffer.`;
    }else throw new Error('Choose a negotiation action.');
  }
  return respondBots({...s,trades,radio:[...(s.radio??[]),message].slice(-24)});
}
function bestBotOrder(s:City,p:Driver,index:number):Order {
  const candidates:Order[]=[];const inventory=Object.entries(p.inventory??{}).filter(([,n])=>n>0).map(([id])=>id);
  for(let destination=0;destination<nodes(s).length;destination++)for(const route of ['direct','scenic'] as const){
    const budget=value(s,destination),history=s.lastQuotes?.[destination]??budget-2;
    const quotes=s.rules.mode==='rivals'?[budget,Math.max(1,Math.min(budget,history-1)),Math.max(1,budget-2-(index%3))]:[budget];
    for(const quote of new Set(quotes))for(const item of ['',...inventory])for(const tactic of ['standard','rush','invest'] as const){
      if(tactic!=='standard'&&!s.rules.networks||tactic==='invest'&&((p.hubs?.length??0)>=3||p.hubs?.includes(destination)||s.round>=s.rules.rounds-1))continue;
      if(s.event?.kind==='ambush'&&destination===s.event.a&&route==='direct'&&lootItem(item)?.family!=='teleport')continue;
      const o:Order={destination,route,quote,item,bid:0,partner:p.offer,perk:'',tactic};if(tacticCost(o)<=p.credits)candidates.push(o);
    }
  }
  const utility=(o:Order)=>{
    const plan=preview(s,p,o),budget=value(s,o.destination),history=s.lastQuotes?.[o.destination]??budget-2;
    const competition=s.rules.mode==='rivals'?(o.quote!<=history?1:.62):1;
    return (plan.points+plan.contractBonus)*competition+(plan.advances?2:0)+(o.tactic==='invest'?Math.min(5,(s.rules.rounds-s.round)*.8):0)-(o.item?1.2:0)+random(s,`choice:${p.id}:${o.destination}:${o.quote}`)*(1+index%3);
  };
  return candidates.map(order=>({order,score:utility(order)})).sort((a,b)=>b.score-a.score)[0].order;
}
function respondBots(s: City): City {
  const trades = (s.trades ?? []).map(t => ({ ...t }));
  const players = s.players.map(p => ({ ...p }));
  const radio = [...(s.radio ?? [])];
  for (const t of trades) {
    const owner = players.find(p => p.id === t.owner)!;
    if (t.counterBy && owner.bot) {
      const candidate = { ...owner.order!, destination: t.destination };
      const ownProfit = preview(s, owner, candidate).points;
      // A broker keeps at least one coin and compares outsourcing with doing the job itself.
      if (t.pay <= (candidate.quote ?? value(s, t.destination)) - Math.max(1, ownProfit * .5)) {
        radio.push(`${owner.alias}: Agreed, ${t.pay} coins. Seal my job to reserve it.`);
        t.target = t.counterBy; t.counterBy = undefined; t.previousPay = undefined;
      } else {
        radio.push(`${owner.alias}: That leaves too little profit for me. My offer stays ${t.previousPay ?? t.pay} coins.`);
        t.pay = t.previousPay ?? t.pay; t.counterBy = undefined; t.previousPay = undefined; t.claim = undefined;
      }
    }
    if (t.courier || t.counterBy) continue;
    const bot = players.find(p => p.bot && p.id !== t.owner && (!t.target || t.target === p.id)
      && !trades.some(other => other.owner === p.id || other.courier === p.id || other.counterBy === p.id));
    if (!bot?.order) continue;
    const candidates: Order[] = [];
    for (const route of ['direct', 'scenic'] as const) for (const item of ['', ...Object.keys(bot.inventory ?? {}).filter(id => bot.inventory![id] > 0)]) {
      if (s.event?.kind === 'ambush' && t.destination === s.event.a && route === 'direct' && lootItem(item)?.family !== 'teleport') continue;
      candidates.push({ destination: t.destination, route, item, bid: 0, partner: '', perk: '', tactic: 'standard', subcontract: t.id,
        claim: ownsClaim(bot, 'teleport') ? 'teleport' : ownsClaim(bot, 'bike') ? 'bike' : random(s, `claim:${bot.id}:${t.id}`) < .2 ? 'teleport' : 'van' });
    }
    candidates.sort((a, b) => preview({ ...s, trades }, bot, b).points - preview({ ...s, trades }, bot, a).points);
    const offer = candidates[0], profit = preview({ ...s, trades }, bot, offer).points;
    const minimum = Math.max(2, preview(s, bot, bot.order).points * .7 + Math.max(0, -(owner.trust ?? 0)));
    if (profit >= minimum) {
      bot.order = offer; t.courier = bot.id; t.claim = offer.claim;
      radio.push(`${bot.alias}: I will carry ${PLACES[t.destination].name} for ${t.pay} coins. My tool claim: ${t.claim}.`);
    } else if (t.target === bot.id) {
      const counter = Math.ceil(t.pay + minimum - profit);
      if (counter <= value(s, t.destination)) {
        t.previousPay = t.pay; t.pay = counter; t.counterBy = bot.id; t.claim = offer.claim;
        radio.push(`${bot.alias}: I need ${counter} coins to make this route worthwhile. Accept or decline my counteroffer.`);
      } else radio.push(`${bot.alias}: I cannot make a profit on that route. I am keeping my own job.`);
    }
  }
  return { ...s, trades, players, radio: radio.slice(-24) };
}
function prepareRound(s:City):City {
  let next:City={...s,event:undefined,players:s.players.map(p=>({...p,ambush:undefined}))};
  if(s.rules.events){
    const a=Math.floor(random(s,'shift-a')*nodes(s).length),b=(a+1+Math.floor(random(s,'shift-b')*(nodes(s).length-1)))%nodes(s).length;
    const kind=(['shift','traffic','festival','quiet','ambush'] as const)[Math.floor(random(s,'event')*5)];const layout=[...(s.layout??nodes(s).map((_,i)=>i))];
    if(kind==='shift'){[layout[a],layout[b]]=[layout[b],layout[a]];}
    next={...next,layout,event:{kind,a,b,title:kind==='shift'?'SPACE-TIME ADDRESS SWAP':kind==='traffic'?'MAGNETIC ROADWORK':kind==='festival'?'ORBITAL STREET FESTIVAL':kind==='ambush'?'ROUTE AMBUSH':'CLEAR SKIES',text:kind==='shift'?`${PLACES[a].name} and ${PLACES[b].name} swapped locations. Routes and costs have changed for everyone.`:kind==='traffic'?`Roadwork at ${PLACES[a].name}: direct deliveries cost 4 extra. A tool or scenic route can help.`:kind==='festival'?'Customers offer 4 extra coins this round. Expect competition.':kind==='ambush'?`A rogue courier blocks ${PLACES[a].name}. Win the existing pet battle, take a scenic detour, or teleport past. Losing costs 3 match coins; an uncleared direct route stays blocked.`:'A quiet trading round. Plan your network and watch the quotes.'},closed:kind==='traffic'?a:-1,festival:kind==='festival'?s.round:0};
  }
  next={...next,players:next.players.map(p=>s.rules.crates&&p.inventory===undefined?receive(next,p,3,'starter'):p)};
  if(!s.rules.market)return next;
  next={...next,players:next.players.map((p,index)=>{
    if(!p.bot)return p;let bot={...p,practice:2};
    if(s.rules.crates&&bot.crateRound!==s.round)bot={...receive(next,bot,2,'math-crate'),crateRound:s.round};
    return {...bot,order:bestBotOrder(next,bot,index),submitted:true};
  })};
  const bot=next.players.filter(p=>p.bot)[s.round%Math.max(1,next.players.filter(p=>p.bot).length)];
  if(bot&&s.rules.deals&&bot.order){const plan=preview(next,bot,bot.order);next={...next,trades:[{id:`${s.round}:${bot.id}`,owner:bot.id,target:'',destination:bot.order.destination,pay:Math.max(1,Math.min(value(next,bot.order.destination)-1,Math.floor(plan.income*.55)))}]};}
  return next;
}
function winning(s:City,players:Driver[],_p:Driver,o:Order){
  const rivals=players.filter(r=>r.order&&!r.order.subcontract&&r.order.destination===o.destination);
  const best=Math.min(...rivals.map(r=>r.order!.quote??value(s,o.destination)));
  const winner=s.rules.mode==='community'||(o.quote??value(s,o.destination))===best;
  return {winner,shares:s.rules.mode==='community'?1:rivals.filter(r=>(r.order!.quote??value(s,o.destination))===best).length};
}
export function resolve(s:City,now:number,totals:Record<string,number>,force=false):City {
  s=settleExpiredRisks(distinctCrewNames(s),now);
  if(!s.rules.market)return resolveClassic(s,now,totals,force);
  if(s.phase!=='planning')return s;
  const humans=s.players.filter(p=>!p.bot&&p.joined);
  if(!force&&!humans.every(p=>p.submitted)&&!(s.deadline&&now>=s.deadline))return s;
  // Bots already committed at round opening. No human order is consulted to choose their move.
  for(const p of s.players)if(p.challenge?.status==='active')s=finishRisk(s,p.id,p.challenge.id,NaN,Math.max(now,p.challenge.deadline+1));
  const players=s.players,served=new Set<number>(),owners=[...(s.owners??[])],lastQuotes=[...(s.lastQuotes??[])];
  const settlements=players.map(p=>{
    const o=p.order;
    if(!o)return {p,income:0,cost:0,bonus:0,delivered:false,from:p.node,to:p.node,review:'Parked this round. No delivery costs.',audit:0,trust:0,paymentTo:''};
    const plan=preview(s,p,o),work=s.trades?.find(t=>t.id===o.subcontract),employer=work&&players.find(r=>r.id===work.owner),own=s.trades?.find(t=>t.owner===p.id),courier=own?.courier&&players.find(r=>r.id===own.courier&&r.order?.subcontract===own.id);
    const result=work?(employer?.order&&!employer.order.subcontract?winning(s,players,employer,employer.order):{winner:false,shares:1}):winning(s,players,p,o);
    const won=result.winner,delivered=won&&!courier;
    let income=won?(work?work.pay:Math.floor(plan.income/result.shares)):0;
    const cost=won?(courier?own!.pay:plan.cost):0;
    let bonus=won?(courier?0:plan.bonus+plan.contractBonus):o.perk==='insurance'?5:lootItem(o.item)?.family==='insurance'?lootItem(o.item)!.rank:0;
    const mutual=!work&&o.partner&&players.find(r=>r.id===o.partner)?.order?.partner===p.id;
    const partner=players.find(r=>r.id===o.partner);
    if(won&&mutual)bonus+=3+(s.rules.networks&&(partner?.hubs?.includes(plan.from)||partner?.hubs?.includes(o.destination))?2:0);
    let audit=0,trust=0;const claim=o.claim??work?.claim??'none';
    if(delivered&&work&&claim!=='none'&&random(s,`audit:${p.id}`)<1/3){if(ownsClaim(p,claim))trust=1;else {audit=3;trust=-1;}}
    let review=!won?(work?'Your employer did not win the customer. You parked and kept your tool.':'A lower quote won, so you parked. Insurance may pay out.'):courier?`Customer paid ${income}; courier receives ${cost}. Your margin is ${income-cost}.`:`Income ${income} − costs ${cost} + bonuses ${bonus} = ${income-cost+bonus} coins.`;
    if(delivered&&plan.advances)review+=plan.contractBonus?' Three-stop contract complete: +9 included.':' Your three-stop contract advanced.';
    if(delivered&&o.tactic==='invest')review+=' Outpost built; future trips touching it gain +3.';
    if(audit)review+=' Tool claim audited: false claim. Paid 3 coins to the hiring crew; trust −1.';else if(trust)review+=' Tool claim verified; trust +1.';
    if(won&&!work){served.add(o.destination);owners[o.destination]=result.shares===1?p.id:'';lastQuotes[o.destination]=o.quote??value(s,o.destination);}
    if(won&&!work&&s.owners?.[o.destination]&&s.owners[o.destination]!==p.id)review+=' You poached a rival’s customer.';
    // Hindsight holds other quotes fixed; never a promise about next round.
    if(!work&&!own){let best=income-cost+bonus,bestNode=o.destination;
      for(let d=0;d<nodes(s).length;d++){const others=players.filter(r=>r.id!==p.id&&r.order&&!r.order.subcontract&&r.order.destination===d);const price=s.rules.mode==='community'?value(s,d):Math.min(value(s,d),...others.map(r=>(r.order!.quote??value(s,d))-1));if(price<1)continue;
        const alternative={...o,destination:d,quote:price,tactic:'standard' as const};if(s.event?.kind==='ambush'&&d===s.event.a&&alternative.route==='direct'&&alternative.perk!=='teleport'&&lootItem(alternative.item)?.family!=='teleport'&&!(p.ambush?.round===s.round&&p.ambush.status==='won'))continue;const a=preview(s,p,alternative);const profit=a.points+a.contractBonus;if(profit>best){best=profit;bestNode=d;}}
      review+=best>income-cost+bonus?` Hindsight: ${PLACES[bestNode].name} could have netted ${best} with a standard tactic and the same tool, against these revealed quotes (no partner bonus).`:' Your result matched or beat the standard-tactic alternatives checked against revealed quotes.';
    }
    // The reserved subcontract payment is transferred, never created twice.
    if(work&&!employer?.order)income=0;
    return {p,income,cost,bonus,delivered,from:delivered?plan.from:p.node,to:delivered?o.destination:p.node,review,audit,trust,paymentTo:work?.owner??''};
  });
  for(const row of settlements)if(row.audit){const employer=settlements.find(r=>r.p.id===row.paymentTo);if(employer){employer.bonus+=row.audit;employer.review+=' Received 3 coins for the courier’s false tool claim.';}row.cost+=row.audit;}
  const trips:Trip[]=settlements.map(r=>({id:r.p.id,round:s.round,destination:r.p.order?.destination,delivered:r.delivered,customerWon:!!r.p.order&&!r.p.order.subcontract&&served.has(r.p.order.destination)&&winning(s,players,r.p,r.p.order).winner,poachedFrom:r.p.order&&s.rules.mode==='rivals'&&s.owners?.[r.p.order.destination]!==r.p.id?s.owners?.[r.p.order.destination]:undefined,outsourcedTo:s.trades?.find(t=>t.owner===r.p.id)?.courier,from:r.from,to:r.to,worldFrom:slot(s,r.from),worldTo:slot(s,r.to),route:pathBetween(slot(s,r.from),slot(s,r.to)),income:r.income,cost:r.cost,bonus:r.bonus,quote:r.p.order?.quote,points:r.income-r.cost+r.bonus,tool:r.delivered?(r.p.order?.item?lootItem(r.p.order.item)?.family:r.p.order?.perk|| (r.p.evBike?'bike':'van')):undefined,review:r.review,message:`${r.p.alias} · ${r.income-r.cost+r.bonus>=0?'+':''}${r.income-r.cost+r.bonus} coins · ${r.review}`}));
  const updated=settlements.map(r=>{const p=r.p,o=p.order,plan=o?preview(s,p,o):undefined,inventory={...p.inventory};const consumableUsed=!!o&&(r.delivered||!o.subcontract&&lootItem(o.item)?.family==='insurance');if(o?.item&&consumableUsed)inventory[o.item]=Math.max(0,(inventory[o.item]??0)-1);
    return {...p,inventory,score:p.score+r.income-r.cost+r.bonus,income:(p.income??0)+r.income,expenses:(p.expenses??0)+r.cost,bonuses:(p.bonuses??0)+r.bonus,trust:(p.trust??0)+r.trust,node:r.to,hubs:r.delivered&&o?.tactic==='invest'?[...(p.hubs??[]),o.destination]:p.hubs,contractStep:r.delivered&&plan?.advances?((p.contractStep??0)+1)%3:p.contractStep,contractsCompleted:(p.contractsCompleted??0)+(r.delivered&&plan?.contractBonus?1:0),credits:Math.min(9,p.credits-(o?tacticCost(o):0)+ (o?2:0)),baseline:totals[p.id]??p.baseline,practice:0,learningPlan:undefined,submitted:false,order:null,offer:'',perks:o?.perk&&(r.delivered||o.perk==='insurance')?{...p.perks,[o.perk]:Math.max(0,(p.perks[o.perk]??0)-1)}:p.perks};});
  let next:City={...s,reportHistory:[...(s.reportHistory??[]),{round:s.round,trips}].slice(-24),players:updated,trips,owners,lastQuotes,trades:[],radio:[],demand:s.rules.demand?nodes(s).map((_,i)=>Math.max(-6,Math.min(6,demandAt(s,i)+(served.has(i)?-3:2)))):s.demand,round:s.round+1,phase:s.round>=s.rules.rounds?'done':'planning',deadline:s.rules.minutes?now+s.rules.minutes*60000:0,log:[...s.log,`Round ${s.round} profit report`,...trips.map(t=>t.message)].slice(-30)};
  if(next.phase==='planning')next=prepareRound(next);return next;
}

export interface RiskChallenge { id:string; round:number; started:number; deadline:number; stake:string; problem:MathProblem; status:'active'|'won'|'lost'; rewards?:string[] }
export interface RiskResult { round:number; grade:number; topic:string; correct:boolean; elapsed:number; timedOut:boolean }
export function startRisk(s:City,actor:string,stake:string,learning:LearningSettings,now:number):City {
  const p=s.players.find(p=>p.id===actor);
  if(!s.rules.crates||s.phase!=='planning'||!p||p.submitted||p.riskRound===s.round||p.ambush?.round===s.round&&p.ambush.status==='active'||!(p.inventory?.[stake]))throw new Error('Stake one owned item before sealing. One challenge roll per round.');
  if(s.deadline&&s.deadline-now<60000)throw new Error('There is less than a minute left. Save your item for next round.');
  const problem=generateLearningProblem({...learning,challenge:'stretch',grade:Math.min(12,learning.grade+1),topic:'mixed',learningHelp:false});
  const challenge:RiskChallenge={id:`${s.round}:${actor}`,round:s.round,started:now,deadline:now+60000,stake,problem,status:'active'};
  return {...s,players:s.players.map(r=>r.id===actor?{...p,inventory:{...p.inventory,[stake]:p.inventory![stake]-1},challenge,riskRound:s.round}:r)};
}
export function finishRisk(s:City,actor:string,id:string,answer:number,now:number):City {
  const p=s.players.find(p=>p.id===actor),challenge=p?.challenge;
  if(!p||!challenge||challenge.id!==id||challenge.status!=='active')throw new Error('That challenge roll is already settled.');
  const correct=now<=challenge.deadline&&s.round===challenge.round&&checkAnswer(challenge.problem,answer);
  const result:RiskResult={round:challenge.round,grade:challenge.problem.grade??0,topic:challenge.problem.topic??'mixed',correct,elapsed:Math.min(60000,now-challenge.started),timedOut:now>challenge.deadline||s.round!==challenge.round};
  const rewarded=correct?receive(s,p,2,`risk:${challenge.id}`):p;
  return {...s,players:s.players.map(r=>r.id===actor?{...rewarded,challenge:{...challenge,status:correct?'won':'lost',rewards:correct?rewarded.lastCrate:[]},challengeHistory:[...(p.challengeHistory??[]),result].slice(-24)}:r)};
}

/** Same expiry behavior in solo and classroom play, including tab suspension. */
export function settleExpiredRisks(s:City,now:number):City {
  let next=s;
  for(const p of next.players)if(p.challenge?.status==='active'&&(now>p.challenge.deadline||s.round!==p.challenge.round||s.phase==='done'))next=finishRisk(next,p.id,p.challenge.id,NaN,Math.max(now,p.challenge.deadline+1));
  return next;
}
