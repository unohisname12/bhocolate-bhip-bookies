import { describe, expect, it } from 'vitest';
import { offerDeal, award, createCity, DEFAULT_RULES, driver, nodes, publicCity, resolve, startCity, submit, syncPractice, validRules, type City, type Order } from './model';
const order: Order = { destination: 0, route: 'direct', bid: 0, partner: '', perk: '' };
function duel(mode: 'community'|'rivals' = 'rivals'): City {
  const s = createCity('city', driver('a','A',null), { ...DEFAULT_RULES, format:'duel',computers:0,mode,market:false,events:false });
  s.players.push(driver('b','B',null));
  return syncPractice(startCity(s,100), {a:2,b:2});
}
describe('Delivery Districts', () => {
  it('duels require two people and use a six-neighborhood map', () => {
    const s = createCity('city',driver('a','A',null),{...DEFAULT_RULES,format:'duel'});
    expect(() => startCity(s,0)).toThrow(/two students/);
    expect(nodes(duel())).toHaveLength(6);
    expect(duel().players).toHaveLength(2);
  });
  it('caps a city at ten crews and normalizes the sprint clock', () => {
    expect(validRules({...DEFAULT_RULES,rounds:12,minutes:1440}).rounds).toBe(4);
    expect(validRules({...DEFAULT_RULES,rounds:12,minutes:1440}).minutes).toBe(4);
    const s = createCity('city',driver('a','A',null),{...DEFAULT_RULES,format:'group',computers:9});
    s.players.push(driver('b','B',null)); expect(() => startCity(s,0)).toThrow(/ten/);
  });
  it('requires practice without giving faster solvers extra moves', () => {
    let s = duel(); s = syncPractice(s,{a:1,b:100});
    expect(() => submit(s,'a',order)).toThrow(/two briefing/);
    s = submit(s,'b',order); expect(() => submit(s,'b',order)).toThrow(/next planning/);
    expect(resolve(s,101,{a:1,b:100}).round).toBe(1);
  });
  it('hides orders and private counters from the opponent', () => {
    const s = submit(duel(),'a',{...order,bid:3});
    expect(publicCity(s,'b').players[0].order).toBeNull();
    expect(publicCity(s,'b').players[0].baseline).toBe(0);
    expect(publicCity(s,'a').players[0].order?.bid).toBe(3);
  });
  it('resolves bids together, refunds no bid and prevents replayed scoring', () => {
    let s = submit(duel(),'a',{...order,bid:1}); s=submit(s,'b',{...order,bid:2});
    const next=resolve(s,200,{a:2,b:2});
    expect(next.players[0].score).toBe(0); expect(next.players[1].score).toBeGreaterThan(0);
    expect(next.players[0].credits).toBe(7); expect(next.players[1].credits).toBe(6);
    expect(next.round).toBe(2); expect(next.players.every(p=>p.practice===0)).toBe(true);
    expect(resolve(next,201,{a:2,b:2})).toEqual(next);
  });
  it('protects both community deliveries and awards mutual deals', () => {
    let s=submit(duel('community'),'a',{...order,partner:'b'}); s=submit(s,'b',{...order,partner:'a'});
    const next=resolve(s,200,{a:2,b:2}); expect(next.players[0].score).toBe(next.players[1].score);
    expect(next.players[0].score).toBeGreaterThan(0); expect(next.trips[0].message).toMatch(/shared warehouse/);
  });
  it('shares tied rival contracts instead of favoring submission order', () => {
    let s=submit(duel(),'b',{...order,bid:2});s=submit(s,'a',{...order,bid:2});
    const next=resolve(s,200,{a:2,b:2});expect(next.players[0].score).toBe(next.players[1].score);
  });
  it('teacher rewards are capped and consumed once', () => {
    let s=duel();for(let i=0;i<8;i++)s=award(s,['a'],'insurance');expect(s.players[0].perks.insurance).toBe(5);
    s=submit(s,'a',{...order,perk:'insurance'});s=submit(s,'b',{...order,bid:2});
    s=resolve(s,200,{a:2,b:2});expect(s.players[0].score).toBe(5);expect(s.players[0].perks.insurance).toBe(4);
    expect(()=>submit(syncPractice(s,{a:4,b:4}),'b',{...order,perk:'van'})).toThrow(/not available/);
  });
  it('missions count new work once, with individual or shared rewards', () => {
    let s=duel();s.mission={id:'m',targets:['a','b'],baseline:{a:2,b:2},goal:3,reward:'van',completed:[]};
    s=syncPractice(s,{a:5,b:3});expect(s.players[0].perks.van).toBe(1);expect(s.players[1].perks.van).toBe(0);
    expect(syncPractice(s,{a:5,b:3}).players[0].perks.van).toBe(1);
    s.mission={id:'m2',targets:['a','b'],baseline:{a:5,b:3},goal:2,reward:'bridge',completed:[]};
    s=syncPractice(s,{a:7,b:3});expect(s.bridge).toBe(false);s=syncPractice(s,{a:7,b:5});expect(s.bridge).toBe(true);
  });
  it('community offers bind while rival offers can be bluffs', () => {
    let friendly=offerDeal(duel('community'),'a','b');
    expect(()=>offerDeal(friendly,'a','')).toThrow(/binding/);
    friendly=submit(friendly,'a',order);expect(friendly.players[0].order?.partner).toBe('b');
    let rivals=offerDeal(duel(),'a','b');rivals=submit(rivals,'a',order);
    expect(rivals.players[0].offer).toBe('b');expect(rivals.players[0].order?.partner).toBe('');
  });
  it('deadline parks missing crews without deducting points and ends after four rounds', () => {
    let s=duel();s.players[0].score=10;
    for(let n=0;n<4;n++)s=resolve(s,s.deadline,{a:2,b:2});
    expect(s.phase).toBe('done');expect(s.players[0].score).toBe(10);expect(s.log.join(' ')).toMatch(/parked/);
  });
  it('untimed campaigns survive long absences and bots finish their orders', () => {
    let s=startCity(createCity('city',driver('a','A',null),{...DEFAULT_RULES,length:'campaign',rounds:12,minutes:0,events:false}),0);
    expect(resolve(s,1e12,{a:0}).round).toBe(1);
    s=resolve(submit(syncPractice(s,{a:2}),'a',order),1e12,{a:2});
    expect(s.trips).toHaveLength(3);expect(s.round).toBe(2);expect(s.deadline).toBe(0);
  });
});
