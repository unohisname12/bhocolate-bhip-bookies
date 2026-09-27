import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {setup,nav} from './ui-audit-setup';
import {createScreenPreview} from '../src/devtools/screenCatalog';
import {activities} from '../src/features/student-navigation/catalog';
const dir='docs/verification/ui-audit';
async function switchTo(page:Page,tab:string){
 if(await page.getByLabel('Warmup answer',{exact:true}).isVisible())await page.getByRole('button',{name:'Skip',exact:true}).click();
 const momentum=page.getByRole('dialog',{name:'Choose your Momentum game',exact:true});if(await momentum.isVisible())await page.getByRole('button',{name:'Close Choose your Momentum game'}).click();
 await nav(page,tab).click();
 const confirm=page.getByRole('button',{name:/^(End this activity and switch|Leave and switch)$/});
 if(await confirm.isVisible())await confirm.click();
 await expect(page.locator('.student-shell')).not.toHaveAttribute('data-view','activity');
}
async function unobscured(control:Locator){
 await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport({ratio:1});
 await expect.poll(()=>control.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(el===hit||el.contains(hit));})).toBe(true);
}
async function inspect(page:Page,label:string,width:number){
 await page.waitForTimeout(250);
 const details=await page.evaluate(()=>{
  const scope=document.querySelector('[role="dialog"][aria-modal="true"]')??document.querySelector('.prebattle-dialog')??document.querySelector('.student-activity')??document.querySelector('.student-hub');
  const blocked:Array<{text:string;by:string;top:number}>=[];
  for(const el of scope?.querySelectorAll<HTMLElement>('button,summary,h1,h2')??[]){
   const r=el.getBoundingClientRect();if(r.width<1||r.height<1||getComputedStyle(el).visibility==='hidden'||el.closest('[inert]'))continue;
   const x=r.x+r.width/2,y=r.y+r.height/2;if(x<0||x>innerWidth||y<0||y>innerHeight)continue;
   let clipped=false;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(c.overflowY)&&(y<b.top||y>b.bottom))clipped=true;if(/auto|scroll|hidden|clip/.test(c.overflowX)&&(x<b.left||x>b.right))clipped=true;}
   const closed=el.closest('details:not([open])');if(closed&&!el.closest('summary'))continue;
   if(clipped)continue;
   const hit=document.elementFromPoint(x,y);if(hit&&hit!==el&&!el.contains(hit))blocked.push({text:(el.getAttribute('aria-label')??el.textContent??'').trim().slice(0,70),by:hit.className.toString().slice(0,100),top:Math.round(r.top)});
  }
  return {overflow:document.documentElement.scrollWidth>innerWidth,blocked};
 });
 console.log(`${width}: ${label}: ${details.blocked.length} covered controls`);
 await page.screenshot({path:`${dir}/${width}-${label.replace(/[^a-z0-9]+/gi,'-')}.png`});return {label,...details};
}
for(const size of [{width:1366,height:657},{width:1920,height:1080},{width:390,height:844}])test(`student menus and overlays ${size.width}`,async({page})=>{
 mkdirSync(dir,{recursive:true});await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const {s,t}=await setup(page,state=>{const p=createScreenPreview('home',state.learning);return {...state,pet:p.pet,egg:null,eggDiscovery:null,screen:'home',showDailyRitual:false,interaction:{...state.interaction,unlockedTools:['pet','wash','brush','comfort','train','play']},player:{...state.player,currencies:{...state.player.currencies,tokens:1000}}};});
 const findings=[];
 try{
 await page.locator('.pilot-account-menu summary').click();await unobscured(page.getByRole('checkbox',{name:'Reduce motion'}));await page.locator('.pilot-account-menu summary').click();
 for(const tab of ['Home','My Pet','Games','Together','Rewards']){await switchTo(page,tab);findings.push(await inspect(page,tab,size.width));}
 await switchTo(page,'My Pet');await page.getByRole('button',{name:'Visit my companion'}).click();await expect(page.locator('.pet-room-layout')).toBeVisible();
 const details=page.getByRole('button',{name:'Pet details',exact:true});await details.click();const dialog=page.getByRole('dialog',{name:'Pet details',exact:true});await expect(dialog).toContainText('Daily Goals');await unobscured(dialog.getByRole('button',{name:'Close Pet details'}));findings.push(await inspect(page,'Pet details',size.width));await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'Close Pet details'})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(details).toBeFocused();
 await details.click();await page.getByRole('button',{name:'Close Pet details'}).click();await details.click();await page.mouse.click(3,3);await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'Feed',exact:true}).click();const feed=page.getByRole('dialog',{name:'Feed Pet'});await expect(feed).toBeVisible();for(const tab of ['Common','Rare','Medicine']){await feed.getByRole('button',{name:tab,exact:true}).click();await unobscured(feed.getByRole('button',{name:'Close Feed Pet'}));}findings.push(await inspect(page,'Feeding',size.width));await feed.getByRole('button',{name:'Common',exact:true}).click();await feed.getByRole('button',{name:/^Feed /}).first().click();await unobscured(feed.getByRole('button',{name:'Close Feed Pet'}));findings.push(await inspect(page,'Feeding scene',size.width));await page.keyboard.press('Escape');await expect(feed).toHaveCount(0);
 await page.getByRole('button',{name:'Yard',exact:true}).click();await page.getByRole('button',{name:'Mailbox',exact:true}).click();await expect(page.getByRole('dialog',{name:'Mailbox'})).toBeVisible();await unobscured(page.getByRole('button',{name:'Close Mailbox'}));findings.push(await inspect(page,'Mailbox',size.width));await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Help',exact:true}).click();await expect(page.getByRole('dialog',{name:'Help',exact:true})).toBeVisible();await unobscured(page.getByRole('button',{name:'Close Help'}));findings.push(await inspect(page,'Help',size.width));await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Help',exact:true}).click();await page.getByRole('button',{name:'Replay Intro Tutorial'}).click();await unobscured(page.getByRole('button',{name:'Skip all',exact:true}));await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Tutorial'})).toHaveCount(0);
 await page.getByRole('button',{name:'Time together',exact:true}).click();await expect(page.getByRole('region',{name:'Quick care tools'})).toBeVisible();await page.getByRole('button',{name:'Close tools',exact:true}).click();
 for(const mode of ['Pet & cuddle','Wash','Brush','Comfort','Train','Play']){await page.getByRole('button',{name:'Time together',exact:true}).click();await page.getByRole('button',{name:`Touch: ${mode}`,exact:true}).click();const close=page.getByRole('button',{name:'Close care activity',exact:true});await unobscured(close);await expect(page.getByRole('button',{name:'Let’s begin',exact:true})).toBeVisible();findings.push(await inspect(page,`Care ${mode}`,size.width));await close.click();}
 for(const name of ['Pet care','Build my home','Growth & companion family','Wardrobe & accessories']){await switchTo(page,'My Pet');await page.getByRole('button',{name,exact:false}).click();await expect(page.locator('.student-shell')).toHaveAttribute('data-view','activity');findings.push(await inspect(page,name,size.width));}
 for(const name of ['Shop','Quests','Season rewards','Cosmetics & crafting','Power Forge','Arcade decorations']){await switchTo(page,'Rewards');const button=page.getByRole('button',{name:new RegExp('^'+name)});if(await button.count()){await button.first().click();await expect(page.locator('.student-shell')).toHaveAttribute('data-view','activity');findings.push(await inspect(page,name,size.width));}}
 for(const game of activities){await switchTo(page,'Games');const card=page.locator('article').filter({has:page.getByRole('heading',{name:game.label,exact:true})});await card.getByRole('button').click();const confirm=page.getByRole('button',{name:/^(End this activity and switch|Leave and switch)$/});if(await confirm.isVisible())await confirm.click();await page.waitForTimeout(300);findings.push(await inspect(page,game.label,size.width));if(game.id==='catch-math' || game.label==='Catch Math'){await expect(page.getByTestId('catch-throw')).toBeInViewport({ratio:1});await expect(page.getByTestId('catch-choices')).toBeInViewport({ratio:1});}if(game.id==='momentum'){for(const mode of ['Advanced · 7×7','Power Clash · Hard']){await page.getByRole('button',{name:mode,exact:true}).click();findings.push(await inspect(page,`Momentum ${mode}`,size.width));}}if(game.id==='battle'){await page.getByRole('button',{name:'Skip',exact:true}).click();await page.waitForTimeout(500);findings.push(await inspect(page,'Battle controls',size.width));}if(game.id==='dungeon'){await page.getByRole('button',{name:'Enter Dungeon',exact:true}).click();const leave=page.getByRole('button',{name:'Leave Dungeon',exact:true});await unobscured(leave);findings.push(await inspect(page,'Dungeon map',size.width));await leave.click();await unobscured(page.getByRole('button',{name:'Close Abandon run?'}));findings.push(await inspect(page,'Dungeon retreat',size.width));await page.getByRole('button',{name:'Stay',exact:true}).click();}}
 await switchTo(page,'Home');
 writeFileSync(`${dir}/${size.width}-report.json`,JSON.stringify({size,findings,errors},null,2));expect(errors).toEqual([]);expect(findings.filter(f=>f.overflow||f.blocked.length)).toEqual([]);
 }finally{writeFileSync(`${dir}/${size.width}-report.json`,JSON.stringify({size,findings,errors},null,2));await s.dispose();await t.dispose();}
});
