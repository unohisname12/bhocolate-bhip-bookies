import {it,expect} from 'vitest';
import validate from './generated/validate-engine.js';
import {freshGame,studentCheckpoint} from './game-state';
import {popCommand} from '../src/features/math-pop/model';
it('keeps old saves valid and validates authoritative Math Pop saves',()=>{let s=freshGame('pop-test','Learner');expect(validate(s)).toBe(true);s=popCommand(s,{kind:'start',trail:'add',level:1});s=popCommand(s,{kind:'chain',revision:0,path:[0,1]});expect(validate(s),JSON.stringify((validate as unknown as {errors:unknown}).errors)).toBe(true);});
it('rejects forged Math Pop progress in client save checkpoints',()=>{const before=freshGame('pop-test','Learner'),after=popCommand(before,{kind:'start',trail:'add',level:1});expect(()=>studentCheckpoint(after,before,'pop-test','Learner')).toThrow(/game service/);});
