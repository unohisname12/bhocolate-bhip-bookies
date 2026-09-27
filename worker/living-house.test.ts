import {describe,it,expect} from 'vitest';
import validate from './generated/validate-engine.js';
import {createTestEngineState} from '../src/engine/state/createTestEngineState';
import {createHomeBase} from '../src/features/home-base/model';
import {buildWorld,checkpoint} from '../src/features/living-house/world';
describe('living house server save contract',()=>{
 it('accepts resident position, remembered objects and a pending invitation without a database migration',()=>{const state=createTestEngineState();state.homeBase=createHomeBase(state);const w=buildWorld(state.homeBase);state.homeBase.resident={...checkpoint(w,w.stairs[0],state.pet!.id,'Coming to join you'),visits:[{objectId:'den:starter-home_cushion',count:2}],destination:{roomId:'landing',x:8,y:1}};expect(validate(state)).toBe(true);});
 it('rejects an unknown floor destination and extra fields in the checkpoint',()=>{const state=createTestEngineState();state.homeBase=createHomeBase(state);const w=buildWorld(state.homeBase);const resident=checkpoint(w,w.stairs[0],state.pet!.id,'Resting');expect(validate({...state,homeBase:{...state.homeBase,resident:{...resident,destination:{roomId:'secret',x:1,y:1}}}})).toBe(false);expect(validate({...state,homeBase:{...state.homeBase,resident:{...resident,awardTokens:999}}})).toBe(false);});
});
