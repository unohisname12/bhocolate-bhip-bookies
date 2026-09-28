import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {ASSETS} from '../../config/assetManifest';
import manifest from './battleArtManifest';
import type {CombatEvent,Fight,Fighter} from './combat';
import type {Move} from './catalog';
import {GROWING_PETS} from '../../config/companionConfig';
import './battle-stage.css';

/** The fight is staged on a native 688×384 pixel canvas and scaled as one piece, so pets, effects and the
 * battleground always share one pixel size. Combat rules stay in combat.ts; this only replays their events. */
const STAGE_W=688,STAGE_H=384;
const GROUND=330,HOME=[200,488] as const;
type Anim='idle'|'attack'|'special'|'defend'|'hurt'|'heal'|'focus'|'victory'|'ko';
const MS:Record<Anim,number>={idle:150,attack:62,special:68,defend:58,hurt:58,heal:70,focus:66,victory:80,ko:95};
const LEGACY:Record<Anim,string>={idle:'idle',attack:'attack',special:'special',defend:'defend',hurt:'hurt',heal:'heal',focus:'math',victory:'heal',ko:'hurt'};
const BACKDROPS=['bramblewood','clockwork','moonlit','champion'];

/** A move strip for a pet form: new PixelLab battle art when generated, otherwise the older short sheets. */
function strip(form:string,anim:Anim):{url:string;frames:number}{
 const frames=manifest[form]?.[anim];
 if(frames)return {url:`/assets/battle-v2/${form}-${anim}.png`,frames};
 const [species,stage='baby']=form.split('__');
 if(anim==='idle')return species==='koala_sprite'&&stage==='baby'?{url:'/assets/woodland-v1/pip-idle.png',frames:4}:{url:`/assets/companions-v2/${species}-${stage}.png`,frames:8};
 const old=ASSETS.combatAnims[form]?.[LEGACY[anim]];
 return old?{url:old.url,frames:old.frameCount}:strip(form,'idle');
}

function Sprite({form,anim,play,flip}:{form:string;anim:Anim;play:number;flip:boolean}){
 const s=strip(form,anim),loop=anim==='idle',held=anim==='ko'||anim==='victory';
 return <div key={`${anim}:${play}`} className="bs-sprite" style={{backgroundImage:`url(${s.url})`,'--end':`${-(s.frames-1)*128}px`,'--flip':flip?-1:1,
  animation:`bs-strip ${s.frames*MS[anim]}ms steps(${Math.max(2,s.frames)},jump-none) ${loop?'infinite':held?'forwards':'1 forwards'}`} as CSSProperties}/>;
}

type Beat={actor:0|1;move:Move|'thorn'|'status'|'math';events:CombatEvent[]};
/** Group one turn's events by who acted and recover which move it was from the rules' own event text. */
function beats(events:CombatEvent[]):Beat[]{
 const out:Beat[]=[];
 for(const e of events){const last=out[out.length-1];if(last&&last.actor===e.actor&&!e.text.includes('Thorn Badge returned'))last.events.push(e);else out.push({actor:e.actor,move:'status',events:[e]});}
 for(const b of out){const t=b.events.map(e=>e.text).join(' | ');
  b.move=b.events.some(e=>e.power)?'math':t.includes('Thorn Badge returned')?'thorn':t.includes(' used ')?'item':t.includes('Guard will halve')?'guard':t.includes('Ready for a focused Signature')?'focus':b.events.some(e=>e.kind==='damage')?(t.includes('Strike dealt')?'strike':'signature'):'status';}
 return out;
}

type Look={hp:number;shield:number;energy:number;anim:Anim;play:number;x:number;tint:''|'flash'|'weak'};
type Fx={id:number;kind:'number'|'spark'|'chip'|'burst'|'shieldhit'|'charge'|'sheet'|'bolt';x:number;y:number;text?:string;tone?:string;to?:number};
type FxName='hit'|'heavy'|'shield'|'heal'|'charge'|'weaken';
const FX_MS:Record<FxName,number>={hit:45,heavy:55,shield:55,heal:70,charge:60,weaken:70};
const fxFrames=(name:FxName)=>manifest._fx?.[name]??0;
/** A species' own colour tints its Signature bolt. */
const themeOf=(form:string)=>(GROWING_PETS as Record<string,{theme:string}>)[form.split('__')[0]]?.theme??'#ffe169';
const lookOf=(f:Fighter,x:number):Look=>({hp:f.hp,shield:f.shield,energy:f.energy,anim:f.hp<=0?'ko':'idle',play:0,x,tint:''});

export function BattleStage({fight,previous,reduced,onPlaying,intent,turnReady=false}:{fight:Fight;previous:Fight|null;reduced:boolean;onPlaying:(playing:boolean)=>void;intent?:{text:string;big:boolean};turnReady?:boolean}){
 const [looks,setLooks]=useState<[Look,Look]>(()=>[lookOf(fight.fighters[0],HOME[0]),lookOf(fight.fighters[1],HOME[1])]);
 const [fx,setFx]=useState<Fx[]>([]),[camera,setCamera]=useState({zoom:1,x:0,shake:0}),[banner,setBanner]=useState('');
 const box=useRef<HTMLDivElement>(null),[scale,setScale]=useState(1),seq=useRef(0),fxId=useRef(0),played=useRef(`${fight.id}:${fight.round}:${fight.phase}:${fight.mathPower?.used??0}`);
 // Callers pass fresh objects every render; only a new fight state may start or cancel a replay.
 const prev=useRef(previous),notify=useRef(onPlaying);prev.current=previous;notify.current=onPlaying;
 useEffect(()=>{
  // A fresh battle opens with both fighters stepping in from the edges.
  if(fight.round!==1||fight.events.length)return;
  setLooks(l=>[{...l[0],x:HOME[0]-300},{...l[1],x:HOME[1]+300}]);setBanner('Battle start!');
  const a=setTimeout(()=>setLooks(l=>[{...l[0],x:HOME[0]},{...l[1],x:HOME[1]}]),60),b=setTimeout(()=>setBanner(''),1100);
  return()=>{clearTimeout(a);clearTimeout(b);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[fight.id]);
 useLayoutEffect(()=>{const el=box.current;if(!el)return;const o=new ResizeObserver(([e])=>setScale(e.contentRect.width/STAGE_W));o.observe(el);return()=>o.disconnect();},[]);
 useEffect(()=>{
  const key=`${fight.id}:${fight.round}:${fight.phase}:${fight.mathPower?.used??0}`;if(key===played.current)return;played.current=key;
  const run=++seq.current,alive=()=>seq.current===run,wait=(ms:number)=>new Promise(r=>setTimeout(r,reduced?Math.min(ms,90):ms));
  const before=prev.current;const start:[Look,Look]=before&&before.id===fight.id?[lookOf(before.fighters[0],HOME[0]),lookOf(before.fighters[1],HOME[1])]:[lookOf(fight.fighters[0],HOME[0]),lookOf(fight.fighters[1],HOME[1])];
  const cur:[Look,Look]=[{...start[0]},{...start[1]}];
  const set=(i:0|1,patch:Partial<Look>)=>{cur[i]={...cur[i],...patch};setLooks([{...cur[0]},{...cur[1]}]);};
  const animate=(i:0|1,anim:Anim)=>set(i,{anim,play:cur[i].play+1});
  const pop=(f:Omit<Fx,'id'>,life=900)=>{const id=++fxId.current;setFx(list=>[...list,{...f,id}]);setTimeout(()=>setFx(list=>list.filter(x=>x.id!==id)),reduced?400:life);};
  const apply=(e:CombatEvent)=>{const who=e.actor,other=(who===0?1:0) as 0|1,n=e.amount??0;
   if(e.kind==='damage')set(other,{hp:Math.max(0,cur[other].hp-n)});else if(e.kind==='heal')set(who,{hp:cur[who].hp+n});else if(e.kind==='shield')set(who,{shield:cur[who].shield+n});else if(e.kind==='energy')set(who,{energy:cur[who].energy+n});};
  const effect=(name:FxName,x:number,y:number,fallback:Fx['kind'],flip=false)=>{const n=fxFrames(name);if(n)pop({kind:'sheet',x,y,text:name,tone:flip?'flip':undefined},n*FX_MS[name]+40);else pop({kind:fallback,x,y});};
  const chips=(b:Beat)=>b.events.filter(e=>e.kind==='status'&&!/Guard will halve|Ready for a focused|used /.test(e.text)).forEach((e,i)=>setTimeout(()=>pop({kind:'chip',x:cur[b.actor].x,y:150-i*20,text:e.text.replace(/^[^:]*: /,'')},1500),i*180));
  notify.current(true);setLooks(start);setFx([]);setBanner('');
  (async()=>{
   for(const b of beats(fight.events)){
    if(!alive())return;const me=b.actor,foe=(me===0?1:0) as 0|1,dir=me===0?1:-1;
    if(b.move==='strike'||b.move==='signature'){
     const big=b.move==='signature',s=strip(fight.fighters[me].species,big?'special':'attack'),dur=s.frames*MS[big?'special':'attack'];
     animate(me,big?'special':'attack');if(big){setCamera({zoom:1.12,x:-dir*40,shake:0});effect('charge',cur[me].x,GROUND-64,'charge');}
     await wait(dur*.45);if(!alive())return;
     if(!big)set(me,{x:cur[foe].x-dir*96});
     else pop({kind:'bolt',x:cur[me].x+dir*40,y:GROUND-70,to:cur[foe].x-cur[me].x-dir*40,tone:themeOf(fight.fighters[me].species)},420);
     await wait(big?Math.max(220,dur*.2):110);if(!alive())return;
     // Impact: hit-pause, then the damage lands with a shake scaled to how hard it hit.
     const dmg=b.events.filter(e=>e.kind==='damage');const total=dmg.reduce((n,e)=>n+(e.amount??0),0),blocked=/blocked/.test(dmg.map(e=>e.text).join(' '));
     await wait(reduced?0:70);
     for(const e of b.events.filter(e=>e.kind!=='status'))apply(e);
     animate(foe,'hurt');set(foe,{tint:'flash',x:cur[foe].x+dir*14});
     effect(blocked?'shield':big?'heavy':'hit',cur[foe].x-dir*(blocked?30:10),GROUND-62,blocked?'shieldhit':'spark',foe===0);pop({kind:'number',x:cur[foe].x,y:GROUND-150,text:total?`-${total}`:'0',tone:big?'big':blocked?'blocked':'hit'});
     if(!reduced)setCamera(c=>({...c,shake:Math.min(3,1+Math.floor(total/12))}));
     if(big&&!fxFrames('heavy'))pop({kind:'burst',x:cur[foe].x,y:GROUND-64,tone:'gold'},700);
     if(b.events.some(e=>/Weakened/.test(e.text)))effect('weaken',cur[foe].x,GROUND-90,'charge');
     chips(b);
     await wait(160);if(!alive())return;set(foe,{tint:'',x:HOME[foe]});set(me,{x:HOME[me]});setCamera({zoom:1,x:0,shake:0});
     await wait(big?420:320);
     if(cur[foe].hp>0)animate(foe,'idle');animate(me,'idle');
    }else if(b.move==='thorn'){
     for(const e of b.events)apply(e);pop({kind:'spark',x:cur[foe].x,y:GROUND-70});pop({kind:'number',x:cur[foe].x,y:GROUND-150,text:`-${b.events[0].amount??0}`,tone:'hit'});await wait(420);
    }else if(b.move==='math'){
     const power=b.events.find(e=>e.power)?.power;
     animate(me,power==='shield'?'defend':'focus');effect(power==='shield'?'shield':'charge',cur[me].x,GROUND-64,'charge',me===0);
     pop({kind:'chip',x:cur[me].x,y:GROUND-150,text:fight.mathPower?.activations.at(-1)?.answer??'✦'},1300);
     await wait(500);if(!alive())return;for(const e of b.events){apply(e);if(e.amount)pop({kind:'number',x:cur[me].x,y:GROUND-180,text:`+${e.amount} ${e.kind}`,tone:e.kind});}chips(b);await wait(600);
    }else if(b.move==='status'){
     chips(b);await wait(500);
    }else{
     const anim:Anim=b.move==='guard'?'defend':b.move==='focus'?'focus':'heal';const s=strip(fight.fighters[me].species,anim);
     animate(me,anim);effect(b.move==='focus'?'charge':b.move==='guard'?'shield':'heal',cur[me].x+(b.move==='guard'?dir*34:0),GROUND-64,'charge',me===0);
     await wait(s.frames*MS[anim]*.5);if(!alive())return;
     for(const e of b.events){apply(e);if(e.kind!=='status'&&e.amount)pop({kind:'number',x:cur[me].x,y:GROUND-150,text:`+${e.amount}${e.kind==='shield'?' shield':e.kind==='energy'?' energy':''}`,tone:e.kind});}
     chips(b);await wait(s.frames*MS[anim]*.5+200);if(!alive())return;if(cur[me].hp>0)animate(me,'idle');
    }
   }
   if(!alive())return;
   const bossHalf=(f:Fight|null)=>!!f&&f.boss&&f.fighters[1].hp<f.fighters[1].maxHP/2;
   if(fight.phase==='active'&&bossHalf(fight)&&!bossHalf(before)){setBanner(`${fight.fighters[1].name} is furious!`);setCamera({zoom:1,x:0,shake:3});await wait(1100);if(!alive())return;setBanner('');setCamera({zoom:1,x:0,shake:0});}
   // Settle on the rules' own final numbers (energy spent on Signature has no event of its own).
   const end:[Look,Look]=[{...cur[0],...lookOf(fight.fighters[0],HOME[0]),play:cur[0].play},{...cur[1],...lookOf(fight.fighters[1],HOME[1]),play:cur[1].play}];
   if(fight.phase==='won'){end[0].anim='victory';end[1].anim='ko';setBanner('Victory!');}
   else if(fight.phase==='lost'){end[0].anim='ko';end[1].anim='victory';setBanner('Time for a breather');}
   else if(fight.phase==='draw'){setBanner('A close match!');}
   end[0].play++;end[1].play++;cur[0]=end[0];cur[1]=end[1];setLooks([{...end[0]},{...end[1]}]);notify.current(false);
  })();
  return()=>{seq.current=run+1;notify.current(false);};
 },[fight,reduced]);
 const area=fight.mode==='challenge'?3:Math.min(2,Math.floor(fight.encounter/5));
 return <div className="bs-wrap"><div className="bs-huds">{looks.map((l,i)=><Hud key={i} f={fight.fighters[i]} look={l} side={i?'right':'left'}/>)}</div>
 <div ref={box} className="bs-frame" style={{height:STAGE_H*scale}} data-area={BACKDROPS[area]}>
  <div className={`bs-stage ${camera.shake?`bs-shake-${camera.shake}`:''}`} style={{width:STAGE_W,height:STAGE_H,transform:`scale(${scale})`}}>
   <div className="bs-camera" style={{transform:`scale(${camera.zoom}) translateX(${camera.x}px)`}}>
    <div className="bs-backdrop" style={{backgroundImage:`url(/assets/battle-v2/bg-${BACKDROPS[area]}.png), url(/assets/battle-v2/bg-bramblewood.png)`}}/>
    {looks.map((l,i)=>{const f=fight.fighters[i];return <div key={f.id} className={`bs-fighter ${i?'is-enemy':''} ${i&&fight.boss?'is-boss':''} ${i&&fight.boss&&f.hp<f.maxHP/2?'is-raging':''} ${l.tint?`is-${l.tint}`:''} ${f.weaken?'is-weak':''}`} style={{left:l.x-64,top:GROUND-128}} data-anim={l.anim}>
     <span className="bs-shadow"/>{l.shield>0&&l.hp>0&&<span className="bs-bubble" aria-hidden="true" style={{opacity:Math.min(1,.2+l.shield/40)}}/>}
     <Sprite form={f.species} anim={l.anim} play={l.play} flip={i===1}/>
    </div>;})}
    {fx.map(f=>f.kind==='sheet'?<span key={f.id} className={`bs-fx bs-sheet ${f.tone==="flip"?"is-flip":""}`} style={{left:f.x,top:f.y,backgroundImage:`url(/assets/battle-v2/fx-${f.text}.png)`,'--end':`${-(fxFrames(f.text as FxName)-1)*96}px`,animation:`bs-strip ${fxFrames(f.text as FxName)*FX_MS[f.text as FxName]}ms steps(${fxFrames(f.text as FxName)},jump-none) forwards`} as CSSProperties}/>
     :f.kind==='bolt'?<span key={f.id} className="bs-fx bs-bolt" style={{left:f.x,top:f.y,'--to':`${f.to}px`,'--tone':f.tone} as CSSProperties}/>
     :<span key={f.id} className={`bs-fx bs-${f.kind} ${f.tone?`tone-${f.tone}`:''}`} style={{left:f.x,top:f.y}}>{f.text}</span>)}
   </div>
   {banner&&<div className="bs-banner" role="status">{banner}</div>}
   {turnReady&&fight.phase==='active'&&!banner&&<div className="bs-your-move">Your move</div>}
  </div>
  {intent&&fight.phase==='active'&&<div className={`bs-intent ${intent.big?'is-big':''}`} style={{left:`${(HOME[1]/STAGE_W)*100}%`}}>{intent.text}</div>}
 </div></div>;
}

function Hud({f,look,side}:{f:Fighter;look:Look;side:'left'|'right'}){
 const hp=Math.max(0,Math.min(f.maxHP,look.hp)),shield=Math.max(0,look.shield),energy=Math.max(0,Math.min(60,look.energy));
 const badges=[f.mathStrike&&['Math Power ready','focus'],f.guard&&['Guard','guard'],f.focused&&['Focused','focus'],f.counter&&['Counter ready','counter'],f.weaken&&['Weakened','weak']].filter(Boolean) as [string,string][];
 return <div className={`bs-hud is-${side}`}>
  <div className="bs-hud-name"><strong>{f.name}</strong><span>Lv. {f.level}</span></div>
  <div className="bs-bar" role="meter" aria-label={`${f.name} HP`} aria-valuemin={0} aria-valuemax={f.maxHP} aria-valuenow={hp}>
   <i className="bs-bar-trail" style={{width:`${hp/f.maxHP*100}%`}}/><i className="bs-bar-hp" style={{width:`${hp/f.maxHP*100}%`}}/>
   {shield>0&&<i className="bs-bar-shield" style={{width:`${Math.min(100,shield/f.maxHP*100)}%`}}/>}
   <b>{hp} / {f.maxHP}{shield>0?` · ${shield} shield`:''}</b>
  </div>
  <div className="bs-energy" aria-label={`${energy} of 60 energy`}>{Array.from({length:6},(_,i)=><i key={i} className={energy>=(i+1)*10?'is-full':energy>i*10?'is-part':''}/>)}<small>{energy} energy</small></div>
  <div className="bs-badges">{f.build.talents.striker>0&&<span className="bs-combo" aria-label={`Combo ${f.combo} of 3`}>{[0,1,2].map(i=><i key={i} className={i<f.combo?'is-on':''}/>)}Combo</span>}{badges.map(([t,k])=><span key={k} className={`bs-badge is-${k}`}>{t}</span>)}</div>
 </div>;
}
