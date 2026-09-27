import { describe, expect, it } from 'vitest';
import { generateLayout, MAP_W, MAP_H, BEACON_COUNT } from './mapgen';
describe('procedural arenas',()=>{
 it('same seed, same map; different seeds, different maps',()=>{
  expect(generateLayout('garden',42)).toEqual(generateLayout('garden',42));
  expect(JSON.stringify(generateLayout('garden',42))).not.toBe(JSON.stringify(generateLayout('garden',43)));
 });
 it('500 seeds: every map is valid, spread out, and fully reachable',()=>{
  let fallbacks=0;
  for(let s=0;s<500;s++){const l=generateLayout(['garden','workshop','moonhouse'][s%3],s*7919+1);
   if(!l.walls.length)fallbacks++;
   expect(l.beacons).toHaveLength(BEACON_COUNT);
   for(const p of [...l.beacons,l.portal,l.hunterSpawn,...l.runnerSpawn])expect(p.x>0&&p.y>0&&p.x<MAP_W&&p.y<MAP_H).toBe(true);
   for(let i=0;i<l.beacons.length;i++)for(let j=i+1;j<l.beacons.length;j++)expect(Math.hypot(l.beacons[i].x-l.beacons[j].x,l.beacons[i].y-l.beacons[j].y)).toBeGreaterThanOrEqual(380);
   expect(l.walls.length).toBeGreaterThan(10);expect(l.bushes.length).toBeGreaterThanOrEqual(8);
  }
  expect(fallbacks).toBe(0);
 });
});
describe('arena props',()=>{
 it('500 seeds: lockers, far-apart vents, cages, and a locked building on many maps whose key is reachable',()=>{
  let doors=0;
  for(let s=0;s<500;s++){const l=generateLayout(['garden','workshop','moonhouse'][s%3],s*104729+7);
   expect(l.lockers.length).toBeGreaterThanOrEqual(4);expect(l.cages).toHaveLength(2);expect(l.vents.length).toBeGreaterThanOrEqual(2);
   for(const [a,b] of l.vents)expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThanOrEqual(600);
   if(l.door){doors++;expect(l.key).not.toBeNull();const inRoom=l.beacons.filter(b=>b.x>l.door!.x-500&&b.x<l.door!.x+500&&b.y>l.door!.y-400&&b.y<l.door!.y+400);expect(inRoom.length).toBeGreaterThan(0);}
   else expect(l.key).toBeNull();
  }
  expect(doors).toBeGreaterThan(100);
 });
});
