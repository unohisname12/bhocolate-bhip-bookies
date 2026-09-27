import { describe, expect, it } from 'vitest';
import { DEFAULT_LEARNING } from '../../services/game/curriculum';
import { LOOT } from './items';
import { award, buyTool, crewLabel, distinctCrewNames, createCity, DEFAULT_RULES, driver, finishRisk, openCrate, preview, publicCity, radioMessage, resolve, startCity, startRisk, submit, syncPractice, tradeAction, value, type City, type Order } from './model';
const order:Order={destination:0,route:'direct',bid:0,partner:'',perk:''};
function room(mode:'community'|'rivals'='rivals'):City {
  const s=createCity('strategy',driver('a','Alpha',null),{...DEFAULT_RULES,format:'duel',computers:0,mode,length:'campaign',rounds:12,minutes:0,market:true,events:false,crates:false,demand:false,contracts:false,networks:false});
  s.seed=321;s.players.push(driver('b','Beta',null));
  return syncPractice(startCity(s,0),{a:2,b:2});
}
const count=(s:City,id='a')=>Object.values(s.players.find(p=>p.id===id)!.inventory??{}).reduce((a,b)=>a+b,0);
describe('complete delivery strategy',()=>{
  it('keeps human pets unchanged and gives new and saved NPC crews distinct names',()=>{
    const human=driver('a','Copper Courier',{name:'Pip',speciesId:'koala_sprite',stage:'baby'});
    const s=startCity(createCity('names',human,{...DEFAULT_RULES,computers:9}),0);
    expect(s.players[0].pet).toEqual(human.pet);
    expect(s.players[0].alias).toBe('Copper Courier');
    expect(s.players[1].alias).toBe('Copper Courier 2');
    expect(new Set(s.players.map(p=>p.alias)).size).toBe(10);
    expect(s.players.filter(p=>p.bot).some(p=>p.alias==='Pip')).toBe(false);
    s.players[1].alias='Pip';
    const migrated=distinctCrewNames(s);
    expect(migrated.players[1].id).toBe(s.players[1].id);
    expect(publicCity(s,'a').players[1].alias).toBe('Copper Courier 2');
    expect(crewLabel(migrated.players[1])).toContain('NPC');
    expect(crewLabel(migrated.players[0])).toBe('Pip · Copper Courier');
  });
  it('has exactly 100 distinct loot items, three starter items and one two-item math crate',()=>{
    expect(LOOT).toHaveLength(100);expect(new Set(LOOT.map(i=>i.id)).size).toBe(100);
    for(const family of new Set(LOOT.map(i=>i.family)))expect(LOOT.filter(i=>i.family===family)).toHaveLength(10);
    const lobby=createCity('loot',driver('a','Alpha',null),{...DEFAULT_RULES,events:false});lobby.seed=123;
    let s=startCity(lobby,0);expect(count(s)).toBe(3);
    expect(()=>openCrate(s,'a')).toThrow(/briefing/);
    s=openCrate(syncPractice(s,{a:2}),'a');expect(count(s)).toBe(5);
    expect(()=>openCrate(s,'a')).toThrow();
    expect(count(award(s,['a'],'supply',5))).toBe(15);
    expect(()=>award(s,['a'],'supply',6)).toThrow();
  });
  it('conceals opponent inventories, investments, challenges, and sealed choices',()=>{
    const s=room();s.seed=98231;s.players[1].inventory={'teleport-10':3};s.players[1].evBike=true;
    const submitted=submit(s,'b',{...order,quote:4});
    const view=publicCity(submitted,'a');expect(view.seed).toBeUndefined();expect(view.players[1].inventory).toBeUndefined();expect(view.players[1].evBike).toBeUndefined();expect(view.players[1].order).toBeNull();expect(view.players[1].submitted).toBe(true);
    expect(publicCity(submitted,'teacher',true).players[1].inventory).toEqual({'teleport-10':3});
  });
  it('lower sealed quotes steal a previous rival route and record income, costs and history',()=>{
    let s=room();s.owners=['a'];s.lastQuotes=[10];
    s=submit(s,'a',{...order,quote:10});s=submit(s,'b',{...order,quote:7});
    const next=resolve(s,1,{a:2,b:2});
    expect(next.owners![0]).toBe('b');expect(next.lastQuotes![0]).toBe(7);
    expect(next.trips[0].income).toBe(0);expect(next.trips[1].income).toBe(7);
    expect(next.trips[1]).toMatchObject({customerWon:true,poachedFrom:'a',destination:0});
    expect(next.trips[1].review).toMatch(/poached/);expect(next.reportHistory).toHaveLength(1);
    expect(next.players[1].score).toBe(next.trips[1].income!-next.trips[1].cost!+next.trips[1].bonus!);
  });
  it('ties split customer income and charge each courier its own costs',()=>{
    let s=room();s=submit(submit(s,'a',{...order,quote:9}),'b',{...order,quote:9});
    const next=resolve(s,1,{a:2,b:2});expect(next.trips.map(t=>t.income)).toEqual([4,4]);expect(next.owners![0]).toBe('');expect(next.trips.every(t=>t.cost!>0)).toBe(true);
  });
  it('community crews keep both contracts regardless of price competition',()=>{
    let s=room('community');s=submit(submit(s,'a',{...order,quote:10}),'b',{...order,quote:5});
    const next=resolve(s,1,{a:2,b:2});expect(next.trips.map(t=>t.income)).toEqual([10,5]);
  });
  it('negotiates and reserves one job, transferring the fee exactly once',()=>{
    let s=room();s.players[1].inventory={'teleport-10':1};
    s=tradeAction(s,'a','post',{destination:0,pay:3,target:'b'});
    s=tradeAction(s,'b','counter',{id:s.trades![0].id,pay:4,claim:'teleport'});
    expect(()=>submit(s,'b',{...order,subcontract:s.trades![0].id})).toThrow(/counteroffer/);
    s=tradeAction(s,'a','confirm',{id:s.trades![0].id});
    s=submit(s,'b',{...order,subcontract:s.trades![0].id,item:'teleport-10',claim:'teleport'});
    expect(()=>tradeAction(s,'a','cancel',{id:s.trades![0].id})).toThrow(/taken/);
    expect(()=>submit(s,'a',{...order,destination:1,quote:8})).toThrow(/posted job/);
    s=submit(s,'a',{...order,quote:8});const next=resolve(s,1,{a:2,b:2});
    expect(next.trips[0]).toMatchObject({income:8,cost:4,bonus:0,points:4,outsourcedTo:'b'});
    expect(next.trips[1]).toMatchObject({income:4,cost:1,points:3});
    expect(next.players.reduce((n,p)=>n+p.score,0)).toBe(7);
    expect(next.players[1].inventory!['teleport-10']).toBe(0);
    expect(resolve(next,2,{a:2,b:2})).toEqual(next);
  });
  it('a hiring crew can use a courier to poach an ambushed customer',()=>{
    let s=room();s.owners=['b'];s.event={kind:'ambush',a:0,b:1,title:'Ambush',text:'Blocked'};
    s=tradeAction(s,'a','post',{destination:0,pay:4,target:'b'});
    s=submit(s,'b',{...order,route:'scenic',subcontract:s.trades![0].id});
    expect(()=>submit(s,'a',{...order,quote:8})).not.toThrow();
  });
  it('unreserved jobs and counteroffers can be withdrawn, and sealed humans cannot negotiate',()=>{
    let s=tradeAction(room(),'a','post',{destination:0,pay:4,target:'b'});
    s=tradeAction(s,'b','counter',{id:s.trades![0].id,pay:5});
    s=tradeAction(s,'b','withdraw',{id:s.trades![0].id});expect(s.trades![0].pay).toBe(4);
    s=tradeAction(s,'a','cancel',{id:s.trades![0].id});expect(s.trades).toHaveLength(0);
    s=submit(s,'b',{...order,quote:6});expect(()=>tradeAction(s,'b','post',{destination:1,pay:3})).toThrow(/Negotiate/);
  });
  it('lying about equipment can cost money and trust; true claims can gain trust',()=>{
    let audits=0;
    for(let seed=1;seed<=40;seed++){
      let s=room();s.seed=seed;s=tradeAction(s,'a','post',{destination:0,pay:6,target:'b'});
      s=submit(s,'b',{...order,subcontract:s.trades![0].id,claim:'teleport'});s=submit(s,'a',{...order,quote:10});
      const next=resolve(s,1,{a:2,b:2});if((next.players[1].trust??0)<0){audits++;expect(next.trips[0].bonus).toBe(3);expect(next.trips[1].review).toMatch(/false claim/);}
    }
    expect(audits).toBeGreaterThan(3);expect(audits).toBeLessThan(30);
  });
  it('bots keep independent orders when a human changes a hidden price',()=>{
    const lobby=createCity('bot',driver('a','Alpha',null),{...DEFAULT_RULES,mode:'rivals',events:false});lobby.seed=19;
    const a=startCity(lobby,0),b=startCity({...lobby,players:lobby.players.map(p=>({...p,order:{...order,quote:1}}))},0);
    expect(a.players.filter(p=>p.bot).map(p=>p.order)).toEqual(b.players.filter(p=>p.bot).map(p=>p.order));
    const after=submit(syncPractice(a,{a:2}),'a',{...order,quote:1});
    expect(after.players.filter(p=>p.bot).map(p=>p.order)).toEqual(a.players.filter(p=>p.bot).map(p=>p.order));
    const radio=radioMessage(a,'a','bot-0');expect(radio.radio).toHaveLength(2);expect(radio.players.map(p=>p.order)).toEqual(a.players.map(p=>p.order));
  });
  it('optional wagers use harder math, no hints, one stake and a persistent deadline',()=>{
    let s=room();s.rules.crates=true;s.players[0].inventory={'cargo-1':1};
    s=startRisk(s,'a','cargo-1',{...DEFAULT_LEARNING,grade:8,topic:'mixed'},100);
    expect(count(s)).toBe(0);const c=s.players[0].challenge!;expect(c.problem.grade).toBe(9);expect(c.deadline).toBe(60100);
    const hidden=publicCity(s,'a').players[0].challenge!;expect(hidden.problem.answer).toBe(0);expect(hidden.problem.hint).toBeUndefined();
    expect(()=>submit(s,'a',order)).toThrow(/challenge/);
    const won=finishRisk(s,'a',c.id,c.problem.answer,1100);expect(count(won)).toBe(2);expect(won.players[0].challengeHistory![0]).toMatchObject({correct:true,elapsed:1000});
    expect(()=>finishRisk(won,'a',c.id,c.problem.answer,1200)).toThrow(/settled/);
    expect(()=>startRisk(won,'a',Object.keys(won.players[0].inventory!)[1],DEFAULT_LEARNING,1200)).toThrow();
  });
  it('timeouts settle without an extra answer and cannot earn loot after the deadline',()=>{
    let s=room();s.rules.crates=true;s.players[0].inventory={'cargo-1':1};s=startRisk(s,'a','cargo-1',DEFAULT_LEARNING,0);
    const next=resolve(s,60001,{a:2,b:2});expect(next.players[0].challenge!.status).toBe('lost');expect(next.players[0].challengeHistory![0].timedOut).toBe(true);expect(count(next)).toBe(0);
    expect(()=>finishRisk(next,'a',next.players[0].challenge!.id,0,60002)).toThrow();
  });
  it('a purchased bike saves travel on later rounds and teleport has an explicit cost',()=>{
    let s=room();s.rules.networks=true;s.players[0].score=20;
    const before=preview(s,s.players[0],order);s=buyTool(s,'a','bike');expect(s.players[0].score).toBe(8);
    expect(preview(s,s.players[0],order).travel).toBe(Math.ceil(before.travel/2));
    s.players[0].inventory={'teleport-1':1,'teleport-10':1};
    expect(preview(s,s.players[0],{...order,item:'teleport-1'}).cost).toBe(10);
    expect(preview(s,s.players[0],{...order,item:'teleport-10'}).cost).toBe(1);
    expect(()=>submit(s,'a',{...order,item:'teleport-10',perk:'teleport'})).toThrow();
  });
  it('shifted neighborhoods change route costs and replay records retain old coordinates',()=>{
    let s=room();const before=preview(s,s.players[0],order).cost;
    s.layout=[1,0,2,3,4,5];expect(preview(s,s.players[0],order).cost).not.toBe(before);
    s=submit(submit(s,'a',{...order,quote:value(s,0)}),'b',{...order,destination:1,quote:5});
    const next=resolve(s,1,{a:2,b:2});expect(next.trips[0]).toMatchObject({worldFrom:4,worldTo:1});
  });
});

describe('computer courier negotiations',()=>{
  it('refuses a loss-making counteroffer without changing its independent delivery',()=>{
    const lobby=createCity('bot-offer',driver('a','Alpha',null),{...DEFAULT_RULES,mode:'rivals',events:false,computers:2});lobby.seed=37;
    const s=startCity(lobby,0),job=s.trades![0],owner=s.players.find(p=>p.id===job.owner)!;
    const next=tradeAction(s,'a','counter',{id:job.id,pay:value(s,job.destination),claim:'teleport'});
    expect(next.trades![0].counterBy).toBeUndefined();expect(next.trades![0].pay).toBe(job.pay);expect(next.players.find(p=>p.id===owner.id)!.order).toEqual(owner.order);expect(next.radio!.join(' ')).toMatch(/too little profit/);
  });
  it('allows nine bots to complete an entire 24-round campaign with independent orders',()=>{
    const lobby=createCity('long-city',driver('a','Alpha',null),{...DEFAULT_RULES,mode:'rivals',format:'solo',computers:9,length:'campaign',rounds:24,minutes:0});lobby.seed=421;
    let s=startCity(lobby,0);
    for(let r=1;r<=24;r++){
      expect(s.players.filter(p=>p.bot&&p.order)).toHaveLength(9);
      s=resolve(submit(syncPractice(s,{a:r*2}),'a',{...order,route:'scenic',quote:value(s,0)}),r,{a:r*2});
    }
    expect(s.phase).toBe('done');expect(s.reportHistory).toHaveLength(24);expect(s.players.every(p=>Number.isFinite(p.score))).toBe(true);
  });
});
