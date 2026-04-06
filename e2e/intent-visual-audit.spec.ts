import { test, expect } from '@playwright/test';

/**
 * Visual audit: takes screenshots of every pet intent scenario
 * so we can verify grounding, animation selection, and fallback behavior.
 *
 * These are NOT pass/fail visual regression tests — they produce screenshots
 * for human review. Only deterministic assertions are included.
 */

const now = Date.now();
const isoNow = new Date().toISOString();
const todayStr = isoNow.split('T')[0];

function makeSeed(overrides: {
  state?: string;
  hunger?: number;
  happiness?: number;
  cleanliness?: number;
  health?: number;
}) {
  return {
    version: 4,
    timestamp: now,
    checksum: '0',
    state: {
      initialized: true,
      mode: 'normal',
      screen: 'home',
      elapsedMs: 0,
      tickCount: 0,
      engineTime: 0,
      currentRoom: 'outside',
      pet: {
        id: 'test-pet',
        ownerId: 'test-player',
        speciesId: 'koala_sprite',
        name: 'TestKoala',
        type: 'koala_sprite',
        stage: 'baby',
        mood: 'playful',
        state: overrides.state ?? 'idle',
        bond: 10,
        needs: {
          hunger: overrides.hunger ?? 80,
          happiness: overrides.happiness ?? 80,
          health: overrides.health ?? 100,
          cleanliness: overrides.cleanliness ?? 80,
        },
        progression: { level: 3, xp: 40, evolutionFlags: [] },
        stats: { strength: 12, speed: 10, defense: 10 },
        timestamps: {
          createdAt: isoNow,
          lastInteraction: isoNow,
          lastFedAt: isoNow,
          lastCleanedAt: isoNow,
        },
      },
      egg: null,
      player: {
        id: 'test-player',
        currencies: { tokens: 100, coins: 10 },
        streaks: { loginDays: 1, correctAnswers: 0, lastLoginDate: todayStr },
      },
      session: { startedAt: now, pausedAt: null },
      animation: { animationName: 'idle', frameIndex: 0, frameCount: 1, frameDurationMs: 175, elapsedMs: 0, autoplay: true, isFinished: false },
      test: { active: false, label: '' },
      inventory: { items: [] },
      room: { backgroundId: 'default', items: [], moodBonus: 0 },
      battle: { active: false, turn: 0, playerHP: 100, opponentHP: 100, log: [], result: null, opponentPet: null, currentTurn: null, stakeAmount: 0 },
      events: [],
      achievements: [],
      notifications: [],
      lastUpdate: now,
      dailyGoals: { date: todayStr, mathSolved: 0, battlesWon: 0, rewardClaimed: false },
      classroom: { classmates: [], selectedOpponentId: null },
      battleTickets: { tickets: [], lastRefill: now, maxTickets: 3 },
      matchHistory: [],
      matchupTrackers: [],
      trophyCase: { trophies: [], displaySlots: 3 },
    },
  };
}

async function loadWithSeed(page: import('@playwright/test').Page, seed: ReturnType<typeof makeSeed>) {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), seed);
  await page.reload();
  await page.waitForTimeout(1500);
  // Press D to enable debug overlay
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  // Press H to hide UI for clean screenshot
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
}

test.describe('Intent Visual Audit', () => {
  test('idle — normal needs, no urgent states', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 80, happiness: 60, cleanliness: 60, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-idle.png' });

    // Verify pet is visible
    const sprite = page.locator('.anim-sprite-idle');
    await expect(sprite).toBeVisible();
  });

  test('happy — all needs high', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 90, happiness: 90, cleanliness: 90, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-happy.png' });

    const sprite = page.locator('.anim-sprite-happy');
    await expect(sprite).toBeVisible();
  });

  test('hungry — low hunger', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 15, happiness: 80, cleanliness: 80, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-hungry.png' });

    const sprite = page.locator('.anim-sprite-hungry');
    await expect(sprite).toBeVisible();
  });

  test('dirty — low cleanliness (fallback expected)', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 80, happiness: 80, cleanliness: 10, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-dirty.png' });

    // Dirty has no sprite sheet yet — should show fallback box
    const fallback = page.locator('text=Missing Animation');
    await expect(fallback).toBeVisible();
  });

  test('sick — low health', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 80, happiness: 80, cleanliness: 80, health: 20 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-sick.png' });

    // Sick uses wobble + grayscale
    const sprite = page.locator('.anim-wobble');
    await expect(sprite).toBeVisible();
  });

  test('sleeping — pet state set to sleeping', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ state: 'sleeping', hunger: 80, happiness: 80, cleanliness: 80, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-sleeping.png' });

    const sprite = page.locator('.anim-sprite-sleep');
    await expect(sprite).toBeVisible();
  });

  test('dead — zero health', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 80, happiness: 80, cleanliness: 80, health: 0 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-dead.png' });

    // Dead uses grayscale + rotate
    const sprite = page.locator('.filter.grayscale');
    await expect(sprite).toBeVisible();
  });

  test('priority — hungry + dirty: hungry wins', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ hunger: 10, cleanliness: 10, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-hungry-over-dirty.png' });

    // Hungry has higher priority than dirty
    const sprite = page.locator('.anim-sprite-hungry');
    await expect(sprite).toBeVisible();
  });

  test('priority — sleeping + hungry: sleeping wins', async ({ page }) => {
    await loadWithSeed(page, makeSeed({ state: 'sleeping', hunger: 10, health: 100 }));
    await page.screenshot({ path: 'e2e/screenshots/intent-sleeping-over-hungry.png' });

    // Sleeping overrides hungry
    const sprite = page.locator('.anim-sprite-sleep');
    await expect(sprite).toBeVisible();
  });

  test('grounding — pet feet aligned with ground, shadow visible', async ({ page }) => {
    // Use moderate needs that resolve to idle (not happy)
    await loadWithSeed(page, makeSeed({ hunger: 60, happiness: 60, cleanliness: 60, health: 80 }));
    // Turn off debug overlay for clean grounding check
    await page.keyboard.press('d');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'e2e/screenshots/intent-grounding.png' });

    // Check the pet sprite container is positioned correctly
    const petContainer = page.locator('.anim-sprite-idle').first();
    const rect = await petContainer.boundingBox();
    expect(rect).toBeTruthy();
    // Pet should be in the lower portion of the viewport (bottom 45%)
    if (rect) {
      const viewport = page.viewportSize()!;
      expect(rect.y + rect.height).toBeGreaterThan(viewport.height * 0.55);
    }
  });
});
