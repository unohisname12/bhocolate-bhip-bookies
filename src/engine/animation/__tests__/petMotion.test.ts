import { describe,it,expect } from 'vitest';
import { petPersonality,samplePetPose } from '../petMotion';
describe('shared companion motion',()=>{
 it('cycles through four brief idle gestures with breathing between them',()=>{
   const gestures=new Set(Array.from({length:400},(_,i)=>samplePetPose('idle',i*120,'ember_fox').gesture));
   expect([...gestures].sort()).toEqual(['breathing','curious-sway','little-hop','look-around','stretch']);
 });
 it('keeps movement gentle and finite across states and all companion stages',()=>{
   const states=['idle','happy','walking','eating','sleeping','being_petted','being_washed','being_brushed','being_comforted','being_trained','playing_with_hand','sick','hungry','dead'];
   for(const species of ['koala_sprite','ember_fox__juvenile','moss_turtle__adult','luna_owl','subtrak'])for(const state of states)for(let t=0;t<40000;t+=173){
     const pose=samplePetPose(state,t,species);
     expect(Math.abs(pose.rotation)).toBeLessThanOrEqual(4);expect(Math.abs(pose.y)).toBeLessThan(7);
     expect(pose.sx).toBeGreaterThan(.9);expect(pose.sx).toBeLessThan(1.1);
     expect(pose.sy).toBeGreaterThan(.9);expect(pose.sy).toBeLessThan(1.1);
   }
 });
 it('does not give resting, sick, or dead pets playful hops',()=>{
   for(let t=0;t<40000;t+=300){
     expect(samplePetPose('dead',t,'ember_fox')).toEqual({x:0,y:0,sx:1,sy:1,rotation:0,gesture:'still'});
     expect(samplePetPose('sleeping',t,'ember_fox').gesture).toBe('sleep-breath');
     expect(samplePetPose('sick',t,'ember_fox').gesture).toBe('quiet-breath');
   }
 });
 it('uses different pacing for the fox, turtle, and owl, including evolved art keys',()=>{
   expect(petPersonality('ember_fox__adult').tempo).toBeGreaterThan(petPersonality('moss_turtle').tempo);
   expect(petPersonality('luna_owl__juvenile')).toEqual(petPersonality('luna_owl'));
 });
});
