import { test, expect } from '@playwright/test';

/**
 * Zoom in on the pet sprite while eating to confirm the held-item icon
 * actually renders. Prior full-page screenshots at 480x1400 made the
 * emoji indistinguishable from the subtrak's chest stripe.
 */

function makeSeed(species: string) {
  return {
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
        id: 't', name: 'TestPet', type: species, stage: 'baby', state: 'idle', bond: 10,
        bornAt: Date.now(),
        needs: { health: 80, hunger: 30, happiness: 80, cleanliness: 80 },
        progression: { level: 2, xp: 30 }, moves: [],
        timestamps: { lastFedAt: 0, lastPlayedAt: 0, lastCleanedAt: 0 },
      },
      egg: null,
      player: {
        id: 'p', displayName: 'Player', activePetId: 't',
        mathMastery: { arithmetic: 0, geometry: 0, fractions: 0 },
        currencies: { tokens: 500, coins: 5 }, streaks: { login: 1, correctAnswers: 0 },
        unlockedRoomItems: [], quizOutcome: null,
      },
      session: { currentQuestion: null, rewardPopup: null, activeModal: null, eggInteractionState: null },
      animation: { animationName: 'idle', frameIndex: 0, frameCount: 4, frameDurationMs: 250, elapsedMs: 0, autoplay: true, isFinished: false },
      test: { active: false, label: '' },
      inventory: { items: [], maxSlots: 20 },
      room: { backgroundId: 'default', items: [], moodBonus: 0 },
      battle: { active: false },
      events: [], achievements: [], notifications: [], lastUpdate: Date.now(),
      dailyGoals: { date: '2026-04-19', mathSolved: 0, battlesWon: 0, rewardClaimed: false },
      classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
      battleTickets: { tickets: [], maxTickets: 5, todayEarned: 0, todayUsed: 0, mathForNextTicket: 0, careActionsToday: { fed: false, cleaned: false, played: false } },
      matchHistory: [], matchupTrackers: [], trophyCase: { trophies: [], displayedInRoom: [], maxDisplay: 5 },
    },
  };
}

test.describe('Held-item zoom verification', () => {
  test.use({ viewport: { width: 480, height: 1400 } });
  for (const species of ['koala_sprite', 'subtrak']) {
    test(`${species} held-item icon is visible`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), makeSeed(species));
      await page.reload();
      await page.waitForTimeout(2500);

      // Trigger feed flow
      const feedBtn = page.locator('button', { hasText: /feed/i }).first();
      await feedBtn.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(400);
      const meat = page.getByText('Meat', { exact: true }).first();
      await meat.click({ force: true });

      // Pet walks to feed spot THEN enters 'eating'. Poll up to 6s for the
      // HeldItem to appear. This avoids a hard-coded wait that races.
      let found: any = null;
      let capturedDuringEat = false;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(200);
        found = await page.evaluate(() => {
          // HeldItem wrapper has the anim-chomp class.
          const held = document.querySelector<HTMLElement>('.anim-chomp');
          const wrappers = Array.from(document.querySelectorAll<HTMLElement>('[class*="anim-sprite-"]'));
          const animClass = wrappers.map((w) => (w.className || '').match(/anim-sprite-[\w-]+/)?.[0] ?? null).filter(Boolean);
          if (!held) return { held: null, animClass };
          const r = held.getBoundingClientRect();
          const img = held.querySelector('img');
          return {
            held: {
              top: r.top, left: r.left, width: r.width, height: r.height,
              visible: r.width > 0 && r.height > 0,
              src: img?.getAttribute('src') ?? null,
            },
            animClass,
          };
        });
        if (i % 5 === 0) console.log(`[${species}] t=${i*200}ms`, JSON.stringify(found));
        if (found?.held?.visible) {
          capturedDuringEat = true;
          break;
        }
      }

      console.log(`[${species}] Final HeldItem DOM:`, JSON.stringify(found));
      expect(capturedDuringEat, 'HeldItem must be visible during eating').toBe(true);

      // Zoomed screenshot: capture a 300x300 region around the pet sprite
      const spriteBox = await page.evaluate(() => {
        const sprite = Array.from(document.querySelectorAll<HTMLElement>('div[style*="background-image"]'))
          .find((el) => /width:\s*\d+\.?\d*px/.test(el.getAttribute('style') ?? ''));
        if (!sprite) return null;
        const r = sprite.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      });

      if (spriteBox) {
        const pad = 60;
        const clip = {
          x: Math.max(0, spriteBox.x - pad),
          y: Math.max(0, spriteBox.y - pad),
          width: spriteBox.w + pad * 2,
          height: spriteBox.h + pad * 2,
        };
        // Single rest-state shot
        await page.screenshot({ path: `e2e/screenshots/held-zoom-${species}.png`, clip });
        // Motion cycle — chomp loop is 800ms; sample 4 phases
        for (let phase = 0; phase < 4; phase++) {
          await page.waitForTimeout(200);
          await page.screenshot({
            path: `e2e/screenshots/held-zoom-${species}-phase${phase}.png`,
            clip,
          });
        }
      }
    });
  }
});
