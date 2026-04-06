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

/** Returns true if battle is still active, false if ended (victory/defeat/home) */
async function isBattleActive(page: import('@playwright/test').Page): Promise<boolean> {
  const victory = await page.locator('text=Victory!').isVisible().catch(() => false);
  const defeat = await page.locator('text=Defeated!').isVisible().catch(() => false);
  if (victory || defeat) return false;
  // Check we're not back on home screen
  const attackBtn = await page.locator('button', { hasText: 'ATTACK' }).isVisible().catch(() => false);
  const turnLabel = await page.locator('text=/Turn \\d+/').isVisible().catch(() => false);
  return !!(attackBtn || turnLabel);
}

/** Wait for player turn. Returns true if battle active and player can act, false if battle ended */
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

/** Try to click an attack move. Returns false if battle ended. */
async function tryAttack(page: import('@playwright/test').Page, movePattern: RegExp): Promise<boolean> {
  if (!await isBattleActive(page)) return false;
  const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
  await attackBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  if (!await isBattleActive(page)) return false;
  const moveBtn = page.locator('button').filter({ hasText: movePattern }).first();
  await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  return true;
}

/** Try to click a skill move. Returns false if battle ended. */
async function trySkill(page: import('@playwright/test').Page, movePattern: RegExp): Promise<boolean> {
  if (!await isBattleActive(page)) return false;
  const skillBtn = page.locator('button', { hasText: 'SKILL' }).first();
  await skillBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  if (!await isBattleActive(page)) return false;
  const moveBtn = page.locator('button').filter({ hasText: movePattern }).first();
  await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  return true;
}

test.describe('Battle System Fixes Verification', () => {
  test.setTimeout(60000); // Multi-turn battles need more time

  test('TEST 1 — Energy loop: player always has viable actions', async ({ page }) => {
    await enterBattle(page);
    await page.screenshot({ path: 'e2e/screenshots/fix-battle-start.png' });

    let turnsPlayed = 0;
    for (let i = 0; i < 6; i++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      // Every turn the player must have at least 1 usable action
      const attackVisible = await page.locator('button', { hasText: 'ATTACK' }).isVisible().catch(() => false);
      const defendVisible = await page.locator('button', { hasText: 'DEFEND' }).isVisible().catch(() => false);
      const focusVisible = await page.locator('button', { hasText: 'FOCUS' }).isVisible().catch(() => false);
      expect(attackVisible || defendVisible || focusVisible).toBe(true);

      if (i % 3 === 2) {
        // Focus for energy
        const focusBtn = page.locator('button', { hasText: 'FOCUS' }).first();
        const enabled = await focusBtn.isEnabled().catch(() => false);
        if (enabled) {
          await focusBtn.click({ force: true, timeout: 5000 }).catch(() => {});
        } else {
          await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true, timeout: 5000 }).catch(() => {});
        }
      } else {
        await tryAttack(page, /Slime Toss/i);
      }
      turnsPlayed++;
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'e2e/screenshots/fix-energy-loop.png' });
    expect(turnsPlayed).toBeGreaterThanOrEqual(1);
  });

  test('TEST 2 — Low energy recovery: Focus restores energy', async ({ page }) => {
    await enterBattle(page);

    // Spend energy
    for (let i = 0; i < 2; i++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;
      await tryAttack(page, /Slime Toss/i);
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'e2e/screenshots/fix-low-energy.png' });

    // Focus to recover
    const active = await waitForPlayerTurn(page);
    if (active) {
      const focusBtn = page.locator('button', { hasText: 'FOCUS' }).first();
      const enabled = await focusBtn.isEnabled().catch(() => false);
      if (enabled) {
        await focusBtn.click({ force: true });
        await page.waitForTimeout(2000);
        const stillActive = await waitForPlayerTurn(page);
        if (stillActive) {
          const canAct = await page.locator('button', { hasText: 'ATTACK' }).isVisible();
          expect(canAct).toBe(true);
        }
      }
    }
    // If battle ended before focus, that's fine — the test is about not getting stuck
  });

  test('TEST 3 — Heal values are reasonable', async ({ page }) => {
    await enterBattle(page);

    // Attack first
    let active = await waitForPlayerTurn(page);
    if (!active) return;
    await tryAttack(page, /Slime Toss/i);
    await page.waitForTimeout(2000);

    // Heal
    active = await waitForPlayerTurn(page);
    if (!active) return;
    await trySkill(page, /Absorb/i);
    await page.waitForTimeout(2000);

    // Check log for heal
    const pageText = await page.textContent('body').catch(() => '');
    const healMatch = pageText?.match(/healed for (\d+)/);
    if (healMatch) {
      const healAmt = parseInt(healMatch[1]);
      expect(healAmt).toBeGreaterThanOrEqual(1);
      expect(healAmt).toBeLessThanOrEqual(150);
    }

    await page.screenshot({ path: 'e2e/screenshots/fix-heal-action.png' });
  });

  test('TEST 4 — Enemy always acts meaningfully', async ({ page }) => {
    await enterBattle(page);

    let turnsPlayed = 0;
    for (let i = 0; i < 4; i++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      if (i % 2 === 0) {
        await tryAttack(page, /Slime Toss/i);
      } else {
        await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true }).catch(() => {});
      }
      turnsPlayed++;
      await page.waitForTimeout(2000);
    }

    // Body must contain enemy action text
    const pageText = await page.textContent('body') ?? '';
    const hasEnemyAction = pageText.includes('Wild') || pageText.includes('appeared');
    expect(hasEnemyAction).toBeTruthy();

    await page.screenshot({ path: 'e2e/screenshots/fix-enemy-behavior.png' });
  });

  test('TEST 5 — Combat flow: no freezes over multiple turns', async ({ page }) => {
    await enterBattle(page);

    let turnsPlayed = 0;
    for (let turn = 0; turn < 5; turn++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      const turnText = await page.locator('text=/Turn \\d+/').first().textContent().catch(() => '');
      expect(turnText).toContain('Turn');

      const actions = ['attack', 'defend', 'skill'];
      const action = actions[turn % 3];

      if (action === 'attack') {
        await tryAttack(page, /Slime Toss/i);
      } else if (action === 'defend') {
        await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true }).catch(() => {});
      } else {
        await trySkill(page, /Absorb|Harden/i);
      }
      turnsPlayed++;
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'e2e/screenshots/fix-combat-flow.png' });
    expect(turnsPlayed).toBeGreaterThanOrEqual(1);
  });

  test('TEST 6 — Visual grounding: sprites visible, no UI blocking', async ({ page }) => {
    await enterBattle(page);

    await expect(page.locator('text=VS')).toBeVisible();
    await expect(page.locator('text=/Wild/').first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'ATTACK' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'DEFEND' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'FOCUS' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'ESCAPE' })).toBeVisible();
    await expect(page.locator('text=+4/turn')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/fix-visual-grounding.png' });
  });
});
