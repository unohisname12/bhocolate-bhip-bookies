/** One-time, explicitly authorized play-test grant. Not exposed as a student action. */
import type { EngineState } from '../src/types/engine';
import { COMPANIONS, companionForEgg } from '../src/config/companionConfig';
import { matchCompanion } from '../src/services/game/eggDiscovery';
import { hatchEgg } from '../src/services/game/evolutionEngine';
import { applyDiscoveryBond } from '../src/services/game/discoveryBond';
import { claimPendingGrowth } from '../src/services/game/economy';
export function preparePlaytestPet(state: EngineState, dre = false): EngineState {
  if (state.pet && !dre) return state;
  if (dre && state.pet?.speciesId === 'subtrak') return state;
  if (state.battle.active || state.run.active || state.momentum.active) throw new Error('Finish the current game before changing the active pet.');
  const discovery=state.eggDiscovery;
  const species=dre?'subtrak':state.egg?companionForEgg(state.egg.type):discovery?.companion??(discovery?matchCompanion(discovery):null);
  if(!species)throw new Error('No saved egg or companion match; manual review required.');
  const roster=[...(state.companionRoster??[]),...(state.pet?[state.pet]:[])];
  const existing=roster.find(p=>p.speciesId===species);
  const hatched=existing??hatchEgg({id:crypto.randomUUID(),type:COMPANIONS[species].egg,state:'ready',progress:100,createdAt:new Date().toISOString()});
  if(!hatched)throw new Error('Could not hatch assigned species.');
  // Apply only the activities actually recorded, without inventing five daily stamps.
  const pet=existing??applyDiscoveryBond({...hatched,id:'pet_'+crypto.randomUUID(),ownerId:state.player.id},discovery?{...discovery,status:'claimed'}:null);
  return claimPendingGrowth({...state,pet,companionRoster:roster.filter(p=>p.id!==pet.id),egg:null,eggDiscovery:null,growthTrial:null,screen:'home',player:{...state.player,activePetId:pet.id}});
}
