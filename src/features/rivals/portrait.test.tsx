import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivePetContext } from '../../components/ActivePetContext';
import type { Pet } from '../../types/pet';
import { RivalPortrait } from './RivalBoard';
vi.mock('../../components/pet/PetSprite', () => ({ PetSprite: ({speciesId,stage}: {speciesId:string;stage:string}) => <img data-species={speciesId} data-stage={stage}/> }));
const portrait=(species:string|null,stage:Pet['stage']='baby',teacher=false)=>renderToStaticMarkup(<ActivePetContext.Provider value={species?{speciesId:species,stage} as Pet:null}><RivalPortrait species="bramble_hedgehog" teacher={teacher}/></ActivePetContext.Provider>);
describe('rival evolution surprises',()=>{
 it('hides artwork before hatching and for species the learner does not own',()=>{
  for(const value of [portrait(null),portrait('moss_turtle','adult')]){expect(value).toContain('Mystery rival');expect(value).not.toContain('<img');}
 });
 it('uses exactly the current owned stage, even when an older form was previously unlocked',()=>{
  for(const stage of ['baby','juvenile','adult','elder'] as const){const value=portrait('bramble_hedgehog',stage);expect(value).toContain(`data-stage="${stage}"`);expect(value).not.toContain('Mystery rival');}
 });
 it('does not reveal evolved forms through the teacher board',()=>{expect(portrait('bramble_hedgehog','adult',true)).not.toContain('<img');});
});
