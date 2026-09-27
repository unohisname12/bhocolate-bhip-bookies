import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRival,recordMatch,searchPlan,rivalEdge,taunt,markTaunted,rivalTitle,rankName,validRival,LIMITS,type MatchResult,type Rival} from './model';

const fern=(o:Partial<MatchResult['students'][number]>={})=>({studentId:'s-fern',petName:'Sir Biscuit',caught:false,escaped:false,spots:[{x:410,y:300}],...o});
const kai=(o:Partial<MatchResult['students'][number]>={})=>({studentId:'s-kai',petName:'Toastmaster',caught:false,escaped:false,spots:[{x:900,y:600}],...o});
const play=(r:Rival,m:Partial<MatchResult>,t:number)=>recordMatch(r,{arenaId:'grove',hunterWon:false,students:[fern()],...m},t);

describe('class rivals',()=>{
 it('remember where each student hides, and check the strongest spots first',()=>{
  let r=createRival(0,'Fractions');
  for(let i=0;i<3;i++)r=play(r,{hunterWon:true,students:[fern({caught:true,spots:[{x:405,y:310}]}),...(i===0?[kai({spots:[{x:880,y:590}]})]:[])]},i);
  const plan=searchPlan(r,'grove',['s-fern','s-kai']);
  expect(plan[0]).toMatchObject({x:400,y:320});expect(plan[0].weight).toBeGreaterThan(plan[1].weight);
  expect(searchPlan(r,'grove',['s-kai'])[0]).toMatchObject({x:880,y:560});
  expect(searchPlan(r,'volcano',['s-fern'])).toEqual([]);
  expect(r.grudges.find(g=>g.studentId==='s-fern')).toMatchObject({encounters:3,caught:3,lastOutcome:'caught'});
 });
 it('adapt to a trick that keeps working, with a cap, and forget tricks nobody uses anymore',()=>{
  let r=createRival(1,'Ratios');
  for(let i=0;i<20;i++)r=play(r,{students:[fern({escaped:true,fooledByDecoy:true})]},i);
  expect(r.adaptations.decoyResistance).toBe(0.6);
  for(let i=0;i<10;i++)r=play(r,{hunterWon:true,students:[fern({caught:true})]},100+i);
  expect(r.adaptations.decoyResistance).toBeCloseTo(0.4,5);
 });
 it('climb ranks on win streaks and carry the scar of whoever beat them',()=>{
  let r=createRival(0,'Fractions');
  for(let i=0;i<6;i++)r=play(r,{hunterWon:true,students:[fern({caught:true})]},i);
  expect(r.rank).toBe(3);expect(rankName(r)).toBe('Hunter');
  r=play(r,{students:[fern({escaped:true,sneakedPast:true})]},10);
  expect(rivalTitle(r)).toBe('Muddy Bramble Sentinel');expect(r.scars[0].by).toBe('Sir Biscuit');
  r=play(r,{students:[kai({escaped:true,usedBeacons:3})]},11);expect(r.rank).toBe(2);expect(rivalTitle(r)).toBe('Singed Bramble Sentinel');
  for(let i=0;i<10;i++)r=play(r,{students:[kai({escaped:true})]},20+i);
  expect(r.scars.length).toBe(LIMITS.scars);expect(r.rank).toBe(1);
 });
 it('stay beatable: rank edge is capped and mastering the weakness skill takes it back',()=>{
  const r={...createRival(0,'Fractions'),rank:5};
  expect(rivalEdge(r,[])).toBe(1.2);expect(rivalEdge(r,['fractions'])).toBe(1.05);expect(rivalEdge(createRival(0,'Fractions'),['Fractions'])).toBe(0.85);
 });
 it('taunts from real shared history, without repeating a used line',()=>{
  let r=createRival(0,'Fractions');
  for(let i=0;i<3;i++)r=play(r,{students:[fern({escaped:true})]},i);
  const escaped=taunt(r,'escaped','s-fern')!;expect(escaped.text).toBe('Sir Biscuit escaped AGAIN? I’m writing that down.');
  const intro=taunt(r,'intro',null)!;expect(intro.text).toMatch(/Bramble Sentinel is back\. Sir Biscuit gave me this/);
  r=markTaunted(r,intro.key,6);expect(taunt(r,'intro',null)!.key).not.toBe(intro.key);
  expect(taunt(r,'spotted','s-nobody')).toBeUndefined();
 });
 it('taunts never target the child, only the pets and the chase',()=>{
  const src=readFileSync(new URL('./model.ts',import.meta.url),'utf8');
  const lines=[...src.matchAll(/`([^`]{8,})`|'([A-Z][^']{10,})'/g)].map(m=>m[1]??m[2]);
  expect(lines.length).toBeGreaterThan(10);
  for(const l of lines)expect(l).not.toMatch(/stupid|dumb|loser|bad at|can.t do math|you.re slow|idiot|ugly|cry|hate/i);
 });
 it('rejects forged rival records',()=>{
  let r=createRival(2,'Slope');r=play(r,{students:[fern({escaped:true})]},1);
  expect(validRival(JSON.parse(JSON.stringify(r)))).toBe(true);
  expect(validRival({...r,rank:9})).toBe(false);expect(validRival({...r,adaptations:{...r.adaptations,hearing:5}})).toBe(false);
  expect(validRival({...r,scars:[{kind:'cursed',by:'x',at:1}]})).toBe(false);
 });
});
