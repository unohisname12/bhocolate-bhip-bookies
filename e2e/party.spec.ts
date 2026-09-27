import {test,expect,request,type APIRequestContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {engineReducer} from '../src/engine/state/engineReducer';
import {generateLearningProblem} from '../src/services/game/curriculum';
const baseURL='http://127.0.0.1:8792';
const teachers=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));
async function teacher(index=0){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'teacher',code:teachers()[index].code}})).status()).toBe(200);expect((await api.post('/api/pilot/play-time/policy',{data:{enabled:false}})).status()).toBe(200);return api;}
async function cards(t:APIRequestContext,count=2){const r=await t.post('/api/pilot/teacher/students',{data:{count}});expect(r.status()).toBe(201);const d=await r.json();return d.cards.map((c:{id:string;alias:string;code:string})=>({...c,classCode:d.classCode}));}
async function student(card:{code:string;classCode:string}){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'student',...card}})).status()).toBe(200);return api;}
async function action(api:APIRequestContext,op:string,roomId:string,body:Record<string,unknown>={},requestId=randomUUID()){return api.post(`/api/pilot/parties/${op}`,{data:{roomId,requestId,...body}});}
async function warmup(api:APIRequestContext){const first=await(await api.get('/api/pilot/save')).json();let state=first.state;for(let n=0;n<3;n++){const problem=generateLearningProblem(state.learning);state=engineReducer(state,{type:'SOLVE_MATH',correct:true,difficulty:problem.difficulty,reward:10,problem});}const r=await api.put('/api/pilot/save',{data:{state,revision:first.revision,requestId:randomUUID()}});expect(r.status(),await r.text()).toBe(200);}
async function room(api:APIRequestContext,id:string){const data=await(await api.get('/api/pilot/parties')).json();return data.rooms.find((r:{id:string})=>r.id===id);}
async function signIn(page:Page,c:{code:string;classCode:string}){await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(c.classCode);await page.getByLabel('My secret pet code').fill(c.code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();await page.getByRole('button',{name:/Play with classmates/}).waitFor();}
test('invitations enforce class membership, consent, readiness, host rules, shared state and replay safety',async()=>{
 const t=await teacher(),other=await teacher(1),[a,b,c]=await cards(t,3),[outsider]=await cards(other,1);
 const [aa,bb,cc,oo]=await Promise.all([student(a),student(b),student(c),student(outsider)]);
 const id=(await(await aa.post('/api/pilot/parties/create',{data:{game:'cafe'}})).json()).id;
 expect((await action(aa,'invite',id,{studentId:outsider.id})).status()).toBe(400);
 expect((await action(oo,'invite',id,{studentId:b.id})).status()).toBe(404);
 expect((await action(cc,'move',id,{kind:'serve'})).status()).toBe(403);
 expect((await action(aa,'invite',id,{studentId:b.id})).status()).toBe(200);
 expect((await action(bb,'move',id,{kind:'serve'})).status()).toBe(403);
 expect((await action(bb,'respond',id,{accept:true})).status()).toBe(200);
 expect((await action(aa,'invite',id,{studentId:c.id})).status()).toBe(200);
 expect((await action(cc,'respond',id,{accept:false})).status()).toBe(200);
 expect((await action(cc,'respond',id,{accept:true})).status()).toBe(403);
 expect((await t.get('/api/pilot/parties')).status()).toBe(403);
 expect((await action(aa,'start',id)).status()).toBe(409);
 expect((await action(bb,'start',id)).status()).toBe(403);
 await warmup(aa);await warmup(bb);
 expect((await action(aa,'start',id)).status()).toBe(200);
 const receipt=randomUUID();const stock=(await room(aa,id)).state.run.stock[0];
 expect((await action(aa,'move',id,{kind:'restock',ingredient:0},receipt)).status()).toBe(200);
 expect((await action(aa,'move',id,{kind:'restock',ingredient:0},receipt)).status()).toBe(200);
 expect((await room(bb,id)).state.run.stock[0]).toBe(stock+4);
 const concurrent=await Promise.all([action(aa,'move',id,{kind:'restock',ingredient:1}),action(bb,'move',id,{kind:'restock',ingredient:2})]);
 expect(concurrent.map(r=>r.status())).toEqual([200,200]);
 const shared=await room(bb,id);expect(shared.state.run.stock.slice(1)).toEqual([12,12]);
 expect(shared.state.members.every((m:{baseline:number})=>m.baseline===0)).toBe(true);
 expect(shared.state.receipts).toEqual([]);
 expect((await action(aa,'leave',id)).status()).toBe(200);
 expect((await room(bb,id)).state.host).toBe(b.id);
 expect((await action(aa,'move',id,{kind:'serve'})).status()).toBe(403);
 await Promise.all([t.dispose(),other.dispose(),aa.dispose(),bb.dispose(),cc.dispose(),oo.dispose()]);
});
test('two real browser sessions invite, practice at their levels, share café orders, refresh and finish together',async({browser})=>{
 const t=await teacher(1),[a,b]=await cards(t);
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:1280,height:900}})]);
 const [pa,pb]=await Promise.all(contexts.map(c=>c.newPage()));const errors:string[]=[];for(const p of[pa,pb])p.on('pageerror',e=>errors.push(e.message));
 await signIn(pa,a);await signIn(pb,b);
 await pa.getByRole('button',{name:/Play with classmates/}).click();
 await pa.getByRole('button',{name:'Host Woodland Café Crew',exact:true}).click();
 await pa.getByRole('button',{name:`Invite ${b.alias}`,exact:true}).click();
 await pb.getByRole('button',{name:/Play with classmates/}).click();
 await pb.getByRole('button',{name:'Join Woodland Café Crew',exact:true}).click();
 const aa=await student(a),bb=await student(b);
 // Use the actual practice UI in both browser sessions: teacher-assigned default two-digit arithmetic.
 for(const p of[pa,pb]){
  await p.getByRole('button',{name:/Practice for this room/}).click();
  for(let n=0;n<3;n++){
   const input=p.getByLabel('Your answer',{exact:true});await expect(input).toBeEnabled();
   const question=await p.locator('h2').filter({hasText:/\d+ [−+] \d+/}).first().innerText();
   const match=question.match(/(\d+) ([−+]) (\d+)/)!;const answer=match[2]==='+'?Number(match[1])+Number(match[3]):Number(match[1])-Number(match[3]);
   await input.fill(String(answer));await p.getByRole('button',{name:'Submit',exact:true}).click();
   await expect(p.getByText(/You got it!/)).toBeVisible();
  }
  await p.getByRole('button',{name:/Play with classmates/}).click();
 }
 await expect(pa.getByRole('button',{name:'Start together',exact:true})).toBeEnabled({timeout:15000});
 await pa.getByRole('button',{name:'Start together',exact:true}).click();
 await expect(pb.getByRole('heading',{name:/Team score 0/})).toBeVisible();
 await pa.screenshot({path:'docs/verification/party-cafe-phone.png',fullPage:false});
 expect(await pa.getByRole('dialog',{name:'Play with classmates'}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+20,r.top+20));})).toBe(true);
 const serve=async(p:Page,n:number)=>{
  await p.locator('.party-orders button').nth(n%3).click();
  await expect(p.locator('.party-orders button').nth(n%3)).toHaveAttribute('aria-pressed','true');
  const recipe=await p.locator('.party-orders button[aria-pressed=true] small').innerText();
  for(const emoji of recipe.split(' + ')){
   const name=emoji==='🍓'?'Berries':emoji==='🍞'?'Bread':'Honey';
   const button=p.getByRole('button',{name:new RegExp(`^${name} \\(`)});
   if(/\([012]\)/.test(await button.innerText()))await p.getByRole('button',{name:`Restock ${name} +4`,exact:true}).click();
   await button.click();
  }
  await p.getByRole('button',{name:'Serve with the crew',exact:true}).click();
 };
 for(let n=0;n<9;n++){
  const p=n%2?pb:pa;await serve(p,n);
  if(n===2){await pb.reload();await pb.getByRole('button',{name:/Play with classmates/}).click();}
  if(n<8)await expect((n%2?pa:pb).getByRole('heading',{name:new RegExp(`Orders ${n+1}/9`)})).toBeVisible();
 }
 await expect(pa.getByRole('heading',{name:'You did it together!'})).toBeVisible();await expect(pb.getByRole('heading',{name:'You did it together!'})).toBeVisible();
 await pa.getByRole('button',{name:'Next: Nest Guardians',exact:true}).click();
 await expect(pb.getByRole('heading',{name:'Nest Guardians',exact:true})).toBeVisible();
 await expect(pa.getByRole('button',{name:'Start together',exact:true})).toBeDisabled();
 expect(await pa.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await Promise.all([aa.dispose(),bb.dispose(),t.dispose(),...contexts.map(c=>c.close())]);
});

test('shared defense and same-track racing accept moves from two classmates and retain them across reconnects',async()=>{
 const t=await teacher(2),[a,b]=await cards(t),aa=await student(a),bb=await student(b);
 for(const game of ['guard','dash']){
  const id=(await(await aa.post('/api/pilot/parties/create',{data:{game}})).json()).id;
  expect((await action(aa,'invite',id,{studentId:b.id})).status()).toBe(200);
  expect((await action(bb,'respond',id,{accept:true})).status()).toBe(200);
  await warmup(aa);await warmup(bb);expect((await action(aa,'start',id)).status()).toBe(200);
  if(game==='guard'){
   expect((await action(aa,'move',id,{kind:'wave'})).status()).toBe(409);
   await action(aa,'move',id,{kind:'build',slot:0,tower:'rapid'});await action(bb,'move',id,{kind:'build',slot:1,tower:'frost'});
   expect((await room(bb,id)).state.run.towers).toEqual(['rapid','frost',null]);
   await action(aa,'move',id,{kind:'wave'});
   await expect.poll(async()=>(await room(bb,id)).state.run.step,{timeout:5000}).toBeGreaterThan(0);
  }else{
   await action(aa,'move',id,{kind:'lane',lane:0});await action(bb,'move',id,{kind:'lane',lane:2});
   const reconnect=await student(b),shared=await room(reconnect,id);
   expect(shared.state.members.map((m:{racer:{lane:number}})=>m.racer.lane)).toEqual([0,2]);
   expect(shared.state.members[0].racer.seed).toBe(shared.state.members[1].racer.seed);
   await expect.poll(async()=>(await room(reconnect,id)).state.beat,{timeout:8000}).toBeGreaterThan(0);
   await reconnect.dispose();
  }
  await action(aa,'leave',id);await action(bb,'leave',id);
 }
 await Promise.all([t.dispose(),aa.dispose(),bb.dispose()]);
});
