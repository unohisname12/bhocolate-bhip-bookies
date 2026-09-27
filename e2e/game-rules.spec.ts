import {test,expect} from '@playwright/test';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {computeChecksum} from '../src/services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {initMomentum} from '../src/engine/systems/MomentumSystem';
for(const screen of ['momentum','number_merge','catch_math','math','arcade'] as const){
 test(`${screen}: rules start hidden, reopen and close without restarting play`,async({page})=>{
  const state=createInitialEngineState();state.screen=screen;state.showDailyRitual=false;state.player.lastLoginDate=new Date().toISOString().slice(0,10);
  if(screen==='momentum'){state.momentum=initMomentum('easy','advanced');state.momentum.turnCount=2;}
  await page.addInitScript(value=>localStorage.setItem('vpet_save_auto',value),JSON.stringify({state,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(state)}));await page.setViewportSize({width:390,height:844});await page.goto('/');
  const games=screen==='arcade'?['dash','guard','cafe']:[''];
  for(const game of games){
   if(game)await page.locator(`#arcade-${game}`).getByRole('button').click();
   const rules=page.locator('.game-rules').first();await expect(rules).not.toHaveAttribute('open','');await expect(rules.locator('.game-rules-content')).toBeHidden();
   await rules.locator(':scope > summary').click();await expect(rules.locator('.game-rules-content')).toBeVisible();await expect(rules.locator(':scope > summary')).toHaveText('How to play · show rulesHide rules');
   await rules.getByRole('button',{name:'Hide rules',exact:true}).click();await expect(rules.locator('.game-rules-content')).toBeHidden();await rules.locator(':scope > summary').click();await expect(rules.locator('.game-rules-content')).toBeVisible();await rules.locator(':scope > summary').click();
   if(game){await page.getByRole('button',{name:'Finish round early'}).click();await page.getByRole('button',{name:'Collect & choose a game'}).click();}
  }
 });
}
test('care instructions can be hidden before and during play',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Open Dev Mode'}).click();await page.getByLabel('Preview companion').selectOption('ember_fox');await page.getByLabel('Preview growth stage').selectOption('juvenile');await page.locator('[data-preview-screen="pet_care"]').click();await page.getByRole('button',{name:'Start Play',exact:true}).click();
 const dialog=page.getByRole('dialog'),rules=dialog.locator('.game-rules');await expect(rules.locator('.game-rules-content')).toBeHidden();await rules.locator(':scope > summary').click();await expect(rules.locator('.game-rules-content')).toBeVisible();await rules.locator(':scope > summary').click();await dialog.getByRole('button',{name:'Let’s begin'}).click();await expect(rules.locator('.game-rules-content')).toBeHidden();await rules.locator(':scope > summary').click();await expect(rules.locator('.game-rules-content')).toBeVisible();await rules.locator(':scope > summary').click();await dialog.getByRole('button',{name:'Catch the ball'}).click();await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow','13');
});
