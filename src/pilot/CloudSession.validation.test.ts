import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CloudSession} from './CloudSession';
import {pilotAPI,PilotError,type CloudSave} from './api';
import {createInitialEngineState} from '../engine/state/createInitialEngineState';
vi.mock('./api',async importOriginal=>({...await importOriginal<typeof import('./api')>(),pilotAPI:vi.fn()}));
let storage:Map<string,string>;
beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});vi.mocked(pilotAPI).mockReset();});
afterEach(()=>{vi.unstubAllGlobals();});
function recoveredSession(){const state=createInitialEngineState();state.learnerProfileId=state.player.id;const save:CloudSave={studentId:state.player.id,alias:'Learner',state,revision:5,assignment:'practice',updatedAt:0,lastRequestId:''};storage.set(`auralith-pending-${save.studentId}`,JSON.stringify({studentId:save.studentId,baseRevision:5,requestId:'',state}));return new CloudSession(save);}
it('retries the exact rejected checkpoint and receipt without discarding unsent progress',async()=>{
 const session=recoveredSession();vi.mocked(pilotAPI).mockRejectedValueOnce(new PilotError('Invalid save',422,'invalid_save')).mockResolvedValueOnce({revision:6,updatedAt:1});
 expect(await session.flush()).toBe(false);expect(session.getStatus()).toMatchObject({phase:'conflict',canRetryValidation:true});expect(storage.size).toBe(1);
 const original=vi.mocked(pilotAPI).mock.calls[0];expect(await session.retryValidationSave()).toBe(true);expect(vi.mocked(pilotAPI).mock.calls[1]).toEqual(original);expect(session.getStatus().phase).toBe('saved');expect(storage.size).toBe(0);
});
it('keeps play blocked and the recovery copy intact when validation still fails',async()=>{
 const session=recoveredSession();vi.mocked(pilotAPI).mockRejectedValue(new PilotError('Invalid save',422,'invalid_save'));
 await session.flush();expect(await session.retryValidationSave()).toBe(false);expect(session.getStatus().phase).toBe('conflict');expect(storage.size).toBe(1);
});
it('does not offer or permit validation retries for a stale save conflict',async()=>{
 const session=recoveredSession();vi.mocked(pilotAPI).mockRejectedValue(new PilotError('Newer save exists',409,'conflict'));
 await session.flush();expect(session.getStatus().canRetryValidation).toBe(false);expect(await session.retryValidationSave()).toBe(false);expect(pilotAPI).toHaveBeenCalledTimes(1);expect(storage.size).toBe(1);
});

it('upgrades an old unsent discovery checkpoint while preserving its answers and rewards',()=>{
 const state=createInitialEngineState();state.learnerProfileId=state.player.id;
 const old=structuredClone(state);delete old.eggDiscovery!.matchingVersion;old.eggDiscovery!.candidates=['koala_sprite','ember_fox','moss_turtle','luna_owl'];old.eggDiscovery!.answers=[0,1,2,3];old.player.currencies.tokens=321;
 const save:CloudSave={studentId:state.player.id,alias:'Learner',state,revision:5,assignment:'practice',updatedAt:0,lastRequestId:''};
 storage.set(`auralith-pending-${save.studentId}`,JSON.stringify({studentId:save.studentId,baseRevision:5,requestId:'',state:old}));
 const session=new CloudSession(save);expect(session.initial.eggDiscovery!.candidates).toHaveLength(10);expect(session.initial.eggDiscovery!.answers).toEqual([0,1,2,3]);expect(session.initial.player.currencies.tokens).toBe(321);expect(session.getStatus().phase).toBe('saving');
});

it('a menu switch waits for an in-flight save instead of falsely reporting failure',async()=>{
 const session=recoveredSession();let finish!:(value:unknown)=>void;
 vi.mocked(pilotAPI).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const autosave=session.flush(),navigation=session.flush();expect(navigation).toBe(autosave);expect(pilotAPI).toHaveBeenCalledTimes(1);expect(session.getStatus().phase).toBe('saving');
 finish({revision:6,updatedAt:1});expect(await navigation).toBe(true);expect(await autosave).toBe(true);expect(session.getStatus().phase).toBe('saved');expect(storage.size).toBe(0);
});
