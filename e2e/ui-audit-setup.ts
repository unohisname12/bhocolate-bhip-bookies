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
export async function setup(page:Page,modify?:(s:EngineState)=>EngineState){
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
export const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:'Student menus'}).getByRole('button',{name,exact:true});
export async function saved(s:APIRequestContext){return (await(await s.get('/api/pilot/save')).json()).state as EngineState;}
