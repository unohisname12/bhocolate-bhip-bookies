import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
import { creditDiscoveryActivity, upgradeDiscoveryActivities } from '../discoveryActivity';
import { matchCompanion, validEggDiscovery } from '../eggDiscovery';
import { careDate } from '../petGrowth';
import type { AdventureStyle } from '../../../types/discovery';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { COMPANIONS } from '../../../config/companionConfig';
const now=Date.UTC(2026,8,22,17),day=86400000;
afterEach(()=>vi.useRealTimers());
describe('all classroom activity advances discovery',()=>{
 it('counts a real incorrect practice attempt before quiz, only once daily, with five dates to reveal',()=>{
  vi.useFakeTimers();vi.setSystemTime(now);let s=createInitialEngineState();
  const problem={id:'attempt',question:'1+1',answer:2,hint:'Count',difficulty:1,reward:1,type:'addition' as const};
  s=engineReducer(s,{type:'SOLVE_MATH',difficulty:1,correct:false,reward:0,problem,source:'practice'});
  expect(s.eggDiscovery!.stamps).toHaveLength(1);expect(s.eggDiscovery!.answers).toEqual([-1,-1,-1,-1]);
  s=engineReducer(s,{type:'COMPLETE_CLASSROOM_ACTIVITY',game:'delivery'});expect(s.eggDiscovery!.stamps).toHaveLength(1);
  expect(engineReducer(s,{type:'REVEAL_DISCOVERY_EGG'})).toBe(s);
  for(let i=1;i<5;i++){vi.setSystemTime(now+i*day);s=engineReducer(s,{type:'COMPLETE_CLASSROOM_ACTIVITY',game:'merge'});}
  s=engineReducer(s,{type:'REVEAL_DISCOVERY_EGG'});expect(s.eggDiscovery!.status).toBe('matched');expect(validEggDiscovery(s.eggDiscovery)).toBe(true);
 });
 it('opening games, loading profiles, invalid answers and previews give no credit',()=>{
  let s=createInitialEngineState();s=engineReducer(s,{type:'SET_SCREEN',screen:'math'});expect(s.eggDiscovery!.stamps).toHaveLength(0);
  s=engineReducer(s,{type:'ANSWER_BRIDGE_QUESTION',questionId:'bogus',answer:'2'});expect(s.eggDiscovery!.stamps).toHaveLength(0);
  const preview={...s,devPreview:true};expect(engineReducer(preview,{type:'COMPLETE_CLASSROOM_ACTIVITY',game:'merge'}).eggDiscovery!.stamps).toHaveLength(0);
 });
 it('all ten species can win a stable match from pure or mixed interests',()=>{
  const cases: [keyof typeof COMPANIONS,AdventureStyle[]][]=[['koala_sprite',['help']],['ember_fox',['explore']],['moss_turtle',['build']],['luna_owl',['wonder']],['clover_rabbit',['explore','help']],['ripple_otter',['build','help']],['nova_axolotl',['help','wonder']],['bramble_hedgehog',['build','wonder']],['zephyr_dragon',['explore','wonder']],['subtrak',['explore','build']]];
  for(const [id,styles] of cases){const d=createInitialEngineState().eggDiscovery!;d.stamps=styles.map((style,i)=>({day:careDate(now-i*day),style,source:'activity'}));expect(matchCompanion(d)).toBe(id);expect(matchCompanion(structuredClone(d))).toBe(id);}
 });
 it('upgrades only unrevealed journeys and recovers actual dated work without invented attendance',()=>{
  vi.useFakeTimers();vi.setSystemTime(now);const s=createInitialEngineState();s.eggDiscovery!.startedAt=now-7*day;s.eggDiscovery!.candidates=['koala_sprite','ember_fox','moss_turtle','luna_owl'];delete s.eggDiscovery!.matchingVersion;
  const row={questionId:'q',topic:'Addition',grade:2,source:'practice',attempts:1,correct:false,firstAttemptCorrect:false,support:'none' as const,updatedAt:now-day};
  s.learningEvidence=[row,{...row,questionId:'duplicate'},{...row,questionId:'future',updatedAt:now+day},{...row,questionId:'help-only',attempts:0,updatedAt:now-2*day}];
  const next=upgradeDiscoveryActivities(s);expect(next.eggDiscovery!.candidates).toHaveLength(10);expect(next.eggDiscovery!.stamps).toEqual([{day:careDate(now-day),style:'wonder',source:'activity'}]);expect(upgradeDiscoveryActivities(next)).toEqual(next);
  const locked={...s,eggDiscovery:{...s.eggDiscovery!,status:'matched' as const,companion:'koala_sprite' as const}};expect(upgradeDiscoveryActivities(locked)).toBe(locked);
 });
 it('excludes existing pets when expanding an old collecting journey',()=>{const s=createInitialEngineState();s.pet={...createTestEngineState().pet!,speciesId:'koala_sprite'};const next=upgradeDiscoveryActivities(s);expect(next.eggDiscovery!.candidates).not.toContain('koala_sprite');expect(next.pet).toBe(s.pet);});
 it('caps credits including a teacher pass and rejects altered matching rules',()=>{
  const s=createInitialEngineState();s.eggDiscovery!.bonusDays=1;let next=s;
  for(let i=0;i<6;i++)next=creditDiscoveryActivity(next,'help',now+i*day);
  expect(next.eggDiscovery!.stamps).toHaveLength(4);
  
 });
});
