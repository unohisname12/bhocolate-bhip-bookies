import { describe, expect, it } from 'vitest';
import { addPlayer, botInput, createMatch, idleInput, rivalResult, startMatch, step, viewFor, type Match, type RivalBrief } from './model';
import { createRival, recordMatch, searchPlan } from '../rivals/model';

const brief=(o:Partial<RivalBrief>={}):RivalBrief=>({id:'rival-0',name:'Muddy Bramble Sentinel',species:'moss_turtle',edge:1,decoyResistance:0,hearing:0,beaconWatch:0,search:[],...o});
function game(rival?:RivalBrief){const m=createMatch();m.rival=rival;m.rivalLog=rival?{}:undefined;addPlayer(m,'student-1','Sir Biscuit','runner','ember_fox','scout');startMatch(m);m.players.find(p=>p.id==='student-1')!.bot=false;return m;}
const hunter=(m:Match)=>m.players.find(p=>p.role==='hunter')!;

describe('Pet Hunt with a class rival',()=>{
 it('the rival takes the computer hunter seat under its own name and species, and its memory never reaches players',()=>{
  const m=game(brief({search:[{x:400,y:320}]}));
  expect(hunter(m)).toMatchObject({name:'Muddy Bramble Sentinel',species:'moss_turtle',bot:true});
  const v=viewFor(m,'student-1') as unknown as Record<string,unknown>;expect(v.rival).toBeUndefined();expect(v.rivalLog).toBeUndefined();
  expect(JSON.stringify(v)).not.toContain('400,"y":320');
 });
 it('without a rival the classic sentinel is unchanged',()=>{
  const m=game();expect(hunter(m).name).toBe('Bramble Sentinel');expect(hunter(m).species).toBe('bramble_hedgehog');
 });
 it('checks remembered hiding spots before patrolling beacons',()=>{
  const m=game(brief({search:[{x:880,y:560}]})),h=hunter(m);m.time=m.duration;
  for(const p of m.players)if(p.role==='runner'){p.x=40;p.y=40;p.hidden=true;}
  const input=botInput(m,h),dir=Math.atan2(input.y,input.x),toSpot=Math.atan2(560-h.y,880-h.x);
  expect(Math.abs(dir-toSpot)).toBeLessThan(1.2);
 });
 it('a rival that learned decoys ignores most of them; a fresh one always chases',()=>{
  // How often a decoy changes where the hunter heads, compared with the same moment without one.
  const chase=(resistance:number)=>{let fooled=0;for(let t=0;t<100;t++){
   const dir=(decoy:boolean)=>{const m=game(brief({decoyResistance:resistance}));m.tick=t;if(decoy)m.effects.push({id:99,kind:'decoy',x:1060,y:60,life:5});for(const p of m.players)if(p.role==='runner'){p.x=60;p.y=660;}const i=botInput(m,hunter(m));return Math.atan2(i.y,i.x);};
   if(Math.abs(dir(true)-dir(false))>0.1)fooled++;}return fooled;};
  expect(chase(0)).toBeGreaterThan(90);expect(chase(0.6)).toBeLessThan(55);
 });
 it('rank edge speeds the bot hunter, and a mastered weakness slows it',()=>{
  const dist=(edge:number)=>{const m=game(brief({edge})),h=hunter(m);m.time=m.duration-10;const x=h.x,y=h.y;for(let i=0;i<20;i++)step(m,{},.025);return Math.hypot(h.x-x,h.y-y);};
  expect(dist(1.2)).toBeGreaterThan(dist(1));expect(dist(0.85)).toBeLessThan(dist(1));
 });
 it('logs what it saw and hands a finished round to the rival’s memory',()=>{
  const m=game(brief());const me=m.players.find(p=>p.id==='student-1')!;
  step(m,{'student-1':{...idleInput(),x:1,quiet:true}},.025);me.gadgetCooldown=0;step(m,{'student-1':{...idleInput(),gadget:true}},.025);
  expect(m.rivalLog!['student-1'].decoys).toBe(1);expect(m.rivalLog!['student-1'].quiet).toBeGreaterThan(0);
  m.time=0;m.time=0;step(m,{},.025);expect(m.phase).toBe('finished');
  const result=rivalResult(m)!;expect(result).toMatchObject({hunterWon:true,students:[{studentId:'student-1',petName:'Sir Biscuit',escaped:false}]});
  const remembered=recordMatch(createRival(0,'Fractions'),result,Date.now());expect(remembered.grudges[0].petName).toBe('Sir Biscuit');expect(remembered.wins).toBe(1);
  expect(searchPlan(remembered,m.map,['student-1'])).toEqual(expect.any(Array));
 });
 it('records nothing when a person hunts or the host ends early',()=>{
  const m=game(brief());m.phase='finished';m.winner='ended';expect(rivalResult(m)).toBeNull();
  const human=createMatch();human.rival=brief();addPlayer(human,'kid','Kid','hunter');startMatch(human);human.players[0].bot=false;human.phase='finished';human.winner='hunter';expect(rivalResult(human)).toBeNull();
 });
});
