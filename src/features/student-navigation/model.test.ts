import {describe,it,expect} from 'vitest';
import {createInitialEngineState} from '../../engine/state/createInitialEngineState';
import {engineReducer} from '../../engine/state/engineReducer';
import {GameEngine} from '../../engine/core/GameEngine';
import {createScreenPreview} from '../../devtools/screenCatalog';
import {nextEgg,exclusiveActivity,checkActivity} from './model';
import {activities} from './catalog';
const now=Date.parse('2026-09-23T17:00:00Z');
describe('student next steps and navigation',()=>{
 it('connects every game card, arcade rematches, and saved returns to an assigned check',()=>{
  const s=createInitialEngineState();
  for(const card of activities)expect(checkActivity(card,s),card.label).toBeTruthy();
  for(const game of ['dash','guard','cafe'] as const){
   expect(checkActivity({label:'Round',action:{type:'ARCADE_START',game,level:1}},s)).toBe(game);
   expect(checkActivity({label:'Return',resume:true,action:{type:'SET_SCREEN',screen:'arcade'}},{...s,activityRoute:`arcade-${game}`})).toBe(game);
  }
  expect(checkActivity({label:'Shop',action:{type:'SET_SCREEN',screen:'arcade'},hash:'arcade-shop'},s)).toBeUndefined();
  expect(checkActivity({label:'Learning target',callback:()=>{},purpose:'learning'},s)).toBeUndefined();
  expect(checkActivity({label:'Classroom play',callback:()=>{}},s)).toBe('classroom');
  expect(checkActivity({label:'Care',action:{type:'SET_SCREEN',screen:'pet_care'}},s)).toBeUndefined();
 });
 it('does not send a learner with a hatched pet back to an unfinished egg goal',()=>{
  const s=createScreenPreview('pet_care',createInitialEngineState().learning);s.egg=null;s.eggDiscovery=createInitialEngineState().eggDiscovery;
  expect(s.pet).toBeTruthy();expect(nextEgg(s,now)).toBeNull();
 });
 it('starts the next egg mission directly; a partial mission resumes the same questions',()=>{
  const s=createInitialEngineState();s.eggDiscovery!.stamps=[{day:'2026-09-21',style:'help',source:'classroom'},{day:'2026-09-22',style:'help',source:'classroom'}];
  expect(nextEgg(s,now)?.title).toContain('Day 3');expect(nextEgg(s,now)?.intent.action?.type).toBe('START_DISCOVERY_MISSION');
  s.eggDiscovery!.stamps.push({day:'2026-09-23',style:'help',source:'classroom'});expect(nextEgg(s,now)?.title).toBe('Today is complete!');
 });
 it('shows reveal after five credits without clearing an unfinished board',()=>{
  let s=createInitialEngineState();s.eggDiscovery!.stamps=Array.from({length:5},(_,i)=>({day:`2026-09-${18+i}`,style:'help' as const,source:'classroom' as const}));s=engineReducer(s,{type:'START_MOMENTUM'});
  expect(nextEgg(s,now)?.intent.action?.type).toBe('REVEAL_DISCOVERY_EGG');expect(exclusiveActivity(s)?.ends).toEqual([{type:'END_MOMENTUM'}]);expect(s.momentum.active).toBe(true);
 });
 it('ends an unfinished Momentum board without inventing rewards and releases the mission lock',()=>{
  const before=createInitialEngineState();const playing=engineReducer(before,{type:'START_MOMENTUM'});const after=engineReducer(playing,{type:'END_MOMENTUM'});expect(after.player.currencies).toEqual(before.player.currencies);expect(exclusiveActivity(after)).toBeNull();expect(engineReducer(after,{type:'START_DISCOVERY_MISSION',style:'help'}).eggDiscovery?.mission).toBeTruthy();
 });
 it('does not allow a delayed metadata response to reopen a cancelled destination',async()=>{
  const engine=new GameEngine(createInitialEngineState());let resolve!:()=>void;engine.setLearningSync(()=>new Promise<void>(r=>{resolve=r;}));engine.dispatchDirect({type:'SET_SCREEN',screen:'math'});engine.cancelPendingNavigation();resolve();await Promise.resolve();await Promise.resolve();expect(engine.getState().screen).not.toBe('math');
 });
 it('sends navigation requests through one handler without mutating saved games',()=>{
  const engine=new GameEngine(createInitialEngineState());const s=engine.getState();engine.setNavigationHandler(a=>a.type==='SET_SCREEN');engine.dispatch({type:'SET_SCREEN',screen:'math'});expect(engine.getState()).toBe(s);engine.dispatchDirect({type:'SET_SCREEN',screen:'math'});expect(engine.getState().screen).toBe('math');
 });
 it('recovers overlapping legacy activities only through named normal exits',()=>{
  let s=createScreenPreview('run_map',createInitialEngineState().learning);s=engineReducer(s,{type:'START_MOMENTUM'});
  const active=exclusiveActivity(s)!;expect(active.label).toContain('Dungeon adventure');expect(active.label).toContain('Momentum');expect(s.run.active&&s.momentum.active).toBe(true);
  const after=active.ends.reduce(engineReducer,s);expect(exclusiveActivity(after)).toBeNull();expect(after.player.currencies).toEqual(s.player.currencies);expect(after.pet).toEqual(s.pet);
 });

 it('finishes an already submitted egg answer before a menu switch cancels navigation',async()=>{
  const initial=engineReducer(createInitialEngineState(),{type:'START_DISCOVERY_MISSION',style:'help'}),engine=new GameEngine(initial);let release!:()=>void;
  engine.setLearningSync(()=>new Promise<void>(r=>{release=r;}));engine.dispatchDirect({type:'ANSWER_DISCOVERY_MISSION',questionId:initial.eggDiscovery!.mission!.problems[0].id,answer:String(initial.eggDiscovery!.mission!.problems[0].answer)});
  let ready=false;const switching=engine.finishPendingAnswer().then(()=>{ready=true;engine.cancelPendingNavigation();});await Promise.resolve();expect(ready).toBe(false);release();await switching;expect(engine.getState().eggDiscovery?.mission?.index).toBe(1);
 });

});
