import { test, expect } from '@playwright/test';

/**
 * Deterministic tests for the intent priority system and fallback behavior.
 * These verify the actual rendered result in the browser, not mocked logic.
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
  speciesId?: string;
}) {
  const species = overrides.speciesId ?? 'koala_sprite';
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
        speciesId: species,
        name: 'TestPet',
        type: species,
        stage: 'baby',
        mood: 'playful',
        state: overrides.state ?? 'idle',
        bond: 10,
        needs: {
          hunger: overrides.hunger ?? 60,
          happiness: overrides.happiness ?? 60,
          health: overrides.health ?? 100,
          cleanliness: overrides.cleanliness ?? 60,
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

async function loadAndGetDebug(page: import('@playwright/test').Page, seed: ReturnType<typeof makeSeed>) {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), seed);
  await page.reload();
  await page.waitForTimeout(1500);
  // Press D to enable debug overlay
  await page.keyboard.press('d');
  await page.waitForTimeout(400);

  // Read the debug overlay text content
  const overlay = page.locator('.pointer-events-none.whitespace-nowrap').first();
  const text = await overlay.textContent() ?? '';
  return text;
}

test.describe('Intent Priority System', () => {

  test('dead overrides everything (priority 1)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ state: 'dead', health: 5, hunger: 10, cleanliness: 5 }));
    expect(debug).toContain('intent: dead');
    expect(debug).toContain('anim: dead');
  });

  test('sick overrides hungry and dirty (priority 2)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ health: 20, hunger: 10, cleanliness: 5 }));
    expect(debug).toContain('intent: sick');
    expect(debug).toContain('anim: sick');
  });

  test('sleeping overrides hungry (priority 3)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ state: 'sleeping', hunger: 10 }));
    expect(debug).toContain('intent: sleep');
    expect(debug).toContain('anim: sleeping');
  });

  test('sleeping is broken by sickness (health crisis)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ state: 'sleeping', health: 15 }));
    expect(debug).toContain('intent: sick');
  });

  test('hungry overrides dirty (priority 4 > 5)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ hunger: 10, cleanliness: 10 }));
    expect(debug).toContain('intent: eat');
    expect(debug).toContain('anim: hungry');
  });

  test('dirty triggers at low cleanliness (priority 5)', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({ hunger: 60, cleanliness: 10 }));
    expect(debug).toContain('intent: dirty');
    expect(debug).toContain('anim: sick');
  });

  test('happy requires high needs with no urgent problems', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({
      hunger: 90, happiness: 90, cleanliness: 90, health: 100,
    }));
    expect(debug).toContain('intent: happy');
    expect(debug).toContain('anim: happy');
  });

  test('happy blocked when hunger is moderate', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({
      hunger: 40, happiness: 90, cleanliness: 90, health: 100,
    }));
    // Hunger is 40, which is > 25 (not hungry) but <= 50 (blocks happy)
    expect(debug).toContain('intent: idle');
  });

  test('idle is the true fallback', async ({ page }) => {
    const debug = await loadAndGetDebug(page, makeSeed({
      hunger: 50, happiness: 50, cleanliness: 50, health: 60,
    }));
    expect(debug).toContain('intent: idle');
    expect(debug).toContain('anim: idle');
  });
});

test.describe('Animation Fallback Behavior', () => {

  test('dirty state uses sick animation as placeholder (no fallback box)', async ({ page }) => {
    // dirty intent now maps to 'sick' animation which exists — no fallback
    await page.goto('/');
    await page.evaluate((s) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)),
      makeSeed({ cleanliness: 5, hunger: 60 }));
    await page.reload();
    await page.waitForTimeout(1500);

    // No fallback box — sick animation exists
    const fallback = page.locator('text=Missing Animation');
    await expect(fallback).not.toBeVisible();
    const fallback2 = page.locator('text=Missing Sprite');
    await expect(fallback2).not.toBeVisible();
  });

  test('existing animation renders normally (no fallback)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((s) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)),
      makeSeed({ hunger: 60, happiness: 60, cleanliness: 60, health: 100 }));
    await page.reload();
    await page.waitForTimeout(1500);

    // No fallback box
    const fallback = page.locator('text=Missing Animation');
    await expect(fallback).not.toBeVisible();
    const fallback2 = page.locator('text=Missing Sprite');
    await expect(fallback2).not.toBeVisible();
  });
});
