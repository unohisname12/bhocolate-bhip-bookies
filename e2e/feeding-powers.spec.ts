import {test,expect,type Page} from '@playwright/test';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {computeChecksum} from '../src/services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {initMomentum} from '../src/engine/systems/MomentumSystem';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {createHomeBase} from '../src/features/home-base/model';
async function seed(page:Page,screen:'feeding'|'home_builder'|'momentum'){
 const state=createInitialEngineState();state.screen=screen;state.showDailyRitual=false;state.player.lastLoginDate=new Date().toISOString().slice(0,10);state.player.currencies.tokens=500;state.pet=hatchEgg({id:'feeding-test',type:'subtrak',state:'ready',progress:100,createdAt:new Date().toISOString()});state.pet.name='Captain Waffles';state.achievements=[{achievementId:'first_feed',current:1,unlocked:true,unlockedAt:Date.now()}];state.homeBase=createHomeBase(state);state.momentum=initMomentum('hard','powers');
 await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},JSON.stringify({state,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(state)}));await page.goto('/');
}
const save=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
test('feeding plays one purchase through hand-off, chewing and happiness',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await seed(page,'feeding');
 await expect(page.getByRole('dialog',{name:'Feed Pet'})).toBeVisible();await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/feeding-menu.png'});
 const start=(await save(page)).player.currencies.tokens;await page.getByRole('button',{name:'Feed Apple for 5 tokens',exact:true}).click();
 await expect(page.locator('.feeding-scene')).toHaveAttribute('data-phase','enter');await expect(page.locator('.feeding-scene')).toHaveAttribute('data-species','subtrak');
 await expect(page.locator('.feeding-scene')).toHaveAttribute('data-phase','offer');await page.waitForTimeout(800);await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/feeding-hand.png'});
 await expect(page.locator('.feeding-scene')).toHaveAttribute('data-phase','eat');await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/feeding-eating.png'});
 await expect(page.getByRole('button',{name:'Choose another snack'})).toBeEnabled({timeout:10000});expect((await save(page)).player.currencies.tokens).toBe(start-5);
 await page.getByRole('button',{name:'Choose another snack'}).click();await expect(page.getByRole('button',{name:'Feed Apple for 5 tokens'})).toBeVisible();expect((await save(page)).player.currencies.tokens).toBe(start-5);expect(errors).toEqual([]);
});
test('home feeding uses saved furniture and fits a phone; escape keeps a single purchase',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,'home_builder');await page.getByRole('button',{name:'Feed my pet'}).click();await expect(page.locator('.feeding-home [data-home-room]')).toBeVisible();
 await page.getByRole('button',{name:'Feed Bread for 7 tokens'}).click();await expect(page.locator('.feeding-scene')).toHaveAttribute('data-phase','eat',{timeout:6000});await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/feeding-home-phone.png'});
 const panel=await page.getByRole('dialog',{name:'Feed Pet'}).boundingBox();expect(panel!.x).toBeGreaterThanOrEqual(0);expect(panel!.x+panel!.width).toBeLessThanOrEqual(390);expect(await page.getByRole('dialog',{name:'Feed Pet'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Feed Pet'})).toHaveCount(0);expect((await save(page)).player.currencies.tokens).toBe(493);
 await page.getByRole('button',{name:'Feed my pet'}).click();await expect(page.locator('.feeding-scene')).toHaveAttribute('data-phase','ready');expect((await save(page)).player.currencies.tokens).toBe(493);
});
test('Power Clash explains roles, has no question prompt, saves and plays its video',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await seed(page,'momentum');await page.getByRole('button',{name:'Power Clash · Hard',exact:true}).click();await page.getByRole('button',{name:/^Hard/}).click();
 const board=page.locator('[data-help="momentum-board"]');await expect(board.getByRole('button')).toHaveCount(49);await expect(board.getByRole('button',{name:/Your /})).toHaveCount(4);
 await board.locator('[data-position="0,6"]').click();await expect(page.getByRole('button',{name:/Charge \+2/})).toBeVisible();await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/momentum-powers-desktop.png'});
 await page.getByRole('button',{name:/Charge \+2/}).click();await expect.poll(async()=>(await save(page)).momentum.turnCount).toBeGreaterThan(1);await expect(page.locator('input')).toHaveCount(0);await page.reload();await expect(board.getByRole('button')).toHaveCount(49);expect((await save(page)).momentum.mode).toBe('powers');
 await page.getByRole('button',{name:'Watch piece powers'}).click();const video=page.locator('dialog[open] video');await expect(video).toBeVisible();await video.evaluate(async(el:HTMLVideoElement)=>{await el.play();});await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.currentTime)).toBeGreaterThan(.2);await page.getByRole('button',{name:'Close powers guide'}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/momentum-powers-phone.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
});
test('all 12 companions in three growth stages have working eating sprites',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.evaluate(async()=>{const module=await import('/e2e/feeding-gallery.tsx');module.mount();});await expect(page.locator('.feeding-scene')).toHaveCount(36);await expect(page.locator('[data-pet-animation="eating"]')).toHaveCount(36,{timeout:7000});await expect(page.getByText('Missing Sprite Sheet',{exact:true})).toHaveCount(0);await expect(page.getByText('Missing Animation',{exact:true})).toHaveCount(0);await page.screenshot({path:'/home/dre/Pictures/Feeding-Momentum-2026-09-26/all-pets-eating.png',fullPage:true});expect(errors).toEqual([]);
});
test('reduced motion keeps feeding usable without travel animations',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await seed(page,'feeding');await page.getByRole('button',{name:'Feed Apple for 5 tokens'}).click();await expect(page.locator('.feeding-scene')).toHaveClass(/is-still/);await expect(page.locator('.feeding-companion')).toHaveCSS('animation-name','none');await page.getByRole('button',{name:'Back to my pet'}).click();await expect(page.getByRole('dialog',{name:'Feed Pet'})).toHaveCount(0);expect((await save(page)).events.filter((e:any)=>e.type==='pet_fed')).toHaveLength(1);
});
