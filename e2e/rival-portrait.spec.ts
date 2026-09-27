import {test,expect} from '@playwright/test';
test('rivals show only owned current forms and mystery badges for other species',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
 await page.goto('/e2e/rival-portrait-fixture.html');
 for(const [stage,key] of [['baby','bramble_hedgehog'],['juvenile','bramble_hedgehog__juvenile'],['adult','bramble_hedgehog__adult']]){
 const section=page.locator(`[data-case="${stage}"]`);await expect(section.locator('.pet-sprite')).toHaveAttribute('data-pet-species',key);await expect(section.getByRole('img',{name:'Mystery rival — appearance hidden'})).toHaveCount(1);
 }
 await expect(page.locator('[data-case="egg"] .pet-sprite')).toHaveCount(0);await expect(page.locator('[data-case="egg"] .rival-mystery')).toHaveCount(2);
 expect(errors).toEqual([]);await page.screenshot({path:'/tmp/vpet-rival-portraits.png',fullPage:true});
});
