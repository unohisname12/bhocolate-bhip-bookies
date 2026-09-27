import { describe, expect, it } from 'vitest';
import { addPlayer, arenaOf, blocked, createMatch, freeCages, idleInput, playArena, startMatch, step, viewFor, CAGE_SECONDS, TRAPS_PER_ROUND, TRAP_STUN, VENT_SECONDS, type Input, type Match, type Player } from './model';
import { generateLayout } from './mapgen';

// A generated map that has a locked building, so every tool is present.
const seed=(()=>{for(let s=1;;s++)if(generateLayout('garden',s).door)return s;})();
function game(){const m=createMatch('garden','normal',240,seed);addPlayer(m,'kid','Sir Biscuit','runner');addPlayer(m,'you','Hunter','hunter');startMatch(m);
 for(const p of m.players)p.bot=p.id.startsWith('bot-')?false:false;m.time=m.duration-20;return m;}
const who=(m:Match,id:string)=>m.players.find(p=>p.id===id)!;
const run=(m:Match,seconds:number,inputs:Record<string,Partial<Input>>={})=>{for(let i=0;i<seconds*40;i++)step(m,Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,{...idleInput(),...v}])),.025);};
const tap=(m:Match,id:string,extra:Partial<Input>={})=>{run(m,.025,{[id]:{interact:true,...extra}});run(m,.025,{});};
const park=(m:Match,keep:string[])=>{for(const p of m.players)if(!keep.includes(p.id)&&p.role==='runner'){p.escaped=false;p.x=60;p.y=60;p.stun=999;}};
const put=(p:Player,v:{x:number;y:number})=>{p.x=v.x;p.y=v.y;};

describe('Pet Hunt runner and hunter tools',()=>{
 it('lockers hide a pet completely until the hunter checks them',()=>{
  const m=game(),kid=who(m,'kid'),h=who(m,'you'),l=arenaOf(m).lockers![0];park(m,['kid']);
  put(kid,l);tap(m,'kid');expect(kid.locker).toBe(0);
  put(h,{x:l.x+30,y:l.y});expect(viewFor(m,'you').players.some(p=>p.id==='kid')).toBe(false);
  expect(viewFor(m,'you').lockers.every(v=>v===null)).toBe(true);expect(viewFor(m,'kid').lockers[0]).toBe('kid');
  tap(m,'you');expect(kid.locker).toBe(-1);expect(kid.hp).toBe(1);
 });
 it('vents move a pet across the map after a short crawl, with a cooldown',()=>{
  const m=game(),kid=who(m,'kid'),[a,b]=arenaOf(m).vents![0];park(m,['kid']);
  put(kid,a);tap(m,'kid');expect(kid.vent).toBeGreaterThan(0);run(m,VENT_SECONDS+.1);expect(Math.hypot(kid.x-b.x,kid.y-b.y)).toBeLessThan(1);
  tap(m,'kid');expect(kid.vent).toBe(0);
 });
 it('the locked door is a wall until a pet brings the key; a caught holder drops it',()=>{
  const m=game(),kid=who(m,'kid'),door=arenaOf(m).door!,mid={x:door.x+door.w/2,y:door.y+door.h/2};park(m,['kid']);
  expect(blocked(playArena(m),mid)).toBe(true);expect(m.doorOpen).toBe(false);
  put(kid,m.key!);run(m,.05);expect(m.key!.holder).toBe('kid');
  kid.captured=true;run(m,.05);expect(m.key!.holder).toBeNull();kid.captured=false;kid.hp=2;
  put(kid,m.key!);run(m,.05);put(kid,{x:mid.x,y:mid.y+(door.h>door.w?0:40)});if(door.h>door.w)kid.x=mid.x-40;tap(m,'kid');
  expect(m.doorOpen).toBe(true);expect(m.key).toBeNull();expect(blocked(playArena(m),mid)).toBe(false);
 });
 it('the hunter carries a caught pet to a free cage; one pet per cage; a friend can rescue; time runs out',()=>{
  const m=game(),kid=who(m,'kid'),h=who(m,'you'),[c1]=arenaOf(m).cages!;park(m,['kid']);
  kid.captured=true;put(h,kid);tap(m,'you');expect(h.carrying).toBe('kid');
  put(h,c1);tap(m,'you');expect(h.carrying).toBeNull();expect(kid.caged).toBeCloseTo(CAGE_SECONDS,0);expect(freeCages(m)).toHaveLength(1);
  const friend=m.players.find(p=>p.role==='runner'&&p.id!=='kid')!;friend.stun=0;friend.escaped=false;put(friend,{x:c1.x+30,y:c1.y});put(h,{x:60,y:1300});
  run(m,3.2,{[friend.id]:{interact:true}});expect(kid.captured).toBe(false);expect(kid.caged).toBe(0);
  kid.captured=true;kid.caged=.1;run(m,.2);expect(kid.out).toBe(true);
 });
 it('stunning the hunter makes it drop the pet it is carrying',()=>{
  const m=game(),kid=who(m,'kid'),h=who(m,'you');park(m,['kid']);kid.captured=true;put(h,kid);tap(m,'you');expect(h.carrying).toBe('kid');
  const shooter=m.players.find(p=>p.role==='runner'&&p.id!=='kid')!;shooter.stun=0;shooter.escaped=false;put(shooter,{x:h.x-120,y:h.y});
  run(m,.6,{[shooter.id]:{fire:true,aim:0}});expect(h.carrying).toBeNull();
 });
 it('traps: three per round, hidden from pets until close, stun and ping the hunter',()=>{
  const m=game(),kid=who(m,'kid'),h=who(m,'you');park(m,['kid']);
  for(let i=0;i<TRAPS_PER_ROUND+2;i++){put(h,{x:1000+i*60,y:800});run(m,.025,{you:{trap:true}});run(m,.025,{});}
  expect(m.traps).toHaveLength(TRAPS_PER_ROUND);expect(m.trapsLeft).toBe(0);
  put(kid,{x:1000,y:950});expect(viewFor(m,'kid').traps).toHaveLength(0);expect(viewFor(m,'you').traps).toHaveLength(3);
  put(kid,{x:1000,y:800});run(m,.05);expect(kid.stun).toBeGreaterThan(TRAP_STUN-.2);expect(m.traps).toHaveLength(2);
  expect(viewFor(m,'you').effects.some(e=>e.kind==='ping')).toBe(true);expect(viewFor(m,'kid').effects.some(e=>e.kind==='ping')).toBe(false);
 });
 it('the sensor pings the hunter when a pet walks past it',()=>{
  const m=game(),kid=who(m,'kid'),h=who(m,'you');park(m,['kid']);put(h,{x:1100,y:900});run(m,.025,{you:{sensor:true}});expect(m.sensor).not.toBeNull();
  put(h,{x:200,y:200});put(kid,{x:1180,y:900});run(m,.1);expect(m.effects.some(e=>e.kind==='ping')).toBe(true);
 });
});

describe('spark checks while charging',()=>{
 const charge=()=>{const m=game(),kid=who(m,'kid');park(m,['kid']);Object.assign(kid,m.beacons[0]);kid.grade=2;tap(m,'kid');expect(kid.charging).toBe(0);return {m,kid};};
 const until=(m:Match,kid:Player)=>{for(let i=0;i<400&&!kid.check;i++)run(m,.025);expect(kid.check).not.toBeNull();return kid.check!;};
 it('one tap starts charging; a check pops up that only you can see, without the answer',()=>{
  const {m,kid}=charge();const c=until(m,kid);
  const mine=viewFor(m,'kid').players.find(p=>p.id==='kid')!;expect(mine.check?.prompt).toBe(c.prompt);expect(mine.check?.answer).toBe(-1);
  expect(viewFor(m,'you').players.find(p=>p.id==='kid')?.check??null).toBeNull();
 });
 it('a right answer bursts the beacon forward; a wrong one sputters, sets it back and makes noise',()=>{
  let {m,kid}=charge();let c=until(m,kid);let before=m.beacons[0].progress;
  run(m,.025,{kid:{answer:c.answer,answerFor:c.id}});expect(m.beacons[0].progress-before).toBeGreaterThan(.07);expect(kid.lastCheck).toBe('right');
  ({m,kid}=charge());c=until(m,kid);before=m.beacons[0].progress;
  run(m,.025,{kid:{answer:(c.answer+1)%3,answerFor:c.id}});expect(m.beacons[0].progress).toBeLessThan(before);expect(kid.noise).toBeGreaterThan(1);expect(kid.lastCheck).toBe('wrong');
 });
 it('an answer for an old check does nothing, and a timeout counts as a miss unless checks are relaxed',()=>{
  let {m,kid}=charge();let c=until(m,kid);run(m,.025,{kid:{answer:c.answer,answerFor:c.id+999}});expect(kid.check?.id).toBe(c.id);
  run(m,c.left+.1);expect(kid.lastCheck).toBe('wrong');
  ({m,kid}=charge());m.relaxed=true;c=until(m,kid);const before=m.beacons[0].progress;run(m,c.left+.05);expect(m.beacons[0].progress).toBeGreaterThanOrEqual(before);
 });
 it('walking away or getting stunned stops charging',()=>{
  const {m,kid}=charge();kid.x+=200;run(m,.05);expect(kid.charging).toBe(-1);
 });
});
