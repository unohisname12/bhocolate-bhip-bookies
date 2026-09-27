import {describe,it,expect} from 'vitest';
import validate from './generated/validate-engine.js';
import {freshGame,studentCheckpoint} from './game-state';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {generateLearningProblem,GRADE_TOPICS} from '../src/services/game/curriculum';
function petSave(){const s=freshGame('learner','Learner');s.pet=hatchEgg({id:'egg',type:'koala_sprite',state:'ready',progress:100,createdAt:new Date().toISOString()});s.pet!.progression.xp=140;s.player.activePetId=s.pet!.id;return s;}
describe('typed save dictionaries',()=>{
 for(const grade of [5,6,8])it(`accepts the grade ${grade} pending move in the deployed save schema and restores it`,()=>{
  let before=freshGame('learner','Learner');before.screen='arcade';before.learning={...before.learning,grade,topic:'mixed'};
  before=engineReducer(before,{type:'ARCADE_START',game:grade===8?'guard':'cafe',level:1,learningMode:true});before.arcade!.run!.orders=[0,1,2];
  const pending=engineReducer(before,{type:'ARCADE_PLAN',move:grade===8?{kind:'build-row',tower:'frost',reserve:4}:{kind:'recipe-batch',servings:3}});
  const encoded=JSON.parse(JSON.stringify(pending));expect(validate(encoded)).toBe(true);
  const saved=studentCheckpoint(encoded,before,before.player.id,before.player.displayName);
  expect(saved.arcade?.run?.pendingPlan).toEqual(pending.arcade!.run!.pendingPlan);
  const done=engineReducer(saved,{type:'ARCADE_DECIDE',answer:grade===8?2:6});
  expect(validate(JSON.parse(JSON.stringify(done)))).toBe(true);expect(done.arcade!.run!.pendingPlan).toBeUndefined();
 });

 it('accepts math level-up rewards in every grade and preserves the checkpoint',()=>{
  for(let grade=0;grade<GRADE_TOPICS.length;grade++){
   const before=petSave();before.learning={...before.learning,grade};const problem=generateLearningProblem(before.learning);
   const next=engineReducer(before,{type:'SOLVE_MATH',correct:true,difficulty:problem.difficulty,reward:problem.reward,problem,source:'practice'});
   expect(next.pet!.progression.level).toBe(2);expect(next.prizes!.levelClaims[next.pet!.id]).toBe(2);
   expect(validate(JSON.parse(JSON.stringify(next)))).toBe(true);
   const saved=studentCheckpoint(next,before,'learner','Learner');expect(saved.prizes).toEqual(next.prizes);expect(saved.player.lifetimeMathCorrect).toBe(1);
  }
 });
 it('accepts typed per-hint progress and per-pet cosmetic slots',()=>{
  const s=petSave();s.help.hintCounts={'math.retry':2};s.help.hintTimestamps={'math.retry':Date.now()};s.cosmetics.equipped={[s.pet!.id]:{hat:'cos_star_beret',aura:null}};
  expect(validate(s)).toBe(true);
 });
 it('continues rejecting malformed dictionary values and unknown fields',()=>{
  const s=petSave();s.prizes={wins:0,medals:0,boosts:{attack:0,defense:0},armed:null,levelClaims:{[s.pet!.id]:2},classClaims:[]};
  expect(validate({...s,prizes:{...s.prizes,levelClaims:{pet:'two'}}})).toBe(false);
  expect(validate({...s,help:{...s.help,hintCounts:{hint:'two'}}})).toBe(false);
  expect(validate({...s,cosmetics:{...s.cosmetics,equipped:{pet:{hat:9}}}})).toBe(false);
  expect(validate({...s,cosmetics:{...s.cosmetics,equipped:{pet:{unknownSlot:'hat'}}}})).toBe(false);
  expect(validate({...s,unknownRoot:true})).toBe(false);
  expect(validate({...s,prizes:{...s.prizes,unknownReward:9}})).toBe(false);
 });
});
