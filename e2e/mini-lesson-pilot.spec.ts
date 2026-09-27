import {test,expect,request} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {signInLink} from '../src/pilot/signInLinks';

test('online mini-lesson saves supported attempts and grants the daily floor once',async({page})=>{
 const baseURL=process.env.MINI_LESSON_SITE??'http://127.0.0.1:8829';
 const teacher=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 const student=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 const post=async(client:typeof teacher,path:string,data:unknown)=>{const r=await client.post('/api/pilot/'+path,{data});expect(r.ok(),path).toBe(true);return r.json()};
 const get=async(path:string)=>{const r=await student.get('/api/pilot/'+path);expect(r.ok(),path).toBe(true);return r.json()};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 const teachers=JSON.parse(readFileSync(process.env.MINI_LESSON_TEACHERS??'.pilot-private/test-teachers.json','utf8'));
 await post(teacher,'login',{role:'teacher',code:teachers[1].code});
 await post(teacher,'quick-checks/policy',{cadence:'teacher'});
 await post(teacher,'play-time/policy',{enabled:true,questionsPerRound:5,minutesPerRound:15,classCapMinutes:15,homeCapMinutes:45});
 await post(teacher,'play-time/class',{state:'on'});
 const created=await post(teacher,'teacher/students',{count:1}),card=created.cards[0];
 await post(student,'login',{role:'student',code:card.code,classCode:created.classCode});
 await page.goto(signInLink(baseURL,{role:'student',code:card.code,classCode:created.classCode}));
 await page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name:'Games',exact:true}).click();
 await page.locator('article').filter({has:page.getByRole('heading',{name:'Egg Dash',exact:true})}).getByRole('button',{name:'Start →',exact:true}).click();
 await page.getByRole('button',{name:'Go to Math Practice'}).click();
 for(let round=0;round<2;round++){
 await page.getByRole('button',{name:'Work through it together'}).first().click();
 const d=page.getByRole('dialog');
 for(let i=0;i<8&&await d.getByRole('button',{name:'Next step',exact:true}).count();i++)await d.getByRole('button',{name:'Next step',exact:true}).click();
 await d.getByRole('button',{name:'Let’s try one together'}).click();
 await d.getByLabel('Your answer',{exact:true}).fill('-9999');await d.getByRole('button',{name:'Submit',exact:true}).click();
 await d.getByRole('button',{name:'Try fresh numbers'}).click();
 await d.getByLabel('Your answer',{exact:true}).fill('-9999');await d.getByRole('button',{name:'Submit',exact:true}).click();
 await d.getByRole('button',{name:'Finish my lesson'}).click();
 await d.getByRole('button',{name:'Return to my activity'}).click();
 await expect.poll(async()=>((await get('save')).state.learningEvidence??[]).filter((r:{context:string})=>r.context==='mini-lesson-complete').length,{timeout:20000}).toBe((round+1)*2);
 expect(await get('play-time')).toMatchObject({balanceMs:300000,floorAvailable:false,progress:0});
 }
 const before=(await get('save')).state;
 expect(before.learningEvidence.filter((r:{source:string})=>r.source==='mini-lesson').every((r:{firstAttemptCorrect:boolean;support:string})=>!r.firstAttemptCorrect&&r.support!=='none')).toBe(true);
 await page.reload();await expect(page.getByRole('navigation',{name:'Student menus'})).toBeVisible();
 const after=(await get('save')).state;expect(after.learningEvidence).toEqual(before.learningEvidence);
 expect(after.player.lifetimeMathCorrect).toBe(0);
 expect(errors).toEqual([]);
 }finally{await teacher.dispose();await student.dispose()}
});
