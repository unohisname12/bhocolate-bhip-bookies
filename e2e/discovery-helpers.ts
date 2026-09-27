import { expect, type Page } from '@playwright/test';

export async function classroomDiscovery(page: Page, style: string, start = Date.UTC(2026, 9, 5, 17)) {
  await page.getByRole('button', { name: 'Skip quiz—use my activities instead', exact: true }).click();
  for (let day = 0; day < 5; day++) {
    await page.clock.setFixedTime(new Date(start + day * 86_400_000));
    await page.getByRole('button', { name: 'Teacher dashboard', exact: true }).click();
    await page.getByRole('navigation', { name: 'Teacher sections' }).getByRole('button', { name: 'Egg & Rewards' }).click();
    await page.getByLabel('Classroom activity theme').selectOption(style);
    await page.getByLabel('I guided a classroom activity with this learner today.').check();
    await page.getByRole('button', { name: 'Record today’s classroom stamp', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Today’s stamp is already recorded', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Reveal my companion', exact: true }).click();
}
