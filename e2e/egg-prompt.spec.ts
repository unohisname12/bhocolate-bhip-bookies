import {test,expect,request} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {signInLink} from '../src/pilot/signInLinks';
const base='http://127.0.0.1:8798';
for(const days of [2,5])test(`login leads to the next egg step with ${days} days`,async({page})=>{
 const teachers=JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
 const t=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 const s=await request.newContext({baseURL:base,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 try{
 expect((await t.post('/api/pilot/login',{data:{role:'teacher',code:teachers[0].code}})).status()).toBe(200);
 const created=await(await t.post('/api/pilot/teacher/students',{data:{count:1}})).json(),card=created.cards[0];
 await s.post('/api/pilot/login',{data:{role:'student',code:card.code,classCode:created.classCode}});
 const saved=await(await s.get('/api/pilot/save')).json();const state=saved.state;
 state.screen='play';state.eggDiscovery.stamps=Array.from({length:days},(_,i)=>({day:new Date(Date.now()-(days-i)*86400000).toISOString().slice(0,10),style:'wonder',source:'classroom'}));
 const restored=await t.post(`/api/pilot/teacher/students/${card.id}/restore`,{data:{revision:saved.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:saved.saveVersion,state}}});expect(restored.status(),await restored.text()).toBe(200);
 await page.setViewportSize({width:1366,height:768});await page.goto(signInLink(base,{role:'student',code:card.code,classCode:created.classCode}));
 if(days===2){
 const start=page.getByRole('button',{name:'Start today’s questions →',exact:true});await expect(start).toBeVisible();expect((await start.boundingBox())!.y).toBeLessThan(650);await expect(page.getByRole('heading',{name:'Help your egg grow · Day 3 of 5',exact:true})).toBeVisible();
 await start.click();const mission=page.getByRole('region',{name:'Daily discovery mission'});await expect(mission).toBeVisible();
 for(let i=0;i<3;i++){let problem:{answer:number}|undefined;await expect.poll(async()=>{const current=await(await s.get('/api/pilot/save')).json();const m=current.state.eggDiscovery.mission;if(m?.index===i)problem=m.problems[i];return !!problem;}).toBe(true);await page.getByLabel('Discovery answer',{exact:true}).fill(String(problem!.answer));await page.getByRole('button',{name:'Add an adventure piece'}).click();}
 await expect(page.getByRole('heading',{name:'Today is complete!',exact:true})).toBeVisible();await expect(page.getByText('3 of 5 days completed.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Reveal my companion →',exact:true})).toHaveCount(0);
 await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');await page.reload();await expect(page.getByRole('heading',{name:'Today is complete!',exact:true})).toBeVisible();
 }else{await expect(page.getByRole('heading',{name:'Your egg is ready!',exact:true})).toBeVisible();await page.getByRole('button',{name:'Reveal my companion →',exact:true}).click();await expect(page.getByRole('button',{name:'Bring my egg to the nursery',exact:true})).toBeVisible();}
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/verification/egg-prompt-${days}-days.png`,fullPage:true});
 }finally{await t.dispose();await s.dispose();}
});
