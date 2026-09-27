import { expect, test, type Page } from '@playwright/test';
async function counting(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('0');
  await page.getByLabel('Practice topic').selectOption('Counting');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Skip quiz—use my activities instead', exact: true }).click();
}
const correctCount = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state.player.lifetimeMathCorrect);

test('practice has five credited answers, free retries, and an explicit fresh round', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await counting(page);
  await page.getByRole('button', { name: 'Math Practice', exact: true }).click();
  const before = await correctCount(page);
  for(let i=0;i<5;i++) {
    const input=page.getByLabel('Your answer',{exact:true});
    await expect(input).toBeEnabled();
    const answer=((await page.locator('h2').innerText()).match(/★/g)??[]).length;
    if(i===0){await input.fill('-999');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('progressbar',{name:'Practice progress'})).toHaveAttribute('value','0');}
    await input.fill(String(answer));await page.getByRole('button',{name:'Submit',exact:true}).click();
    await expect.poll(()=>correctCount(page)).toBe(before+i+1);
  }
  await expect(page.getByRole('heading',{name:'Five questions complete!'})).toBeVisible();
  await page.waitForTimeout(1800);
  expect(await correctCount(page)).toBe(before+5);
  await page.getByRole('button',{name:'Practice five more'}).click();
  await expect(page.getByRole('progressbar',{name:'Practice progress'})).toHaveAttribute('value','0');
  await expect(page.getByLabel('Your answer',{exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('catch ends after five catches and restarting cannot repeat the last reward',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await counting(page);
  await page.getByRole('button',{name:'Catch Math',exact:true}).click();
  const before=await correctCount(page);
  for(let i=0;i<5;i++){
    await expect(page.getByTestId('catch-throw')).toBeEnabled();
    const answer=((await page.getByTestId('catch-prompt').innerText()).match(/★/g)??[]).length;
    await page.getByRole('radio',{name:String(answer),exact:true}).click();
    await page.getByTestId('catch-throw').click();
    await expect.poll(()=>correctCount(page)).toBe(before+i+1);
  }
  await expect(page.getByRole('heading',{name:'Five catches complete!'})).toBeVisible();
  await expect(page.getByTestId('catch-throw')).toBeDisabled();
  await page.getByRole('button',{name:'Catch five more'}).click();
  await expect(page.getByRole('region',{name:'Catch session'})).toContainText('0 / 5');
  await page.waitForTimeout(1200);
  expect(await correctCount(page)).toBe(before+5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('merge opens in forgiving Easy and Momentum explains keyboard-accessible moves',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await page.locator('[data-preview-screen="number_merge"]').click();
  await expect(page.getByRole('button',{name:'Easy',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('.game-rules > summary').click();
  await expect(page.getByText('Practice freely: no hearts or stars are lost.')).toBeVisible();
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await page.locator('[data-preview-screen="momentum"]').click();
  await expect(page.getByRole('region',{name:'Momentum quick start'})).toContainText('Skip Turn');
  await page.getByRole('button',{name:/Easy/}).click();
  const piece=page.getByRole('button',{name:/Your rank.*row/i}).first();
  await piece.focus();await piece.press('Enter');
  await expect(piece).toHaveAttribute('aria-pressed','true');
  const move=page.getByRole('button',{name:/available move/i}).first();
  await expect(move).toBeVisible();await move.focus();await move.press('Enter');
  await expect(piece).toHaveAttribute('aria-pressed','false');
});

test('hard Merge pauses its gap countdown while the page is hidden',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open Dev Mode'}).click();
  await page.locator('[data-preview-screen="number_merge"]').click();
  await page.clock.install();
  await page.getByRole('button',{name:'Hard',exact:true}).click();
  const tiles=page.locator('div[role="button"][tabindex="0"]');
  await tiles.nth(0).click();await tiles.nth(1).click();
  const gap=page.getByText('Gap Window',{exact:true}).locator('..');
  await expect(gap).toContainText(/\d\.\ds/);
  const before=Number((await gap.innerText()).match(/(\d+\.\d)s/)![1]);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(30000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(500);
  const after=Number((await gap.innerText()).match(/(\d+\.\d)s/)![1]);
  expect(after).toBeGreaterThan(before-2);
});
