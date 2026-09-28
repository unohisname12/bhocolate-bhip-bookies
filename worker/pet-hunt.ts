import {returnProfile,type ReturnProfile} from '../src/features/pet-hunt/evolution/returnMath';
import {chooseEvolution} from '../src/features/pet-hunt/evolution/state';
import { DurableObject } from 'cloudflare:workers';
import { ApiError, digest, readBody, readCookie } from './security';
import { parseStored } from './game-state';
import { normalizeLearning } from '../src/services/game/curriculum';
import type { PetStage } from '../src/features/pet-hunt/model';
// Saved pets can be elders; the arena art has baby, juvenile and adult sheets.
const toStage=(s:string):PetStage=>s==='baby'||s==='juvenile'?s:'adult';
import { classRivals, masteredTopics, recordRivalMatch, rivalTaunts } from './rivals';
import { rivalEdge, rivalTitle, searchPlan, taunt, type Rival } from '../src/features/rivals/model';
import { ARENAS, DURATIONS, KITS, SPECIES, upgradeMatch, addPlayer, arenaOf, blocked, createMatch, newSeed, idleInput, rivalResult, sanitizeInput, startMatch, step, viewFor, type Difficulty, type Input, type Kit, type Match, type Mode, type Role } from '../src/features/pet-hunt/model';

type Actor = {id:string;name:string;teacher:boolean;species:string;sessionHash:string;grade:number;returnProfile?:ReturnProfile;stage?:PetStage};
type Config = {id:string;owner:string;classroom:string;name:string;mode:Mode;map:string;difficulty:Difficulty;duration:number;expires:number;relaxed?:boolean;ruleset?:'classic'|'evolution'};
type Seat = Actor & {role:Role;ready:boolean};
type Stored = {config:Config;match:Match;seats:Seat[];queue:Actor[];lastSaved:number;rival?:Rival;rivalRecorded?:boolean;taunts?:boolean};
type SocketMeta = {actor:Actor;lastInput:number;window:number;count:number};
type DirectoryRow = {id:string;owner:string;name:string;expires:number;config:string};
const configFrom=(body:Record<string,unknown>,actor:Actor,classroom:string):Config=>{
  if(!ARENAS.some(a=>a.id===body.map)||!['versus','coop','teacher'].includes(String(body.mode))||!['gentle','normal','tricky'].includes(String(body.difficulty))||!(body.ruleset==='evolution'?[540]:(DURATIONS as readonly number[])).includes(Number(body.duration)))throw new ApiError(400,'Choose a map, mode, difficulty, and round length.');
  if(body.mode==='teacher'&&!actor.teacher)throw new ApiError(403,'Your teacher opens Beat the Teacher rooms.');
  return {id:crypto.randomUUID(),owner:actor.id,classroom,name:body.mode==='teacher'?'Beat the Teacher':`${actor.name}’s hunting party`,mode:body.mode as Mode,map:String(body.map),difficulty:body.difficulty as Difficulty,duration:Number(body.duration),expires:Date.now()+90*60_000,relaxed:body.relaxed===true,ruleset:body.ruleset==='evolution'?'evolution':'classic'};
};
/** One object per arena. The class directory uses a separate object key. */
export class PetHuntRoom extends DurableObject<Env> {
  private data:Stored|null=null;
  private inputs=new Map<string,{value:Input;at:number}>();
  private timer:ReturnType<typeof setInterval>|null=null;
  private lastTick=0;
  private checking=false;
  private lastAuth=0;
  constructor(ctx:DurableObjectState,env:Env){
    super(ctx,env);
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS hunt_state (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS hunt_directory (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, expires INTEGER NOT NULL, config TEXT NOT NULL)');
    const row=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM hunt_state WHERE id=1').toArray()[0];
    if(row){this.data=JSON.parse(row.value) as Stored;upgradeMatch(this.data.match);if(this.data.match.phase==='playing'&&!this.data.match.paused){this.data.match.paused=true;this.data.match.message='The arena recovered safely. Your teacher or host can resume.';this.persist();}}
  }
  private persist(){if(this.data){this.data.lastSaved=Date.now();this.ctx.storage.sql.exec('INSERT INTO hunt_state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value',JSON.stringify(this.data));}}
  reserve(config:Config):Config {
    this.ctx.storage.sql.exec('DELETE FROM hunt_directory WHERE expires<?',Date.now());
    const prior=this.ctx.storage.sql.exec<DirectoryRow>('SELECT * FROM hunt_directory WHERE owner=?',config.owner).toArray()[0];
    if(prior){const existing=JSON.parse(prior.config) as Config;if((existing.ruleset??'classic')!==(config.ruleset??'classic'))throw new Error('Close your existing room before switching between Classic Hunt and Rift Hunt.');return existing;}
    const rows=this.ctx.storage.sql.exec<DirectoryRow>('SELECT * FROM hunt_directory').toArray();
    if(rows.length>=8)throw new Error('This class already has eight rooms. Close one before opening another.');
    this.ctx.storage.sql.exec('INSERT INTO hunt_directory VALUES(?,?,?,?,?)',config.id,config.owner,config.name,config.expires,JSON.stringify(config));return config;
  }
  directory():Config[]{this.ctx.storage.sql.exec('DELETE FROM hunt_directory WHERE expires<?',Date.now());return this.ctx.storage.sql.exec<DirectoryRow>('SELECT * FROM hunt_directory').toArray().map(r=>JSON.parse(r.config) as Config);}
  remove(id:string){this.ctx.storage.sql.exec('DELETE FROM hunt_directory WHERE id=?',id);}
  initialize(config:Config,actor:Actor,kit:Kit){
    if(this.data)return;
    const m=createMatch(config.map,config.difficulty,config.duration,newSeed(),config.relaxed===true,config.ruleset),role:Role=config.mode==='teacher'?'hunter':config.mode==='coop'?'runner':'hunter';
    Object.assign(addPlayer(m,actor.id,actor.name,role,actor.species,kit),{grade:actor.grade??3,returnProfile:actor.returnProfile,stage:actor.stage??'adult'});
    this.data={config,match:m,seats:[{...actor,role,ready:false}],queue:[],lastSaved:Date.now()};this.persist();
    this.ctx.waitUntil(this.ctx.storage.setAlarm(config.expires));
  }
  summary(){if(!this.data)return null;const d=this.data;return {id:d.config.id,name:d.config.name,mode:d.config.mode,map:d.config.map,ruleset:d.config.ruleset??'classic',phase:d.match.phase,count:d.seats.length};}
  private connected(id:string){return this.ctx.getWebSockets().some(w=>(w.deserializeAttachment() as SocketMeta).actor.id===id&&w.readyState===1);}
  private ensureSeat(actor:Actor,role?:Role):string|null {
    const d=this.data!,existing=d.seats.find(s=>s.id===actor.id);if(existing){if(d.match.phase==='lobby'){Object.assign(existing,{species:actor.species,stage:actor.stage??'adult',grade:actor.grade??3,returnProfile:actor.returnProfile});const p=d.match.players.find(p=>p.id===actor.id);if(p)Object.assign(p,{species:existing.species,stage:existing.stage,grade:existing.grade,returnProfile:existing.returnProfile});}return null;}
    if(d.match.phase!=='lobby')return 'This round is in progress. You are queued for the next round.';
    const desired=role??'runner';
    if(desired==='hunter'&&(d.config.mode==='coop'||d.config.mode==='teacher'&&!actor.teacher))return 'This room reserves the hunter role.';
    if(d.seats.filter(s=>s.role===desired).length>=(desired==='hunter'?1:4))return 'That team is full. You are queued for the next round.';
    d.seats.push({...actor,role:desired,ready:false});d.queue=d.queue.filter(a=>a.id!==actor.id);Object.assign(addPlayer(d.match,actor.id,actor.name,desired,actor.species),{grade:actor.grade??3,returnProfile:actor.returnProfile,stage:actor.stage??'adult'});return null;
  }
  async fetch(request:Request):Promise<Response>{
    if(!this.data||this.data.config.expires<Date.now())return new Response('Room expired',{status:410});
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
    // Only the authenticated outer Worker creates this header; it is overwritten there.
    const actor=JSON.parse(request.headers.get('x-hunt-actor')??'null') as Actor|null;
    if(!actor)return new Response('Sign in required',{status:401});
    for(const old of this.ctx.getWebSockets()){if((old.deserializeAttachment() as SocketMeta).actor.id===actor.id)old.close(4001,'Opened in another tab');}
    if(this.ctx.getWebSockets().filter(s=>s.readyState===1).length>=40)return new Response('Room full',{status:429});
    const issue=this.ensureSeat(actor);if(issue&&!actor.teacher&&!this.data.queue.some(p=>p.id===actor.id)&&this.data.queue.length<35)this.data.queue.push(actor);
    const player=this.data.match.players.find(p=>p.id===actor.id);if(player){player.bot=false;player.connected=true;}
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);server.serializeAttachment({actor,lastInput:0,window:Date.now(),count:0} satisfies SocketMeta);this.ctx.acceptWebSocket(server);
    this.persist();this.broadcast();if(issue)server.send(JSON.stringify({type:'error',message:actor.teacher?'You are spectating. Choose a role in the next lobby to play.':issue}));this.startTimer();
    return new Response(null,{status:101,webSocket:client});
  }
  private send(ws:WebSocket){
    if(!this.data||ws.readyState!==1)return;const a=(ws.deserializeAttachment() as SocketMeta).actor,d=this.data;
    const spectating=a.teacher&&!d.seats.some(s=>s.id===a.id);
    ws.send(JSON.stringify({type:'state',match:viewFor(d.match,a.id,spectating),host:a.id===d.config.owner||a.teacher,teacher:a.teacher,mode:d.config.mode,
      seats:d.seats.map(s=>({id:s.id,name:s.name,role:s.role,ready:s.ready,connected:this.connected(s.id)})),queue:d.queue.map(p=>p.name)}));
  }
  private broadcast(){for(const ws of this.ctx.getWebSockets())try{this.send(ws);}catch{ws.close(1011,'Connection interrupted');}}
  private startTimer(){if(this.timer)return;this.lastTick=Date.now();this.timer=setInterval(()=>this.tick(),100);}
  private stopTimer(){if(this.timer)clearInterval(this.timer);this.timer=null;}
  private tick(){
    const d=this.data;if(!d){this.stopTimer();return;}
    if(d.config.expires<=Date.now()){for(const ws of this.ctx.getWebSockets())ws.close(4003,'Room expired');this.stopTimer();return;}
    const sockets=this.ctx.getWebSockets().filter(w=>w.readyState===1);
    if(!sockets.length){if(d.match.phase==='playing'){d.match.paused=true;d.match.message='Waiting for someone to reconnect.';this.persist();}this.stopTimer();return;}
    if(d.match.phase==='playing'&&!d.match.paused){
      const input:Record<string,Input>={};for(const p of d.match.players){const value=this.inputs.get(p.id);input[p.id]=value&&Date.now()-value.at<350?value.value:idleInput();}
      const caughtBefore=new Set(d.match.players.filter(p=>p.captured||p.escaped).map(p=>`${p.id}:${p.escaped?'out':'caught'}`));
      let elapsed=Math.min(.2,Math.max(0,(Date.now()-this.lastTick)/1000));while(elapsed>.0001){const dt=Math.min(.05,elapsed);step(d.match,input,dt);elapsed-=dt;}
      this.rivalMoments(caughtBefore);
      this.persist();this.broadcast();
    }
    this.lastTick=Date.now();
    if(!this.checking&&Date.now()-this.lastAuth>30_000){this.checking=true;this.lastAuth=Date.now();this.ctx.waitUntil(this.revalidate().catch(()=>{
      // Stop accepting authenticated play if the session check itself fails.
      for(const ws of this.ctx.getWebSockets())ws.close(1011,'Session check unavailable');
    }).finally(()=>{this.checking=false;}));}
  }
  private async revalidate(){
    for(const ws of this.ctx.getWebSockets()){
      const a=(ws.deserializeAttachment() as SocketMeta).actor;
      const valid=await this.env.DB.prepare('SELECT role,actor_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(a.sessionHash,Date.now()).first<{role:string;actor_id:string}>();
      const active=a.teacher?true:!!(await this.env.DB.prepare('SELECT 1 FROM students WHERE id=? AND active=1 AND classroom_id=?').bind(a.id,this.data!.config.classroom).first());
      if(!valid||valid.actor_id!==a.id||valid.role!==(a.teacher?'teacher':'student')||!active)ws.close(4003,'Session ended');
    }
  }
  async webSocketMessage(ws:WebSocket,message:string|ArrayBuffer){
    if(!this.data||this.data.config.expires<=Date.now()){ws.close(4003,'Room expired');return;}
    if(typeof message!=='string'||message.length>2048){ws.close(1009,'Message too large');return;}
    const meta=ws.deserializeAttachment() as SocketMeta,now=Date.now();if(now-meta.window>=1000){meta.window=now;meta.count=0;}meta.count++;ws.serializeAttachment(meta);if(meta.count>45){ws.close(1008,'Too many inputs');return;}
    try{
      const payload=JSON.parse(message) as Record<string,unknown>;
      if(payload.type==='input'){const input=sanitizeInput(payload.input);if(input&&this.data.seats.some(s=>s.id===meta.actor.id))this.inputs.set(meta.actor.id,{value:input,at:now});return;}
      if(payload.type!=='command')return;
      const apply=()=>{this.act(meta.actor,payload);this.persist();this.broadcast();this.startTimer();};
      if(payload.action==='start'&&this.data.match.phase==='lobby'){
        // Check authority before the D1 reads; keep room commands from changing seats during rival setup.
        if(meta.actor.id!==this.data.config.owner&&!meta.actor.teacher)throw new Error('The host starts the round.');
        const failure=await this.ctx.blockConcurrencyWhile(async()=>{
          try{await this.attachRival();apply();return null;}
          catch(error){return error;} // Expected lobby errors must not reset the Durable Object.
        });
        if(failure)throw failure;
      }else apply();
    }catch(error){ws.send(JSON.stringify({type:'error',message:error instanceof Error?error.message:'The action was not accepted.'}));}
  }
  private act(a:Actor,v:Record<string,unknown>){
    const d=this.data!,m=d.match,host=a.id===d.config.owner||a.teacher,seat=d.seats.find(s=>s.id===a.id),player=m.players.find(p=>p.id===a.id);
    if(v.action==='leave'){
      d.queue=d.queue.filter(p=>p.id!==a.id);if(m.phase==='lobby'){d.seats=d.seats.filter(s=>s.id!==a.id);m.players=m.players.filter(p=>p.id!==a.id);}else if(player){player.bot=true;player.connected=false;}
      this.inputs.delete(a.id);return;
    }
    if(v.action==='close'){
      if(!a.teacher&&!host)throw new Error('Only the teacher or host can close a room.');
      d.config.expires=Date.now();
      this.ctx.waitUntil(this.env.PET_HUNT.getByName(`class:${d.config.classroom}`).remove(d.config.id));return;
    }
    if(v.action==='end'){
      if(!a.teacher&&!host)throw new Error('Only the teacher or room host can end a round.');m.phase='finished';m.winner='ended';m.message='The host ended this round.';
      return;
    }
    if(v.action==='pause'){
      // Host can resume recovery/empty-room pauses; ordinary player hosts cannot pause opponents at will.
      if(!a.teacher&&!(host&&m.paused))throw new Error('Only the teacher can pause a live room.');
      if(m.phase!=='playing')throw new Error('Start the round first.');m.paused=!m.paused;this.inputs.clear();this.lastTick=Date.now();return;
    }
    if(v.action==='rematch'){
      if(!host||m.phase!=='finished')throw new Error('The host opens the next round after results.');
      const humans=d.seats.filter(s=>this.connected(s.id));
      // Waiting players get first access; previous runners rotate through the queue.
      const waiting=d.queue.filter(q=>this.connected(q.id)),all=[...waiting,...humans].filter((a,i,list)=>list.findIndex(b=>b.id===a.id)===i);
      const nextHunter=d.config.mode==='coop'?null:d.config.mode==='teacher'?all.find(p=>p.teacher):all.find(p=>!humans.find(s=>s.id===p.id&&s.role==='hunter'))??all[0];
      d.match=createMatch(d.config.map,d.config.difficulty,d.config.duration,newSeed(),d.config.relaxed===true,d.config.ruleset);d.seats=[];d.queue=[];
      if(nextHunter){this.ensureSeat(nextHunter,'hunter');}
      for(const actor of all){if(actor.id===nextHunter?.id)continue;const issue=this.ensureSeat(actor,'runner');if(issue&&!actor.teacher)d.queue.push(actor);}
      this.inputs.clear();return;
    }
    if(v.action==='evolution-choice'){if(typeof v.choice!=='string'||!chooseEvolution(m,a.id,v.choice))throw new Error('Choose one of your available powers.');return;}
    if(m.phase!=='lobby')throw new Error('Choose roles and gadgets between rounds.');
    if(v.action==='role'){
      if(!['runner','hunter','spectator'].includes(String(v.role)))throw new Error('Choose runner or hunter.');
      if(v.role==='spectator'&&!a.teacher)throw new Error('Only a teacher can spectate the entire arena.');
      if(v.role==='hunter'&&(d.config.mode==='coop'||d.config.mode==='teacher'&&!a.teacher))throw new Error('This room reserves the hunter role.');
      if(v.role!=='spectator'&&d.seats.filter(s=>s.id!==a.id&&s.role===v.role).length>=(v.role==='hunter'?1:4))throw new Error('That team is full.');
      d.seats=d.seats.filter(s=>s.id!==a.id);m.players=m.players.filter(p=>p.id!==a.id);if(v.role!=='spectator')this.ensureSeat(a,v.role as Role);return;
    }
    if(v.action==='kit'){if(!seat||!player||typeof v.kit!=='string'||!Object.hasOwn(KITS,v.kit))throw new Error('Choose a runner gadget.');player.kit=v.kit as Kit;seat.ready=false;return;}
    if(v.action==='ready'){if(!seat)throw new Error('Choose an available role first.');seat.ready=!seat.ready;return;}
    if(v.action==='start'){
      if(!host)throw new Error('The host starts the round.');
      const connectedSeats=d.seats.filter(s=>this.connected(s.id));
      if(!connectedSeats.length||connectedSeats.some(s=>!s.ready))throw new Error('Every connected player must press Ready.');
      if(d.config.mode==='teacher'&&!connectedSeats.some(s=>s.teacher&&s.role==='hunter'))throw new Error('The teacher must take the hunter role.');
      d.seats=connectedSeats;m.players=m.players.filter(p=>d.seats.some(s=>s.id===p.id));
      startMatch(m);this.inputs.clear();this.lastTick=Date.now();return;
    }
    throw new Error('Unknown arena action.');
  }
  webSocketClose(ws:WebSocket,code:number,reason:string){
    const meta=ws.deserializeAttachment() as SocketMeta;
    // Browsers report 1005/1006 when no close status arrived; those codes cannot be sent back.
    try{ws.close([1004,1005,1006,1015].includes(code)?1000:code,reason);}catch{/* Finish disconnect cleanup even if the peer has already closed. */}
    if(!this.connected(meta.actor.id)){
      const p=this.data?.match.players.find(p=>p.id===meta.actor.id);if(p){p.connected=false;p.bot=true;}
      const seat=this.data?.seats.find(s=>s.id===meta.actor.id);if(seat)seat.ready=false;
      this.inputs.delete(meta.actor.id);this.persist();this.broadcast();
    }
  }
  webSocketError(ws:WebSocket){this.webSocketClose(ws,1011,'Connection interrupted');}
  /** Before a round, a class rival takes the computer hunter's seat, unless a person is hunting or it's teacher mode. */
  private async attachRival(){
    const d=this.data!;d.rival=undefined;d.rivalRecorded=false;d.match.rival=undefined;d.match.rivalLog=undefined;
    if(d.config.mode==='teacher'||d.seats.some(s=>s.role==='hunter'))return;
    try{
      const rivals=(await classRivals(this.env.DB,d.config.classroom)).map(r=>r.rival);
      // Rotate: the rival this class has faced least goes next.
      const rival=rivals.sort((a,b)=>a.wins+a.losses-(b.wins+b.losses))[0];if(!rival)return;
      const runners=d.seats.filter(s=>s.role==='runner'&&!s.teacher).map(s=>s.id);
      const edges=await Promise.all(runners.map(async id=>rivalEdge(rival,await masteredTopics(this.env.DB,id))));
      d.match.rival={id:rival.id,name:rivalTitle(rival),species:rival.species,edge:edges.length?edges.reduce((a,b)=>a+b,0)/edges.length:1,...rival.adaptations,search:searchPlan(rival,d.match.map,runners).map(({x,y})=>({x,y})).filter(p=>!blocked(arenaOf(d.match),p))};
      d.match.rivalLog={};d.rival=rival;d.taunts=await rivalTaunts(this.env.DB,d.config.classroom);
    }catch{/* A rival is flavor: if it can't load, the classic sentinel still hunts. */}
  }
  /** Taunts on catches and at the end, then the round is written into the rival's long-term memory once. */
  private rivalMoments(caughtBefore:Set<string>){
    const d=this.data!,m=d.match,r=d.rival;if(!r||!m.rival)return;
    if(d.taunts)for(const p of m.players){
      if(p.id.startsWith('bot-')||!(p.captured||p.escaped)||caughtBefore.has(`${p.id}:${p.escaped?'out':'caught'}`))continue;
      const t=taunt(r,p.escaped?'escaped':'caught',p.id,m.tick%7/7,p.name);
      if(t)m.message=p.escaped?`${p.name} escaped! ${m.rival.name}: ${t.text}`:`${m.rival.name}: ${t.text} (${p.name} needs a rescue!)`;
    }
    if(m.phase!=='finished'||d.rivalRecorded)return;
    d.rivalRecorded=true;const result=rivalResult(m);if(!result)return;
    if(d.taunts){const t=taunt(r,m.winner==='hunter'?'won':'lost',null);if(t)m.message=`${m.message} ${m.rival.name}: ${t.text}`;}
    this.ctx.waitUntil(recordRivalMatch(this.env.DB,d.config.classroom,r.id,result).then(()=>undefined,()=>undefined));
  }
  async alarm(){
    if(!this.data||this.data.config.expires<=Date.now()){for(const ws of this.ctx.getWebSockets())ws.close(4003,'Room expired');this.stopTimer();await this.ctx.storage.deleteAll();this.data=null;}
  }
}
export async function petHuntAPI(request:Request,env:Env,session:{role:'teacher'|'student';actor_id:string}){
  const teacher=session.role==='teacher',row=teacher
    ?await env.DB.prepare('SELECT id AS classroom_id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{classroom_id:string;alias?:string;state_json?:string;learning_json?:string|null}>()
    :await env.DB.prepare('SELECT classroom_id,alias,state_json,learning_json FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{classroom_id:string;alias?:string;state_json?:string;learning_json?:string|null}>();
  if(!row)throw new ApiError(403,'Sign in to your classroom first.');
  const savedState=!teacher&&row.state_json?parseStored(row.state_json):null;
  const savedPet=savedState?.pet;
  const pet=teacher?{species:'bramble_hedgehog',name:'Bramble Sentinel',stage:'adult' as PetStage}:savedPet&&SPECIES.includes(savedPet.speciesId as typeof SPECIES[number])?{species:savedPet.speciesId,name:savedPet.name,stage:toStage(savedPet.stage)}:null;
  const actor:Actor={id:session.actor_id,teacher,name:teacher?'Teacher':row.alias??'Pet explorer',species:pet?.species??'',sessionHash:await digest(readCookie(request)),stage:pet?.stage??'adult',returnProfile:returnProfile(savedState??{}),grade:normalizeLearning(row.learning_json?JSON.parse(row.learning_json):undefined).grade};
  const path=new URL(request.url).pathname,directory=env.PET_HUNT.getByName(`class:${row.classroom_id}`);
  if(path==='/api/pilot/pet-hunt'&&request.method==='GET'){
    const configs=await directory.directory();const rooms=(await Promise.all(configs.map(c=>env.PET_HUNT.getByName(`room:${c.id}`).summary()))).filter(Boolean);
    return Response.json({you:actor.id,teacher,species:pet?.species??null,pet,rooms,returnProfile:actor.returnProfile,grade:actor.grade});
  }
  if(!pet)throw new ApiError(409,'Hatch your earned pet in Auralith before entering Pet Hunt.');
  if(path==='/api/pilot/pet-hunt/create'&&request.method==='POST'){
    const body=await readBody(request);const proposed=configFrom(body,actor,row.classroom_id);
    let config:Config;try{config=await directory.reserve(proposed);}catch(error){throw new ApiError(409,error instanceof Error&&error.message.includes('Close your existing room')?'Close your existing room before switching between Classic Hunt and Rift Hunt.':'The classroom has eight rooms open. Ask your teacher to close a room.');}
    await env.PET_HUNT.getByName(`room:${config.id}`).initialize(config,actor,typeof body.kit==='string'&&Object.hasOwn(KITS,body.kit)?body.kit as Kit:'scout');
    return Response.json({id:config.id});
  }
  const match=path.match(/^\/api\/pilot\/pet-hunt\/([a-f0-9-]{36})\/socket$/);
  if(match&&request.method==='GET'){
    const config=(await directory.directory()).find(c=>c.id===match[1]);if(!config)throw new ApiError(404,'That classroom room is closed or expired.');
    const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)throw new ApiError(403,'Open the arena from your classroom.');
    const headers=new Headers(request.headers);headers.set('x-hunt-actor',JSON.stringify(actor));
    return env.PET_HUNT.getByName(`room:${config.id}`).fetch(new Request(request,{headers}));
  }
  throw new ApiError(404,'Arena route not found.');
}
