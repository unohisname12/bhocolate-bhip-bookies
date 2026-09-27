import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signInLink } from '../src/pilot/signInLinks';
const base='http://127.0.0.1:8798';
const teacher=()=>JSON.parse(readFileSync('.pilot-private/test-teachers.json','utf8'))[0];
const headers=async(page:Page)=>({'X-Pilot-Request':'1','X-Pilot-Tab':await page.evaluate(()=>sessionStorage.getItem('vpet-classroom-tab')!)});
const teacherLink=()=>signInLink(base,{role:'teacher',code:teacher().code,classCode:''});
test('one-click links keep a teacher and two students separate on the same computer',async({page,context})=>{
 await page.request.post('/api/pilot/login',{data:{role:'teacher',code:teacher().code}});
 await page.goto(teacherLink());await expect(page.getByRole('navigation',{name:'Classroom menus'})).toBeVisible();expect(new URL(page.url()).hash).toBe('');
 expect((await page.request.get('/api/pilot/session')).status()).toBe(401);
 const th=await headers(page);
 const r=await page.request.post('/api/pilot/teacher/students',{headers:th,data:{count:2}});expect(r.status()).toBe(201);const {cards,classCode}=await r.json();
 const a=await context.newPage(),b=await context.newPage();
 for(const [p,card] of [[a,cards[0]],[b,cards[1]]] as const){
  await p.goto(signInLink(base,{role:'student',classCode,code:card.code}));await expect(p.getByRole('navigation',{name:'Student menus'})).toBeVisible();
  const h=await headers(p);const save=await(await p.request.get('/api/pilot/save',{headers:h})).json();expect(save.studentId).toBe(card.id);
  expect((await p.request.get('/api/pilot/teacher/classroom',{headers:h})).status()).toBe(403);
 }
 expect(await headers(a)).not.toEqual(await headers(b));expect(await headers(a)).not.toEqual(th);
 await a.reload();await expect(a.getByRole('navigation',{name:'Student menus'})).toBeVisible();expect((await(await a.request.get('/api/pilot/save',{headers:await headers(a)})).json()).studentId).toBe(cards[0].id);
 // Signing out in one tab must not sign out the teacher or the other child.
 await a.getByText('Account & help',{exact:true}).click();await a.getByRole('button',{name:'Save & sign out'}).click();await expect(a.getByRole('button',{name:'Visit my pet',exact:true})).toBeVisible();
 expect((await page.request.get('/api/pilot/teacher/classroom',{headers:th})).status()).toBe(200);expect((await b.request.get('/api/pilot/save',{headers:await headers(b)})).status()).toBe(200);
 await page.getByRole('navigation',{name:'Classroom menus'}).getByRole('button',{name:/Class tools/}).click();await page.getByLabel('Student’s current secret pet code').fill(cards[0].code);await page.getByRole('button',{name:'Make student shortcut',exact:true}).click();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download link + backup codes',exact:true}).click();const file=readFileSync((await(await dl).path())!,'utf8');expect(file).toContain(cards[0].code);expect(file).toContain(classCode);expect(file).toContain('TARGET="_blank"');
 await page.goto(signInLink(base,{role:'student',classCode,code:cards[0].code}));await expect(page.getByRole('link',{name:'Open private link in a new tab'})).toBeVisible();expect((await page.request.get('/api/pilot/teacher/classroom',{headers:th})).status()).toBe(200);
 const opened=context.waitForEvent('page');await page.getByRole('link',{name:'Open private link in a new tab'}).click();const c=await opened;await expect(c.getByRole('navigation',{name:'Student menus'})).toBeVisible();expect((await(await c.request.get('/api/pilot/save',{headers:await headers(c)})).json()).studentId).toBe(cards[0].id);
 await page.getByRole('button',{name:'Teacher sign out',exact:true}).click();expect((await b.request.get('/api/pilot/save',{headers:await headers(b)})).status()).toBe(200);
 await a.close();await b.close();await c.close();
});
test('invalid private link cannot open a different existing account; manual keyboard fallback works',async({page,context})=>{
 await page.goto(teacherLink());await expect(page.getByRole('navigation',{name:'Classroom menus'})).toBeVisible();
 const other=await context.newPage();await other.goto(signInLink(base,{role:'teacher',code:'A'.repeat(40),classCode:''}));await expect(other.getByRole('alert')).toContainText('did not match');expect((await other.request.get('/api/pilot/session',{headers:await headers(other)})).status()).toBe(401);
 await other.getByLabel('Private teacher key',{exact:true}).fill(teacher().code);await other.getByLabel('Show my code').check();await expect(other.getByLabel('Private teacher key',{exact:true})).toHaveAttribute('type','text');await other.getByLabel('Show my code').uncheck();await other.getByLabel('Private teacher key',{exact:true}).press('Enter');await expect(other.getByRole('navigation',{name:'Classroom menus'})).toBeVisible();await other.close();
});
