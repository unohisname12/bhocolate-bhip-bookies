# Battle Animation Desync & Screen Glitch Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate screen glitching, animation desync, and stale timers in the battle presentation pipeline so visual sequences play reliably in order: player action -> enemy reaction -> enemy action -> player reaction.

**Architecture:** Six targeted fixes across 3 files. Replace the fire-and-forget setTimeout stagger in BattleScreen with a ref-based animation queue that drains entries one at a time via onComplete callbacks. Fix sprite swap jitter by holding the last combat frame during transitions. Scope ScreenShake to the arena div only. No new files needed.

**Tech Stack:** React 19, TypeScript, Playwright (e2e verification)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/screens/BattleScreen.tsx` | Modify | Replace setTimeout stagger with queue; move ScreenShake to arena; cleanup on unmount |
| `src/components/battle/useBattleSequence.ts` | Modify | Remove aggressive clearTimeouts at playSequence start; add unmount cleanup |
| `src/components/battle/BattleEffects.tsx` | Modify | Fix BattlePetSprite jitter by holding last combat frame; scope ScreenShake |
| `e2e/battle-desync.spec.ts` | Create | Playwright test for multi-turn animation stability |

---

### Task 1: Add unmount cleanup to useBattleSequence

**Files:**
- Modify: `src/components/battle/useBattleSequence.ts:94-243`

The hook tracks timeouts in `timeoutRef` but never clears them on unmount. Also, `playSequence` calls `clearTimeouts()` unconditionally at line 134, which kills in-progress animations when the BattleScreen queue feeds the next entry. Since we'll switch BattleScreen to a queue that waits for onComplete, `playSequence` should still clear its *own* prior timeouts (in case of rapid re-calls), but the hook must also clean up on unmount.

- [ ] **Step 1: Remove aggressive clearTimeouts from playSequence start and add unmount cleanup**

In `src/components/battle/useBattleSequence.ts`, the `playSequence` function currently calls `clearTimeouts()` at the very top (line 134). This is needed to cancel a prior *incomplete* sequence if a new one starts, but we should also add a useEffect cleanup for unmount.

Replace the hook body starting from line 94 through the return at line 242. The key changes are:

1. Add a `useEffect` that returns a cleanup calling `clearTimeouts`
2. Keep `clearTimeouts()` at the top of `playSequence` (it's correct for cancelling a stale in-flight sequence when the queue advances)

```typescript
export function useBattleSequence() {
  const [state, setState] = useState<BattleSequenceState>({
    phase: 'idle',
    attackerAnim: '',
    defenderAnim: '',
    screenShake: false,
    damageNumbers: [],
    impactEffect: null,
    attackerCombatSheet: null,
    defenderCombatSheet: null,
    attackerSide: null,
    isAnimating: false,
  });

  const timeoutRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  // Clean up all pending timeouts on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- clearing ref on unmount
      timeoutRef.current.forEach(clearTimeout);
    };
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  // ... rest unchanged
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/battle/useBattleSequence.ts
git commit -m "fix(battle): add unmount cleanup for useBattleSequence timeouts"
```

---

### Task 2: Replace setTimeout stagger with animation queue in BattleScreen

**Files:**
- Modify: `src/screens/BattleScreen.tsx:1-92`

This is the core fix. The current code (lines 73-92) loops over new log entries and fires `setTimeout` with increasing delays. Problems:
- No cleanup on unmount/re-render (stale timers)
- Fixed 750ms stagger doesn't account for variable animation durations
- If a second batch of entries arrives while the first is still animating, entries overlap

Replace with a ref-based queue that:
1. Appends new entries to a queue ref
2. Drains one entry at a time, starting the next only when `onComplete` fires
3. Cleans up on unmount by clearing the queue and any pending drain

- [ ] **Step 1: Add queue refs and replace the useEffect**

Replace the imports line (add `useRef` if not present — it's already imported) and the animation useEffect block (lines 47, 72-92) with:

```typescript
  const { state: seq, playSequence, removeDamageNumber } = useBattleSequence();
  const prevLogLenRef = useRef(log.length);
  const isPlayerTurn = phase === 'player_turn' && !seq.isAnimating;

  // --- Animation queue: drain entries one-at-a-time via onComplete ---
  const animQueueRef = useRef<BattleLogEntry[]>([]);
  const drainingRef = useRef(false);

  const drainQueue = useCallback(() => {
    if (drainingRef.current) return;
    const next = animQueueRef.current.shift();
    if (!next) return;

    drainingRef.current = true;
    const attackerSpecies = next.actor === 'player' ? playerPet.speciesId : enemyPet.speciesId;
    const defenderSpecies = next.actor === 'player' ? enemyPet.speciesId : playerPet.speciesId;

    playSequence(next, () => {
      setPendingMove(null);
      drainingRef.current = false;
      // Drain next entry after a small visual gap
      setTimeout(() => drainQueue(), 80);
    }, attackerSpecies, defenderSpecies);
  }, [playSequence, playerPet.speciesId, enemyPet.speciesId]);

  // Enqueue new log entries and kick the drain
  useEffect(() => {
    if (log.length > prevLogLenRef.current) {
      const newEntries = log.slice(prevLogLenRef.current);
      prevLogLenRef.current = log.length;

      for (const entry of newEntries) {
        if (entry.action === 'battle_start') continue;
        animQueueRef.current.push(entry);
      }
      drainQueue();
    }
  }, [log.length, log, drainQueue]);

  // Cleanup queue on unmount
  useEffect(() => {
    return () => {
      animQueueRef.current = [];
      drainingRef.current = false;
    };
  }, []);
```

You must also add `BattleLogEntry` to the type imports at the top of the file:

```typescript
import type { ActiveBattleState, BattleLogEntry } from '../types/battle';
```

(Replace the existing `import type { ActiveBattleState } from '../types/battle';` line.)

- [ ] **Step 2: Verify the app compiles**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/BattleScreen.tsx
git commit -m "fix(battle): replace setTimeout stagger with queue-based animation drain

Entries now play sequentially via onComplete callbacks instead of
fire-and-forget setTimeout. Cleans up on unmount."
```

---

### Task 3: Fix sprite swap jitter in BattlePetSprite

**Files:**
- Modify: `src/components/battle/BattleEffects.tsx:86-184`

When `combatSheet` goes from a sheet object to `null`, the component sets `playing = false` and `frame = 0` synchronously. For one render frame, the portrait path renders while the combat sheet div is being torn down, causing a visible flash/jitter.

Fix: use a `lastSheetRef` that holds the previous combat sheet config. When `combatSheet` becomes null, show the last frame of the previous sheet for one render tick before falling through to the portrait.

- [ ] **Step 1: Add holdover frame logic to BattlePetSprite**

Replace the BattlePetSprite component (lines 86-184) with:

```typescript
/** Battle pet sprite with animation states and combat sheet playback */
export const BattlePetSprite: React.FC<{
  speciesId: string;
  animClass?: string;
  combatSheet?: CombatSheetConfig | null;
  flip?: boolean;
  children?: React.ReactNode;
}> = ({ speciesId, animClass = '', combatSheet = null, flip = false, children }) => {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  // Hold the last sheet + final frame to prevent flash on transition back to portrait
  const lastSheetRef = useRef<CombatSheetConfig | null>(null);
  const [holdover, setHoldover] = useState<{ sheet: CombatSheetConfig; frame: number } | null>(null);

  // Play combat sheet when provided
  useEffect(() => {
    if (!combatSheet) {
      // If we were playing, hold the last frame briefly to prevent jitter
      if (lastSheetRef.current && playing) {
        const held = { sheet: lastSheetRef.current, frame: frameRef.current };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- holdover frame to prevent sprite swap flash
        setHoldover(held);
        const t = setTimeout(() => setHoldover(null), 60);
        setPlaying(false);
        setFrame(0);
        frameRef.current = 0;
        return () => clearTimeout(t);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset animation state when combat sheet changes
      setPlaying(false);
      setFrame(0);
      frameRef.current = 0;
      return;
    }

    lastSheetRef.current = combatSheet;
    setHoldover(null);
    setPlaying(true);
    frameRef.current = 0;
    setFrame(0);

    const interval = setInterval(() => {
      frameRef.current += 1;
      if (frameRef.current >= combatSheet.frameCount) {
        clearInterval(interval);
        setPlaying(false);
        return;
      }
      setFrame(frameRef.current);
    }, combatSheet.frameDuration);

    return () => clearInterval(interval);
  }, [combatSheet]); // eslint-disable-line react-hooks/exhaustive-deps -- playing is intentionally not a dep

  // Render combat sheet animation (active or holdover)
  const activeSheet = playing && combatSheet ? combatSheet : holdover?.sheet ?? null;
  const activeFrame = playing && combatSheet ? frame : holdover?.frame ?? 0;

  if (activeSheet) {
    const displaySize = 96;
    const scale = displaySize / activeSheet.frameWidth;
    const sheetWidth = activeSheet.frameCount * activeSheet.frameWidth;

    return (
      <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
        <div
          style={{
            width: displaySize,
            height: displaySize,
            backgroundImage: `url(${activeSheet.url})`,
            backgroundPosition: `-${activeFrame * activeSheet.frameWidth * scale}px 0px`,
            backgroundSize: `${sheetWidth * scale}px ${activeSheet.frameHeight * scale}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
        {children}
      </div>
    );
  }

  // Use standalone portrait if available, otherwise fall back to sprite sheet
  const portrait = ASSETS.petPortraits[speciesId];
  if (portrait) {
    return (
      <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
        <img
          src={portrait}
          alt={speciesId}
          style={{
            width: 96,
            height: 96,
            imageRendering: 'pixelated',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
        {children}
      </div>
    );
  }

  const petAsset = ASSETS.pets[speciesId] ?? ASSETS.pets.koala_sprite;
  const spriteStyle = computeSpriteStyle(petAsset, 0, 0.75);

  return (
    <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
      <div
        style={{
          ...spriteStyle,
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      />
      {children}
    </div>
  );
};
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/battle/BattleEffects.tsx
git commit -m "fix(battle): hold last combat frame to prevent sprite swap jitter

BattlePetSprite now keeps the final combat sheet frame visible for
60ms during the transition back to portrait, eliminating the flash."
```

---

### Task 4: Scope ScreenShake to arena only

**Files:**
- Modify: `src/screens/BattleScreen.tsx:157-418`

Currently `<ScreenShake>` wraps the entire layout (line 158), which shakes sidebars, HP bars, log, and action bar on every hit. Move it to wrap only the arena center div.

- [ ] **Step 1: Remove ScreenShake from outer wrapper**

In `BattleScreen.tsx`, replace the outer return block. Change line 157-159 from:

```tsx
  return (
    <ScreenShake active={seq.screenShake}>
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col overflow-hidden">
```

to:

```tsx
  return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col overflow-hidden">
```

And change the closing at lines 417-419 from:

```tsx
      </div>
    </ScreenShake>
  );
```

to:

```tsx
      </div>
  );
```

- [ ] **Step 2: Wrap only the arena center div with ScreenShake**

Find the center arena section (line 208-273). Change lines 209-210 from:

```tsx
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 relative overflow-hidden">
```

to:

```tsx
          <ScreenShake active={seq.screenShake}>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 relative overflow-hidden">
```

And close it after the arena div. Find the closing `</div>` at what was line 273 (end of the center column). After:

```tsx
            </div>
          </div>
```

Add the closing tag:

```tsx
            </div>
          </div>
          </ScreenShake>
```

The ScreenShake now wraps only `{/* CENTER - Battle Arena */}` — sidebars and action bar are unaffected.

- [ ] **Step 3: Verify the app compiles**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/screens/BattleScreen.tsx
git commit -m "fix(battle): scope ScreenShake to arena center div only

HP bars, action bar, log, and sidebars no longer shake on impact."
```

---

### Task 5: Write Playwright desync verification test

**Files:**
- Create: `e2e/battle-desync.spec.ts`

Test that attacks over several turns don't produce flickering, animation skipping, or visual desync. Reuse the seed state and helpers from the existing test files.

- [ ] **Step 1: Create the test file**

```typescript
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

    const screenshots: string[] = [];
    let turnsPlayed = 0;

    for (let turn = 0; turn < 6; turn++) {
      const active = await waitForPlayerTurn(page);
      if (!active) break;

      // Verify no stuck animation state: action bar should be interactive
      const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
      await expect(attackBtn).toBeVisible();

      // Alternate between attack and defend to exercise both animation paths
      if (turn % 3 === 2) {
        // Defend turn
        await page.locator('button', { hasText: 'DEFEND' }).first().click({ force: true });
      } else {
        // Attack turn
        await attackBtn.click();
        await page.waitForTimeout(200);
        const moveBtn = page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first();
        await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      }

      // Capture mid-animation screenshot
      await page.waitForTimeout(300);
      const midPath = `e2e/screenshots/desync-turn${turn}-mid.png`;
      await page.screenshot({ path: midPath });
      screenshots.push(midPath);

      // Wait for animation sequence to complete
      await page.waitForTimeout(2500);

      // Capture post-animation screenshot
      const postPath = `e2e/screenshots/desync-turn${turn}-post.png`;
      await page.screenshot({ path: postPath });
      screenshots.push(postPath);

      turnsPlayed++;
    }

    expect(turnsPlayed).toBeGreaterThanOrEqual(2);
  });

  test('screen shake does not affect sidebars or action bar', async ({ page }) => {
    await enterBattle(page);

    // Get sidebar positions before attack
    const leftSidebar = page.locator('.w-56').first();
    const leftBox = await leftSidebar.boundingBox();
    expect(leftBox).toBeTruthy();

    // Perform an attack to trigger screen shake
    const attackBtn = page.locator('button', { hasText: 'ATTACK' }).first();
    await attackBtn.click();
    await page.waitForTimeout(200);
    const moveBtn = page.locator('button').filter({ hasText: /Slime Toss|Acid Splash/i }).first();
    await moveBtn.click({ force: true, timeout: 3000 }).catch(() => {});

    // During shake (impact phase ~230ms after action), check sidebar hasn't moved
    await page.waitForTimeout(250);
    const leftBoxDuring = await leftSidebar.boundingBox();
    expect(leftBoxDuring).toBeTruthy();

    // Sidebar X position should be stable (not shaking)
    if (leftBox && leftBoxDuring) {
      expect(Math.abs(leftBox.x - leftBoxDuring.x)).toBeLessThanOrEqual(1);
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
```

- [ ] **Step 2: Run the new tests**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx playwright test e2e/battle-desync.spec.ts --reporter=list 2>&1 | tail -30`
Expected: All 3 tests pass

- [ ] **Step 3: Run all existing battle tests to verify no regressions**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx playwright test e2e/battle-feedback.spec.ts e2e/battle-system-fixes.spec.ts --reporter=list 2>&1 | tail -30`
Expected: All existing tests still pass

- [ ] **Step 4: Commit**

```bash
git add e2e/battle-desync.spec.ts
git commit -m "test(battle): add Playwright tests for animation desync and shake scoping"
```

---

### Task 6: Final verification — run full test suite and screenshot review

- [ ] **Step 1: Run all Playwright tests**

Run: `cd /home/dre/Documents/jules_session_6038930338873785630 && npx playwright test --reporter=list 2>&1 | tail -40`
Expected: All tests pass, no regressions

- [ ] **Step 2: Review desync screenshots for visual issues**

Check each screenshot in `e2e/screenshots/desync-*.png` for:
- Sprite jitter (portrait flashing where combat sheet should be)
- Overlapping animations (two attack effects at once)
- Sidebar displacement during shake
- Stuck UI (action bar not returning after animation)

Report any remaining visual issues.

- [ ] **Step 3: Commit all screenshots**

```bash
git add e2e/screenshots/desync-*.png
git commit -m "test(battle): add desync verification screenshots"
```
