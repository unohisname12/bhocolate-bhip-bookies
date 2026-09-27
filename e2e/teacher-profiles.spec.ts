import { expect, test } from '@playwright/test';

test('phone: select learners and save separate math settings, eggs and rewards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCSS('background-color', 'rgb(0, 102, 204)');
  const tabs = page.getByRole('navigation', { name: 'Teacher sections' });
  await page.getByLabel('Grade level').selectOption('12');
  await page.getByLabel('Practice topic').selectOption('Derivatives');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved for this learner');
  await tabs.getByRole('button', { name: 'Gifts & eggs' }).click();
  await page.getByRole('button', { name: /^Ember/ }).click();
  await page.getByRole('button', { name: 'Set next egg for Learner 1', exact: true }).click();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
  await tabs.getByRole('button', { name: 'Learners', exact: true }).click();
  await page.getByLabel('Learner nickname or class code').fill('Blue 3');
  await page.getByRole('button', { name: 'Create learner profile' }).click();
  await expect(page.getByLabel('Choose learner')).not.toHaveValue('default');
  const id = await page.getByLabel('Choose learner').inputValue();
  await tabs.getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('0');
  await page.getByLabel('Practice topic').selectOption('Counting');
  await page.getByLabel('Choose learner').selectOption('default');
  await expect(page.getByRole('alert')).toContainText('Discard unsaved math changes');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await tabs.getByRole('button', { name: 'Gifts & eggs' }).click();
  await page.getByRole('button', { name: /^Luna/ }).click();
  await page.getByRole('button', { name: 'Set next egg for Blue 3', exact: true }).click();
  await page.getByRole('button', { name: 'Give 25 tokens', exact: true }).click();
  await page.getByLabel('Choose learner').selectOption('default');
  await tabs.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Grade level')).toHaveValue('12');
  await expect(page.getByLabel('Practice topic')).toHaveValue('Derivatives');
  const unchanged = await page.evaluate(() => JSON.parse(localStorage.getItem('vpet_save_auto')!).state);
  expect(unchanged.learning).toEqual(original.learning);
  expect(unchanged.player.currencies.tokens).toBe(original.player.currencies.tokens);
  expect(unchanged.eggDiscovery.teacherChoice).toBe('ember_fox');
  await page.getByLabel('Choose learner').selectOption(id);
  await page.reload();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Choose learner')).toHaveValue(id);
  await expect(page.getByLabel('Grade level')).toHaveValue('0');
  await expect(page.getByLabel('Practice topic')).toHaveValue('Counting');
  const saved = await page.evaluate(id => JSON.parse(localStorage.getItem(`vpet_save_learner_${id}`)!).state, id);
  expect(saved.eggDiscovery.teacherChoice).toBe('luna_owl');
  expect(saved.player.currencies.tokens).toBe(135); // 100 start + 10 first login + 25 teacher grant
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Save reports storage failures and retries; closing unsaved changes asks first', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Grade level').selectOption('5');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('unsaved changes');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { restoreTeacherStorage: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = () => { throw new Error('Simulated quota failure'); };
  });
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Not saved.');
  await page.evaluate(() => (window as unknown as { restoreTeacherStorage: () => void }).restoreTeacherStorage());
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Saved for this learner');
  await page.reload();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Grade level')).toHaveValue('5');
});

test('DEV teacher controls are clearly temporary and can return to real learner settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Dev Mode' }).click();
  await page.locator('[data-preview-screen="home"]').click();
  await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByLabel('Choose learner')).toBeDisabled();
  await page.getByLabel('Grade level').selectOption('12');
  await page.getByRole('button', { name: 'Apply to preview', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Preview updated only');
  await page.getByRole('button', { name: 'Edit real learner settings', exact: true }).click();
  await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeVisible();
  await expect(page.getByLabel('Choose learner')).toBeEnabled();
  await expect(page.getByLabel('Grade level')).toHaveValue('2');
});

 test('early egg shortcut gives the selected learner a saved pass', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Teacher dashboard',exact:true}).click();
  await expect(page.getByRole('button',{name:/Give an early egg pass/})).toBeVisible();
  await page.getByRole('dialog').screenshot({path:'docs/verification/teacher-modern-local.png'});
  await page.getByRole('button',{name:/Give an early egg pass/}).click();
  await page.getByRole('button',{name:'Give pass to Learner 1',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Early egg pass added for Learner 1');
  await expect(page.getByText('Saved passes:')).toContainText('1');
  await page.reload();
  await page.getByRole('button',{name:'Teacher dashboard',exact:true}).click();
  await page.getByRole('button',{name:/Give an early egg pass/}).click();
  await expect(page.getByText('Saved passes:')).toContainText('1');
});
