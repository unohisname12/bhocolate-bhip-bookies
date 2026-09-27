import {test,expect,request,type APIRequestContext} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import ExcelJS from 'exceljs';
const baseURL='http://127.0.0.1:8796';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
async function setup(index=0){const t=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});await t.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[index].code}});const d=await(await t.post('/api/pilot/teacher/students',{data:{count:2}})).json();return{t,c:d.cards.map((c:object)=>({...c,classCode:d.classCode}))};}
async function login(c:{code:string;classCode:string}){const s=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await s.post('/api/pilot/login',{data:{role:'student',...c}})).ok()).toBe(true);return s;}
async function roster(t:APIRequestContext){return(await(await t.get('/api/pilot/teacher/classroom')).json()).students;}
test('settings coexist with student saves; atomic bulk retry, stale versions and ownership',async()=>{
 const {t,c}=await setup(),s=await login(c[0]);const before=await(await s.get('/api/pilot/save')).json(),old=await roster(t);
 const rows=old.map((l:any)=>({id:l.id,version:l.settingsVersion,learning:{...l.learning,grade:8,topic:'mixed'},assignment:l.assignment}));const requestId=randomUUID();
 expect((await t.post('/api/pilot/teacher/settings-batch',{data:{rows,requestId}})).status()).toBe(200);
 const unchanged=await(await s.get('/api/pilot/save')).json();expect(unchanged.revision).toBe(before.revision);expect(unchanged.state.learning.grade).toBe(8);
 const save=await s.put('/api/pilot/save',{data:{state:before.state,revision:before.revision,requestId:randomUUID()}});expect(save.status(),await save.text()).toBe(200);
 expect((await t.post('/api/pilot/teacher/settings-batch',{data:{rows,requestId}})).status()).toBe(200);
 expect((await t.post('/api/pilot/teacher/settings-batch',{data:{rows,requestId:randomUUID()}})).status()).toBe(409);
 expect((await roster(t)).map((l:any)=>l.settingsVersion)).toEqual(old.map(()=>2));
 const {t:other}=await setup(1);expect((await other.post(`/api/pilot/teacher/students/${c[0].id}/settings`,{data:{learning:rows[0].learning,settingsVersion:2}})).status()).toBe(404);
 const current=await(await s.get('/api/pilot/save')).json();current.state.learning.grade=12;
 expect((await s.put('/api/pilot/save',{data:{state:current.state,revision:current.revision,requestId:randomUUID()}})).status()).toBe(409);
 await Promise.all([t.dispose(),s.dispose(),other.dispose()]);
});
test('nickname request stays private until approval; stale review fails and progress stays intact',async()=>{
 const {t,c}=await setup(),s=await login(c[0]),peer=await login(c[1]);const saved=await(await s.get('/api/pilot/save')).json();
 expect((await s.post('/api/pilot/nickname',{data:{nickname:'OrbitFox'}})).ok()).toBe(true);
 const first=await(await t.get('/api/pilot/teacher/nicknames')).json();const req=first.requests.find((r:any)=>r.student_id===c[0].id);
 expect((await(await peer.get('/api/pilot/parties')).json()).classmates.find((r:any)=>r.id===c[0].id).alias).toBe(c[0].alias);
 await s.post('/api/pilot/nickname',{data:{nickname:'OrbitFox2'}});
 expect((await t.post(`/api/pilot/teacher/students/${c[0].id}/nickname`,{data:{version:1,requestId:req.request_id,nickname:'OrbitFox'}})).status()).toBe(409);
 const next=(await(await t.get('/api/pilot/teacher/nicknames')).json()).requests.find((r:any)=>r.student_id===c[0].id);
 expect((await t.post(`/api/pilot/teacher/students/${c[0].id}/nickname`,{data:{version:1,requestId:next.request_id,nickname:'OrbitFox2'}})).status()).toBe(200);
 const updated=await(await s.get('/api/pilot/save')).json();expect(updated.alias).toBe('OrbitFox2');expect(updated.revision).toBe(saved.revision);
 const body={state:saved.state,revision:saved.revision,requestId:randomUUID()};expect((await s.put('/api/pilot/save',{data:body})).status()).toBe(200);expect((await s.put('/api/pilot/save',{data:body})).status()).toBe(200);
 expect((await s.post(`/api/pilot/teacher/students/${c[0].id}/nickname`,{data:{nickname:'No'}})).status()).toBe(403);
 await Promise.all([t.dispose(),s.dispose(),peer.dispose()]);
});
test('student keeps current question and input while teacher changes grade; next question updates',async({page})=>{
 const {t,c}=await setup();await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(c[0].classCode);await page.getByLabel('My secret pet code').fill(c[0].code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();
 await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:/Math Practice Start here/}).click();
 const question=page.locator('h2').filter({hasText:/\d/}).first();const original=await question.innerText();await page.getByLabel('Your answer',{exact:true}).fill('123');
 const l=(await roster(t)).find((x:any)=>x.id===c[0].id);const response=await t.post(`/api/pilot/teacher/students/${l.id}/settings`,{data:{settingsVersion:l.settingsVersion,learning:{...l.learning,grade:9,topic:'mixed'},assignment:l.assignment,requestId:randomUUID()}});expect(response.status(),await response.text()).toBe(200);
 await expect.poll(async()=>{await page.waitForTimeout(1000);return(await(await page.request.get('/api/pilot/metadata')).json()).learning.grade;}).toBe(9);
 await page.waitForTimeout(3500);await expect(question).toHaveText(original);await expect(page.getByLabel('Your answer',{exact:true})).toHaveValue('123');await expect(page.getByRole('dialog',{name:'Protect your saved pet'})).toHaveCount(0);
 const match=original.match(/(\d+) ([+−-]) (\d+)/)!;expect(match).not.toBeNull();const answer=match[2]==='+'?Number(match[1])+Number(match[3]):Number(match[1])-Number(match[3]);await page.getByLabel('Your answer',{exact:true}).fill(String(answer));await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(question).not.toHaveText(original,{timeout:10000});await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online',{timeout:10000});await page.screenshot({path:'test-results-classroom-update/student-next-question.png'});await t.dispose();
});
test('private-name spreadsheets rejected before roster upload; fresh Excel has blank names',async({page})=>{
 const {t,c}=await setup(2);await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Private teacher key').fill(teachers()[2].code);await page.getByRole('button',{name:'Open teacher classroom',exact:true}).click();await page.getByRole('heading',{name:/Nicknames & roster/}).waitFor();
 const sent:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&(/roster-import|\/nickname$/.test(r.url())))sent.push(r.postData()??'');});
 const b=new ExcelJS.Workbook(),sheet=b.addWorksheet('Roster');sheet.addRow(['Class code','Account ID','Learner account','Child name (fill in privately)']);sheet.addRow([c[0].classCode,c[0].id,'CometOwl','Synthetic private name']);sheet.getRow(2).hidden=true;
 await page.getByLabel('Import teacher nicknames from Excel').setInputFiles({name:'private.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await b.xlsx.writeBuffer())});await expect(page.getByText(/This spreadsheet has information in the real-name column/)).toBeVisible();expect(sent).toEqual([]);
 sheet.getCell(2,4).value='';await page.getByLabel('Import teacher nicknames from Excel').setInputFiles({name:'clean.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await b.xlsx.writeBuffer())});await page.getByRole('button',{name:'Approve CometOwl',exact:true}).click();await expect(page.getByText(/Nickname approved: CometOwl/)).toBeVisible();expect(sent.every(s=>!s.includes('Synthetic private name'))).toBe(true);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download fresh Excel roster'}).click();const file=await download;const output=new ExcelJS.Workbook();await output.xlsx.readFile((await file.path())!);const ws=output.worksheets[0];expect(ws.getCell(1,7).text).toContain('Real name');for(let n=2;n<=ws.rowCount;n++)expect(ws.getCell(n,7).text).toBe('');expect(ws.getColumn(4).values).toContain('CometOwl');await page.screenshot({path:'test-results-classroom-update/teacher-tools.png',fullPage:true});await t.dispose();
});
test('teacher bulk preview and undo apply to selected paused or active profiles',async({page})=>{
 const {t,c}=await setup(2);await t.post(`/api/pilot/teacher/students/${c[1].id}/pause`,{data:{active:false}});
 await page.context().addCookies((await t.storageState()).cookies);await page.goto('/');const panel=page.getByRole('region',{name:'Bulk learning settings'});await panel.getByLabel('Find learners for group').fill(c[1].alias);await panel.getByRole('button',{name:'Select visible results'}).click();await panel.getByLabel('Group grade').selectOption('10');await panel.getByLabel('Group topic').selectOption('mixed');await panel.getByRole('button',{name:'Preview group changes'}).click();await panel.getByRole('button',{name:'Apply to 1 learners'}).click();await expect(panel.getByRole('status')).toContainText('1 learners updated');let rows=await roster(t);expect(rows.find((r:any)=>r.id===c[1].id).learning.grade).toBe(10);expect(rows.find((r:any)=>r.id===c[0].id).learning.grade).toBe(2);await panel.getByRole('button',{name:'Undo last group change'}).click();await expect.poll(async()=>(await roster(t)).find((r:any)=>r.id===c[1].id).learning.grade).toBe(2);await t.dispose();
});
test('phone game library shows direct games, challenge rules and live rewards without center banner',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {t,c}=await setup();await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(c[0].classCode);await page.getByLabel('My secret pet code').fill(c[0].code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();await page.getByRole('button',{name:'Games',exact:true}).click();await expect(page.getByRole('button',{name:/Egg Dash Read the road/})).toBeInViewport({ratio:0.1});await page.screenshot({path:'test-results-classroom-update/games-phone.png'});await page.getByRole('button',{name:/Nest Café Choose orders/}).click();await page.getByRole('button',{name:'Challenge',exact:true}).click();const card=page.locator('#arcade-cafe');await expect(card).toContainText('Four deliveries');await card.getByRole('button',{name:'Play free first round'}).click();await expect(page.getByText(/4 deliveries left/)).toBeVisible();await page.screenshot({path:'test-results-classroom-update/cafe-phone.png',fullPage:true});
 const banner=await page.locator('.clash-panel').boundingBox(),header=await page.locator('.pilot-savebar').boundingBox();expect(banner!.y+banner!.height).toBeLessThanOrEqual(header!.y+header!.height);
 await page.getByRole('button',{name:'Finish round early'}).click();await expect(page.getByText('Earned 0 arcade stars · Balance 0 stars')).toBeVisible();await t.dispose();
});

test('grade recovery preserves checkpoints and rejects students, other classes, invalid grades and stale writes', async () => {
 const {t,c}=await setup(),s=await login(c[0]);
 const before=await(await s.get('/api/pilot/save')).json();
 const learner=(await roster(t)).find((l:any)=>l.id===before.studentId);
 const path=`/api/pilot/teacher/students/${learner.id}/grade-recovery`;
 const data={grade:10,settingsVersion:learner.settingsVersion};
 expect((await s.post(path,{data})).status()).toBe(403);
 const {t:other}=await setup(1);
 expect((await other.post(path,{data})).status()).toBe(404);
 expect((await t.post(path,{data:{...data,grade:13}})).status()).toBe(400);
 expect((await t.post(path,{data:{...data,assignment:'free'}})).status()).toBe(400);
 expect((await t.post(path,{data:{grade:10}})).status()).toBe(400);
 expect((await t.post(path,{data})).status()).toBe(200);
 expect((await t.post(path,{data})).status()).toBe(409);
 const after=(await roster(t)).find((l:any)=>l.id===learner.id);
 expect(after.learning).toEqual({...learner.learning,grade:10,topic:'mixed'});
 expect(after.assignment).toBe(learner.assignment);expect(after.revision).toBe(learner.revision);
 expect((await s.put('/api/pilot/save',{data:{state:before.state,revision:before.revision,requestId:randomUUID()}})).status()).toBe(200);
 expect((await(await s.get('/api/pilot/metadata')).json()).learning.grade).toBe(10);
 await t.dispose();await s.dispose();await other.dispose();
});

test('hidden teacher recovery works when normal settings fail and restores prior levels', async ({page}) => {
 const {t}=await setup(2);const initial=await roster(t),learner=initial[0];
 await page.context().addCookies((await t.storageState()).cookies);
 await page.route('**/api/pilot/teacher/settings-batch',route=>route.fulfill({status:503,json:{error:'Simulated bulk settings outage'}}));
 await page.route('**/api/pilot/teacher/students/*/settings',route=>route.fulfill({status:503,json:{error:'Simulated settings outage'}}));
 await page.goto('/');
 const recovery=page.getByRole('region',{name:'Grade level override',exact:true});
 await expect(recovery).toBeHidden();
 await page.getByText('Advanced teacher tools · grade recovery',{exact:true}).click();
 await expect(recovery).toBeVisible();
 await recovery.getByLabel('Recovery learners').selectOption(learner.id);
 await recovery.getByLabel('Recovery grade').selectOption('11');
 await recovery.getByRole('button',{name:'Read saved levels & preview override'}).click();
 await recovery.getByRole('button',{name:'Apply backup override to 1 learners'}).click();
 await expect(recovery.getByRole('status')).toContainText('1 of 1 overrides verified');
 expect((await roster(t)).find((l:any)=>l.id===learner.id).learning.grade).toBe(11);
 await recovery.getByRole('button',{name:'Restore previous levels',exact:true}).click();
 await expect(recovery.getByRole('status')).toContainText('1 of 1 restores verified');
 expect((await roster(t)).find((l:any)=>l.id===learner.id).learning).toEqual(learner.learning);
 await t.dispose();
});

test('class recovery reports partial failures, verifies a lost response and blocks stale restore', async ({page}) => {
 const {t}=await setup(1),initial=await roster(t),blocked=initial[0];
 await page.context().addCookies((await t.storageState()).cookies);
 await page.route('**/api/pilot/teacher/students/*/grade-recovery',async route=>{
   if(route.request().url().includes(blocked.id)) return route.fulfill({status:503,json:{error:'Simulated recovery outage'}});
   await route.fetch(); // Commit but lose the response: verification must discover success.
   await route.abort('failed');
 });
 await page.goto('/');await page.getByText('Advanced teacher tools · grade recovery',{exact:true}).click();
 const recovery=page.getByRole('region',{name:'Grade level override',exact:true});
 await recovery.getByLabel('Recovery learners').selectOption('all');await recovery.getByLabel('Recovery grade').selectOption('9');
 await recovery.getByRole('button',{name:'Read saved levels & preview override'}).click();
 await recovery.getByRole('button',{name:`Apply backup override to ${initial.length} learners`}).click();
 await expect(recovery.getByRole('status')).toContainText(`${initial.length-1} of ${initial.length} overrides verified`);
 await expect(recovery).toContainText('Not confirmed: Simulated recovery outage');
 const after=await roster(t),changed=after.find((l:any)=>l.id!==blocked.id);
 expect(after.find((l:any)=>l.id===blocked.id).learning).toEqual(blocked.learning);
 expect((await t.post(`/api/pilot/teacher/students/${changed.id}/grade-recovery`,{data:{grade:12,settingsVersion:changed.settingsVersion}})).status()).toBe(200);
 await page.unroute('**/api/pilot/teacher/students/*/grade-recovery');
 await recovery.getByRole('button',{name:'Restore previous levels',exact:true}).click();
 await expect(recovery.getByRole('status')).toContainText('restores verified. Check the unconfirmed learners');
 expect((await roster(t)).find((l:any)=>l.id===changed.id).learning.grade).toBe(12);
 await t.dispose();
});

test('Advanced Momentum mode, guards and seven-row board survive a classroom cloud save',async()=>{
 const {initMomentum}=await import('../src/engine/systems/MomentumSystem');
 const {t,c}=await setup(),s=await login(c[0]);
 const before=await(await s.get('/api/pilot/save')).json();
 const momentum=initMomentum('medium','advanced');momentum.pieces[0].guarded=true;
 const state={...before.state,screen:'momentum',momentum};
 const reply=await s.put('/api/pilot/save',{data:{state,revision:before.revision,requestId:randomUUID()}});
 expect(reply.status(),await reply.text()).toBe(200);
 const after=await(await s.get('/api/pilot/save')).json();expect(after.state.momentum.mode).toBe('advanced');expect(after.state.momentum.board).toHaveLength(7);expect(after.state.momentum.pieces[0].guarded).toBe(true);
 await t.dispose();await s.dispose();
});

test('phone classroom header does not cover the Advanced Momentum mode picker',async({page})=>{
 const {t,c}=await setup();await page.setViewportSize({width:390,height:844});
 await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(c[0].classCode);await page.getByLabel('My secret pet code').fill(c[0].code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();
 await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:/^Momentum Classic/}).click();
 await page.getByRole('button',{name:'Advanced · 7×7',exact:true}).click();await page.getByRole('button',{name:/^Easy/}).click();
 await expect(page.locator('[data-help="momentum-board"]').getByRole('button')).toHaveCount(49);
 await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');
 await page.getByRole('button',{name:'Forfeit',exact:true}).click();await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');
 await page.getByRole('button',{name:'Save & sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Visit my pet',exact:true})).toBeVisible();await t.dispose();
});
