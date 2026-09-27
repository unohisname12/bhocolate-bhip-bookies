import {describe,it,expect} from 'vitest';
import {createTestEngineState} from '../../../engine/state/createTestEngineState';
import {engineReducer} from '../../../engine/state/engineReducer';
import {createHomeBase} from '../../home-base/model';
import {createMind,remember,validMind,objectSignature,observeCare} from '../memory';
import {scoreDecisions,chooseDecision} from '../decisions';
import {validateSave,computeChecksum} from '../../../services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION,migrate} from '../../../services/persistence/saveMigrations';
const setup=()=>{const s=createTestEngineState();s.mode='normal';s.screen='home';s.pet!.needs={health:100,hunger:90,happiness:90,cleanliness:90};s.pet!.state='idle';s.homeBase=createHomeBase(s);return s;};
describe('local pet mind',()=>{
 it('creates reproducible individual traits without an API or saved setup requirement',()=>{
  const s=setup(),mind=createMind(s.pet!);expect(createMind(s.pet!)).toEqual(mind);expect(createMind({...s.pet!,id:'different-pet'})).not.toEqual(mind);expect(validMind(mind)).toBe(true);
 });
 it('remembers accepted care, but not rejected care or cancelled sessions; never adds extra rewards',()=>{
  let s=setup();s.learning.schoolSafe=true;
  const rejected=engineReducer(s,{type:'CARE_GAME_COMPLETE',mode:'comfort',quality:1});expect(rejected.pet!.mind).toBeUndefined();
  s=engineReducer(s,{type:'FREE_SCHOOL_CARE',task:'feed'});expect(s.pet!.mind!.memories[0].kind).toBe('feed');
  const before=s.pet!.mind; s=engineReducer(s,{type:'FREE_SCHOOL_CARE',task:'feed'});expect(s.pet!.mind).toEqual(before);
  const currencies=s.player.currencies,xp=s.pet!.progression.xp;
  s=engineReducer(s,{type:'PET_HOME_MEMORY',kind:'cuddle'});expect(s.player.currencies).toEqual(currencies);expect(s.pet!.progression.xp).toBe(xp);
  s=engineReducer(s,{type:'END_PET_INTERACTION'});expect(s.pet!.mind!.memories[0].kind).toBe('cuddle');
 });
 it('bounds memory growth and repetition, validates corrupt saves, and preserves memories on roundtrip',()=>{
  const s=setup();let mind=createMind(s.pet!);
  for(let i=0;i<100;i++)mind=remember(mind,'visit',i*130000,`object-${i}`);
  expect(mind.memories).toHaveLength(24);expect(remember(mind,'visit',99*130000+1,'object-99')).toBe(mind);
  s.pet!.mind=mind;const save={state:s,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(s)};
  expect(validateSave(save).valid).toBe(true);expect(migrate(JSON.parse(JSON.stringify(save))).pet!.mind).toEqual(mind);
  expect(validMind({...mind,traits:{...mind.traits,nature:NaN}})).toBe(false);
  expect(validMind({...mind,objects:[null]})).toBe(false);
 });
 it('notices changes to actual furniture, remembers visits, and never invents removed objects',()=>{
  let s=setup();const p=s.homeBase!.rooms.den!.items[0];
  s=engineReducer(s,{type:'PET_NOTICE_OBJECT',roomId:'den',id:p.id});
  const first=s.pet!.mind!.objects[0];expect(first.signature).toBe(objectSignature(p));
  s=engineReducer(s,{type:'HOME_FINISH',id:p.id,finish:'rose'});
  const choices=scoreDecisions(s.pet!,s.homeBase!.rooms.den!,'den',{x:3,y:4},Date.now());
  expect(choices.some(c=>c.objectId===p.id&&c.activity==='Checking the new arrangement')).toBe(true);
  s=engineReducer(s,{type:'HOME_STORE',id:p.id});expect(scoreDecisions(s.pet!,s.homeBase!.rooms.den!,'den',{x:3,y:4},Date.now()).some(c=>c.objectId===p.id)).toBe(false);
 });
 it('prioritizes real needs and recent care, applies cooldowns, and handles blocked or empty rooms',()=>{
  const s=setup(),room=s.homeBase!.rooms.den!,from={x:3,y:4},now=Date.now();
  s.pet!.needs.health=10;expect(scoreDecisions(s.pet!,room,'den',from,now)[0].id).toBe('quiet');s.pet!.needs.health=100;
  s.pet!.mind=remember(createMind(s.pet!),'feed',now);const options=scoreDecisions(s.pet!,room,'den',from,now);
  expect(options[0].id).toBe(`care-feed-${now}`);expect(chooseDecision(options,0)?.bubble).toContain('meal');
  expect(scoreDecisions(s.pet!,room,'den',from,now,{[options[0].id]:now+1000}).some(c=>c.id===options[0].id)).toBe(false);
  const empty={...room,items:[]};expect(scoreDecisions(s.pet!,empty,'den',from,now).every(c=>!c.objectId)).toBe(true);
  const enclosed={...empty,items:Array.from({length:8},(_,x)=>({id:`block-${x}`,furnitureId:'home_chair',x,y:3,on:true,flipped:false})).concat([{id:'isolated-book',furnitureId:'home_bookshelf',x:0,y:0,on:true,flipped:false}])};
  expect(scoreDecisions(s.pet!,enclosed,'den',{x:3,y:5},now).some(c=>c.objectId==='isolated-book')).toBe(false);
 });
 it('keeps individual memories distinct and learns favorites only from repeated visits',()=>{
  const s=setup(),room=s.homeBase!.rooms.den!,p=room.items.find(p=>p.furnitureId==='home_cushion')!,mind=createMind(s.pet!);
  s.pet!.mind={...mind,objects:[{id:`den/${p.id}`,signature:objectSignature(p),seenAt:1,visits:3}]};
  expect(scoreDecisions(s.pet!,room,'den',{x:3,y:4},Date.now()).find(c=>c.id===`use-den-${p.id}`)?.bubble).toContain('favorite');
  expect(createMind({...s.pet!,id:'second-pet'}).objects).toEqual([]);
 });
 it('remembers a battle victory once, even when only the battle state changes',()=>{
  let before=setup();before=engineReducer(before,{type:'START_BATTLE'});before=engineReducer(before,{type:'RESOLVE_WARMUP',correct:true});
  if(!before.battle.active)throw new Error('Missing battle fixture');
  const after={...before,battle:{...before.battle,phase:'victory' as const}};
  const result=observeCare(before,after,{type:'TICK',deltaMs:1000});expect(result.pet!.mind!.memories[0].kind).toBe('victory');
  expect(observeCare(result,result,{type:'TICK',deltaMs:1000})).toBe(result);
 });
});
