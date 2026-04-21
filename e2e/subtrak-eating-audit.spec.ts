import { test } from '@playwright/test';

/**
 * Audit the subtrak eating animation as the user reported a
 * "full sheet" render instead of a single frame. We seed a subtrak
 * pet directly, then force the eating animation via a save bump
 * and capture the sprite at multiple moments.
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
        id: 't',
        name: 'TestPet',
        type: species,
        stage: 'baby',
        state: 'idle',
        bond: 10,
        bornAt: Date.now(),
        needs: { health: 80, hunger: 30, happiness: 80, cleanliness: 80 },
        progression: { level: 2, xp: 30 },
        moves: [],
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

test.describe('Sprite sheet edge-cases', () => {
  test.use({ viewport: { width: 480, height: 1400 } });
  for (const species of ['koala_sprite', 'subtrak']) {
    test(`${species} eating renders single frame`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate((s: any) => localStorage.setItem('vpet_save_auto', JSON.stringify(s)), makeSeed(species));
      await page.reload();
      await page.waitForTimeout(2500);

      // Capture idle
      await page.screenshot({ path: `e2e/screenshots/audit-${species}-idle.png`, fullPage: false });

      // Feed via the action bar (bottom-right "Feed" button)
      const feedBtn = page.locator('button', { hasText: /feed/i }).first();
      if (await feedBtn.count() > 0) {
        await feedBtn.evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(400);
      }

      // Feed modal → click Meat (it's a <div> with onClick, not a button)
      const meat = page.getByText('Meat', { exact: true }).first();
      if (await meat.count() > 0) {
        await meat.click({ force: true });
        await page.waitForTimeout(600);
      }

      // Poll every 200ms for 6s capturing sprite state — catch any
      // full-sheet flash or leaky-overflow render moments.
      const samples: Array<{ t: number; w: number; h: number; url: string; bgPos: string; bgSize: string; overflow: string }> = [];
      const startT = Date.now();
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(200);
        const s = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('div[style*="background-image"]')) as HTMLElement[];
          // Prefer the sprite (has width/height styled) over scene backgrounds.
          const sprite = all.find((el) => {
            const style = el.getAttribute('style') ?? '';
            return style.includes('frame') || /width:\s*\d+\.?\d*px/.test(style);
          }) ?? all[0];
          if (!sprite) return null;
          const r = sprite.getBoundingClientRect();
          const style = sprite.getAttribute('style') ?? '';
          const url = (style.match(/url\("([^"]+)"\)/) ?? [])[1] ?? '';
          const bgPos = (style.match(/background-position:\s*([^;]+);/) ?? [])[1] ?? '';
          const bgSize = (style.match(/background-size:\s*([^;]+);/) ?? [])[1] ?? '';
          const overflow = (style.match(/overflow:\s*([^;]+);/) ?? [])[1] ?? '';
          return { w: r.width, h: r.height, url, bgPos, bgSize, overflow };
        });
        if (s) samples.push({ t: Date.now() - startT, ...s });

        // Snapshot a few key moments
        if (i === 3 || i === 10 || i === 15 || i === 20) {
          await page.screenshot({ path: `e2e/screenshots/held-item-${species}-t${i}.png`, fullPage: false });
        }
      }

      // Edge-case check: every frame must be clipped and render a single
      // frame-window (not the full sheet). If any sample's backgroundSize
      // disagrees with its URL's sibling samples, cols is wrong for that sheet.
      const leaks = samples.filter((s) => s.w > 500 || !s.overflow.includes('hidden'));
      if (leaks.length > 0) {
        throw new Error(`[${species}] sprite overflow leak: ${JSON.stringify(leaks)}`);
      }

      const sizeByUrl: Record<string, Set<string>> = {};
      for (const s of samples) {
        (sizeByUrl[s.url] ??= new Set()).add(s.bgSize);
      }
      for (const [url, sizes] of Object.entries(sizeByUrl)) {
        if (sizes.size > 1) {
          throw new Error(`[${species}] ${url} rendered at multiple backgroundSizes: ${[...sizes].join(', ')} — cols/frames mismatch`);
        }
      }
    });
  }
});
