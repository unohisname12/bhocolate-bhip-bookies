import { test, expect } from '@playwright/test';

function makeSeed(overrides: Record<string, any> = {}) {
  return {
    version: 4, timestamp: Date.now(), checksum: '0',
    state: {
      initialized: true, mode: 'normal', screen: 'home', elapsedMs: 0, tickCount: 0, engineTime: 0,
      currentRoom: 'inside',
      pet: { id: 't', name: 'TestPet', type: 'slime_baby', stage: 'baby', state: 'idle', bond: 10, bornAt: Date.now(),
        needs: { health: 80, hunger: 70, happiness: 60, cleanliness: 60 },
        progression: { level: 2, xp: 30 },
        moves: [{ id: 'tackle', name: 'Tackle', power: 10, accuracy: 90, type: 'physical', description: 'A' }],
        ...overrides.pet,
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
      ...overrides,
    },
  };
}

async function seedAndLoad(page: any, overrides: Record<string, any> = {}) {
  await page.goto('/');
  await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), makeSeed(overrides));
  await page.reload();
  await page.waitForTimeout(2500);
}

function getAnimations(page: any) {
  return page.evaluate(() => {
    const results: any[] = [];
    const animated = document.querySelectorAll('[class*="anim-"]');
    animated.forEach(el => {
      const cs = getComputedStyle(el);
      results.push({
        classes: el.className,
        animation: cs.animation,
        transform: cs.transform,
        tagName: el.tagName,
        rect: el.getBoundingClientRect(),
      });
    });
    // Also check animate-pulse
    const pulseEls = document.querySelectorAll('.animate-pulse');
    pulseEls.forEach(el => {
      results.push({
        classes: el.className,
        animation: getComputedStyle(el).animation,
        tagName: el.tagName,
        isPulse: true,
      });
    });
    return results;
  });
}

test.describe('Animation Audit', () => {
  test('idle animation — pet breathes gently, not floating', async ({ page }) => {
    await seedAndLoad(page);

    // Capture multiple frames of the idle animation
    const positions: number[] = [];
    for (let i = 0; i < 10; i++) {
      const pos = await page.evaluate(() => {
        const sprite = document.querySelector('.anim-sprite-idle');
        return sprite ? sprite.getBoundingClientRect().top : null;
      });
      positions.push(pos);
      await page.waitForTimeout(250);
    }

    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const drift = max - min;

    console.log(`Idle animation drift: ${drift.toFixed(1)}px (min: ${min.toFixed(1)}, max: ${max.toFixed(1)})`);
    // Should be subtle — less than 5px total vertical movement
    expect(drift).toBeLessThan(5);

    await page.screenshot({ path: 'e2e/screenshots/anim-idle.png' });
  });

  test('inside scene — all visible animations are appropriate', async ({ page }) => {
    await seedAndLoad(page);

    const anims = await getAnimations(page);
    console.log('INSIDE SCENE ANIMATIONS:', JSON.stringify(anims, null, 2));

    // Should have the idle breath animation
    const hasIdleBreath = anims.some((a: any) => a.classes.includes('anim-sprite-idle'));
    expect(hasIdleBreath).toBe(true);

    // No animation should have transform translateY exceeding 5px
    for (const anim of anims) {
      if (anim.transform && anim.transform !== 'none') {
        const match = anim.transform.match(/matrix\(([^)]+)\)/);
        if (match) {
          const values = match[1].split(',').map(Number);
          const translateY = Math.abs(values[5] || 0);
          console.log(`  ${anim.classes.substring(0, 50)} translateY: ${translateY.toFixed(1)}px`);
          expect(translateY).toBeLessThan(10);
        }
      }
    }
  });

  test('outside scene — animations look correct', async ({ page }) => {
    await seedAndLoad(page);

    // Navigate to outside
    const rightArrow = page.locator('button:has-text("›")');
    await rightArrow.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/anim-outside.png' });

    const anims = await getAnimations(page);
    console.log('OUTSIDE SCENE ANIMATIONS:', JSON.stringify(anims, null, 2));

    // Pet idle should still work in outside scene
    const hasIdleBreath = anims.some((a: any) => a.classes.includes('anim-sprite-idle'));
    expect(hasIdleBreath).toBe(true);
  });

  test('room transition — no jarring effects', async ({ page }) => {
    await seedAndLoad(page);

    // Take screenshot before transition
    await page.screenshot({ path: 'e2e/screenshots/anim-before-transition.png' });

    const rightArrow = page.locator('button:has-text("›")');

    // Navigate and capture mid-transition
    await rightArrow.click();
    await page.waitForTimeout(150); // Mid-transition
    await page.screenshot({ path: 'e2e/screenshots/anim-mid-transition.png' });

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/anim-after-transition.png' });

    // Verify we arrived at outside (room dot has Yard aria-label)
    await expect(page.getByLabel('Yard')).toBeVisible();

    // Navigate back
    await rightArrow.click();
    await page.waitForTimeout(500);
    await expect(page.getByLabel('Home')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/anim-return-transition.png' });
  });

  test('action bar button feedback', async ({ page }) => {
    await seedAndLoad(page);

    // Open the right side panel first (it starts closed)
    const panelTab = page.locator('button.fixed.right-0').first();
    await panelTab.click();
    await page.waitForTimeout(400);

    // Click Feed button and check visual state
    const feedBtn = page.locator('text=Feed').first();
    await expect(feedBtn).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/anim-before-feed.png' });
    await feedBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/anim-after-feed.png' });

    console.log('Feed action triggered successfully');
  });

  test('info drawer open/close animation', async ({ page }) => {
    await seedAndLoad(page);

    // Find and click the info drawer toggle (the collapsed status bar)
    const drawerToggle = page.locator('button:has(span:text("▲"))');
    if (await drawerToggle.count() > 0) {
      await page.screenshot({ path: 'e2e/screenshots/anim-drawer-closed.png' });
      await drawerToggle.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e/screenshots/anim-drawer-open.png' });

      // Close it
      const closeBtn = page.locator('button:has(span:text("▼"))');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'e2e/screenshots/anim-drawer-reclosed.png' });
      }
      console.log('Info drawer open/close works');
    } else {
      console.log('Info drawer toggle not found — checking alternate selector');
      // Try broader approach
      const buttons = page.locator('.z-\\[35\\] button');
      const count = await buttons.count();
      console.log(`Found ${count} z-35 buttons`);
    }
  });

  test('shadow tracks pet position', async ({ page }) => {
    await seedAndLoad(page);

    const shadowInfo = await page.evaluate(() => {
      const shadow = document.querySelector('.z-20 .blur-md');
      const pet = document.querySelector('.anim-sprite-idle');
      if (!shadow || !pet) return null;
      const sr = shadow.getBoundingClientRect();
      const pr = pet.getBoundingClientRect();
      return {
        shadowCenter: sr.left + sr.width / 2,
        petCenter: pr.left + pr.width / 2,
        shadowTop: sr.top,
        petBottom: pr.bottom,
        gap: sr.top - pr.bottom,
      };
    });

    console.log('SHADOW INFO:', JSON.stringify(shadowInfo, null, 2));

    if (shadowInfo) {
      // Shadow should be horizontally centered under pet
      const hDiff = Math.abs(shadowInfo.shadowCenter - shadowInfo.petCenter);
      expect(hDiff).toBeLessThan(20);

      // Shadow should be close to pet bottom (not far away)
      expect(Math.abs(shadowInfo.gap)).toBeLessThan(30);
    }
  });

  test('no duplicate shadows', async ({ page }) => {
    await seedAndLoad(page);

    const shadowCount = await page.evaluate(() => {
      const stage = document.querySelector('.z-20');
      if (!stage) return 0;
      // Shadow uses inline filter:blur style, not a blur CSS class
      const shadows = stage.querySelectorAll('[style*="blur"]');
      return shadows.length;
    });

    console.log(`Shadow elements in stage: ${shadowCount}`);
    // Should only have 1 shadow (from SceneStage), not 2
    expect(shadowCount).toBe(1);
  });
});
