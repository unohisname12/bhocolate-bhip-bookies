import { describe, expect, it } from 'vitest';
import { ARENAS, CHARGE_SECONDS, GATE_SECONDS, PULSE_EVERY, arenaOf, WIDTH, addPlayer, blocked, botInput, createMatch, idleInput, lineClear, sanitizeInput, startMatch, step, viewFor, waypoint, type Match, type Role } from './model';
function game(role:Role='runner'){const m=createMatch();addPlayer(m,'you','You',role);startMatch(m);for(const p of m.players)p.bot=false;m.time=m.duration-20;return m;}
function advance(m:Match,seconds:number,input=idleInput()){for(let i=0;i<seconds*40;i++)step(m,{you:input},.025);}
describe('Pet Hunt authoritative rules',()=>{
 it('validates finite inputs, bounds movement, and never accepts coordinates or damage',()=>{
   expect(sanitizeInput({x:Infinity,y:0,aim:0})).toBeNull();expect(sanitizeInput({x:0,y:0,aim:NaN})).toBeNull();
   expect(sanitizeInput({x:100,y:-100,aim:0,fire:'yes',damage:999})).toEqual({...idleInput(),x:1,y:-1});
   const m=game(),p=m.players[0],x=p.x;advance(m,1,{...idleInput(),x:1,y:-1});expect(Math.hypot(p.x-x,p.y-640)).toBeCloseTo(153,0);
   advance(m,20,{...idleInput(),x:1});expect(p.x).toBeLessThan(WIDTH-16);expect(blocked(m.map,p)).toBe(false);
 });
 it('gives runners a head start, then freezes every timer and action when paused',()=>{
   const m=game('hunter'),p=m.players[0];m.time=m.duration;const x=p.x;advance(m,1,{...idleInput(),x:1,fire:true});expect(p.x).toBe(x);expect(m.bullets).toHaveLength(0);
   m.paused=true;const before=structuredClone(m);advance(m,20,{...idleInput(),x:1,fire:true,gadget:true});expect(m).toEqual(before);
 });
 it('blocks sight and projectiles at solid walls',()=>{
   const m=game('hunter'),p=m.players[0],target=m.players[1];p.x=300;p.y=140;target.x=300;target.y=285;
   expect(lineClear(m.map,p,target)).toBe(false);advance(m,1,{...idleInput(),aim:Math.PI/2,fire:true});expect(target.hp).toBe(2);expect(viewFor(m,p.id).players.some(v=>v.id===target.id)).toBe(false);
 });
 it('conceals still pets in cover and omits opponent bot memory from snapshots',()=>{
   const m=game('hunter'),p=m.players[0],r=m.players[1];p.x=230;p.y=290;r.x=120;r.y=290;r.target={x:999,y:999};
   expect(viewFor(m,p.id).players.some(v=>v.id===r.id)).toBe(false);
   const own=viewFor(m,r.id).players.find(v=>v.id===r.id)!;expect(own.hidden).toBe(true);expect(own).not.toHaveProperty('target');expect(own).not.toHaveProperty('memory');
   r.noise=1;expect(viewFor(m,p.id).players.some(v=>v.id===r.id)).toBe(true);
 });
 it('requires two spaced hits, allows rescue, and gives release protection',()=>{
   const m=game('hunter'),hunter=m.players[0],runner=m.players[1];hunter.x=100;hunter.y=80;runner.x=200;runner.y=80;
   advance(m,.6,{...idleInput(),aim:0,fire:true});expect(runner.hp).toBe(1);advance(m,1.5);advance(m,.4,{...idleInput(),aim:0,fire:true});expect(runner.captured).toBe(true);
   runner.captureTime=23.9;advance(m,.15);expect(runner.captured).toBe(false);expect(runner.hp).toBe(2);expect(runner.immune).toBeGreaterThan(4);
 });
 it('stuns rather than kills hunters and prevents consecutive stun locks',()=>{
   const m=game(),p=m.players[0],h=m.players.find(p=>p.role==='hunter')!;p.x=100;p.y=80;h.x=200;h.y=80;
   advance(m,.4,{...idleInput(),aim:0,fire:true});expect(h.stun).toBeGreaterThan(0);expect(h.hp).toBe(2);const immunity=h.immune;
   advance(m,.5,{...idleInput(),aim:0,fire:true});expect(h.immune).toBeLessThan(immunity);expect(h.captured).toBe(false);
 });
 it('charges beacons slowly with a noisy hum, needs five, opens the gate on a countdown, and escapes in one tap',()=>{
   // Relaxed checks: unanswered spark checks cost nothing, so this measures plain charging.
   const m=game(),p=m.players[0];m.relaxed=true;Object.assign(p,m.beacons[0]);
   advance(m,PULSE_EVERY*3+.5,{...idleInput(),interact:true});expect(m.beacons[0].progress).toBeCloseTo((PULSE_EVERY*3+.5)/CHARGE_SECONDS,1);expect(m.effects.some(e=>e.kind==='beacon')).toBe(true);
   advance(m,CHARGE_SECONDS-(PULSE_EVERY*3+.5)+.1,{...idleInput(),interact:true});expect(m.beacons[0].progress).toBe(1);expect(p.beaconScore).toBe(1);
   const friend=m.players.find(v=>v.role==='runner'&&v.id!==p.id)!;Object.assign(friend,{x:p.x+30,y:p.y,captured:true});advance(m,3.1,{...idleInput(),interact:true});expect(friend.captured).toBe(false);expect(p.rescues).toBe(1);
   // Two pets on one beacon are faster, but not twice as fast.
   const n=game(),[a,b]=n.players.filter(v=>v.role==='runner');n.relaxed=true;Object.assign(a,n.beacons[1]);Object.assign(b,{x:n.beacons[1].x+20,y:n.beacons[1].y});b.bot=false;
   for(let i=0;i<400;i++)step(n,{[a.id]:{...idleInput(),interact:true},[b.id]:{...idleInput(),interact:true}},.025);expect(n.beacons[1].progress).toBeCloseTo(10*1.5/CHARGE_SECONDS,1);
   Object.assign(p,arenaOf(m).portal);advance(m,1,{...idleInput(),interact:true});expect(p.escaped).toBe(false);
   m.beacons[1].progress=m.beacons[2].progress=m.beacons[3].progress=1;advance(m,1);expect(m.gate.state).toBe('closed');
   m.beacons[4].progress=1;advance(m,.1);expect(m.gate.state).toBe('opening');advance(m,1,{...idleInput(),interact:true});expect(p.escaped).toBe(false);
   advance(m,GATE_SECONDS);expect(m.gate.state).toBe('open');advance(m,.05,{...idleInput(),interact:true});expect(p.escaped).toBe(true);
 });
 it('resolves three escapes before timeout, and all remaining captures as a hunter win',()=>{
   const m=game();m.players.filter(p=>p.role==='runner').slice(0,3).forEach(p=>p.escaped=true);m.time=.01;step(m,{},.025);expect(m.winner).toBe('runners');
   // Bubbles open on their own, so bubbling everyone is not a win; caging everyone still inside is.
   const n=game();n.players.filter(p=>p.role==='runner').forEach(p=>p.captured=true);step(n,{},.025);expect(n.winner).toBeNull();
   n.players.filter(p=>p.role==='runner').forEach(p=>{p.captured=true;p.caged=30;});step(n,{},.025);expect(n.winner).toBe('hunter');
 });
 it('provides navigable spawns and usable beacons on every map',()=>{
   for(const a of ARENAS){const m=createMatch(a.id);startMatch(m);for(const p of m.players)expect(blocked(m.map,p)).toBe(false);for(const b of [...m.beacons,a.portal])expect(blocked(m.map,b)).toBe(false);
     const p=m.players.find(p=>p.role==='runner')!,w=waypoint(m,p,m.beacons[2]);expect(Number.isFinite(w.x)).toBe(true);expect(blocked(m.map,w)).toBe(false);expect(sanitizeInput(botInput(m,p))).not.toBeNull();}
 });
 it('bots complete full rounds without stuck matches or invalid state on all arenas',()=>{
   for(const a of ARENAS){const m=createMatch(a.id,'normal',180);startMatch(m);for(let i=0;i<7500&&m.phase==='playing';i++)step(m,{},.025);expect(m.phase).toBe('finished');expect(m.winner).not.toBeNull();expect(m.players.every(p=>Number.isFinite(p.x)&&!blocked(m.map,p))).toBe(true);expect(m.beacons.some(b=>b.progress>0)).toBe(true);}
 });
});

describe('hunter recovery windows',()=>{
 it('has three shots, then must wait for a fresh charge even with fire held',()=>{
  const m=game('hunter'),p=m.players[0];Object.assign(p,{x:100,y:80});
  advance(m,2,{...idleInput(),fire:true,aim:-Math.PI/2});expect(p.ammo).toBe(0);const bullets=m.nextId;
  advance(m,2.5,{...idleInput(),fire:true,aim:-Math.PI/2});expect(m.nextId).toBe(bullets);expect(p.ammo).toBe(0);
  advance(m,.5,{...idleInput(),fire:true,aim:-Math.PI/2});expect(m.nextId).toBeGreaterThan(bullets);
 });
 it('loses ground while shooting or empty and cannot dash out of recovery',()=>{
  for(const empty of [false,true]){
   const m=game('hunter'),p=m.players[0];Object.assign(p,{x:100,y:80,ammo:empty?0:3});
   advance(m,.5,{...idleInput(),x:1,fire:!empty,gadget:true,aim:0});
   expect(p.x-100).toBeLessThan(153*.5);expect(p.gadgetCooldown).toBe(0);
  }
 });
 it('keeps normal chase speed and dash when rested',()=>{
  const m=game('hunter'),p=m.players[0];Object.assign(p,{x:100,y:80});advance(m,.5,{...idleInput(),x:1});expect(p.x-100).toBeCloseTo(174*.5,1);
  advance(m,.025,{...idleInput(),gadget:true});expect(p.gadgetCooldown).toBeGreaterThan(11);
 });
});
