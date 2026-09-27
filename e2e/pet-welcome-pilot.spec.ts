import {test,expect,request} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {preparePlaytestPet} from '../scripts/playtest-pets';
import {signInLink} from '../src/pilot/signInLinks';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
import type {EngineState} from '../src/types/engine';
test('online hatch and Subtrak assignment persist; Home shows pet and keeps old companion',async({page})=>{
 const baseURL='http://127.0.0.1:8829';const teacher=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});const student=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});
 const post=async(client:typeof teacher,path:string,data:unknown)=>{const r=await client.post('/api/pilot/'+path,{data});expect(r.ok(),`${path}: ${r.status()}`).toBe(true);return r.json()};
 try{
 const teachers=JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));await post(teacher,'login',{role:'teacher',code:teachers[0].code});await post(teacher,'quick-checks/policy',{cadence:'teacher'});
 const created=await post(teacher,'teacher/students',{count:1}),card=created.cards[0];await post(student,'login',{role:'student',code:card.code,classCode:created.classCode});
 const before=await(await student.get('/api/pilot/save')).json();before.state.eggDiscovery.teacherChoice='koala_sprite';const hatch=preparePlaytestPet(before.state as EngineState);await post(teacher,`teacher/students/${card.id}/restore`,{revision:before.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:CURRENT_SAVE_VERSION,state:hatch}});
 let saved=await(await student.get('/api/pilot/save')).json();expect(saved.state.pet).toBeTruthy();expect(saved.state.egg).toBeNull();
 expect(saved.state.player.currencies).toEqual(before.state.player.currencies);
 const dre=preparePlaytestPet(saved.state,true);dre.player.lastLoginDate=new Date().toISOString().slice(0,10);await post(teacher,`teacher/students/${card.id}/restore`,{revision:saved.revision,confirm:'RESTORE',backup:{studentId:card.id,saveVersion:CURRENT_SAVE_VERSION,state:dre}});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto(signInLink(baseURL,{role:'student',code:card.code,classCode:created.classCode}));
 await expect(page.getByRole('button',{name:'Say hello to Subtrak'})).toBeVisible();await expect(page.locator('.student-companion-egg')).toHaveCount(0);await page.getByRole('button',{name:'Say hello to Subtrak'}).click();await expect(page.getByRole('status').filter({hasText:'Subtrak:'})).toBeVisible();
 await expect.poll(async()=>{const save=await(await student.get('/api/pilot/save')).json();return save.state.pet?.mind?.life?.said?.some((s:{key:string})=>s.key.startsWith('welcome:'))??false;}).toBe(true);
 await page.reload();await expect(page.getByRole('button',{name:'Say hello to Subtrak'})).toBeVisible();saved=await(await student.get('/api/pilot/save')).json();expect(saved.state.pet.speciesId).toBe('subtrak');expect(saved.state.pet.mind.life.episodes.some((e:{kind:string})=>e.kind==='hatched')).toBe(true);await page.waitForTimeout(700);await expect(page.locator('.student-companion-greeting')).toHaveCount(0);expect(saved.state.companionRoster).toHaveLength(1);expect(saved.state.player.currencies).toEqual(before.state.player.currencies);expect(errors).toEqual([]);
 }finally{await teacher.dispose();await student.dispose()}
});
