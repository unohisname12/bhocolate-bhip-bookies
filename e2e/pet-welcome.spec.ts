import {test,expect} from '@playwright/test';
test('phone Home keeps the hatched pet despite an old discovery goal, and greets with new Subtrak art',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto('/e2e/pet-welcome-fixture.html');
 await expect(page.getByRole('button',{name:'Say hello to Subtrak'})).toBeVisible();await expect(page.locator('.student-companion-egg')).toHaveCount(0);await expect(page.locator('.home-hatch-trail')).toHaveCount(0);
 await page.getByRole('button',{name:'Say hello to Subtrak'}).click();await expect(page.locator('.pet-sprite')).toHaveAttribute('data-pet-animation','being_petted');await expect(page.getByRole('status')).toContainText('Subtrak:');
 await page.screenshot({path:'/tmp/vpet-subtrak-home-phone.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('phone nursery clearly warms, unlocks hatching and replaces the egg with a pet',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/e2e/pet-welcome-fixture.html?nursery');await expect(page.getByRole('button',{name:'Warm the egg first · 0%'})).toBeDisabled();
 for(let i=0;i<10;i++)await page.getByRole('button',{name:'Tap egg to warm it',exact:true}).click();
 const hatch=page.getByRole('button',{name:'Hatch my pet',exact:true});await expect(hatch).toBeEnabled();const box=await hatch.boundingBox();expect(box!.y+box!.height).toBeLessThan(844);
 await page.screenshot({path:'/tmp/vpet-hatch-phone.png',fullPage:true});await hatch.click();await expect(page.getByRole('button',{name:'Say hello to Subtrak'})).toBeVisible();await expect(page.locator('.student-companion-egg')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('returning pet welcomes from memory once and stays still with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/e2e/pet-welcome-fixture.html?returning');
 const greeting=page.getByRole('status');await expect(greeting).toBeVisible();await expect(greeting).toContainText(/4 days|Yay, you’re here/);
 await expect(page.locator('.student-companion')).toHaveAttribute('data-still','true');
 const text=await greeting.textContent();await page.waitForTimeout(1500);await expect(greeting).toHaveText(text!);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('greeting a sleeping pet does not wake its animation',async({page})=>{
 await page.goto('/e2e/pet-welcome-fixture.html?sleeping');await page.getByRole('button',{name:'Say hello to Subtrak'}).click();
 await expect(page.locator('.pet-sprite')).toHaveAttribute('data-pet-animation','sleeping');await expect(page.getByRole('status')).toContainText('quiet little rest');
});
