import {test,expect,type Page} from '@playwright/test';
const saved=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('house-test')!));
const doors=(p:Page)=>p.getByRole('navigation',{name:'Doors and stairs'});
async function travel(p:Page,name:string,destination:string){await doors(p).getByRole('button',{name,exact:false}).click();await expect(p.locator('.hb-room-heading h2')).toHaveText(destination,{timeout:15000});await expect(p.getByRole('dialog',{name:/Going to/})).toHaveCount(0);}
test('two-floor cottage has real stairs, preserves old decorations, and saves the destination',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1366,height:900});await page.goto('/e2e/full-house-fixture.html');
 await expect(page.getByRole('region',{name:'Your two-story house'})).toBeVisible();await expect(page.locator('.cottage-storey')).toHaveCount(2);
 const before=await saved(page);await page.locator('.cottage-overview').screenshot({path:'docs/verification/full-house-map.png'});
 await doors(page).getByRole('button',{name:/Go upstairs/}).click();await expect(page.getByRole('dialog',{name:'Going to Upstairs nook'})).toBeVisible();await expect(page.getByText('Up we go!',{exact:true})).toBeVisible({timeout:12000});await page.getByRole('dialog',{name:'Going to Upstairs nook'}).screenshot({path:'docs/verification/full-house-stairs.png'});
 await expect(page.locator('.hb-room-heading h2')).toHaveText('Upstairs nook',{timeout:10000});
 expect((await saved(page)).homeBase.rooms.den).toEqual(before.homeBase.rooms.den);expect((await saved(page)).player.currencies).toEqual(before.player.currencies);
 await page.reload();await expect(page.locator('.hb-room-heading h2')).toHaveText('Upstairs nook');await travel(page,'Go downstairs','Welcome hall');expect(errors).toEqual([]);
});
test('phone kitchen and bathroom have working care, clear navigation and no overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/e2e/full-house-fixture.html');
 await travel(page,'Welcome hall','Welcome hall');await travel(page,'Kitchen','Kitchen');await page.getByRole('button',{name:'Prepare a snack',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Free snack',exact:true}).click();expect((await saved(page)).pet.needs.hunger).toBeGreaterThan(65);
 await travel(page,'Go upstairs','Upstairs nook');await travel(page,'Bathroom','Bathroom');await page.getByRole('button',{name:'Wash my pet',exact:true}).click();await expect(page.locator('.care-session-backdrop')).toBeVisible();await page.getByRole('button',{name:/cancel|back|close/i}).last().click();await expect(page.locator('.care-session-backdrop')).toHaveCount(0);
 await page.getByRole('button',{name:'Free clean',exact:true}).click();expect((await saved(page)).pet.needs.cleanliness).toBeGreaterThan(60);
 await page.screenshot({path:'docs/verification/full-house-phone.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('cancelled and reloaded journeys never lose the pet or leave the home locked',async({page})=>{
 await page.goto('/e2e/full-house-fixture.html');await doors(page).getByRole('button',{name:/Go upstairs/}).click();await page.getByRole('button',{name:'Stay in Cozy den',exact:true}).click();await expect(page.getByRole('dialog',{name:/Going to/})).toHaveCount(0);expect((await saved(page)).homeBase.activeRoom).toBe('den');
 await doors(page).getByRole('button',{name:/Go upstairs/}).click();await page.reload();await expect(page.locator('.hb-room-heading h2')).toHaveText('Cozy den');await expect(page.getByRole('dialog',{name:/Going to/})).toHaveCount(0);await travel(page,'Go upstairs','Upstairs nook');
});
test('reduced motion, keyboard travel and existing paid room ownership work',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/e2e/full-house-fixture.html');const before=await saved(page);
 await page.getByRole('button',{name:'Add Dream room for 35 tokens',exact:true}).click();await expect(page.locator('.hb-room-heading h2')).toHaveText('Dream room');expect((await saved(page)).player.currencies.tokens).toBe(before.player.currencies.tokens-35);
 const down=doors(page).getByRole('button',{name:/Go downstairs/});await down.focus();await page.keyboard.press('Enter');await expect(page.locator('.hb-room-heading h2')).toHaveText('Welcome hall');await page.getByRole('button',{name:'See my whole house',exact:true}).click();await page.getByRole('button',{name:'Visit Dream room',exact:true}).click();await expect(page.locator('.hb-room-heading h2')).toHaveText('Dream room');expect((await saved(page)).player.currencies.tokens).toBe(before.player.currencies.tokens-35);
});
