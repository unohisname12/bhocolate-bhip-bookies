import {test,expect} from '@playwright/test';
for(const size of [{width:1366,height:768},{width:1280,height:720},{width:1366,height:657},{width:1920,height:1080},{width:390,height:844}]) {
 test(`math controls fit ${size.width}x${size.height}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(size);await page.goto('/e2e/math-layout-fixture.html');
  const submit=page.getByRole('button',{name:'Submit',exact:true});await expect(submit).toBeVisible();
  if(size.width>800){
   const b=(await submit.boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(size.height);
   await expect(page.getByRole('button',{name:'Try again without help',exact:true})).toBeInViewport({ratio:1});
   const input=(await page.getByLabel('Your answer',{exact:true}).boundingBox())!;const prompt=(await page.getByRole('heading',{name:'72 − 14 = ?'}).boundingBox())!;expect(input.x).toBeGreaterThan(prompt.x+prompt.width);
   expect(await page.locator('.math-practice-screen').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
  }
  expect(await page.locator('.math-practice-screen').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'5',exact:true}).click();await page.getByRole('button',{name:'8',exact:true}).click();await expect(page.getByLabel('Your answer',{exact:true})).toHaveValue('58');
  await page.getByRole('button',{name:'Delete last digit'}).click();await expect(page.getByLabel('Your answer',{exact:true})).toHaveValue('5');
  await submit.click();await expect(page.getByRole('status').filter({hasText:'Not quite yet'})).toBeVisible();
  await page.getByRole('button',{name:'Explain the answer',exact:true}).click();await expect(page.getByRole('region',{name:'Worked explanation'})).toContainText('58');
  if(size.width>800){const b=(await submit.boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(size.height);}
  await page.getByLabel('Your answer',{exact:true}).fill('58');await submit.click();await expect(page.getByRole('status').filter({hasText:'Your answer is correct'})).toBeVisible();
  if(size.width>800){const b=(await submit.boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(size.height);}
  await page.screenshot({path:`docs/verification/pet-room/math-${size.width}-${size.height}.png`});expect(errors).toEqual([]);
 });
}
test('fifth answer shows reachable finish controls',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/e2e/math-layout-fixture.html?finish');await page.getByLabel('Your answer',{exact:true}).fill('58');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('region',{name:'Practice complete'})).toBeVisible();await expect(page.getByRole('button',{name:'Finish practice',exact:true})).toBeInViewport();
});
