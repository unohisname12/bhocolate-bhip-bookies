import {test,expect,request,type Browser,type Page} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {SPECIES} from '../src/features/pet-hunt/model';
import type {RoomView} from '../src/features/pet-hunt/PetHunt';
const baseURL='http://127.0.0.1:8842';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/pet-hunt-test-teachers.json','utf8')) as {code:string}[];
async function actor(browser:Browser,credentials:Record<string,string>){
 const tab=randomUUID().replaceAll('-','');const context=await browser.newContext({baseURL,viewport:{width:1280,height:1000},extraHTTPHeaders:{'X-Pilot-Request':'1','X-Pilot-Tab':tab}});
 await context.addInitScript(scope=>sessionStorage.setItem('vpet-classroom-tab',scope),tab);
 const result=await context.request.post('/api/pilot/login',{data:credentials});expect(result.ok(),await result.text()).toBe(true);
 const page=await context.newPage();let state:RoomView|null=null;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const p=JSON.parse(String(e.payload));if(p.type==='state')state=p;}catch{ /* Ignore non-state frames. */ }}));
 return {context,page,get:()=>state,errors};
}
async function giveOwnedPet(host:Awaited<ReturnType<typeof actor>>,kid:Awaited<ReturnType<typeof actor>>,id:string,species='koala_sprite'){
 const save=await kid.context.request.get('/api/pilot/save').then(r=>r.json());const state=save.state;
 state.pet=hatchEgg({id:'earned-test-egg',type:species,state:'ready',progress:100,createdAt:new Date().toISOString()});state.pet.speciesId=species;state.player.activePetId=state.pet.id;state.egg=null;state.screen='pet_care';
 const r=await host.context.request.post(`/api/pilot/teacher/students/${id}/restore`,{data:{revision:save.revision,confirm:'RESTORE',backup:{studentId:id,saveVersion:CURRENT_SAVE_VERSION,state}}});expect(r.ok(),await r.text()).toBe(true);
}
async function ownedPreview(page:Page,species='koala_sprite'){
 await page.route('**/api/pilot/pet-hunt',route=>route.fulfill({json:{you:'preview',teacher:false,species,pet:{species,name:'Earned Companion',stage:'baby'},rooms:[]}}));
}
async function openClassroom(page:Page){await page.goto('/?petHunt=1');await page.getByRole('button',{name:/Open classroom rooms/}).click();await expect(page.getByRole('heading',{name:'Your classroom arena'})).toBeVisible();}
async function join(page:Page){await openClassroom(page);await page.getByRole('button',{name:'Join room',exact:true}).first().click();await expect(page.getByRole('button',{name:'Ready to play',exact:true})).toBeVisible();}

test('solo hunter and runner, movement, fire, pause, touch, and three-map rendering',async({page})=>{
 await ownedPreview(page);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?petHunt=1');await expect(page.getByRole('heading',{name:'Pet Hunt.'})).toBeVisible();
 await page.getByRole('button',{name:'How to play'}).click();await expect(page.getByRole('heading',{name:'Your first escape'})).toBeVisible();await page.getByRole('button',{name:'Close guide',exact:true}).click();
 await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('.hunt-role-label')).toBeVisible();await expect.poll(()=>page.getByTestId('hunt-clock').innerText()).not.toBe('6:00');const arena=page.getByRole('application').or(page.locator('canvas'));await arena.focus();await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');await page.keyboard.press('f');
 await page.getByRole('button',{name:'Open game menu'}).click();const paused=await page.getByTestId('hunt-clock').innerText();await page.waitForTimeout(1100);expect(await page.getByTestId('hunt-clock').innerText()).toBe(paused);await page.getByRole('button',{name:'Back to game',exact:true}).click();
 {await page.getByRole('button',{name:'Open game menu'}).click();await page.getByLabel('Touch controls').check();await page.getByRole('button',{name:'Back to game',exact:true}).click();}await page.setViewportSize({width:390,height:844});await expect(page.getByRole('group',{name:'Move touch pad'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 mkdirSync('docs/verification/pet-hunt',{recursive:true});await page.screenshot({path:'docs/verification/pet-hunt/phone.png',fullPage:true});
 await page.getByRole('button',{name:'Open game menu'}).click();await page.getByRole('button',{name:'Leave arena',exact:true}).click();await page.getByRole('dialog',{name:'Leave Pet Hunt'}).getByRole('button',{name:'Leave arena',exact:true}).click();
 await page.setViewportSize({width:1280,height:1000});await page.getByRole('button',{name:/Clockwork Workshop/}).click();await page.getByRole('button',{name:/Play as the hunter/}).click();await expect(page.locator('.hunt-role-label')).toBeVisible();await page.screenshot({path:'docs/verification/pet-hunt/workshop.png',fullPage:true});
 await page.goto('/?petHunt=1');await page.getByRole('button',{name:/Moonlit Greenhouse/}).click();await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('canvas')).toBeVisible();await page.waitForTimeout(600);await page.screenshot({path:'docs/verification/pet-hunt/greenhouse.png'});expect(errors).toEqual([]);
});

test('five real clients: teacher hunt, consent, movement, global pause, reconnect, end, and rotation',async({browser})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[0].code});const cardsResponse=await host.context.request.post('/api/pilot/teacher/students',{data:{count:5}});expect(cardsResponse.ok()).toBe(true);const cards=await cardsResponse.json() as {classCode:string;cards:{id:string;code:string}[]};
 const kids=[];for(const card of cards.cards){const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:card.code});await giveOwnedPet(host,kid,card.id);kids.push(kid);}
 const before=await kids[0].context.request.get('/api/pilot/save').then(r=>r.json());
 await openClassroom(host.page);await host.page.getByLabel('Room mode').selectOption('teacher');await host.page.getByRole('button',{name:'Create Beat the Teacher room'}).click();await expect(host.page.getByRole('heading',{name:'Beat the Teacher'})).toBeVisible();
 for(const kid of kids.slice(0,4))await join(kid.page);
 await host.page.getByRole('button',{name:'Start round',exact:true}).click();await expect(host.page.getByRole('alert')).toContainText('Every connected player must press Ready');
 for(const p of [host,...kids.slice(0,4)])await p.page.getByRole('button',{name:'Ready to play',exact:true}).click();
 await host.page.getByRole('button',{name:'Start round',exact:true}).click();for(const p of [host,...kids.slice(0,4)])await expect(p.page.locator('canvas')).toBeVisible();
 const moving=kids[0];await expect.poll(()=>moving.get()?.match.phase).toBe('playing');const initial=moving.get()!.match.players.find(p=>p.id===moving.get()!.match.you)!.x;
 await moving.page.locator('canvas').focus();await moving.page.keyboard.down('d');await moving.page.waitForTimeout(550);await moving.page.keyboard.up('d');await expect.poll(()=>moving.get()!.match.players.find(p=>p.id===moving.get()!.match.you)!.x).toBeGreaterThan(initial+25);
 await host.page.getByRole('button',{name:'Open game menu'}).click();await host.page.getByRole('button',{name:'Pause',exact:true}).click();await host.page.getByRole('button',{name:'Back to game',exact:true}).click();for(const kid of kids.slice(0,4))await expect(kid.page.getByRole('heading',{name:'Take a breath.'})).toBeVisible();const clock=moving.get()!.match.time;await moving.page.waitForTimeout(700);expect(moving.get()!.match.time).toBe(clock);
 await host.page.getByRole('button',{name:'Resume round'}).click();await expect.poll(()=>moving.get()!.match.time).toBeLessThan(clock);
 // The fifth student queues without seeing every hidden actor.
 await openClassroom(kids[4].page);await kids[4].page.getByRole('button',{name:'Join room',exact:true}).first().click();await expect(kids[4].page.getByText(/You are in the next-round queue/)).toBeVisible();expect(kids[4].get()!.match.players).toHaveLength(0);
 // Reload and rejoin must recover the same room and same actor seat.
 const oldId=moving.get()!.match.you;await moving.page.reload();await joinPlaying(moving.page);await expect.poll(()=>moving.get()?.match.you).toBe(oldId);await expect(moving.page.locator('canvas')).toBeVisible();
 mkdirSync('docs/verification/pet-hunt',{recursive:true});await host.page.screenshot({path:'docs/verification/pet-hunt/teacher.png',fullPage:true});await moving.page.screenshot({path:'docs/verification/pet-hunt/runner.png',fullPage:true});
 await host.page.getByRole('button',{name:'Open game menu'}).click();await host.page.getByRole('button',{name:'End round',exact:true}).click();await host.page.getByRole('button',{name:'Back to game',exact:true}).click();for(const kid of kids)await expect(kid.page.getByRole('heading',{name:'Round ended'})).toBeVisible();
 await host.page.getByRole('button',{name:'Rotate roles & rematch'}).click();await expect(kids[4].page.getByRole('button',{name:'Ready to play',exact:true})).toBeVisible();
 const after=await kids[0].context.request.get('/api/pilot/save').then(r=>r.json());expect(after.state).toEqual(before.state);expect(after.revision).toBe(before.revision);
 for(const p of [host,...kids])expect(p.errors).toEqual([]);await host.page.getByRole('button',{name:'Close room',exact:true}).click();for(const p of [host,...kids])await p.context.close();
});
async function joinPlaying(page:Page){await page.getByRole('button',{name:/Open classroom rooms/}).click();await page.getByRole('button',{name:'Join room',exact:true}).first().click();}

test('room API enforces class membership, teacher role and authenticated WebSocket origins',async({browser})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[1].code}),foreign=await actor(browser,{role:'teacher',code:teachers()[2].code});
 const config={map:'garden',difficulty:'gentle',duration:180,mode:'versus',kit:'scout'};
 const made=await host.context.request.post('/api/pilot/pet-hunt/create',{data:config});expect(made.ok()).toBe(true);const {id}=await made.json();
 const duplicate=await host.context.request.post('/api/pilot/pet-hunt/create',{data:config});expect((await duplicate.json()).id).toBe(id);
 const blocked=await foreign.context.request.get(`/api/pilot/pet-hunt/${id}/socket`,{headers:{Upgrade:'websocket',Origin:baseURL}});expect(blocked.status()).toBe(404);
 const wrongOrigin=await host.context.request.get(`/api/pilot/pet-hunt/${id}/socket`,{headers:{Upgrade:'websocket',Origin:'https://example.com'}});expect(wrongOrigin.status()).toBe(403);
 const invalid=await host.context.request.post('/api/pilot/pet-hunt/create',{data:{...config,duration:-1}});expect(invalid.status()).toBe(400);
 const anon=await request.newContext({baseURL});expect((await anon.get('/api/pilot/pet-hunt')).status()).toBe(401);await anon.dispose();await host.context.close();await foreign.context.close();
});

test('cooperative bot hunter and player hunter both start, end and rematch online',async({browser})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[2].code});
 const response=await host.context.request.post('/api/pilot/teacher/students',{data:{count:1}});expect(response.ok()).toBe(true);
 const cards=await response.json() as {classCode:string;cards:{id:string;code:string}[]};const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:cards.cards[0].code});await giveOwnedPet(host,kid,cards.cards[0].id,'luna_owl');
 for(const mode of ['coop','versus'] as const){
  await openClassroom(host.page);await host.page.getByLabel('Room mode').selectOption(mode);await host.page.getByRole('button',{name:'Create classroom room',exact:true}).click();await join(kid.page);
  for(const p of [host,kid])await p.page.getByRole('button',{name:'Ready to play',exact:true}).click();
  await host.page.getByRole('button',{name:'Start round',exact:true}).click();await expect.poll(()=>host.get()?.match.phase).toBe('playing');
  const hunter=host.get()!.match.players.find(p=>p.role==='hunter');
  if(mode==='coop'){
   // The hunter may be concealed from runners, but its seat must be computer-controlled.
   expect(host.get()!.seats.every(s=>s.role==='runner')).toBe(true);
   if(hunter)expect(hunter.bot).toBe(true);
  }else{expect(hunter?.id).toBe(host.get()!.match.you);expect(hunter?.bot).toBe(false);}
  await host.page.getByRole('button',{name:'Open game menu'}).click();await host.page.getByRole('button',{name:'End round',exact:true}).click();await host.page.getByRole('button',{name:'Back to game',exact:true}).click();await expect(kid.page.getByRole('heading',{name:'Round ended'})).toBeVisible();
  await host.page.getByRole('button',{name:'Rotate roles & rematch'}).click();await expect(kid.page.getByRole('button',{name:'Ready to play',exact:true})).toBeVisible();
  if(mode==='versus')expect(kid.get()!.seats.find(s=>s.id===kid.get()!.match.you)?.role).toBe('hunter');
  await host.page.getByRole('button',{name:'Close room',exact:true}).click();await expect.poll(async()=>{const r=await host.context.request.get('/api/pilot/pet-hunt');return (await r.json()).rooms.length;}).toBe(0);
 }
 expect(host.errors).toEqual([]);expect(kid.errors).toEqual([]);await host.context.close();await kid.context.close();
});

test('earned pet is automatic and the arena fills desktop, phone and landscape screens',async({page})=>{
 const missing:string[]=[],evolved:string[]=[];page.on('response',r=>{if(/\/assets\/(pet-hunt-v[234]|companions-v2)\//.test(r.url())&&r.status()>=400)missing.push(r.url());if(/companions-v2\/.*-(juvenile|adult)/.test(r.url()))evolved.push(r.url());});
 let species:string='koala_sprite';await page.route('**/api/pilot/pet-hunt',route=>route.fulfill({json:{you:'preview',teacher:false,species,pet:{species,name:'Earned Companion',stage:'baby'},rooms:[]}}));
 for(const id of SPECIES){species=id;await page.goto('/?petHunt=1');await expect(page.getByLabel('Arena companion')).toHaveCount(0);await expect(page.getByTestId('hunt-owned-pet')).toContainText('Earned Companion');await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('canvas')).toBeVisible();}
 for(const [name,width,height]of [['desktop',1440,900],['phone',390,844],['landscape',844,390]] as const){
  await page.setViewportSize({width,height});await page.goto('/?petHunt=1');await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('canvas')).toBeVisible();
  if(name==='landscape'){await page.getByRole('button',{name:'Open game menu'}).click();await page.getByLabel('Touch controls').check();await page.getByRole('button',{name:'Back to game',exact:true}).click();}
  await expect.poll(async()=>{const r=await page.locator('canvas').boundingBox();return r&&Math.round(r.width*r.height);}).toBe(width*height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.getByRole('button',{name:'Open game menu'}).click();await page.getByRole('button',{name:'Back to game',exact:true}).click();
  mkdirSync('docs/verification/pet-hunt-fullscreen',{recursive:true});await page.screenshot({path:`docs/verification/pet-hunt-fullscreen/${name}.png`});
 }
 expect(missing).toEqual([]);expect(evolved).toEqual([]);
});

test('failed artwork can be retried without opening a blank arena',async({page})=>{
 await ownedPreview(page);
 await page.route('**/assets/pet-hunt-v2/pets.png',route=>route.abort());await page.goto('/?petHunt=1');
 await expect(page.getByRole('heading',{name:'The garden needs another moment.'})).toBeVisible();await expect(page.getByRole('button',{name:/Play as a runner/})).toHaveCount(0);
 await page.unroute('**/assets/pet-hunt-v2/pets.png');await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('heading',{name:'Pet Hunt.'})).toBeVisible();
 await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('canvas')).toBeVisible();
});

test('a player must own a pet and cannot select an unearned species in room requests',async({browser})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[0].code});const cards=await host.context.request.post('/api/pilot/teacher/students',{data:{count:1}}).then(r=>r.json());const card=cards.cards[0];const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:card.code});
 const config={map:'garden',mode:'versus',difficulty:'normal',duration:180,kit:'scout',species:'zephyr_dragon'};
 const empty=await kid.context.request.get('/api/pilot/pet-hunt').then(r=>r.json());expect(empty.pet).toBeNull();expect((await kid.context.request.post('/api/pilot/pet-hunt/create',{data:config})).status()).toBe(409);
 await kid.page.goto('/?petHunt=1');await expect(kid.page.getByRole('button',{name:/Play as a runner/})).toHaveCount(0);await expect(kid.page.getByRole('status')).toContainText('Hatch your earned pet');await expect(kid.page.getByRole('link',{name:'Go to my pet'})).toHaveAttribute('href','/');
 await giveOwnedPet(host,kid,card.id,'moss_turtle');const owned=await kid.context.request.get('/api/pilot/pet-hunt').then(r=>r.json());expect(owned.pet.species).toBe('moss_turtle');await kid.page.reload();await expect(kid.page.getByTestId('hunt-owned-pet')).toContainText(owned.pet.name);
 const made=await kid.context.request.post('/api/pilot/pet-hunt/create',{data:config});expect(made.ok()).toBe(true);await openClassroom(kid.page);await kid.page.getByRole('button',{name:'Join room',exact:true}).click();await expect.poll(()=>kid.get()?.match.players.find(p=>p.id===kid.get()?.match.you)?.species).toBe('moss_turtle');
 await kid.page.getByRole('button',{name:'Close room',exact:true}).click();await host.context.close();await kid.context.close();
});

test('browser fullscreen keeps HUD, action buttons and exit controls inside the game',async({page})=>{
 await ownedPreview(page);await page.goto('/?petHunt=1');await page.getByRole('button',{name:/Play as a runner/}).click();
 await page.getByRole('button',{name:'Open game menu'}).click();await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.getByRole('button',{name:'Back to game',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.tagName)).toBe('MAIN');
 await expect(page.getByTestId('hunt-clock')).toBeVisible();await expect(page.getByRole('button',{name:'Fire blaster',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open game menu'})).toBeVisible();
 await page.getByRole('button',{name:'Open game menu'}).click();await expect(page.getByRole('button',{name:'Back to game',exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to game',exact:true}).click();
 await page.getByRole('button',{name:'Open game menu'}).click();await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.getByRole('button',{name:'Back to game',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
 const r=await page.locator('canvas').boundingBox();const size=page.viewportSize()!;expect(Math.round(r!.width*r!.height)).toBe(size.width*size.height);
});

test('a class rival takes the computer hunter seat, taunts at the end, and remembers the student’s pet afterward',async({browser})=>{
 test.setTimeout(330000);
 const host=await actor(browser,{role:'teacher',code:teachers()[2].code});
 const response=await host.context.request.post('/api/pilot/teacher/students',{data:{count:1}});expect(response.ok()).toBe(true);
 const cards=await response.json() as {classCode:string;cards:{id:string;code:string}[]};const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:cards.cards[0].code});await giveOwnedPet(host,kid,cards.cards[0].id,'luna_owl');
 const before=await (await host.context.request.get('/api/pilot/rivals')).json() as {rivals:{title:string;wins:number;losses:number;students:{petName:string}[]}[]};
 const next=[...before.rivals].sort((a,b)=>a.wins+a.losses-(b.wins+b.losses))[0];
 await openClassroom(host.page);await host.page.getByLabel('Room mode').selectOption('coop');await host.page.getByLabel('Round length').selectOption('180');await host.page.getByRole('button',{name:'Create classroom room',exact:true}).click();await join(kid.page);
 await kid.page.getByRole('button',{name:'Ready to play',exact:true}).click();await host.page.getByRole('button',{name:'Ready to play',exact:true}).click();
 await host.page.getByRole('button',{name:'Start round',exact:true}).click();await expect.poll(()=>host.get()?.match.phase).toBe('playing');
 // The round plays out on the server's clock; nobody escapes, so the rival wins when time runs out.
 await expect.poll(()=>kid.get()?.match.phase,{timeout:220000,intervals:[2000]}).toBe('finished');
 expect(kid.get()!.match.message).toContain(next.title);
 const view=kid.get() as unknown as {match:Record<string,unknown>};expect(view.match.rival).toBeUndefined();expect(view.match.rivalLog).toBeUndefined();
 await expect.poll(async()=>{const r=await (await host.context.request.get('/api/pilot/rivals')).json() as typeof before;return r.rivals.find(x=>x.title===next.title||x.title.endsWith(next.title));},{timeout:15000}).toMatchObject({students:expect.arrayContaining([expect.objectContaining({encounters:1})])});
 const mine=await (await kid.context.request.get('/api/pilot/rivals')).json() as {rivals:{you:{encounters:number}}[]};expect(mine.rivals.some(r=>r.you.encounters===1)).toBe(true);
 expect(host.errors).toEqual([]);expect(kid.errors).toEqual([]);await host.context.close();await kid.context.close();
});


test('direct entry signs in and returns to a playable teacher arena',async({page})=>{
 await page.goto('/?petHunt=1');
 await expect(page.getByRole('link',{name:'Sign in & play',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check again'})).toHaveCount(0);
 await page.getByRole('link',{name:'Sign in & play',exact:true}).click();
 await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();
 await page.getByLabel('Private teacher key',{exact:true}).fill(teachers()[0].code);
 await page.getByRole('button',{name:'Sign in & play Pet Hunt',exact:true}).click();
 await expect(page).toHaveURL(/\?petHunt=1$/);
 await expect(page.getByTestId('hunt-owned-pet')).toContainText('Bramble Sentinel');
 await page.getByRole('button',{name:/Play as a runner/}).click();
 await expect(page.locator('canvas')).toBeVisible();
});

test('connection failures offer a working retry rather than a sign-in dead end',async({page})=>{
 await page.route('**/api/pilot/pet-hunt',r=>r.fulfill({status:503,json:{error:'Unavailable'}}));
 await page.goto('/?petHunt=1');
 await expect(page.getByRole('heading',{name:'Let’s reconnect.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Sign in & play',exact:true})).toHaveCount(0);
 await ownedPreview(page,'moss_turtle');
 await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByRole('button',{name:/Play as a runner/})).toBeEnabled();
});


test('student entry returns with their earned pet after form sign-in',async({browser,page})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[1].code});
 const response=await host.context.request.post('/api/pilot/teacher/students',{data:{count:1}});
 const cards=await response.json() as {classCode:string;cards:{id:string;code:string}[]};const card=cards.cards[0];
 const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:card.code});
 await giveOwnedPet(host,kid,card.id,'luna_owl');
 const owned=await kid.context.request.get('/api/pilot/pet-hunt').then(r=>r.json());
 await page.goto('/?petHunt=1');
 mkdirSync('docs/verification/pet-hunt-entry',{recursive:true});
 await expect(page.getByRole('link',{name:'Sign in & play',exact:true})).toBeVisible();
 await page.screenshot({path:'docs/verification/pet-hunt-entry/sign-in-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'docs/verification/pet-hunt-entry/sign-in-phone.png',fullPage:true});
 await page.getByRole('link',{name:'Sign in & play',exact:true}).click();
 await page.getByLabel('Class code',{exact:true}).fill(cards.classCode);
 await page.getByLabel('My secret pet code',{exact:true}).fill(card.code);
 await page.getByRole('button',{name:'Sign in & play Pet Hunt',exact:true}).click();
 await expect(page.getByTestId('hunt-owned-pet')).toContainText(owned.pet.name);
 await page.getByRole('button',{name:/Play as a runner/}).click();
 await expect(page.locator('canvas')).toBeVisible();
 await host.context.close();await kid.context.close();
});

test('both guide videos play and in-match guide pauses solo play',async({page})=>{
 await ownedPreview(page);await page.goto('/?petHunt=1');await page.getByRole('button',{name:'How to play',exact:true}).click();
 const guide=page.getByRole('dialog',{name:'How to win'});await expect(guide).toBeVisible();
 await expect(guide).toContainText('Get 3 of the 4 runners');
 for(const side of ['Runner','Hunter']){
  await guide.getByRole('button',{name:`${side} guide`,exact:true}).click();const video=guide.getByLabel(`${side} walkthrough`);
  await video.evaluate(async(el:HTMLVideoElement)=>{await el.play();});
  await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.currentTime)).toBeGreaterThan(.3);
  expect(await video.evaluate((el:HTMLVideoElement)=>el.videoWidth)).toBe(1280);
  expect(await video.evaluate((el:HTMLVideoElement)=>el.duration)).toBeGreaterThan(30);
  await video.evaluate((el:HTMLVideoElement)=>el.pause());
 }
 await page.setViewportSize({width:390,height:844});expect(await guide.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await guide.getByRole('button',{name:'Close guide'}).click();await page.getByRole('button',{name:/Play as the hunter/}).click();
 await expect(page.getByTestId('hunt-next-objective')).toContainText('head start');
 await page.getByRole('button',{name:'Open game menu'}).click();await page.getByRole('button',{name:'Guide',exact:true}).click();const clock=await page.getByTestId('hunt-clock').innerText();
 await page.waitForTimeout(650);expect(await page.getByTestId('hunt-clock').innerText()).toBe(clock);
 await expect(page.getByRole('dialog',{name:'How to win'})).toContainText('HUNTER WIN');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Back to game',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect.poll(()=>page.getByTestId('hunt-clock').innerText()).not.toBe(clock);
 await expect(page.getByTestId('hunt-next-objective')).not.toContainText('head start',{timeout:10000});
 // Three shots need 1.6 s of game time; hold longer so one slow frame can't leave a shot unfired.
 await page.getByRole('button',{name:'Fire',exact:true}).click({delay:2600});
 await expect(page.getByRole('button',{name:'Fire',exact:true})).toContainText('Cooling');
 mkdirSync('docs/verification/pet-hunt-balance',{recursive:true});await page.screenshot({path:'docs/verification/pet-hunt-balance/phone-cooling.png'});
});


test('non-host start is denied and a statusless disconnect hands the pet to a bot',async({browser})=>{
 const host=await actor(browser,{role:'teacher',code:teachers()[0].code});
 const cards=await host.context.request.post('/api/pilot/teacher/students',{data:{count:1}}).then(r=>r.json());
 const kid=await actor(browser,{role:'student',classCode:cards.classCode,code:cards.cards[0].code});await giveOwnedPet(host,kid,cards.cards[0].id);
 await openClassroom(host.page);await host.page.getByLabel('Room mode').selectOption('coop');await host.page.getByRole('button',{name:'Create classroom room',exact:true}).click();
 const directory=await host.context.request.get('/api/pilot/pet-hunt').then(r=>r.json());await kid.page.goto('/?petHunt=1');
 const denied=await kid.page.evaluate(async id=>await new Promise<string>((resolve,reject)=>{
  const url=new URL(`/api/pilot/pet-hunt/${id}/socket`,location.origin);url.protocol='ws:';url.searchParams.set('tab',sessionStorage.getItem('vpet-classroom-tab')!);
  const ws=new WebSocket(url);(window as unknown as {huntTestSocket:WebSocket}).huntTestSocket=ws;
  const timer=setTimeout(()=>reject(new Error('No start rejection')),5000);
  ws.onopen=()=>ws.send(JSON.stringify({type:'command',action:'start'}));
  ws.onmessage=e=>{const data=JSON.parse(String(e.data));if(data.type==='error'){clearTimeout(timer);ws.send(JSON.stringify({type:'command',action:'ready'}));resolve(data.message);}};
 }),directory.rooms[0].id);
 expect(denied).toContain('host starts');expect(host.get()?.match.phase).toBe('lobby');
 await host.page.getByRole('button',{name:'Ready to play',exact:true}).click();await host.page.getByRole('button',{name:'Start round',exact:true}).click();await expect.poll(()=>host.get()?.match.phase).toBe('playing');
 await kid.page.evaluate(()=>(window as unknown as {huntTestSocket:WebSocket}).huntTestSocket.close());
 await expect.poll(()=>host.get()?.match.players.find(p=>p.id===cards.cards[0].id)?.bot).toBe(true);
 await expect.poll(()=>host.get()?.seats.find(p=>p.id===cards.cards[0].id)?.connected).toBe(false);
 await host.page.getByRole('button',{name:'Open game menu'}).click();await host.page.getByRole('button',{name:'End round',exact:true}).click();await host.page.getByRole('button',{name:'Back to game',exact:true}).click();await host.page.getByRole('button',{name:'Close room',exact:true}).click();
 expect(host.errors).toEqual([]);expect(kid.errors).toEqual([]);await host.context.close();await kid.context.close();
});

test('charging a beacon: one tap, then spark checks pop up and can be answered by tap or number key',async({page})=>{
 await ownedPreview(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?petHunt=1&huntStart=beacon');await page.getByRole('button',{name:/Play as a runner/}).click();await expect(page.locator('.hunt-role-label')).toBeVisible();
 await expect(page.getByRole('button',{name:'Charge beacon'})).toBeVisible();
 await page.keyboard.down('e');await page.waitForTimeout(80);await page.keyboard.up('e');
 await expect(page.getByRole('button',{name:'Charging…'})).toBeVisible();
 const spark=page.getByRole('dialog',{name:'Spark check'});await expect(spark).toBeVisible({timeout:9000});
 await expect(spark.getByRole('button')).toHaveCount(3);await page.waitForTimeout(300);
 mkdirSync('docs/verification/pet-hunt',{recursive:true});await page.screenshot({path:'docs/verification/pet-hunt/spark-check.png'});
 await spark.getByRole('button').first().click();await expect(spark).toBeHidden();await expect(page.getByRole('status').filter({hasText:/SPARK!|Fizzle/})).toBeVisible();
 await expect(spark).toBeVisible({timeout:9000});await page.keyboard.press('2');await expect(spark).toBeHidden();
 expect(errors).toEqual([]);
});
