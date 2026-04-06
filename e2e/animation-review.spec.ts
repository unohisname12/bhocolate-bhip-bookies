import { test, expect } from '@playwright/test';

const SEED_STATE = {
  version: 4,
  timestamp: Date.now(),
  checksum: '0',
  state: {
    initialized: true,
    mode: 'normal',
    screen: 'home',
    elapsedMs: 0,
    tickCount: 0,
    engineTime: 0,
    currentRoom: 'inside',
    pet: {
      id: 'test-pet',
      name: 'TestPet',
      type: 'slime_baby',
      stage: 'baby',
      state: 'idle',
      needs: { hunger: 80, happiness: 80, health: 100, cleanliness: 90 },
      progression: { level: 3, xp: 50, xpToNext: 100, totalXp: 350 },
      personalityTraits: [],
      skills: { math: { level: 1, xp: 0 } },
      battleStats: {
        wins: 0, losses: 0, winStreak: 0, bestStreak: 0,
        totalDamageDealt: 0, totalDamageReceived: 0,
      },
    },
    egg: null,
    player: {
      currencies: { tokens: 500, coins: 100 },
      inventory: [],
      settings: { theme: 'dark', sfx: true, music: true },
      streaks: { loginDays: 1, correctAnswers: 0, bestLogin: 1 },
    },
    battle: {
      active: false, phase: 'idle', turn: 'player',
      playerHP: 100, opponentHP: 100, maxPlayerHP: 100, maxOpponentHP: 100,
      playerBlock: 0, opponentBlock: 0,
      difficulty: 1, currentQuestion: null, log: [],
      combo: 0, maxCombo: 0, roundNumber: 0, timeLimit: 30,
      questionStartTime: null, totalDamageDealt: 0, totalDamageReceived: 0,
      opponent: null,
    },
    classroom: { classmates: [], selectedOpponentId: null },
    matchHistory: [],
    trophyCase: { trophies: [], displaySlots: 5 },
    battleTickets: { tickets: [], maxTickets: 5, lastRefill: '' },
    matchupTrackers: {},
    dailyGoals: { goals: [], lastRefresh: '', streak: 0 },
    achievements: { unlocked: [], progress: {} },
    notifications: [],
  },
};

test.describe('Animation Review Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000');
    await page.evaluate((seed) => {
      localStorage.setItem('vpet_save_v4', JSON.stringify(seed));
    }, SEED_STATE);
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('can navigate to animation review screen', async ({ page }) => {
    // Click the "Review Animations" button (dev mode only)
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Should see the Animation Review header
    await expect(page.locator('h1', { hasText: 'Animation Review' })).toBeVisible();
  });

  test('shows all 20 animations in the thumbnail strip', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Check that the animation review screen loaded
    await expect(page.locator('h1', { hasText: 'Animation Review' })).toBeVisible();

    // Should show "20 Left" in the stats
    await expect(page.locator('text=20 Left')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/animation-review-overview.png', fullPage: true });
  });

  test('keyboard navigation works (left/right arrows)', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Should start at 1/20
    await expect(page.locator('text=1 / 20')).toBeVisible();

    // Press right arrow
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    await expect(page.locator('text=2 / 20')).toBeVisible();

    // Press left arrow to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    await expect(page.locator('text=1 / 20')).toBeVisible();
  });

  test('review status changes with keyboard shortcuts', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Press K to keep
    await page.keyboard.press('k');
    await page.waitForTimeout(200);

    // Should auto-advance to 2/20 and show "1 Keep"
    await expect(page.locator('text=1 Keep')).toBeVisible();

    // Press R to reject the second
    await page.keyboard.press('r');
    await page.waitForTimeout(200);

    // Should show "1 Reject"
    await expect(page.locator('text=1 Reject')).toBeVisible();
  });

  test('play/pause with spacebar', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Should show Pause button (playing by default)
    await expect(page.locator('button', { hasText: 'Pause' })).toBeVisible();

    // Press space to pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Should show Play button now
    await expect(page.locator('button', { hasText: 'Play' })).toBeVisible();
  });

  test('grid view toggle with G key', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // No grid view initially
    await expect(page.locator('text=Raw Grid')).not.toBeVisible();

    // Press G to toggle
    await page.keyboard.press('g');
    await page.waitForTimeout(100);

    // Should show grid view
    await expect(page.locator('text=Raw Grid')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/animation-review-grid-view.png', fullPage: true });
  });

  test('back button returns to home', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Click back
    const backBtn = page.locator('button', { hasText: 'Back' });
    await backBtn.click();
    await page.waitForTimeout(300);

    // Should not see Animation Review anymore
    await expect(page.locator('h1', { hasText: 'Animation Review' })).not.toBeVisible();
  });

  test('screenshot each animation for visual inspection', async ({ page }) => {
    const reviewBtn = page.locator('button', { hasText: 'Review Animations' });
    await reviewBtn.click();
    await page.waitForTimeout(300);

    // Pause playback for consistent screenshots
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Toggle grid view so we can see the raw grid
    await page.keyboard.press('g');
    await page.waitForTimeout(100);

    // Screenshot first 5 animations
    for (let i = 0; i < 5; i++) {
      await page.screenshot({
        path: `e2e/screenshots/animation-review-${i + 1}.png`,
        fullPage: true,
      });
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    }
  });
});
