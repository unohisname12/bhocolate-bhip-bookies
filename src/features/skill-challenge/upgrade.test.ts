import {describe,it,expect} from 'vitest';
import {skillsForGrade} from './catalog';
import {lesson,learningProblem} from './lessons';
import {initial,begin,answer,hint,readLesson,reflect,confirm,focus,takeBreak,publicProgress,ENHANCED_POLICY,metrics,reviewGroup,type Progress,type Stage} from './model';
import {normalizeLearning} from '../../services/game/curriculum';
let seed=6397,id=0;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
const policy={...ENHANCED_POLICY,target:1};
function fresh(grade=8,variant=0){return initial(normalizeLearning({grade,challenge:'support'}),[{id:`g${grade}-s${variant}`,reason:'Teacher selected'}],policy);}
function solve(p:Progress,stage:Stage,now:number,correct=true){let n:Progress;try{n=begin(p,p.targets[0].id,stage,policy,now,random,`v2-${++id}`);}catch(e){throw new Error(`${p.targets[0].id} ${stage}: ${(e as Error).message}`);}return answer(n,n.current!.id,String(n.current!.answer+(correct?0:999)),now);}
function practice(){let p=fresh();for(let i=0;i<3;i++)p=solve(p,'baseline',100+i,i!==0);p=readLesson(p,p.targets[0].id,200);for(let i=0;i<3;i++)p=solve(p,'practice',300+i);return p;}
function checked(){let p=practice();for(let i=0;i<5;i++)p=solve(p,'check',400+i);return p;}
describe('guided K–12 path',()=>{
 it('records a scaffolded missing-step task as supported even without a hint click',()=>{
  let p=fresh();for(let i=0;i<3;i++)p=solve(p,'baseline',100+i,i!==0);
  p=readLesson(p,p.targets[0].id,200);p=solve(p,'practice',201);
  expect(p.events.at(-1)).toMatchObject({representation:'guided-step',supported:true,answerRevealed:false});
  expect(metrics(p,p.targets[0]).independentPractice).toBe(0);
 });
 it('completes fresh, supported, independent, transfer, delayed and one-week work for every supported objective',()=>{
  for(let grade=0;grade<=12;grade++)for(const skill of skillsForGrade(grade)){
   let p=fresh(grade,skill.variant),now=1000;
   expect(lesson(skill.id,'support').steps.length).toBe(3);
   for(let i=0;i<3;i++)p=solve(p,'baseline',++now,i!==0);
   expect(()=>solve(p,'practice',++now)).toThrow(/example/);
   p=readLesson(p,skill.id,++now);
   for(let i=0;i<3;i++)p=solve(p,'practice',++now);
   for(let i=0;i<5;i++)p=solve(p,'check',++now);
   expect(()=>solve(p,'follow',now+86400000)).toThrow();
   for(let i=0;i<2;i++)p=solve(p,'transfer',++now);
   p=reflect(p,skill.id,'I will explain the quantities to my teacher.');now+=86400000;
   for(let i=0;i<2;i++)p=solve(p,'follow',++now);
   expect(reviewGroup(p,p.targets[0],policy,now),skill.id).toBe('Ready for review');
   p=confirm(p,skill.id,'Explained the relationship aloud and checked a fresh example.',++now);
   expect(()=>solve(p,'retention',now)).toThrow();now+=7*86400000;
   for(let i=0;i<2;i++)p=solve(p,'retention',++now,i!==0);
   expect(metrics(p,p.targets[0]).retention).toBe(1);expect(p.targets[0].confirmedAt).toBeTruthy();
   expect(()=>solve(p,'retention',++now)).toThrow();
  }
 });
 it('never sends hidden solutions or hint tiers; answer reveal remains supported and retries are idempotent',()=>{
  let p=practice();p=begin(p,p.targets[0].id,'practice',policy,1000,random,'private');
  let q=publicProgress(p).current!;expect(q).not.toHaveProperty('answer');expect(q).not.toHaveProperty('hint');expect(q).not.toHaveProperty('hints');expect(q).not.toHaveProperty('outcome');
  for(let i=0;i<3;i++)p=hint(p,'private');q=publicProgress(p).current!;expect(q.hint).toContain('Worked example');
  p=answer(p,'private',String(p.current!.answer),1001);expect(p.events.at(-1)).toMatchObject({supported:true,answerRevealed:true});expect(answer(p,'private','99',1002).events).toEqual(p.events);
  p=begin(p,p.targets[0].id,'check',policy,1003,random,'independent');expect(()=>hint(p,'independent')).toThrow();
 });
 it('failed transfer needs fresh practice and explanations never auto-confirm a skill',()=>{
  let p=checked();p=solve(p,'transfer',501,false);p=solve(p,'transfer',502);expect(p.targets[0].passedAt).toBeNull();expect(()=>solve(p,'check',503)).toThrow(/practice/);
  p=checked();p=solve(p,'transfer',501);p=solve(p,'transfer',502);p=solve(p,'follow',86401000);p=solve(p,'follow',86401001);
  expect(()=>confirm(p,p.targets[0].id,'Looks fine',86401002)).toThrow(/explanation/);p=reflect(p,p.targets[0].id,'Some words');expect(p.targets[0].confirmedAt).toBeNull();
 });
 it('persists focus and approved breaks without changing answers or allowing a different target',()=>{
  let p=fresh();p.targets.push(fresh(8,1).targets[0]);p=focus(p,'g8-s0','lesson',true,100);
  expect(()=>begin(p,'g8-s1','baseline',policy,101,random,'other')).toThrow(/focused/);
  p=solve(p,'baseline',102,false);const events=p.events;p=takeBreak(p,true);expect(()=>solve(p,'baseline',103)).toThrow();p=takeBreak(p,false);p=focus(p,'','lesson',false,104);expect(p.events).toEqual(events);expect(p.focus).toBeNull();
 });
 it('different-use prompts change representation and key contexts and retain countable objects',()=>{
  for(const skill of ['g5-s4','g6-s0','g8-s0']){
   const p=learningProblem(skill,'standard','practice',1,()=>.4),t=learningProblem(skill,'standard','transfer',0,()=>.4);
   expect(p.visual).toBeTruthy();expect(t.visual).toBeUndefined();expect(t.text).not.toBe(p.text);expect(t.templateId).toContain('transfer-v3');expect(t.representation).not.toBe(p.representation);
  }
  const counting=learningProblem('g0-s0','support','follow',0,()=>.4);expect(counting.text.match(/●/g)?.length).toBe(counting.answer);
 });
 it('checks selected context math independently across support, standard and stretch',()=>{
  for(const level of ['support','standard','stretch'] as const)for(let i=0;i<50;i++){
   const fraction=learningProblem('g5-s4',level,'practice',1,random),f=Object.fromEntries(fraction.visual!.rows),[n,d]=f['Fraction used'].split('/').map(Number);expect(fraction.answer).toBe(Number(f['Whole supply'])*n/d);
   const rate=learningProblem('g6-s0',level,'practice',1,random),r=Object.fromEntries(rate.visual!.rows);expect(rate.answer).toBe(Number(r['Original cost'])/Number(r['Original kits']));
   const eq=learningProblem('g8-s0',level,'practice',1,random),e=Object.fromEntries(eq.visual!.rows);expect(eq.answer).toBe((Number(e['Total budget'])-Number(e['Fixed fee']))/Number(e['Cost per parcel']));
  }
 });
});
