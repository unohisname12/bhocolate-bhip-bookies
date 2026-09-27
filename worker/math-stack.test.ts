import {it,expect} from 'vitest';
import validate from './generated/validate-engine.js';
import {freshGame,studentCheckpoint} from './game-state';
import {stackCommand} from '../src/features/math-stack/model';
it('accepts old saves, placed blocks, help evidence and bounded grade-nine progress',()=>{let s=freshGame('stack-test','Learner');expect(validate(s)).toBe(true);s=stackCommand(s,{kind:'start',track:'factor',mode:'learn'});s=stackCommand(s,{kind:'drop',revision:0,tray:0,rotation:0,value:0,x:0});s=stackCommand(s,{kind:'explain',revision:1});expect(validate(s),JSON.stringify((validate as unknown as {errors:unknown}).errors)).toBe(true);});
it('rejects client-forged math boards through ordinary checkpoints',()=>{const before=freshGame('stack-test','Learner'),after=stackCommand(before,{kind:'start',track:'bonds',mode:'learn'});expect(()=>studentCheckpoint(after,before,'stack-test','Learner')).toThrow(/game service/);});
it('accepts the new stack-and-solve save format',()=>{const s=stackCommand(freshGame('new-stack','Learner'),{kind:'start',track:'bonds',mode:'flow'});expect(validate(s),JSON.stringify((validate as unknown as {errors:unknown}).errors)).toBe(true);});
