import {LivingHouse} from '../living-house/LivingHouse';
import { HouseDoors } from './HouseDoors';
import { HouseTravel, type HouseJourney } from './HouseTravel';
import { floorName, houseRoute, householdWish, roomName } from './house';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CareGameOverlay } from '../../components/care-games/CareGameOverlay';
import { canInteract } from '../../engine/systems/InteractionSystem';
import type { HandMode } from '../../types/interaction';
import { FeedingScreen } from '../../screens/FeedingScreen';
import { FOOD_ITEMS } from '../../config/gameConfig';
import { ADVENTURE_FURNITURE, nextAdventureGoal } from '../first-adventure/model';
import '../first-adventure/first-adventure.css';
import { useRoomMetrics } from './useRoomMetrics';
import { BookProp } from './BookProp';
import { HomeOverview } from './HomeOverview';
import { MindInspector } from '../pet-mind/MindInspector';
import { isDevModeEnabled } from '../../utils/featureFlags';
import { placementStyle, placementClass, residentDepth } from './roomPresentation';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { PetSprite } from '../../components/pet/PetSprite';
import { FURNITURE, HOME_ROOMS, WALLS, FLOORS, FINISHES, furniture, roomSize, finishFilter, type HomeFurniture, type HomeRoomId } from './catalog';
import { createHomeBase, upgradeHouse, ownsFurniture, canPlace, homeComfort, type HomeRoom, type HomePlacement } from './model';
import { HomeRoomView, FurnitureArt } from './HomeRoomView';
import { useRoomLife } from './useRoomLife';
import './home-base.css';
type Dispatch = (action: GameEngineAction) => void;
const categories = ['all', 'comfort', 'tables', 'nature', 'lights', 'wall', 'treasures'] as const;
const instructions = 'Choose furniture, then tap a floor tile to place it. Drag placed furniture to move it. Select an item and use arrow keys for small moves.';

function RoomCanvas({ room, state, dispatch, editing, pending, selected, select, placed, message, journey, departed, feed, care, doors }: { room: HomeRoom; state: EngineState; dispatch: Dispatch; editing: boolean; pending: string | null; selected: string | null; select: (id: string | null) => void; placed: () => void; message: (text: string) => void; journey: HouseJourney | null; departed: () => void; feed: () => void; care: (mode: 'wash'|'brush'|'comfort') => void; doors: React.ReactNode }) {
  const floor = useRef<HTMLDivElement>(null), drag = useRef<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);
  const { cols, rows } = roomSize(room.tier);
  const metrics=useRoomMetrics(floor,cols,rows);
  const learner=useMemo(()=>({skillReviews:state.skillReviews,matchHistory:state.matchHistory}),[state.skillReviews,state.matchHistory]);
  const life = useRoomLife(room, editing, state.pet ?? undefined, dispatch, state.homeBase?.activeRoom ?? 'den',metrics.timing,learner,!!state.homeBase?.lastDoor), { pet } = life;
  const departure=useRef(0);
  useEffect(()=>{
    if(journey?.phase==='depart'&&departure.current!==journey.id){departure.current=journey.id;life.leave(departed);}
    if(!journey&&departure.current){departure.current=0;life.cancelLeave();}
  },[journey,life,departed]);
  const helping=!!life.work,workItem=room.items.find(p=>p.id===life.work?.id);
  const workDefinition=workItem&&furniture(workItem.furnitureId);
  const anchor=editing?life.work?.phase==='push'&&workItem&&workDefinition?{x:pet.x+Math.sign(workItem.x+(workDefinition.width-1)/2-pet.x)*.3,y:pet.y+Math.sign(workItem.y+(workDefinition.height-1)/2-pet.y)*.3}:pet:life.anchor;
  const delivering=workItem && (life.work?.phase==='approach'||life.work?.phase==='carry');
  const shelf=room.items.find(p=>p.id===pet.book?.shelfId),shelfArt=shelf&&furniture(shelf.furnitureId);
  const bookAtShelf=pet.book?.phase!=='read';
  const bookSpot=bookAtShelf&&shelf&&shelfArt?{x:shelf.x+(shelfArt.width-1)/2,y:shelf.y-.25}:{x:anchor.x+.12,y:anchor.y-.05};
  const target = (event: PointerEvent) => {
    const rect = floor.current!.getBoundingClientRect();
    return { x: Math.floor((event.clientX - rect.left) / rect.width * cols), y: Math.floor((event.clientY - rect.top) / rect.height * rows) };
  };
  const placeAt = (x: number, y: number) => {
    if (!editing) { life.move({ x, y }); return; }
    const existing = room.items.find(i => i.id === selected), id = pending ?? existing?.furnitureId;
    if (!id) { select(null); message('Pick something from your collection to start building.'); return; }
    if (!canPlace(room, id, x, y, pending ? undefined : selected ?? undefined)) { message(furniture(id)?.layer === 'wall' && y !== 0 ? 'Wall decorations go along the back wall—the top row of tiles.' : 'That spot is occupied or too close to the edge. Try another tile.'); return; }
    if (pending) {
      if (room.items.length >= 60 || room.items.filter(i => i.furnitureId === id).length >= 8) { message('This room holds 60 items, with up to 8 of each piece. Store something or use another room.'); return; }
      dispatch({ type: 'HOME_PLACE', furnitureId: id, x, y }); placed();
    } else if (selected) dispatch({ type: 'HOME_MOVE', id: selected, x, y });
    message(`${furniture(id)!.name} placed. Your layout saves with your game.`);
  };
  const interactWithItem = (p: HomePlacement, item: HomeFurniture) => {
    if (editing) { select(p.id); return; }
    const interaction = item.interaction;
    if (interaction === 'feed') { feed(); return; }
    if (interaction === 'wash' || interaction === 'brush') { care(interaction); return; }
    if (interaction === 'light') { dispatch({ type: 'HOME_TOGGLE', id: p.id }); message(p.on ? 'A little softer. A little quieter.' : 'A warm welcome home.'); return; }
    life.interact(p);
  };
  const renderItem = (p: HomePlacement) => {
    const item = furniture(p.furnitureId); if (!item) return null;
    const preview = ghost?.id === p.id ? ghost : p;
    return <button key={p.id} type="button" aria-label={`${item.name}, placed at ${p.x + 1}, ${p.y + 1}`} aria-pressed={selected === p.id} data-pet-work={life.work?.id===p.id?life.work.phase:undefined} className={`${placementClass(p)} ${selected === p.id ? 'is-selected' : ''}`} style={placementStyle(room, { ...p, ...preview })}
      onPointerDown={event => { if (!editing) return; select(p.id); event.currentTarget.setPointerCapture(event.pointerId); const at = target(event); drag.current = { id: p.id, startX: event.clientX, startY: event.clientY, offsetX: at.x - p.x, offsetY: at.y - p.y, moved: false }; }}
      onPointerMove={event => { if (drag.current?.id !== p.id) return; if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) < 6 && !drag.current.moved) return; drag.current.moved = true; const at = target(event); setGhost({ id: p.id, x: at.x - drag.current.offsetX, y: at.y - drag.current.offsetY }); }}
      onPointerUp={event => { const current = drag.current; if (current?.id !== p.id) { interactWithItem(p, item); return; } drag.current = null; setGhost(null); if (current.moved) { const at = target(event), pos = { x: at.x - current.offsetX, y: at.y - current.offsetY }; if (canPlace(room, p.furnitureId, pos.x, pos.y, p.id)) { dispatch({ type: 'HOME_MOVE', id: p.id, ...pos }); message(`${item.name} moved.`); } else message('That spot does not fit. Your furniture stayed where it was.'); } else interactWithItem(p, item); }}
      onPointerCancel={() => { drag.current = null; setGhost(null); }}
      onClick={event => { if (event.detail === 0) interactWithItem(p, item); }}
      onKeyDown={event => { if (!editing || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(event.key)) return; event.preventDefault(); if (event.key === 'Delete' || event.key === 'Backspace') { dispatch({ type: 'HOME_STORE', id: p.id }); select(null); return; } const x = p.x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0), y = p.y + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0); if (canPlace(room, p.furnitureId, x, y, p.id)) dispatch({ type: 'HOME_MOVE', id: p.id, x, y }); else message('That spot is occupied or outside the room.'); }}>
      <FurnitureArt placement={p}/>{life.work?.id===p.id && delivering && <span className="hb-delivery-target">Delivery here</span>}{editing && selected === p.id && <span className="hb-item-label">{item.name}</span>}
    </button>;
  };
  return <><HomeRoomView room={room} editing={editing} floorRef={floor}>
      <div className="hb-tile-grid">{Array.from({ length: rows * cols }, (_, i) => <button type="button" key={i} className="hb-tile" aria-label={`Floor tile ${i % cols + 1}, ${Math.floor(i / cols) + 1}`} onClick={() => placeAt(i % cols, Math.floor(i / cols))}/>)}</div>
      {room.items.map(renderItem)}
      {delivering && workDefinition && <div className="hb-furniture-delivery" data-delivery-id={workItem.id} data-delivery-x={pet.x} data-delivery-y={pet.y} aria-label={`Pet carrying ${workDefinition.name}`} style={{left:`${(pet.x+.65)/cols*100}%`,top:`${(pet.y+.3)/rows*100}%`,transitionDuration:`${life.motion.duration}ms`,width:`${65/cols}%`,height:`${90/rows}%`,zIndex:residentDepth(pet.y)+1}}><img src={workDefinition.art} alt="" style={{filter:finishFilter(workItem.finish),transform:workItem.flipped?'scaleX(-1)':undefined}}/><span aria-hidden="true">▰</span></div>}
      {!editing && pet.book && shelf && <div className="hb-room-book" style={{left:`${(bookSpot.x+.5)/cols*100}%`,top:`${(bookSpot.y+.5)/rows*100}%`,zIndex:residentDepth(pet.y)+1}}><BookProp phase={pet.book.phase}/></div>}
      {!editing && pet.ball && <span className="hb-fetch-ball" aria-label="Fetch ball" style={{ left: `${(pet.ball.x + .5) / cols * 100}%`, top: `${(pet.ball.y + .5) / rows * 100}%` }}>●</span>}
      {state.pet && <div className={`hb-resident ${(!editing || helping) && (pet.path.length || life.motion.moving) ? 'is-walking' : ''} ${helping ? 'is-helping' : ''} ${life.work?.phase==='push'?'is-pushing':''} ${!editing && pet.activity === 'Dance party' ? 'is-dancing' : ''}`} data-edge={anchor.x<1?'left':anchor.x>cols-2?'right':undefined} data-facing={life.motion.facingLeft?'left':'right'} data-pose={editing?'standing':life.anchor.pose} data-work-phase={life.work?.phase} data-activity={pet.activity} data-x={pet.x} data-y={pet.y} style={{ '--step':`${life.motion.duration}ms`, left: `${(anchor.x + .5) / cols * 100}%`, top: `${(anchor.y + .5) / rows * 100}%`, zIndex: life.anchor.pose!=='standing'&&!editing&&pet.objectId ? Number(placementStyle(room,room.items.find(p=>p.id===pet.objectId)!).zIndex)+1 : residentDepth(pet.y) } as React.CSSProperties}><span className="hb-ground-shadow" aria-hidden="true"/><div className="hb-pet-bubble">{pet.bubble}</div><button className="hb-pet-touch" disabled={editing} aria-label={`Cuddle ${state.pet.name || 'your pet'}`} onClick={() => life.together('cuddle')}><PetSprite speciesId={state.pet.speciesId} stage={state.pet.stage} className={`hb-pose-${editing?'standing':life.anchor.pose} ${life.motion.facingLeft?'hb-facing-left':''}`} animationName={editing && !helping ? 'idle' : (pet.path.length || life.motion.moving) ? 'walking' : !editing && life.anchor.pose==='sitting'?'idle':pet.animation} paused={editing && !helping} petX={pet.x * 16} scale={metrics.scale} equippedCosmetics={state.cosmetics.equipped[state.pet.id]}/>{(!editing || helping) && pet.hearts && !pet.path.length && <span className="hb-hearts" aria-hidden="true">♡ ✦ ♡</span>}</button></div>}

  </HomeRoomView>
    {doors}
    {editing && <p className="hb-helper-status" role="status">{helping ? `🐾 ${pet.activity} · ${pet.bubble}` : "Choose the layout. Your pet will lend a paw when you place or move a piece."}</p>}
    {!editing && state.pet && <section className="hb-together" aria-label="Time together">
      <div className="hb-together-heading"><div><span className="hb-eyebrow">TIME TOGETHER</span><h3>{state.pet.name || 'Your pet'}’s little world</h3></div><span className="hb-activity" role="status">{pet.path.length ? '🐾 ' : '✿ '}{pet.activity}</span></div>
      <div className="hb-play-actions">{([['cuddle','♡','Cuddle','A little love'],['talk','☏','Chat','Say hello'],['dance','♫','Dance','Wiggle together'],['fetch','●','Play fetch','Throw a ball'],['call','⌁','Come here','Call your pet']] as const).map(([id,icon,name,hint]) => <button key={id} aria-pressed={id==='fetch' ? life.throwing : undefined} onClick={() => life.together(id)}><span>{icon}</span><strong>{name}</strong><small>{hint}</small></button>)}</div>
      {pet.activity === 'Having a chat' && <div className="hb-chat-replies" role="group" aria-label="Reply to your pet"><span>What should we add to our home?</span><button onClick={() => life.reply('plants')}>More plants</button><button onClick={() => life.reply('books')}>A reading nook</button><button onClick={() => life.reply('toys')}>A play room</button></div>}
      <div className="hb-life-footer"><p>{life.throwing ? 'Tap an open floor tile to throw the ball. Your pet brings it back!' : 'Tap your pet for a cuddle, or choose furniture to do something together.'}</p><button aria-pressed={life.roaming} onClick={() => life.setRoaming(!life.roaming)}>{life.roaming ? 'Pause wandering' : 'Let pet wander'}</button></div>
      {pet.memories.length > 0 && <p className="hb-moment" aria-live="polite">♡ {pet.memories[0]}</p>}
    {isDevModeEnabled() && <MindInspector pet={state.pet} decision={life.decision}/>}
    </section>}
  </>;
}

export function DecoratingHomeScreen({ state, dispatch }: { state: EngineState; dispatch: Dispatch }) {
  const base = upgradeHouse(state.homeBase ?? createHomeBase(state)), room = base.rooms[base.activeRoom]!;
  const reduced=useReducedMotion(),roomSection=useRef<HTMLElement>(null),travelId=useRef(0);
  const [showHouse,setShowHouse]=useState(()=>!window.matchMedia('(max-width:650px)').matches);
  const [journey,setJourney]=useState<HouseJourney|null>(null);
  const departed=useCallback(()=>setJourney(j=>j?{...j,phase:'cross'}:null),[setJourney]);
  useEffect(()=>{
    if(journey&&(journey.petId!==state.pet?.id||journey.from!==base.activeRoom)){
      const timer=setTimeout(()=>setJourney(null),0);return ()=>clearTimeout(timer);
    }
  },[journey,state.pet?.id,base.activeRoom]);
  const [wide,setWide]=useState(false);
  const [feeding, setFeeding] = useState(false);
  const [editing, setEditing] = useState(false), [tab, setTab] = useState<'furniture' | 'surfaces' | 'rooms'>('furniture');
  const [category, setCategory] = useState<string>('all'), [query, setQuery] = useState(''), [pending, setPending] = useState<string | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('Welcome home. Your pet explores on its own. Tap furniture or spend a little time together.'), [ownedOnly, setOwnedOnly] = useState(false);
  const [collection, setCollection] = useState('all'), [limit, setLimit] = useState(36);
  const collections = [...new Set(FURNITURE.map(f => f.set))];
  const chosen = room.items.find(i => i.id === selected), definition = chosen && furniture(chosen.furnitureId), size = roomSize(room.tier), comfort = homeComfort(room);
  const visible = FURNITURE.filter(f => (category === 'all' || category === f.category) && (collection === 'all' || collection === f.set) && `${f.name} ${f.set}`.toLowerCase().includes(query.toLowerCase()) && (!ownedOnly || ownsFurniture(state, f.id)));
  const select = (id: string | null) => { setSelected(id); setPending(null); };
  const pick = (f: HomeFurniture) => { if (!editing) setEditing(true); setPending(f.id); setSelected(null); setMessage(`Place ${f.name.toLowerCase()}: ${f.layer === 'wall' ? 'choose the back row along the wall' : 'tap a floor tile'}.`); };
  const visit=(id:HomeRoomId)=>{
    if(journey||state.interaction.careGameActive)return;
    const route=houseRoute(base,id);
    if(route.length<2){roomSection.current?.scrollIntoView({behavior:'auto',block:'start'});return;}
    select(null);setFeeding(false);
    if(editing){dispatch({type:'HOME_TRAVEL',from:base.activeRoom,roomId:id});return;}
    setJourney({petId:state.pet?.id,id:++travelId.current,from:base.activeRoom,to:id,route,phase:reduced||!state.pet||['sleeping','dead'].includes(state.pet.state)?'cross':'depart'});
  };
  const arrive=()=>{
    if(!journey)return;
    if(journey.from!==base.activeRoom||journey.petId!==state.pet?.id){setJourney(null);return;}
    dispatch({type:'HOME_TRAVEL',from:journey.from,roomId:journey.to});
    setMessage(`Welcome to ${roomName(journey.to)}. Your pet came with you.`);
    setJourney(null);setShowHouse(false);
    requestAnimationFrame(()=>roomSection.current?.focus({preventScroll:true}));
    roomSection.current?.scrollIntoView({behavior:'auto',block:'start'});
  };
  const yard=()=>{dispatch({type:'CHANGE_ROOM',roomId:'outside'});dispatch({type:'SET_SCREEN',screen:'home'});};
  const care=(mode:'wash'|'brush'|'comfort')=>{
    if(!state.pet)return;
    const allowed=canInteract(state.pet,mode,state.interaction,state.player.currencies.tokens);
    if(!allowed.allowed){setMessage(allowed.reason??'Let’s try a different care activity.');return;}
    dispatch({type:'START_PET_INTERACTION',mode});
  };
  const washReady=state.pet?canInteract(state.pet,'wash',state.interaction,state.player.currencies.tokens):{allowed:false,reason:'Hatch your pet first'};
  const brushReady=state.pet?canInteract(state.pet,'brush',state.interaction,state.player.currencies.tokens):{allowed:false,reason:'Hatch your pet first'};
  const wish=householdWish(state.pet,base);
  const styles = new Set(room.items.map(i => furniture(i.furnitureId)?.set));
  return <main className={`home-base ${editing ? 'hb-edit-mode' : 'hb-live-mode'} ${wide?'hb-wide-view':''}`}  aria-label="Home Base" data-placing={!!pending}>
    <div inert={!!journey||state.interaction.careGameActive}>
    <header className="hb-header"><button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} className="hb-back">← Back to pet</button><div className="hb-title"><span>YOUR WOODLAND COTTAGE</span><h1>Home, sweet home<span className="hb-title-leaf">✿</span></h1></div><div className="hb-wallet"><span>● {state.player.currencies.tokens} tokens</span></div></header>
    {state.firstAdventure && state.firstAdventure.phase !== 'complete' && <section className="adventure-home-goal" aria-label="Adventure goal"><p>{nextAdventureGoal(state)}{state.firstAdventure.phase === 'bond' ? ' · Choose Live here, then cuddle, chat, dance, or fetch.' : ''}</p>{state.firstAdventure.phase === 'place' ? <button className="adventure-primary" onClick={() => pick(furniture(ADVENTURE_FURNITURE)!)}>Place my Adventure Shelf</button> : <button className="adventure-secondary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'first_adventure' })}>View adventure</button>}</section>}
    <div className="house-toolbar"><p><strong>{floorName(base.activeRoom)}</strong> / {roomName(base.activeRoom)}</p><button aria-pressed={showHouse} onClick={()=>setShowHouse(!showHouse)}>{showHouse?'Close house map':'See my whole house'}</button><button onClick={()=>{setShowHouse(false);roomSection.current?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});setMessage(`${state.pet?.name??'Your pet'} is here in ${roomName(base.activeRoom)}.`);}}>Find my pet</button></div>
    {showHouse&&<HomeOverview home={base} state={state} dispatch={dispatch} visit={visit}/>}
    <div className="hb-view-controls"><button aria-pressed={wide} onClick={()=>setWide(!wide)}>{wide?'Show design panels':'Bigger room view'}</button></div>
    <div className="hb-workspace"><section className="hb-living-space" ref={roomSection} tabIndex={-1}>
      <div className="hb-room-heading"><div><h2>{HOME_ROOMS.find(r => r.id === base.activeRoom)!.name}</h2><p>{size.cols} × {size.rows} room · {room.items.length} pieces · {styles.size} collections</p></div><div className="hb-mode"><button aria-pressed={editing} onClick={() => { setEditing(true); setMessage(instructions); }}>✎ Build</button><button aria-pressed={!editing} onClick={() => { setEditing(false); select(null); setMessage('Welcome home. Tap a cushion to nap, a bookcase to read, or a lamp to turn it on. Tap the floor to move your pet.'); }}>♡ Live here</button></div></div>
      {!editing&&<div className="house-room-actions" aria-label="Things to do in this room">
        {base.activeRoom==='kitchen'?<><p>Something tasty at the counter. A little time together.</p><button onClick={()=>setFeeding(true)}>Prepare a snack</button><button onClick={()=>dispatch({type:'FREE_SCHOOL_CARE',task:'feed'})}>Free snack</button></>:
        base.activeRoom==='bathroom'?<><p>Use your care tools, or choose Free clean any time.</p><button disabled={!washReady.allowed} title={washReady.reason} onClick={()=>care('wash')}>{washReady.allowed?'Wash my pet':washReady.reason}</button><button disabled={!brushReady.allowed} title={brushReady.reason} onClick={()=>care('brush')}>{brushReady.allowed?'Brush my pet':brushReady.reason}</button><button onClick={()=>dispatch({type:'FREE_SCHOOL_CARE',task:'clean'})}>Free clean</button></>:
        ['bedroom','landing'].includes(base.activeRoom)?<><p>A quiet corner to rest and recharge.</p><button onClick={()=>dispatch({type:'FREE_SCHOOL_CARE',task:'rest'})}>Rest & recover</button><button onClick={()=>care('comfort')}>A cozy comfort break</button></>:
        <p>{base.activeRoom==='garden'?'Tap a plant to tend your little indoor garden.':base.activeRoom==='studio'?'Tap a bookshelf to settle down with a story.':'Tap furniture, chat, or play fetch together.'}</p>}
      </div>}
      <RoomCanvas key={base.activeRoom} room={room} state={state} dispatch={dispatch} editing={editing} pending={pending} selected={selected} select={select} placed={() => { setPending(null); setSelected(null); }} message={setMessage} journey={journey} departed={departed} feed={()=>setFeeding(true)} care={care} doors={<HouseDoors home={base} visit={visit} yard={yard}/>}/>
      <div className="hb-room-tools">{!editing && state.pet && <button onClick={() => setFeeding(true)}>♡ Feed my pet</button>}{editing && <button disabled={!base.undo} onClick={() => { dispatch({ type: 'HOME_UNDO' }); select(null); setMessage('Your last layout change was undone.'); }}>↶ Undo</button>}<button aria-pressed={!!room.night} onClick={() => dispatch({ type: 'HOME_AMBIENCE', night: !room.night })}>{room.night ? '☀ Daylight' : '☾ Evening'}</button>{room.tier<2 && <button disabled={state.player.currencies.tokens<(room.tier===0?40:80)} onClick={()=>dispatch({type:'HOME_EXPAND'})}>Expand this room · {room.tier===0?40:80} tokens</button>}<span className="hb-autosave">Layouts save with your pet</span></div>
      <div className="hb-guidance" role="status">{message}</div>
      {editing && chosen && definition && <section className="hb-selected" aria-label="Selected furniture"><img src={definition.art} alt=""/><div><strong>{definition.name}</strong><small>Drag to move · Arrow keys to nudge</small></div><button onClick={() => dispatch({ type: 'HOME_TURN', id: chosen.id })}>Turn</button><button onClick={() => pick(definition)}>Another one</button><button onClick={() => { dispatch({ type: 'HOME_STORE', id: chosen.id }); select(null); setMessage('Put away safely. You can place it again any time.'); }}>Put away</button><div className="hb-finish-picker" role="group" aria-label="Furniture color"><strong>Color finish</strong>{FINISHES.map(f => <button key={f.id} title={f.name} aria-label={`${f.name} finish`} aria-pressed={(chosen.finish ?? 'original') === f.id} style={{ background: f.color }} onClick={() => dispatch({ type: 'HOME_FINISH', id: chosen.id, finish: f.id })}>{(chosen.finish ?? 'original') === f.id ? '✓' : ''}</button>)}</div><div className="hb-nudge" role="group" aria-label="Move selected furniture">{([['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]] as const).map(([label,dx,dy]) => <button key={label} aria-label={`Move ${label}`} disabled={!canPlace(room,chosen.furnitureId,chosen.x+dx,chosen.y+dy,chosen.id)} onClick={() => dispatch({ type: 'HOME_MOVE', id: chosen.id, x: chosen.x+dx, y: chosen.y+dy })}>{label}</button>)}<span>Tile {chosen.x+1}, {chosen.y+1}</span></div></section>}
      {pending && <button className="hb-cancel-placement" onClick={() => { setPending(null); setMessage(instructions); }}>Cancel placing {furniture(pending)?.name}</button>}
      <section className="hb-comfort"><span>✿</span><div><strong>{comfort >= 80 ? 'A home full of personality' : comfort >= 50 ? 'Getting wonderfully cozy' : 'A lovely little beginning'}</strong><p>Add different kinds of furniture to make the space your own.</p></div><div><b>{comfort}/100</b><progress aria-label="Room coziness" max={100} value={comfort}/></div></section>
    </section>
    {!editing && <aside className="hb-home-guide" aria-label="At home"><div className="hb-guide-art" aria-hidden="true">⌂<span>✿</span></div><span className="hb-eyebrow">A PLACE TO BELONG</span><h2>A whole house.<br/>A little best friend.</h2><p>Your pet wanders, visits its favorite furniture, naps, and plays. Join in whenever you like.</p><button className="hb-decorate" onClick={() => { setEditing(true); setMessage(instructions); }}>✎ Decorate your home</button><div className="hb-room-links"><h3>Wander into another room</h3>{HOME_ROOMS.filter(r => base.rooms[r.id]).map(r => <button key={r.id} aria-pressed={base.activeRoom===r.id} onClick={() => visit(r.id)}>{r.symbol} {r.name}<span>{base.activeRoom===r.id?'You’re here':'Visit →'}</span></button>)}</div>{wish&&<div className="house-wish"><p><strong>{state.pet?.name}:</strong> {wish.text}</p><button onClick={()=>visit(wish.room)}>Let’s go →</button></div>}<div className="hb-collection-note"><strong>{FURNITURE.length} designs to discover</strong><p>Nine new themed collections. Pick a piece, choose its color, and find its perfect spot.</p><button onClick={() => {setEditing(true);setTab('furniture');}}>Browse furniture →</button></div></aside>}
    {editing && <aside className="hb-design-desk" aria-label="Design desk"><div className="hb-desk-heading"><span>THE DESIGN DESK</span><h2>Make it yours.</h2><p>{FURNITURE.length} designs. A home that feels like you.</p></div>
      <nav className="hb-tabs" aria-label="Home design sections">{(['furniture','surfaces','rooms'] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'surfaces' ? 'Walls & floors' : t === 'rooms' ? 'My rooms' : 'Furniture'}</button>)}</nav>
      {tab === 'furniture' && <><label className="hb-search">Find a favorite<input placeholder="Search pieces or collections…" value={query} onChange={e => {setQuery(e.target.value);setLimit(36);}}/></label><label className="hb-collection-select">Collection<select aria-label="Collection" value={collection} onChange={e => {setCollection(e.target.value);setLimit(36);}}><option value="all">All collections</option>{collections.map(c => <option key={c}>{c}</option>)}</select></label><div className="hb-categories">{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => {setCategory(c);setLimit(36);}}>{c}</button>)}</div><label className="hb-owned-filter"><input type="checkbox" checked={ownedOnly} onChange={e => {setOwnedOnly(e.target.checked);setLimit(36);}}/>Show my collection only</label><p className="hb-starter-note">Your First Nest collection is free. Once you own a design, place up to 8 copies in each room.</p>
        <p className="hb-result-count">{visible.length} designs · {FURNITURE.filter(f => ownsFurniture(state,f.id)).length} collected</p><div className="hb-catalog">{visible.slice(0,limit).map(f => { const owned = ownsFurniture(state, f.id), canBuy = state.player.currencies.tokens >= f.cost; return <article key={f.id} className={pending === f.id ? 'is-picked' : ''}><div className="hb-catalog-art"><img src={f.art} alt={f.name}/><span>{owned ? 'Yours' : f.prize ? 'Prize' : f.set}</span></div><h3>{f.name}</h3><p>{f.description}</p><button disabled={!owned && !canBuy} onClick={() => { if (owned) pick(f); else { dispatch({ type: 'HOME_BUY', furnitureId: f.id }); setMessage(`${f.name} added to your collection. Choose Place to use it.`); } }}>{owned ? pending === f.id ? 'Pick a spot…' : 'Place' : `${f.cost} tokens · Unlock`}</button></article>; })}</div>{visible.length > limit && <button className="hb-load-more" onClick={() => setLimit(limit+36)}>Show more designs ({visible.length-limit} left)</button>}{!visible.length && <p>No pieces match. Try another collection or category.</p>}</>}
      {tab === 'surfaces' && <div className="hb-surfaces"><h3>Dress the walls</h3><p>All wall and floor styles are free. Mix and match as often as you like.</p><div className="hb-swatches">{WALLS.map(w => <button key={w.id} aria-pressed={room.wall === w.id} onClick={() => dispatch({ type: 'HOME_STYLE', wall: w.id, floor: room.floor })}><span style={{ background: w.color, borderColor: w.trim }}/>{w.name}</button>)}</div><h3>Something underfoot</h3><div className="hb-swatches">{FLOORS.map(f => <button key={f.id} aria-pressed={room.floor === f.id} onClick={() => dispatch({ type: 'HOME_STYLE', wall: room.wall, floor: f.id })}><span style={{ background: `repeating-linear-gradient(0deg,${f.color} 0 10px,${f.line} 10px 12px)` }}/>{f.name}</button>)}</div></div>}
      {tab === 'rooms' && <div className="hb-rooms"><h3>A home that grows with you</h3><p>Room unlocks and expansions use the tokens you earn through play. Furniture and styles stay with each room.</p>{HOME_ROOMS.map(r => <article key={r.id}><span>{r.symbol}</span><div><h3>{r.name}</h3><p>{r.note}</p></div><button disabled={!base.rooms[r.id] && state.player.currencies.tokens < r.cost} aria-pressed={base.activeRoom === r.id} onClick={() => { dispatch({ type: 'HOME_ROOM', roomId: r.id }); select(null); setMessage(`${r.name}: a new place to make memories.`); }}>{base.rooms[r.id] ? base.activeRoom === r.id ? 'Here' : 'Enter' : `Add · ${r.cost} tokens`}</button></article>)}<div className="hb-expansion"><h3>Room to dream bigger</h3><p>{room.tier >= 2 ? 'This room has its biggest floor plan.' : `Expand this room to ${roomSize(room.tier + 1).cols} × ${roomSize(room.tier + 1).rows} tiles. Your layout stays in place.`}</p><button disabled={room.tier >= 2 || state.player.currencies.tokens < (room.tier === 0 ? 40 : 80)} onClick={() => dispatch({ type: 'HOME_EXPAND' })}>{room.tier >= 2 ? 'Fully expanded' : `Expand · ${room.tier === 0 ? 40 : 80} tokens`}</button></div><button className="hb-clear" disabled={!room.items.length} onClick={() => { dispatch({ type: 'HOME_CLEAR' }); select(null); setMessage('Everything is back in your collection. Undo restores the room.'); }}>Put away everything in this room</button></div>}
    </aside>}</div>
    </div>
    {journey&&<HouseTravel journey={journey} pet={state.pet} onArrive={arrive} onCancel={()=>setJourney(null)}/>}
    <CareGameOverlay interaction={state.interaction} scale={1} onComplete={quality=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality})} onCancel={()=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality:0})}/>
    <FeedingScreen isOpen={feeding} onClose={() => setFeeding(false)} home={base} currentTokens={state.player.currencies.tokens} mpLifetime={state.player.currencies.mpLifetime} onFeed={id => { const food = FOOD_ITEMS.find(f => f.id === id); if (food) dispatch({type:'FEED_PET', food}); }}/>
  </main>;
}

export function HomeBaseScreen({state,dispatch}:{state:EngineState;dispatch:Dispatch}) {
 const modeKey=`vpet-house-mode:${state.pet?.id??'no-pet'}`;
 const [decorating,setDecorating]=useState(()=>{try{return sessionStorage.getItem(modeKey)==='decorate';}catch{return false;}});
 const choose=(value:boolean)=>{try{sessionStorage.setItem(modeKey,value?'decorate':'live');}catch{/* The room still works without session storage. */}setDecorating(value);};
 const designerDispatch:Dispatch=action=>{if(action.type==='SET_SCREEN'&&action.screen==='home')choose(false);dispatch(action);};
 return decorating?<><DecoratingHomeScreen state={state} dispatch={designerDispatch}/><button className="lh-return-world" onClick={()=>choose(false)}>Return to the living house →</button></>:<LivingHouse key={state.pet?.id??'no-pet'} state={state} dispatch={dispatch} onDecorate={()=>choose(true)}/>;
}
