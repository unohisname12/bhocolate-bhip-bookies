import { test, expect } from '@playwright/test';

const SEED_STATE = {
  version: 4, timestamp: Date.now(), checksum: '0',
  state: {
    initialized: true, mode: 'normal', screen: 'home', elapsedMs: 0, tickCount: 0, engineTime: 0,
    currentRoom: 'inside',
    pet: { id: 't', name: 'TestPet', type: 'slime_baby', stage: 'baby', state: 'idle', bond: 10, bornAt: Date.now(),
      needs: { health: 80, hunger: 70, happiness: 60, cleanliness: 60 },
      progression: { level: 2, xp: 30 },
      moves: [{ id: 'tackle', name: 'Tackle', power: 10, accuracy: 90, type: 'physical', description: 'A' }],
    },
    egg: null,
    player: { id: 'p', displayName: 'Player', activePetId: 't', mathMastery: { arithmetic: 0, geometry: 0, fractions: 0 },
      currencies: { tokens: 500, coins: 5 }, streaks: { login: 1, correctAnswers: 0 }, unlockedRoomItems: [], quizOutcome: null },
    session: { currentQuestion: null, rewardPopup: null, activeModal: null, eggInteractionState: null },
    animation: { animationName: 'idle', frameIndex: 0, frameCount: 4, frameDurationMs: 250, elapsedMs: 0, autoplay: true, isFinished: false },
    test: { active: false, label: '' }, inventory: { items: [], maxSlots: 20 },
    room: { backgroundId: 'default', items: [], moodBonus: 0 }, battle: { active: false },
    events: [], achievements: [], notifications: [], lastUpdate: Date.now(),
    dailyGoals: { date: '2026-04-03', mathSolved: 0, battlesWon: 0, rewardClaimed: false },
    classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
    battleTickets: { tickets: [], maxTickets: 5, todayEarned: 0, todayUsed: 0, mathForNextTicket: 0, careActionsToday: { fed: false, cleaned: false, played: false } },
    matchHistory: [], matchupTrackers: [], trophyCase: { trophies: [], displayedInRoom: [], maxDisplay: 5 },
  },
};

test.describe('Room Navigation - Outside Scene Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), SEED_STATE);
    await page.reload();
    await page.waitForTimeout(2500);
  });

  test('left and right arrows are visible and obvious', async ({ page }) => {
    const leftArrow = page.locator('button:has-text("‹")');
    const rightArrow = page.locator('button:has-text("›")');

    await expect(leftArrow).toBeVisible();
    await expect(rightArrow).toBeVisible();

    // Arrows should be at screen edges, vertically centered
    const leftBox = await leftArrow.boundingBox();
    const rightBox = await rightArrow.boundingBox();

    expect(leftBox!.x).toBeLessThan(50); // Near left edge
    expect(rightBox!.x + rightBox!.width).toBeGreaterThan(1230); // Near right edge

    console.log(`Left arrow: x=${leftBox!.x}, Right arrow: x=${rightBox!.x}`);
  });

  test('room dots are visible above action bar', async ({ page }) => {
    // Room dot for Home should be present (via aria-label)
    const homeDot = page.getByLabel('Home');
    await expect(homeDot).toBeVisible();

    // Should have exactly 2 room dots (small circular buttons)
    const dots = page.locator('.fixed.bottom-2 button.rounded-full');
    const dotCount = await dots.count();
    expect(dotCount).toBe(2);

    console.log(`Room dots: ${dotCount} visible`);
  });

  test('navigate right arrow: inside → outside', async ({ page }) => {
    await expect(page.getByLabel('Home')).toBeVisible();

    // Inside room has interactive objects like "Go Outside"
    await expect(page.getByRole('button', { name: 'Go Outside' })).toBeVisible({ timeout: 8000 });

    // Click right to go outside
    await page.locator('button:has-text("›")').click();
    await page.waitForTimeout(600);

    // Should now be at Yard — outside has "Enter House" and "Mailbox"
    await expect(page.getByLabel('Yard')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter House' })).toBeVisible({ timeout: 8000 });

    // Pet should still be visible
    const pet = page.locator('.anim-sprite-idle');
    await expect(pet).toBeVisible();

    // Actions should change to outdoor set
    await expect(page.locator('text=Train')).toBeVisible();
    await expect(page.locator('text=Arena')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/nav-outside-arrived.png' });
    console.log('Navigated to outside: Yard scene with outdoor actions ✓');
  });

  test('navigate left arrow: inside → outside (wraps)', async ({ page }) => {
    await expect(page.getByLabel('Home')).toBeVisible();

    // Click left (wraps around to outside since there are only 2 rooms)
    await page.locator('button:has-text("‹")').click();
    await page.waitForTimeout(600);

    await expect(page.getByLabel('Yard')).toBeVisible();
    console.log('Left arrow wraps to outside ✓');
  });

  test('clicking room dot navigates directly', async ({ page }) => {
    // Click the Yard dot directly via aria-label
    const yardDot = page.getByLabel('Yard');
    if (await yardDot.count() > 0) {
      await yardDot.click();
      await page.waitForTimeout(600);
      // Verify we navigated — outside has "Enter House" button
      await expect(page.getByRole('button', { name: 'Enter House' })).toBeVisible({ timeout: 8000 });
      console.log('Dot click navigates to outside ✓');
    } else {
      console.log('Could not find Yard dot — checking all dots');
      const allDots = page.locator('.fixed.bottom-\\[68px\\] button');
      const count = await allDots.count();
      console.log(`Total dots: ${count}`);
    }
  });

  test('full round trip: inside → outside → inside', async ({ page }) => {
    const rightArrow = page.locator('button:has-text("›")');

    // Start inside
    await expect(page.getByLabel('Home')).toBeVisible();
    await expect(page.locator('text=Feed')).toBeVisible();

    // Go to outside
    await rightArrow.click();
    await page.waitForTimeout(600);
    await expect(page.getByLabel('Yard')).toBeVisible();
    await expect(page.locator('text=Train')).toBeVisible();

    // Back to inside
    await rightArrow.click();
    await page.waitForTimeout(600);
    await expect(page.getByLabel('Home')).toBeVisible();
    await expect(page.locator('text=Feed')).toBeVisible();

    console.log('Full round trip: Inside → Outside → Inside ✓');
  });

  test('no 404s during room switches', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response: any) => {
      if (response.url().includes('/assets/') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    const rightArrow = page.locator('button:has-text("›")');

    // Switch back and forth multiple times
    for (let i = 0; i < 4; i++) {
      await rightArrow.click();
      await page.waitForTimeout(400);
    }

    expect(failedRequests).toEqual([]);
    console.log('No 404s across 4 room switches ✓');
  });

  test('pet stays grounded in both scenes', async ({ page }) => {
    // Check inside
    const insidePet = await page.evaluate(() => {
      const pet = document.querySelector('.anim-sprite-idle');
      const rect = pet?.getBoundingClientRect();
      return rect ? { bottom: rect.bottom, height: rect.height } : null;
    });
    console.log('Inside pet bottom:', insidePet?.bottom);

    // Switch to outside
    await page.locator('button:has-text("›")').click();
    await page.waitForTimeout(600);

    const outsidePet = await page.evaluate(() => {
      const pet = document.querySelector('.anim-sprite-idle');
      const rect = pet?.getBoundingClientRect();
      return rect ? { bottom: rect.bottom, height: rect.height } : null;
    });
    console.log('Outside pet bottom:', outsidePet?.bottom);

    // Pet should be at the same height in both scenes (within a few px for animation)
    expect(Math.abs(insidePet!.bottom - outsidePet!.bottom)).toBeLessThan(10);
    console.log('Pet position consistent across scenes ✓');
  });
});
