import { describe,it,expect } from 'vitest';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { engineReducer } from '../../engine/state/engineReducer';
import { recordLearning } from '../../services/game/learningEvidence';
import { DEFAULT_LEARNING } from '../../services/game/curriculum';
import { DAY,dueReviews,nextPractice,validReviews } from './review';
import { quantityDecision,additionDecision } from './decisions';
import { RECIPES,validArcade } from '../arcade/model';
import { createCity,driver,startCity,DEFAULT_RULES,publicCity,resolve } from '../delivery/model';
import { startDeliveryPlan,deliveryPlanAction } from '../delivery/planning';
const settings={...DEFAULT_LEARNING,grade:2,topic:'Two-digit subtraction'};
const initial=():import('../../types').EngineState=>({...createInitialEngineState(),screen:'arcade' as const,learning:settings});
const problem=()=>quantityDecision(settings,'q','nest-cafe',24,3,'portions','Serve.')!;
describe('Learning support and independent review',()=>{
 it('preserves support and schedules fresh then delayed checks without awarding game currency',()=>{
  let s=initial();const p=problem();const wallet=s.player.currencies;
  s=recordLearning(s,p,'help',undefined,'explanation');
  s=recordLearning(s,p,'nest-cafe',true);
  expect(s.learningEvidence?.[0]).toMatchObject({answerRevealed:true,firstAttemptCorrect:false,support:'explanation'});
  expect(s.skillReviews?.[0].needsFreshCheck).toBe(true);
  const next=nextPractice(settings,s.skillReviews,p,()=>.5);
  expect(next.context).toBe('fresh-check');expect(next.question).not.toBe(p.question);
  s=recordLearning(s,next,'practice',true);
  expect(s.skillReviews?.[0].dueAt).toBeGreaterThan(Date.now()+DAY-1000);
  expect(dueReviews(s.skillReviews!,settings)).toHaveLength(0);
  expect(dueReviews(s.skillReviews!,settings,Date.now()+DAY+1000)).toHaveLength(1);
  expect(s.player.currencies).toBe(wallet);
  expect(validReviews(s.skillReviews)).toBe(true);
  expect(recordLearning(s,next,'practice',true)).toBe(s);
 });
 it('does not revisit unassigned grades/topics or pretend subtraction is algebra',()=>{
  expect(quantityDecision({...settings,grade:12,topic:'Derivatives'},'x','cafe',24,3,'items','Serve')).toBeNull();
  expect(additionDecision({...settings,grade:0,topic:'Addition within 10'},'m',4,3)?.answer).toBe(7);
  expect(additionDecision({...settings,grade:0,topic:'Addition within 10'},'m',9,5)).toBeNull();
  const s=recordLearning(initial(),problem(),'cafe',true);
  expect(dueReviews(s.skillReviews!,{...settings,grade:12,topic:'mixed'},Date.now()+10*DAY)).toEqual([]);
  expect(validReviews([{...s.skillReviews![0],dueAt:NaN}])).toBe(false);
 });
 it('retains compact review state when recent evidence rolls off',()=>{
  let s=recordLearning(initial(),problem(),'cafe',true);
  for(let i=0;i<205;i++)s=recordLearning(s,{...problem(),id:`later${i}`,grade:1,topic:'Subtraction within 20',skillId:'1:Subtraction within 20'},'practice',true);
  expect(s.learningEvidence).toHaveLength(200);expect(s.skillReviews).toHaveLength(2);
 });
});
describe('Actual arcade plans',()=>{
 it('allows repeat classic and learning runs without any charge',()=>{
  let s=initial();s=engineReducer(s,{type:'ARCADE_START',game:'cafe',level:1,learningMode:true});
  expect(s.arcade?.run?.learningMode).toBe(true);
  s=engineReducer(s,{type:'ARCADE_END'});s=engineReducer(s,{type:'ARCADE_CLOSE'});
  expect(engineReducer(s,{type:'ARCADE_START',game:'cafe',level:1}).arcade?.run).not.toBeNull();
  expect(engineReducer(s,{type:'ARCADE_START',game:'cafe',level:1,learningMode:true}).arcade?.run).not.toBeNull();
 });
 it('serves the chosen recipe only after a correct plan, persists help, and prevents replay',()=>{
  let s=engineReducer(initial(),{type:'ARCADE_START',game:'cafe',level:1,learningMode:true});
  const parts=RECIPES[s.arcade!.run!.orders[0]].parts;
  for(const value of parts)s=engineReducer(s,{type:'ARCADE_CAFE',kind:'ingredient',value});
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'serve'}});
  const pending=s.arcade!.run!.pendingPlan!,stock=s.arcade!.run!.stock;
  expect(pending.problem.answer).toBe(24-parts.length);expect(validArcade(s.arcade)).toBe(true);
  expect(engineReducer(s,{type:'ARCADE_RESTOCK',ingredient:0})).toBe(s);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:-999});expect(s.arcade!.run!.stock).toBe(stock);
  s=engineReducer(s,{type:'RECORD_LEARNING_HELP',problem:pending.problem,support:'hint'});
  s=JSON.parse(JSON.stringify(s));
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:pending.problem.answer});
  expect(s.arcade!.run!.step).toBe(1);expect(s.arcade!.run!.stock.reduce((a,b)=>a+b)).toBe(24-parts.length);
  expect(s.learningEvidence?.[0]).toMatchObject({correct:true,firstAttemptCorrect:false,support:'hint'});
  expect(engineReducer(s,{type:'ARCADE_DECIDE',answer:pending.problem.answer})).toBe(s);
 });
 it('charges the real tower cost and freezes a pending task across learning settings changes',()=>{
  let s=engineReducer(initial(),{type:'ARCADE_START',game:'guard',level:1,learningMode:true});
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'build',slot:0,tower:'rapid'}});
  expect(s.arcade!.run!.pendingPlan!.problem.answer).toBe(8);
  s=engineReducer(s,{type:'SET_LEARNING_SETTINGS',settings:{...settings,grade:12,topic:'Derivatives'}});
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:8});
  expect(s.arcade!.run!.energy).toBe(8);expect(s.arcade!.run!.towers[0]).toBe('rapid');
  expect(s.learningEvidence?.[0].grade).toBe(2);
 });
});
const order={destination:0,route:'direct' as const,bid:0,partner:'',perk:'' as const};
const city=()=>startCity(createCity('city',driver('me','Learner',null),{...DEFAULT_RULES,events:false}),1000);
describe('Delivery planning uses server state',()=>{
 it('validates the order, records retries, hides solutions, seals once and isolates learner evidence',()=>{
  let s=startDeliveryPlan(city(),'me',order,settings,1100);
  const task=s.players[0].learningPlan!;
  expect(publicCity(s,'me').players[0].learningPlan?.problem.explanation).toBeUndefined();
  expect(publicCity(s,'other').players[0].learningPlan).toBeUndefined();
  s=deliveryPlanAction(s,'me','answer',-999,1200);
  expect(s.players[0].submitted).toBe(false);
  s=deliveryPlanAction(s,'me','explanation',0,1250);
  expect(publicCity(s,'me').players[0].learningPlan?.problem.answer).toBe(task.problem.answer);
  s=deliveryPlanAction(s,'me','answer',task.problem.answer,1300);
  expect(s.players[0].submitted).toBe(true);
  expect(s.players[0].planningEvidence?.[0]).toMatchObject({correct:true,firstAttemptCorrect:false,support:'explanation'});
  expect(()=>deliveryPlanAction(s,'me','answer',task.problem.answer,1400)).toThrow();
  expect(publicCity(s,'other').players[0].planningEvidence).toBeUndefined();
  expect(resolve(s,1400,{me:0}).players[0].learningPlan).toBeUndefined();
 });
 it('rejects invalid orders, unavailable skills, expired rounds, and disabled help',()=>{
  expect(()=>startDeliveryPlan(city(),'me',{...order,destination:999},settings,1100)).toThrow();
  expect(()=>startDeliveryPlan(city(),'me',order,{...settings,grade:12,topic:'Derivatives'},1100)).toThrow();
  const s=startDeliveryPlan(city(),'me',order,{...settings,learningHelp:false},1100);
  expect(()=>deliveryPlanAction(s,'me','hint',0,1200)).toThrow();
  expect(()=>deliveryPlanAction(s,'me','answer',0,s.deadline+1)).toThrow();
 });
 it('rejects stale costs instead of applying a formerly correct plan',()=>{
  let s=startDeliveryPlan(city(),'me',order,settings,1100);
  const old=s.players[0].learningPlan!.problem.answer;
  s={...s,players:s.players.map(p=>p.id==='me'?{...p,evBike:true}:p)};
  s=deliveryPlanAction(s,'me','answer',old,1200);
  expect(s.players[0].submitted).toBe(false);
  expect(s.players[0].learningPlan?.feedback).toContain('costs changed');
 });
});

describe('Batch and restored support',()=>{
 it('uses the stock required by all three current orders, not future recipes',()=>{
  let s=engineReducer(initial(),{type:'ARCADE_START',game:'cafe',level:2,learningMode:true});
  const used=s.arcade!.run!.orders.flatMap(i=>RECIPES[i].parts).length;
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'batch'}});
  expect(s.arcade!.run!.pendingPlan?.problem.answer).toBe(24-used);
  s=engineReducer(s,{type:'ARCADE_DECIDE',answer:24-used});
  expect(s.arcade!.run!.step).toBe(3);
  expect(s.arcade!.run!.stock.reduce((a,b)=>a+b)).toBe(24-used);
  expect(s.arcade!.run!.score).toBe(70);
 });
 it('cannot erase revealed-answer evidence by cancelling and reopening a delivery plan',()=>{
  let s=startDeliveryPlan(city(),'me',order,settings,1100);
  s=deliveryPlanAction(s,'me','explanation',0,1200);
  s=deliveryPlanAction(s,'me','cancel',0,1300);
  s=startDeliveryPlan(s,'me',order,settings,1400);
  expect(s.players[0].learningPlan?.support).toBe('explanation');
  s=deliveryPlanAction(s,'me','answer',s.players[0].learningPlan!.problem.answer,1500);
  expect(s.players[0].planningEvidence?.[0].firstAttemptCorrect).toBe(false);
 });
});

describe('Review timing and save integrity',()=>{
 it('does not count consecutive same-day answers as spaced checks',()=>{
  let s=recordLearning(initial(),problem(),'cafe',true);const first=s.skillReviews![0];
  s=recordLearning(s,{...problem(),id:'another'},'practice',true);
  expect(s.skillReviews![0].dueAt).toBe(first.dueAt);
  expect(s.skillReviews![0].independentChecks).toBe(1);
 });
 it('rejects a tampered pending-plan answer in an imported save',()=>{
  let s=engineReducer(initial(),{type:'ARCADE_START',game:'guard',level:1,learningMode:true});
  s=engineReducer(s,{type:'ARCADE_PLAN',move:{kind:'build',slot:0,tower:'rapid'}});
  s.arcade!.run!.pendingPlan!.problem.answer=999;
  expect(validArcade(s.arcade)).toBe(false);
  expect(engineReducer(s,{type:'ARCADE_DECIDE',answer:999})).toBe(s);
 });
});
