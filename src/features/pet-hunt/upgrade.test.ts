import {expect,it} from 'vitest';
import {addPlayer,createMatch,upgradeMatch} from './model';
it('recovers legacy room players without changing existing beacon progress',()=>{
 const m=createMatch();const p=addPlayer(m,'old','Old pet','runner');m.beacons[0].progress=.4;
 for(const k of ['charging','check','checkIn','grade','lastCheck','lastCheckTick','stage'])Reflect.deleteProperty(p,k);
 Reflect.deleteProperty(m,'relaxed');upgradeMatch(m);
 expect(p).toMatchObject({charging:-1,check:null,checkIn:4,grade:3,stage:'adult'});
 expect(m.relaxed).toBe(false);expect(m.beacons[0].progress).toBe(.4);
 p.charging=0;p.checkIn=2;p.stage='baby';m.relaxed=true;upgradeMatch(m);
 expect(p.charging).toBe(0);expect(p.checkIn).toBe(2);expect(p.stage).toBe('baby');expect(m.relaxed).toBe(true);
});
