import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const state=(page:Page)=>page.evaluate(()=>({state:(window as any).captureState,completions:(window as any).captureCompletions}));
async function open(page:Page,query=''){
 await page.goto('/e2e/momentum-capture-fixture.html?'+query);
 await page.getByRole('button',{name:'Play capture',exact:true}).click();
 await expect(page.getByTestId('momentum-capture')).toBeVisible();
}
for(const role of ['add','subtract','multiply','divide'])for(const enemy of [false,true])test(`${role} ${enemy?'opponent':'player'} capture resolves only after the full sequence`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await open(page,`role=${role}${enemy?'&enemy':''}`);
 const scene=page.getByTestId('momentum-capture');await expect(scene).toHaveAttribute('data-style',role);
 await expect.poll(()=>scene.getAttribute('data-stage'),{intervals:[30]}).toBe('impact');let current=await state(page);expect(current.state.pieces.some((p:any)=>p.id==='defender')).toBe(true);expect(current.completions).toBe(0);
 await expect.poll(()=>scene.getAttribute('data-stage'),{intervals:[30]}).toBe('claim');current=await state(page);expect(current.state.pieces.some((p:any)=>p.id==='defender')).toBe(true);
 await expect(scene).toHaveCount(0);current=await state(page);expect(current.completions).toBe(1);expect(current.state.pieces.some((p:any)=>p.id==='defender')).toBe(false);expect(current.state.pieces.find((p:any)=>p.id==='attacker').position).toEqual({x:0,y:0});expect(current.state.phase).toBe(enemy?'player_select':'ai_turn');expect(errors).toEqual([]);
});
for(const enemy of [false,true])test(`last capture waits before ${enemy?'defeat':'victory'}`,async({page})=>{
 await open(page,`winning${enemy?'&enemy':''}`);await expect.poll(()=>page.getByTestId('momentum-capture').getAttribute('data-stage'),{intervals:[30]}).toBe('shatter');expect((await state(page)).state.phase).toMatch(/animating/);await expect(page.getByTestId('phase')).toHaveText(enemy?'defeat':'victory');expect((await state(page)).completions).toBe(1);
});
test('Skip and Escape settle the capture once; classic promotion still follows',async({page})=>{
 await open(page,'classic');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Skip animation'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByTestId('momentum-capture')).toHaveCount(0);await page.waitForTimeout(3100);const current=await state(page);expect(current.completions).toBe(1);expect(current.state.pieces.find((p:any)=>p.id==='attacker').rank).toBe(3);expect(current.state.phase).toMatch(/flash/);
});
for(const setting of ['app','system','during'])test(`reduced motion ${setting} skips the battle movement`,async({page})=>{
 if(setting==='system')await page.emulateMedia({reducedMotion:'reduce'});await open(page,setting==='app'?'reduced':'');if(setting==='during')await page.evaluate(()=>(window as any).captureReduce());await expect(page.getByTestId('momentum-capture')).toHaveAttribute('data-reduced','true');await expect(page.getByTestId('momentum-capture')).toHaveCount(0);expect((await state(page)).completions).toBe(1);
});
test('resumed attack, Skip click, background tab and unmount cannot leave a stuck capture',async({page})=>{
 await page.goto('/e2e/momentum-capture-fixture.html?resume&enemy');await expect(page.getByTestId('momentum-capture')).toBeVisible();await page.getByRole('button',{name:'Skip animation'}).click();await expect(page.getByTestId('phase')).toHaveText('player_select');expect((await state(page)).completions).toBe(1);
 await open(page,'enemy');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByTestId('momentum-capture')).toHaveCount(0);expect((await state(page)).completions).toBe(1);
 await open(page);await page.evaluate(()=>(window as any).captureUnmount());await expect(page.getByTestId('momentum-capture')).toHaveCount(0);await page.waitForTimeout(3000);expect((await state(page)).completions).toBe(0);expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});
for(const size of [{width:1366,height:657},{width:1920,height:1080},{width:390,height:844},{width:844,height:390}])test(`capture fits ${size.width}x${size.height} and resizes mid-attack`,async({page})=>{
 mkdirSync('docs/verification/momentum-capture',{recursive:true});await page.setViewportSize(size);await open(page,'role=multiply');const scene=page.getByTestId('momentum-capture');await expect(scene).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'Skip animation'})).toBeInViewport({ratio:1});await expect.poll(()=>scene.getAttribute('data-stage'),{intervals:[30]}).toBe('windup');await page.screenshot({path:`docs/verification/momentum-capture/${size.width}-windup.png`});await page.setViewportSize({width:size.width-20,height:size.height-20});await expect(scene).toBeInViewport({ratio:1});await expect(scene).toHaveCount(0);expect((await state(page)).completions).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
