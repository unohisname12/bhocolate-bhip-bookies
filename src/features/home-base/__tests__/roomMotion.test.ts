import {describe,it,expect} from 'vitest';
import {initialMotion,motionForStep} from '../roomMotion';
describe('room step presentation',()=>{
 it('uses projected travel timings, turns horizontally and keeps facing on vertical steps',()=>{
  const left=motionForStep({x:3,y:2},{x:2,y:2},initialMotion,{x:380,y:210});
  expect(left).toEqual({moving:true,facingLeft:true,duration:380});
  expect(motionForStep({x:2,y:2},{x:2,y:3},left,{x:380,y:210})).toEqual({moving:true,facingLeft:true,duration:210});
  expect(motionForStep({x:2,y:3},{x:3,y:3},left).facingLeft).toBe(false);
 });
 it('ends movement without snapping direction or resetting the previous stride duration',()=>{
  expect(motionForStep({x:2,y:3},{x:2,y:3},{moving:true,facingLeft:true,duration:380})).toEqual({moving:false,facingLeft:true,duration:380});
 });
});
