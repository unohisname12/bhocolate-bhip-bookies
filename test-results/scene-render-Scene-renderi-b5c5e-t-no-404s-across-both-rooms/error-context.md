# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scene-render.spec.ts >> Scene rendering with pet >> no 404s across both rooms
- Location: e2e/scene-render.spec.ts:117:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("›")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "Something went wrong" [level=1] [ref=e4]
  - paragraph [ref=e5]: Cannot read properties of undefined (reading 'lastFedAt')
  - button "Reset Game" [ref=e6] [cursor=pointer]
```

# Test source

```ts
  28  |         { id: 'tackle', name: 'Tackle', power: 10, accuracy: 90, type: 'physical', description: 'A basic attack' },
  29  |       ],
  30  |     },
  31  |     egg: null,
  32  |     player: {
  33  |       id: 'test-player',
  34  |       currencies: { tokens: 500, coins: 5 },
  35  |       streaks: { loginDays: 1, correctAnswers: 0, lastLoginDate: new Date().toISOString().split('T')[0] },
  36  |     },
  37  |     session: { startedAt: Date.now(), pausedAt: null },
  38  |     animation: { animationName: 'idle', frameIndex: 0, frameCount: 1, frameDurationMs: 175, elapsedMs: 0, autoplay: true, isFinished: false },
  39  |     test: { active: false, label: '' },
  40  |     inventory: { items: [] },
  41  |     room: { backgroundId: 'default', items: [], moodBonus: 0 },
  42  |     battle: { active: false, turn: 0, playerHP: 100, opponentHP: 100, log: [], result: null, opponentPet: null, currentTurn: null, stakeAmount: 0 },
  43  |     events: [],
  44  |     achievements: [],
  45  |     notifications: [],
  46  |     lastUpdate: Date.now(),
  47  |     dailyGoals: { date: new Date().toISOString().split('T')[0], mathSolved: 0, battlesWon: 0, rewardClaimed: false },
  48  |     classroom: { classmates: [], selectedOpponentId: null },
  49  |     battleTickets: { tickets: [], lastRefill: Date.now(), maxTickets: 3 },
  50  |     matchHistory: [],
  51  |     matchupTrackers: [],
  52  |     trophyCase: { trophies: [], displaySlots: 3 },
  53  |   },
  54  | };
  55  | 
  56  | test.describe('Scene rendering with pet', () => {
  57  |   test.beforeEach(async ({ page }) => {
  58  |     await page.goto('/');
  59  |     // Inject saved state
  60  |     await page.evaluate((seed) => {
  61  |       localStorage.setItem('vpet_save_auto', JSON.stringify(seed));
  62  |     }, SEED_STATE);
  63  |     await page.reload();
  64  |     await page.waitForTimeout(2000);
  65  |   });
  66  | 
  67  |   test('game scene shell renders all layers', async ({ page }) => {
  68  |     await page.screenshot({ path: 'e2e/screenshots/scene-inside.png', fullPage: true });
  69  | 
  70  |     // Check the fixed scene container exists
  71  |     const sceneContainer = page.locator('.fixed.inset-0.overflow-hidden');
  72  |     await expect(sceneContainer).toBeVisible();
  73  | 
  74  |     // Check TopHUD — pet name visible
  75  |     const topHud = page.locator('text=TestPet');
  76  |     await expect(topHud).toBeVisible();
  77  | 
  78  |     // Check RightSidePanel — Command Deck tab button is visible
  79  |     const commandDeckTab = page.locator('button', { hasText: 'Command Deck' }).first();
  80  |     await expect(commandDeckTab).toBeVisible();
  81  | 
  82  |     // Check room navigator arrows
  83  |     const leftArrow = page.locator('button:has-text("‹")');
  84  |     const rightArrow = page.locator('button:has-text("›")');
  85  |     await expect(leftArrow).toBeVisible();
  86  |     await expect(rightArrow).toBeVisible();
  87  | 
  88  |     // Check room dot — should have "Home" aria-label (inside room)
  89  |     const roomDot = page.getByLabel('Home');
  90  |     await expect(roomDot).toBeVisible();
  91  | 
  92  |     // Check scene layer images are rendered (layered scene system)
  93  |     const layerImg = page.locator('img[src*="layer_indoor"]').first();
  94  |     await expect(layerImg).toBeVisible();
  95  |     const naturalWidth = await layerImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
  96  |     expect(naturalWidth).toBeGreaterThan(0);
  97  |   });
  98  | 
  99  |   test('navigate to outside room and verify background', async ({ page }) => {
  100 |     const rightArrow = page.locator('button:has-text("›")');
  101 |     await rightArrow.click();
  102 |     await page.waitForTimeout(500);
  103 | 
  104 |     await page.screenshot({ path: 'e2e/screenshots/scene-outside.png', fullPage: true });
  105 | 
  106 |     // Check room dot — should have "Yard" aria-label (outside room)
  107 |     const roomDot = page.getByLabel('Yard');
  108 |     await expect(roomDot).toBeVisible();
  109 | 
  110 |     // Check scene layer images are rendered (layered scene system)
  111 |     const layerImg = page.locator('img[src*="layer_outdoor"]').first();
  112 |     await expect(layerImg).toBeVisible();
  113 |     const naturalWidth = await layerImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
  114 |     expect(naturalWidth).toBeGreaterThan(0);
  115 |   });
  116 | 
  117 |   test('no 404s across both rooms', async ({ page }) => {
  118 |     const failedRequests: string[] = [];
  119 |     page.on('response', (response) => {
  120 |       if (response.url().includes('/assets/') && response.status() >= 400) {
  121 |         failedRequests.push(`${response.status()} ${response.url()}`);
  122 |       }
  123 |     });
  124 | 
  125 |     // Start on inside, navigate to outside and back
  126 |     const rightArrow = page.locator('button:has-text("›")');
  127 |     await page.waitForTimeout(800);
> 128 |     await rightArrow.click();
      |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  129 |     await page.waitForTimeout(800);
  130 |     await rightArrow.click();
  131 |     await page.waitForTimeout(800);
  132 | 
  133 |     if (failedRequests.length > 0) {
  134 |       console.log('FAILED REQUESTS:', failedRequests);
  135 |     }
  136 |     expect(failedRequests).toEqual([]);
  137 |   });
  138 | });
  139 | 
```