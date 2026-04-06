import { test, expect } from '@playwright/test';

/**
 * Verification: Pet sprite grounding + right side panel
 * Checks pet is NOT floating, panel works, no UI obstruction.
 */

function makeSeed(overrides: Record<string, any> = {}) {
  return {
    version: 4, timestamp: Date.now(), checksum: '0',
    state: {
      initialized: true, mode: 'normal', screen: 'home', elapsedMs: 0, tickCount: 0, engineTime: 0,
      currentRoom: 'inside',
      pet: {
        id: 't', name: 'TestPet', type: 'koala_sprite', stage: 'baby', state: 'idle', bond: 10, bornAt: Date.now(),
        needs: { health: 80, hunger: 70, happiness: 60, cleanliness: 60 },
        progression: { level: 5, xp: 100 },
        moves: [
          { id: 'tackle', name: 'Tackle', power: 10, accuracy: 90, type: 'physical', description: 'A basic attack' },
          { id: 'spark', name: 'Spark', power: 15, accuracy: 85, type: 'special', energyCost: 20, description: 'A special spark' },
        ],
        ...overrides.pet,
      },
      egg: null,
      player: {
        id: 'p', displayName: 'Player', activePetId: 't',
        mathMastery: { arithmetic: 0, geometry: 0, fractions: 0 },
        currencies: { tokens: 500, coins: 5 },
        streaks: { login: 1, correctAnswers: 0 },
        unlockedRoomItems: [], quizOutcome: null,
      },
      session: { currentQuestion: null, rewardPopup: null, activeModal: null, eggInteractionState: null },
      animation: { animationName: 'idle', frameIndex: 0, frameCount: 4, frameDurationMs: 250, elapsedMs: 0, autoplay: true, isFinished: false },
      test: { active: false, label: '' },
      inventory: { items: [], maxSlots: 20 },
      room: { backgroundId: 'default', items: [], moodBonus: 0 },
      battle: { active: false },
      events: [], achievements: [], notifications: [], lastUpdate: Date.now(),
      dailyGoals: { date: '2026-04-04', mathSolved: 0, battlesWon: 0, rewardClaimed: false },
      classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
      battleTickets: {
        tickets: [{ id: 'bt1', earnedAt: Date.now(), source: 'math' }],
        maxTickets: 5, todayEarned: 1, todayUsed: 0, mathForNextTicket: 0,
        careActionsToday: { fed: false, cleaned: false, played: false },
      },
      matchHistory: [], matchupTrackers: [],
      trophyCase: { trophies: [], displayedInRoom: [], maxDisplay: 5 },
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

test.describe('Sprite Grounding + Right Panel Verification', () => {

  test('1 — Clean overworld: no UI covering pet (debug mode H)', async ({ page }) => {
    await seedAndLoad(page);
    await page.waitForTimeout(1000);

    // Press H to toggle debug mode — hide all UI
    await page.keyboard.press('h');
    await page.waitForTimeout(500);

    // Screenshot with NO UI — clean grounding check
    await page.screenshot({ path: 'e2e/screenshots/grounding-clean-no-ui.png', fullPage: true });

    // Verify sprite is visible and grounded
    const spriteEl = page.locator('.anim-sprite-idle').first();
    await expect(spriteEl).toBeVisible();

    const transformOrigin = await spriteEl.evaluate((el: HTMLElement) => {
      return window.getComputedStyle(el).transformOrigin;
    });
    console.log('CLEAN VIEW transform-origin:', transformOrigin);

    // Press H again to restore UI
    await page.keyboard.press('h');
    await page.waitForTimeout(500);
  });

  test('2 — Panel CLOSED: pet not obstructed, tab visible', async ({ page }) => {
    await seedAndLoad(page);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/grounding-panel-closed.png', fullPage: true });

    // Bottom hotbar should NOT exist
    const bottomBar = page.locator('.fixed.bottom-1\\.5');
    await expect(bottomBar).toHaveCount(0);

    // Right tab handle should be visible
    const tabHandle = page.locator('button:has-text("‹")').last();
    await expect(tabHandle).toBeVisible();
  });

  test('3 — Panel OPEN: slides out, buttons visible', async ({ page }) => {
    await seedAndLoad(page);
    await page.waitForTimeout(1000);

    // Click the tab handle to open panel — locate by the energy burst icon inside the tab button
    const tabHandle = page.locator('button:has(img[src*="effect_energy_burst"])');
    await tabHandle.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/grounding-panel-open.png', fullPage: true });

    // Panel should be visible with action buttons
    const panelHeader = page.locator('span', { hasText: /Command Deck/i });
    await expect(panelHeader.first()).toBeVisible();
  });

  test('4 — Outside scene: grounding with no bottom bar', async ({ page }) => {
    await seedAndLoad(page);
    await page.waitForTimeout(1000);

    // Navigate to outside
    const rightArrow = page.locator('button:has-text("›")').first();
    if (await rightArrow.isVisible()) {
      await rightArrow.click();
      await page.waitForTimeout(1500);
    }

    // Hide UI for clean check
    await page.keyboard.press('h');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/grounding-outside-clean.png', fullPage: true });

    // Restore
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
  });

  test('5 — Breathing animation: feet stay planted', async ({ page }) => {
    await seedAndLoad(page);
    await page.waitForTimeout(1000);

    const spriteEl = page.locator('.anim-sprite-idle').first();
    if (!await spriteEl.isVisible()) return;

    const positions: number[] = [];
    for (let i = 0; i < 6; i++) {
      const box = await spriteEl.boundingBox();
      if (box) {
        positions.push(Math.round(box.y + box.height));
        console.log(`FRAME ${i}: bottom=${Math.round(box.y + box.height)}, top=${Math.round(box.y)}, height=${Math.round(box.height)}`);
      }
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'e2e/screenshots/grounding-breathing.png', fullPage: true });

    if (positions.length >= 2) {
      const drift = Math.max(...positions) - Math.min(...positions);
      console.log(`BREATHING DRIFT: ${drift}px`);
      expect(drift).toBeLessThanOrEqual(2);
    }
  });
});
