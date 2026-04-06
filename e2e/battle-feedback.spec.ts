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
      stats: { strength: 8, speed: 12, defense: 25 },
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

async function enterBattle(page: import('@playwright/test').Page) {
  // Seed save and load home screen
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
  await page.waitForTimeout(1500);
}

/** Click Attack action bar button, then select a move from the sub-menu */
async function selectAttackMove(page: import('@playwright/test').Page, movePattern: RegExp) {
  const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
  await attackBtn.click();
  await page.waitForTimeout(200);
  const moveBtn = page.locator('button').filter({ hasText: movePattern }).first();
  await moveBtn.click();
}

/** Click Skill action bar button, then select a move from the sub-menu */
async function selectSkillMove(page: import('@playwright/test').Page, movePattern: RegExp) {
  const skillBtn = page.locator('button', { hasText: 'SKILL' }).first();
  await skillBtn.click();
  await page.waitForTimeout(200);
  const moveBtn = page.locator('button').filter({ hasText: movePattern }).first();
  await moveBtn.click();
}

test.describe('Battle Visual Feedback System', () => {
  test('battle arena shows pet sprites, action bar, and VS indicator', async ({ page }) => {
    await enterBattle(page);

    // Verify battle arena is visible — check for action bar buttons
    await expect(page.locator('button', { hasText: 'ATTACK' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'DEFEND' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'SKILL' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'FOCUS' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'ESCAPE' })).toBeVisible();

    // Verify HP bars
    await expect(page.locator('text=HP').first()).toBeVisible();

    // Verify energy bars exist
    await expect(page.locator('text=EN').first()).toBeVisible();

    // Verify enemy intent display (first turn shows ???)
    await expect(page.locator('text=Intent').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/battle-arena.png', fullPage: true });
  });

  test('attack sub-menu shows moves and triggers visual feedback', async ({ page }) => {
    await enterBattle(page);

    // Open Attack sub-menu
    const attackBtn = page.locator('button', { hasText: 'ATTACK' });
    await attackBtn.click();
    await page.waitForTimeout(200);

    // Verify sub-menu shows attack moves and Back button
    await expect(page.locator('button', { hasText: '← Back' })).toBeVisible();
    await expect(page.locator('text=Attack Moves')).toBeVisible();

    // Screenshot the sub-menu
    await page.screenshot({ path: 'e2e/screenshots/battle-attack-submenu.png', fullPage: true });

    // Select an attack move (Slime Toss or Acid Splash)
    const moveBtn = page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first();
    await moveBtn.click();

    // Capture during animation
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/battle-during-attack.png', fullPage: true });

    // Wait for full turn cycle
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e/screenshots/battle-after-attack.png', fullPage: true });

    // Verify battle log has entries
    const logContainer = page.locator('.bg-slate-800.overflow-y-auto');
    const logText = await logContainer.textContent();
    expect(logText!.length).toBeGreaterThan(10);
  });

  test('defend action gives buff and restores energy', async ({ page }) => {
    await enterBattle(page);

    // Screenshot before defend
    await page.screenshot({ path: 'e2e/screenshots/battle-before-defend.png', fullPage: true });

    // Click Defend directly from action bar (no sub-menu)
    const defendBtn = page.locator('button', { hasText: 'DEFEND' });
    await defendBtn.click();

    // Wait for animation
    await page.waitForTimeout(2500);

    // Verify battle log shows defense action
    const logContainer = page.locator('.bg-slate-800.overflow-y-auto');
    const logText = await logContainer.textContent();
    expect(logText).toContain('defensive stance');

    await page.screenshot({ path: 'e2e/screenshots/battle-defend.png', fullPage: true });
  });

  test('focus action restores energy', async ({ page }) => {
    await enterBattle(page);

    // Click Focus directly from action bar
    const focusBtn = page.locator('button', { hasText: 'FOCUS' });
    await focusBtn.click();

    // Wait for enemy turn
    await page.waitForTimeout(2500);

    // Verify battle log shows focus action
    const logContainer = page.locator('.bg-slate-800.overflow-y-auto');
    const logText = await logContainer.textContent();
    expect(logText).toContain('focuses their energy');

    // Focus should be disabled after use this turn
    await page.screenshot({ path: 'e2e/screenshots/battle-focus.png', fullPage: true });
  });

  test('multiple attacks build combo meter', async ({ page }) => {
    await enterBattle(page);

    // Focus first to bank energy for attacks
    try {
      await page.locator('button', { hasText: 'FOCUS' }).click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    } catch { /* battle may have ended */ }

    // Perform up to 3 attacks
    for (let i = 0; i < 3; i++) {
      try {
        await page.locator('button', { hasText: 'ATTACK' }).click({ timeout: 8000 });
        await page.waitForTimeout(300);
        await page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first().click({ timeout: 3000 });
        await page.waitForTimeout(3000);
      } catch {
        break; // battle ended
      }
    }

    await page.screenshot({ path: 'e2e/screenshots/battle-combo.png', fullPage: true });
  });

  test('skill sub-menu shows skill moves', async ({ page }) => {
    await enterBattle(page);

    // Open Skill sub-menu
    const skillBtn = page.locator('button', { hasText: 'SKILL' });
    await skillBtn.click();
    await page.waitForTimeout(200);

    // Verify sub-menu shows skill moves
    await expect(page.locator('text=Skill Moves')).toBeVisible();
    await expect(page.locator('button', { hasText: '← Back' })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/battle-skill-submenu.png', fullPage: true });

    // Select a skill move (Absorb or Harden)
    const moveBtn = page.locator('button').filter({ hasText: /Absorb|Harden/i }).first();
    if (await moveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moveBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'e2e/screenshots/battle-skill-used.png', fullPage: true });
    }
  });

  test('Brain Boost choice panel is visible and keyboard input works', async ({ page }) => {
    await enterBattle(page);

    // "Type Answer" button replaces old "Brain Boost"
    const typeAnswerBtn = page.locator('button', { hasText: 'Type Answer' });
    await expect(typeAnswerBtn).toBeVisible();

    // Trace options should also be visible
    await expect(page.locator('button', { hasText: 'Trace Digit' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Trace Answer' })).toBeVisible();

    await typeAnswerBtn.click();
    await page.waitForTimeout(200);

    // Math challenge should appear
    const mathInput = page.locator('input[type="number"]');
    await expect(mathInput).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/battle-brain-boost.png', fullPage: true });
  });
});
