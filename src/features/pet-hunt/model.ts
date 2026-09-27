/** Shared deterministic arena rules. No saved-pet state or client-authoritative damage. */
export type Role = 'hunter' | 'runner';
export type Kit = 'scout' | 'helper' | 'trickster';
export type Mode = 'versus' | 'coop' | 'teacher';
export type Difficulty = 'gentle' | 'normal' | 'tricky';
export type Vec = { x: number; y: number };
export type Rect = Vec & { w: number; h: number };
export const HUNTER_RECHARGE = 3.2, RUNNER_RECHARGE = 2.8;
import { MAP_W, MAP_H, arenaFromLayout, generateLayout } from './mapgen';
import { CHECK_BONUS, CHECK_GAP, CHECK_SETBACK, makeCheck, seededRandom, type SparkCheck } from './spark';
export const WIDTH = MAP_W, HEIGHT = MAP_H, RADIUS = 16;
/** Pacing for a 3–5 minute round: more beacons than needed, slow charging, and a gate that takes time to open. */
export const BEACONS_NEEDED = 5, CHARGE_SECONDS = 40, GATE_SECONDS = 12, HEAD_START = 5, PULSE_EVERY = 4, ESCAPE_RANGE = 90;
export const DURATIONS = [180, 240, 300] as const;
export const BOT_ACCURACY = .8;
/** Phase 2–3 tools. Cages eliminate a pet unless rescued; traps and one sensor let the hunter control space. */
export const CAGE_SECONDS = 60, TRAPS_PER_ROUND = 3, TRAP_STUN = 1.8, SENSOR_RANGE = 170, VENT_SECONDS = 1.2, VENT_COOLDOWN = 6, CARRY_PACE = .7, USE_RANGE = 55;
// Bot hunter speed per difficulty, tuned by simulating bot rounds on generated maps: normal lands near an even split.
// Gentle is faster than normal on purpose: its hunter's aim wobbles and reloads slowly, so pace alone keeps rounds from ending early.
export const HUNTER_PACE: Record<Difficulty, number> = { gentle: .97, normal: .87, tricky: 1 };
// Tricky hunters mostly win by listening better, not by being faster than the pets.
export const HUNTER_HEARING: Record<Difficulty, number> = { gentle: .9, normal: 1, tricky: 1.3 };
export const SPECIES = ['koala_sprite','ember_fox','moss_turtle','luna_owl','clover_rabbit','ripple_otter','nova_axolotl','bramble_hedgehog','zephyr_dragon','slime_baby','mech_bot','subtrak'] as const;
export const PET_NAMES = ['Pip','Ember','Moss','Luna','Clover','Ripple','Nova','Bramble','Zephyr','Slime','Mech Bot','Subtrak'];
export const KITS: Record<Kit, { name: string; description: string }> = {
  scout: { name: 'Scout', description: 'Drop a noisy decoy to distract the hunter.' },
  helper: { name: 'Helper', description: 'Rescue faster. Create a protective shield.' },
  trickster: { name: 'Trickster', description: 'Drop concealing smoke to slip away.' },
};
export interface Arena { id: string; name: string; tagline: string; colors: [string,string,string]; walls: Rect[]; bushes: Rect[]; beacons: Vec[]; portal: Vec;
  lockers?: Vec[]; vents?: [Vec,Vec][]; cages?: Vec[]; door?: Rect|null; key?: Vec|null;
  /** Typed obstacles for drawing (same rects as walls); absent on the fixed legacy arenas. */
  pieces?: import('./mapgen').Piece[]; }
const commonBeacons = [{x:130,y:120},{x:560,y:100},{x:980,y:140},{x:260,y:550},{x:850,y:530}];
export const ARENAS: Arena[] = [
  {id:'garden',name:'Overgrown Garden',tagline:'Rustling leaves. Hidden paths. One way home.',colors:['#112c2c','#1b4037','#58d8ad'],
   walls:[{x:220,y:180,w:170,h:55},{x:650,y:180,w:170,h:55},{x:450,y:320,w:60,h:140},{x:680,y:420,w:180,h:50},{x:170,y:370,w:110,h:60},{x:940,y:310,w:55,h:130}],
   bushes:[{x:80,y:260,w:110,h:65},{x:390,y:100,w:85,h:65},{x:800,y:290,w:100,h:75},{x:370,y:550,w:100,h:65},{x:680,y:550,w:95,h:70}],beacons:commonBeacons,portal:{x:560,y:650}},
  {id:'workshop',name:'Clockwork Workshop',tagline:'Duck behind crates. Outsmart the sentinel.',colors:['#252335','#40334a','#ffc77b'],
   walls:[{x:210,y:160,w:55,h:190},{x:380,y:200,w:130,h:55},{x:650,y:180,w:190,h:55},{x:760,y:360,w:55,h:150},{x:350,y:440,w:190,h:55},{x:920,y:370,w:100,h:55}],
   bushes:[{x:75,y:340,w:95,h:80},{x:530,y:200,w:80,h:85},{x:880,y:220,w:95,h:70},{x:170,y:550,w:95,h:70},{x:610,y:510,w:100,h:75}],beacons:commonBeacons,portal:{x:560,y:650}},
  {id:'moonhouse',name:'Moonlit Greenhouse',tagline:'Follow the fireflies. Watch the moonlight.',colors:['#151c38','#233557','#c1a4ff'],
   walls:[{x:190,y:220,w:190,h:45},{x:520,y:170,w:50,h:160},{x:720,y:230,w:190,h:45},{x:310,y:410,w:50,h:140},{x:540,y:430,w:170,h:50},{x:920,y:420,w:60,h:130}],
   bushes:[{x:75,y:350,w:100,h:90},{x:360,y:115,w:95,h:70},{x:670,y:100,w:100,h:70},{x:740,y:540,w:100,h:65},{x:400,y:540,w:85,h:65}],beacons:commonBeacons,portal:{x:560,y:650}},
];
/** `answer` is a spark-check choice (0–2, or -1 for none) for the check whose id is `answerFor`; repeats are ignored. */
export interface Input { x: number; y: number; aim: number; fire: boolean; interact: boolean; gadget: boolean; quiet: boolean; trap: boolean; sensor: boolean; answer: number; answerFor: number; }
export const idleInput = (): Input => ({x:0,y:0,aim:0,fire:false,interact:false,gadget:false,quiet:false,trap:false,sensor:false,answer:-1,answerFor:-1});
export function sanitizeInput(value: unknown): Input | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string,unknown>;
  if (!['x','y','aim'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]))) return null;
  return {x:Math.max(-1,Math.min(1,v.x as number)),y:Math.max(-1,Math.min(1,v.y as number)),aim:(v.aim as number) % (Math.PI*2),fire:v.fire===true,interact:v.interact===true,gadget:v.gadget===true,quiet:v.quiet===true,trap:v.trap===true,sensor:v.sensor===true,answer:[0,1,2].includes(v.answer as number)?v.answer as number:-1,answerFor:Number.isInteger(v.answerFor)?v.answerFor as number:-1};
}
export interface Player extends Vec {
  id: string; name: string; species: string; role: Role; kit: Kit; bot: boolean; connected: boolean;
  aim: number; moving: boolean; quiet: boolean; hidden: boolean; action: string; hp: number;
  captured: boolean; escaped: boolean; captureTime: number; rescue: number; escape: number;
  stun: number; immune: number; shot: number; cooldown: number; gadgetCooldown: number; shield: number;
  ammo: number; reload: number; noise: number; beaconScore: number; rescues: number; tags: number;
  target: Vec | null; memory: number;
  /** Locker index while hiding (-1 when not); vent crawl time left and destination; seconds left in a cage (0 = not caged). */
  locker: number; vent: number; ventTo: Vec | null; ventCooldown: number; caged: number;
  /** Out for the round: the cage timer ran out before a rescue. */
  out: boolean;
  /** Hunter only: the caught pet being carried to a cage. */
  carrying: string | null;
  lastInteract: boolean; lastTrap: boolean; lastSensor: boolean; hideTime: number;
  /** Beacon being charged (-1 none), the open spark check, seconds until the next one, the learner's grade, and the last result for feedback. */
  charging: number; check: SparkCheck | null; checkIn: number; grade: number; lastCheck: 'right' | 'wrong' | null; lastCheckTick: number;
  /** Growth stage of the learner's own pet, so the arena shows the pet they raised. */
  stage: PetStage;
}
export type PetStage = 'baby' | 'juvenile' | 'adult';
export interface Bullet extends Vec { id: number; owner: string; role: Role; vx: number; vy: number; life: number; }
export interface Effect extends Vec { id: number; kind: 'smoke'|'decoy'|'pulse'|'hit'|'rescue'|'escape'|'beacon'|'ping'|'spark'; life: number; }
export interface Match {
  map: string; difficulty: Difficulty; duration: number; time: number; phase: 'lobby'|'playing'|'finished'; paused: boolean;
  winner: 'runners'|'hunter'|'ended'|null; players: Player[]; beacons: (Vec & {progress:number})[]; bullets: Bullet[]; effects: Effect[];
  nextId: number; tick: number; message: string;
  /** Procedural layout seed; absent only for the fixed legacy arenas used by rule tests. */
  seed?: number;
  gate: { state: 'closed'|'opening'|'open'; left: number };
  doorOpen: boolean; key: (Vec & { holder: string | null }) | null; lockers: (string | null)[];
  traps: (Vec & { id: number })[]; trapsLeft: number; sensor: (Vec & { cool: number }) | null;
  /** Teacher option: longer spark-check timer and no noise or setback for a miss. */
  relaxed: boolean;
  /** A class rival driving the computer hunter: its remembered search spots and learned counters. Server-only. */
  rival?: RivalBrief;
  /** What the rival noticed about each human runner this round, for its long-term memory. Server-only. */
  rivalLog?: Record<string, { spots: Vec[]; decoys: number; quiet: number; seenTick: number }>;
}
export interface RivalBrief { id: string; name: string; species: string; edge: number; decoyResistance: number; hearing: number; beaconWatch: number; search: Vec[] }
export interface View extends Omit<Match,'players'|'rival'|'rivalLog'> { players: Omit<Player,'target'|'memory'>[]; you: string; hiddenCount: number; }
const arenaCache=new Map<string,Arena>();
/** The arena a match is played on: generated from its seed, or a fixed legacy layout when it has none. */
export function arenaOf(m:{map:string;seed?:number}):Arena {
  const theme=ARENAS.find(a=>a.id===m.map)??ARENAS[0];
  if(m.seed===undefined)return theme;
  const key=`${theme.id}:${m.seed}`;let arena=arenaCache.get(key);
  if(!arena){arena=arenaFromLayout(theme,generateLayout(theme.id,m.seed));if(arenaCache.size>32)arenaCache.clear();arenaCache.set(key,arena);}
  return arena;
}
export const newSeed=()=>Math.floor(Math.random()*2**31);
export function createMatch(map='garden',difficulty:Difficulty='normal',duration=240,seed?:number,relaxed=false): Match {
  const theme=ARENAS.find(a=>a.id===map)??ARENAS[0],arena=arenaOf({map:theme.id,seed});
  return {map:theme.id,...(seed!==undefined?{seed}:{}),difficulty,duration,time:duration,phase:'lobby',paused:false,winner:null,players:[],beacons:arena.beacons.map(p=>({...p,progress:0})),bullets:[],effects:[],nextId:1,tick:0,gate:{state:'closed',left:GATE_SECONDS},doorOpen:!arena.door,key:arena.key?{...arena.key,holder:null}:null,lockers:(arena.lockers??[]).map(()=>null),traps:[],trapsLeft:TRAPS_PER_ROUND,sensor:null,relaxed,message:'Choose a role. The empty seats become computer pets.'};
}
function spawnFor(m:Match,role:Role,index:number):Vec {
  if(m.seed===undefined)return role==='hunter'?{x:560,y:355}:{x:140+index*275,y:640};
  const l=generateLayout(m.map,m.seed);return role==='hunter'?l.hunterSpawn:l.runnerSpawn[index%l.runnerSpawn.length];
}
export function addPlayer(m:Match,id:string,name:string,role:Role,species:string='ember_fox',kit:Kit='scout',bot=false): Player {
  const runners=m.players.filter(p=>p.role==='runner').length;
  const p:Player={id,name:name.slice(0,24),species:SPECIES.includes(species as typeof SPECIES[number])?species:'ember_fox',role,kit,bot,connected:!bot,
    ...spawnFor(m,role,runners),aim:-Math.PI/2,moving:false,quiet:false,hidden:false,action:'idle',hp:2,captured:false,escaped:false,captureTime:0,rescue:0,escape:0,stun:0,immune:0,shot:0,cooldown:0,gadgetCooldown:0,shield:0,ammo:3,reload:0,noise:0,beaconScore:0,rescues:0,tags:0,target:null,memory:0,locker:-1,vent:0,ventTo:null,ventCooldown:0,caged:0,out:false,carrying:null,lastInteract:false,lastTrap:false,lastSensor:false,hideTime:0,charging:-1,check:null,checkIn:CHECK_GAP[0],grade:3,lastCheck:null,lastCheckTick:0,stage:bot?'baby':'adult'};
  m.players.push(p);return p;
}
/** Backfill rooms persisted before spark checks and growth-stage artwork shipped. */
export function upgradeMatch(m: Match): Match {
  m.relaxed ??= false;
  for (const p of m.players) {
    p.charging ??= -1; p.check ??= null; p.checkIn ??= CHECK_GAP[0];
    p.grade ??= 3; p.lastCheck ??= null; p.lastCheckTick ??= 0;
    p.stage ??= p.bot ? 'baby' : 'adult';
  }
  return m;
}
export function startMatch(m:Match): void {
  if(m.phase!=='lobby')return;
  if(!m.players.some(p=>p.role==='hunter'))addPlayer(m,'bot-hunter',m.rival?.name??'Bramble Sentinel','hunter',m.rival?.species??'bramble_hedgehog','scout',true);
  while(m.players.filter(p=>p.role==='runner').length<4){const i=m.players.filter(p=>p.role==='runner').length;addPlayer(m,`bot-${i}`,PET_NAMES[i+1],'runner',SPECIES[i+1],(['scout','helper','trickster'] as Kit[])[i%3],true);}
  m.phase='playing';m.message=`Light ${BEACONS_NEEDED} beacons, rescue your friends, and escape through the gate!`;
}
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const inside=(p:Vec,r:Rect,pad=0)=>p.x>=r.x-pad&&p.x<=r.x+r.w+pad&&p.y>=r.y-pad&&p.y<=r.y+r.h+pad;
const resolve=(map:string|Arena)=>typeof map==='string'?ARENAS.find(a=>a.id===map)!:map;
// While the locked door is shut it is a wall for movement, sight, shots and bot paths alike.
const shutCache=new WeakMap<Arena,Arena>();
export function playArena(m:Match):Arena{
  const arena=arenaOf(m);if(!arena.door||m.doorOpen)return arena;
  let shut=shutCache.get(arena);if(!shut){shut={...arena,walls:[...arena.walls,arena.door]};shutCache.set(arena,shut);}
  return shut;
}
export function blocked(map:string|Arena,p:Vec):boolean {
  return p.x<RADIUS+8||p.y<RADIUS+8||p.x>WIDTH-RADIUS-8||p.y>HEIGHT-RADIUS-8||resolve(map).walls.some(r=>inside(p,r,RADIUS));
}
export function lineClear(map:string|Arena,a:Vec,b:Vec):boolean {
  const steps=Math.ceil(distance(a,b)/10),walls=resolve(map).walls;
  for(let i=1;i<=steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(walls.some(r=>inside(p,r)))return false;}return true;
}
function concealed(m:Match,p:Player):boolean {
  if(p.role==='runner'&&(p.locker>=0||p.vent>0))return true;
  return p.role==='runner'&&!p.captured&&!p.escaped&&p.noise<=0&&((!p.moving||p.quiet)&&arenaOf(m).bushes.some(r=>inside(p,r))||m.effects.some(e=>e.kind==='smoke'&&distance(e,p)<90));
}
export function visible(m:Match,observer:Player,target:Player):boolean {
  if(observer.id===target.id||observer.role===target.role||target.captured||target.escaped)return true;
  // A pet inside a locker or crawling through a vent cannot be seen at any distance; the hunter has to check the locker.
  if(target.locker>=0||target.vent>0)return false;
  return distance(observer,target)<430&&lineClear(playArena(m),observer,target)&&(!concealed(m,target)||distance(observer,target)<58);
}
export function viewFor(m:Match,id:string,spectator=false):View {
  const observer=m.players.find(p=>p.id===id);
  const seen=m.players.filter(p=>spectator||m.phase!=='playing'||observer&&visible(m,observer,p));
  const {rival,rivalLog,...shared}=m;void rival;void rivalLog;
  const hunterView=spectator||observer?.role==='hunter';
  return {...shared,you:id,
    // The hunter never learns which locker is occupied; runners never see traps until they are right on top of them.
    lockers:hunterView&&!spectator?m.lockers.map(()=>null):m.lockers,
    traps:hunterView?m.traps:m.traps.filter(t=>observer&&distance(observer,t)<70),hiddenCount:m.players.length-seen.length,players:seen.map(p=>{
    // Never serialize bot targets/last-known positions to an opposing player.
    const {target,memory,...safe}=p;void target;void memory;
    // Only you see your own spark check, and never its answer.
    const check=p.id===id&&p.check?{...p.check,answer:-1}:null;
    return {...safe,check,hidden:concealed(m,p)};
  }),bullets:m.bullets.filter(b=>spectator||observer&&(distance(observer,b)<440&&lineClear(playArena(m),observer,b))),
    effects:m.effects.filter(e=>e.kind==='ping'?hunterView:spectator||e.kind==='decoy'||e.kind==='pulse'||e.kind==='beacon'||observer&&distance(observer,e)<440),
  };
}
function move(m:Match,p:Player,x:number,y:number,dt:number,speed:number){
  const n=Math.max(1,Math.hypot(x,y));x=x/n*speed*dt;y=y/n*speed*dt;
  // Axis separation prevents corner tunnelling and gives predictable wall sliding.
  if(!blocked(playArena(m),{x:p.x+x,y:p.y}))p.x+=x;
  if(!blocked(playArena(m),{x:p.x,y:p.y+y}))p.y+=y;
}
function release(m:Match,p:Player){p.caged=0;p.captured=false;p.hp=2;p.rescue=0;p.immune=5;p.captureTime=0;effect(m,'rescue',p,1);m.message=`${p.name} is free!`;}
function effect(m:Match,kind:Effect['kind'],p:Vec,life:number){m.effects.push({id:m.nextId++,kind,x:p.x,y:p.y,life});}
// Grid BFS only when direct travel is blocked. Small fixed maps, no dynamic nav mesh.
// Which grid cells are walls, computed once per arena: bots path every tick on the server.
const navCache=new WeakMap<Arena,Uint8Array>();
function navGrid(arena:Arena,cols:number,rows:number,cell:number){
  let grid=navCache.get(arena);
  if(!grid){grid=new Uint8Array(cols*rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)grid[y*cols+x]=blocked(arena,{x:x*cell+20,y:y*cell+20})?1:0;navCache.set(arena,grid);}
  return grid;
}
// Open cells reachable from the runners' start, per arena variant (door shut or open), so bots skip beacons behind a locked door.
const reachCache=new WeakMap<Arena,Uint8Array>();
function reachableFromStart(m:Match){
  const arena=playArena(m),cached=reachCache.get(arena);if(cached)return cached;
  const cell=40,cols=Math.ceil(WIDTH/cell),rows=Math.ceil(HEIGHT/cell),solid=navGrid(arena,cols,rows,cell),seen=new Uint8Array(cols*rows);
  const start=spawnFor(m,'runner',0),s0=Math.floor(start.y/cell)*cols+Math.floor(start.x/cell),queue=[s0];seen[s0]=1;
  for(let q=0;q<queue.length;q++){const k=queue[q];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=k%cols+dx,y=Math.floor(k/cols)+dy,n=y*cols+x;if(x<0||x>=cols||y<0||y>=rows||seen[n]||solid[n])continue;seen[n]=1;queue.push(n);}}
  reachCache.set(arena,seen);return seen;
}
const reachableNow=(m:Match,v:Vec)=>m.doorOpen||!!reachableFromStart(m)[Math.floor(v.y/40)*Math.ceil(WIDTH/40)+Math.floor(v.x/40)];
export function waypoint(m:Match,p:Vec,target:Vec):Vec {
  const steps=Math.ceil(distance(p,target)/18);
  if(Array.from({length:steps},(_,i)=>({x:p.x+(target.x-p.x)*(i+1)/steps,y:p.y+(target.y-p.y)*(i+1)/steps})).every(v=>!blocked(playArena(m),v)))return target;
  const cell=40,cols=Math.ceil(WIDTH/cell),rows=Math.ceil(HEIGHT/cell),solid=navGrid(playArena(m),cols,rows,cell),idx=(v:Vec)=>Math.max(0,Math.min(rows-1,Math.floor(v.y/cell)))*cols+Math.max(0,Math.min(cols-1,Math.floor(v.x/cell)));
  const start=idx(p),goal=idx(target),queue=[start],prev=new Map<number,number>([[start,-1]]);let found=start,best=Infinity;
  for(let q=0;q<queue.length;q++){const k=queue[q],v={x:k%cols*cell+20,y:Math.floor(k/cols)*cell+20},d=distance(v,target);if(d<best){best=d;found=k;}if(k===goal)break;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=k%cols+dx,y=Math.floor(k/cols)+dy,n=y*cols+x;if(x<0||x>=cols||y<0||y>=rows||prev.has(n)||solid[n])continue;prev.set(n,k);queue.push(n);}}
  while(prev.get(found)!==start&&prev.get(found)!==-1)found=prev.get(found)!;
  return {x:found%cols*cell+20,y:Math.floor(found/cols)*cell+20};
}
/** Each cage holds one pet, so the hunter can never cage the whole team at once and has to choose. */
export function freeCages(m:Match):Vec[]{return (arenaOf(m).cages??[]).filter(c=>!m.players.some(p=>p.caged>0&&distance(p,c)<10));}
export function botInput(m:Match,p:Player):Input {
  const input=idleInput(),hunter=m.players.find(v=>v.role==='hunter')!,open=m.gate.state!=='closed';
  if(p.captured||p.escaped||p.out)return input;
  let target:Vec|undefined;
  const arena=arenaOf(m);
  if(p.role==='hunter'){
    const nearest=(list:Vec[])=>[...list].sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const busyBeacon=m.beacons.find(b=>b.progress>0&&b.progress<1&&distance(p,b)<60);
    // Tools: a trap where pets are working or on the way to the gate; the one sensor near an active beacon.
    input.trap=m.trapsLeft>0&&(!!busyBeacon||m.gate.state!=='closed'&&distance(p,arena.portal)<220)&&!m.traps.some(t=>distance(t,p)<150);
    input.sensor=!m.sensor&&!!busyBeacon;
    if(p.carrying){const cage=nearest(freeCages(m));if(cage){input.interact=distance(p,cage)<60;target=cage;}else input.interact=true;}
    else{
      const bubble=m.players.filter(v=>v.role==='runner'&&v.captured&&!v.out&&v.caged<=0&&distance(v,p)<260).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      const vanished=p.memory>0&&p.target?(arena.lockers??[]).find(l=>distance(l,p.target!)<90):undefined;
      if(bubble&&freeCages(m).some(c=>distance(c,bubble)<900)){target=bubble;input.interact=distance(p,bubble)<50;}
      else if(vanished&&!m.players.some(v=>v.role==='runner'&&!v.captured&&visible(m,p,v))){target=vanished;input.interact=distance(p,vanished)<USE_RANGE;}
    }
  }
  if(p.role==='hunter'&&!target){
    const prey=m.players.filter(v=>v.role==='runner'&&!v.captured&&!v.escaped&&visible(m,p,v)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(prey){target=prey;p.target={x:prey.x,y:prey.y};p.memory=3;noteSighting(m,prey);input.aim=Math.atan2(prey.y-p.y,prey.x-p.x);input.fire=distance(p,prey)<340;input.gadget=distance(p,prey)>200;}
    else {
      // A rival that has been fooled by decoys before sometimes sees through them (deterministic per tick, no hidden randomness).
      const decoy=m.rival&&(m.tick*37%100)/100<m.rival.decoyResistance?undefined:m.effects.find(e=>e.kind==='decoy');
      // Coarse sound location, not omniscient coordinates of hidden runners.
      const noisy=m.players.find(v=>v.role==='runner'&&v.noise>0&&distance(p,v)<350*HUNTER_HEARING[m.difficulty]*(1+(m.rival?.hearing??0)));
      // A beacon hum is a clue anywhere on the map; the gate opening means guard the exit.
      const hum=m.effects.filter(e=>e.kind==='beacon').sort((a,b)=>b.life-a.life)[0];
      const gate=m.gate.state==='closed'?undefined:{x:arenaOf(m).portal.x,y:arenaOf(m).portal.y+110};
      target=decoy??(noisy?{x:Math.round(noisy.x/80)*80,y:Math.round(noisy.y/80)*80}:p.memory>0?p.target??undefined:gate??hum);
      if(!target){
        // A rival checks where these pets hid before, then watches half-lit beacons if it has learned to.
        const beacons=m.rival&&m.rival.beaconWatch>0.2?[...m.beacons].sort((a,b)=>(b.progress<1?b.progress:-1)-(a.progress<1?a.progress:-1)):m.beacons;
        const sites=[...(m.rival?.search??[]),...beacons,arenaOf(m).portal];target=sites[Math.floor((m.duration-m.time)/8)%sites.length];
      }
    }
  }else if(p.role==='runner'){
    // Computer pets answer like a quick classmate: a short pause, usually right.
    if(p.check){const think=1.2+(p.id.length%5)*.2,rand=seededRandom(p.check.id*31+p.id.length);if(p.check.total-p.check.left>=think){input.answerFor=p.check.id;input.answer=rand()<BOT_ACCURACY?p.check.answer:(p.check.answer+1)%3;}}
    const endangered=visible(m,p,hunter)&&distance(p,hunter)<210&&!hunter.stun;
    const carried=new Set(m.players.map(h=>h.carrying));
    const rescue=m.players.filter(v=>v.captured&&!v.out&&!carried.has(v.id)&&distance(v,hunter)>110).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    const hide=(arena.lockers??[]).map((l,k)=>({l,k})).filter(({l,k})=>m.lockers[k]===null&&distance(p,l)<140).sort((a,b)=>distance(p,a.l)-distance(p,b.l))[0];
    const vent=p.ventCooldown<=0?(arena.vents??[]).flat().filter(v=>distance(p,v)<110).sort((a,b)=>distance(p,a)-distance(p,b))[0]:undefined;
    const doorAt=arena.door&&!m.doorOpen?{x:arena.door.x+arena.door.w/2,y:arena.door.y+arena.door.h/2}:null;
    if(p.locker>=0){
      // Stay hidden while the hunter is close; slip out once it has moved on or after a while.
      if(distance(p,hunter)<320&&p.hideTime<8)return input;
      const next=m.beacons.filter(b=>b.progress<1&&reachableNow(m,b)).sort((a,b)=>distance(p,a)-distance(p,b))[0]??arena.portal;target=next;
    }
    else if(endangered&&hide&&distance(hunter,hide.l)>90){target=hide.l;input.interact=distance(p,hide.l)<USE_RANGE-5;}
    else if(endangered&&vent){target=vent;input.interact=distance(p,vent)<USE_RANGE-5;}
    else if(endangered){target={x:Math.max(40,Math.min(WIDTH-40,p.x+(p.x-hunter.x)*2)),y:Math.max(40,Math.min(HEIGHT-40,p.y+(p.y-hunter.y)*2))};input.aim=Math.atan2(hunter.y-p.y,hunter.x-p.x);input.fire=true;input.gadget=true;}
    else if(rescue){target=rescue;input.interact=distance(p,rescue)<62;}
    else if(open){target=arenaOf(m).portal;input.interact=m.gate.state==='open'&&distance(p,target)<ESCAPE_RANGE-20;}
    else if(m.key&&m.key.holder===p.id&&doorAt){target=doorAt;input.interact=distance(p,doorAt)<80;}
    else if(m.key&&!m.key.holder&&doorAt&&distance(p,m.key)<700&&!m.players.some(v=>v.id!==p.id&&v.role==='runner'&&!v.captured&&distance(v,m.key!)<distance(p,m.key!))){target=m.key;}
    else {
      // Spread out: a beacon a teammate is already working on costs extra, so the team covers more of the map.
      const busy=(b:Vec)=>m.players.filter(v=>v.role==='runner'&&v.id!==p.id&&!v.captured&&!v.escaped&&distance(v,b)<150).length;
      const choices=m.beacons.filter(b=>b.progress<1&&reachableNow(m,b)).sort((a,b)=>distance(p,a)+busy(a)*600-(distance(p,b)+busy(b)*600));target=choices[0];input.interact=!!target&&distance(p,target)<62;
    }
  }
  if(target&&!input.interact){const to=waypoint(m,p,target);input.x=to.x-p.x;input.y=to.y-p.y;const n=Math.max(1,Math.hypot(input.x,input.y));input.x/=n;input.y/=n;if(!input.fire)input.aim=Math.atan2(input.y,input.x);}
  return input;
}
export function step(m:Match,inputs:Record<string,Input>,dt:number):void {
  if(m.phase!=='playing'||m.paused)return;
  dt=Math.max(0,Math.min(.05,dt));m.time=Math.max(0,m.time-dt);m.tick++;
  const arena=arenaOf(m),hunter=m.players.find(p=>p.role==='hunter')!,elapsed=m.duration-m.time;
  for(const e of m.effects)e.life-=dt;m.effects=m.effects.filter(e=>e.life>0);
  const charging=new Map<Match['beacons'][number],Player[]>();
  for(const p of m.players){
    for(const k of ['stun','immune','shot','cooldown','gadgetCooldown','shield','noise','memory'] as const)p[k]=Math.max(0,p[k]-dt);
    p.ventCooldown=Math.max(0,p.ventCooldown-dt);p.moving=false;p.action='idle';
    if(p.charging>=0&&(p.captured||p.escaped||p.out||p.stun>0||p.locker>=0||p.vent>0)){p.charging=-1;p.check=null;}
    if(p.out){p.action='out';continue;}
    if(p.escaped){p.action='escape';continue;}
    if(p.captured){
      if(m.players.some(h=>h.carrying===p.id)){p.action='carried';continue;}
      // A caged pet waits for a friend; when the timer runs out it sits out the rest of the round.
      if(p.caged>0){p.action='caged';p.caged=Math.max(0,p.caged-dt);if(p.caged<=0){p.out=true;Object.assign(p,spawnFor(m,'runner',0));m.message=`${p.name} is out for this round. Keep going, team!`;}continue;}
      p.action='captured';p.captureTime+=dt*(distance(p,hunter)<115?2:1);if(p.captureTime>=24)release(m,p);continue;
    }
    if(p.vent>0){p.action='vent';p.vent=Math.max(0,p.vent-dt);if(p.vent<=0&&p.ventTo){p.x=p.ventTo.x;p.y=p.ventTo.y;p.ventTo=null;p.ventCooldown=VENT_COOLDOWN;}continue;}
    if(p.stun>0){p.action='stunned';continue;}
    if(p.role==='hunter'&&elapsed<HEAD_START){p.action='waiting';continue;}
    const raw=p.bot?botInput(m,p):inputs[p.id]??idleInput(),i=sanitizeInput(raw)??idleInput();p.aim=i.aim;p.quiet=i.quiet;
    // Taps act once per press (bots decide per tick); holds like charging and rescuing keep working while held.
    const tap=i.interact&&(p.bot||!p.lastInteract),trapTap=i.trap&&(p.bot||!p.lastTrap),sensorTap=i.sensor&&(p.bot||!p.lastSensor);
    p.lastInteract=i.interact;p.lastTrap=i.trap;p.lastSensor=i.sensor;
    if(p.locker>=0){p.action='hiding';p.hideTime+=dt;if(Math.hypot(i.x,i.y)>.05||tap){m.lockers[p.locker]=null;p.locker=-1;p.hideTime=0;if(tap)continue;}else continue;}
    const recovering=p.role==='hunter'&&(p.cooldown>0||p.ammo===0||i.fire);
    const speed=(p.role==='hunter'?174:153)*(recovering?.78:1)*(p.carrying?CARRY_PACE:1)*(i.quiet?.56:1)*(p.role==='hunter'&&p.bot?HUNTER_PACE[m.difficulty]*(m.rival?.edge??1):1);
    if(m.rival&&p.role==='runner'&&!p.bot&&i.quiet&&Math.hypot(i.x,i.y)>.05)logFor(m,p.id).quiet+=dt;
    if(Math.hypot(i.x,i.y)>.05){const before={x:p.x,y:p.y};move(m,p,i.x,i.y,dt,speed);p.moving=distance(before,p)>.01;p.action=i.quiet?'sneak':'run';if(!i.quiet)p.noise=.4;}
    p.reload+=dt;if(p.reload>=(p.role==='hunter'?HUNTER_RECHARGE:RUNNER_RECHARGE)){p.ammo=Math.min(3,p.ammo+1);p.reload=0;}
    if(i.fire&&p.cooldown<=0&&p.ammo>=1){p.ammo--;if(p.role==='hunter')p.reload=0;p.cooldown=p.role==='hunter'?(m.difficulty==='gentle'&&p.bot?1.1:.8):.7;p.shot=.22;p.noise=1.5;p.action='fire';
      const a=p.aim+(p.bot&&m.difficulty==='gentle'?Math.sin(m.tick*.05)*.18:0);
      m.bullets.push({id:m.nextId++,owner:p.id,role:p.role,x:p.x,y:p.y,vx:Math.cos(a)*500,vy:Math.sin(a)*500,life:.82});}
    if(i.gadget&&p.gadgetCooldown<=0&&(p.role!=='hunter'||p.ammo>0&&p.cooldown<=0)){p.gadgetCooldown=12;p.noise=1;
      if(p.role==='hunter'){effect(m,'pulse',p,1.2);for(const r of m.players)if(r.role==='runner'&&!r.captured&&!r.escaped&&distance(r,p)<240&&r.noise>0)effect(m,'decoy',{x:Math.round(r.x/80)*80,y:Math.round(r.y/80)*80},2);move(m,p,Math.cos(p.aim),Math.sin(p.aim),.05,700);}
      else if(p.kit==='scout'){if(m.rival&&!p.bot)logFor(m,p.id).decoys++;effect(m,'decoy',{x:Math.max(35,Math.min(WIDTH-35,p.x+Math.cos(p.aim)*180)),y:Math.max(35,Math.min(HEIGHT-35,p.y+Math.sin(p.aim)*180))},5);}
      else if(p.kit==='helper')p.shield=4;
      else effect(m,'smoke',p,5);
    }
    if(p.role==='runner'&&m.key&&!m.key.holder&&distance(p,m.key)<36){m.key.holder=p.id;m.message=`${p.name} found the key! Bring it to the locked door.`;}
    if(p.role==='runner'&&i.interact&&!i.fire){
      const carried=new Set(m.players.map(h=>h.carrying));
      const friend=m.players.find(v=>v.captured&&!v.out&&!carried.has(v.id)&&distance(v,p)<62&&lineClear(playArena(m),p,v));
      const beacon=m.beacons.find(v=>v.progress<1&&distance(v,p)<62&&lineClear(playArena(m),p,v));
      const door=arena.door,doorAt=door?{x:door.x+door.w/2,y:door.y+door.h/2}:null;
      const vent=tap&&p.ventCooldown<=0?(arena.vents??[]).map(([a,b])=>distance(p,a)<USE_RANGE?b:distance(p,b)<USE_RANGE?a:null).find(v=>v):null;
      const locker=tap?(arena.lockers??[]).findIndex((l,k)=>m.lockers[k]===null&&distance(p,l)<USE_RANGE):-1;
      if(friend){p.action='rescue';friend.rescue+=dt/(p.kit==='helper'?1.8:3);if(friend.rescue>=1){release(m,friend);p.rescues++;}}
      // Once the gate is open, one tap inside it is an escape: no hold, so the moment is clear for young players.
      else if(tap&&m.gate.state==='open'&&distance(p,arena.portal)<ESCAPE_RANGE){p.escaped=true;effect(m,'escape',p,2);m.message=`${p.name} escaped!`;}
      else if(tap&&m.key?.holder===p.id&&!m.doorOpen&&doorAt&&distance(p,doorAt)<90){m.doorOpen=true;m.key=null;effect(m,'pulse',doorAt,1);m.message=`${p.name} unlocked the door!`;}
      // One tap starts charging; the pet keeps charging while it stays close, answering spark checks as they pop up.
      else if(beacon)p.charging=m.beacons.indexOf(beacon);
      else if(vent){p.vent=VENT_SECONDS;p.ventTo={x:vent.x,y:vent.y};p.action='vent';}
      else if(locker>=0){const at=arena.lockers![locker];p.locker=locker;m.lockers[locker]=p.id;p.x=at.x;p.y=at.y;p.hideTime=0;p.action='hiding';}
    } else p.escape=0;
    if(p.role==='runner'&&p.charging>=0){
      const b=m.beacons[p.charging];
      if(!b||b.progress>=1||distance(p,b)>75||i.fire){p.charging=-1;p.check=null;}
      else{
        p.action='interact';const team=charging.get(b)??[];team.push(p);charging.set(b,team);
        const rand=seededRandom(((m.seed??0)^Math.imul(m.tick,2654435761))+p.id.length*977+p.x);
        if(!p.check){p.checkIn-=dt;if(p.checkIn<=0)p.check=makeCheck(m.nextId++,p.grade,rand,m.relaxed);}
        else{
          p.check.left-=dt;const answered=i.answerFor===p.check.id&&i.answer>=0;
          if(answered||p.check.left<=0){
            const right=answered&&i.answer===p.check.answer;
            if(right){b.progress=Math.min(1,b.progress+CHECK_BONUS);effect(m,'spark',b,.8);}
            // A miss makes the beacon sputter: the hunter hears it. Relaxed checks skip the penalty entirely.
            else if(!m.relaxed){b.progress=Math.max(0,b.progress-CHECK_SETBACK);p.noise=1.5;effect(m,'beacon',b,1.4);}
            p.lastCheck=right?'right':'wrong';p.lastCheckTick=m.tick;p.check=null;p.checkIn=CHECK_GAP[0]+rand()*(CHECK_GAP[1]-CHECK_GAP[0]);
          }
        }
      }
    }
    if(p.role==='hunter'){
      if(tap){
        const cage=freeCages(m).find(c=>distance(p,c)<70),pet=p.carrying?m.players.find(v=>v.id===p.carrying):undefined;
        if(pet&&cage){pet.caged=CAGE_SECONDS;pet.captureTime=0;pet.rescue=0;pet.x=cage.x;pet.y=cage.y;p.carrying=null;m.message=`${pet.name} is caged! Friends have ${CAGE_SECONDS} seconds to rescue them.`;}
        else if(pet)p.carrying=null;
        else{
          const li=(arena.lockers??[]).findIndex(l=>distance(p,l)<USE_RANGE+10),found=li>=0?m.players.find(v=>v.locker===li):undefined;
          if(found){m.lockers[li]=null;found.locker=-1;found.hideTime=0;found.hp--;found.immune=1.2;effect(m,'hit',found,.45);p.tags++;
            if(found.hp<=0){found.captured=true;found.captureTime=0;found.rescue=0;m.message=`Found ${found.name} in a locker!`;}else m.message=`${found.name} jumped out of a locker!`;}
          else if(li<0){const bubble=m.players.find(v=>v.role==='runner'&&v.captured&&!v.out&&v.caged<=0&&!m.players.some(h=>h.carrying===v.id)&&distance(v,p)<60);if(bubble){p.carrying=bubble.id;m.message=`The hunter picked up ${bubble.name}! Stun the hunter to drop them.`;}}
        }
      }
      if(trapTap&&m.trapsLeft>0){m.traps.push({id:m.nextId++,x:Math.round(p.x),y:Math.round(p.y)});m.trapsLeft--;}
      if(sensorTap)m.sensor={x:Math.round(p.x),y:Math.round(p.y),cool:0};
    }
    p.hidden=concealed(m,p);
  }
  for(const h of m.players){if(!h.carrying)continue;const pet=m.players.find(v=>v.id===h.carrying);if(!pet||!pet.captured||pet.out)h.carrying=null;else{pet.x=h.x;pet.y=h.y-18;}}
  const active=(p:Player)=>p.role==='runner'&&!p.captured&&!p.escaped&&!p.out&&p.locker<0&&p.vent<=0;
  for(const p of m.players){
    if(!active(p))continue;
    const trap=m.traps.find(t=>distance(t,p)<26);
    if(trap){m.traps=m.traps.filter(t=>t!==trap);p.stun=TRAP_STUN;effect(m,'ping',trap,2);m.message=`${p.name} stepped in a trap!`;}
  }
  if(m.sensor){m.sensor.cool=Math.max(0,m.sensor.cool-dt);const seen=m.sensor.cool<=0&&m.players.find(p=>active(p)&&distance(p,m.sensor!)<SENSOR_RANGE);
    // The sensor reports roughly where, not exactly who: the hunter still has to go look.
    if(seen){effect(m,'ping',{x:Math.round(seen.x/80)*80,y:Math.round(seen.y/80)*80},1.6);m.sensor.cool=3;}}
  if(m.key?.holder){const holder=m.players.find(p=>p.id===m.key!.holder);if(!holder||holder.captured||holder.out)m.key.holder=null;else if(holder.escaped){m.key.holder=null;m.key.x=arena.portal.x;m.key.y=arena.portal.y+60;}else{m.key.x=holder.x;m.key.y=holder.y;}}
  // Teammates speed a beacon up, but less than double, so splitting up across the map still matters.
  for(const [b,team] of charging){
    const before=b.progress*CHARGE_SECONDS;b.progress=Math.min(1,b.progress+dt*(1+.5*(team.length-1))/CHARGE_SECONDS);
    // Charging hums: a pulse every few seconds tells the hunter roughly where the team is working.
    if(Math.floor(b.progress*CHARGE_SECONDS/PULSE_EVERY)>Math.floor(before/PULSE_EVERY)&&b.progress<1){effect(m,'beacon',b,1.4);for(const p of team)p.noise=1.5;}
    if(b.progress>=1){for(const p of team)p.beaconScore++;const lit=m.beacons.filter(v=>v.progress>=1).length;m.message=lit>=BEACONS_NEEDED?m.message:`A beacon is glowing! ${lit} of ${BEACONS_NEEDED}.`;}
  }
  if(m.gate.state==='closed'&&m.beacons.filter(b=>b.progress>=1).length>=BEACONS_NEEDED){m.gate={state:'opening',left:GATE_SECONDS};m.message=`The gate is opening! ${GATE_SECONDS} seconds — get to the top of the map!`;effect(m,'pulse',arena.portal,1.2);}
  else if(m.gate.state==='opening'){m.gate={state:'opening',left:Math.max(0,m.gate.left-dt)};if(m.gate.left<=0){m.gate={state:'open',left:0};m.message='The gate is open! Tap ESCAPE inside the gate.';}}
  for(const b of m.bullets){
    b.life-=dt;
    // Substeps avoid shooting through thin walls/players between server ticks.
    for(let n=0;n<3&&b.life>0;n++){
      b.x+=b.vx*dt/3;b.y+=b.vy*dt/3;
      if(b.x<0||b.y<0||b.x>WIDTH||b.y>HEIGHT||arena.walls.some(r=>inside(b,r))){b.life=0;break;}
      const victim=m.players.find(p=>p.role!==b.role&&!p.captured&&!p.escaped&&!p.out&&p.locker<0&&p.vent<=0&&distance(p,b)<RADIUS+5);
      if(!victim)continue;b.life=0;
      if(victim.immune>0||victim.shield>0)continue;
      const owner=m.players.find(p=>p.id===b.owner);if(owner)owner.tags++;effect(m,'hit',victim,.45);
      if(victim.role==='hunter'){victim.stun=1.4;victim.immune=4;if(victim.carrying){victim.carrying=null;m.message='The hunter dropped a friend! Rescue them!';}}
      else{victim.hp--;victim.immune=1.8;if(victim.hp<=0){victim.captured=true;victim.captureTime=0;victim.rescue=0;m.message=`${victim.name} needs a rescue!`;}}
    }
  }
  m.bullets=m.bullets.filter(b=>b.life>0);
  const runners=m.players.filter(p=>p.role==='runner'),escaped=runners.filter(p=>p.escaped).length,stillIn=runners.filter(p=>!p.escaped&&!p.out).length;
  // Escape resolves first when the third escape and timeout share a tick.
  if(escaped>=3){m.winner='runners';m.phase='finished';m.message='The pets escaped together!';}
  // Once too many pets are out for three to escape, the round is decided; nobody waits out a lost clock.
  // A bubble opens on its own, so only pets that are caged or being carried to a cage count toward a wipe.
  else if(m.time<=0||escaped+stillIn<3||runners.every(p=>p.escaped||p.out||p.captured&&(p.caged>0||m.players.some(h=>h.carrying===p.id)))){m.winner='hunter';m.phase='finished';m.message=m.time<=0?'Time is up: fewer than three runners escaped.':escaped+stillIn<3?'Too many pets are out: the hunter wins this round.':'Every pet still inside is caged. The hunter wins!';}
}

function logFor(m:Match,id:string){m.rivalLog??={};return m.rivalLog[id]??={spots:[],decoys:0,quiet:0,seenTick:-999};}
/** Remember roughly where a human runner was spotted, at most every couple of seconds. */
function noteSighting(m:Match,prey:Player){
  if(!m.rival||prey.bot)return;const log=logFor(m,prey.id);
  if(m.tick-log.seenTick<40||log.spots.length>=12)return;log.seenTick=m.tick;log.spots.push({x:Math.round(prey.x),y:Math.round(prey.y)});
}
/** The finished round from the rival's point of view; null when no rival hunted or no human ran. */
export function rivalResult(m:Match){
  const hunter=m.players.find(p=>p.role==='hunter');
  if(!m.rival||m.phase!=='finished'||m.winner==='ended'||!hunter?.bot)return null;
  const students=m.players.filter(p=>p.role==='runner'&&!p.id.startsWith('bot-')).map(p=>{const log=m.rivalLog?.[p.id];return {
    studentId:p.id,petName:p.name,caught:p.captured,escaped:p.escaped,spots:log?.spots??[],kit:p.kit,
    fooledByDecoy:p.escaped&&(log?.decoys??0)>0,sneakedPast:p.escaped&&(log?.quiet??0)>=5,usedBeacons:p.beaconScore};});
  return students.length?{arenaId:m.map,hunterWon:m.winner==='hunter',students}:null;
}
