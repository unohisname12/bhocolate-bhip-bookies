import {it,expect} from 'vitest';
import {GameEngine} from '../engine/core/GameEngine';
it('gets teacher settings before opening a new math screen',async()=>{
 const engine=new GameEngine();let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 engine.setLearningSync(async()=>{await pending;engine.dispatch({type:'SET_LEARNING_SETTINGS',settings:{...engine.getState().learning,grade:9,topic:'mixed'}});});
 engine.dispatch({type:'SET_SCREEN',screen:'math'});expect(engine.getState().screen).not.toBe('math');release();await pending;await new Promise(resolve=>setTimeout(resolve,0));expect(engine.getState().screen).toBe('math');expect(engine.getState().learning.grade).toBe(9);
});
it('does not navigate a disconnected student after a delayed settings response',async()=>{
 const engine=new GameEngine();let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});engine.setLearningSync(()=>pending);const before=engine.getState();engine.dispatch({type:'SET_SCREEN',screen:'math'});engine.setLearningSync(null);release();await pending;await new Promise(resolve=>setTimeout(resolve,0));expect(engine.getState()).toBe(before);
});
