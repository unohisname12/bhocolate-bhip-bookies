import {test,expect,request as newRequest,type Page} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8')) as {code:string}[];
async function hostAPI(page:Page,path='portal',body?:unknown){return page.evaluate(async({path,body})=>{const r=await fetch(`/api/pilot/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Pilot-Request':'1','X-Pilot-Tab':sessionStorage.getItem('vpet-classroom-tab')!},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};},{path,body});}
async function signIn(page:Page){await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Private teacher key').fill(teachers()[0].code);await page.getByRole('button',{name:'Open teacher classroom',exact:true}).click();await page.getByRole('button',{name:'Class activities Play & learn together'}).click();await page.getByRole('button',{name:'Host Portal Party',exact:true}).click();await expect(page.getByRole('combobox',{name:'Math level',exact:true})).toBeVisible();}
test('teacher-only setup, level selection, live classroom flow, private answers, projector and recovery',async({page,browser,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await signIn(page);await page.getByRole('combobox',{name:'Math level',exact:true}).selectOption('9');await page.getByRole('combobox',{name:'Math topic',exact:true}).selectOption('Slope');await page.getByRole('combobox',{name:'Teams',exact:true}).selectOption('2');await page.getByRole('combobox',{name:'Rounds',exact:true}).selectOption('1');await page.getByRole('combobox',{name:'Questions per round',exact:true}).selectOption('1');
 mkdirSync('docs/verification/portal-party',{recursive:true});await page.locator('.portal-teacher-entry').screenshot({path:'docs/verification/portal-party/teacher-setup.png'});
 await page.getByRole('button',{name:'Create festival & join code'}).click();await expect(page.getByRole('button',{name:'Start first question'})).toBeVisible();
 let hosted=(await hostAPI(page)).data;const id=hosted.room.id,code=hosted.room.code;
 const other=await newRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{'X-Pilot-Request':'1'}});await other.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[1].code}});expect((await other.get(`/api/pilot/portal?id=${id}`)).status()).toBe(403);
 expect((await request.post('/api/pilot/portal/create',{data:{}})).status()).toBe(401);
 const students=await Promise.all([browser.newPage(),browser.newPage()]);
 for(const [i,p] of students.entries()){p.on('pageerror',e=>errors.push(e.message));await p.goto(`/?portal=${code}`);await expect(p.getByRole('button',{name:'Host Portal Party'})).toHaveCount(0);await p.getByLabel('Nickname',{exact:true}).fill(['Fern','Cedar'][i]);await p.getByRole('button',{name:'Join the festival'}).click();await expect(p.getByText(/You’re in/)).toBeVisible();}
 const tokens=await Promise.all(students.map(p=>p.evaluate(code=>JSON.parse(sessionStorage.getItem(`vpet-portal-seat:${code}`)!),code)));
 const projector=await browser.newPage({viewport:{width:1920,height:1080}});await projector.goto(`/?portalProjector=1#${id}.${hosted.projectorToken}`);await expect(projector.locator('.portal-code')).toHaveText(code);await expect(projector.getByRole('button',{name:'Start first question'})).toHaveCount(0);
 const bad=await request.get(`/api/pilot/portal-access?op=state&id=${id}`);expect(bad.status()).toBe(403);
 const forbidden=await request.post(`/api/pilot/portal-access?op=act&id=${id}`,{headers:{'X-Portal-Token':tokens[0].token},data:{action:'finish',revision:(await hostAPI(page)).data.room.revision}});expect(forbidden.status()).toBe(409);
 await page.getByRole('button',{name:'Start first question'}).click();await expect(students[0].getByLabel('Your answer')).toBeVisible();hosted=(await hostAPI(page)).data;
 expect(hosted.room.question.topic).toBe('Slope');const expected=hosted.room.question.answer;
 const publicState=await request.get(`/api/pilot/portal-access?op=state&id=${id}`,{headers:{'X-Portal-Token':tokens[0].token}});const publicRoom=(await publicState.json()).room;expect(publicRoom.question.answer).toBeUndefined();expect(publicRoom.question.explanation).toBeUndefined();expect(publicRoom.members[0].tokenHash).toBeUndefined();expect(publicRoom.history).toEqual([]);
 await Promise.all(students.map(async p=>{await p.getByLabel('Your answer').fill(String(expected));await p.getByRole('button',{name:'Send answer'}).click();await expect(p.getByText(/Answer saved:/)).toBeVisible();}));
 await students[0].reload();await expect(students[0].getByText(/Answer saved:/)).toBeVisible();
 await page.getByRole('button',{name:'Close answers & review'}).click();await expect(page.getByRole('button',{name:'Reveal explanation & award charges'})).toBeVisible();await expect(projector.getByText(/Your teacher is reviewing/)).toBeVisible();await expect(projector.locator('.portal-solution')).toHaveCount(0);
 await page.getByRole('button',{name:'Reveal explanation & award charges'}).click();await expect(projector.locator('.portal-solution')).toHaveText(String(expected));
 await page.getByRole('button',{name:'Open the portal board'}).click();await expect(students[0].getByRole('button',{name:'Spin the portal ✦'})).toBeVisible();await expect(students[1].getByRole('button',{name:'Spin the portal ✦'})).toHaveCount(0);
 await expect(projector.locator('.portal-board')).toBeVisible();
 for(const size of [{width:1920,height:1080},{width:1366,height:768}]){await projector.setViewportSize(size);await expect.poll(()=>projector.locator('.portal-board').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight)).toBe(true);}
 await projector.screenshot({path:'docs/verification/portal-party/projector-full.png'});
 await projector.locator('.portal-board').screenshot({path:'docs/verification/portal-party/projector-board.png'});
 await page.getByRole('button',{name:'Pause festival',exact:true}).click();await expect(students[0].getByRole('button',{name:'Spin the portal ✦'})).toBeDisabled();await page.getByRole('button',{name:'Resume festival'}).click();
 await students[0].getByRole('button',{name:'Pass to Team Ember'}).click();await expect(students[1].getByRole('button',{name:'Spin the portal ✦'})).toBeVisible();await expect(students[1].getByRole('button',{name:'Pass to Team Pip'})).toHaveCount(0);
 await students[1].getByRole('button',{name:'Spin the portal ✦'}).click();await expect(students[1].getByRole('button',{name:'STOP!',exact:true})).toBeVisible();await students[1].getByRole('button',{name:'STOP!',exact:true}).click();await expect(page.getByRole('button',{name:'Continue festival'})).toBeVisible();await page.getByRole('button',{name:'Continue festival'}).click();
 await page.getByRole('button',{name:'Spin the portal ✦'}).click();await page.getByRole('button',{name:'STOP!',exact:true}).click();await page.getByRole('button',{name:'Continue festival'}).click();await page.getByRole('button',{name:'Show festival results'}).click();await expect(page.getByRole('button',{name:'Set up another festival'})).toBeVisible();await expect(students[0].getByText(/festival crown!/)).toBeVisible();
 const final=(await hostAPI(page)).data.room;expect(final.phase).toBe('finished');expect(final.history).toHaveLength(2);expect(final.history.every((h:{correct:boolean})=>h.correct)).toBe(true);expect(final.teams.reduce((n:number,t:{earned:number;passed:number})=>n+t.earned+t.passed,0)).toBe(0);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download math results'}).click();expect((await dl).suggestedFilename()).toBe('portal-party-math-results.csv');
 await students[0].setViewportSize({width:390,height:844});expect(await students[0].evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await students[0].screenshot({path:'docs/verification/portal-party/student-phone.png',fullPage:true});
 expect(errors).toEqual([]);await other.dispose();for(const p of [...students,projector])await p.close();
});
test('student accounts cannot host; six-digit code is not teacher authorization',async({request})=>{
 const host=await newRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{'X-Pilot-Request':'1'}});await host.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[2].code}});
 const cards=await (await host.post('/api/pilot/teacher/students',{data:{count:1}})).json();const student=await newRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{'X-Pilot-Request':'1'}});await student.post('/api/pilot/login',{data:{role:'student',classCode:cards.classCode,code:cards.cards[0].code}});
 expect((await student.get('/api/pilot/portal')).status()).toBe(403);expect((await student.post('/api/pilot/portal/create',{data:{}})).status()).toBe(403);
 expect((await request.post('/api/pilot/portal-access?op=join',{data:{code:'000000',alias:'Fern'}})).status()).toBe(404);await host.dispose();await student.dispose();
});
test('a class can submit together; stale question advances are safe and repeat actions do not award twice',async({request})=>{
 const host=await newRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{'X-Pilot-Request':'1'}});await host.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[1].code}});
 let data=await (await host.post('/api/pilot/portal/create',{data:{grade:6,topic:'Signed integers',challenge:'standard',teams:8,rounds:1,questions:1,seconds:0,gentle:true}})).json();const id=data.room.id,code=data.room.code;
 const seats=await Promise.all(Array.from({length:20},async(_,i)=>{const r=await request.post('/api/pilot/portal-access?op=join',{data:{code,alias:`Player ${i+1}`}});expect(r.status(),await r.text()).toBe(200);return r.json();}));
 data=await (await host.get('/api/pilot/portal')).json();expect(data.room.members).toHaveLength(20);const sizes=data.room.teams.map((_:unknown,i:number)=>data.room.members.filter((m:{team:number})=>m.team===i).length);expect(Math.max(...sizes)-Math.min(...sizes)).toBeLessThanOrEqual(1);
 data=await (await host.post(`/api/pilot/portal/act?id=${id}`,{data:{action:'next',phase:'lobby',revision:data.room.revision}})).json();const before=data.room;
 await Promise.all(seats.map(async seat=>{const r=await request.post(`/api/pilot/portal-access?op=act&id=${id}`,{headers:{'X-Portal-Token':seat.token},data:{action:'answer',questionId:before.question.id,answer:String(before.question.answer)}});expect(r.status(),await r.text()).toBe(200);}));
 const close=await host.post(`/api/pilot/portal/act?id=${id}`,{data:{action:'next',phase:'question',questionId:before.question.id,revision:before.revision}});expect(close.status()).toBe(200);data=await close.json();expect(data.room.question.submitted).toBe(20);
 const award={action:'next',phase:'review',questionId:before.question.id,revision:data.room.revision};expect((await host.post(`/api/pilot/portal/act?id=${id}`,{data:award})).status()).toBe(200);expect((await host.post(`/api/pilot/portal/act?id=${id}`,{data:award})).status()).toBe(409);
 data=await (await host.get('/api/pilot/portal')).json();expect(data.room.teams.every((t:{earned:number})=>t.earned===1)).toBe(true);expect(data.room.history).toHaveLength(20);
 await host.post(`/api/pilot/portal/act?id=${id}`,{data:{action:'finish',revision:data.room.revision}});await host.dispose();
});
