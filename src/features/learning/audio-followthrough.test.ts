import {describe,it,expect} from 'vitest';
import {createInitialEngineState} from '../../engine/state/createInitialEngineState';
import {engineReducer} from '../../engine/state/engineReducer';
import {validArcade,RECIPES} from '../arcade/model';
import {arcadeDecision,supportsLearningRun} from '../arcade/learning';
import {normalizeLearning} from '../../services/game/curriculum';
import {deepTransfer} from '../skill-challenge/transfer';
import {nextPractice} from './review';

function start(grade:number,game:'cafe'|'guard') {
 let state=createInitialEngineState();state.learnerProfileId=state.player.id;state.screen='arcade';state.learning=normalizeLearning({grade});
 state=engineReducer(state,{type:'ARCADE_START',game,level:1,learningMode:true});
 state.arcade!.run!.orders=[0,1,2];return state;
}
describe('audio critique: math changes real gameplay',()=>{
 for(const [grade,topic,expected] of [[6,'Fraction division',4],[7,'Proportional relationships',6]] as const)it(`uses actual café quantities for grade ${grade} ${topic}`,()=>{
  let s=start(grade,'cafe');s.learning=normalizeLearning({grade,topic});
  expect(supportsLearningRun('cafe',s.learning)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:3}});
  expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(expected);expect(validArcade(s.arcade)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:expected});
  expect(s.arcade!.run!.stock).toEqual([2,8,8]);expect(s.learningEvidence?.at(-1)?.topic).toBe(topic);
 });
 it('uses the actual tower cost in a grade 8 energy function',()=>{
  let s=start(8,'guard');s.learning=normalizeLearning({grade:8,topic:'Linear functions'});
  expect(supportsLearningRun('guard',s.learning)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'build',tower:'rapid',slot:0}});
  expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(8);expect(validArcade(s.arcade)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:8});expect(s.arcade!.run!.energy).toBe(8);
  expect(s.arcade!.run!.towers[0]).toBe('rapid');
 });
 it('grade 7 percentages predict real stock changes and preserve retry/help evidence',()=>{
  let s=start(7,'cafe');s.learning=normalizeLearning({grade:7,topic:'Percentages'});
  expect(supportsLearningRun('cafe',s.learning)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:3}});
  const p=s.arcade!.run!.pendingPlan!.problem;
  expect(p.answer).toBe(75);expect(p.topic).toBe('Percentages');
  expect(validArcade(s.arcade)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:6});expect(s.arcade!.run!.stock).toEqual([8,8,8]);
  s=engineReducer(s,{type:'RECORD_LEARNING_HELP',problem:p,support:'hint'});
  s=engineReducer(JSON.parse(JSON.stringify(s)),{type:'ARCADE_DECIDE',answer:75});
  expect(s.arcade!.run!.stock).toEqual([2,8,8]);expect(s.arcade!.run!.step).toBe(3);
  expect(s.learningEvidence?.at(-1)).toMatchObject({correct:true,firstAttemptCorrect:false});
  expect(engineReducer(s,{type:'ARCADE_DECIDE',answer:75})).toBe(s);
 });
 it('grade 7 also checks ordinary serving, with explicit rounding for repeating percentages',()=>{
  const s=start(7,'cafe'),r=s.arcade!.run!;r.stock=[7,8,8];r.tray=[...RECIPES[0].parts];
  const p=arcadeDecision(r,s.learning,{kind:'serve'})!.problem;
  expect(p.answer).toBe(8.7);expect(p.question).toContain('nearest tenth');
  expect(arcadeDecision(r,normalizeLearning({grade:7,topic:'One-step equations'}),{kind:'serve'})?.problem.topic).toBe('One-step equations');
 });
 for(const grade of [5,6])it(`applies the grade ${grade} batch once, keeps support after reload, and spends the actual ingredients`,()=>{
  let s=start(grade,'cafe');const before=s.arcade!.run!;
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:3}});
  const p=s.arcade!.run!.pendingPlan!;
  expect(p.problem.answer).toBe(6);expect(p.problem.topic).toBe(grade===5?'Fraction of a quantity':'Ratios');
  expect(validArcade(s.arcade)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:3});expect(s.arcade!.run!.stock).toEqual(before.stock);
  s=engineReducer(s,{type:'RECORD_LEARNING_HELP',problem:p.problem,support:'explanation'});
  s=JSON.parse(JSON.stringify(s));
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:6});
  expect(s.arcade!.run!.stock).toEqual([2,8,8]);expect(s.arcade!.run!.step).toBe(3);expect(s.arcade!.run!.score).toBe(60);
  expect(s.learningEvidence?.at(-1)).toMatchObject({correct:true,answerRevealed:true,firstAttemptCorrect:false});
  expect(s.skillReviews?.at(-1)?.needsFreshCheck).toBe(true);
  expect(engineReducer(s,{type:'ARCADE_DECIDE',answer:6})).toBe(s);expect(validArcade(s.arcade)).toBe(true);
 });
 it('uses every ingredient, ends a batch shift once, and rejects impossible batches',()=>{
  let s=start(6,'cafe');s.arcade!.run!.orders=[3,1,2];s.arcade!.run!.step=7;
  expect(arcadeDecision(s.arcade!.run!,s.learning,{kind:'recipe-batch',servings:3})).toBeNull();
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:2}});
  expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(4);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:4});
  expect(s.arcade!.run!.stock).toEqual([8,4,6]);expect(s.arcade!.run!.done).toBe(true);
  const stars=s.arcade!.stars;expect(engineReducer(s,{type:'ARCADE_DECIDE',answer:4}).arcade!.stars).toBe(stars);
 });
 it('solves the tower budget, builds in empty plots, keeps the reserve and freezes the pending assignment',()=>{
  let s=start(8,'guard');const wallet=s.player.currencies;
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'build-row',tower:'frost',reserve:4}});
  expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(2);expect(validArcade(s.arcade)).toBe(true);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:3});expect(s.arcade!.run!.towers).toEqual([null,null,null]);
  s=engineReducer(s,{type:'SET_LEARNING_SETTINGS',settings:normalizeLearning({grade:12})});
  s=engineReducer(JSON.parse(JSON.stringify(s)),{type:'ARCADE_DECIDE',answer:2});
  expect(s.arcade!.run!.towers).toEqual(['frost','frost',null]);expect(s.arcade!.run!.energy).toBe(4);
  expect(s.learningEvidence?.at(-1)?.grade).toBe(8);expect(s.player.currencies).toEqual(wallet);
 });
 it('does not offer a lesson for the wrong assigned topic or let a forged/changed plan spend stock',()=>{
  expect(supportsLearningRun('cafe',normalizeLearning({grade:5,topic:'Decimals'}))).toBe(false);
  expect(supportsLearningRun('guard',normalizeLearning({grade:8,topic:'Pythagorean theorem'}))).toBe(false);
  const s=start(8,'guard');for(const reserve of [0,-1,3,12,NaN])expect(arcadeDecision(s.arcade!.run!,s.learning,{kind:'build-row',tower:'rapid',reserve})).toBeNull();
  let cafe=start(5,'cafe');cafe=engineReducer(cafe,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:3}});
  cafe.arcade!.run!.stock[0]=1;
  expect(validArcade(cafe.arcade)).toBe(false);expect(engineReducer(cafe,{type:'ARCADE_DECIDE',answer:6})).toBe(cafe);
 });
 it('scales every recipe and serving choice against actual stock',()=>{
  for(const grade of [5,6])for(let recipe=0;recipe<RECIPES.length;recipe++)for(const servings of [2,3]){
   let s=start(grade,'cafe');s.arcade!.run!.orders[0]=recipe;
   s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings}});
   const counts=[0,1,2].map(i=>RECIPES[recipe].parts.filter(x=>x===i).length);
   const answer=counts.find(n=>n>0)!*servings;
   expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(answer);
   s=engineReducer(s,{type:'ARCADE_DECIDE',answer});expect(s.arcade!.run!.stock).toEqual(counts.map(n=>8-n*servings));
  }
 });
});
describe('authored different-use checks',()=>{
 const cases:[string,number,number][]=[['g5-s3',2,2],['g5-s4',4,4],['g5-s5',6,6],['g6-s0',2,1],['g6-s1',6,9],['g6-s2',10,8],['g8-s0',2,2],['g8-s1',3,2],['g8-s2',2,2]];
 for(const [id,first,second] of cases)it(`${id} changes how the math is used and has the reviewed solutions`,()=>{
  const one=deepTransfer(id,'support',0,()=>0)!,two=deepTransfer(id,'support',1,()=>0)!;
  expect(one.answer).toBe(first);expect(two.answer).toBe(second);expect(one.templateId).not.toBe(two.templateId);
  expect(one.reasonPrompt).not.toBe('');expect(one.text).not.toBe(two.text);
 });
 it('ordinary review after supported gameplay uses the authored new representation',()=>{
  let s=start(5,'cafe');s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'recipe-batch',servings:3}});const problem=s.arcade!.run!.pendingPlan!.problem;
  s=engineReducer(s,{type:'RECORD_LEARNING_HELP',problem,support:'hint'});s=engineReducer(s,{type:'ARCADE_DECIDE',answer:6});
  const p=nextPractice(s.learning,s.skillReviews,problem,()=>0);
  expect(p.context).toBe('fresh-check');expect(p.templateId).toContain('transfer-v3');expect(p.question).toContain('bar');
 });
});
