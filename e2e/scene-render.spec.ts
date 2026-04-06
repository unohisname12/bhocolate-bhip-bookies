import { test, expect } from '@playwright/test';

// Seed a saved game state so we land on the home screen with a pet.
// Version 4 matches the new 2-room system.
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
      bond: 10,
      bornAt: Date.now(),
      needs: { health: 80, hunger: 70, happiness: 90, cleanliness: 60 },
      progression: { level: 2, xp: 30 },
      moves: [
        { id: 'tackle', name: 'Tackle', power: 10, accuracy: 90, type: 'physical', description: 'A basic attack' },
      ],
    },
    egg: null,
    player: {
      id: 'test-player',
      currencies: { tokens: 500, coins: 5 },
      streaks: { loginDays: 1, correctAnswers: 0, lastLoginDate: new Date().toISOString().split('T')[0] },
    },
    session: { startedAt: Date.now(), pausedAt: null },
    animation: { animationName: 'idle', frameIndex: 0, frameCount: 1, frameDurationMs: 175, elapsedMs: 0, autoplay: true, isFinished: false },
    test: { active: false, label: '' },
    inventory: { items: [] },
    room: { backgroundId: 'default', items: [], moodBonus: 0 },
    battle: { active: false, turn: 0, playerHP: 100, opponentHP: 100, log: [], result: null, opponentPet: null, currentTurn: null, stakeAmount: 0 },
    events: [],
    achievements: [],
    notifications: [],
    lastUpdate: Date.now(),
    dailyGoals: { date: new Date().toISOString().split('T')[0], mathSolved: 0, battlesWon: 0, rewardClaimed: false },
    classroom: { classmates: [], selectedOpponentId: null },
    battleTickets: { tickets: [], lastRefill: Date.now(), maxTickets: 3 },
    matchHistory: [],
    matchupTrackers: [],
    trophyCase: { trophies: [], displaySlots: 3 },
  },
};

test.describe('Scene rendering with pet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Inject saved state
    await page.evaluate((seed) => {
      localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
    }, SEED_STATE);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('game scene shell renders all layers', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/scene-inside.png', fullPage: true });

    // Check the fixed scene container exists
    const sceneContainer = page.locator('.fixed.inset-0.overflow-hidden');
    await expect(sceneContainer).toBeVisible();

    // Check TopHUD — pet name visible
    const topHud = page.locator('text=TestPet');
    await expect(topHud).toBeVisible();

    // Check RightSidePanel — Command Deck tab button is visible
    const commandDeckTab = page.locator('button', { hasText: 'Command Deck' }).first();
    await expect(commandDeckTab).toBeVisible();

    // Check room navigator arrows
    const leftArrow = page.locator('button:has-text("‹")');
    const rightArrow = page.locator('button:has-text("›")');
    await expect(leftArrow).toBeVisible();
    await expect(rightArrow).toBeVisible();

    // Check room dot — should have "Home" aria-label (inside room)
    const roomDot = page.getByLabel('Home');
    await expect(roomDot).toBeVisible();

    // Check scene layer images are rendered (layered scene system)
    const layerImg = page.locator('img[src*="layer_indoor"]').first();
    await expect(layerImg).toBeVisible();
    const naturalWidth = await layerImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('navigate to outside room and verify background', async ({ page }) => {
    const rightArrow = page.locator('button:has-text("›")');
    await rightArrow.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/scene-outside.png', fullPage: true });

    // Check room dot — should have "Yard" aria-label (outside room)
    const roomDot = page.getByLabel('Yard');
    await expect(roomDot).toBeVisible();

    // Check scene layer images are rendered (layered scene system)
    const layerImg = page.locator('img[src*="layer_outdoor"]').first();
    await expect(layerImg).toBeVisible();
    const naturalWidth = await layerImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('no 404s across both rooms', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/assets/') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // Start on inside, navigate to outside and back
    const rightArrow = page.locator('button:has-text("›")');
    await page.waitForTimeout(800);
    await rightArrow.click();
    await page.waitForTimeout(800);
    await rightArrow.click();
    await page.waitForTimeout(800);

    if (failedRequests.length > 0) {
      console.log('FAILED REQUESTS:', failedRequests);
    }
    expect(failedRequests).toEqual([]);
  });
});
