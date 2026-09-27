import {test,expect,type Page} from '@playwright/test';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {computeChecksum} from '../src/services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {initMomentum} from '../src/engine/systems/MomentumSystem';
async function seed(page:Page) {
 const state=createInitialEngineState();state.screen='momentum';state.showDailyRitual=false;state.player.lastLoginDate=new Date().toISOString().slice(0,10);state.momentum=initMomentum('easy','classic');state.learning={...state.learning,grade:1,topic:'Subtraction within 20'};
 await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},JSON.stringify({state,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(state)}));await page.goto('/');
}
test('Momentum optional plan uses the selected piece energy and actual route cost',async({page})=>{
 await seed(page);await page.getByRole('button',{name:/^Easy/}).click();
 await page.getByRole('checkbox',{name:/Plan moves with math/}).check();
 const board=page.locator('[data-help="momentum-board"]');await board.getByRole('button',{name:/Your rank/}).first().click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state.momentum);
 const piece=before.pieces.find((p:{id:string})=>p.id===before.selectedPieceId);
 await board.getByRole('button',{name:/available move, costs 1 energy/}).first().click();
 await expect(page.getByRole('region',{name:'Math game plan'})).toBeVisible();
 await page.getByLabel('Your answer',{exact:true}).fill(String(piece.energy-1));await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state.momentum.turnCount)).toBeGreaterThan(before.turnCount);
 const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state.learningEvidence);
 expect(evidence.at(-1)).toMatchObject({source:'momentum',correct:true,firstAttemptCorrect:true});
});
