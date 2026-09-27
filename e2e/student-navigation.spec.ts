import { showEveryGame } from './fullDashboard';
import {test,expect,request,type APIRequestContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {signInLink} from '../src/pilot/signInLinks';
import {DEFAULT_RULES} from '../src/features/delivery/model';
import {createScreenPreview} from '../src/devtools/screenCatalog';
import {engineReducer} from '../src/engine/state/engineReducer';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import type {EngineState} from '../src/types/engine';
const base='http://127.0.0.1:8798';
async function setup(page:Page,modify?:(s:EngineState)=>EngineState){
 const teachers=JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
 const t=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}}),s=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 expect((await t.post('/api/pilot/login',{data:{role:'teacher',code:teachers[0].code}})).status()).toBe(200);
 // These journeys isolate navigation; required-check behavior has its own suite.
 expect((await t.post('/api/pilot/quick-checks/policy',{data:{cadence:'teacher'}})).status()).toBe(200);
 expect((await t.post('/api/pilot/play-time/policy',{data:{enabled:false}})).status()).toBe(200);
 const result=await(await t.post('/api/pilot/teacher/students',{data:{count:1}})).json(),card=result.cards[0];
 await showEveryGame(t,card.id);
 expect((await s.post('/api/pilot/login',{data:{role:'student',code:card.code,classCode:result.classCode}})).status()).toBe(200);
 const save=await(await s.get('/api/pilot/save')).json();let state=save.state as EngineState;state.eggDiscovery!.stamps=[2,1].map(n=>({day:new Date(Date.now()-n*86400000).toISOString().slice(0,10),style:'help',source:'classroom'}));if(modify)state=modify(state);
 const restored=await t.post(`/api/pilot/teacher/students/${card.id}/restore`,{data:{revision:save.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:CURRENT_SAVE_VERSION,state}}});expect(restored.status(),await restored.text()).toBe(200);
 const link=signInLink(base,{role:'student',code:card.code,classCode:result.classCode});await page.goto(link);await expect(page.getByRole('navigation',{name:'Student menus'})).toBeVisible();await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();return {s,t,link};
}
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name,exact:true});
async function saved(s:APIRequestContext){return (await(await s.get('/api/pilot/save')).json()).state as EngineState;}
test('private login always opens Home; daily task fits Chromebook and resumes across login',async({page})=>{
 const {s,t,link}=await setup(page,state=>({...state,screen:'math'}));try{
 await page.setViewportSize({width:1024,height:600});const start=page.getByRole('button',{name:'Start today’s questions →',exact:true});await expect(start).toBeVisible();const box=(await start.boundingBox())!;expect(box.y+box.height).toBeLessThan(600);await page.screenshot({path:'docs/verification/student-home-chromebook.png'});
 await start.click();const mission=page.getByRole('region',{name:'Daily discovery mission'});await expect(mission).toBeVisible();await expect.poll(async()=>(await saved(s)).eggDiscovery?.mission?.index).toBe(0);const problem=(await saved(s)).eggDiscovery!.mission!.problems[0];await page.getByLabel('Discovery answer',{exact:true}).fill(String(problem.answer));await page.getByRole('button',{name:'Add an adventure piece'}).click();await expect.poll(async()=>(await saved(s)).eggDiscovery?.mission?.index).toBe(1);
 await nav(page,'Home').click();await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();await page.goto(link);await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();await page.getByRole('button',{name:'Continue today’s questions →',exact:true}).click();await expect(mission).toContainText('Question 2 of 3');
 }finally{await s.dispose();await t.dispose();}
});
test('unfinished Momentum can resume or explicitly end before egg questions',async({page})=>{
 const {s,t}=await setup(page,state=>engineReducer(state,{type:'START_MOMENTUM'}));try{
 expect((await saved(s)).momentum.active).toBe(true);await page.getByRole('button',{name:'Start today’s questions →',exact:true}).click();const modal=page.getByRole('dialog');await expect(modal).toContainText('Momentum is still open');await modal.getByRole('button',{name:'Keep playing'}).click();expect((await saved(s)).momentum.active).toBe(true);
 await page.getByRole('button',{name:'Start today’s questions →',exact:true}).click();await modal.getByRole('button',{name:'End this activity and switch'}).click();await expect(page.getByRole('region',{name:'Daily discovery mission'})).toBeVisible();await expect.poll(async()=>(await saved(s)).momentum.active).toBe(false);await expect(nav(page,'Games')).toBeEnabled();
 }finally{await s.dispose();await t.dispose();}
});
test('catalog launches one arcade game; saved round survives Home; switching games is explicit',async({page})=>{
 const {s,t}=await setup(page);try{
 await nav(page,'Games').click();await page.getByLabel('Find a game').fill('Nest Café');await page.locator('article').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect(page.getByRole('heading',{name:'Nest Café',exact:true}).first()).toBeVisible();await expect(page.getByRole('heading',{name:'Shellguard',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Plan & play →',exact:true}).click();await expect.poll(async()=>(await saved(s)).arcade?.run?.game).toBe('cafe');expect((await saved(s)).arcade?.run?.learningMode).toBe(true);
 await nav(page,'Home').click();expect((await saved(s)).arcade?.run?.game).toBe('cafe');await nav(page,'Games').click();await page.getByLabel('Find a game').fill('Egg Dash');await page.locator('article').filter({has:page.getByRole('heading',{name:'Egg Dash',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Another arcade round is saved');await page.getByRole('button',{name:'End this activity and switch'}).click();await expect(page.getByRole('heading',{name:'Egg Dash',exact:true}).first()).toBeVisible();
 await nav(page,'Games').click();await page.getByLabel('Find a game').fill('');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/verification/student-games-phone.png',fullPage:true});
 }finally{await s.dispose();await t.dispose();}
});
test('math question survives leaving, a new login, and coming back without duplicating credit',async({page})=>{
 const {s,t,link}=await setup(page);try{
 await nav(page,'Games').click();await page.locator('article').filter({has:page.getByRole('heading',{name:'Math Practice',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect.poll(async()=>!!(await saved(s)).practiceCheckpoint).toBe(true);const before=(await saved(s)).practiceCheckpoint!;await nav(page,'Home').click();await page.goto(link);await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();await page.getByRole('button',{name:/Continue Math Practice/}).click();await expect(page.getByRole('heading').filter({hasText:before.problem.question})).toBeVisible();expect((await saved(s)).practiceCheckpoint?.problem.id).toBe(before.problem.id);
 }finally{await s.dispose();await t.dispose();}
});
test('Together opens from an unfinished board using the same switch flow',async({page})=>{
 const {s,t}=await setup(page,state=>engineReducer(state,{type:'START_MOMENTUM'}));try{
 await nav(page,'Together').click();await page.getByRole('button',{name:'Open invitations & games →',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Momentum is still open');await page.getByRole('button',{name:'End this activity and switch'}).click();await expect(page.getByRole('dialog',{name:'Play with classmates'})).toBeVisible();await page.getByRole('button',{name:'Close',exact:true}).click();await nav(page,'Home').click();await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();
 }finally{await s.dispose();await t.dispose();}
});

for(const screen of ['battle','run_map'] as const)test(`${screen} resumes from Home and ends cleanly before practice`,async({page})=>{
 const {s,t}=await setup(page,state=>{const preview=createScreenPreview(screen,state.learning);return {...state,pet:preview.pet,battle:preview.battle,run:preview.run,screen};});try{
 const label=screen==='battle'?'Pet battle':'Dungeon adventure';
 await page.getByRole('button',{name:`Continue ${label}`,exact:false}).click();await expect(page.locator('.student-shell')).toHaveAttribute('data-view','activity');await expect.poll(async()=>(await saved(s)).screen).toBe(screen);
 await nav(page,'Home').click();await nav(page,'Games').click();await page.locator('article').filter({has:page.getByRole('heading',{name:'Math Practice',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(`${label} is still open`);await page.getByRole('button',{name:'End this activity and switch'}).click();await expect.poll(async()=>{const v=await saved(s);return !v.run.active&&!v.battle.active&&v.screen==='math';}).toBe(true);await expect(page.locator('.student-shell')).toHaveAttribute('data-view','activity');
 }finally{await s.dispose();await t.dispose();}
});
test('Number Merge warns before losing its board; browser Back returns through the shell',async({page})=>{
 const {s,t}=await setup(page);try{
 await nav(page,'Games').click();await page.locator('article').filter({has:page.getByRole('heading',{name:'Number Merge',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect(page.getByRole('heading',{name:'Number Merge: Overseer Breach'})).toBeVisible();await nav(page,'Home').click();await expect(page.getByRole('dialog')).toContainText('Leaving restarts this Number Merge board');await page.getByRole('button',{name:'Keep playing'}).click();await expect(page.getByRole('heading',{name:'Number Merge: Overseer Breach'})).toBeVisible();
 await nav(page,'Games').click();await page.getByRole('button',{name:'Leave and switch'}).click();await nav(page,'Rewards').click();await expect(page.getByRole('heading',{name:'Make it yours.'})).toBeVisible();await page.goBack();await expect(page.getByRole('heading',{name:'What will you play?'})).toBeVisible();
 }finally{await s.dispose();await t.dispose();}
});

test('Delivery returns to the same city and unfinished route after the egg task',async({page})=>{
 const {s,t}=await setup(page);try{
 const create=await s.post('/api/pilot/delivery/create',{data:{rules:{...DEFAULT_RULES,minutes:0},requestId:crypto.randomUUID()}});expect(create.status(),await create.text()).toBe(200);const {id}=await create.json();const start=await s.post('/api/pilot/delivery/start',{data:{roomId:id,requestId:crypto.randomUUID()}});expect(start.status(),await start.text()).toBe(200);
 await nav(page,'Games').click();await page.locator('article').filter({has:page.getByRole('heading',{name:'Delivery Districts',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await page.getByRole('button',{name:'Open city',exact:true}).click();await page.getByRole('combobox',{name:'Delivery destination'}).selectOption('2');
 await page.getByRole('button',{name:'Open my egg’s next step'}).click();await expect(page.getByRole('region',{name:'Daily discovery mission'})).toBeVisible();await nav(page,'Games').click();await page.locator('article').filter({has:page.getByRole('heading',{name:'Delivery Districts',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();await expect(page.getByRole('combobox',{name:'Delivery destination'})).toHaveValue('2');
 }finally{await s.dispose();await t.dispose();}
});
test('care exit cancels unfinished work and keeps earned possessions',async({page})=>{
 const {s,t}=await setup(page,state=>{const p=createScreenPreview('pet_care',state.learning);return {...state,pet:p.pet,screen:'pet_care',interaction:{...state.interaction,careGameActive:false,unlockedTools:['pet','play']}};});try{
 await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');const before=await saved(s);await page.getByRole('button',{name:/Continue Pet care/}).click();await expect(page.locator('.student-shell')).toHaveAttribute('data-view','activity');await page.getByRole('button',{name:'Start Play',exact:true}).click();await page.getByRole('button',{name:'Let’s begin'}).click();await nav(page,'Games').evaluate(el=>el.click());await expect(page.locator('dialog.student-switch')).toContainText('Leaving cancels any unfinished care activity');await page.getByRole('button',{name:'Leave and switch'}).click();await expect(page.getByRole('heading',{name:'What will you play?'})).toBeVisible();await expect.poll(async()=>(await saved(s)).interaction.careGameActive).toBe(false);expect((await saved(s)).player.currencies).toEqual(before.player.currencies);
 }finally{await s.dispose();await t.dispose();}
});
async function motionSamples(page:Page,selector:string,property:'transform'|'backgroundPosition'){
 return page.locator(selector).evaluate(async(el,prop)=>{const frames:string[]=[];for(let i=0;i<8;i++){frames.push(getComputedStyle(el)[prop]);await new Promise(r=>setTimeout(r,120));}return new Set(frames).size;},property);
}
test('Home egg visibly moves immediately, responds to keyboard hello, and respects pause and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});const {s,t}=await setup(page);try{
 await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');const before=await saved(s);await expect(page.getByRole('region',{name:'Today’s egg goal'})).toBeVisible();await expect(page.getByLabel('2 of 5 egg days earned')).toBeVisible();expect(await motionSamples(page,'.student-companion-egg','transform')).toBeGreaterThan(1);
 await page.getByRole('button',{name:'Say hello to your egg'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('status').filter({hasText:'Wiggle, wiggle!'})).toBeVisible();expect((await saved(s)).eggDiscovery).toEqual(before.eggDiscovery);expect((await saved(s)).player.currencies).toEqual(before.player.currencies);
 await page.getByRole('button',{name:'Pause home animation'}).click();expect(await motionSamples(page,'.student-companion-egg','transform')).toBe(1);await page.getByRole('button',{name:'Play home animation'}).click();expect(await motionSamples(page,'.student-companion-egg','transform')).toBeGreaterThan(1);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByText('Reduced motion on',{exact:true})).toBeVisible();expect(await motionSamples(page,'.student-companion-egg','transform')).toBe(1);await page.getByRole('button',{name:'Say hello to your egg'}).click();await expect(page.getByRole('status').filter({hasText:'Wiggle, wiggle!'})).toBeVisible();
 }finally{await s.dispose();await t.dispose();}
});
test('Home pet frames animate, hello is cosmetic, and shortcuts open the correct destinations',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});const {s,t}=await setup(page,state=>{const preview=createScreenPreview('home',state.learning);return {...state,pet:{...preview.pet!,name:'Pip'},egg:null,eggDiscovery:null,screen:'home'};});try{
 await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');const before=await saved(s);const sprite='.student-companion-pet .pet-body-motion [style*="background-position"]';expect(await motionSamples(page,sprite,'backgroundPosition')).toBeGreaterThan(1);await page.getByRole('button',{name:'Say hello to Pip'}).click();await expect(page.getByRole('status').filter({hasText:'Pip says hello!'})).toBeVisible();expect((await saved(s)).pet?.bond).toBe(before.pet?.bond);
 await page.getByRole('button',{name:'Pause home animation'}).click();expect(await motionSamples(page,sprite,'backgroundPosition')).toBe(1);
 await page.getByRole('button',{name:/Choose an adventure 12 games/}).click();await expect(page.getByRole('heading',{name:'What will you play?'})).toBeVisible();await nav(page,'Home').click();await page.getByRole('button',{name:/Meet your classmates Invitations/}).click();await expect(page.getByRole('heading',{name:'Better with your class.'})).toBeVisible();
 }finally{await s.dispose();await t.dispose();}
});

test('finished feeding and idle pet care leave without a cancellation warning',async({page})=>{
 const {s,t}=await setup(page,state=>{const preview=createScreenPreview('pet_care',state.learning);return {...state,pet:preview.pet,screen:'home',player:{...state.player,currencies:{...state.player.currencies,tokens:500},lastLoginDate:new Date().toISOString().slice(0,10)}};});try{
 await nav(page,'My Pet').click();await page.getByRole('button',{name:'Feed my pet Open →',exact:true}).click();await page.getByRole('button',{name:'Feed Apple for 5 tokens'}).click();await expect(page.getByRole('button',{name:'Choose another snack'})).toBeEnabled({timeout:10000});await page.getByRole('button',{name:'Done — back to my pet'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await nav(page,'My Pet').click();await page.getByRole('button',{name:'Pet care Open →',exact:true}).click();await nav(page,'Games').click();await expect(page.getByRole('heading',{name:'What will you play?'})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);expect((await saved(s)).events.some(e=>e.type==='pet_fed')).toBe(true);
 }finally{await s.dispose();await t.dispose();}
});
