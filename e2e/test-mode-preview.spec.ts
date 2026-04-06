import { test, expect } from '@playwright/test';

const SEED_STATE = {
  version: 4, timestamp: Date.now(), checksum: '0',
  state: {
    initialized: true, mode: 'normal', screen: 'home', elapsedMs: 0, tickCount: 0, engineTime: 0,
    currentRoom: 'inside',
    pet: { id: 't', name: 'TestPet', type: 'slime_baby', stage: 'baby', state: 'idle', bond: 10, bornAt: Date.now(),
      needs: { health: 80, hunger: 70, happiness: 90, cleanliness: 60 },
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

test.describe('Test Mode - Pet Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), SEED_STATE);
    await page.reload();
    await page.waitForTimeout(2500);
  });

  test('enter test mode and check hatching preview', async ({ page }) => {
    // Find and click the Test Mode button
    const testModeBtn = page.locator('text=Test Mode');
    if (await testModeBtn.count() === 0) {
      // Try DevTools button
      const devToolsBtn = page.locator('text=DevTools');
      if (await devToolsBtn.count() > 0) {
        await devToolsBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Click Test Mode if visible
    if (await testModeBtn.count() > 0) {
      await testModeBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'e2e/screenshots/testmode-initial.png' });

    // Check if we're in test mode
    const testModeHeader = page.locator('text=TEST MODE');
    const inTestMode = await testModeHeader.count() > 0;
    console.log('In test mode:', inTestMode);

    if (!inTestMode) {
      console.log('Could not enter test mode - checking page content');
      const bodyText = await page.textContent('body');
      console.log('Page text (first 500 chars):', bodyText?.substring(0, 500));
      return;
    }

    // Click "1: Hatching" button
    const hatchingBtn = page.locator('text=1: Hatching');
    await expect(hatchingBtn).toBeVisible();
    await hatchingBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/testmode-hatching.png' });

    // Check sprite rendering details
    const spriteInfo = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div[style]');
      const sprites: any[] = [];
      allDivs.forEach(d => {
        const el = d as HTMLElement;
        if (el.style.backgroundImage && el.style.backgroundImage.includes('url(')) {
          const rect = el.getBoundingClientRect();
          sprites.push({
            bg: el.style.backgroundImage,
            width: el.style.width,
            height: el.style.height,
            bgSize: el.style.backgroundSize,
            bgPos: el.style.backgroundPosition,
            rectWidth: rect.width,
            rectHeight: rect.height,
            overflow: el.style.overflow,
          });
        }
      });
      return sprites;
    });
    console.log('HATCHING SPRITE INFO:', JSON.stringify(spriteInfo, null, 2));

    // Check all 4 animation previews
    const animations = ['1: Hatching', '2: Cleaning', '3: Dancing', '4: Adult Walk'];
    for (const anim of animations) {
      const btn = page.locator(`text=${anim}`);
      await btn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `e2e/screenshots/testmode-${anim.split(': ')[1].toLowerCase()}.png` });

      const spriteData = await page.evaluate(() => {
        const allDivs = document.querySelectorAll('div[style]');
        let spriteDiv: any = null;
        allDivs.forEach(d => {
          const el = d as HTMLElement;
          if (el.style.backgroundImage && el.style.backgroundImage.includes('koala')) {
            spriteDiv = {
              bg: el.style.backgroundImage,
              width: el.style.width,
              height: el.style.height,
              bgSize: el.style.backgroundSize,
              bgPos: el.style.backgroundPosition,
            };
          }
        });
        return spriteDiv;
      });
      console.log(`${anim} sprite:`, JSON.stringify(spriteData));
    }
  });
});
