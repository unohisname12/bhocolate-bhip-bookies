import {test,expect,request,type APIRequestContext} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {signInLink} from '../src/pilot/signInLinks';
import {createLife,recordEpisode} from '../src/features/pet-mind/life';
import {createMind} from '../src/features/pet-mind/memory';
const baseURL='http://127.0.0.1:8831';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
async function context(){return request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});}
async function ok(r:Awaited<ReturnType<APIRequestContext['get']>>){expect(r.ok(),r.ok()?undefined:await r.text()).toBe(true);return r.json();}
async function get(c:APIRequestContext,path='pet-duels'){return ok(await c.get(`/api/pilot/${path}`));}
async function post(c:APIRequestContext,path:string,data:unknown){return ok(await c.post(`/api/pilot/${path}`,{data}));}
async function setup(count=3){
 const host=await context();await post(host,'login',{role:'teacher',code:teachers()[0].code});await post(host,'quick-checks/policy',{cadence:'teacher'});await post(host,'play-time/policy',{enabled:false});
 const cards=await post(host,'teacher/students',{count});const roster=await get(host,'teacher/classroom');const kids=[];
 for(const card of cards.cards){const s=roster.students.find((s:{id:string})=>s.id===card.id);await post(host,`teacher/students/${card.id}/grade-recovery`,{grade:0,topic:'Addition within 10',settingsVersion:s.settingsVersion});const api=await context();await post(api,'login',{role:'student',code:card.code,classCode:cards.classCode});const save=await get(api,'save');const state=save.state;state.pet=hatchEgg({id:'egg',type:'ember_fox',state:'ready',progress:100,createdAt:new Date().toISOString()});state.player.activePetId=state.pet.id;state.egg=null;state.player.lifetimeMathCorrect=9;state.screen='pet_care';await post(host,`teacher/students/${card.id}/restore`,{revision:save.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:CURRENT_SAVE_VERSION,state}});kids.push({api,id:card.id,link:signInLink(baseURL,{role:'student',code:card.code,classCode:cards.classCode})});}
 return {host,kids};
}
const sum=(s:string)=>String(s.split('+').reduce((n,v)=>n+Number(v.trim()),0));
test('student consent, earned entries, concurrency, privacy and supervised five-round duels',async()=>{
 const {host,kids:[a,b,c]}=await setup();const before=(await get(a.api,'save')).state;
 expect((await host.post('/api/pilot/pet-duels/create',{data:{second:b.id}})).status()).toBe(403);
 expect((await a.api.post('/api/pilot/pet-duels/create',{data:{second:a.id}})).status()).toBe(400);
 const race=await Promise.all([a.api.post('/api/pilot/pet-duels/create',{data:{second:b.id}}),c.api.post('/api/pilot/pet-duels/create',{data:{second:b.id}})]);expect(race.map(r=>r.status()).sort()).toEqual([200,409]);
 let rooms=(await get(host)).rooms;expect(rooms).toHaveLength(1);let id=rooms[0].id;
 expect((await get(b.api)).entries).toBe(3);await post(b.api,'pet-duels/act',{id,action:'end'});expect((await get(b.api)).entries).toBe(3);
 await post(a.api,'pet-duels/create',{second:b.id});id=(await get(a.api)).rooms[0].id;
 expect((await c.api.post('/api/pilot/pet-duels/act',{data:{id,action:'end'}})).status()).toBe(403);
 const foreign=await context();await post(foreign,'login',{role:'teacher',code:teachers()[1].code});expect((await foreign.post('/api/pilot/pet-duels/act',{data:{id,action:'end'}})).status()).toBe(404);
 await post(b.api,'pet-duels/act',{id,action:'ready',round:0,phase:'lobby'});
 expect((await get(a.api)).entries).toBe(2);expect((await get(b.api)).entries).toBe(2);
 expect((await b.api.post('/api/pilot/pet-duels/act',{data:{id,action:'ready',round:0,phase:'lobby'}})).status()).toBe(409);
 expect((await get(b.api)).entries).toBe(2);
 for(let round=1;round<=5;round++){
  const av=(await get(a.api)).rooms[0],bv=(await get(b.api)).rooms[0];expect(av.question).not.toHaveProperty('answer');expect(av).not.toHaveProperty('questions');expect(av.fighters[1]).not.toHaveProperty('learning');
  if(round===1){expect((await a.api.post('/api/pilot/pet-duels/act',{data:{id,action:'pause',paused:true}})).status()).toBe(409);await post(host,'pet-duels/act',{id,action:'pause',paused:true});expect((await a.api.post('/api/pilot/pet-duels/act',{data:{id,action:'answer',questionId:av.question.id,answer:sum(av.question.text),move:'strike'}})).status()).toBe(409);await post(host,'pet-duels/act',{id,action:'pause',paused:false});await post(a.api,'pet-duels/act',{id,action:'answer',questionId:av.question.id,answer:'9999',move:'strike'});expect((await get(a.api)).rooms[0].health).toEqual(av.health);}
  await Promise.all([[a,av],[b,bv]].map(async([kid,v]:any[])=>post(kid.api,'pet-duels/act',{id,action:'answer',questionId:v.question.id,answer:sum(v.question.text),move:'strike'})));
  await post(a.api,'pet-duels/act',{id,action:'answer',questionId:av.question.id,answer:sum(av.question.text),move:'guard'});const result=(await get(a.api)).rooms[0];expect(result.results).toHaveLength(round);expect(result.results.at(-1).moves).toEqual(['strike','strike']);
  if(round<5)await Promise.all([a,b].map(k=>post(k.api,'pet-duels/act',{id,action:'ready',round,phase:'result'})));
 }
 const result=(await get(a.api)).rooms[0];expect(result.phase).toBe('finished');expect(result.winner).toBeNull();expect((await get(host)).rooms).toHaveLength(0);expect((await get(a.api)).entries).toBe(2);expect((await get(a.api,'save')).state).toEqual(before);
 await post(a.api,'pet-duels/create',{second:b.id});id=(await get(a.api)).rooms[0].id;await post(host,'pet-duels/act',{id,action:'end'});
 for(const api of [host,a.api,b.api,c.api,foreign])await api.dispose();
});
test('students invite and accept from Together; phone, Chromebook, retry, pause and reconnect',async({page,browser})=>{
 const {host,kids:[a,b]}=await setup(2);const child=await browser.newPage({viewport:{width:390,height:844}});await page.setViewportSize({width:1024,height:600});const errors:string[]=[];for(const p of [page,child])p.on('pageerror',e=>errors.push(e.message));
 for(const [p,k]of [[page,a],[child,b]] as const){await p.goto(k.link);await p.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Together',exact:true}).click();await expect(p.getByRole('heading',{name:'Challenge a classmate'})).toBeVisible();}
 await page.getByLabel('Choose your opponent').selectOption(b.id);await page.getByRole('button',{name:'Send duel invitation'}).click();await expect(child.getByRole('button',{name:'Accept duel'})).toBeVisible();await child.getByRole('button',{name:'Accept duel'}).click();await expect(child.getByRole('button',{name:'Answer & lock move'})).toBeVisible();await child.getByLabel('Your answer',{exact:true}).fill('999');await child.getByRole('button',{name:'Answer & lock move'}).click();await expect(child.getByText(/Not yet. Use the hint/)).toBeVisible();
 const id=(await get(a.api)).rooms[0].id;await post(host,'pet-duels/act',{id,action:'pause',paused:true});await expect(child.getByRole('button',{name:'Answer & lock move'})).toBeDisabled();await post(host,'pet-duels/act',{id,action:'pause',paused:false});await expect(child.getByRole('button',{name:'Answer & lock move'})).toBeEnabled();
 await child.getByLabel('Your answer',{exact:true}).fill(sum(await child.locator('.duel-question h4').innerText()));await child.getByRole('button',{name:'Answer & lock move'}).click();await expect(child.getByText(/Your Strike is locked/)).toBeVisible();await child.reload();await child.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Together',exact:true}).click();await expect(child.getByText(/Your Strike is locked/)).toBeVisible();await page.getByRole('button',{name:'Guard Beats Strike'}).click();await page.getByLabel('Your answer',{exact:true}).fill(sum(await page.locator('.duel-question h4').innerText()));await page.getByRole('button',{name:'Answer & lock move'}).click();await expect(child.getByRole('heading',{name:'Round 1 result'})).toBeVisible();
 mkdirSync('docs/verification/pet-duel',{recursive:true});await page.locator('.pet-duels').screenshot({path:'docs/verification/pet-duel/chromebook.png'});await child.locator('.pet-duels').screenshot({path:'docs/verification/pet-duel/phone.png'});for(const p of [page,child])expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await post(host,'pet-duels/act',{id,action:'end'});await expect(child.getByText('Teacher ended this duel.')).toBeVisible();await child.close();for(const api of [host,a.api,b.api])await api.dispose();
});

test('earned access and power limits cannot be bypassed; expired invitations release both seats for free',async()=>{
 const {host,kids:[a,b,c]}=await setup();
 async function change(k:typeof a,edit:(s:any)=>void){const save=await get(k.api,'save');edit(save.state);await post(host,`teacher/students/${k.id}/restore`,{revision:save.revision,confirm:'RESTORE',backup:{studentId:k.id,saveVersion:CURRENT_SAVE_VERSION,state:save.state}});}
 await change(a,s=>{s.player.lifetimeMathCorrect=2;});expect((await a.api.post('/api/pilot/pet-duels/create',{data:{second:b.id}})).status()).toBe(400);expect((await b.api.post('/api/pilot/pet-duels/create',{data:{second:a.id}})).status()).toBe(400);
 await change(a,s=>{s.player.lifetimeMathCorrect=3;s.pet.progression.level=8;});expect((await a.api.post('/api/pilot/pet-duels/create',{data:{second:b.id}})).status()).toBe(400);
 await change(a,s=>{s.pet.progression.level=1;});await post(a.api,'pet-duels/create',{second:b.id});const id=(await get(a.api)).rooms[0].id;
 execFileSync('python3',['-c',`import sqlite3,glob,sys
for path in glob.glob('.wrangler/pilot-test-state/v3/d1/**/*.sqlite',recursive=True):
 c=sqlite3.connect(path)
 if not c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pet_duels'").fetchone(): continue
 c.execute('UPDATE pet_duels SET expires_at=0 WHERE id=?',(sys.argv[1],));c.commit()
`,id]);
 expect((await get(a.api)).rooms[0].cancelled).toContain('expired');expect((await get(a.api)).entries).toBe(1);await post(a.api,'pet-duels/create',{second:c.id});const next=(await get(a.api)).rooms[0].id;await post(c.api,'pet-duels/act',{id:next,action:'ready',round:0,phase:'lobby'});expect((await get(a.api)).entries).toBe(0);await post(a.api,'pet-duels/act',{id:next,action:'end'});expect((await a.api.post('/api/pilot/pet-duels/create',{data:{second:b.id}})).status()).toBe(400);
 for(const api of [host,a.api,b.api,c.api])await api.dispose();
});
test('teacher supervises student invitations without selecting opponents',async({page})=>{
 const {host,kids:[a,b]}=await setup(2);await post(a.api,'pet-duels/create',{second:b.id});
 await page.goto(signInLink(baseURL,{role:'teacher',code:teachers()[0].code}));await page.getByRole('button',{name:'Class activities Play & learn together'}).click();
 const arena=page.getByRole('region',{name:'One-on-one pet duels'});await expect(arena.getByRole('button',{name:'Pause duel'})).toBeVisible();await expect(arena.getByRole('combobox')).toHaveCount(0);await arena.getByRole('button',{name:'Pause duel'}).click();await expect(arena.getByRole('button',{name:'Resume duel'})).toBeVisible();expect((await get(b.api)).rooms[0].paused).toBe(true);
 mkdirSync('docs/verification/pet-duel',{recursive:true});await arena.screenshot({path:'docs/verification/pet-duel/teacher.png'});page.once('dialog',d=>d.accept());await arena.getByRole('button',{name:'End duel',exact:true}).click();await expect(arena.getByText(/No active duels/)).toBeVisible();expect((await get(b.api)).entries).toBe(3);for(const api of [host,a.api,b.api])await api.dispose();
});

test('pet names: safe chips, teacher-approved typed names, titles, signature moves and reactions reach classmates',async({page,browser})=>{
 const {host,kids:[a,b]}=await setup(2);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(a.link);await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'My Pet',exact:true}).click();
 const studio=page.getByRole('region',{name:'Make your pet yours'});await expect(studio).toBeVisible();
 await studio.getByRole('group',{name:'First word'}).getByRole('button',{name:'Sir',exact:true}).click();await studio.getByRole('group',{name:'Name'}).getByRole('button',{name:'Biscuit',exact:true}).click();
 await studio.getByRole('button',{name:'Use this name'}).click();await expect(studio.getByRole('heading',{name:'Sir Biscuit'})).toBeVisible();
 await studio.getByText('Signature move').click();await studio.getByRole('group',{name:'Power'}).getByRole('button',{name:'Comet',exact:true}).click();await studio.getByRole('group',{name:'Action'}).getByRole('button',{name:'Zap',exact:true}).click();await studio.getByRole('button',{name:'Use this move'}).click();
 await studio.getByText('Title',{exact:true}).click();await expect(studio.getByRole('button',{name:/the Problem Solver/})).toBeDisabled();
 await expect(page.getByTestId('cloud-save-status')).toHaveText(/Saved online/,{timeout:20000});
 let fighter=(await get(b.api)).learners.find((l:{id:string})=>l.id===a.id).fighter;expect(fighter.pet).toEqual({name:'Sir Biscuit',title:null,move:'Comet Zap'});

 // Typed names wait for the teacher; classmates never see the request.
 await studio.getByLabel('Or type your own name').fill('Toastmaster');await studio.getByRole('button',{name:'Ask my teacher'}).click();await expect(studio.getByText('Waiting for your teacher: “Toastmaster”.')).toBeVisible();
 expect(JSON.stringify(await get(b.api))).not.toContain('Toastmaster');
 const inbox=await get(host,'teacher/pet-names');expect(inbox.requests).toHaveLength(1);
 await post(host,`teacher/students/${a.id}/pet-name`,{petId:inbox.requests[0].pet_id,decision:'approve',requestId:inbox.requests[0].request_id,name:'Toastmaster'});
 await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'My Pet',exact:true}).click();
 await studio.getByRole('button',{name:'Use Toastmaster'}).click();await expect(studio.getByRole('heading',{name:'Toastmaster'})).toBeVisible();
 await expect(page.getByTestId('cloud-save-status')).toHaveText(/Saved online/,{timeout:20000});
 fighter=(await get(b.api)).learners.find((l:{id:string})=>l.id===a.id).fighter;expect(fighter.pet.name).toBe('Toastmaster');
 mkdirSync('docs/verification/pet-identity',{recursive:true});await page.setViewportSize({width:390,height:844});await studio.evaluate(el=>el.querySelectorAll('details').forEach(d=>{d.open=true;}));await page.screenshot({path:'docs/verification/pet-identity/studio-phone.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:800});

 // A forged save cannot smuggle typed text past the teacher.
 const saved=await get(b.api,'save');saved.state.pet.identity={nameSource:'typed'};saved.state.pet.name='Real Full Name';
 const put=await ok(await b.api.put('/api/pilot/save',{data:{revision:saved.revision,requestId:crypto.randomUUID(),state:saved.state}}));expect(put.revision).toBe(saved.revision+1);
 expect((await get(b.api,'save')).state.pet.name).toBe('Ember');
 const teacherPage=await browser.newPage();await teacherPage.goto('/');await teacherPage.getByRole('button',{name:'Teacher sign in',exact:true}).click();await teacherPage.getByLabel('Private teacher key').fill(teachers()[0].code);await teacherPage.getByRole('button',{name:'Open teacher classroom',exact:true}).click();
 await teacherPage.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Class tools/}).click();const tools=teacherPage.getByRole('region',{name:'Pet names'});await expect(tools.getByRole('heading',{name:'Pet names · 0 awaiting approval'})).toBeVisible();await tools.getByText(/approved typed pet names/).click();await expect(tools.getByRole('button',{name:/Reset .*pet name/})).toBeVisible();await tools.screenshot({path:'docs/verification/pet-identity/teacher.png'});await teacherPage.close();
 // Chips-only classes refuse typed requests; reset returns an approved name to the default.
 await post(host,'teacher/pet-names/settings',{enabled:false});expect((await b.api.post('/api/pilot/pet-name',{data:{petId:saved.state.pet.id,name:'Sneaky'}})).status()).toBe(403);
 await post(host,`teacher/students/${a.id}/pet-name`,{petId:inbox.requests[0].pet_id,decision:'reset'});
 expect((await get(b.api)).learners.find((l:{id:string})=>l.id===a.id).fighter.pet.name).toBe('Ember');
 await post(host,'teacher/pet-names/settings',{enabled:true});

 // Reactions are preset and show on the opponent's screen.
 await post(a.api,'pet-duels/create',{second:b.id});const child=await browser.newPage({viewport:{width:390,height:844}});child.on('pageerror',e=>errors.push(e.message));
 await child.goto(b.link);await child.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Together',exact:true}).click();
 await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Together',exact:true}).click();
 await page.getByRole('button',{name:'React: Good game!'}).click();await expect(child.locator('.emote-bubble')).toHaveText(/Good game!/);
 expect((await b.api.post('/api/pilot/pet-duels/act',{data:{id:(await get(b.api)).rooms[0].id,action:'emote',emote:'nasty words'}})).status()).toBe(409);
 for(const p of [page,child])expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);await child.close();for(const api of [host,a.api,b.api])await api.dispose();
});

test('a returning student’s pet remembers them: greets after an absence, recalls a first, and remembers it said so',async({page})=>{
 const {host,kids:[a]}=await setup(1);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const saved=await get(a.api,'save');const past=Date.now()-4*86400000;
 let life=createLife(past);life=recordEpisode(life,'care',past,'play');life=recordEpisode(life,'fed',past,'cake');
 saved.state.pet.mind={...createMind(saved.state.pet),life};saved.state.screen='home';
 await post(host,`teacher/students/${a.id}/restore`,{revision:saved.revision,confirm:'RESTORE',backup:{studentId:a.id,saveVersion:CURRENT_SAVE_VERSION,state:saved.state}});
 await page.goto(a.link);await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'My Pet',exact:true}).click();await page.getByRole('button',{name:/Visit my companion/}).click();
 const thought=page.locator('.dashboard-pet-thought');
 await expect(thought).toHaveAttribute('data-pet-intention',/^recall:reunion:/,{timeout:20000});
 await expect(thought).toContainText(/4 days|Last time: playing together|dreaming about|you’re here/i);
 mkdirSync('docs/verification/pet-mind',{recursive:true});await page.screenshot({path:'docs/verification/pet-mind/reunion.png'});
 await expect(page.getByTestId('cloud-save-status')).toHaveText(/Saved online/,{timeout:20000});
 const after=(await get(a.api,'save')).state.pet.mind.life;
 expect(after.visit.days).toBe(2);expect(after.said.some((s:{key:string})=>s.key.startsWith('reunion:'))).toBe(true);
 expect(errors).toEqual([]);for(const api of [host,a.api])await api.dispose();
});

test('the pet invites the student to its favorite activity, the student accepts in one tap, and keepsakes show on the shelf',async({page})=>{
 const {host,kids:[a]}=await setup(1);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const saved=await get(a.api,'save');const now=Date.now();
 const life={...createLife(now),tallies:{'care:comfort':6},said:[{key:'seed',at:now-86400000}],treasures:[{id:'clover',at:now-3600000}]};
 saved.state.pet.mind={...createMind(saved.state.pet),life};saved.state.screen='home';
 await post(host,`teacher/students/${a.id}/restore`,{revision:saved.revision,confirm:'RESTORE',backup:{studentId:a.id,saveVersion:CURRENT_SAVE_VERSION,state:saved.state}});
 await page.goto(a.link);await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'My Pet',exact:true}).click();
 const studio=page.getByRole('region',{name:'Make your pet yours'});await studio.getByText(/Treasure shelf · 1/).click();await expect(studio.getByText('four-leaf clover')).toBeVisible();
 await page.getByRole('button',{name:/Visit my companion/}).click();
 const thought=page.locator('.dashboard-pet-thought');await expect(thought).toHaveAttribute('data-pet-intention','recall:ask:cuddle',{timeout:45000});
 await page.getByRole('group',{name:'Your pet is asking you'}).getByRole('button',{name:'Cuddle time'}).click();
 await expect(thought).toContainText('My favorite place is right here with you.');
 await expect(page.getByTestId('cloud-save-status')).toHaveText(/Saved online/,{timeout:20000});
 const mind=(await get(a.api,'save')).state.pet.mind;
 expect(mind.memories.some((m:{kind:string})=>m.kind==='cuddle')).toBe(true);expect(mind.life.said.some((s:{key:string})=>s.key==='ask:cuddle')).toBe(true);
 await page.screenshot({path:'docs/verification/pet-mind/invite-accepted.png'});
 expect(errors).toEqual([]);for(const api of [host,a.api])await api.dispose();
});

test('class rivals appear for students with class-based weaknesses; teachers control taunts and resets; students only see their own record',async({page,browser})=>{
 const {host,kids:[a,b]}=await setup(2);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const view=await get(a.api,'rivals');expect(view.rivals).toHaveLength(3);expect(view.rivals[0]).toMatchObject({title:'Bramble Sentinel',rankName:'Rookie',weakness:'Addition within 10',you:{encounters:0}});expect(new Set(view.rivals.map((r:{weakness:string})=>r.weakness)).size).toBe(3);
 const raw=JSON.stringify(view);expect(raw).not.toContain('hotspots');expect(raw).not.toContain(b.id);expect(view.rivals[0].students).toBeUndefined();
 expect((await a.api.post('/api/pilot/rivals/settings',{data:{taunts:false}})).status()).toBe(403);
 await page.goto(a.link);await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Together',exact:true}).click();
 const board=page.getByRole('region',{name:'Class rivals'});await expect(board.getByRole('article',{name:'Bramble Sentinel'})).toContainText('Weak to Addition within 10');
 await expect(board.getByText('You haven’t faced this one yet.').first()).toBeVisible();
 mkdirSync('docs/verification/rivals',{recursive:true});await board.screenshot({path:'docs/verification/rivals/student-board.png'});
 const teacherPage=await browser.newPage();await teacherPage.goto('/');await teacherPage.getByRole('button',{name:'Teacher sign in',exact:true}).click();await teacherPage.getByLabel('Private teacher key').fill(teachers()[0].code);await teacherPage.getByRole('button',{name:'Open teacher classroom',exact:true}).click();
 await teacherPage.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/activities/i}).click();
 const tBoard=teacherPage.getByRole('region',{name:'Class rivals'});await tBoard.getByLabel('Rivals can taunt during matches').uncheck();await expect(tBoard.getByText('Rivals stay quiet during matches.')).toBeVisible();
 expect((await get(host,'rivals')).taunts).toBe(false);
 teacherPage.once('dialog',d=>void d.accept());await tBoard.getByRole('button',{name:'Reset Moss Warden'}).click();await expect(tBoard.getByText('Moss Warden starts fresh.')).toBeVisible();
 for(const p of [page])expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);await teacherPage.close();for(const api of [host,a.api,b.api])await api.dispose();
});
