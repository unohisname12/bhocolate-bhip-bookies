import { describe, expect, it } from 'vitest';
import { advanceParty, commandParty, createParty, type PartyMember } from './model';
import { RECIPES, startRun } from '../arcade/model';
const member = (id: string): PartyMember => ({ id, alias:id, status:'joined', baseline:0,target:3,practice:3,lastSeen:0,station:{selected:0,tray:[]},racer:null });
const setup = (game:'cafe'|'guard'|'dash'): import('./model').PartyState => ({...createParty(game,member('a'),12),phase:'playing' as const,members:[member('a'),member('b')],startAt:1000});
describe('shared classroom games',()=>{
 it('keeps personal trays separate but shares completed orders and supplies',()=>{
  let s=setup('cafe');
  s=commandParty(s,'a',{kind:'ingredient',ingredient:0});
  expect(s.members[1].station.tray).toEqual([]);
  s=commandParty(s,'a',{kind:'clear'});
  for(const ingredient of RECIPES[s.run.orders[0]].parts)s=commandParty(s,'a',{kind:'ingredient',ingredient});
  s=commandParty(s,'b',{kind:'ingredient',ingredient:0});
  s=commandParty(s,'a',{kind:'serve'});
  expect(s.run.step).toBe(1);expect(s.run.score).toBe(20);
  expect(s.members[1].station.tray).toEqual([]);
  expect(commandParty(s,'b',{kind:'serve'}).run.step).toBe(1);
 });
 it('lets teammates complete nine orders together',()=>{
  let s=setup('cafe');
  for(let n=0;n<9;n++){
   const id=n%2?'b':'a',order=n%3;
   s=commandParty(s,id,{kind:'order',order});
   for(const ingredient of RECIPES[s.run.orders[order]].parts){if(s.run.stock[ingredient]<3)s=commandParty(s,id,{kind:'restock',ingredient});s=commandParty(s,id,{kind:'ingredient',ingredient});}
   s=commandParty(s,id,{kind:'serve'});
  }
  expect(s.phase).toBe('done');expect(s.run.step).toBe(9);expect(s.run.score).toBeGreaterThan(180);
 });
 it('shares defenses, catches up waves once and waits at build breaks',()=>{
  let s=setup('guard');s=commandParty(s,'a',{kind:'build',slot:0,tower:'rapid'});s=commandParty(s,'b',{kind:'build',slot:1,tower:'frost'});
  expect(s.run.energy).toBe(4);s={...s,waveAt:1000};
  s=advanceParty(s,13000);expect(s.run.step).toBe(16);expect(s.waveAt).toBe(0);
  expect(advanceParty(s,100000)).toBe(s);
  expect(s.events.join(' ')).toContain('b built');
 });
 it('racers see the same road but control independent carts and time cannot run backward',()=>{
  let s=setup('dash');s.members=s.members.map(m=>({...m,racer:startRun('dash',1,s.seed)}));
  s=commandParty(s,'a',{kind:'lane',lane:0});s=commandParty(s,'b',{kind:'lane',lane:2});
  s=advanceParty(s,3000);expect(s.beat).toBe(1);
  expect(s.members.map(m=>m.racer!.lane)).toEqual([0,2]);
  expect(advanceParty(s,3000)).toBe(s);expect(advanceParty(s,2000)).toBe(s);
  s=advanceParty(s,200000);expect(s.phase).toBe('done');
 });
 it('uninvited players and pre-game moves never change the board',()=>{
  const s=setup('cafe');expect(commandParty(s,'outsider',{kind:'restock',ingredient:0})).toBe(s);
  const lobby={...s,phase:'lobby' as const};expect(commandParty(lobby,'a',{kind:'serve'})).toBe(lobby);
 });
});
