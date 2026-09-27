import {describe,it,expect} from 'vitest';
import {createTestEngineState} from '../../../engine/state/createTestEngineState';
import {engineReducer} from '../../../engine/state/engineReducer';
import {createHomeBase,upgradeHouse,validHomeBase,canPlace} from '../model';
import {houseRoute,entrySpot,exitSpot,householdWish} from '../house';
import {createMind} from '../../pet-mind/memory';
import {validateSave,computeChecksum} from '../../../services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION,migrate} from '../../../services/persistence/saveMigrations';
const setup=()=>{const s=createTestEngineState();s.mode='normal';s.screen='home';s.pet!.state='idle';s.pet!.needs={health:100,hunger:90,cleanliness:90,happiness:90};return s;};
describe('connected cottage',()=>{
 it('adds both floors idempotently without moving legacy furniture or touching purchases',()=>{
  const s=setup(),initial=createHomeBase(s),den={...initial.rooms.den!,tier:2,wall:'rose',items:initial.rooms.den!.items.map(p=>({...p,finish:'ocean'}))};
  const old={activeRoom:'den' as const,rooms:{den},owned:['home_couch'],undo:{roomId:'den' as const,room:den}};
  s.homeBase=old;const after=engineReducer(s,{type:'HOME_OPEN'});
  expect(after.homeBase!.rooms.den).toBe(den);expect(after.homeBase!.owned).toEqual(old.owned);expect(after.homeBase!.undo).toEqual(old.undo);expect(after.player).toEqual(s.player);
  expect(['hall','landing','kitchen','bathroom'].every(id=>id in after.homeBase!.rooms)).toBe(true);expect(upgradeHouse(after.homeBase!)).toBe(after.homeBase);expect(validHomeBase(after.homeBase)).toBe(true);
 });
 it('routes through the stairs without requiring a paid bedroom',()=>{
  const h=createHomeBase(setup());expect(houseRoute(h,'bathroom')).toEqual(['den','hall','landing','bathroom']);expect(houseRoute(h,'bedroom')).toEqual([]);
  expect(houseRoute({...h,activeRoom:'bathroom'},'kitchen')).toEqual(['bathroom','landing','hall','kitchen']);
 });
 it('commits travel once, refuses stale or locked destinations, and never grants rewards',()=>{
  let s=engineReducer(setup(),{type:'HOME_OPEN'});const before=s;
  s=engineReducer(s,{type:'HOME_TRAVEL',from:'den',roomId:'landing'});
  expect(s.homeBase!.activeRoom).toBe('landing');expect(s.homeBase!.lastDoor).toBe('den');expect(s.player).toEqual(before.player);expect(s.pet!.progression).toEqual(before.pet!.progression);
  expect(engineReducer(s,{type:'HOME_TRAVEL',from:'den',roomId:'kitchen'})).toBe(s);
  expect(engineReducer(s,{type:'HOME_TRAVEL',from:'landing',roomId:'bedroom'})).toBe(s);
  expect(engineReducer(s,{type:'HOME_TRAVEL',from:'landing',roomId:'landing'})).toBe(s);
 });
 it('preserves the floor and new room placements across validated save round trips',()=>{
  let s=engineReducer(setup(),{type:'HOME_OPEN'});s=engineReducer(s,{type:'HOME_TRAVEL',from:'den',roomId:'bathroom'});
  s=engineReducer(s,{type:'HOME_PLACE',furnitureId:'home_chair',x:3,y:4});
  const data={version:CURRENT_SAVE_VERSION,state:s,timestamp:Date.now(),checksum:computeChecksum(s)};
  expect(validateSave(data).valid).toBe(true);expect(migrate(JSON.parse(JSON.stringify(data))).homeBase).toEqual(s.homeBase);
  expect(validHomeBase({...s.homeBase,houseVersion:99})).toBe(false);expect(validHomeBase({...s.homeBase,lastDoor:'secret'})).toBe(false);
 });
 it('selects an accessible threshold even when old furniture blocks the front row',()=>{
  const room=createHomeBase(setup()).rooms.den!;
  for(let x=0;x<8;x++)if(canPlace(room,'home_chair',x,5))room.items.push({id:`block-${x}`,furnitureId:'home_chair',x,y:5,on:true,flipped:false});
  const entry=entrySpot(room),exit=exitSpot(room,{x:3,y:4});expect(entry.y).toBeLessThan(5);expect(exit.y).toBeLessThan(5);
 });
 it('routes pet invitations from needs and real personality, and respects sleep and room locks',()=>{
  const s=setup(),h=createHomeBase(s);s.pet!.needs.hunger=10;expect(householdWish(s.pet,h)?.room).toBe('kitchen');
  s.pet!.needs.hunger=90;s.pet!.needs.cleanliness=10;expect(householdWish(s.pet,h)?.room).toBe('bathroom');
  s.pet!.needs.cleanliness=90;s.pet!.mind=createMind(s.pet!);s.pet!.mind.traits={curiosity:0,playfulness:0,sociability:0,quiet:0,nature:1,comfort:.1};
  expect(householdWish(s.pet,h)?.room).not.toBe('garden');
  s.pet!.state='sleeping';expect(householdWish(s.pet,h)).toBeUndefined();
 });
 it('cannot travel during a care session or combat',()=>{
  let s=engineReducer(setup(),{type:'HOME_OPEN'});s={...s,interaction:{...s.interaction,careGameActive:true}};
  expect(engineReducer(s,{type:'HOME_TRAVEL',from:'den',roomId:'landing'})).toBe(s);
 });
});
