import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { hatchEgg } from '../src/services/game/evolutionEngine';
import { computeChecksum } from '../src/services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION } from '../src/services/persistence/saveMigrations';
import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { engineReducer } from '../src/engine/state/engineReducer';
import { generateLearningProblem } from '../src/services/game/curriculum';
import { DEFAULT_RULES, type DeliveryData } from '../src/features/delivery/model';
const baseURL='http://127.0.0.1:8798';
async function teacher(index=0){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});const ts=JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'));expect((await api.post('/api/pilot/login',{data:{role:'teacher',code:ts[index].code}})).status()).toBe(200);expect((await api.post('/api/pilot/play-time/policy',{data:{enabled:false}})).status()).toBe(200);return api;}
async function cards(t:APIRequestContext,count=2){const r=await t.post('/api/pilot/teacher/students',{data:{count}});expect(r.status()).toBe(201);const d=await r.json();return d.cards.map((c:{id:string;alias:string;code:string})=>({...c,classCode:d.classCode})) as {id:string;alias:string;code:string;classCode:string}[];}
async function student(card:{code:string;classCode:string}){const api=await request.newContext({baseURL,extraHTTPHeaders:{'X-Pilot-Request':'1'}});expect((await api.post('/api/pilot/login',{data:{role:'student',...card}})).status()).toBe(200);return api;}
async function act(api:APIRequestContext,op:string,roomId:string,body:Record<string,unknown>={},requestId=randomUUID()){return api.post(`/api/pilot/delivery/${op}`,{data:{roomId,requestId,...body}});}
async function city(api:APIRequestContext,id:string){const r=await api.get('/api/pilot/delivery');expect(r.status(),await r.text()).toBe(200);const data:DeliveryData=await r.json();return data.rooms.find(r=>r.id===id)!.state;}
async function practice(api:APIRequestContext,n=2){const first=await(await api.get('/api/pilot/save')).json();let state=first.state;for(let i=0;i<n;i++){const p=generateLearningProblem(state.learning);state=engineReducer(state,{type:'SOLVE_MATH',correct:true,difficulty:p.difficulty,reward:p.reward,problem:p,source:'practice'});}const r=await api.put('/api/pilot/save',{data:{state,revision:first.revision,requestId:randomUUID()}});expect(r.status(),await r.text()).toBe(200);}
async function create(api:APIRequestContext,body:Record<string,unknown>={}){const r=await act(api,'create','',{rules:{...DEFAULT_RULES,format:'duel',computers:0,mode:'rivals',market:false,events:false,length:'campaign',rounds:12,minutes:0},...body});expect(r.status(),await r.text()).toBe(200);return(await r.json()).id as string;}
const order={destination:0,route:'direct',bid:0,partner:'',perk:''};
test('duel: readiness, secrecy, atomic orders, reward authority, replay and saved campaign',async()=>{
 const t=await teacher(),other=await teacher(1),[a,b,c]=await cards(t,3),[outsider]=await cards(other,1);
 const aa=await student(a),bb=await student(b),cc=await student(c),oo=await student(outsider);
 const id=await create(aa);
 expect((await act(oo,'join',id)).status()).toBe(404);
 expect((await act(bb,'join',id)).status()).toBe(200);
 expect((await act(cc,'join',id)).status()).toBe(409);
 expect((await act(bb,'start',id)).status()).toBe(403);
 expect((await act(t,'start',id)).status()).toBe(200);
 expect((await act(aa,'submit',id,{round:1,order})).status()).toBe(400);
 expect((await act(aa,'award',id,{targets:[a.id],reward:'van'})).status()).toBe(403);
 const rewardReceipt=randomUUID();
 expect((await act(t,'award',id,{targets:[a.id],reward:'insurance'},rewardReceipt)).status()).toBe(200);
 expect((await act(t,'award',id,{targets:[a.id],reward:'insurance'},rewardReceipt)).status()).toBe(200);
 expect((await city(aa,id)).players[0].perks.insurance).toBe(1);
 expect((await act(other,'award',id,{targets:[a.id],reward:'van'})).status()).toBe(404);
 expect((await act(t,'mission',id,{targets:[a.id,b.id],reward:'van',goal:2})).status()).toBe(200);
 await practice(aa); await practice(bb);
 const ready=await city(aa,id);expect(ready.players[0].perks.van).toBe(1);expect(ready.mission?.completed).toHaveLength(2);
 const receipt=randomUUID();expect((await act(aa,'submit',id,{round:1,order:{...order,perk:'insurance'}},receipt)).status()).toBe(200);
 const hidden=await city(bb,id);expect(hidden.players[0].order).toBeNull();expect(hidden.players[0].submitted).toBe(true);
 expect((await act(bb,'submit',id,{round:1,order:{...order,bid:2}})).status()).toBe(200);
 let s=await city(aa,id);expect(s.round).toBe(2);expect(s.players[0].score).toBe(5);expect(s.players[0].perks.insurance).toBe(0);const score=s.players[0].score;
 expect((await act(aa,'submit',id,{round:1,order:{...order,perk:'insurance'}},receipt)).status()).toBe(200);
 expect((await city(aa,id)).players[0].score).toBe(score);
 expect((await act(aa,'submit',id,{round:1,order})).status()).toBe(409);
 const rejoined=await student(a);s=await city(rejoined,id);expect(s.round).toBe(2);expect(s.deadline).toBe(0);
 await practice(aa);await practice(bb);
 const replies=await Promise.all([act(aa,'submit',id,{round:2,order}),act(bb,'submit',id,{round:2,order:{...order,destination:1}})]);for(const r of replies)expect(r.status(),await r.text()).toBe(200);
 expect((await city(aa,id)).round).toBe(3);
});
test('ten real crews fit a group city and the eleventh cannot enter',async()=>{
 const t=await teacher(2),roster=await cards(t,11),apis=[];
 for(const card of roster)apis.push(await student(card));
 const id=await create(apis[0],{rules:{...DEFAULT_RULES,format:'group',computers:0}});
 for(let i=1;i<10;i++)expect((await act(apis[i],'join',id)).status()).toBe(200);
 expect((await act(apis[10],'join',id)).status()).toBe(409);
 expect((await act(t,'start',id)).status()).toBe(200);expect((await city(apis[0],id)).players).toHaveLength(10);
});
async function signin(page:Page,card:{code:string;classCode:string}){await page.goto('/');await page.getByLabel('Class code',{exact:true}).fill(card.classCode);await page.getByLabel('My secret pet code').fill(card.code);await page.getByRole('button',{name:'Visit my pet',exact:true}).click();await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Play Delivery Districts →',exact:true}).click();}
async function section(page:Page,name:string){await page.getByRole('navigation',{name:'City sections'}).getByRole('button',{name,exact:true}).click();}
async function solveBriefing(page:Page){await page.getByRole('button',{name:'Complete math briefing',exact:true}).click();for(let i=0;i<2;i++){
 await page.getByRole('button',{name:'Show a hint',exact:true}).click();await page.getByRole('button',{name:'Explain the answer',exact:true}).click();const answer=await page.getByRole('region',{name:'Worked explanation'}).locator('strong').last().innerText();await page.getByLabel('Your answer',{exact:true}).fill(answer.replace('Answer: ',''));await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByText('Correct! Your practice counts.',{exact:true})).toBeVisible();if(i===0)await page.getByRole('button',{name:'Next question / extra practice'}).click();}
 if(await page.getByTestId('cloud-save-status').count())await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');await page.getByRole('button',{name:'Return to city & save practice',exact:true}).click();await expect(page.locator('.dispatch-readiness')).toContainText('BRIEFING READY',{timeout:15000});}
test('phone and desktop: two learners solve math, send pets, resume; teacher awards a perk',async({browser})=>{
 const t=await teacher(),[a,b]=await cards(t),aa=await student(a),id=await create(aa);
 const roster=await(await t.get('/api/pilot/teacher/classroom')).json();const learner=roster.students.find((s:{id:string})=>s.id===b.id);expect((await t.post(`/api/pilot/teacher/students/${b.id}/settings`,{data:{settingsVersion:learner.settingsVersion,learning:{...learner.learning,grade:9,topic:'Quadratic equations'},assignment:learner.assignment,requestId:randomUUID()}})).status()).toBe(200);
 const ca=await browser.newContext({viewport:{width:390,height:844}}),cb=await browser.newContext();const pa=await ca.newPage(),pb=await cb.newPage();const errors:string[]=[];pa.on('pageerror',e=>errors.push(e.message));pb.on('pageerror',e=>errors.push(e.message));
 await signin(pa,a);await pa.getByRole('button',{name:'Open city',exact:true}).first().click();
 await signin(pb,b);await pb.getByRole('button',{name:'Open city',exact:true}).first().click();await pb.getByRole('button',{name:'Join this city',exact:true}).click();
 await pa.getByRole('button',{name:'Start deliveries',exact:true}).click();
 await expect(pb.getByRole('heading',{name:'Plan your delivery',exact:true})).toBeVisible();
 await solveBriefing(pa);await solveBriefing(pb);
 await pa.getByRole('button',{name:'Seal delivery order',exact:true}).click();await expect(pa.getByRole('heading',{name:'Orders sealed. Watch the city.',exact:true})).toBeVisible();
 await pb.getByRole('button',{name:'Seal delivery order',exact:true}).click();await expect(pa.getByText('Round 2/12',{exact:true})).toBeVisible();
 await expect(pa.locator('.city-car')).toHaveCount(2);expect(await pa.locator('.delivery').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await expect(pa.locator('.city-car').first()).toHaveAttribute('data-node','0');
 await pa.screenshot({path:'docs/verification/delivery-duel-phone.png',fullPage:true});
 await pa.reload();await pa.getByRole('button',{name:'Games',exact:true}).click();await pa.getByRole('button',{name:'Play Delivery Districts →',exact:true}).click();await pa.getByRole('button',{name:'Open city',exact:true}).first().click();await expect(pa.getByText('Round 2/12',{exact:true})).toBeVisible();
 expect((await act(t,'award',id,{targets:[a.id],reward:'express'})).status()).toBe(200);await expect(pa.getByLabel('Use one teacher perk').locator('option[value=express]')).toHaveText('Express Pass (1)');
 expect(errors).toEqual([]);await ca.close();await cb.close();
});

test('teacher can create a duel, remix rules, set a math mission and award a perk from Classroom Clash',async({browser})=>{
 const t=await teacher(),[a,b]=await cards(t),bb=await student(b);
 const context=await browser.newContext({storageState:await t.storageState()});const page=await context.newPage();await page.goto('/');
 await page.getByRole('button',{name:'Class activities Play & learn together'}).click();
 await page.getByText('🚚 Delivery Districts · duels, city remixes & math rewards',{exact:true}).click();
 const panel=page.locator('.delivery-teacher-panel');await panel.getByLabel('First student / host').selectOption(a.id);
 await panel.getByRole('combobox',{name:'Game rules',exact:true}).selectOption('rivals');
 await panel.getByRole('button',{name:'Create classroom city',exact:true}).click();
 await expect(panel.locator(':scope > p[role="status"]')).toContainText('City created');const id=await panel.getByRole('combobox',{name:'Open city',exact:true}).inputValue();
 expect((await act(bb,'join',id)).status()).toBe(200);
 await panel.getByRole('button',{name:'Start classroom deliveries',exact:true}).click();await expect(panel.locator(':scope > p[role="status"]')).toContainText('Deliveries started');
 await panel.getByRole('button',{name:'Select all city students',exact:true}).click();await panel.getByRole('combobox',{name:'Reward',exact:true}).selectOption('van');
 await panel.getByRole('button',{name:'Award now for math already completed',exact:true}).click();await expect(panel.locator(':scope > p[role="status"]')).toContainText('Reward delivered');
 await panel.getByLabel('New correct answers per student').fill('3');await panel.getByRole('button',{name:'Set math mission',exact:true}).click();await expect(panel.locator(':scope > p[role="status"]')).toContainText('Math mission set');
 const s=await city(t,id);expect(s.players.every(p=>p.perks.van===1)).toBe(true);expect(s.mission?.goal).toBe(3);
 await page.screenshot({path:'docs/verification/delivery-teacher.png',fullPage:true});await context.close();
});

test('standalone solo uses the actual saved pet and resumes a campaign after refresh',async({page})=>{
 const state=createInitialEngineState();state.eggDiscovery=undefined;state.pet=hatchEgg({id:'test-egg',type:'ember_fox',state:'ready',progress:100,createdAt:new Date().toISOString()});state.player.activePetId=state.pet!.id;state.screen='play';state.learning={...state.learning,grade:8,topic:'Linear equations'};
 const payload=JSON.stringify({version:CURRENT_SAVE_VERSION,timestamp:Date.now(),state,checksum:computeChecksum(state)});
 await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},payload);
 await page.goto('http://127.0.0.1:8800');await page.getByRole('button',{name:'Play Delivery Districts →',exact:true}).click();
 await page.getByRole('combobox',{name:'Match length',exact:true}).selectOption('campaign');await page.getByRole('button',{name:'Start solo city',exact:true}).click();await page.getByRole('button',{name:'Start deliveries',exact:true}).click();
 await expect(page.locator('.car-pet [data-pet-species="ember_fox"]')).toBeVisible();
 await page.getByRole('button',{name:'New courier? Learn to play',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Next →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Get your pet ready',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close how to play',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:/Deliver to .*base points/}).nth(1).click();
 await expect(page.getByLabel('Delivery destination',{exact:true})).toHaveValue('1');
 await expect(page.getByRole('button',{name:'Complete math briefing',exact:true})).toBeVisible();
 await page.getByLabel('Delivery destination',{exact:true}).selectOption('0');
 await expect(page.locator('.town-art')).toBeVisible();
 expect(await page.locator('.town-art').evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(1000);

 await solveBriefing(page);await page.getByText('More options · route, tools & partners',{exact:true}).click();await page.getByRole('combobox',{name:'Route',exact:true}).selectOption('scenic');await page.getByRole('button',{name:'Seal delivery order',exact:true}).click();await expect(page.getByText('Round 2/12',{exact:true})).toBeVisible();
 await expect(page.locator('.city-car').first()).toHaveAttribute('data-node','0');await page.screenshot({path:'docs/verification/delivery-solo-pet.png',fullPage:true});
 await page.reload();await expect(page.getByText('Round 2/12',{exact:true})).toBeVisible();await expect(page.locator('.car-pet [data-pet-species="ember_fox"]')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state.player.lifetimeMathCorrect)).toBe(2);
});

test('delivery ambush: classroom battle survives refresh, rejects forged rewards, charges retreat once, then detours', async ({ browser }) => {
  const t = await teacher(), [a] = await cards(t, 1), aa = await student(a);
  const saved = await (await aa.get('/api/pilot/save')).json();
  saved.state.eggDiscovery = undefined;
  saved.state.pet = hatchEgg({ id: 'ambush-egg', type: 'ember_fox', state: 'ready', progress: 100, createdAt: new Date().toISOString() });
  saved.state.player.activePetId = saved.state.pet.id;
  saved.state.pet.ownerId = a.id;
  saved.state.screen = 'home';
  const { execFileSync } = await import('node:child_process');
  const stored = JSON.stringify({ version: CURRENT_SAVE_VERSION, state: saved.state }).replaceAll("'", "''");
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', '--local', '--persist-to', '.wrangler/pilot-test-state', '--command', `UPDATE students SET state_json='${stored}',revision=revision+1,request_id='${randomUUID()}',updated_at=${Date.now()} WHERE id='${a.id}'`], { stdio: 'pipe' });
  const id = await create(aa, { rules: { ...DEFAULT_RULES, format: 'solo', computers: 1, length: 'campaign', rounds: 12, minutes: 0, events: false } });
  expect((await act(aa, 'start', id)).status()).toBe(200);
  await practice(aa);
  // Seed a deterministic encounter in the isolated local test database only.
  const event = JSON.stringify({ kind: 'ambush', a: 0, b: 1, title: 'ROUTE AMBUSH', text: 'A rogue courier blocks Pip’s Bakery. Fight, detour, or teleport.' });
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', '--local', '--persist-to', '.wrangler/pilot-test-state', '--command', `UPDATE delivery_rooms SET state_json=json_set(state_json,'$.event',json('${event}')),revision=revision+1 WHERE id='${id}'`], { stdio: 'pipe' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await aa.storageState() });
  const page = await ctx.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Games', exact: true }).click();
  await page.getByRole('button', { name: 'Play Delivery Districts →', exact: true }).click();
  await page.getByRole('button', { name: 'Open city', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Seal delivery order', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Fight route ambush', exact: true }).click();
  await expect(page.getByText('Delivery ambush · Pip’s Bakery', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /FOCUS/ })).toBeVisible();
  await page.getByRole('button', { name: /FOCUS/ }).click();
  await expect.poll(async () => (await city(aa, id)).players[0].ambush!.battle.turnCount).toBeGreaterThan(0);
  const first = (await city(aa, id)).players[0].ambush!;
  expect((await act(aa, 'ambush', id, { round: 1, action: { type: 'MATH_BONUS_CORRECT' } })).status()).toBe(400);
  expect((await act(aa, 'ambush', id, { round: 1, action: { type: 'END_BATTLE' } })).status()).toBe(400);
  expect((await act(aa, 'ambush', id, { round: 2, action: 'start' })).status()).toBe(409);
  await page.reload(); await page.getByRole('button', { name: 'Games', exact: true }).click();
  await page.getByRole('button', { name: 'Play Delivery Districts →', exact: true }).click();
  await page.getByRole('button', { name: 'Open city', exact: true }).click();
  await expect(page.getByText('Delivery ambush · Pip’s Bakery', { exact: true })).toBeVisible();
  expect((await city(aa, id)).players[0].ambush).toEqual(first);
  await page.screenshot({ path: 'docs/verification/delivery-ambush-phone.png', fullPage: true });
  const retreatResponse = page.waitForResponse(r => r.url().endsWith('/delivery/ambush') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Retreat to city (−3 coins)', exact: true }).click();
  const retreatReceipt = (await retreatResponse).request().postDataJSON().requestId;
  expect((await act(aa, 'ambush', id, { round: 1, action: { type: 'FLEE_BATTLE' } }, retreatReceipt)).status()).toBe(200);
  await expect(page.getByText('Ambush ended: −3 match coins. Take a scenic detour, teleport, or choose another customer.', { exact: true })).toBeVisible();
  expect((await city(aa, id)).players[0].score).toBe(-3);
  const receipt = randomUUID();
  expect((await act(aa, 'ambush', id, { round: 1, action: { type: 'FLEE_BATTLE' } }, receipt)).status()).toBe(400);
  expect((await city(aa, id)).players[0].score).toBe(-3);
  await page.getByRole('button', { name: 'Take scenic detour', exact: true }).click();
  await page.getByRole('button', { name: 'Seal delivery order', exact: true }).click();
  await expect(page.getByText('Round 2/12', { exact: true })).toBeVisible();
  const after = await (await aa.get('/api/pilot/save')).json();
  expect(after.state.pet.id).toBe(saved.state.pet.id);
  expect(errors).toEqual([]); await ctx.close();
});

test('strategy board: private loot, public route stealing, counteroffers, hired courier, wager and teacher level control',async({browser})=>{
  test.setTimeout(180000);
  const t=await teacher(),[a,b]=await cards(t),aa=await student(a),bb=await student(b);
  const id=await create(aa,{rules:{...DEFAULT_RULES,format:'duel',computers:0,mode:'rivals',length:'campaign',rounds:12,minutes:0,market:true,events:false,contracts:false,demand:false}});
  expect((await act(bb,'join',id)).status()).toBe(200);expect((await act(aa,'start',id)).status()).toBe(200);
  await practice(aa);await practice(bb);
  const initial=await city(aa,id);expect(Object.values(initial.players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(3);
  expect(initial.players[1].inventory).toBeUndefined();
  const ac=await browser.newContext({viewport:{width:1440,height:1000},storageState:await aa.storageState()}),bc=await browser.newContext({viewport:{width:390,height:844},storageState:await bb.storageState()});
  const ap=await ac.newPage(),bp=await bc.newPage(),errors:string[]=[], failedRequests:string[]=[], saveStatuses=new Map<Page,number[]>();
  for(const page of [ap,bp]){saveStatuses.set(page,[]);page.on('response',r=>{if(r.status()>=500)failedRequests.push(new URL(r.url()).pathname);if(new URL(r.url()).pathname==='/api/pilot/save'&&r.request().method()==='PUT')saveStatuses.get(page)!.push(r.status());});page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});await page.goto('/');await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Play Delivery Districts →',exact:true}).click();await page.getByRole('button',{name:'Open city',exact:true}).click();}
  await section(ap,'Rivals');await section(bp,'Rivals');
  await expect(ap.getByRole('region',{name:'Crew intelligence',exact:true})).toContainText(b.alias);
  await expect(bp.getByRole('region',{name:'Route market',exact:true})).toBeVisible();
  await section(ap,'Items');await section(bp,'Play');
  await expect(ap.getByText('Saved online',{exact:true})).toBeVisible();
  await ap.getByRole('button',{name:'Open math supply crate · 2 items',exact:true}).click();
  await expect(ap.getByRole('button',{name:'Supply crate opened this round',exact:true})).toBeDisabled();
  const equipped=Object.keys((await city(aa,id)).players[0].inventory!)[0];
  const {lootItem}=await import('../src/features/delivery/items');
  await ap.getByRole('button',{name:`Equip ${lootItem(equipped)!.name}`,exact:true}).click();
  await section(ap,'Play');
  await ap.getByRole('spinbutton',{name:'Your sealed customer price',exact:true}).fill('10');
  await bp.getByLabel('Delivery destination',{exact:true}).selectOption('1');await bp.getByRole('spinbutton',{name:'Your sealed customer price',exact:true}).fill('8');
  await ap.screenshot({path:'docs/verification/delivery-strategy-desktop.png',fullPage:true});await bp.screenshot({path:'docs/verification/delivery-strategy-phone.png',fullPage:true});
  expect(await bp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await ap.getByRole('button',{name:'Seal delivery order',exact:true}).click();await expect(bp.getByTestId('cloud-save-status')).toHaveText('Saved online');await bp.getByRole('button',{name:'Seal delivery order',exact:true}).click();
  await expect(ap.getByText('Round 2/12',{exact:true})).toBeVisible({timeout:15000});await expect(bp.getByText('Round 2/12',{exact:true})).toBeVisible();
  await section(bp,'Results');
  await expect(bp.getByRole('region',{name:'Round profit report',exact:true})).toContainText('Did your choices pay off?');
  await section(bp,'Play');await solveBriefing(ap);await solveBriefing(bp);
  await section(bp,'Rivals');
  await bp.getByRole('button',{name:'Challenge route to Pip’s Bakery',exact:true}).click();
  await expect(bp.getByRole('spinbutton',{name:'Your sealed customer price',exact:true})).toHaveValue('9');
  await ap.getByLabel('Delivery destination',{exact:true}).selectOption('1');await ap.getByRole('spinbutton',{name:'Your sealed customer price',exact:true}).fill('8');
  await expect(ap.getByRole('button',{name:'Seal delivery order',exact:true})).toBeEnabled();await expect(bp.getByRole('button',{name:'Seal delivery order',exact:true})).toBeEnabled();
  await ap.getByRole('button',{name:'Seal delivery order',exact:true}).click();await expect(bp.getByTestId('cloud-save-status')).toHaveText('Saved online');await bp.getByRole('button',{name:'Seal delivery order',exact:true}).click();
  await expect(bp.getByText('Round 3/12',{exact:true})).toBeVisible();expect((await city(aa,id)).owners![0]).toBe(b.id);
  await section(bp,'Results');
  await expect(bp.getByRole('region',{name:'Round profit report',exact:true})).toContainText('poached');
  await section(bp,'Play');await solveBriefing(ap);await solveBriefing(bp);expect((await act(t,'award',id,{targets:[b.id],reward:'teleport'})).status()).toBe(200);
  await section(ap,'Deals');await section(bp,'Deals');
  await ap.getByRole('combobox',{name:'Talk to crew',exact:true}).selectOption(b.id);
  await ap.getByRole('button',{name:'Ask about their tools',exact:true}).click();
  await bp.getByRole('combobox',{name:'Your public tool claim',exact:true}).selectOption('teleport');await bp.getByRole('button',{name:'Send my tool claim',exact:true}).click();
  await expect(ap.getByRole('list',{name:'Public driver radio',exact:true})).toContainText('teleport equipment');
  await ap.getByRole('spinbutton',{name:'Courier payment',exact:true}).fill('4');await ap.getByRole('button',{name:'Offer job to selected crew',exact:true}).click();
  await bp.getByRole('spinbutton',{name:`Counteroffer to ${a.alias}`,exact:true}).fill('5');await bp.getByRole('button',{name:'Send counteroffer',exact:true}).click();
  await ap.getByRole('button',{name:'Accept counteroffer',exact:true}).click();
  await bp.getByRole('combobox',{name:`Tool claim for ${a.alias}`,exact:true}).selectOption('teleport');await bp.getByRole('button',{name:'Plan this subcontract',exact:true}).click();
  await bp.getByText('More options · route, tools & partners',{exact:true}).click();
  await bp.getByRole('combobox',{name:'Use one teacher perk',exact:true}).selectOption('teleport');
  await expect(bp.getByTestId('cloud-save-status')).toHaveText('Saved online');await bp.getByRole('button',{name:'Seal delivery order',exact:true}).click();
  await section(ap,'Play');
  await expect(ap.getByText(/Courier reserved:/)).toBeVisible({timeout:15000});await ap.getByRole('spinbutton',{name:'Your sealed customer price',exact:true}).fill('8');await ap.getByRole('button',{name:'Seal delivery order',exact:true}).click();
  await expect(ap.getByText('Round 4/12',{exact:true})).toBeVisible();
  const paid=await city(t,id);expect(paid.trips.find(r=>r.id===a.id)).toMatchObject({income:8,cost:5,points:3});expect(paid.trips.find(r=>r.id===b.id)).toMatchObject({income:5,cost:0,points:5});
  const before=Object.values(paid.players[0].inventory!).reduce((n,v)=>n+v,0);
  await section(ap,'Items');
  await ap.getByRole('button',{name:'Stake item & start 60-second question',exact:true}).click();
  await expect(ap.getByRole('timer',{name:'Challenge time remaining',exact:true})).toBeVisible();
  const challenge=(await city(t,id)).players[0].challenge!;
  expect((await city(aa,id)).players[0].challenge!.problem.answer).toBe(0);
  await ap.getByRole('textbox',{name:'Your wager answer',exact:true}).fill(String(challenge.problem.answer));await ap.getByRole('button',{name:'Submit wager answer · final',exact:true}).click();
  await expect(ap.getByText(/Challenge won! Received/)).toBeVisible();expect(Object.values((await city(t,id)).players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(before+1);
  const tc=await browser.newContext({storageState:await t.storageState()}),tp=await tc.newPage();await tp.goto('/');await tp.getByRole('button',{name:'Class activities Play & learn together'}).click();await tp.getByText('🚚 Delivery Districts · duels, city remixes & math rewards',{exact:true}).click();
  const panel=tp.locator('.delivery-teacher-panel');await panel.getByRole('combobox',{name:'Open city',exact:true}).selectOption(id);
  await expect(tp.getByRole('region',{name:'Delivery challenge progress',exact:true})).toContainText('1/1 successful wagers');
  await tp.getByRole('combobox',{name:`Math grade for ${a.alias}`,exact:true}).selectOption('6');await tp.getByRole('button',{name:`Save math level for ${a.alias}`,exact:true}).click();
  await expect.poll(async()=>{const roster=await(await t.get('/api/pilot/teacher/classroom')).json();return roster.students.find((s:{id:string})=>s.id===a.id).learning.grade;}).toBe(6);
  await panel.getByRole('button',{name:'Select all city students',exact:true}).click();await panel.getByRole('combobox',{name:'Reward',exact:true}).selectOption('supply');await panel.getByRole('combobox',{name:'Reward bundle',exact:true}).selectOption('5');
  const oldTotal=Object.values((await city(t,id)).players[0].inventory!).reduce((n,v)=>n+v,0);
  await panel.getByRole('button',{name:'Award now for math already completed',exact:true}).click();await expect(panel.locator(':scope > p[role="status"]')).toContainText('Reward delivered');
  expect(Object.values((await city(t,id)).players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(oldTotal+10);
  await tp.screenshot({path:'docs/verification/delivery-strategy-teacher.png',fullPage:true});
  // Wrangler's local proxy can drop a save connection; require a successful recovery.
  for(const page of [ap,bp]){await expect(page.getByTestId('cloud-save-status')).toHaveText('Saved online');await expect(page.getByRole('dialog',{name:'Protect your saved pet'})).toHaveCount(0);const statuses=saveStatuses.get(page)!;if(statuses.some(s=>s>=500))expect(statuses.at(-1)).toBe(200);}
  expect(failedRequests.every(path=>path==='/api/pilot/save')).toBe(true);
  expect(errors.filter(e=>failedRequests.length===0||e!=='Failed to load resource: the server responded with a status of 500 (Internal Server Error)')).toEqual([]);
  await Promise.all([ac.close(),bc.close(),tc.close()]);
});

test('strategy API: reward and wager retries are idempotent, levels update between questions, and inventories stay private',async()=>{
  const t=await teacher(),[a,b]=await cards(t),aa=await student(a),bb=await student(b);
  async function grade(n:number){const data=await(await t.get('/api/pilot/teacher/classroom')).json();const p=data.students.find((p:{id:string})=>p.id===a.id);expect((await t.post(`/api/pilot/teacher/students/${a.id}/settings`,{data:{settingsVersion:p.settingsVersion,learning:{...p.learning,grade:n,topic:'mixed'},assignment:p.assignment,requestId:randomUUID()}})).status()).toBe(200);}
  await grade(8);
  const id=await create(aa,{rules:{...DEFAULT_RULES,format:'duel',computers:0,length:'campaign',rounds:12,minutes:0,events:false,mode:'community'}});
  expect((await act(bb,'join',id)).status()).toBe(200);expect((await act(aa,'start',id)).status()).toBe(200);await practice(aa);await practice(bb);
  const reward=randomUUID(),body={targets:[a.id],reward:'supply',amount:3};expect((await act(t,'award',id,body,reward)).status()).toBe(200);expect((await act(t,'award',id,body,reward)).status()).toBe(200);
  let s=await city(aa,id);expect(Object.values(s.players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(9);
  expect((await act(aa,'award',id,body)).status()).toBe(403);
  const stake=Object.keys(s.players[0].inventory!)[0],startReceipt=randomUUID();
  expect((await act(aa,'risk-start',id,{round:1,stake},startReceipt)).status()).toBe(200);
  expect((await act(aa,'risk-start',id,{round:1,stake},startReceipt)).status()).toBe(200);
  s=await city(aa,id);expect(Object.values(s.players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(8);expect(s.players[0].challenge!.problem.grade).toBe(9);expect(s.players[0].challenge!.problem.answer).toBe(0);
  const hidden=(await city(bb,id)).players[0];expect(hidden.inventory).toBeUndefined();expect(hidden.challenge).toBeUndefined();expect(hidden.challengeHistory).toBeUndefined();
  const c=(await city(t,id)).players[0].challenge!;await grade(6);expect((await city(t,id)).players[0].challenge!.problem.id).toBe(c.problem.id);
  const answerReceipt=randomUUID();expect((await act(aa,'risk-answer',id,{id:c.id,answer:c.problem.answer},answerReceipt)).status()).toBe(200);expect((await act(aa,'risk-answer',id,{id:c.id,answer:c.problem.answer},answerReceipt)).status()).toBe(200);
  expect((await city(aa,id)).players[0].challengeHistory).toHaveLength(1);expect(Object.values((await city(aa,id)).players[0].inventory!).reduce((n,v)=>n+v,0)).toBe(10);
  expect((await act(aa,'submit',id,{round:1,order})).status()).toBe(200);expect((await act(bb,'submit',id,{round:1,order})).status()).toBe(200);
  s=await city(aa,id);const secondStake=Object.entries(s.players[0].inventory!).find(([,n])=>n>0)![0];expect((await act(aa,'risk-start',id,{round:2,stake:secondStake})).status()).toBe(200);expect((await city(t,id)).players[0].challenge!.problem.grade).toBe(7);
});

test('simple UI keeps plans across sections and stays compact on a throttled Chromebook viewport',async({page,context})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:1366,height:768});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const state=createInitialEngineState();state.eggDiscovery=undefined;state.pet=hatchEgg({id:'simple-egg',type:'ember_fox',state:'ready',progress:100,createdAt:new Date().toISOString()});state.player.activePetId=state.pet!.id;state.screen='play';
  const payload=JSON.stringify({version:CURRENT_SAVE_VERSION,timestamp:Date.now(),state,checksum:computeChecksum(state)});
  await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},payload);
  await page.goto('http://127.0.0.1:8800');await page.getByRole('button',{name:'Play Delivery Districts →',exact:true}).click();
  await expect(page.getByRole('combobox')).toHaveCount(3);
  await page.getByRole('combobox',{name:'Match length',exact:true}).selectOption('campaign');
  await page.getByRole('button',{name:'Start solo city',exact:true}).click();await page.getByRole('button',{name:'Start deliveries',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'City sections'}).getByRole('button')).toHaveCount(5);
  await expect(page.locator('.car-pet [data-pet-species="ember_fox"]')).toBeVisible();
  await expect(page.locator('.world-atmosphere')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Private garage'})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Crew negotiations'})).toHaveCount(0);
  await page.getByLabel('Delivery destination',{exact:true}).selectOption('2');
  await page.getByRole('spinbutton',{name:'Your sealed customer price'}).fill('8');
  const dimensions=await page.locator('.delivery').evaluate(e=>({nodes:e.querySelectorAll('*').length,height:e.getBoundingClientRect().height,width:e.scrollWidth,viewport:innerWidth}));
  expect(dimensions.nodes).toBeLessThan(650);expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);expect(dimensions.height).toBeLessThan(1250);
  await page.screenshot({path:'docs/verification/delivery-simple-chromebook.png',fullPage:true});
  await section(page,'Items');await expect(page.locator('.city-car')).toHaveCount(0);await expect(page.locator('.loot-catalog p')).toHaveCount(0);
  await page.getByRole('button',{name:/^Equip /}).first().click();
  await section(page,'Rivals');await expect(page.getByRole('region',{name:'Route market'})).toBeVisible();
  await section(page,'Deals');await expect(page.getByRole('region',{name:'Crew negotiations'})).toBeVisible();
  await section(page,'Results');await expect(page.getByText('No deliveries yet',{exact:true})).toBeVisible();
  await section(page,'Play');await expect(page.getByLabel('Delivery destination',{exact:true})).toHaveValue('2');await expect(page.getByRole('spinbutton',{name:'Your sealed customer price'})).toHaveValue('8');await expect(page.getByText(/^Equipped:/)).toBeVisible();
  await page.getByText('More options · route, tools & partners',{exact:true}).click();await page.getByRole('combobox',{name:'Route',exact:true}).selectOption('scenic');await page.getByText('More options · route, tools & partners',{exact:true}).click();
  await section(page,'Items');await section(page,'Play');await page.getByText('More options · route, tools & partners',{exact:true}).click();await expect(page.getByRole('combobox',{name:'Route',exact:true})).toHaveValue('scenic');await page.getByText('More options · route, tools & partners',{exact:true}).click();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'docs/verification/delivery-simple-phone.png',fullPage:true});
  const {writeFileSync}=await import('node:fs');writeFileSync('docs/verification/delivery-simple-layout.json',JSON.stringify({screen:'1366x768',cpuThrottle:4,...dimensions,scope:'Browser emulation; not a physical Chromebook benchmark.'},null,2));
});

test('integrated planning: server validation, support, settings snapshot, privacy and receipt replay',async()=>{
 const t=await teacher(),[a,b]=await cards(t),aa=await student(a),bb=await student(b);
 const id=await create(aa);await act(bb,'join',id);await act(aa,'start',id);
 let response=await act(aa,'plan-start',id,{round:1,order});expect(response.status(),await response.text()).toBe(200);
 let mine=(await city(aa,id)).players.find(p=>p.id===a.id)!;
 expect(mine.learningPlan?.problem.answer).toBe(0);expect(mine.learningPlan?.problem.explanation).toBeUndefined();
 expect((await city(bb,id)).players.find(p=>p.id===a.id)?.learningPlan).toBeUndefined();
 expect((await act(t,'plan-action',id,{round:1,kind:'hint'})).status()).toBe(403);
 response=await act(aa,'plan-action',id,{round:1,kind:'answer',answer:-999});expect(response.status()).toBe(200);
 response=await act(aa,'plan-action',id,{round:1,kind:'explanation'});expect(response.status()).toBe(200);
 mine=(await city(aa,id)).players.find(p=>p.id===a.id)!;const answer=mine.learningPlan!.problem.answer;
 const req=randomUUID();response=await act(aa,'plan-action',id,{round:1,kind:'answer',answer},req);expect(response.status(),await response.text()).toBe(200);
 mine=(await city(aa,id)).players.find(p=>p.id===a.id)!;expect(mine.submitted).toBe(true);expect(mine.planningEvidence?.[0]).toMatchObject({correct:true,firstAttemptCorrect:false,answerRevealed:true});
 expect((await act(aa,'plan-action',id,{round:1,kind:'answer',answer},req)).status()).toBe(200);
 expect((await city(aa,id)).players.find(p=>p.id===a.id)?.planningEvidence).toHaveLength(1);
 const peer=(await city(bb,id)).players.find(p=>p.id===a.id)!;expect(peer.planningEvidence).toBeUndefined();expect(peer.order).toBeNull();
});
