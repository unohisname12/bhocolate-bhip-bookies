import {useEnvironment} from '../house-weather/useEnvironment';
import {WeatherPanel,WeatherWorld} from '../house-weather/Environment';
import {useWeatherAudio} from '../house-weather/audio';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {EngineState} from '../../types/engine';
import type {GameEngineAction} from '../../engine/core/ActionTypes';
import {HousePet} from './HousePet';
import {createHomeBase,upgradeHouse} from '../home-base/model';
import {HOME_ROOMS,furniture,finishFilter,type HomeRoomId} from '../home-base/catalog';
import {roomName} from '../home-base/house';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {FeedingScreen} from '../../screens/FeedingScreen';
import {FOOD_ITEMS} from '../../config/gameConfig';
import {CareGameOverlay} from '../../components/care-games/CareGameOverlay';
import {canInteract} from '../../engine/systems/InteractionSystem';
import type {HandMode} from '../../types/interaction';
import {buildWorld,roomAt,TILE,type Point,type WorldObject} from './world';
import {makeResident,invite,cancelInvitation,stepResident,savedResident,together} from './resident';
import {paintHouse} from './paint';
import {fitSprite,WALL_HANG} from './houseArt';
import {frameRoom,MAX_ZOOM_STEP,type HouseView} from './camera';
import {RoomPreview} from './RoomPreview';
import type {TogetherKind} from '../pet-mind/voice';
import './living-house.css';
type Props={state:EngineState;dispatch:(a:GameEngineAction)=>void;onDecorate:()=>void};
export function LivingHouse({state,dispatch,onDecorate}:Props){
 const base=useMemo(()=>upgradeHouse(state.homeBase??createHomeBase(state)),[state]);
 const rooms=base.rooms;const world=useMemo(()=>buildWorld({rooms}),[rooms]);const pet=state.pet;
 const preferenceKey=`vpet-house-view:${pet?.id??'home'}`;
 const [preferences]=useState(()=>{try{return JSON.parse(localStorage.getItem(preferenceKey)??'{}') as {room?:HomeRoomId;zooms?:Partial<Record<HomeRoomId,number>>};}catch{return {};}});
 const [mode,setMode]=useState<HouseView>('room'),[zooms,setZooms]=useState(preferences.zooms??{});
 const [view,setView]=useState<HomeRoomId>(preferences.room&&base.rooms[preferences.room]?preferences.room:base.activeRoom),[selected,setSelected]=useState<string|null>(null),[following,setFollowing]=useState(false),[sound,setSound]=useState(false),[feeding,setFeeding]=useState(false),[help,setHelp]=useState(false),[message,setMessage]=useState('Look around. Your companion has a life of its own.');
 const zoomStep=Math.max(1,Math.min(MAX_ZOOM_STEP,Math.round(zooms[view]??1)));
 const setZoomStep=useCallback((step:number)=>setZooms(z=>({...z,[view]:Math.max(1,Math.min(MAX_ZOOM_STEP,step))})),[view]);
 const atmosphere=useEnvironment(),{environment}=atmosphere;const night=environment.night;
 useWeatherAudio(sound,environment,atmosphere.prefs.volume,atmosphere.visible&&!feeding&&!state.interaction.careGameActive);
 const previousNeeds=useRef(pet?.needs);
 useEffect(()=>{
  const before=previousNeeds.current;previousNeeds.current=pet?.needs;if(!before||!pet)return;
  const changes=([['hunger','Fullness'],['cleanliness','Cleanliness'],['happiness','Happiness'],['health','Health']] as const).filter(([key])=>pet.needs[key]-before[key]>.1).map(([key,label])=>`${label} ${Math.round(before[key])} → ${Math.round(pet.needs[key])}`);
  if(!changes.length)return;const timer=setTimeout(()=>{setMessage(`Good care! ${changes.join(' · ')}. You're free to keep exploring.`);setStatus(s=>({...s,speech:'',ask:undefined}));},0);return()=>clearTimeout(timer);
 },[pet]);
 const [resident]=useState(()=>pet?makeResident(world,base.resident,pet,base.activeRoom):null);
 const [status,setStatus]=useState({activity:resident?.activity??'',room:base.resident?.roomId??base.activeRoom,animation:'idle',speech:'',objectKey:'',direction:'south',ask:undefined as TogetherKind|undefined,ball:undefined as Point|undefined});
 const reduced=useReducedMotion();const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),actor=useRef<HTMLDivElement>(null),sprite=useRef<HTMLDivElement>(null),viewport=useRef({width:900,height:500});
 const room=world.rooms.find(r=>r.id===view)??world.rooms[0],floor=room.floor;
 const camera=useRef({x:(room.x+room.w/2)*TILE,y:(room.y+room.h/2)*TILE,zoom:1.65});
 const target=useRef({x:camera.current.x,y:camera.current.y});
 const reframe=useRef(true);
 useEffect(()=>{reframe.current=true;},[view,mode,zooms]);
 useEffect(()=>{try{localStorage.setItem(preferenceKey,JSON.stringify({room:view,zooms}));}catch{/* Camera preferences are optional when storage is unavailable. */}},[preferenceKey,view,zooms]);
 useEffect(()=>{if(pet?.id)dispatch({type:'PET_VISIT'});},[pet?.id,dispatch]);
 const latest=useRef({learner:state,world,pet,dispatch,view,following,floor,reduced,mode,zoom:zooms[view]??1,paused:false,sound,environment});
 const audio=useRef<AudioContext|null>(null),lastFoot=useRef(0);
 useEffect(()=>{latest.current={learner:state,world,pet,dispatch,view,following,floor,reduced,mode,zoom:zooms[view]??1,paused:feeding||state.interaction.careGameActive,sound,environment};},[world,pet,dispatch,view,following,floor,reduced,feeding,state,sound,mode,zooms,environment]);
 useEffect(()=>()=>{void audio.current?.close().catch(()=>{});audio.current=null;},[]);
 const save=useCallback(()=>{const {world,pet,dispatch}=latest.current;if(resident&&pet)dispatch({type:'HOME_RESIDENT',resident:savedResident(world,resident,pet)});},[resident]);
 useEffect(()=>{
  // Paint off-screen and swap in whole frames, so a slow art load never leaves a half-drawn or stale house.
  let live=true;const off=document.createElement('canvas');
  paintHouse(off,world,base,floor,night).then(()=>{const el=canvas.current;if(!live||!el)return;el.width=off.width;el.height=off.height;const c=el.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(off,0,0);}).catch(()=>{/* Keep the last good frame if room art fails to load. */});
  return()=>{live=false;};
 },[world,base,floor,night]);
 useEffect(()=>{const el=scene.current;if(!el)return;const observer=new ResizeObserver(([entry])=>{viewport.current={width:entry.contentRect.width,height:entry.contentRect.height};reframe.current=true;});observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{target.current={x:(room.x+room.w/2)*TILE,y:(room.y+room.h/2)*TILE};},[room.x,room.y,room.w,room.h]);
 useEffect(()=>{
  let id=0,last=performance.now(),ui=0,checkpointAt=0,serial=-1;
  const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;const c=latest.current;
   if(!document.hidden){if(resident&&c.pet&&!c.paused){stepResident(resident,c.world,c.pet,dt,c.learner,Date.now(),c.environment);for(const event of resident.events.splice(0))c.dispatch(event);if(c.following){const r=roomAt(c.world,resident.position);if(r.id!==c.view)setView(r.id);target.current={x:(resident.position.x+.5)*TILE,y:(resident.position.y+.5)*TILE};}
     if(actor.current){actor.current.style.display=resident.position.floor===c.floor?'block':'none';actor.current.style.left=`${(resident.position.x+.5)*TILE}px`;actor.current.style.top=`${(resident.position.y+1)*TILE-resident.climb*12}px`;actor.current.style.zIndex=String(50+Math.floor(resident.position.y*10));actor.current.dataset.room=roomAt(c.world,resident.position).id;actor.current.dataset.moving=String(resident.path.length>0);}
     if(sprite.current)sprite.current.style.transform=`scaleX(${resident.facingLeft?-1:1})`;
     if(c.sound&&resident.path.length&&resident.position.floor===c.floor&&now-lastFoot.current>350&&audio.current){lastFoot.current=now;const a=audio.current,osc=a.createOscillator(),gain=a.createGain();osc.type='sine';osc.frequency.setValueAtTime(100,a.currentTime);gain.gain.setValueAtTime(.025,a.currentTime);gain.gain.exponentialRampToValueAtTime(.001,a.currentTime+.055);osc.connect(gain);gain.connect(a.destination);osc.start();osc.stop(a.currentTime+.06);}
     if(now-ui>200){ui=now;setStatus({activity:resident.activity,room:roomAt(c.world,resident.position).id,animation:resident.animation,speech:resident.speech,objectKey:resident.path.length?'':resident.lastObject??'',direction:resident.direction,ask:resident.ask,ball:resident.ball});}
     if(resident.serial!==serial&&now-checkpointAt>2000){serial=resident.serial;checkpointAt=now;save();}
    }
    const v=viewport.current,cam=camera.current;const activeRoom=c.world.rooms.find(r=>r.id===c.view)??c.world.rooms[0];const framed=frameRoom(c.world,activeRoom,v.width,v.height,c.mode,c.zoom);if(reframe.current){if(!c.following)target.current={x:framed.x,y:framed.y};reframe.current=false;}cam.zoom=framed.zoom;const blend=c.reduced?1:Math.min(1,dt*7);cam.x+=(target.current.x-cam.x)*blend;cam.y+=(target.current.y-cam.y)*blend;
    if(stage.current){const dpr=window.devicePixelRatio||1,snap=(n:number)=>Math.round(n*dpr)/dpr;stage.current.style.transform=`translate(${snap(v.width/2-cam.x*cam.zoom)}px,${snap(v.height/2-cam.y*cam.zoom)}px) scale(${cam.zoom})`;}
   }id=requestAnimationFrame(tick);
  };id=requestAnimationFrame(tick);const hide=()=>{save();last=performance.now();};window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',hide);
  return()=>{cancelAnimationFrame(id);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',hide);save();};
 },[resident,save]);
 const announce=(text:string)=>{setMessage(text);if(resident)resident.speech='';if(resident)resident.ask=undefined;setStatus(s=>({...s,speech:'',ask:undefined}));};
 const look=(id:HomeRoomId)=>{const r=world.rooms.find(r=>r.id===id)!;if(!r.owned){announce(`${roomName(id)} is an optional room. Open Decorate to add it.`);return;}setFollowing(false);setMode('room');reframe.current=true;setView(id);setSelected(null);announce(`Looking into ${roomName(id).toLowerCase()}. ${pet?.name??'Your pet'} is still ${status.activity.toLowerCase()}.`);};
 const call=(o?:WorldObject)=>{if(!resident||!pet)return;setFollowing(false);if(viewport.current.width<600)scene.current?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});const targetPoint:Point={x:room.x+room.w/2,y:room.y+room.h-1,floor};setMessage(invite(resident,world,pet,targetPoint,o));setStatus({activity:resident.activity,room:roomAt(world,resident.position).id,animation:resident.animation,speech:resident.speech,objectKey:'',direction:resident.direction,ask:resident.ask,ball:resident.ball});save();};
 const shareTime=(kind:TogetherKind)=>{if(!resident||!pet)return;if(together(resident,world,pet,kind)){setView(roomAt(world,resident.position).id);setFollowing(true);}setStatus(s=>({...s,ask:resident.ask,speech:resident.speech,activity:resident.activity,animation:resident.animation,ball:resident.ball}));save();};
 const object=world.objects.find(o=>o.key===selected),definition=object&&furniture(object.placement.furnitureId);
 const petHere=resident?.position.floor===floor&&status.room===view;
 const care=(mode:'wash'|'brush')=>{if(!petHere||!pet){announce('Invite your companion into this room first.');return;}const allowed=canInteract(pet,mode,state.interaction,state.player.currencies.tokens);if(!allowed.allowed){announce(allowed.reason??'This care tool is not ready yet.');return;}save();dispatch({type:'START_PET_INTERACTION',mode});};
 const drag=useRef<{x:number;y:number;tx:number;ty:number;moved:boolean}|null>(null);
 const touches=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;step:number}|null>(null);
 useEffect(()=>{
  // Native listener: React's wheel handler is passive, and the page must not scroll while zooming the house.
  const el=scene.current;if(!el)return;let last=0;
  const wheel=(e:WheelEvent)=>{e.preventDefault();const now=performance.now();if(now-last<140)return;last=now;setZoomStep(zoomStep+(e.deltaY<0?1:-1));};
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[setZoomStep,zoomStep]);
 return <main className="living-house" data-testid="living-house" data-weather={environment.weather} data-phase={environment.phase} data-environment-paused={!atmosphere.visible||feeding||state.interaction.careGameActive}>
  <header className="lh-header"><button onClick={()=>{save();dispatch({type:'SET_SCREEN',screen:'play'});}}>← Games & care</button><div><span>YOUR LITTLE WORLD</span><h1>Home, with {pet?.name??'your companion'}</h1></div><button onClick={()=>{save();dispatch({type:'HOME_ROOM',roomId:view});onDecorate();}}>Decorate</button></header>
  <nav className="lh-rooms" aria-label="Look into a room">{HOME_ROOMS.map(r=><button key={r.id} aria-pressed={view===r.id} onClick={()=>look(r.id)} disabled={!base.rooms[r.id]}><RoomPreview world={world} room={world.rooms.find(w=>w.id===r.id)!} home={base}/><span>{r.name}{status.room===r.id?' · 🐾':''}</span><small>{!base.rooms[r.id]?'Add in Decorate':r.floor?'Upstairs':'Downstairs'}</small></button>)}</nav>
  <div className="lh-world-wrap">
   <section ref={scene} className="lh-viewport" aria-label="Living pixel-art house" data-view={mode} data-room={view} tabIndex={0}
    onKeyDown={e=>{const d=48;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)&&e.target===e.currentTarget){e.preventDefault();setFollowing(false);target.current={x:target.current.x+(['ArrowLeft','a'].includes(e.key)?-d:['ArrowRight','d'].includes(e.key)?d:0),y:target.current.y+(['ArrowUp','w'].includes(e.key)?-d:['ArrowDown','s'].includes(e.key)?d:0)};}if(e.key==='Escape')setSelected(null);}}
    onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.current.size===2){const [a,b]=[...touches.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),step:zoomStep};drag.current=null;return;}drag.current={x:e.clientX,y:e.clientY,tx:target.current.x,ty:target.current.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(touches.current.has(e.pointerId))touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=pinch.current;if(p&&touches.current.size===2){const [a,b]=[...touches.current.values()];setZoomStep(Math.round(p.step*Math.hypot(a.x-b.x,a.y-b.y)/p.distance));return;}const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>5){d.moved=true;setFollowing(false);target.current={x:Math.max(0,Math.min(world.width*TILE,d.tx-dx/camera.current.zoom)),y:Math.max(0,Math.min(world.height*TILE,d.ty-dy/camera.current.zoom))};}}}
    onPointerUp={e=>{touches.current.delete(e.pointerId);if(touches.current.size<2)pinch.current=null;drag.current=null;}} onPointerCancel={e=>{touches.current.delete(e.pointerId);pinch.current=null;drag.current=null;}} data-reduced-motion={reduced}>
    <div className="lh-room-caption"><span>{floor?'UPSTAIRS':'DOWNSTAIRS'}</span><strong>{mode==='house'?'Your house':roomName(view)}</strong><small>{mode==='house'?'Choose a room to step inside':'Drag to look around · Click furniture to explore'}</small></div>
    <div ref={stage} className="lh-stage" style={{width:world.width*TILE,height:world.height*TILE}}>
     <canvas ref={canvas} aria-hidden="true"/><WeatherWorld world={world} floor={floor} home={base} environment={environment}/>
     {world.objects.filter(o=>o.floor===floor).map(o=>{const f=furniture(o.placement.furnitureId)!;const wall=f.layer==='wall',rug=f.layer==='floor';return <button key={o.key} aria-label={`Inspect ${f.name} in ${roomName(o.roomId)}`} aria-pressed={selected===o.key} onClick={()=>{setSelected(o.key);if(mode==='house')look(o.roomId);setSelected(o.key);setView(o.roomId);setFollowing(false);}} className={`lh-object ${rug?'is-rug':''} ${wall?'is-wall':''} ${status.objectKey===o.key?'is-investigated':''} ${f.interaction==='light'&&o.placement.on?'is-lamp':''}`} style={{left:o.x*TILE,top:o.y*TILE-(wall?WALL_HANG:0),width:o.w*TILE,height:o.h*TILE,zIndex:rug?3:wall?4:50+Math.floor((o.y+o.h-.15)*10),filter:finishFilter(o.placement.finish)}}><img src={f.art} alt="" draggable={false} onLoad={e=>fitSprite(e.currentTarget,o.w*TILE)} style={{'--flip':o.placement.flipped?-1:1} as CSSProperties}/>{f.id==='home_table'&&<i className="lh-table-details" aria-hidden="true"/>}{selected===o.key&&<span className="lh-object-marker">✦</span>}</button>;})}
     {world.rooms.filter(r=>r.floor===floor&&r.owned).map(r=><button key={`room-${r.id}`} className="lh-room-sign" style={{left:(r.x+r.w/2)*TILE,top:(r.y+r.h)*TILE+12}} onClick={()=>look(r.id)}>{roomName(r.id)}</button>)}
     {world.doors.filter(d=>d.floor===floor).map((d,i)=><button key={`door-${i}`} className="lh-door-hotspot" style={{left:d.x*TILE,top:d.y*TILE,width:TILE,height:TILE*2}} onClick={()=>look(d.to)} aria-label={`Look through doorway to ${roomName(d.to)}`}><span>→ {roomName(d.to)}</span></button>)}
     <button className="lh-stairs-hotspot" style={{left:world.stairs[floor].x*TILE-13,top:world.stairs[floor].y*TILE-35}} onClick={()=>look(floor?'hall':'landing')} aria-label={floor?'Look downstairs':'Look upstairs'}><span>{floor?'↓ Downstairs':'↑ Upstairs'}</span></button>
     {pet&&resident&&<div ref={actor} className="lh-resident" data-testid="house-resident" style={{left:(resident.position.x+.5)*TILE,top:(resident.position.y+1)*TILE,display:resident.position.floor===floor?'block':'none'}}><span className="lh-pet-shadow"/><div ref={sprite} className="lh-pet-sprite"><HousePet pet={pet} equipped={state.cosmetics.equipped[pet.id]} animation={status.animation} direction={status.direction} paused={reduced||feeding||state.interaction.careGameActive}/></div>{status.activity==='Looking through a story'&&<span className="lh-book-prop" aria-hidden="true">▱</span>}{status.activity==='Dance party'&&<span aria-hidden="true">♫ ♪</span>}{status.animation==='sleeping'&&<span className="lh-sleep">z z</span>}</div>}
     {status.ball&&status.ball.floor===floor&&<span className="lh-fetch-ball" aria-label="Fetch ball" style={{position:'absolute',left:(status.ball.x+.5)*TILE,top:(status.ball.y+.5)*TILE,zIndex:90,pointerEvents:'none'}}>⚾</span>}
     {object&&<span className="lh-interest-ring" style={{left:(object.x+object.w/2)*TILE,top:(object.y+object.h)*TILE}} aria-hidden="true"/>}
    </div>
    <div className="weather-light" aria-hidden="true"/>
    <div className="lh-camera-controls" role="group" aria-label="Room view">{([['room','Room'],['close','Close-up'],['house','Whole house']] as const).map(([id,label])=><button key={id} aria-pressed={mode===id} onClick={()=>{setMode(id);setFollowing(false);reframe.current=true;}}>{label}</button>)}{mode!=='house'&&<label>Zoom <input aria-label="Room zoom" type="range" min="1" max={MAX_ZOOM_STEP} step="1" value={zoomStep} onChange={e=>setZoomStep(Number(e.target.value))}/></label>}<button aria-label="Center room" onClick={()=>{setFollowing(false);setMode('room');setZooms(z=>({...z,[view]:1}));reframe.current=true;}}>↺</button></div>
    <div className="lh-view-tools"><button onClick={()=>{if(resident){look(roomAt(world,resident.position).id);}}}>Find my pet</button><button onClick={()=>{if(!resident)return;setView(roomAt(world,resident.position).id);setMode('close');setZooms(z=>({...z,[roomAt(world,resident.position).id]:MAX_ZOOM_STEP-1}));setFollowing(true);}}>Zoom on {pet?.name??'my pet'}</button><button aria-pressed={following} onClick={()=>{setFollowing(!following);if(!following&&resident){setMode('close');setView(roomAt(world,resident.position).id);}}}>{following?'Stop following':'Follow pet'}</button><button aria-pressed={sound} onClick={()=>{if(!sound){audio.current??=new AudioContext();void audio.current.resume();}setSound(!sound);}}>{sound?'Sound on':'Sound off'}</button></div>
   </section>
   <aside className="lh-companion-panel"><WeatherPanel {...atmosphere}/><div className="lh-presence"><span className="lh-presence-dot"/><div><strong>{pet?.name??'Your companion'}</strong><p data-testid="resident-status">{status.activity} · {roomName(status.room)}</p></div><button onClick={()=>setHelp(!help)} aria-label="How this house works">?</button></div>
    {help&&<p className="lh-help">You are here without an avatar. Look through doors or drag the view. Your pet chooses its own activities. Invite it over, or point out an object. Looking at a room never moves your pet. Keyboard arrows pan the focused house; Tab reaches every object.</p>}
    <p className="lh-dialogue" role="status">{status.speech||message}</p>
    {status.ask&&<div className="lh-invitations" role="group" aria-label="Your pet is asking you"><button className="lh-primary" onClick={()=>{if(status.ask&&resident?.ask===status.ask)shareTime(status.ask);}}> {{fetch:'Throw the ball!',dance:'Let’s dance!',cuddle:'Cuddle time',talk:'Let’s chat'}[status.ask]}</button><button onClick={()=>{if(resident){resident.ask=undefined;resident.speech='Okay. I’ll explore a little.';resident.wait=3;resident.socialAfter=Date.now()+180000;}setStatus(s=>({...s,ask:undefined,speech:'Okay. I’ll explore a little.'}));}}>Maybe later</button></div>}
    <div className="lh-needs" aria-label="Pet care meters">{pet&&([['hunger','Fullness'],['cleanliness','Cleanliness'],['happiness','Happiness'],['health','Health']] as const).map(([key,label])=><div key={key}><span>{label} <b>{Math.round(pet.needs[key])}/100</b></span><meter min={0} max={100} value={pet.needs[key]} aria-label={label}/></div>)}</div><div className="lh-invitations"><button className="lh-primary" disabled={!pet} onClick={()=>call()}>Come here, {pet?.name??'friend'}</button><button disabled={!resident} onClick={()=>{if(resident){cancelInvitation(resident);setMessage('Your companion can take its time.');save();}}}>Let them relax</button></div>
    {object&&definition?<section className="lh-inspect"><span>YOU’RE LOOKING AT</span><h2>{definition.name}</h2><p>{definition.description}</p><button className="lh-primary" onClick={()=>call(object)}>Ask {pet?.name??'your pet'} to check it out</button>{definition.interaction==='feed'&&<button disabled={!petHere} onClick={()=>setFeeding(true)}>Prepare a snack</button>}{definition.interaction==='wash'&&<button onClick={()=>care('wash')}>Wash together</button>}{definition.interaction==='brush'&&<button onClick={()=>care('brush')}>Brush together</button>}{definition.interaction==='rest'&&<button disabled={!petHere} onClick={()=>{dispatch({type:'FREE_SCHOOL_CARE',task:'rest'});setMessage('A little quiet time together.');}}>A restful moment</button>}{definition.interaction==='light'&&<button onClick={()=>{dispatch({type:'HOME_ROOM',roomId:object.roomId});dispatch({type:'HOME_TOGGLE',id:object.placement.id});}}>{object.placement.on?'Turn lamp off':'Turn lamp on'}</button>}<button onClick={()=>setSelected(null)}>Put attention back on the room</button></section>:<div className="lh-quiet-note"><span>SMALL MOMENTS, TOGETHER</span><p>Point out a favorite object. Watch a little discovery. Or simply share a quiet room.</p></div>}
    <div className="lh-care-shortcuts" role="group" aria-label="Spend time together"><span>Time together</span>{([['fetch','Play fetch'],['dance','Dance together'],['cuddle','Have a cuddle'],['talk','Have a chat']] as const).map(([kind,label])=><button key={kind} disabled={!pet||pet.state==='dead'||pet.state==='sleeping'||pet.needs.health<30||status.animation==='walking'} onClick={()=>shareTime(kind)}>{label}</button>)}</div>
    {status.activity==='Having a chat'&&<div className="lh-invitations" role="group" aria-label="Choose a shared interest">{([['plants','Plants'],['books','Books'],['toys','Toys']] as const).map(([choice,label])=><button key={choice} onClick={()=>{dispatch({type:'PET_PREFERENCE',choice});if(resident){resident.speech=`${label}! I’ll keep that in mind when I explore.`;resident.activity='Sharing our favorite things';}setStatus(s=>({...s,speech:`${label}! I’ll keep that in mind when I explore.`,activity:'Sharing our favorite things'}));}}>{label}</button>)}</div>}
    <details className="lh-nearby"><summary>Objects in this room</summary>{world.objects.filter(o=>o.roomId===view).map(o=><button key={o.key} onClick={()=>setSelected(o.key)}>{furniture(o.placement.furnitureId)?.name}</button>)}</details>
    <div className="lh-care-shortcuts"><span>Gentle care is always available</span><button onClick={()=>dispatch({type:'FREE_SCHOOL_CARE',task:'feed'})}>Free snack</button><button onClick={()=>dispatch({type:'FREE_SCHOOL_CARE',task:'clean'})}>Free clean</button></div>
   </aside>
  </div>
  <footer className="lh-footer"><span>One house. A companion with a life of their own.</span><span>{state.player.currencies.tokens} tokens · Your furniture stays yours</span></footer>
  <FeedingScreen isOpen={feeding} onClose={()=>setFeeding(false)} home={base} currentTokens={state.player.currencies.tokens} mpLifetime={state.player.currencies.mpLifetime} onFeed={id=>{const food=FOOD_ITEMS.find(f=>f.id===id);if(food)dispatch({type:'FEED_PET',food});}}/>
  <CareGameOverlay interaction={state.interaction} scale={1} onComplete={quality=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality})} onCancel={()=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality:0})}/>
 </main>;
}
