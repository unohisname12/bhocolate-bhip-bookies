import { PET_ANIMATIONS } from '../src/config/petAnimationCoverage';
import {expect,test} from '@playwright/test';
test('every companion and stage moves, changes activity, and fully pauses',async({page})=>{
 await page.setViewportSize({width:1800,height:1100});await page.goto('/');
 await page.evaluate(async()=>{const modulePath='/e2e/pet-animation-fixture.tsx';(await import(modulePath)).mount();});
 const gallery=page.getByRole('main').filter({has:page.getByRole('heading',{name:'Companion motion check'})});
 const bodies=gallery.locator('.pet-body-motion'), sprites=gallery.locator('.pet-sprite');
 await expect(bodies).toHaveCount(36);
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-gesture')==='breathing'))).toBe(true);
 const transforms=await bodies.evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform));
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform))).not.toEqual(transforms);
 await page.getByLabel('Animation',{exact:true}).selectOption('walking');
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-gesture')==='little-steps'))).toBe(true);
 await page.getByLabel('Animation',{exact:true}).selectOption('sleeping');
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-gesture')==='sleep-breath'))).toBe(true);
 for (const action of PET_ANIMATIONS.filter(a=>a!=='dead')) {
  await page.getByLabel('Animation',{exact:true}).selectOption(action);
  await expect.poll(()=>sprites.evaluateAll((nodes,expected)=>nodes.every(n=>n.getAttribute('data-pet-animation')===expected),action)).toBe(true);
  await expect(gallery.getByText('Missing Animation',{exact:true})).toHaveCount(0);
 }
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).style.transform===''))).toBe(true);
 const frames=await sprites.locator('[style*="background-position"]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.backgroundPosition));
 await page.waitForTimeout(400);
 expect(await sprites.locator('[style*="background-position"]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.backgroundPosition))).toEqual(frames);
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.getByLabel('Animation',{exact:true}).selectOption('idle');
 await expect(bodies.first()).toHaveAttribute('data-motion-gesture','breathing');
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.some(n=>['look-around','stretch','little-hop','curious-sway'].includes(n.getAttribute('data-motion-gesture')??''))),{timeout:9000}).toBe(true);
 await page.screenshot({path:'docs/verification/pet-motion-companions.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>sprites.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-paused')==='true'))).toBe(true);
 await expect.poll(()=>bodies.evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).style.transform===''))).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>sprites.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-paused')==='true'))).toBe(true);
 await page.evaluate(()=>{delete (document as unknown as Record<string,unknown>).hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.getByLabel('Animation',{exact:true}).selectOption('dead');
 await expect.poll(()=>sprites.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('data-motion-paused')==='true'))).toBe(true);
});

test('DEV previews all forms/actions and starts a fight against each new enemy without saving',async({page})=>{
 test.setTimeout(120000);
 const {seedLegacyEgg}=await import('./legacy-egg');await seedLegacyEgg(page);
 const {ENEMY_IDS,ENEMIES}=await import('../src/config/enemyConfig');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(r.url());});
 await page.setViewportSize({width:1440,height:1000});await page.goto('/?dev=1');
 await page.getByRole('button',{name:'Nurture egg',exact:true}).click();
 await page.getByRole('button',{name:'Open Dev Mode'}).click();
 await page.locator('[data-preview-screen="home"]').click();
 const save=await page.evaluate(()=>localStorage.getItem('vpet_save_auto'));
 await page.getByRole('button',{name:'Open Dev Mode'}).click();
 await page.getByRole('button',{name:'All pets & animations',exact:true}).click();
 await expect(page.locator('[data-gallery-pet]')).toHaveCount(36);
 for(const action of [...PET_ANIMATIONS,'attack','special','defend','hurt','heal','math','hatch']){
  await page.getByLabel('Gallery animation').selectOption(action);
  await page.waitForTimeout(60);
  expect(await page.locator('[data-gallery-pet] img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0))).toBe(true);
 }
 await page.getByRole('button',{name:'← Back to DEV screens'}).click();
 await page.getByLabel('Preview companion').selectOption('subtrak');await page.getByLabel('Preview growth stage').selectOption('adult');
 await page.getByRole('button',{name:'Enemies & combat',exact:true}).click();
 await expect(page.locator('[data-gallery-enemy]')).toHaveCount(12);
 for(const action of ['idle','attack','special','defend','hurt','heal']){
  await page.getByLabel('Enemy animation').selectOption(action);await page.waitForTimeout(180);
  await page.screenshot({path:`docs/verification/enemy-gallery-${action}.png`,fullPage:true});
 }
 for(const id of ENEMY_IDS){
  await page.getByRole('button',{name:`Fight ${ENEMIES[id].name}`,exact:true}).click();
  await expect(page.locator(`img[alt="${ENEMIES[id].name}"]`).first()).toBeVisible();
  await expect(page.locator('img[src*="subtrak-adult-portrait"]')).toHaveCount(2);
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await page.getByRole('button',{name:'Enemies & combat',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/verification/enemy-gallery-phone.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('vpet_save_auto'))).toBe(save);
 expect(errors).toEqual([]);
});
