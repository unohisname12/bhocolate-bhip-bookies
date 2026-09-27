import {test,expect,request,type APIRequestContext} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {generateLearningProblem} from '../src/services/game/curriculum';
import {recordLearning} from '../src/services/game/learningEvidence';
import {signInLink} from '../src/pilot/signInLinks';
const base='http://127.0.0.1:8798';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
async function teacher(n=0){const api=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[n].code}})).status()).toBe(200);return api;}
async function create(t:APIRequestContext){const response=await t.post('/api/pilot/teacher/students',{data:{count:1}});expect(response.status()).toBe(201);const {classCode,cards}=await response.json();const card=cards[0];const assigned=await t.post(`/api/pilot/teacher/students/${card.id}/settings`,{data:{settingsVersion:1,learning:{topic:'Two-digit subtraction'},requestId:randomUUID()}});expect(assigned.status()).toBe(200);const s=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}});await s.post('/api/pilot/login',{data:{role:'student',classCode,code:card.code}});return {s,card};}
async function evidence(s:APIRequestContext,count:number,supported=false){const current=await(await s.get('/api/pilot/save')).json();let state=current.state;for(let i=0;i<count;i++){const problem={...generateLearningProblem(state.learning),id:randomUUID()};if(supported){state=recordLearning(state,problem,'practice',false);state=recordLearning(state,problem,'help',undefined,'hint');}state=recordLearning(state,problem,'practice',true);}const body={state,revision:current.revision,requestId:randomUUID()};const response=await s.put('/api/pilot/save',{data:body});expect(response.status(),await response.text()).toBe(200);return body;}
async function insights(t:APIRequestContext){const r=await t.get('/api/pilot/teacher/insights?days=7');expect(r.status(),await r.text()).toBe(200);return r.json();}
test('history survives the 200-record cap, replays do not double count, and access stays classroom-scoped',async()=>{
 const t=await teacher(),other=await teacher(1),{s,card}=await create(t);
 await evidence(s,200);const body=await evidence(s,100);const replay=await s.put('/api/pilot/save',{data:body});expect(replay.status()).toBe(200);
 const data=await insights(t);expect(data.skills.filter((r:{studentId:string})=>r.studentId===card.id).reduce((n:number,r:{attempted:number})=>n+r.attempted,0)).toBe(300);
 expect((await(await s.get('/api/pilot/save')).json()).state.learningEvidence).toHaveLength(200);
 expect((await s.get('/api/pilot/teacher/insights')).status()).toBe(403);expect((await other.get(`/api/pilot/teacher/insights/evidence?student=${card.id}`)).status()).toBe(404);
 await s.post('/api/pilot/presence',{data:{visible:true,activity:'math',phase:'saved'}});const live=(await insights(t)).students.find((r:{id:string})=>r.id===card.id);expect(live.activity).toBe('math');expect(Date.now()-live.lastSeen).toBeLessThan(5000);
 await Promise.all([t.dispose(),other.dispose(),s.dispose()]);
});
test('recommendations apply once, reject stale previews, preserve grade/help, and support safe undo',async()=>{
 const t=await teacher(1),{s,card}=await create(t);await evidence(s,8,true);
 let data=await insights(t);let alert=data.alerts.find((a:{studentId:string;rule:string})=>a.studentId===card.id&&a.rule==='support');expect(alert).toBeTruthy();
 const learner=data.students.find((p:{id:string})=>p.id===card.id),payload={requestId:randomUUID(),alertId:alert.id,settingsVersion:alert.settingsVersion,evidenceAt:alert.lastEvidenceAt,evidenceToken:alert.evidenceToken};
 await evidence(s,1,true);expect((await t.post('/api/pilot/teacher/insights/apply',{data:payload})).status()).toBe(409);
 data=await insights(t);alert=data.alerts.find((a:{id:string})=>a.id===alert.id);const fresh={...payload,requestId:randomUUID(),evidenceAt:alert.lastEvidenceAt,evidenceToken:alert.evidenceToken};
 const applied=await t.post('/api/pilot/teacher/insights/apply',{data:fresh});expect(applied.status(),await applied.text()).toBe(200);expect((await t.post('/api/pilot/teacher/insights/apply',{data:fresh})).status()).toBe(200);
 data=await insights(t);let updated=data.students.find((p:{id:string})=>p.id===card.id);expect(updated.learning.challenge).toBe('support');expect(updated.settingsVersion).toBe(learner.settingsVersion+1);expect(updated.learning.grade).toBe(learner.learning.grade);expect(updated.learning.learningHelp).toBe(learner.learning.learningHelp);
 await evidence(s,3);data=await insights(t);const change=data.interventions.find((i:{id:string})=>i.id===fresh.requestId);expect(change.followup.attempted).toBe(3);
 const undo={id:change.id,requestId:randomUUID()};expect((await t.post('/api/pilot/teacher/insights/revert',{data:undo})).status()).toBe(200);expect((await t.post('/api/pilot/teacher/insights/revert',{data:undo})).status()).toBe(200);
 updated=(await insights(t)).students.find((p:{id:string})=>p.id===card.id);expect(updated.learning.challenge).toBe(learner.learning.challenge);
 await Promise.all([t.dispose(),s.dispose()]);
});
test('teacher overview, report, alert preview and phone layout work together',async({page})=>{
 const t=await teacher(2),{s,card}=await create(t);await evidence(s,9,true);
 await page.goto(signInLink(base,{role:'teacher',code:teachers()[2].code,classCode:''}));await expect(page.getByRole('heading',{name:'See who needs you today.'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Teacher learning insights'})).toContainText('May need more support');
 await page.screenshot({path:'docs/verification/teacher-insights-overview.png',fullPage:true});
 await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Alerts/}).click();await page.getByRole('button',{name:`Preview change for ${card.alias}`,exact:true}).click();await expect(page.getByRole('dialog',{name:'Preview learning adjustment'})).toContainText('support');await page.getByRole('button',{name:'Apply this change',exact:true}).click();await expect(page.getByRole('dialog',{name:'Preview learning adjustment'})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Reports/}).click();await page.getByLabel('Student filter',{exact:true}).selectOption(card.id);await expect(page.getByRole('heading',{name:'Question evidence',exact:true})).toBeVisible();
 await page.emulateMedia({media:'print'});await expect(page.getByRole('heading',{name:'Question evidence',exact:true})).toBeVisible();await page.emulateMedia({media:'screen'});
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export learning summary'}).click();expect((await dl).suggestedFilename()).toBe('classroom-learning-summary.csv');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/verification/teacher-insights-phone.png',fullPage:true});
 await Promise.all([t.dispose(),s.dispose()]);
});
test('live refresh preserves unsaved teacher edits, and paused/dismissed alerts stay quiet',async({page})=>{
 const t=await teacher(2),{s,card}=await create(t);
 await page.goto(signInLink(base,{role:'teacher',code:teachers()[2].code,classCode:''}));await expect(page.getByRole('heading',{name:'See who needs you today.'})).toBeVisible();await page.getByLabel('Selected student',{exact:true}).selectOption(card.id);
 await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Students Learning/}).click();await page.getByLabel('Grade level',{exact:true}).selectOption('5');
 await evidence(s,8,true);await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Alerts/}).click();
 await expect(page.getByRole('button',{name:`Preview change for ${card.alias}`,exact:true})).toBeVisible({timeout:25000});await expect(page.getByRole('button',{name:`Preview change for ${card.alias}`,exact:true})).toBeDisabled();
 await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Students Learning/}).click();await expect(page.getByLabel('Grade level',{exact:true})).toHaveValue('5');await page.getByRole('button',{name:'Reset changes',exact:true}).click();
 let data=await insights(t),a=data.alerts.find((a:{studentId:string;rule:string})=>a.studentId===card.id&&a.rule==='support');
 const decision={requestId:randomUUID(),alertId:a.id,decision:'snoozed'};expect((await t.post('/api/pilot/teacher/insights/decision',{data:decision})).status()).toBe(200);expect((await t.post('/api/pilot/teacher/insights/decision',{data:decision})).status()).toBe(200);
 data=await insights(t);expect(data.alerts.find((r:{id:string})=>r.id===a.id).status).toBe('snoozed');
 await t.post('/api/pilot/teacher/insights/policy',{data:{enabled:false}});a=(await insights(t)).alerts.find((r:{id:string})=>r.id===a.id);expect((await t.post('/api/pilot/teacher/insights/apply',{data:{requestId:randomUUID(),alertId:a.id,settingsVersion:a.settingsVersion,evidenceAt:a.lastEvidenceAt,evidenceToken:a.evidenceToken}})).status()).toBe(409);
 await t.post('/api/pilot/teacher/insights/policy',{data:{enabled:true}});await Promise.all([t.dispose(),s.dispose()]);
});
test('deleting insight history is scoped, preserves pets/settings, and does not reimport old questions',async()=>{
 const t=await teacher(1),other=await teacher(),{s,card}=await create(t);await evidence(s,10,true);const before=await(await s.get('/api/pilot/save')).json();
 const body={studentId:card.id,confirm:'DELETE_PRACTICE_HISTORY'};expect((await other.post('/api/pilot/teacher/insights/erase',{data:body})).status()).toBe(404);expect((await t.post('/api/pilot/teacher/insights/erase',{data:body})).status()).toBe(200);
 expect(await(await s.get('/api/pilot/save')).json()).toEqual(before);await evidence(s,1);const data=await insights(t);expect(data.skills.filter((r:{studentId:string})=>r.studentId===card.id).reduce((n:number,r:{attempted:number})=>n+r.attempted,0)).toBe(1);
 await Promise.all([t.dispose(),other.dispose(),s.dispose()]);
});
