import { describe, it, expect } from 'vitest';
import { changedFurniture, furnitureWork, furniturePose } from '../petFurniture';
import { createHomeBase } from '../model';
import { placementStyle,residentDepth } from '../roomPresentation';
import { initialLife,roomPath,openSpots,tickLife,type RoomLife } from '../roomLife';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
const room=()=>createHomeBase(createInitialEngineState()).rooms.den!;
describe('pet furniture presence',()=>{
 it('helps only with changed placements and coalesces rapid edits to the latest item',()=>{
  const r=room();expect(changedFurniture(r.items,r)).toBeUndefined();
  const next={...r,items:r.items.map((p,i)=>i<2?{...p,x:p.x+1}:p)};
  expect(changedFurniture(r.items,next)?.id).toBe(r.items[1].id);
  expect(changedFurniture(r.items,{...r,items:[]})).toBeUndefined();
 });
 it('refuses a helper job across a blocked path',()=>{
  const r=room();r.items=Array.from({length:8},(_,x)=>({id:`block${x}`,furnitureId:'home_chair',x,y:3,on:true,flipped:false}));
  const item={id:'book',furnitureId:'home_bookshelf',x:0,y:0,on:true,flipped:false};r.items.push(item);
  expect(furnitureWork(r,item,{x:3,y:5})).toBeUndefined();
 });
 it('lies on a real cushion only after arriving and releases the pose if it is removed',()=>{
  const r=room(),p=r.items.find(p=>p.furnitureId==='home_cushion')!;
  const life={...initialLife(r),objectId:p.id,activity:'Taking a nap',ticks:8,path:[]};
  expect(furniturePose(r,life)).toMatchObject({pose:'lying',x:p.x+.5,y:p.y-.3});
  expect(furniturePose(r,{...life,path:[{x:1,y:4}]}).pose).toBe('standing');
  expect(furniturePose({...r,items:[]},life).pose).toBe('standing');
 });
});

it('routes deliveries from beside the pet around every other furniture footprint',()=>{
  const r=room();r.items=[{id:'table',furnitureId:'home_table',x:2,y:3,flipped:false,on:true},{id:'delivery',furnitureId:'home_chair',x:6,y:4,flipped:false,on:true}];
  const job=furnitureWork(r,r.items[1],{x:0,y:4})!;
  expect(job.origin).toEqual({x:0,y:4});
  const transit={...r,items:r.items.filter(p=>p.id!=='delivery')};
  const route=roomPath(transit,job.origin,job.target),open=openSpots(transit);
  expect(route.length).toBeGreaterThan(0);
  for(const p of route)expect(open.some(s=>s.x===p.x&&s.y===p.y)).toBe(true);
});

it('takes, reads and returns a real book, and cancels when its shelf disappears',()=>{
  const r=room();r.items.push({id:'shelf',furnitureId:'home_bookshelf',x:0,y:0,flipped:false,on:true});
  let life:RoomLife={...initialLife(r),objectId:'shelf',activity:'Story time',path:[],ticks:10};
  life=tickLife(life,r,false,0);expect(life.book?.phase).toBe('take');
  for(let i=0;i<3;i++)life=tickLife(life,r,false,0);
  expect(life.book?.phase).toBe('read');
  expect(tickLife(life,{...r,items:[]},false,0).book).toBeUndefined();
  for(let i=0;i<12;i++)life=tickLife(life,r,false,0);
  expect(life.book?.phase).toBe('return');
  for(let i=0;i<3;i++)life=tickLife(life,r,false,0);
  expect(life.book).toBeUndefined();expect(life.activity).toBe('Finished reading');
});

it('orders tall furniture ahead of a pet behind it and behind a pet in front',()=>{
 const r=room(),table=r.items.find(p=>p.furnitureId==='home_table')!;
 const depth=Number(placementStyle(r,table).zIndex);
 expect(depth).toBeGreaterThan(residentDepth(table.y-1));
 expect(depth).toBeLessThan(residentDepth(table.y+1));
});

it('stops a newly blocked route without remotely reading the shelf',()=>{
 const r=room();r.items=[{id:'block',furnitureId:'home_chair',x:2,y:4,on:true,flipped:false},{id:'shelf',furnitureId:'home_bookshelf',x:4,y:0,on:true,flipped:false}];
 const life:RoomLife={...initialLife(r),x:1,y:4,path:[{x:2,y:4}],activity:'Story time',objectId:'shelf'};
 const stopped=tickLife(life,r,false,0);
 expect(stopped.x).toBe(1);expect(stopped.path).toEqual([]);expect(stopped.objectId).toBeUndefined();
 expect(tickLife(stopped,r,false,0).book).toBeUndefined();
});
