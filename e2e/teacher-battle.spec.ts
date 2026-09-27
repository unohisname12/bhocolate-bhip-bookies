import {test,expect,request as newRequest,type APIRequestContext,type Page} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8')) as {code:string}[];
const settings={alias:'Captain',name:'Chalkstone',color:'midnight',grade:0,topic:'Addition within 10',challenge:'standard',rounds:1};
async function teacher(i:number){const c=await newRequest.newContext({baseURL:'http://127.0.0.1:8803',extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await c.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[i].code}})).ok()).toBe(true);return c;}
async function ok(r:Awaited<ReturnType<APIRequestContext['post']>>){expect(r.status(),await r.text()).toBe(200);return r.json();}
const sum=(s:string)=>s.split('+').reduce((n,v)=>n+Number(v.trim()),0);
async function hostPage(page:Page,path:string,body?:unknown){return page.evaluate(async({path,body})=>{const r=await fetch(`/api/pilot/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Pilot-Request':'1','X-Pilot-Tab':sessionStorage.getItem('vpet-classroom-tab')!},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error(await r.text());return r.json();},{path,body});}
test('live room: two co-teachers, private answers, concurrent students, replay and role protection',async({request})=>{
 const host=await teacher(0),co1=await teacher(1),co2=await teacher(2);
 let data=await ok(await host.post('/api/pilot/teacher-battle/create',{data:settings}));const {id,code,invite}=data.room;
 expect((await co1.get(`/api/pilot/teacher-battle?id=${id}`)).status()).toBe(403);
 for(const [i,c] of [co1,co2].entries())await ok(await c.post('/api/pilot/teacher-battle/join',{data:{...settings,alias:`Co teacher ${i}`,invite}}));
 const seats=await Promise.all(Array.from({length:12},async(_,i)=>ok(await request.post('/api/pilot/teacher-battle-access?op=join',{data:{code,alias:`Student ${i}`,pet:i===0?'koala_sprite':'ember_fox'}}))));
 data=await ok(await host.get(`/api/pilot/teacher-battle?id=${id}`));expect(data.room.members).toHaveLength(15);
 const projector=await ok(await request.get(`/api/pilot/teacher-battle-access?op=projector&id=${id}`,{headers:{'X-Battle-Token':data.projectorToken}}));expect(projector).not.toHaveProperty('projectorToken');expect(projector.room).not.toHaveProperty('invite');
 data=await ok(await host.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'next',revision:data.room.revision}}));
 await Promise.all(seats.map(async seat=>{const headers={'X-Battle-Token':seat.token};const v=await ok(await request.get(`/api/pilot/teacher-battle-access?op=state&id=${id}`,{headers}));expect(v.room.question).not.toHaveProperty('answer');expect(v.room).not.toHaveProperty('invite');expect(JSON.stringify(v)).not.toContain('tokenHash');
 const body={action:'answer',questionId:v.room.question.id,answer:String(sum(v.room.question.text)),move:'strike'};await ok(await request.post(`/api/pilot/teacher-battle-access?op=act&id=${id}`,{headers,data:body}));await ok(await request.post(`/api/pilot/teacher-battle-access?op=act&id=${id}`,{headers,data:{...body,move:'rally'}}));}));
 for(const c of [host,co1,co2]){const v=await ok(await c.get(`/api/pilot/teacher-battle?id=${id}`));await ok(await c.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'answer',questionId:v.room.question.id,answer:String(sum(v.room.question.text)),move:'strike'}}));}
 data=await ok(await host.get(`/api/pilot/teacher-battle?id=${id}`));
 expect((await request.post(`/api/pilot/teacher-battle-access?op=act&id=${id}`,{headers:{'X-Battle-Token':seats[0].token},data:{action:'next',revision:data.room.revision}})).status()).toBe(409);
 expect((await co1.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'finish',revision:data.room.revision}})).status()).toBe(409);
 data=await ok(await host.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'next',revision:data.room.revision}}));expect(data.room.health).toEqual({teachers:70,students:70});expect((await host.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'next',revision:0,phase:'question',round:1,paused:false}})).status()).toBe(409);
 await ok(await host.post(`/api/pilot/teacher-battle/act?id=${id}`,{data:{action:'next',revision:data.room.revision}}));
 for(const c of [host,co1,co2])await c.dispose();
});
test('teacher and student screens: griffin, pet choice, retry, pause, result, reconnect and mobile',async({page,browser})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Private teacher key').fill(teachers()[0].code);await page.getByRole('button',{name:'Open teacher classroom',exact:true}).click();await page.getByRole('button',{name:'Class activities Play & learn together'}).click();await page.getByRole('button',{name:'Open Beat the Teacher',exact:true}).click();
 await page.getByLabel('Your teacher nickname').fill('Professor');await page.getByLabel('Math level',{exact:true}).selectOption('0');await page.getByLabel('Math topic',{exact:true}).selectOption('Addition within 10');await page.getByLabel('Rounds',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Create teacher challenge'}).click();await expect(page.getByRole('button',{name:'Start the challenge'})).toBeVisible();
 let data=await hostPage(page,'teacher-battle');const id=data.room.id,code=data.room.code;
 const student=await browser.newPage({viewport:{width:390,height:844}});student.on('pageerror',e=>errors.push(e.message));await student.goto('/?teacherBattle=join&pet=koala_sprite');await student.getByLabel('Match code').fill(code);await student.getByLabel('Your nickname').fill('Fern');await student.getByRole('button',{name:'Join the student team'}).click();await expect(student.getByText('Waiting for the lead teacher to start.')).toBeVisible();
 await page.getByRole('button',{name:'Start the challenge'}).click();await expect(student.getByRole('button',{name:'Power my pet'})).toBeVisible();
 const griffin=page.locator('.tb-battlefield .tb-guardian-sprite');await expect(griffin).toHaveAttribute('data-anim','math');
 for(const anim of ['idle','attack','special','defend','hurt','heal','math','victory','defeat']){const r=await page.request.get(`/assets/teacher-guardians/chalkstone-griffin-${anim}.png`);expect(r.ok(),anim).toBe(true);expect(r.headers()['content-type']).toContain('image/png');}
await student.getByLabel('Your answer',{exact:true}).fill('999');await student.getByRole('button',{name:'Power my pet'}).click();await expect(student.getByText(/Not quite yet/)).toBeVisible();
 await page.getByRole('button',{name:'Pause match',exact:true}).click();await expect(student.getByRole('button',{name:'Power my pet'})).toBeDisabled();await page.getByRole('button',{name:'Resume match',exact:true}).click();await expect(student.getByRole('button',{name:'Power my pet'})).toBeEnabled();
 const question=await student.locator('.tb-question h2').innerText();await student.getByLabel('Your answer',{exact:true}).fill(String(sum(question)));await student.getByRole('button',{name:'Power my pet'}).click();await expect(student.getByText(/Your strike is charged/)).toBeVisible();await student.reload();await expect(student.getByText(/Your strike is charged/)).toBeVisible();
 data=await hostPage(page,`teacher-battle?id=${id}`);await page.getByLabel('Your answer',{exact:true}).fill(String(sum(data.room.question.text)));await page.getByRole('button',{name:'Power my pet'}).click();await expect(page.getByText(/Your strike is charged/)).toBeVisible();await page.getByRole('button',{name:'Reveal team moves'}).click();await expect(page.getByRole('button',{name:'Show match result'})).toBeVisible();
 // Both sides struck at full power: the griffin casts its special, flinches, then settles back to idle.
 await expect(griffin).toHaveAttribute('data-anim','special');mkdirSync('docs/verification/teacher-battle',{recursive:true});await page.locator('.tb-side-teachers').screenshot({path:'docs/verification/teacher-battle/griffin-special.png'});await expect(griffin).toHaveAttribute('data-anim','hurt',{timeout:5000});await expect(griffin).toHaveAttribute('data-anim','idle',{timeout:5000});

 mkdirSync('docs/verification/teacher-battle',{recursive:true});await page.locator('.tb-launcher').screenshot({path:'docs/verification/teacher-battle/teacher-battle.png'});await expect(student.locator('.tb-result')).toBeVisible();await student.screenshot({path:'docs/verification/teacher-battle/student-phone.png',fullPage:true});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await student.locator('.tb-battlefield img').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0))).toBe(true);
 await page.getByRole('button',{name:'Show match result'}).click();await expect(student.getByText('A shared victory!')).toBeVisible();await page.getByRole('button',{name:'Set up another challenge'}).click();await expect(page.getByRole('button',{name:'Create teacher challenge'})).toBeVisible();await expect(page.getByRole('button',{name:'Create teacher challenge'})).toBeVisible();expect(errors).toEqual([]);await student.close();
});
