import {test,expect} from '@playwright/test';
for(const size of [{width:1366,height:768},{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]) {
 test(`pet world fits ${size.width}x${size.height}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(size);await page.goto('/e2e/pet-room-fixture.html');
  const world=page.locator('#vpet-scene');await expect(world).toBeVisible();
  await expect.poll(async()=> (await world.boundingBox())!.width).toBeGreaterThan(size.width>800?550:300);
  const box=(await world.boundingBox())!,nav=(await page.getByRole('navigation',{name:'Student menus'}).boundingBox())!;
  expect(box.y).toBeGreaterThan(nav.y+nav.height);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width);
  expect(await page.locator('.home-shell').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  const care=await page.getByRole('region',{name:'Pet wellbeing'}).boundingBox();
  const tools=await page.getByRole('button',{name:'Time together',exact:true}).boundingBox();
  expect(tools!.y).toBeGreaterThanOrEqual(care!.y+care!.height);
  await page.getByRole('button',{name:'Say hello',exact:true}).click();
  await page.getByRole('button',{name:'Time together',exact:true}).click();await expect(page.getByRole('region',{name:'Quick care tools'})).toBeVisible();
  await page.getByRole('button',{name:'Close tools',exact:true}).click();
  await page.getByRole('button',{name:'Home',exact:true}).last().click();
  await expect(page.getByRole('button',{name:'Home',exact:true}).last()).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Yard',exact:true}).click();
  await page.locator('.home-shell').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:`docs/verification/pet-room/${size.width}.png`});expect(errors).toEqual([]);
 });
}

for(const size of [{width:1366,height:657},{width:390,height:844}])test(`welcome dialog closes above headers ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/e2e/pet-room-fixture.html?welcome');const dialog=page.getByRole('dialog',{name:'Welcome back'});await expect(dialog).toBeVisible();const close=dialog.getByRole('button',{name:'Close Welcome back'});await close.scrollIntoViewIfNeeded();expect(await close.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});
