import {test,expect,type Page} from '@playwright/test';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {computeChecksum} from '../src/services/persistence/saveValidation';
import {CURRENT_SAVE_VERSION} from '../src/services/persistence/saveMigrations';
async function seed(page:Page,screen='arcade',grade=2) {
 const state=createInitialEngineState();state.screen=screen as typeof state.screen;state.showDailyRitual=false;state.player.lastLoginDate=new Date().toISOString().slice(0,10);
 state.learning={...state.learning,grade,topic:grade===2?'Two-digit subtraction':'mixed'};
 await page.addInitScript(value=>{if(!localStorage.getItem('vpet_save_auto'))localStorage.setItem('vpet_save_auto',value);},JSON.stringify({state,version:CURRENT_SAVE_VERSION,timestamp:Date.now(),checksum:computeChecksum(state)}));await page.goto('/');
}
const saved=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
test('balanced five-question practice keeps retry rewards and shows saved egg growth and spending',async({page})=>{
 await seed(page,'math',2);
 for(let i=0;i<5;i++){
  await expect.poll(async()=> (await saved(page)).practiceCheckpoint?.completed).toBe(i);
  await expect(page.getByLabel('Your answer',{exact:true})).toBeEnabled();
  const p=(await saved(page)).practiceCheckpoint.problem;
  if(i===0){await page.getByLabel('Your answer',{exact:true}).fill(String(p.answer+1));await page.getByRole('button',{name:'Submit',exact:true}).click();}
  await page.getByLabel('Your answer',{exact:true}).fill(String(p.answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect.poll(async()=> (await saved(page)).practiceCheckpoint?.completed).toBe(i+1);
  if(i<4)await expect.poll(async()=> (await saved(page)).practiceCheckpoint.problem.id).not.toBe(p.id);
 }
 await expect(page.getByRole('heading',{name:'Five questions complete!'})).toBeVisible();
 await expect(page.getByText('425 growth XP is saved for your companion when it hatches.')).toBeVisible();
 expect((await saved(page)).player.currencies.mp).toBe(10);
 const before=(await saved(page)).player.currencies.tokens;
 await page.reload();await expect(page.getByRole('heading',{name:'Five questions complete!'})).toBeVisible();
 expect((await saved(page)).player.currencies.tokens).toBe(before);
 await page.getByRole('button',{name:'Choose something for my home'}).click();
 await expect.poll(async()=> (await saved(page)).screen).toBe('home_builder');
});
test('cafe plan survives reload, help stays supported, stock changes once and review follows',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);
 const card=page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})});
 await card.getByRole('button',{name:'Plan & play'}).click();
 const recipe=await page.locator('.arc-customers button[aria-pressed=true] small').innerText();
 for(const emoji of recipe.split(' + '))await page.getByRole('button',{name:new RegExp((emoji==='🍓'?'Berries':emoji==='🍞'?'Bread':'Honey')+' \\(')}).click();
 await page.getByRole('button',{name:'Serve order'}).click();
 await expect(page.getByRole('region',{name:'Math game plan'})).toBeVisible();
 await page.getByLabel('Your answer',{exact:true}).fill('-1');await page.getByRole('button',{name:'Submit',exact:true}).click();
 await page.getByRole('button',{name:'Help me plan'}).click();await page.getByRole('button',{name:'Explain the answer',exact:true}).click();
 await page.reload();await expect(page.getByRole('region',{name:'Math game plan'})).toBeVisible();
 const pending=(await saved(page)).arcade.run.pendingPlan;
 await page.getByLabel('Your answer',{exact:true}).fill(String(pending.problem.answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.locator('.arc-score')).toContainText('Customers 1/');
 const s=await saved(page);expect(s.learningEvidence[0]).toMatchObject({correct:true,firstAttemptCorrect:false,answerRevealed:true});expect(s.skillReviews[0].needsFreshCheck).toBe(true);
 await page.getByRole('button',{name:'Practice with new numbers'}).click();
 await expect(page.getByText('New numbers: try the skill again.',{exact:false})).toBeVisible();expect(errors).toEqual([]);
});
test('phone defense plan pauses, spends actual energy and keeps the layout within the screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page);
 await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Shellguard',exact:true})}).getByRole('button',{name:'Plan & play'}).click();
 await page.getByRole('button',{name:/Plot 1/}).click();
 await expect(page.getByRole('button',{name:'Start wave'})).toBeDisabled();
 await page.getByLabel('Your answer',{exact:true}).fill('8');await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.locator('.arc-score')).toContainText('⚙ 8');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'docs/verification/learning-shellguard-phone.png',fullPage:true});
});
test('journey explains permanent and match rewards without hiding the game list',async({page})=>{
 await seed(page,'play');await expect(page.getByRole('heading',{name:'Your next small goal'})).toBeVisible();
 await page.getByText('What do I keep?',{exact:true}).click();await expect(page.getByText('Delivery coins, garage bikes, and tactical credits last inside their city.',{exact:false})).toBeVisible();
 await page.getByText('Classroom or demo?',{exact:true}).click();await expect(page.getByText('Demo: temporary practice', {exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:/Number Merge/})).toBeVisible();
});

test('cafe batch uses the three displayed orders and awards one normal group bonus',async({page})=>{
 await seed(page);await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})}).getByRole('button',{name:'Plan & play'}).click();
 await page.getByRole('button',{name:'Plan a batch for all three customers'}).click();
 const p=(await saved(page)).arcade.run.pendingPlan.problem;
 await page.getByLabel('Your answer',{exact:true}).fill(String(p.answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.locator('.arc-score')).toContainText('Customers 3/');expect((await saved(page)).arcade.run.score).toBe(70);
});

for(const grade of [5,6])test(`audio critique: grade ${grade} plans a recipe batch, reloads and changes real stock`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,'arcade',grade);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Nest Café',exact:true})}).getByRole('button',{name:'Plan & play'}).click();
 await page.getByRole('button',{name:/Plan 3 servings/}).click();
 const before=await saved(page),p=before.arcade.run.pendingPlan.problem;
 expect(p.topic).toBe(grade===5?'Fraction of a quantity':'Ratios');
 await page.getByRole('button',{name:'Help me plan'}).click();await page.getByRole('button',{name:'Give me a hint'}).click();
 await page.reload();await expect(page.getByRole('region',{name:'Math game plan'})).toBeVisible();
 await page.getByLabel('Your answer',{exact:true}).fill(String(p.answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.locator('.arc-score')).toContainText('Customers 3/');
 const after=await saved(page);expect(after.arcade.run.stock.reduce((a:number,b:number)=>a+b,0)).toBeLessThan(24);
 expect(after.learningEvidence.at(-1)).toMatchObject({correct:true,firstAttemptCorrect:false,support:'hint'});
 expect(after.skillReviews.at(-1).needsFreshCheck).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`docs/verification/audio-followthrough/cafe-grade-${grade}.png`,fullPage:true});expect(errors).toEqual([]);
});

test('audio critique: a two-step equation builds two defenses and preserves four energy',async({page})=>{
 await seed(page,'arcade',8);
 await page.locator('.arc-card').filter({has:page.getByRole('heading',{name:'Shellguard',exact:true})}).getByRole('button',{name:'Plan & play'}).click();
 await page.getByRole('button',{name:'Plan towers · keep 4 energy in reserve',exact:true}).click();
 await expect(page.getByRole('region',{name:'Math game plan'})).toContainText('4x + 4 = 12');
 await page.getByLabel('Your answer',{exact:true}).fill('3');await page.getByRole('button',{name:'Submit',exact:true}).click();
 expect((await saved(page)).arcade.run.towers).toEqual([null,null,null]);
 await page.getByLabel('Your answer',{exact:true}).fill('2');await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.locator('.arc-score')).toContainText('⚙ 4');expect((await saved(page)).arcade.run.towers.filter(Boolean)).toHaveLength(2);
 await page.screenshot({path:'docs/verification/audio-followthrough/equation-defense.png',fullPage:true});
});

test('audio critique: regular practice offers a calm lesson and preserves its support record',async({page})=>{
 await seed(page,'math',5);
 await expect(page.getByRole('checkbox',{name:'Quiet practice'})).toBeChecked();
 await expect(page.getByText('Reward:',{exact:false})).toHaveCount(0);
 await page.getByRole('button',{name:'Study a worked example'}).click();
 await expect(page.locator('.skill-lesson h3')).toBeVisible();
 const before=await saved(page),p=before.practiceCheckpoint.problem;
 expect(before.learningEvidence.find((e:{questionId:string})=>e.questionId===p.id).support).toBe('hint');
 await page.screenshot({path:'docs/verification/audio-followthrough/quiet-worked-example.png',fullPage:true});
 await page.getByLabel('Your answer',{exact:true}).fill(String(p.answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
 await expect.poll(async()=>{const row=(await saved(page)).learningEvidence.find((e:{questionId:string})=>e.questionId===p.id);return row.correct;}).toBe(true);
 const row=(await saved(page)).learningEvidence.find((e:{questionId:string})=>e.questionId===p.id);expect(row.firstAttemptCorrect).toBe(false);
});
