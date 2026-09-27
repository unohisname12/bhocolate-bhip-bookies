import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { startPolling } from '../../pilot/polling';
import { pilotAPI } from '../../pilot/api';
import { PartyContext } from './context';
import { PARTY_NAMES, type PartyData, type PartyRoom, type PartyCommand } from './model';
import { RECIPES, road, buildCost, type ArcadeGame, type Tower } from '../arcade/model';
import './party.css';
export function ClassroomParty({ children, practice, flush, blocked, prepare, activity }: { children: ReactNode; activity?: (game: ArcadeGame) => void; practice: () => void; flush: () => Promise<boolean>; blocked: boolean; prepare: () => string | null | Promise<string | null> }) {
  const [data,setData]=useState<PartyData|null>(null),[open,setOpen]=useState(false),[chosen,setChosen]=useState('');
  const [game,setGame]=useState<ArcadeGame>('cafe'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [tower,setTower]=useState<Tower>('rapid');
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement;
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')setOpen(false);
      if(e.key==='Tab'){
        const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],summary')??[]);
        const first=items[0],last=items.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);if(previous instanceof HTMLElement)previous.focus();};
  },[open]);
  const requestLock=useRef(false),generation=useRef(0),mounted=useRef(true);
  const refresh=useCallback(async()=>{
    const ticket=++generation.current;
    try { const next=await pilotAPI<PartyData>('parties');if(mounted.current&&ticket===generation.current){setData(next);setError('');} }
    catch(e){if(mounted.current&&ticket===generation.current)setError(e instanceof Error?e.message:'Your classroom connection was interrupted.');}
  },[]);
  useEffect(()=>{ mounted.current=true;
    const stop=startPolling(async()=>{if(!requestLock.current&&!blocked)await refresh();},open?1000:5000);
    return()=>{mounted.current=false;stop();};
  },[refresh,open,blocked]);
  const show=useCallback(async(mode?:ArcadeGame)=>{const message=await prepare();if(message){setError(message);return;}if(mode)setGame(mode);setOpen(true);},[prepare]);
  const room=data?.rooms.find(r=>r.id===chosen)??data?.rooms.find(r=>r.state.members.some(m=>m.id===data.me&&m.status==='joined')&&['lobby','playing'].includes(r.state.phase));
  const invitations=data?.rooms.filter(r=>r.state.phase==='lobby'&&r.state.members.some(m=>m.id===data.me&&m.status==='invited'))??[];
  async function act(operation:string,body:Record<string,unknown>={},target=room?.id){
    if(requestLock.current||blocked)return;
    requestLock.current=true;generation.current++;setBusy(true);setError('');
    try{
      if(operation==='create'&&!await flush())throw new Error('Wait for Saved online, then create your room.');
      const result=await pilotAPI<{id:string;state: PartyRoom['state']}>(`parties/${operation}`,'POST',{...body,roomId:target,requestId:crypto.randomUUID()});
      if (operation === 'move' && room?.state.phase === 'playing' && result.state && ['lane','build','serve','wave'].includes(String(body.kind)) && JSON.stringify(result.state) !== JSON.stringify(room.state)) activity?.(room.state.game);
      if(operation==='leave'||operation==='respond'&&body.accept===false)setChosen('');else setChosen(result.id);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Your move did not connect. Refresh before trying again.');}
    finally{requestLock.current=false;setBusy(false);}
  }
  const move=(cmd:PartyCommand)=>{void act('move',cmd);};
  const s=room?.state,me=s?.members.find(m=>m.id===data?.me),joined=s?.members.filter(m=>m.status==='joined')??[];
  const disabled=busy||blocked||!!error;
  const run=s?.run;
  useEffect(()=>{if(open)panel.current?.parentElement?.scrollTo(0,0);},[open,s?.phase,room?.id]);
  return <PartyContext.Provider value={show}>
    <div className="party-banner">{!open&&error&&<span role="status">{error}</span>}<button onClick={()=>show()} disabled={blocked}>🤝 Play with classmates {invitations.length>0?`· ${invitations.length} invitation${invitations.length===1?'':'s'}`:s?.phase==='playing'?'· Your game is live':''}</button><span>Co-op café · Team defense · Classmate racing</span></div>
    <div inert={open}>{children}</div>
    {open&&<div className="party-overlay" role="dialog" aria-modal="true" aria-label="Play with classmates"><section ref={panel} className="party-panel"><header><div><p>YOUR CLASSROOM • YOUR CREW</p><h1>{s?PARTY_NAMES[s.game]:'Better together.'}</h1></div><button autoFocus onClick={()=>setOpen(false)}>Close</button></header>
      {error&&<div role="alert" className="party-error">{error}<button onClick={()=>{void refresh();}}>Reconnect / refresh</button><p>Wait for the latest room before making another move.</p></div>}
      {!data&&!error&&<p role="status">Finding your classroom…</p>}
      {invitations.length>0&&<section aria-label="Game invitations"><h2>You’re invited!</h2>{invitations.map(r=><article className="party-invite" key={r.id}><strong>{r.state.members.find(m=>m.id===r.state.host)?.alias} invited you to {PARTY_NAMES[r.state.game]}</strong><div><button disabled={disabled} onClick={()=>{void act('respond',{accept:true},r.id);}}>Join {PARTY_NAMES[r.state.game]}</button><button disabled={disabled} onClick={()=>{void act('respond',{accept:false},r.id);}}>No thanks</button></div></article>)}</section>}
      {!s&&<><p>Invite up to three classmates. Everyone does a short practice at their own level, then you play together. Eggs are welcome.</p><div className="party-modes">{(['cafe','guard','dash']as const).map(g=><button key={g} aria-pressed={game===g} onClick={()=>setGame(g)}><span>{g==='cafe'?'🍓':g==='guard'?'🏰':'🏁'}</span><strong>{PARTY_NAMES[g]}</strong><small>{g==='cafe'?'Co-op: share a café, supplies and orders.':g==='guard'?'Co-op: build defenses and protect one nest.':'Competitive: same track, live scores, your own cart.'}</small></button>)}</div><button className="party-primary" disabled={disabled||!data} onClick={()=>{void act('create',{game});}}>Host {PARTY_NAMES[game]}</button>{data?.rooms.filter(r=>r.state.phase==='done'&&r.state.members.some(m=>m.id===data.me&&m.status==='joined')).map(r=><button key={r.id} onClick={()=>setChosen(r.id)}>View results · {PARTY_NAMES[r.state.game]}</button>)}</>}
      {s&&me?.status==='joined'&&<>
        <div className="party-members" aria-label="Room members">{s.members.filter(m=>['joined','invited'].includes(m.status)).map(m=><div key={m.id}><strong>{m.alias}{m.id===data?.me?' (you)':''}{m.id===s.host?' · Host':''}</strong><span>{m.status==='invited'?'Invited':s.phase==='lobby'?m.practice>=m.target?'✓ Ready':`Practice ${Math.min(m.practice,m.target)}/${m.target}`:(data?.serverNow??0)-m.lastSeen>15000?'Away · can rejoin':'In the room'}</span></div>)}</div>
        {s.phase==='lobby'&&<><section className="party-warmup"><h2>Get the crew ready</h2><p>Everyone earns their place with {me.target} new correct answers at their teacher-assigned level. Hints and corrections count. Waiting does not cost a play charge.</p><button disabled={busy||blocked} onClick={()=>{setOpen(false);practice();}}>Practice for this room · {Math.max(0,me.target-me.practice)} left</button><p>Use “Play with classmates” to return. Saved answers update readiness automatically.</p></section>{s.host===data?.me&&<><h2>Invite your classmates</h2><div className="party-roster">{data?.classmates.map(c=>{const found=s.members.find(m=>m.id===c.id);return <button key={c.id} disabled={disabled||!!found||s.members.filter(m=>['joined','invited'].includes(m.status)).length>=4} onClick={()=>{void act('invite',{studentId:c.id});}}>Invite {c.alias}{found?` · ${found.status}`:''}</button>;})}</div>{data?.classmates.length===0&&<p>Your teacher needs to add another learner before you can invite someone.</p>}<button className="party-primary" disabled={disabled||joined.length<2||joined.some(m=>m.practice<m.target)} onClick={()=>{void act('start');}}>Start together</button></>}{s.host!==data?.me&&<p>The host starts when at least two players have finished their practice.</p>}</>}
        {s.phase==='playing'&&run&&<>
          {s.game==='cafe'&&<><p>Shared café, separate trays. Serve different customers together; if a teammate finishes your order, your tray clears for the new order.</p><h2>Team score {run.score} · Orders {run.step}/9</h2><div className="party-orders">{run.orders.map((recipe,i)=><button key={i} disabled={disabled} aria-pressed={me.station.selected===i} onClick={()=>move({kind:'order',order:i})}><span>{['🐰','🦊','🐻'][i]}</span><strong>{RECIPES[recipe].name}</strong><small>{RECIPES[recipe].parts.map(p=>['🍓','🍞','🍯'][p]).join(' + ')}</small></button>)}</div><h3>Your tray</h3><div className="party-tray">{me.station.tray.map((p,i)=><span key={i}>{['🍓','🍞','🍯'][p]}</span>)}{me.station.tray.length===0&&'Pick ingredients for your selected customer.'}</div><div className="party-ingredients">{['Berries','Bread','Honey'].map((name,i)=><div key={name}><button disabled={disabled||me.station.tray.length>=RECIPES[run.orders[me.station.selected]].parts.length} onClick={()=>move({kind:'ingredient',ingredient:i})}>{name} ({run.stock[i]})</button><button disabled={disabled} onClick={()=>move({kind:'restock',ingredient:i})}>Restock {name} +4</button></div>)}</div><button className="party-primary" disabled={disabled||me.station.tray.length!==RECIPES[run.orders[me.station.selected]].parts.length} onClick={()=>move({kind:'serve'})}>Serve with the crew</button><button disabled={disabled} onClick={()=>move({kind:'clear'})}>Clear my tray</button><p role="status">{run.message}</p></>}
          {s.game==='guard'&&<><h2>Team score {run.score} · Nest ♥ {run.health} · Energy {run.energy}</h2><p>Share three plots and one energy pool. Agree through your choices: build, upgrade, then start the wave together. Waves 3 and 5 resist rapid fire.</p><div className="party-path">{run.enemies.map(e=><span key={e.id} style={{left:`${e.position/11*86}%`}}>🐛</span>)}<b>🥚</b></div><div className="party-roster">{(['rapid','frost','shield']as const).map(t=><button key={t} aria-pressed={tower===t} onClick={()=>setTower(t)}>{t}</button>)}</div><div className="party-orders">{run.towers.map((t,i)=><button key={i} disabled={disabled||!!s.waveAt||run.energy<buildCost(run,i,tower)||(t===tower&&(run.towerLevels?.[i]??1)>=3)} onClick={()=>move({kind:'build',slot:i,tower})}>Plot {i+1}<strong>{t??'Empty'} {t?`L${run.towerLevels?.[i]??1}`:''}</strong><small>{t===tower?'Upgrade':'Build'} · {buildCost(run,i,tower)} energy</small></button>)}</div><button className="party-primary" disabled={disabled||!!s.waveAt||!run.towers.some(Boolean)} onClick={()=>move({kind:'wave'})}>{s.waveAt?'Defending together…':`Start wave ${Math.floor(run.step/16)+1}`}</button><p role="status">{run.message}</p></>}
          {s.game==='dash'&&me.racer&&<Race room={room!} me={data!.me} disabled={disabled} move={move}/>}
        </>}
        {s.phase==='done'&&<section className="party-results"><h2>{s.game==='dash'?'Rally results':s.run.health>0?'You did it together!':'Good effort, crew. Try another build!'}</h2>{s.game==='dash'?<ol>{[...joined].sort((a,b)=>(b.racer?.score??0)-(a.racer?.score??0)).map(m=><li key={m.id}>{m.alias} · {m.racer?.score??0} points · road {m.racer?.step??0}/60</li>)}</ol>:<p>Team score: {run?.score} · {s.game==='cafe'?`${run?.step} customers served`:'Five-wave defense'}</p>}<p>Every teammate helped. Play another mode with the same crew.</p>{s.host===data?.me && <div className="party-roster">{(['cafe','guard','dash'] as const).map(g=><button key={g} disabled={disabled} onClick={()=>{void act('rematch',{game:g});}}>Next: {PARTY_NAMES[g]}</button>)}</div>}</section>}
        {s.phase==='closed'&&<p>This room has closed. Choose a new game with your class.</p>}
        <details className="party-events" open><summary>What your crew is doing</summary><ol>{s.events.map((event,i)=><li key={i}>{event}</li>)}</ol></details>
        <button disabled={busy||blocked} onClick={()=>{void act('leave');}}>Leave room</button><p className="party-small">Rooms last 30 minutes. You can close this panel and reopen it to rejoin. Only invited members of your classroom can enter.</p>
      </>}
    </section></div>}
  </PartyContext.Provider>;
}
function Race({room,me,disabled,move}:{room:PartyRoom;me:string;disabled:boolean;move:(c:PartyCommand)=>void}){
  const racers=room.state.members.filter(m=>m.status==='joined'),r=racers.find(m=>m.id===me)!.racer!;
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!disabled&&!r.done&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move({kind:'lane',lane:Math.max(0,Math.min(2,r.lane+(e.key==='ArrowLeft'?-1:1)))});}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[disabled,r.done,r.lane,move]);
  return <><h2>Starlight Rally · Score {r.score} · ♥ {r.health}</h2><p>Same track, separate carts. Collect stars, dodge rocks. Highest score wins; equal scores tie. Bottom row is next. The race keeps moving while you close the panel.</p><div className="party-racers">{racers.map(m=><div key={m.id}><strong>{m.alias}: {m.racer?.score??0} pts</strong><progress max={60} value={m.racer?.step??0}/></div>)}</div>{r.done?<p>You finished! Watch your classmates finish their runs.</p>:<div className="party-road">{[3,2,1,0].map(offset=>{const row=road(r.seed,r.step+offset);return <div key={offset}>{[0,1,2].map(l=><span key={l}>{row.rock===l?'🪨':row.coin===l?'✦':'·'}</span>)}</div>})}<div>{[0,1,2].map(l=><button key={l} aria-label={`Race lane ${l+1}`} aria-pressed={r.lane===l} disabled={disabled} onClick={()=>move({kind:'lane',lane:l})}>{r.lane===l?'🥚🛒':'↑'}</button>)}</div></div>}</>;
}
