import {test,expect,type Page} from '@playwright/test';
async function open(page:Page){await page.goto('/');await page.getByRole('button',{name:'Open Dev Mode'}).click();await page.locator('[data-preview-screen="number_merge"]').click();await expect(page.getByRole('heading',{name:'Number Merge: Overseer Breach'})).toBeVisible();}

test('board, target, sprite and direction controls fit desktop and narrow screens',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const missing:string[]=[];page.on('response',r=>{if(r.url().includes('/assets/number-merge-v2/')&&r.status()>=400)missing.push(r.url());});
 await open(page);
 for(const [width,height] of [[1440,1000],[1280,900],[900,1100],[821,1100],[820,900],[390,844],[320,740]]){
  await page.setViewportSize({width,height});await expect(page.getByRole('group',{name:'Number tiles'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const help=await page.getByRole('button',{name:'Help',exact:true}).boundingBox();
  const board=await page.locator('.nm-board').boundingBox();if(help)expect(help.y).toBeGreaterThan(board!.y+board!.height);expect(board!.width).toBeLessThan(width);expect(board!.y).toBeLessThan(height/2);
  if(width>=1280||width===390)expect(board!.y+board!.height).toBeLessThan(height);
 }
 await expect(page.locator('.nm-pet-stage [data-pet-species]')).toHaveAttribute('data-pet-species','koala_sprite');
 const sprite=await page.locator('.nm-overseer-sprite').evaluate(el=>getComputedStyle(el).backgroundImage);expect(sprite).toContain('overseer-atlas.png');expect(errors).toEqual([]);expect(missing).toEqual([]);
});

test('keyboard merging updates the score, reset can be cancelled, rules remain available',async({page})=>{
 await open(page);const first=page.locator('.nm-tile[data-row="0"][data-col="0"]');await first.focus();await first.press('Enter');await expect(first).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Merge Left',exact:true})).toBeDisabled();
 const right=page.getByRole('button',{name:'Merge Right',exact:true});await right.focus();await right.press('Enter');await expect.poll(async()=>Number(await page.getByTestId('merge-score').innerText())).toBeGreaterThan(0);
 const score=await page.getByTestId('merge-score').innerText();page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Reset Run'}).click();await expect(page.getByTestId('merge-score')).toHaveText(score);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Reset Run'}).click();await expect(page.getByTestId('merge-score')).toHaveText('0');
 await page.locator('.game-rules > summary').click();await expect(page.getByText('Practice freely: no hearts or stars are lost.')).toBeVisible();await page.getByRole('button',{name:'Hide rules',exact:true}).click();await expect(page.locator('.game-rules-content')).toBeHidden();
});

test('earned companion remains species-specific and hard mode exposes the real pressure meters',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Open Dev Mode'}).click();await page.getByLabel('Preview companion').selectOption('ember_fox');await page.locator('[data-preview-screen="number_merge"]').click();await expect(page.locator('.nm-pet-stage [data-pet-species]')).toHaveAttribute('data-pet-species','ember_fox');
 await page.getByRole('button',{name:'Hard',exact:true}).click();await expect(page.getByText('Gap Window',{exact:true})).toBeVisible();await expect(page.getByText('Corruption',{exact:true})).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.nm-overseer-sprite').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('a complete Easy run shows victory, can review the board, and starts fresh',async({page})=>{
 await open(page);await expect(page.getByRole('button',{name:'Easy',exact:true})).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<80&&await page.getByRole('dialog',{name:'Round result'}).count()===0;i++){
  const tiles=await page.locator('.nm-tile[data-value]').evaluateAll(nodes=>nodes.map(n=>({r:Number((n as HTMLElement).dataset.row),c:Number((n as HTMLElement).dataset.col),v:Number((n as HTMLElement).dataset.value)})));
  const pairs=tiles.flatMap(a=>tiles.filter(b=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1).map(b=>({a,b,sum:a.v+b.v}))).sort((a,b)=>b.sum-a.sum);expect(pairs.length).toBeGreaterThan(0);
  const {a,b}=pairs[0];await page.locator(`.nm-tile[data-row="${a.r}"][data-col="${a.c}"]`).click();await page.locator(`.nm-tile[data-row="${b.r}"][data-col="${b.c}"]`).click();
 }
 const result=page.getByRole('dialog',{name:'Round result'});await expect(result).toBeVisible();await expect(result).toContainText('VICTORY!');await expect(result).toContainText('15 tokens');await result.getByRole('button',{name:'Review board'}).click();await expect(result).toBeHidden();await page.getByRole('button',{name:'Reset Run',exact:true}).click();await expect(page.getByTestId('merge-score')).toHaveText('0');
});
