import { describe, expect, it } from 'vitest';
import { addPlayer, arenaOf, createMatch, startMatch, viewFor } from './model';
import { currentAction } from './actions';
import { generateLayout } from './mapgen';
const seed=(()=>{for(let s=1;;s++)if(generateLayout('garden',s).door)return s;})();
describe('the action button says what E will do',()=>{
 it('for a runner: locker, vent, key at the door, escape',()=>{
  const m=createMatch('garden','normal',240,seed);const me=addPlayer(m,'you','Pip','runner');startMatch(m);const a=arenaOf(m);
  Object.assign(me,a.lockers![0]);expect(currentAction(viewFor(m,'you')).title).toBe('Hide in locker');
  me.locker=0;m.lockers[0]='you';expect(currentAction(viewFor(m,'you')).title).toBe('Leave locker');me.locker=-1;m.lockers[0]=null;
  Object.assign(me,a.vents![0][0]);expect(currentAction(viewFor(m,'you')).title).toBe('Crawl through vent');
  const d=a.door!;Object.assign(me,{x:d.x+d.w/2,y:d.y+d.h/2+50});m.key!.holder='you';expect(currentAction(viewFor(m,'you')).title).toBe('Unlock door');
  m.gate={state:'open',left:0};Object.assign(me,a.portal);expect(currentAction(viewFor(m,'you'))).toMatchObject({title:'ESCAPE!',urgent:true});
 });
 it('for the hunter: pick up, cage, check locker',()=>{
  const m=createMatch('garden','normal',240,seed);const me=addPlayer(m,'you','Hunter','hunter');addPlayer(m,'kid','Kid','runner');startMatch(m);const a=arenaOf(m),kid=m.players.find(p=>p.id==='kid')!;
  kid.captured=true;Object.assign(me,{x:kid.x+10,y:kid.y});expect(currentAction(viewFor(m,'you')).title).toBe('Pick up pet');
  me.carrying='kid';Object.assign(me,a.cages![0]);expect(currentAction(viewFor(m,'you')).title).toBe('Cage pet');me.carrying=null;
  Object.assign(me,a.lockers![0]);expect(currentAction(viewFor(m,'you')).title).toBe('Check locker');
 });
});
