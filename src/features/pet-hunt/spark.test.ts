import { describe, expect, it } from 'vitest';
import { makeCheck, seededRandom } from './spark';
describe('spark checks',()=>{
 it('every grade gets short three-choice questions with exactly one right answer',()=>{
  const r=seededRandom(7);const seen:Record<string,number>={};
  for(let g=0;g<=12;g++)for(let i=0;i<60;i++){const c=makeCheck(i,g,r);seen[c.kind]=(seen[c.kind]??0)+1;
   expect(c.choices).toHaveLength(3);expect(new Set(c.choices).size).toBe(3);expect(c.answer).toBeGreaterThanOrEqual(0);expect(c.answer).toBeLessThan(3);
   expect(c.prompt.length).toBeLessThanOrEqual(30);if(g<6)expect(c.choices.every(x=>!x.startsWith('-'))).toBe(true);}
  expect(Object.keys(seen).sort()).toEqual(['compare','facts','missing']);
 });
 it('the marked answer is actually right',()=>{
  const r=seededRandom(3);
  for(let i=0;i<200;i++){const c=makeCheck(i,2,r);if(c.kind!=='missing')continue;const [a,,sum]=c.prompt.split(/ \+ \? = | /).map(Number);const m=c.prompt.match(/^(\d+) \+ \? = (\d+)$/)!;expect(Number(c.choices[c.answer])).toBe(Number(m[2])-Number(m[1]));void a;void sum;}
  for(let i=0;i<200;i++){const c=makeCheck(i,4,r);if(c.kind!=='compare')continue;const val=(s:string)=>s.includes('/')?Number(s.split('/')[0])/Number(s.split('/')[1]):Number(s);expect(val(c.choices[c.answer])).toBe(Math.max(...c.choices.map(val)));}
 });
 it('relaxed checks give more time',()=>{expect(makeCheck(1,3,seededRandom(1),true).left).toBeGreaterThan(makeCheck(1,3,seededRandom(1)).left);});
});
