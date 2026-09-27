import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CloudSession} from './CloudSession';
import {pilotAPI,type CloudSave} from './api';
import {createInitialEngineState} from '../engine/state/createInitialEngineState';
import type {GameEngine} from '../engine/core/GameEngine';
vi.mock('./api',async importOriginal=>({...await importOriginal<typeof import('./api')>(),pilotAPI:vi.fn()}));
let storage:Map<string,string>;let visibilityState:'visible'|'hidden';
beforeEach(()=>{
 storage=new Map();visibilityState='visible';vi.useFakeTimers();
 vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
 vi.stubGlobal('document',{get visibilityState(){return visibilityState;}});
 vi.mocked(pilotAPI).mockReset();vi.mocked(pilotAPI).mockResolvedValue({learning:{}} as never);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function connected(){
 const state=createInitialEngineState();state.learnerProfileId=state.player.id;
 const save:CloudSave={studentId:state.player.id,alias:'Learner',state,revision:5,assignment:'practice',updatedAt:0,lastRequestId:''};
 const session=new CloudSession(save);
 const engine={setLearningSync(){},getState:()=>({screen:'play',learning:{}}),onAction:()=>()=>{},dispatch(){}} as unknown as GameEngine;
 const visibility=new EventTarget();
 const disconnect=session.connect(engine,new EventTarget(),visibility);
 vi.mocked(pilotAPI).mockClear();
 return {session,visibility,disconnect};
}
const metadataCalls=()=>vi.mocked(pilotAPI).mock.calls.filter(call=>call[0]==='metadata').length;

it('stops polling the classroom while the tab is hidden',async()=>{
 const {disconnect}=connected();
 visibilityState='hidden';
 await vi.advanceTimersByTimeAsync(120_000);
 expect(metadataCalls()).toBe(0);
 expect(vi.mocked(pilotAPI).mock.calls.filter(call=>call[0]==='save')).toHaveLength(0);
 disconnect();
});

it('keeps a visible tab in sync without hammering the worker',async()=>{
 const {disconnect}=connected();
 await vi.advanceTimersByTimeAsync(60_000);
 // Six refreshes a minute keeps a classroom current; the old 3s cadence sent twenty.
 expect(metadataCalls()).toBeLessThanOrEqual(6);
 expect(metadataCalls()).toBeGreaterThan(0);
 disconnect();
});

it('refreshes immediately when a student comes back to the tab',async()=>{
 const {visibility,disconnect}=connected();
 visibilityState='hidden';
 await vi.advanceTimersByTimeAsync(60_000);
 expect(metadataCalls()).toBe(0);
 visibilityState='visible';
 visibility.dispatchEvent(new Event('visibilitychange'));
 await vi.advanceTimersByTimeAsync(0);
 expect(metadataCalls()).toBe(1);
 disconnect();
});

it('leaves no timers running after disconnect',async()=>{
 const {disconnect}=connected();
 disconnect();
 await vi.advanceTimersByTimeAsync(120_000);
 expect(metadataCalls()).toBe(0);
});
