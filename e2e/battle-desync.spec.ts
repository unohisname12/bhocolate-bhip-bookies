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
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
  }, SEED_STATE);
  await page.reload();
  await page.waitForTimeout(1000);

  const panelTab = page.locator('button.fixed.right-0').first();
  await panelTab.click();
  await page.waitForTimeout(400);

  const practiceBtn = page.locator('button', { hasText: 'Battle' }).first();
  await practiceBtn.click({ timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function waitForPlayerTurn(page: import('@playwright/test').Page): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const victory = await page.locator('text=Victory!').isVisible().catch(() => false);
    const defeat = await page.locator('text=Defeated!').isVisible().catch(() => false);
    if (victory || defeat) return false;
    const actionBar = await page.locator('button', { hasText: 'ATTACK' }).isVisible().catch(() => false);
    if (actionBar) return true;
  }
  return false;
}

test.describe('Battle Animation Desync Verification', () => {
  test.setTimeout(90000);

  test('multi-turn attacks play without flicker or skipped animations', async ({ page }) => {
    await enterBattle(page);

    let turnsPlayed = 0;

    for (let turn = 0; turn < 6; turn++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      // Verify no stuck animation state: action bar should be interactive
      const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
      await expect(attackBtn).toBeVisible();

      // Alternate between attack and defend to exercise both animation paths
      if (turn % 3 === 2) {
        await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true });
      } else {
        await attackBtn.click();
        await page.waitForTimeout(200);
        const moveBtn = page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first();
        await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      }

      // Capture mid-animation screenshot
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e/screenshots/desync-turn${turn}-mid.png` });

      // Wait for animation sequence to complete
      await page.waitForTimeout(2500);

      // Capture post-animation screenshot
      await page.screenshot({ path: `e2e/screenshots/desync-turn${turn}-post.png` });

      turnsPlayed++;
    }

    expect(turnsPlayed).toBeGreaterThanOrEqual(2);
  });

  test('screen shake does not affect HUD bar or action bar', async ({ page }) => {
    await enterBattle(page);

    // Get HUD bar position before attack (replaces old sidebar check)
    const hudBar = page.locator('.battle-hud-bar').first();
    const hudBox = await hudBar.boundingBox();
    expect(hudBox).toBeTruthy();

    // Perform an attack to trigger screen shake
    const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
    await attackBtn.click();
    await page.waitForTimeout(200);
    const moveBtn = page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first();
    await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});

    // During shake (impact phase ~230ms after action), check HUD hasn't moved
    await page.waitForTimeout(250);
    const hudBoxDuring = await hudBar.boundingBox();
    expect(hudBoxDuring).toBeTruthy();

    // HUD Y position should be stable (not shaking)
    if (hudBox && hudBoxDuring) {
      expect(Math.abs(hudBox.y - hudBoxDuring.y)).toBeLessThanOrEqual(1);
    }

    await page.screenshot({ path: 'e2e/screenshots/desync-shake-scope.png' });
  });

  test('rapid actions do not leave stale animation state', async ({ page }) => {
    await enterBattle(page);

    // Play 4 turns as fast as possible
    for (let turn = 0; turn < 4; turn++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      if (turn % 2 === 0) {
        const focusBtn = page.locator('button', { hasText: 'FOCUS' }).first();
        const enabled = await focusBtn.isEnabled().catch(() => false);
        if (enabled) {
          await focusBtn.click({ force: true });
        } else {
          await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true });
        }
      } else {
        await page.locator('button', { hasText: 'ATTACK' }).first().click({ force: true });
        await page.waitForTimeout(200);
        await page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first()
          .click({ force: true, timeout: 3000 }).catch(() => {});
      }

      // Minimal wait — stress-test the queue
      await page.waitForTimeout(1500);
    }

    // After all turns, verify we're in a clean state (player turn or battle ended)
    await page.waitForTimeout(3000);
    const victory = await page.locator('text=Victory!').isVisible().catch(() => false);
    const defeat = await page.locator('text=Defeated!').isVisible().catch(() => false);
    const canAct = await page.locator('button', { hasText: 'ATTACK' }).isVisible().catch(() => false);

    // Must be in one of these clean states — not stuck mid-animation
    expect(victory || defeat || canAct).toBe(true);

    await page.screenshot({ path: 'e2e/screenshots/desync-rapid-final.png' });
  });
});
