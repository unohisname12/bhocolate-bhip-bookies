import { test, expect } from '@playwright/test';

const SEED_STATE = {
  version: 5, timestamp: Date.now(), checksum: '0',
  state: {
    initialized: true, mode: 'normal', screen: 'home', elapsedMs: 0, tickCount: 0, engineTime: 0,
    currentRoom: 'outside',
    pet: {
      id: 't', ownerId: 'p', speciesId: 'koala_sprite', name: 'TestPet', type: 'koala_sprite',
      stage: 'baby', mood: 'playful', state: 'idle', bond: 10,
      needs: { health: 80, hunger: 70, happiness: 90, cleanliness: 60 },
      stats: { strength: 10, speed: 10, defense: 10 },
      progression: { level: 2, xp: 30, evolutionFlags: [] },
      timestamps: { createdAt: new Date().toISOString(), lastInteraction: new Date().toISOString(), lastFedAt: new Date().toISOString(), lastCleanedAt: new Date().toISOString() },
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
    dailyGoals: { date: '2026-04-03', mathSolved: 0, battlesWon: 0, rewardClaimed: false },
    classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
    battleTickets: { tickets: [], maxTickets: 5, todayEarned: 0, todayUsed: 0, mathForNextTicket: 0, careActionsToday: { fed: false, cleaned: false, played: false } },
    matchHistory: [], matchupTrackers: [],
    trophyCase: { trophies: [], displayedInRoom: [], maxDisplay: 5 },
    mailbox: { lastClaimedDate: '', totalClaimed: 0 },
  },
};

test.describe('Interactive Scene System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), SEED_STATE);
    await page.reload();
    await page.waitForTimeout(2500);
  });

  test('house door hotspot is visible and clickable on outside scene', async ({ page }) => {
    // Should start on outside scene
    await expect(page.getByLabel('Yard')).toBeVisible();

    // House door hotspot should exist
    const doorHotspot = page.getByLabel('Enter House');
    await expect(doorHotspot).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/interactive-outside-before.png' });

    // Click the house door to enter
    await doorHotspot.click();
    await page.waitForTimeout(500);

    // Should now be inside
    await expect(page.getByLabel('Home')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/interactive-inside-after-enter.png' });
    console.log('House door click navigates inside ✓');
  });

  test('exit door hotspot works from inside scene', async ({ page }) => {
    // Navigate to inside first
    const doorHotspot = page.getByLabel('Enter House');
    await doorHotspot.click();
    await page.waitForTimeout(500);
    await expect(page.getByLabel('Home')).toBeVisible();

    // Inside door should exist
    const exitDoor = page.getByLabel('Go Outside');
    await expect(exitDoor).toBeVisible();

    // Click to exit
    await exitDoor.click();
    await page.waitForTimeout(500);

    // Should be back outside
    await expect(page.getByLabel('Yard')).toBeVisible();
    console.log('Exit door click navigates outside ✓');
  });

  test('mailbox hotspot is visible with reward indicator', async ({ page }) => {
    // Should be on outside scene
    await expect(page.getByLabel('Yard')).toBeVisible();

    // Mailbox hotspot should exist
    const mailbox = page.getByLabel('Mailbox');
    await expect(mailbox).toBeVisible();

    // Since lastClaimedDate is empty, there should be a reward indicator
    // The indicator is a child of the mailbox button
    const indicator = page.locator('.anim-scene-indicator');
    await expect(indicator).toBeVisible();
    console.log('Mailbox reward indicator visible ✓');

    await page.screenshot({ path: 'e2e/screenshots/interactive-mailbox-indicator.png' });
  });

  test('mailbox click opens popup and claim works', async ({ page }) => {
    const mailbox = page.getByLabel('Mailbox');
    await mailbox.click();
    await page.waitForTimeout(300);

    // Popup should be visible
    const popup = page.locator('.anim-scene-popup');
    await expect(popup).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/interactive-mailbox-popup.png' });

    // Should see claim button
    const claimBtn = page.locator('button:has-text("Claim Reward")');
    await expect(claimBtn).toBeVisible();

    // Click claim
    await claimBtn.click();
    await page.waitForTimeout(400);

    // Should see claimed confirmation in the popup
    const claimed = page.locator('.anim-scene-popup').getByText('Claimed!', { exact: true });
    await expect(claimed).toBeVisible();
    console.log('Mailbox claim works ✓');

    await page.screenshot({ path: 'e2e/screenshots/interactive-mailbox-claimed.png' });

    // Wait for popup to close
    await page.waitForTimeout(600);
  });

  test('inside interactive objects are visible', async ({ page }) => {
    // Navigate inside
    const doorHotspot = page.getByLabel('Enter House');
    await doorHotspot.click();
    await page.waitForTimeout(500);

    // Check inside interactive objects
    const exitDoor = page.getByLabel('Go Outside');
    const fireplace = page.getByLabel('Fireplace');
    const bookshelf = page.getByLabel('Bookshelf');

    await expect(exitDoor).toBeVisible();
    await expect(fireplace).toBeVisible();
    await expect(bookshelf).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/interactive-inside-objects.png' });
    console.log('Inside interactive objects visible ✓');
  });

  test('hover shows tooltip on house door', async ({ page }) => {
    const doorHotspot = page.getByLabel('Enter House');

    // Hover over the door
    await doorHotspot.hover();
    await page.waitForTimeout(300);

    // Tooltip should appear
    const tooltip = page.locator('.anim-scene-tooltip');
    await expect(tooltip).toBeVisible();

    // Check tooltip content
    await expect(page.locator('.anim-scene-tooltip:has-text("Enter House")')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/interactive-door-hover.png' });
    console.log('Door hover tooltip visible ✓');
  });

  test('environmental life effects are present', async ({ page }) => {
    // Check outside environmental effects
    const envEffects = page.locator('.anim-env-fireplace, .anim-env-sun-rays, .anim-env-tree-sway');
    const outsideCount = await envEffects.count();
    console.log(`Outside environmental elements: ${outsideCount}`);
    expect(outsideCount).toBeGreaterThan(0);

    // Navigate inside and check
    await page.getByLabel('Enter House').click();
    await page.waitForTimeout(500);

    const insideEffects = page.locator('.anim-env-fireplace, .anim-env-window, .anim-env-pendulum');
    const insideCount = await insideEffects.count();
    console.log(`Inside environmental elements: ${insideCount}`);
    expect(insideCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'e2e/screenshots/interactive-env-effects.png' });
    console.log('Environmental life effects present ✓');
  });

  test('scene transitions still work with interactive objects', async ({ page }) => {
    // Full round trip: outside → door click inside → door click outside → arrow inside → arrow outside
    await expect(page.getByLabel('Yard')).toBeVisible();

    // Door click in
    await page.getByLabel('Enter House').click();
    await page.waitForTimeout(400);
    await expect(page.getByLabel('Home')).toBeVisible();

    // Door click out
    await page.getByLabel('Go Outside').click();
    await page.waitForTimeout(400);
    await expect(page.getByLabel('Yard')).toBeVisible();

    // Arrow click in (original navigation still works)
    await page.locator('button:has-text("›")').click();
    await page.waitForTimeout(400);
    await expect(page.getByLabel('Home')).toBeVisible();

    // Arrow click out
    await page.locator('button:has-text("‹")').click();
    await page.waitForTimeout(400);
    await expect(page.getByLabel('Yard')).toBeVisible();

    console.log('All transitions work correctly ✓');
  });

  test('no visual clutter — hotspots are subtle when not hovered', async ({ page }) => {
    // Take a screenshot of the scene without any hover/interaction
    await page.mouse.move(640, 200); // Move mouse away from hotspots
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/interactive-no-clutter.png' });

    // Tooltips should NOT be visible when nothing is hovered
    const tooltips = page.locator('.anim-scene-tooltip');
    await expect(tooltips).toHaveCount(0);

    // Door hint should NOT be visible
    const doorHints = page.locator('.anim-scene-door-hint');
    await expect(doorHints).toHaveCount(0);

    console.log('No visual clutter when not interacting ✓');
  });
});
