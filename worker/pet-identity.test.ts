import {describe,it,expect} from 'vitest';
import validate from './generated/validate-engine.js';
import {freshGame,privateGame,studentCheckpoint} from './game-state';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {FOOD_ITEMS} from '../src/config/gameConfig';
import {earnedTitles,resolvePetName} from '../src/features/pet-identity/model';
import {fighter} from '../src/features/pet-duel/model';
import type {EngineState} from '../src/types/engine';

function petSave(){const s=freshGame('learner','Fern');s.pet=hatchEgg({id:'egg',type:'ember_fox',state:'ready',progress:100,createdAt:new Date().toISOString()});s.player.activePetId=s.pet!.id;s.player.currencies.tokens=500;return s;}
const roundTrip=(s:EngineState)=>JSON.parse(JSON.stringify(s));
const mastered=(topic:string)=>({skillId:`4:${topic}`,topic,grade:4,lastQuestionId:'q',lastPracticed:0,dueAt:0,independentChecks:2,needsFreshCheck:false});

describe('pet names',()=>{
 it('builds a chip name the server keeps, and the save schema accepts',()=>{
  const before=petSave(),s=engineReducer(before,{type:'SET_PET_IDENTITY',patch:{nameSource:'chips',nameWords:['Captain','Waffles']}});
  expect(s.pet!.name).toBe('Captain Waffles');expect(validate(roundTrip(s))).toBe(true);
  expect(studentCheckpoint(roundTrip(s),before,'learner','Fern').pet!.name).toBe('Captain Waffles');
 });
 it('rejects a word that is not a chip before it reaches the server',()=>{
  const s=roundTrip(petSave());s.pet.identity={nameSource:'chips',nameWords:['Captain','Anything I type']};
  expect(validate(s)).toBe(false);
 });
 it('never trusts typed name text from a save; only the approved server name shows',()=>{
  const s=roundTrip(petSave());s.pet.identity={nameSource:'typed'};s.pet.name='My real name';
  expect(privateGame(s,'learner','Fern').pet!.name).toBe('Ember');
  expect(privateGame(s,'learner','Fern',{[s.pet.id]:'Sir Toast'}).pet!.name).toBe('Sir Toast');
 });
 it('only switches to a typed name the teacher approved, then follows server syncs',()=>{
  const start=petSave();
  expect(engineReducer(start,{type:'SET_PET_IDENTITY',patch:{nameSource:'typed'}})).toBe(start);
  let s=engineReducer(start,{type:'SET_PET_IDENTITY',patch:{nameSource:'typed'},approvedName:'Sir Toast'});expect(s.pet!.name).toBe('Sir Toast');
  s=engineReducer(s,{type:'SYNC_APPROVED_PET_NAMES',names:{}});expect(s.pet!.name).toBe('Ember');
  s=engineReducer(s,{type:'SYNC_APPROVED_PET_NAMES',names:{[s.pet!.id]:'Duke Toast'}});expect(s.pet!.name).toBe('Duke Toast');
  const same=engineReducer(s,{type:'SYNC_APPROVED_PET_NAMES',names:{[s.pet!.id]:'Duke Toast'}});expect(same).toBe(s);
 });
 it('resolves in priority order: approved typed, then chips, then species',()=>{
  expect(resolvePetName({nameSource:'typed',nameWords:['','Taco']},'Ember','Sir Toast')).toBe('Sir Toast');
  expect(resolvePetName({nameSource:'chips',nameWords:['','Taco']},'Ember','Sir Toast')).toBe('Taco');
  expect(resolvePetName({nameSource:'species',nameWords:['','Taco']},'Ember')).toBe('Ember');
 });
});

describe('titles',()=>{
 it('are earned from solved problems and skills proven on two separate days',()=>{
  expect(earnedTitles(24)).toEqual([]);
  expect(earnedTitles(100,[mastered('Multiplication facts'),{...mastered('Division facts'),independentChecks:1}])).toEqual(['solver','knight','multiplier']);
  expect(earnedTitles(0,[mastered('Mystery topic')])).toEqual(['explorer']);
 });
 it('cannot be worn before it is earned, on the device or through the server',()=>{
  const s=petSave();expect(engineReducer(s,{type:'SET_PET_IDENTITY',patch:{title:'legend'}})).toBe(s);
  const forged=roundTrip(s);forged.pet.identity={title:'legend'};
  expect(privateGame(forged,'learner','Fern').pet!.identity).toEqual({});
  s.player.lifetimeMathCorrect=30;const worn=engineReducer(s,{type:'SET_PET_IDENTITY',patch:{title:'solver'}});
  expect(fighter('learner','Fern',worn)!.pet).toEqual({name:'Ember',title:'the Problem Solver',move:null});
 });
});

describe('favorites and signature move',()=>{
 it('a favorite snack adds a little extra bond',()=>{
  const apple=FOOD_ITEMS.find(f=>f.id==='apple')!;
  const plain=engineReducer(petSave(),{type:'FEED_PET',food:apple}).pet!.bond;
  const fav=engineReducer(engineReducer(petSave(),{type:'SET_PET_IDENTITY',patch:{snack:'apple'}}),{type:'FEED_PET',food:apple}).pet!.bond;
  expect(fav-plain).toBe(1);
 });
 it('the signature move rides along to duels',()=>{
  const s=engineReducer(petSave(),{type:'SET_PET_IDENTITY',patch:{moveWords:['Waffle','Blast'],personality:'playful'}});
  expect(validate(roundTrip(s))).toBe(true);expect(fighter('learner','Fern',s)!.pet!.move).toBe('Waffle Blast');
 });
});

describe('pet life memory on the server',()=>{
 it('survives the strict save schema and a student checkpoint, and forged memories are rejected',()=>{
  const before=petSave();let s=engineReducer(before,{type:'FEED_PET',food:FOOD_ITEMS.find(f=>f.id==='cake')!});
  expect(s.pet!.mind!.life!.episodes.find(e=>e.kind==='fed')?.subject).toBe('cake');
  const encoded=roundTrip(s);expect(validate(encoded)).toBe(true);
  expect(studentCheckpoint(encoded,before,'learner','Fern').pet!.mind!.life!.tallies['food:cake']).toBe(1);
  const forged=roundTrip(s);forged.pet.mind.life.drift.comfort=9;
  expect(()=>studentCheckpoint(forged,before,'learner','Fern')).toThrow();
  s=roundTrip(s);s.pet!.mind!.life!.episodes[0].kind='haunted' as never;expect(validate(s)).toBe(false);
 });
});
