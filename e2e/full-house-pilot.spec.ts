import {test,expect,request} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {preparePlaytestPet} from '../scripts/playtest-pets';
import {signInLink} from '../src/pilot/signInLinks';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import {createHomeBase} from '../src/features/home-base/model';
import type {EngineState} from '../src/types/engine';
test('old online home upgrades, travels and survives a fresh sign-in without losing furniture or currency',async({page,browser})=>{
 const baseURL='http://127.0.0.1:8830';const teacher=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}}),student=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 const post=async(client:typeof teacher,path:string,data:unknown)=>{const r=await client.post('/api/pilot/'+path,{data});expect(r.ok(),`${path}: ${r.status()} ${await r.text()}`).toBe(true);return r.json()};
 try{
 const teachers=JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));await post(teacher,'login',{role:'teacher',code:teachers[0].code});await post(teacher,'quick-checks/policy',{cadence:'teacher'});
 const created=await post(teacher,'teacher/students',{count:1}),card=created.cards[0];await post(student,'login',{role:'student',code:card.code,classCode:created.classCode});
 const before=await(await student.get('/api/pilot/save')).json(),state=preparePlaytestPet(before.state as EngineState,true);state.player.lastLoginDate=new Date().toISOString().slice(0,10);
 const den=createHomeBase(state).rooms.den!;den.wall='rose';den.items[0].finish='ocean';state.homeBase={activeRoom:'den',rooms:{den},owned:[]};
 await post(teacher,`teacher/students/${card.id}/restore`,{revision:before.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:CURRENT_SAVE_VERSION,state}});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});const link=signInLink(baseURL,{role:'student',code:card.code,classCode:created.classCode});await page.goto(link);
 await page.getByRole('button',{name:'Explore my house',exact:false}).click();await expect(page.getByTestId('living-house')).toBeVisible();
 await page.getByRole('navigation',{name:'Look into a room'}).getByRole('button',{name:/Upstairs nook/}).click();await page.getByRole('button',{name:/Come here,/}).click();await expect(page.getByTestId('resident-status')).toContainText('Keeping you company',{timeout:40000});
 await expect.poll(async()=>{const s=await(await student.get('/api/pilot/save')).json();return s.state.homeBase?.resident?.roomId;}).toBe('landing');
 const saved=await(await student.get('/api/pilot/save')).json();expect(saved.state.homeBase.houseVersion).toBe(1);expect(saved.state.homeBase.rooms.den).toEqual(den);expect(saved.state.player.currencies).toEqual(state.player.currencies);
 await page.close();const fresh=await browser.newContext({viewport:{width:1366,height:900}});const p=await fresh.newPage();await p.goto(link);await p.getByRole('button',{name:'Explore my house',exact:false}).click();await expect(p.getByTestId('house-resident')).toHaveAttribute('data-room','landing');await p.screenshot({path:'docs/verification/full-house-online.png',fullPage:true});await fresh.close();expect(errors).toEqual([]);
 }finally{await teacher.dispose();await student.dispose()}
});
