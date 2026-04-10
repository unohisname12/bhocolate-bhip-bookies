import { test, expect } from '@playwright/test';

const now = Date.now();
const isoNow = new Date().toISOString();
const todayStr = isoNow.split('T')[0];

const SEED_STATE = {
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
      speciesId: 'slime_baby',
      name: 'TestPet',
      type: 'slime_baby',
      stage: 'baby',
      mood: 'playful',
      state: 'idle',
      bond: 10,
      needs: { hunger: 80, happiness: 80, health: 100, cleanliness: 90 },
      progression: { level: 5, xp: 50, evolutionFlags: [] },
      stats: { strength: 15, speed: 12, defense: 80 },
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
      currencies: { tokens: 500, coins: 100 },
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

/** Seed state with an ACTIVE battle and 100 energy — for tests that need high energy */
const BATTLE_ACTIVE_SEED = {
  ...SEED_STATE,
  state: {
    ...SEED_STATE.state,
    screen: 'battle',
    battle: {
      active: true,
      phase: 'player_turn',
      playerPet: {
        petId: 'test-pet', name: 'TestPet', speciesId: 'slime_baby', level: 5,
        maxHP: 1000, currentHP: 1000, energy: 100, maxEnergy: 100,
        strength: 15, speed: 12, defense: 80,
        moves: [
          { id: 'slime_toss', name: 'Slime Toss', type: 'attack', power: 35, accuracy: 90, cost: 8, description: 'Throw slime.' },
          { id: 'absorb', name: 'Absorb', type: 'heal', power: 25, accuracy: 100, cost: 12, description: 'Absorb to heal.' },
          { id: 'harden', name: 'Harden', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Harden body.' },
          { id: 'acid_splash', name: 'Acid Splash', type: 'special', power: 70, accuracy: 85, cost: 20, description: 'Acid splash.' },
        ],
        buffs: [],
      },
      enemyPet: {
        petId: 'enemy_1', name: 'Wild Slime', speciesId: 'slime_baby', level: 5,
        maxHP: 500, currentHP: 500, energy: 30, maxEnergy: 100,
        strength: 10, speed: 10, defense: 10,
        moves: [
          { id: 'tackle', name: 'Tackle', type: 'attack', power: 35, accuracy: 95, cost: 8, description: 'Basic tackle.' },
          { id: 'guard', name: 'Guard', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Guard.' },
          { id: 'rest', name: 'Rest', type: 'heal', power: 30, accuracy: 100, cost: 12, description: 'Rest to heal.' },
          { id: 'burst', name: 'Burst', type: 'special', power: 60, accuracy: 80, cost: 18, description: 'Energy burst.' },
        ],
        buffs: [],
      },
      turnCount: 1,
      log: [{ turn: 0, actor: 'player', action: 'battle_start', message: 'A wild Wild Slime appeared!' }],
      mathBuffActive: false,
      traceBuffs: { shieldTier: null, runeBoostTier: null, mathTraceTier: null },
      combo: { count: 0, multiplier: 1.0, lastAction: '' },
      enemyIntent: null,
      focusUsedThisTurn: false,
    },
  },
};

async function enterBattleWithEnergy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
  }, BATTLE_ACTIVE_SEED);
  await page.reload();
  await page.waitForTimeout(1500);
}

async function enterBattle(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
  }, SEED_STATE);
  await page.reload();
  await page.waitForTimeout(1000);

  // Open the right side panel first (it starts closed)
  const panelTab = page.locator('button.fixed.right-0').first();
  await panelTab.click();
  await page.waitForTimeout(400);

  // Now click Battle inside the slide-out panel
  const practiceBtn = page.locator('button', { hasText: 'Battle' }).first();
  await practiceBtn.click({ timeout: 10000 });
  await page.waitForTimeout(800);

  // Click through the "Choose Your Fighter" species picker
  const fighterBtn = page.locator('button', { hasText: '→' }).first();
  await fighterBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1500);
}

test.describe('Trace Event System', () => {
  test('trace digit button opens trace overlay', async ({ page }) => {
    await enterBattle(page);

    const traceDigitBtn = page.locator('button', { hasText: 'Trace Digit' });
    await expect(traceDigitBtn).toBeVisible();

    await traceDigitBtn.click();
    await page.waitForTimeout(300);

    // Trace overlay should appear with prompt text and timer
    const overlay = page.locator('.anim-trace-enter');
    await expect(overlay).toBeVisible();

    // Should show "traced" completion text
    await expect(page.locator('text=/\\d+% traced/')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/trace-digit-overlay.png', fullPage: true });
  });

  test('trace answer button opens multi-digit trace overlay', async ({ page }) => {
    await enterBattle(page);

    const traceAnswerBtn = page.locator('button', { hasText: 'Trace Answer' });
    await expect(traceAnswerBtn).toBeVisible();

    await traceAnswerBtn.click();
    await page.waitForTimeout(300);

    // Trace overlay should appear
    const overlay = page.locator('.anim-trace-enter');
    await expect(overlay).toBeVisible();

    // Prompt should mention "Trace the answer"
    await expect(page.locator('text=/Trace the answer/i')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/trace-answer-overlay.png', fullPage: true });
  });

  test('trace overlay expires after time limit and closes gracefully', async ({ page }) => {
    await enterBattle(page);

    const traceDigitBtn = page.locator('button', { hasText: 'Trace Digit' });
    await traceDigitBtn.click();
    await page.waitForTimeout(300);

    // Overlay should be visible
    await expect(page.locator('.anim-trace-enter')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/trace-active.png', fullPage: true });

    // Wait for trace_missing_digit time limit (6s) + result flash (0.8s) + buffer
    await page.waitForTimeout(7500);

    // Overlay should be dismissed, back to battle
    await expect(page.locator('button', { hasText: 'Trace Digit' })).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'e2e/screenshots/trace-expired.png', fullPage: true });
  });

  test('power rune button appears when energy is sufficient', async ({ page }) => {
    await enterBattleWithEnergy(page);

    // Seeded with energy=100, above RUNE_ENERGY_THRESHOLD (60)
    const runeBtn = page.locator('button', { hasText: 'Power Rune' });
    await expect(runeBtn).toBeVisible({ timeout: 5000 });

    await runeBtn.click();
    await page.waitForTimeout(300);

    // Rune trace overlay should appear
    const overlay = page.locator('.anim-trace-enter');
    await expect(overlay).toBeVisible();

    // Should show "Draw the" prompt
    await expect(page.locator('text=/Draw the/i')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/trace-rune-overlay.png', fullPage: true });
  });

  test('trace overlay renders SVG path and responds to pointer', async ({ page }) => {
    await enterBattle(page);

    const traceDigitBtn = page.locator('button', { hasText: 'Trace Digit' });
    await traceDigitBtn.click();
    await page.waitForTimeout(300);

    // SVG should be present with viewBox
    const svg = page.locator('svg[viewBox="0 0 1 1"]');
    await expect(svg).toBeVisible();

    // Get overlay bounding box for pointer simulation
    const overlay = page.locator('.anim-trace-enter');
    const box = await overlay.boundingBox();

    if (box) {
      // Simulate a trace stroke across the overlay
      const startX = box.x + box.width * 0.3;
      const startY = box.y + box.height * 0.3;
      const endX = box.x + box.width * 0.7;
      const endY = box.y + box.height * 0.7;

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      // Trace a diagonal line
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        await page.mouse.move(x, y);
        await page.waitForTimeout(30);
      }

      await page.mouse.up();
    }

    await page.screenshot({ path: 'e2e/screenshots/trace-after-stroke.png', fullPage: true });
  });

  test('all three brain boost options visible during player turn', async ({ page }) => {
    await enterBattleWithEnergy(page);

    // All three options should be available
    await expect(page.locator('button', { hasText: 'Type Answer' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Trace Digit' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Trace Answer' })).toBeVisible();

    // Seeded with energy=100, above RUNE_ENERGY_THRESHOLD (60)
    await expect(page.locator('button', { hasText: 'Power Rune' })).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/trace-all-options.png', fullPage: true });
  });
});
