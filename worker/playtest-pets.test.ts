import {describe,it,expect} from 'vitest';
import {preparePlaytestPet} from '../scripts/playtest-pets';
import {freshGame,validateGame,studentCheckpoint} from './game-state';
import {hatchEgg} from '../src/services/game/evolutionEngine';
describe('authorized play-test pet grants',()=>{
 it('hatches the saved match without fabricating mastery, coins or discovery days',()=>{
  const s=freshGame('learner','Learner');s.eggDiscovery!.teacherChoice='moss_turtle';s.economy!.pendingXP=12;
  const next=preparePlaytestPet(s);expect(next.pet?.speciesId).toBe('moss_turtle');expect(next.egg).toBeNull();expect(next.eggDiscovery).toBeNull();expect(next.pet!.progression.xp).toBe(12);expect(next.player.currencies).toEqual(s.player.currencies);expect(next.player.lifetimeMathCorrect).toBe(s.player.lifetimeMathCorrect);expect(next.learningEvidence).toEqual(s.learningEvidence);expect(validateGame(next)).toBe(next);expect(()=>studentCheckpoint(next,next,'learner','Learner')).not.toThrow();expect(s.pet).toBeNull();
 });
 it('keeps Dre’s existing pet intact in the collection and is idempotent',()=>{
  const s=freshGame('dre','Mr Dre');s.pet=hatchEgg({id:'old',type:'koala',state:'ready',progress:100,createdAt:new Date().toISOString()});s.player.activePetId=s.pet!.id;
  const next=preparePlaytestPet(s,true);expect(next.pet?.speciesId).toBe('subtrak');expect(next.companionRoster).toEqual([s.pet]);expect(preparePlaytestPet(next,true)).toBe(next);expect(validateGame(next)).toBe(next);
 });
 it('does not replace a child’s already-hatched pet',()=>{const s=preparePlaytestPet(freshGame('learner','Learner'));expect(preparePlaytestPet(s)).toBe(s);});
});
