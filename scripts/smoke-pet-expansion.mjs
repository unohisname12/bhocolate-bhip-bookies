import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(r.url());});
 await page.goto(process.env.DEMO_URL||'https://v-pet-demo.deandresample3.workers.dev');
 await page.getByRole('button',{name:'Demo features',exact:true}).click();
 await page.getByRole('button',{name:'All pets & animations',exact:true}).click();
 await page.locator('[data-gallery-pet]').first().waitFor();assert.equal(await page.locator('[data-gallery-pet]').count(),36);
 await page.getByLabel('Gallery animation').selectOption('sleeping');await page.waitForTimeout(650);
 await page.getByRole('button',{name:'← Back to DEV screens'}).click();
 await page.getByLabel('Preview companion').selectOption('mech_bot');await page.getByLabel('Preview growth stage').selectOption('adult');
 await page.getByRole('button',{name:'Enemies & combat',exact:true}).click();assert.equal(await page.locator('[data-gallery-enemy]').count(),12);
 await page.getByLabel('Enemy animation').selectOption('special');await page.waitForTimeout(200);
 await page.screenshot({path:'docs/verification/live-enemies.png'});
 await page.getByRole('button',{name:'Fight Nightmare Drake',exact:true}).click();
 await page.locator('img[alt="Nightmare Drake"]').first().waitFor();
 assert.equal(await page.locator('img[src*="mech_bot-adult-portrait"]').count(),2);
 await page.screenshot({path:'docs/verification/live-legacy-battle.png'});
 assert.deepEqual(errors,[]);console.log('PASS live 36 pet forms, 12 enemies, grown Mech Bot vs Nightmare Drake, no missing assets or runtime errors.');
}finally{await browser.close();}
