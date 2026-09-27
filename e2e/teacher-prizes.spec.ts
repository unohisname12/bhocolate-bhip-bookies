import {test,expect,request,type APIRequestContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {engineReducer} from '../src/engine/state/engineReducer';
import {generateLearningProblem} from '../src/services/game/curriculum';
const baseURL='http://127.0.0.1:8798';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
async function teacher(index=0){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[index].code}})).status()).toBe(200);return api;}
async function cards(t:APIRequestContext,count=2){const r=await t.post('/api/pilot/teacher/students',{data:{count}});expect(r.status()).toBe(201);const d=await r.json();return d.cards.map((c:{id:string;alias:string;code:string})=>({...c,classCode:d.classCode}));}
async function student(card:{code:string;classCode:string}){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'student',...card}})).status()).toBe(200);return api;}
async function action(api:APIRequestContext,op:string,roomId:string,body:Record<string,unknown>={},requestId=randomUUID()){return api.post(`/api/pilot/parties/${op}`,{data:{roomId,requestId,...body}});}
async function warmup(api:APIRequestContext){const first=await(await api.get('/api/pilot/save')).json();let state=first.state;for(let n=0;n<3;n++){const problem=generateLearningProblem(state.learning);state=engineReducer(state,{type:'SOLVE_MATH',correct:true,difficulty:problem.difficulty,reward:10,problem});}const r=await api.put('/api/pilot/save',{data:{state,revision:first.revision,requestId:randomUUID()}});expect(r.status(),await r.text()).toBe(200);}
async function room(api:APIRequestContext,id:string){const data=await(await api.get('/api/pilot/parties')).json();return data.rooms.find((r:{id:string})=>r.id===id);}
async function signIn(page:Page,c:{code:string;classCode:string}){await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(c.classCode);await page.getByLabel('My secret pet code').fill(c.code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();await page.getByRole('button',{name:/Play with classmates/}).waitFor();}
test('awards are private, replay-safe, noninterrupting and claimed exactly once',async()=>{
 const t=await teacher(),other=await teacher(1),[a,b]=await cards(t),[outsider]=await cards(other,1);
 const aa=await student(a),bb=await student(b);
 const before=await(await aa.get('/api/pilot/save')).json();
 const award={students:[a.id,b.id],prizeId:'random',category:'Egg adventures',requestId:randomUUID()};
 const r=await t.post('/api/pilot/clash/award',{data:award});expect(r.status(),await r.text()).toBe(200);const result=await r.json();
 expect(await(await t.post('/api/pilot/clash/award',{data:award})).json()).toEqual(result);
 expect((await t.post('/api/pilot/clash/award',{data:{...award,prizeId:'gift_tokens_25'}})).status()).toBe(409);
 expect((await t.post('/api/pilot/clash/award',{data:{...award,requestId:randomUUID(),students:[a.id,outsider.id]}})).status()).toBe(404);
 expect((await aa.post('/api/pilot/clash/award',{data:award})).status()).toBe(403);
 expect(await(await aa.get('/api/pilot/save')).json()).toEqual(before);
 const own=await(await aa.get('/api/pilot/clash/gifts')).json();expect(own.grants).toHaveLength(1);expect(own.grants[0].prize_id).toBe('gift_early_hatch');
 const gift=own.grants[0].id;
 expect((await bb.post('/api/pilot/clash/gift-claim',{data:{grantId:gift}})).status()).toBe(404);
 const claims=await Promise.all([aa.post('/api/pilot/clash/gift-claim',{data:{grantId:gift}}),aa.post('/api/pilot/clash/gift-claim',{data:{grantId:gift}})]);expect(claims.map(r=>r.status())).toEqual([200,200]);
 const saved=await(await aa.get('/api/pilot/save')).json();expect(saved.revision).toBe(before.revision+1);expect(saved.state.prizes.earlyHatchPasses).toBe(1);
 expect((await aa.put('/api/pilot/save',{data:{...before,requestId:randomUUID()}})).status()).toBe(409);
 const forged=structuredClone(saved.state);forged.prizes.earlyHatchPasses=2;
 expect((await aa.put('/api/pilot/save',{data:{state:forged,revision:saved.revision,requestId:randomUUID()}})).status()).toBe(403);
 const used=engineReducer(saved.state,{type:'USE_EARLY_HATCH_PASS'});
 expect(used.eggDiscovery.bonusDays).toBe(1);
 const use=await aa.put('/api/pilot/save',{data:{state:used,revision:saved.revision,requestId:randomUUID()}});expect(use.status(),await use.text()).toBe(200);
 await Promise.all([t.dispose(),other.dispose(),aa.dispose(),bb.dispose()]);
});
test('private party prizes apply once at game start and leave the next gift queued',async()=>{
 const t=await teacher(),[a,b]=await cards(t),aa=await student(a),bb=await student(b);
 for(let i=0;i<2;i++){const r=await t.post('/api/pilot/clash/award',{data:{students:[a.id],prizeId:'gift_party_dash_heart',requestId:randomUUID()}});expect(r.status()).toBe(200);const gift=(await r.json()).grants[0];expect((await aa.post('/api/pilot/clash/gift-claim',{data:{grantId:gift.id}})).status()).toBe(200);}
 expect((await(await bb.get('/api/pilot/clash/gifts')).json()).grants).toHaveLength(0);
 const id=(await(await aa.post('/api/pilot/parties/create',{data:{game:'dash'}})).json()).id;
 expect((await action(aa,'invite',id,{studentId:b.id})).status()).toBe(200);expect((await action(bb,'respond',id,{accept:true})).status()).toBe(200);
 await warmup(aa);await warmup(bb);const receipt=randomUUID();const started=await action(aa,'start',id,{},receipt);expect(started.status(),await started.text()).toBe(200);
 const current=await room(bb,id);const members=current.state.members;
 expect(members.find((m:any)=>m.id===a.id).racer.health).toBe(members.find((m:any)=>m.id===b.id).racer.health+2);
 expect(JSON.stringify(current)).not.toContain('gift_party');
 expect((await action(aa,'start',id,{},receipt)).status()).toBe(200);
 expect((await(await aa.get('/api/pilot/clash/gifts')).json()).grants).toHaveLength(1);
 const history=(await(await t.get('/api/pilot/clash/gifts')).json()).grants.filter((g:any)=>g.student_id===a.id);
 expect(history.filter((g:any)=>g.used_at)).toHaveLength(1);
 await Promise.all([t.dispose(),aa.dispose(),bb.dispose()]);
});
test('teacher can filter, preview and award from the catalog in the browser',async({page})=>{
 const t=await teacher(2),[a]=await cards(t,1);
 await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Private teacher key').fill(teachers()[2].code);await page.getByRole('button',{name:'Open teacher classroom',exact:true}).click();
 await expect(page.getByLabel('Selected student',{exact:true}).locator('option:checked')).toHaveText(a.alias);
 await page.screenshot({path:'docs/verification/teacher-modern-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Give an early egg pass',exact:false}).first().click();
 await expect(page.getByRole('region',{name:'How the early egg pass works'})).toBeVisible();
 await expect(page.locator('.teacher-prize-learners').getByLabel(a.alias,{exact:true})).toBeChecked();
 await expect(page.getByLabel('Prize category',{exact:true})).toHaveValue('Egg adventures');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/verification/teacher-modern-gift-phone.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.teacher-prize-picker > summary')).toContainText('276 items');
 await page.locator('.teacher-prize-learners').getByLabel(a.alias,{exact:true}).check();
 await expect(page.getByRole('button',{name:/One-Day-Early Egg Pass/})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.teacher-prize-catalog button')).toHaveCount(1);
 await page.getByRole('button',{name:'Preview prize award',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ready to award'})).toBeVisible();
 await page.getByRole('button',{name:'Award prizes now',exact:true}).click();
 await expect(page.locator('.teacher-prize-picker [role=status]')).toContainText('One-Day-Early Egg Pass');
 await page.screenshot({path:'docs/verification/teacher-modern-gift-sent.png',fullPage:true});
 const aa=await student(a);expect((await(await aa.get('/api/pilot/clash/gifts')).json()).grants).toHaveLength(1);
 await Promise.all([aa.dispose(),t.dispose()]);
});
