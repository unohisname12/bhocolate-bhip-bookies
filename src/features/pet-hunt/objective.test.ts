import {describe,it,expect} from 'vitest';
import {createMatch,addPlayer,startMatch,step,viewFor,GATE_SECONDS,HEAD_START} from './model';
import {nextObjective} from './objective';
describe('visible win instructions',()=>{
 it('changes from beacons to the gate countdown to escaping, and explains team escapes',()=>{
  const m=createMatch();const p=addPlayer(m,'you','Pip','runner');startMatch(m);
  expect(nextObjective(viewFor(m,'you'))).toContain('5 more beacons');
  m.beacons.slice(0,5).forEach(b=>b.progress=1);step(m,{},.025);expect(nextObjective(viewFor(m,'you'))).toContain('GATE OPENING');
  for(let i=0;i<(GATE_SECONDS+1)*40;i++)step(m,{},.025);expect(nextObjective(viewFor(m,'you'))).toContain('tap ESCAPE');
  p.escaped=true;expect(nextObjective(viewFor(m,'you'))).toContain('needs 2 more');
 });
 it('explains head start and the hunter win condition',()=>{
  const m=createMatch();addPlayer(m,'you','Bramble','hunter');startMatch(m);
  expect(nextObjective(viewFor(m,'you'))).toContain('head start');m.time-=HEAD_START+1;
  expect(nextObjective(viewFor(m,'you'))).toContain('Stop the third escape');
 });
});
