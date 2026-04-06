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
      displayName: 'Player',
      activePetId: 'test-pet',
      mathMastery: { arithmetic: 0, geometry: 0, fractions: 0 },
      currencies: { tokens: 500, coins: 5 },
      streaks: { login: 1, correctAnswers: 0 },
      unlockedRoomItems: [],
      quizOutcome: null,
    },
    session: { currentQuestion: null, rewardPopup: null, activeModal: null, eggInteractionState: null },
    animation: { animationName: 'idle', frameIndex: 0, frameCount: 4, frameDurationMs: 250, elapsedMs: 0, autoplay: true, isFinished: false },
    test: { active: false, label: '' },
    inventory: { items: [], maxSlots: 20 },
    room: { backgroundId: 'default', items: [], moodBonus: 0 },
    battle: { active: false },
    events: [],
    achievements: [],
    notifications: [],
    lastUpdate: Date.now(),
    dailyGoals: { date: new Date().toISOString().split('T')[0], mathSolved: 0, battlesWon: 0, rewardClaimed: false },
    classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
    battleTickets: { tickets: [], maxTickets: 5, todayEarned: 0, todayUsed: 0, mathForNextTicket: 0, careActionsToday: { fed: false, cleaned: false, played: false } },
    matchHistory: [],
    matchupTrackers: [],
    trophyCase: { trophies: [], displayedInRoom: [], maxDisplay: 5 },
  },
};

test.describe('Visual Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((seed) => {
      localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
    }, SEED_STATE);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('screenshot inside scene — pet position audit', async ({ page }) => {
    // Full viewport
    await page.screenshot({ path: 'e2e/screenshots/audit-inside-full.png', fullPage: true });

    // Get pet element bounding box info
    const petInfo = await page.evaluate(() => {
      const stage = document.querySelector('.z-20');
      const petContainer = stage?.querySelector('.relative.pointer-events-auto');
      const sceneContainer = document.querySelector('.fixed.inset-0.overflow-hidden');
      const bgImg = document.querySelector('img[src*="scene_inside"]');

      const stageRect = stage?.getBoundingClientRect();
      const petRect = petContainer?.getBoundingClientRect();
      const sceneRect = sceneContainer?.getBoundingClientRect();
      const bgRect = bgImg?.getBoundingClientRect();

      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        scene: sceneRect ? { top: sceneRect.top, bottom: sceneRect.bottom, height: sceneRect.height } : null,
        stage: stageRect ? { top: stageRect.top, bottom: stageRect.bottom, height: stageRect.height } : null,
        pet: petRect ? { top: petRect.top, bottom: petRect.bottom, left: petRect.left, right: petRect.right, width: petRect.width, height: petRect.height } : null,
        bg: bgRect ? { top: bgRect.top, bottom: bgRect.bottom, height: bgRect.height, width: bgRect.width } : null,
        petBottomPercent: petRect && sceneRect ? ((petRect.bottom / sceneRect.height) * 100).toFixed(1) : null,
      };
    });
    console.log('PET POSITION INFO (INSIDE):', JSON.stringify(petInfo, null, 2));

    // Check the bottom action bar position
    const barInfo = await page.evaluate(() => {
      const bar = document.querySelector('.fixed.bottom-1\\.5.inset-x-0.z-40');
      const rect = bar?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, height: rect.height } : null;
    });
    console.log('ACTION BAR INFO:', JSON.stringify(barInfo, null, 2));

    // Get room navigator position
    const navInfo = await page.evaluate(() => {
      const dots = document.querySelector('.fixed.bottom-\\[68px\\]');
      const leftBtn = document.querySelector('button');
      return {
        dotsVisible: !!dots,
        leftBtnVisible: !!leftBtn,
      };
    });
    console.log('NAV INFO:', JSON.stringify(navInfo, null, 2));
  });

  test('screenshot outside scene — pet position audit', async ({ page }) => {
    // Navigate to outside
    const rightArrow = page.locator('button:has-text("›")');
    await rightArrow.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/audit-outside-full.png', fullPage: true });

    const petInfo = await page.evaluate(() => {
      const stage = document.querySelector('.z-20');
      const petContainer = stage?.querySelector('.relative.pointer-events-auto');
      const sceneContainer = document.querySelector('.fixed.inset-0.overflow-hidden');
      const bgImg = document.querySelector('img[src*="scene_outside"]');

      const petRect = petContainer?.getBoundingClientRect();
      const sceneRect = sceneContainer?.getBoundingClientRect();
      const bgRect = bgImg?.getBoundingClientRect();

      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        pet: petRect ? { top: petRect.top, bottom: petRect.bottom, left: petRect.left, width: petRect.width, height: petRect.height } : null,
        bg: bgRect ? { top: bgRect.top, bottom: bgRect.bottom, height: bgRect.height } : null,
        petBottomPercent: petRect && sceneRect ? ((petRect.bottom / sceneRect.height) * 100).toFixed(1) : null,
      };
    });
    console.log('PET POSITION INFO (OUTSIDE):', JSON.stringify(petInfo, null, 2));
  });

  test('check all CSS animations on pet', async ({ page }) => {
    // Get computed animations on the pet elements
    const animInfo = await page.evaluate(() => {
      const petWrapper = document.querySelector('.anim-sprite-idle');
      const shadow1 = document.querySelector('.z-20 .blur-xl');
      const shadow2 = document.querySelector('.z-20 .blur-lg');

      function getAnimInfo(el: Element | null) {
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          animation: style.animation,
          transform: style.transform,
          className: el.className,
        };
      }

      return {
        petWrapper: getAnimInfo(petWrapper),
        sceneStageShadow: getAnimInfo(shadow1),
        petSpriteShadow: getAnimInfo(shadow2),
        hasDualShadows: !!shadow1 && !!shadow2,
      };
    });
    console.log('ANIMATION INFO:', JSON.stringify(animInfo, null, 2));
  });

  test('room navigation arrows visible and functional', async ({ page }) => {
    // Check left/right arrows
    const leftArrow = page.locator('button:has-text("‹")');
    const rightArrow = page.locator('button:has-text("›")');

    expect(await leftArrow.isVisible()).toBe(true);
    expect(await rightArrow.isVisible()).toBe(true);

    // Check room dot starts as Home (via aria-label)
    const homeDot = page.getByLabel('Home');
    await expect(homeDot).toBeVisible();

    // Navigate right → should go to Yard
    await rightArrow.click();
    await page.waitForTimeout(500);
    const yardDot = page.getByLabel('Yard');
    await expect(yardDot).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/audit-nav-yard.png' });

    // Navigate right again → wraps to Home
    await rightArrow.click();
    await page.waitForTimeout(500);
    const homeDotAgain = page.getByLabel('Home');
    await expect(homeDotAgain).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/audit-nav-home-return.png' });

    console.log('Room navigation: Home → Yard → Home WORKS');
  });
});
