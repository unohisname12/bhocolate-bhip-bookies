import {test,expect,type Page} from '@playwright/test';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {computeChecksum} from '../src/services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {initMomentum,buildBoard} from '../src/engine/systems/MomentumSystem';
async function seed(page:Page,resume=false){
 const state=createInitialEngineState();state.screen='momentum';state.showDailyRitual=false;state.player.lastLoginDate=new Date().toISOString().slice(0,10);state.momentum=initMomentum('easy',resume?'advanced':'classic');
 if(resume){state.momentum.turnCount=2;state.momentum.log=[{turn:1,actor:'player',message:'Resumed tactics lesson'}];state.momentum.pieces[0].energy=0;state.momentum.board=buildBoard(state.momentum.pieces,7);}
 await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},JSON.stringify({state,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(state)}));await page.goto('/');
}
const board=(page:Page)=>page.locator('[data-help="momentum-board"]');
const saved=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state.momentum);
test('Classic teaches real capture rules with a working practice example and cost labels',async({page})=>{
 await seed(page);await page.locator('.momentum-picker .game-rules > summary').click();
 const rules=page.getByRole('region',{name:'Momentum rules'});
 await expect(rules).toContainText('Any rank can capture any other rank');
 await rules.getByRole('button',{name:'Practice blue piece',exact:true}).click();await rules.getByRole('button',{name:'Practice red target',exact:true}).click();await expect(rules.getByRole('status')).toContainText('Captured!');
 await page.getByRole('button',{name:/^Easy/}).click();await expect(board(page).getByRole('button')).toHaveCount(25);
 const piece=board(page).getByRole('button',{name:/Your rank/}).first();await piece.focus();await piece.press('Enter');await expect(piece).toHaveAttribute('aria-pressed','true');
 const move=board(page).getByRole('button',{name:/available move, costs 1 energy/}).first();await move.click();await expect.poll(async()=>(await saved(page)).turnCount).toBeGreaterThan(1);
});
test('Advanced has 49 cells, five blue pieces, guard, stations, rewards and saved mode',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);await page.getByRole('button',{name:'Advanced · 7×7',exact:true}).click();await page.getByRole('button',{name:/^Easy/}).click();
 await expect(board(page).getByRole('button')).toHaveCount(49);await expect(board(page).getByRole('button',{name:/Your rank/})).toHaveCount(5);await expect(board(page).getByRole('button',{name:/energy station/})).toHaveCount(3);
 await board(page).getByRole('button',{name:/Your rank 3/}).click();await page.getByRole('button',{name:'Guard · 1 energy',exact:true}).click();
 await expect(board(page).getByRole('button',{name:/guarded/})).toHaveCount(1);await expect.poll(async()=>(await saved(page)).turnCount).toBe(2);
 await page.locator('.momentum-coach .game-rules > summary').click();await expect(page.getByRole('region',{name:'Move guidance'})).toContainText('8 shards');
 await page.reload();await expect(board(page).getByRole('button')).toHaveCount(49);await expect(page.getByRole('heading',{name:'Choose your Momentum game'})).toHaveCount(0);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results-momentum/advanced-desktop.png',fullPage:true});
});
test('resumed Advanced game transfers energy to an adjacent ally and phone board stays inside viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,true);
 await expect(board(page).getByRole('button')).toHaveCount(49);
 await board(page).getByRole('button',{name:/Your rank 2 piece.*row 7, column 2/}).click();await page.getByRole('button',{name:'Give 2 energy → row 7, column 1',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).pieces.find((p:any)=>p.id==='p1').energy).toBe(2);
 const lastCell=await board(page).getByRole('button',{name:/row 7, column 7/}).boundingBox();expect(lastCell!.x+lastCell!.width).toBeLessThanOrEqual(390);
 const bounds=await board(page).boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await expect.poll(async()=>(await saved(page)).turnCount).toBe(3);
 await page.screenshot({path:'test-results-momentum/advanced-phone.png',fullPage:true});
});
