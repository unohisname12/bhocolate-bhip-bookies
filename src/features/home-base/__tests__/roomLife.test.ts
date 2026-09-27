import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FURNITURE, FINISHES } from '../catalog';
import { openSpots, roomPath, initialLife, tickLife } from '../roomLife';
import { createHomeBase, validHomeBase } from '../model';
import { createInitialEngineState } from '../../../engine/state/createInitialEngineState';
import { engineReducer } from '../../../engine/state/engineReducer';
describe('Home collections and room life',()=>{
 it('ships over 200 unique designs with different artwork, independent of finish choices',()=>{
   expect(FURNITURE.length).toBeGreaterThan(200);
   expect(new Set(FURNITURE.map(f=>f.id)).size).toBe(FURNITURE.length);
   expect(new Set(FURNITURE.map(f=>f.name)).size).toBe(FURNITURE.length);
   const collection=FURNITURE.filter(f=>f.id.startsWith('collection_'));
   expect(new Set(collection.map(f=>readFileSync(`public${f.art}`,'utf8'))).size).toBe(216);
   expect(new Set(collection.map(f=>f.set)).size).toBe(9);
 });
 it('changes only one copy’s finish, undoes it, and rejects an invalid finish in actions and saves',()=>{
   let s=engineReducer(createInitialEngineState(),{type:'HOME_OPEN'});
   const id=s.homeBase!.rooms.den!.items[0].id;
   for(const finish of FINISHES) {
     s=engineReducer(s,{type:'HOME_FINISH',id,finish:finish.id});
     expect(s.homeBase!.rooms.den!.items[0].finish).toBe(finish.id);
     expect(s.homeBase!.rooms.den!.items[1].finish).toBeUndefined();
     expect(validHomeBase(s.homeBase)).toBe(true);
   }
   expect(engineReducer(s,{type:'HOME_FINISH',id,finish:'bad'})).toBe(s);
   const undo=engineReducer(s,{type:'HOME_UNDO'});
   expect(undo.homeBase!.rooms.den!.items[0].finish).toBe('pearl');
   const invalid=structuredClone(s.homeBase!);invalid.rooms.den!.items[0].finish='bad';
   expect(validHomeBase(invalid)).toBe(false);
 });
 it('routes around furniture and stops beside occupied targets without cutting diagonally',()=>{
   const room=createHomeBase(createInitialEngineState()).rooms.den!;
   const from={x:3,y:4}, path=roomPath(room,from,{x:3,y:2}), open=openSpots(room);
   expect(path.length).toBeGreaterThan(0);
   let previous=from;
   for(const step of path){expect(open).toContainEqual(step);expect(Math.abs(step.x-previous.x)+Math.abs(step.y-previous.y)).toBe(1);previous=step;}
   expect(path.at(-1)).not.toEqual({x:3,y:2});
 });
 it('finishes fetch by returning to the origin and pauses automatic activities',()=>{
   const room=createHomeBase(createInitialEngineState()).rooms.den!;
   const pet={...initialLife(room),x:7,y:5,path:[],ball:{x:7,y:5},returning:{x:3,y:4},ticks:0};
   let next=tickLife(pet,room,false,.5);expect(next.ball).toBeUndefined();expect(next.path.length).toBeGreaterThan(0);
   for(let i=0;i<40;i++)next=tickLife(next,room,false,.5);
   expect({x:next.x,y:next.y}).toEqual({x:3,y:4});expect(next.activity).toBe('Relaxing with you');
   const moving=tickLife({...next,ticks:0},room,true,.7);expect(moving.activity).not.toBe('Relaxing with you');
 });
 it('recovers safely when building blocks a pet’s current tile',()=>{
   const room=createHomeBase(createInitialEngineState()).rooms.den!;
   const pet={...initialLife(room),x:0,y:1};
   expect(openSpots(room)).not.toContainEqual({x:pet.x,y:pet.y});
   const next=tickLife(pet,room,true,0);expect(openSpots(room)).toContainEqual({x:next.x,y:next.y});
 });
});
