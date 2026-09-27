import { startDeliveryPlan, deliveryPlanAction, deliveryNumbers } from './planning';
import { DeliveryPlanCard } from './DeliveryPlanCard';
import { quantityDecision } from '../learning/decisions';
import { RivalOverview, RouteMarket, InventoryPanel, Negotiations, RoundReport, ContractStatus } from './StrategyPanels';
import { RiskPanel } from './RiskPanel';
import { createPortal } from 'react-dom';
import { BattleScreen } from '../../screens/BattleScreen';
import { ambushAction, type AmbushAction } from './ambush';
import { lootItem } from './items';
import { DeliveryGuide } from './DeliveryGuide';
import { PetSprite } from '../../components/pet/PetSprite';
import { ActivePetContext } from '../../components/ActivePetContext';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { useLearningSettings } from '../../components/LearningContext';
import { useNextQuestionSettings } from '../../pilot/NextQuestionContext';
import { generateLearningProblem, gradeLabel } from '../../services/game/curriculum';
import { checkAnswer } from '../../services/game/mathEngine';
import { MathAnswerInput } from '../../components/math/MathAnswerInput';
import { LearningHelp } from '../../components/math/LearningHelp';
import { DeliveryCloudContext } from './context';
import { useDeliveryCloud } from './client';
import { CityMap } from './CityMap';
import { RulesEditor } from './RulesEditor';
import { openCrate, buyTool, tradeAction, radioMessage, startRisk, finishRisk, type ToolClaim, offerDeal, createCity, driver, DEFAULT_RULES, startCity, syncPractice, resolve, submit, nodes, PLACES, PERKS, preview, value, type City, type Rules, type Order, type Perk } from './model';
import './delivery.css';
import './simple.css';
type Props = { state: EngineState; dispatch: (a: GameEngineAction) => void; exit: () => void };
function Briefing({ dispatch, ready, next, busy }: { dispatch: Props['dispatch']; ready: number; next: () => void; busy: boolean }) {
  const learning = useLearningSettings(), refresh = useNextQuestionSettings();
  const [problem, setProblem] = useState(() => generateLearningProblem(learning)), [correct, setCorrect] = useState<boolean | null>(null), [help, setHelp] = useState(false), [loading, setLoading] = useState(false);
  return <section className="delivery-briefing"><p className="delivery-eyebrow">YOUR PET’S MISSION BRIEFING</p><h2>Get your crew ready</h2><p>{gradeLabel(learning.grade)} · {learning.topic === 'mixed' ? 'Mixed practice' : learning.topic}</p><p>{Math.min(2, ready)}/2 questions complete. Hints and corrected answers count. No extra moves for speed.</p><progress max={2} value={Math.min(2, ready)}/><h3>{problem.question}</h3>
    {correct === false && <p role="status">Keep trying. Your pet is cheering you on—there’s no penalty.</p>}
    {(help || correct === false) && correct !== true && <LearningHelp problem={problem} beforeAttempt={correct === null} onRetry={() => { setHelp(false); setCorrect(null); }}/>} 
    {!help && correct !== true && learning.learningHelp !== false && <button onClick={() => setHelp(true)}>Show a hint</button>}
    {correct !== true ? <MathAnswerInput key={problem.id} isCorrect={correct} onSubmit={answer => { const ok = checkAnswer(problem, answer); setCorrect(ok); dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: ok, reward: ok ? problem.reward : 0, problem, source: 'practice' }); }}/>
      : <div role="status"><strong>Correct! Your practice counts.</strong><button disabled={loading} onClick={async () => { setLoading(true); try { const settings = await refresh(); setProblem(generateLearningProblem(settings)); setCorrect(null); setHelp(false); } finally { setLoading(false); } }}>Next question / extra practice</button></div>}
    <button disabled={busy} onClick={next}>Return to city & save practice</button>
  </section>;
}
export function DeliveryGame({ state, dispatch, exit }: Props) {
  const cloud = useContext(DeliveryCloudContext), online = !!cloud;
  const refreshLearning = useNextQuestionSettings();
  const learning = useLearningSettings();
  const api = useDeliveryCloud(online);
  const me = api.data?.me ?? state.player.id;
  const key = `auralith-delivery-v1:${state.player.id}`;
  const [local, setLocal] = useState<City | null>(() => { try { const raw = localStorage.getItem(key); if (!raw) return null; const city = JSON.parse(raw); return city.version === 1 && city.host === state.player.id && Array.isArray(city.players) ? city : null; } catch { return null; } });
  const navigationKey = `${key}:navigation`;
  const [navigation] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(navigationKey) ?? 'null') as { chosen: string; draft: Order; round: string } | null; } catch { return null; }
  });
  const [chosen, setChosen] = useState(navigation?.chosen ?? ''), [rules, setRules] = useState<Rules>(local?.rules ?? DEFAULT_RULES), [briefing, setBriefing] = useState(false), [error, setError] = useState(''), [saving, setSaving] = useState(false), [clock, setClock] = useState(Date.now());
  const [radioTarget,setRadioTarget] = useState('');
  const [view, setView] = useState<'play'|'rivals'|'deals'|'items'|'results'>('play');
  const [draft, setDraft] = useState<Order>(navigation?.draft ?? { destination: 0, route: 'direct', bid: 0, partner: '', perk: '' });
  const battleLock = useRef(false);
  const localRef = useRef(local); localRef.current = local;
  const totalRef = useRef(state.player.lifetimeMathCorrect); totalRef.current = state.player.lifetimeMathCorrect;
  const selected = api.data?.rooms.find(r => r.id === chosen);
  const city = online ? selected?.state ?? null : local;
  const player = city?.players.find(p => p.id === me), count = state.player.lifetimeMathCorrect;
  const planningEvidence=player?.planningEvidence;
  useEffect(()=>{if(planningEvidence?.length)dispatch({type:'SYNC_DELIVERY_EVIDENCE',rows:planningEvidence});},[planningEvidence,dispatch]);
  const ready = player ? Math.max(player.practice, count - player.baseline) : 0;
  const busy = api.busy || saving;
  const roundKey = `${city?.id}:${city?.round}`;
  const [draftRound,setDraftRound] = useState(navigation?.round ?? '');
  useEffect(() => {
    try { sessionStorage.setItem(navigationKey, JSON.stringify({ chosen, draft, round: draftRound })); } catch { /* Server-submitted plans still remain saved. */ }
  }, [navigationKey, chosen, draft, draftRound]);
  const order = useMemo<Order>(()=>draftRound===roundKey ? draft : { destination:0,route:'direct',bid:0,partner:'',perk:'' },[draftRound,roundKey,draft]);
  const setOrder = (update:Order|((o:Order)=>Order)) => { setDraft(typeof update==='function'?update(order):update);setDraftRound(roundKey); };
  const changeOrder = (next:Order) => { setOrder(next); };
  const chooseRoute = (destination:number, quote?:number) => {changeOrder({...order,destination,quote,subcontract:undefined,bid:0});setView('play');};
  const negotiate = (id:string) => {setRadioTarget(id);setView('deals');};
  const pick = useCallback((destination: number) => { setDraft({ ...order, destination,quote:undefined,subcontract:undefined });setDraftRound(roundKey); },[order,roundKey]);
  const plan = city && player ? preview(city,player,order) : null;
  const quantities=city&&player?deliveryNumbers(city,me,order):null;
  const canPlan=!!(quantities && quantityDecision(learning,'preview','delivery',quantities.total,quantities.cost,'coins','Plan this route.'));
  async function beginPlan() {
    if(!city || busy)return;
    const settings=await refreshLearning();
    if(online)await api.act('plan-start',{roomId:city.id,round:city.round,order});
    else try {saveLocal(startDeliveryPlan(localRef.current ?? city,me,order,settings,Date.now()));}catch(e){setError((e as Error).message);}
  }
  async function actPlan(kind:'hint'|'explanation'|'answer'|'cancel',answer=0) {
    if(!city || busy)return;
    if(online)await api.act('plan-action',{roomId:city.id,round:city.round,kind,answer});
    else try {const next=deliveryPlanAction(localRef.current ?? city,me,kind,answer,Date.now());saveLocal(resolve(next,Date.now(),{[me]:count}));}catch(e){setError((e as Error).message);}
  }
  const hiring = city?.trades?.find(t=>t.owner===me), hired = !!hiring?.courier;
  const estimate = plan ? hired ? plan.income-(hiring?.pay??0) : plan.points+plan.contractBonus : 0;
  function saveLocal(next: City) {
    try { localStorage.setItem(key, JSON.stringify(next)); localRef.current = next; setLocal(next); setError(''); }
    catch { setError('City could not be saved on this device. Free storage before continuing.'); }
  }
  const needsClock = !!city?.deadline || player?.challenge?.status === 'active';
  useEffect(() => {
    const timer = setInterval(() => {
      if (needsClock && !document.hidden) setClock(Date.now());
      if (!online && localRef.current?.phase === 'planning') {
        const current = localRef.current, totals = { [state.player.id]: totalRef.current };
        const next = resolve(syncPractice(current, totals), Date.now(), totals);
        if (JSON.stringify(next) !== JSON.stringify(current)) {
          try { localStorage.setItem(key, JSON.stringify(next)); localRef.current = next; setLocal(next); } catch { setError('City could not be saved on this device.'); }
        }
      }
    }, 1000); return () => clearInterval(timer);
  }, [online, key, state.player.id, needsClock]);
  async function flush() {
    if (!cloud) return true;
    setSaving(true);
    try { const ok = await cloud.flush(); if (!ok) { setError('Wait for Saved online, then try again.'); return false; } await api.refresh(); return true; }
    finally { setSaving(false); }
  }
  async function create() {
    setError('');
    if (online) { if (!await flush()) return; const id = await api.act('create', { rules }); if (id) setChosen(id); }
    else { const pet = state.pet ? { name: state.pet.name, speciesId: state.pet.speciesId, stage: state.pet.stage } : null; saveLocal(createCity(crypto.randomUUID(), driver(me, state.player.displayName || 'Your crew', pet, count), { ...rules, format: 'solo', computers: Math.max(1, rules.computers) })); }
  }
  async function start() {
    if (!city) return;
    if (online) { if (await flush()) await api.act('start', { roomId: city.id }); }
    else try { saveLocal(startCity({ ...city, players: city.players.map(p => ({ ...p, baseline: count, practice: 0 })) }, Date.now())); } catch (e) { setError((e as Error).message); }
  }
  async function send() {
    if (!city) return;
    if (online) { if (!await flush()) return; if (!await api.act('submit', { roomId: city.id, round: city.round, order })) return; }
    else try { const totals = { [me]: count }; saveLocal(resolve(submit(syncPractice(city, totals), me, order), Date.now(), totals)); } catch (e) { setError((e as Error).message); return; }
    dispatch({ type: 'COMPLETE_CLASSROOM_ACTIVITY', game: 'delivery' });
    setOrder(o => ({ ...o, perk: '', bid: 0 }));
  }
  async function cityAction(op:string,body:Record<string,unknown>={}) {
    if(!city||busy||battleLock.current)return false;
    battleLock.current=true;setSaving(true);
    try {
      if(online){
        if((op==='crate'||op==='risk-start')&&!await flush())return false;
        const ok=!!await api.act(op,{roomId:city.id,round:city.round,...body});
        if(ok&&op==='risk-start'&&body.stake===order.item)setOrder(o=>({...o,item:''}));
        return ok;
      }
      const totals={[me]:count};
      let next=resolve(syncPractice(localRef.current!,totals),Date.now(),totals);
      if(next.round!==city.round){saveLocal(next);throw new Error('A new round started. Review the current city.');}
      switch(op){
        case 'crate':next=openCrate(next,me);break;
        case 'buy':next=buyTool(next,me,String(body.tool));break;
        case 'radio':next=radioMessage(next,me,String(body.target),body.claim as ToolClaim|undefined);break;
        case 'trade':next=tradeAction(next,me,String(body.action),body);break;
        case 'risk-start':next=startRisk(next,me,String(body.stake),await refreshLearning(),Date.now());break;
        case 'risk-answer':next=finishRisk(next,me,String(body.id),Number(body.answer),Date.now());break;
        default:throw new Error('Unknown city action.');
      }
      saveLocal(next);if(op==='risk-start'&&body.stake===order.item)setOrder(o=>({...o,item:''}));return true;
    }catch(e){setError((e as Error).message);return false;}
    finally{battleLock.current=false;setSaving(false);}
  }
  async function fight(action: AmbushAction) {
    if (!city || busy || battleLock.current) return;
    battleLock.current = true;
    setSaving(true);
    try {
      if (online) {
        if (action === 'start' && !await flush()) return;
        await api.act('ambush', { roomId: city.id, round: city.round, action });
      } else {
        const current = localRef.current;
        if (current) saveLocal(ambushAction(syncPractice(current, { [me]: count }), me, action, state));
      }
    } catch (e) { setError((e as Error).message); }
    finally { battleLock.current = false; setSaving(false); }
  }
  const encounter = player?.ambush?.round === city?.round ? player?.ambush : undefined;
  const blocked = !hired && city?.event?.kind === 'ambush' && order.destination === city.event.a && order.route === 'direct'
    && order.perk !== 'teleport' && lootItem(order.item)?.family !== 'teleport' && encounter?.status !== 'won';
  if (city?.phase === 'planning' && encounter?.status === 'active') {
    return createPortal(<div className="delivery-encounter">
      <BattleScreen deliveryEncounter battle={encounter.battle} dispatch={action => { void fight(action as AmbushAction); }}/>
      <div className="delivery-encounter-status" role="status">
        <strong>Delivery ambush · {PLACES[encounter.node].name}</strong>
        <span>Win to open the direct route. Defeat or retreat costs 3 match coins. The city timer keeps running.</span>
        {(error || api.error) && <span role="alert">{error || api.error}</span>}
        <button disabled={busy} onClick={() => void fight({ type: 'FLEE_BATTLE' })}>Retreat to city (−3 coins)</button>
        {busy && <span>Saving battle…</span>}
      </div>
      {busy && <div className="delivery-encounter-lock" aria-label="Saving battle action"/>}
    </div>, document.body);
  }
  const cityClock = online && api.data ? api.data.serverNow + Math.max(0, clock - api.data.receivedAt) : clock;
  const remaining = city?.deadline ? Math.max(0, Math.ceil((city.deadline - cityClock) / 1000)) : null;
  return <main className={`delivery simple ${city ? 'in-city' : 'at-station'}`} ><div className="delivery-wrap"><nav><button onClick={exit}>← Games</button>{city && online && <button onClick={() => { setChosen(''); setBriefing(false); }}>All delivery cities</button>}<span className="delivery-save-label">{online ? 'CLASSROOM EDITION' : 'SAVED ON THIS DEVICE'}</span><DeliveryGuide learner={me}/></nav>
    <header className="delivery-hero"><div><h1>Delivery Districts<span className="title-pixel">.</span></h1>{!city && <p>Make deliveries. Make deals. Bring your pet.</p>}</div>{player && <div className="simple-balance"><strong>{player.score}</strong><span>{city?.rules.market?'coins':'points'}</span></div>}</header>
    {(error || api.error) && <div role="alert" className="delivery-error">{error || api.error}<button onClick={() => { setError(''); void api.refresh(); }}>Retry connection</button></div>}
    {!city && <><section className="delivery-card"><h2>Start a city</h2><p>Choose a route, plan its costs, then send your pet. A regular briefing is available for other math topics.</p>
      <RulesEditor rules={rules} change={setRules} disabled={busy} multiplayer={online}/><button className="delivery-primary" disabled={busy || online && !api.data} onClick={() => void create()}>{online ? 'Create delivery city' : 'Start solo city'}</button></section>
      {online && <section className="delivery-card"><h2>Your classroom cities</h2>{!api.data ? <p>Connecting to your classroom…</p> : api.data.rooms.length === 0 ? <p>No cities yet. Host one or let your teacher create a duel.</p> : api.data.rooms.map(r => <article className="delivery-room" key={r.id}><div><strong>{r.state.rules.format === 'duel' ? '1-on-1 Duel' : r.state.rules.format === 'solo' ? 'Solo Dispatch' : 'Group City'} · {r.state.rules.mode === 'community' ? 'Community Couriers' : 'Corporate Rivals'}</strong><p>{r.state.players.map(p => p.alias).join(', ')} · {r.state.phase === 'lobby' ? 'Waiting for crews' : r.state.phase === 'done' ? 'Complete' : `Round ${r.state.round}/${r.state.rules.rounds}`}</p></div><button onClick={() => { setChosen(r.id); setRules(r.state.rules); }}>Open city</button></article>)}</section>}
    </>}
    {city && <>
      <div className="delivery-scorebar"><strong>{city.rules.format === 'duel' ? '1-on-1 Duel' : city.rules.format === 'solo' ? 'Solo Dispatch' : 'Group City'} · {city.rules.mode === 'community' ? 'Community Couriers' : 'Corporate Rivals'}</strong><span>{city.phase === 'done' ? 'City complete' : city.phase === 'lobby' ? 'Crew lobby' : `Round ${city.round}/${city.rules.rounds}`}</span>{city.phase === 'planning' && <span>{remaining === null ? 'No timer · play when ready' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2,'0')} until dispatch`}</span>}</div>
      {city.phase === 'lobby' && <section className="delivery-card"><h2>Get the crew together</h2><p>{city.players.map(p => p.alias).join(' · ')}</p>{!player && online ? <button disabled={busy || city.rules.format === 'solo'} onClick={() => void api.act('join', { roomId: city.id })}>Join this city</button> : <p>You’re in! Classmates can open this city from Games → Delivery Districts.</p>}{city.host === me && <><RulesEditor rules={rules} change={setRules} disabled={busy} multiplayer={online}/><button disabled={busy} onClick={() => online ? void api.act('rules', { roomId: city.id, rules }) : saveLocal({ ...city, rules })}>Save remixed rules</button><button className="delivery-primary" disabled={busy} onClick={() => void start()}>Start deliveries</button><p>Save rule changes before starting. Sprint: four rounds of up to four minutes, plus setup and results.</p></>}</section>}
      {city.phase !== 'lobby' && <>
        <nav className="simple-tabs" aria-label="City sections">{([['play','Play'],['rivals','Rivals'],['deals','Deals'],['items','Items'],['results','Results']] as const).map(([id,label])=><button key={id} aria-label={label} aria-current={view===id?'page':undefined} onClick={()=>{setView(id);setBriefing(false);}}>{label}{id==='deals'&&!!city.trades?.length&&<span className="tab-count">{city.trades.length}</span>}{id==='items'&&player?.challenge?.status==='active'&&<span className="tab-count">Live</span>}</button>)}</nav>
        {view==='play' && <section className="simple-standings" aria-label="Crew standings">{[...city.players].sort((a,b)=>b.score-a.score).map(p=><button key={p.id} onClick={()=>setView('rivals')} aria-label={`View ${p.alias}: ${p.score} ${city.rules.market?'coins':'points'}`}><span>{p.alias}{p.id===me?' · You':p.bot?' · NPC':''}</span><b>{p.score}</b>{city.trades?.some(t=>t.owner===p.id&&!t.courier)&&<small>Hiring</small>}</button>)}</section>}
        {view==='rivals' && <><RivalOverview city={city} me={me} negotiate={negotiate}/>{player&&<RouteMarket city={city} player={player} order={order} choose={chooseRoute}/>}</>}
        {view==='results' && <><RoundReport key={`report:${city.id}:${city.round}`} city={city} me={me}/>{!city.trips.length&&<section className="delivery-card"><h2>No deliveries yet</h2><p>Your profits and route winners appear here after the first round.</p></section>}</>}
        {view==='deals' && (player&&city.rules.deals&&city.phase==='planning'?<Negotiations key={`deals:${city.id}:${city.round}`} city={city} player={player} order={order} change={o=>{changeOrder(o);setView('play');}} act={cityAction} busy={busy} target={radioTarget} setTarget={setRadioTarget}/>:<section className="delivery-card"><h2>Deals</h2><p>{city.rules.deals?'Deals reopen during planning.':'Driver deals are turned off for this city.'}</p></section>)}
        {view==='items' && player && <div className="simple-items"><InventoryPanel city={city} player={player} order={order} change={changeOrder} act={cityAction} busy={busy} ready={ready}/><RiskPanel city={city} player={player} act={cityAction} busy={busy} now={cityClock}/><button className="delivery-primary" onClick={()=>setView('play')}>Back to my delivery</button></div>}
        {view==='play' && <>
        <div className="delivery-board"><div className="delivery-world-column">
        {city.event && <section className="delivery-card delivery-event" aria-label="City event"><h2>{city.event.title}</h2><p>{city.event.text}</p></section>}
        <CityMap key={`map:${city.id}:${city.round}`} city={city} selected={order.destination} select={pick} me={me} order={order}/>
        {city.trips.length > 0 && <button className="simple-last-result" onClick={()=>setView('results')}>Last round: {(city.trips.find(t=>t.id===me)?.points??0)>=0?'+':''}{city.trips.find(t=>t.id===me)?.points??0} · View results →</button>}
        </div><aside className="delivery-desk" aria-label="Dispatch desk">
        {city.phase === 'done' ? <section className="delivery-card delivery-results"><p className="delivery-eyebrow">THE CITY SAYS THANK YOU</p><h2>{city.players.filter(p => p.score === Math.max(...city.players.map(p => p.score))).map(p => p.alias).join(' & ')} {city.players.filter(p => p.score === Math.max(...city.players.map(p => p.score))).length > 1 ? 'share the win!' : 'wins!'}</h2><p>Your math practice is saved with your learner progress. Delivery points belong to this match; teacher rewards belong to this city.</p><button onClick={() => { if (online) setChosen(''); else { localStorage.removeItem(key); setLocal(null); localRef.current = null; } }}>Plan another city</button></section>
          : player && <>
            {city.event?.kind === 'ambush' && !player.submitted && <section className="delivery-card delivery-ambush" aria-label="Route ambush">
              <h2>Roadblock at {PLACES[city.event.a].name}</h2>
              {encounter?.status === 'won' ? <p role="status">Ambush cleared! Your direct route is open this round.</p>
                : encounter?.status === 'lost' ? <p role="status">Ambush ended: −3 match coins. Take a scenic detour, teleport, or choose another customer.</p>
                : <><p>Battle the rogue courier with your pet. Win to clear the direct route; defeat or retreat costs 3 match coins. One attempt this round.</p>
                  <button disabled={busy || ready < 2 || !state.pet || ['dead','sick'].includes(state.pet.state)} onClick={() => void fight('start')}>Fight route ambush</button>
                  {ready < 2 && <p>Complete your two-question briefing first.</p>}
                  {!state.pet && <p>Your egg can safely take the scenic route.</p>}</>}
              <button disabled={busy} onClick={() => setOrder(o => ({ ...o, route: 'scenic' }))}>Take scenic detour</button>
            </section>}
            {city.mission && <section className="delivery-mission"><strong>TEACHER MISSION • REWARD AVAILABLE</strong><p>{city.mission.goal} new correct answers from the time the mission was set → {city.mission.reward in PERKS ? PERKS[city.mission.reward as Perk].name : city.mission.reward === 'bridge' ? 'open the shared bridge' : city.mission.reward === 'supply' ? `${(city.mission.amount??1)*2} random items` : 'neighborhood party'}.</p><p>{city.mission.completed.includes(me) ? 'Your goal is complete!' : city.mission.targets.includes(me) ? 'You’re on this mission. Briefing and extra practice both count.' : 'Your classmates are working on this mission.'} {city.mission.completed.length}/{city.mission.targets.length} learners finished.</p></section>}
            {player.learningPlan ? <DeliveryPlanCard key={player.learningPlan.problem.id} task={player.learningPlan} busy={busy} act={(kind,answer)=>void actPlan(kind,answer)}/> : briefing ? <Briefing dispatch={dispatch} ready={ready} busy={busy} next={() => { void flush().then(ok => { if (ok) setBriefing(false); }); }}/>
              : <section className="delivery-card dispatch-orders"><h2>{player.submitted ? 'Orders sealed. Watch the city.' : 'Plan your delivery'}</h2><p className="dispatch-next">{player.submitted ? 'Waiting for the other crews. Your pet will drive when everyone is ready.' : ready >= 2 ? 'Check your price, then send your pet.' : 'Pick a stop and solve two questions.'}</p><div className="dispatch-readiness"><span>{ready >= 2 ? 'BRIEFING READY' : `MATH BRIEFING · ${Math.min(2,ready)}/2`}</span></div>{canPlan && ready<2 && <button disabled={busy || blocked} onClick={()=>void beginPlan()}>Plan this route with math →</button>}{ready<2&&<button onClick={() => { void (async () => { setSaving(true); try { if (await flush()) { await refreshLearning(); setBriefing(true); } } finally { setSaving(false); } })(); }} disabled={busy}>{ready >= 2 ? 'Extra math practice / teacher mission' : 'Complete math briefing'}</button>}
                {!player.submitted && <><label className="dispatch-destination">Delivery destination<select aria-label="Delivery destination" value={order.destination} onChange={e => pick(+e.target.value)}>{nodes(city).map((place,i) => <option key={place.name} value={i}>{String(i+1).padStart(2,'0')} · {place.name} · {value(city,i)} {city.rules.market?'coin budget':'base pts'}</option>)}</select></label>

                  {hiring && <p className="delivery-commitment">Your posted job commits this turn to {PLACES[hiring.destination].name}. {hired?`Courier reserved: ${city.players.find(p=>p.id===hiring.courier)?.alias} · fee ${hiring.pay}.`:'Until a courier reserves it, plan to drive it yourself.'}<button disabled={busy} onClick={()=>changeOrder({...order,destination:hiring.destination,subcontract:undefined})}>Plan my posted route</button></p>}
                  {order.subcontract && <p className="delivery-commitment">You are planning a subcontract. Seal to reserve; payment depends on the hiring crew winning and submitting. <button onClick={()=>setOrder(o=>({...o,subcontract:undefined,claim:undefined}))}>Switch to my own customer</button></p>}
                  <div className="delivery-settings">
                    {city.rules.market&&!order.subcontract&&<label>Your sealed customer price<input type="number" min={1} max={value(city,order.destination)} value={order.quote??value(city,order.destination)} onChange={e=>setOrder(o=>({...o,quote:+e.target.value,bid:0}))}/></label>}
                  </div><details className="simple-options"><summary>More options · route, tools & partners</summary><div className="delivery-settings">
                    {city.rules.networks&&<label>Delivery tactic<select value={order.tactic??'standard'} onChange={e=>setOrder(o=>({...o,tactic:e.target.value as Order['tactic']}))}><option value="standard">Standard · keep credits</option><option value="rush">Rush · 2 credits, save up to 2 travel coins</option><option value="invest" disabled={(player.hubs?.length??0)>=3||player.hubs?.includes(order.destination)}>Build outpost · 3 credits + 3 coins; future route bonus +3</option></select></label>}
                    <label>Route<select value={order.route} onChange={e => setOrder(o => ({ ...o, route: e.target.value as Order['route'] }))}><option value="direct">Direct · closures and tolls apply</option><option value="scenic">Scenic · costs 2 points, avoids delays and tolls</option></select></label>
                    {!city.rules.market && city.rules.mode === 'rivals' && <label>Secret contract bid<select value={order.bid} onChange={e => setOrder(o => ({ ...o, bid: +e.target.value }))}>{Array.from({ length: Math.min(3,player.credits) + 1 }, (_, i) => <option key={i} value={i}>{i} credits / points</option>)}</select></label>}
                    {city.rules.deals && <label>Warehouse partner<select value={order.partner} onChange={e => setOrder(o => ({ ...o, partner: e.target.value }))}><option value="">No deal</option>{city.players.filter(p => p.id !== me).map(p => <option key={p.id} value={p.id}>{p.alias}</option>)}</select></label>}
                    <label>Use one teacher perk<select value={order.perk} onChange={e => setOrder(o => ({ ...o, perk: e.target.value as Order['perk'],item:'' }))}><option value="">Save my perks</option>{Object.entries(PERKS).map(([id,p]) => <option key={id} value={id} disabled={!player.perks[id as Perk]}>{p.name} ({player.perks[id as Perk]})</option>)}</select></label></div>
                  {city.rules.deals && <><p>Public offers: {city.players.filter(p => p.offer).map(p => `${p.alias} → ${city.players.find(other => other.id === p.offer)?.alias}`).join(' · ') || 'None yet'}. {city.rules.mode === 'community' ? 'Public promises are binding this round.' : 'Promises can be broken; only matching sealed orders earn the deal bonus.'}</p><button disabled={busy} onClick={() => { if (online) void api.act('offer', { roomId: city.id, round: city.round, target: order.partner }); else try { saveLocal(offerDeal(city, me, order.partner)); } catch (e) { setError((e as Error).message); } }}>Announce warehouse offer</button></>}
                  {ready>=2&&<button onClick={() => { void (async () => { setSaving(true); try { if (await flush()) { await refreshLearning(); setBriefing(true); } } finally { setSaving(false); } })(); }} disabled={busy}>{ready >= 2 ? 'Extra math practice / teacher mission' : 'Complete math briefing'}</button>}<ContractStatus city={city} player={player}/>                  <details className="dispatch-fine-print"><summary>How this turn works</summary><p>{city.rules.market?'Lowest sealed price wins in Corporate Rivals. Ties split customer income; each winning crew still pays its own costs. Community Couriers protects each crew’s job.':'Classic Corporate Rivals uses highest secret bids; tied bids share points.'} Mutual warehouse partners earn +3. One delivery per crew, including a hired courier. Submitted turns restore two tactic credits. Unreserved offers can be withdrawn; reserved deals lock.</p></details></details>
                  <div className="delivery-preview"><b>{canPlan && ready<2 ? 'Predict your' : estimate} estimated {city.rules.market?'profit coins':'points'}</b>{plan&&<span>Income {plan.income} − {hired?`courier fee ${hiring!.pay}`:`travel/route costs ${plan.cost}`} + {hired?0:plan.bonus+plan.contractBonus} bonuses. {city.rules.mode==='rivals'?'A competing price can win instead.':'Protected community job.'}</span>}</div>
                  {order.item&&<p>Equipped: <b>{lootItem(order.item)?.name}</b>. {lootItem(order.item)?.description}</p>}
                  {order.perk&&<p>{PERKS[order.perk].description}</p>}
                  {estimate<0&&<p className="negative-profit">This plan loses money if it succeeds. Raise your price, change equipment, or choose a cheaper route.</p>}

                  {player.challenge?.status==='active'&&<button onClick={()=>setView('items')}>Finish your active wager →</button>}{blocked && <p role="status">Direct route blocked: win the ambush, take a scenic detour, or select a teleport perk.</p>}<button className="delivery-primary" disabled={busy || ready < 2 || blocked || player.challenge?.status==='active'} onClick={() => void send()}>Seal delivery order</button></>}
                {player.submitted && <div className="dispatch-waiting"><ActivePetContext.Provider value={null}><PetSprite speciesId={player.pet?.speciesId ?? 'koala_sprite'} stage={player.pet?.stage ?? 'baby'} animationName="idle" scale={1}/></ActivePetContext.Provider><strong>{player.pet?.name ?? 'Your crew'} is ready to roll.</strong><p>{city.players.filter(p => !p.bot && p.submitted).length}/{city.players.filter(p => !p.bot).length} human crews have sealed orders. Extra practice counts toward teacher missions.</p></div>}
              </section>}

          </>}
        </aside></div></>}
      </>}
      <details className="delivery-card"><summary>Dispatch log & game rules</summary><p>One delivery per crew per round. Plan a supported route with your assigned math, or complete two briefing answers; hints and corrections count. One item or teacher perk per turn. Unsubmitted crews park when the timer ends; their score is not reduced. Campaigns save between visits.</p><ol>{city.log.map((line,i) => <li key={i}>{line}</li>)}</ol></details>
      {city.host === me && city.phase !== 'done' && <details className="delivery-card"><summary>End this city early</summary><p>Current delivery scores become final for every crew.</p><button disabled={busy} onClick={() => online ? void api.act('finish', { roomId: city.id }) : saveLocal({ ...city, phase: 'done', deadline: 0 })}>Finish city with current scores</button></details>}
    </>}
  </div></main>;
}
