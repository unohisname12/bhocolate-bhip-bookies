import { describe, it, expect, vi, afterEach } from 'vitest';
import sharp from 'sharp';
import { ENEMY_IDS, ENEMIES, NEW_RUN_ENEMIES } from '../enemyConfig';
import { ASSETS } from '../assetManifest';
import { SPECIES_CONFIG } from '../speciesConfig';
import { speciesIdToBattlePet, initBattle, executePlayerMove, executeEnemyTurn, resolveRound } from '../../engine/systems/BattleSystem';
import { buildRunEnemy } from '../../engine/systems/RunBattleAdapter';
import { createScreenPreview } from '../../devtools/screenCatalog';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { engineReducer } from '../../engine/state/engineReducer';
import { LEGACY_COMPANIONS, petVisualKey } from '../companionConfig';
afterEach(()=>vi.restoreAllMocks());
describe('enemy expansion',()=>{
 it.each(ENEMY_IDS)('%s has assets, distinct moves, and resolves combat',async id=>{
  vi.spyOn(Math,'random').mockReturnValue(0.4);
  expect(SPECIES_CONFIG[id]).toBeUndefined();
  const enemy=speciesIdToBattlePet(id,10);
  expect(enemy.name).toBe(ENEMIES[id].name);
  expect(enemy.moves.map(m=>m.type)).toEqual(['attack','special','defend','heal']);
  expect(buildRunEnemy(NEW_RUN_ENEMIES.find(e=>e.id===id)!,10).speciesId).toBe(id);
  for(const action of ['idle','attack','special','defend','hurt','heal','math']){
   const sheet=ASSETS.combatAnims[id][action];const m=await sharp('public'+sheet.url).metadata();
   expect(m.width).toBe(sheet.frameWidth*sheet.frameCount);expect(m.height).toBe(sheet.frameHeight);
  }
  const preview=createScreenPreview('battle',createInitialEngineState().learning);
  let battle={...initBattle(preview.pet!),enemyPet:enemy};
  for(let turn=0;turn<100&&!['victory','defeat'].includes(battle.phase);turn++){
   const move=battle.playerPet.moves.find(m=>m.type==='attack')!;
   battle=executePlayerMove(battle,move.id);
   if(battle.enemyPet.currentHP>0)battle=executeEnemyTurn(battle);
   battle=resolveRound(battle);
   expect(Number.isFinite(battle.enemyPet.currentHP)).toBe(true);
  }
  expect(['victory','defeat']).toContain(battle.phase);
 });
 it.each(Object.keys(LEGACY_COMPANIONS) as (keyof typeof LEGACY_COMPANIONS)[])('%s evolves through both stages with new visuals and powers',id=>{
  for(const stage of ['baby','juvenile'] as const){
   let state=createScreenPreview('growth',createInitialEngineState().learning,{species:id,stage,ready:true});
   const oldKey=petVisualKey(state.pet!);state=engineReducer(state,{type:'START_GROWTH_TRIAL',kind:'evolution'});
   expect(state.growthTrial).toBeTruthy();
   while(state.growthTrial&&!state.growthTrial.complete){const q=state.growthTrial.problems[state.growthTrial.index];state=engineReducer(state,{type:'ANSWER_GROWTH_TRIAL',questionId:q.id,answer:String(q.answer)});}
   expect(petVisualKey(state.pet!)).not.toBe(oldKey);
   expect(state.pet!.stage).toBe(stage==='baby'?'juvenile':'adult');
   expect(initBattle(state.pet!).playerPet.moves.some(m=>m.id.startsWith('growth_'))).toBe(true);
  }
 });
});
