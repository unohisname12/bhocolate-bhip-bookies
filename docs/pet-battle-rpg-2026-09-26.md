# Pet Battle RPG — September 26, 2026

Implemented from the researched Pet Battle plan. Uses each learner's actual earned companion. Existing XP, evolution, pet identity, possessions, care, and learning records remain intact.

## Available features

- Three 4-node talent branches; six points at levels 2, 3, 5, 8, 12, 16. Free resets and up to three saved builds. A companion keeps its own allocation.
- Six charms, six badges, four reusable battle tools. MP unlocks are permanent; each tool has one use per battle and costs a turn. Math practice uses the existing question receipts and correction rewards.
- A campaign with 15 encounters across Bramblewood, Clockwork Hollow, and Moonlit Summit; three phased bosses. Fixed encounter levels let growth be felt.
- Five-fight expeditions with two route choices and three perk choices between fights. Champion challenges, Trailblazer and Crown Champion profile badges.
- Deterministic bounded combat: Strike, Guard, Focus, Signature, Item; energy, shield, Combo, Weaken, Counter Ready and focused signatures. Clear intent, actual HP/energy/effect results and event playback using existing species animation sheets.
- Real XP results, level-up milestones, existing prize rewards and First Adventure completion. Effective combat level caps at 20; saved levels/XP above that remain intact.
- Free training with borrowed equipment and full builds. Classic battle/tracing remains available through Training; dungeon adapters remain unchanged.
- Three captioned, playable video guides recorded from the actual game plus written instructions.
- Classmate tactical duels: earned pets, equal level 10, six points, freely configurable loan gear, hidden pending choices, locked loadouts and alternating attack priority. No stakes or ownership changes.
- Teacher team challenge: learners bring earned pets with loan builds; the teacher controls the guardian and can start, pause, resolve or end. Missing moves Guard when the teacher resolves. Team damage is averaged across active pets. Existing math-question duels and teacher battles remain separate and usable.
- App-wide interface sizing works at 150%; Chromebook and narrow-phone layouts checked.

## Compatibility and implementation choices

The new preparation screen uses `pet_arena`; legacy `battle` remains for classic battles, tracing and dungeon encounters. New campaign and class modes share the combat effect resolver.

New combat uses a capped legacy training contribution (at most +3 attack from Forge attack/defence ranks). Old Forge ranks, the Sharp Focus reward benefit, temporary math prep and prize boosts remain owned and keep their previous effects in classic battles. They are not silently stacked into new combat or removed, so no destructive conversion/refund is needed.

The first release offers three persistent Champion challenges instead of a calendar-limited weekly rotation. Actual difficulty comes from enemy intent, builds, routes and temporary perks; earned power does not expire. Campaign rewards also integrate with the existing decoration/prize system.

Teacher tactical challenges are a new authenticated classroom activity, distinct from the existing public-link question battles. Offline solo progression is local; online inventory/combat changes use the authoritative battle command service. Existing classroom checkpoints remain a supervised pilot rather than an assessment anti-cheat system; this update does not claim to harden unrelated historical reward routes.

## Save and network protection

Arena progress is optional in old saves. The generated strict EngineState schema and runtime checks cover new fields; unchanged saves require no reset. Separate builds are keyed to pet IDs. A battle cannot grant XP to a different active companion.

Online commands run against the stored save with optimistic revision checks and a one-time request receipt. Client checkpoints cannot create/change arena progress or its win claims. Item use, rewards, turns, multi-level prizes and First Adventure rewards are idempotent. Network retries reuse the same receipt; ambiguous failures require reloading the latest server copy.

Migration `0017_pet_arena.sql` adds only `arena_rooms` and `arena_seats`. Class-scoped access, unique participant seats, expiring rooms, server-owned fighter snapshots and revision checks prevent cross-class access or concurrent-match duplication. Opponent pending moves remain hidden. Teachers can pause/end classmate duels as well as their team challenge.

## Validation

Core tests cover ownership, point budgets, free respec, loadouts, capped shields, all tools, replayed turns, practice loans, every encounter across multiple species/builds, stall termination, expedition completion/reload, pet switching, prize observers, classroom move secrecy and class-size scaling. Strict-schema tests cover old saves, active battles, partially filled saved-build slots and forged checkpoints.

Browser tests cover equipment/loadout reloads, actual item use, battle XP, campaign unlocks, 150% layouts, online receipt retries, online resume, classmate duels and teacher pause/resolve. Videos and screenshots are in the release assets and `/home/dre/Pictures/V-Pet-Battle-2026-09-26/`.

Automated balance samples use fixed policies, not human play. Guardian prioritises survival and reading attacks; Striker resolves fights faster but has more losing matchups; Tactician depends on preparation. A classroom playtest should inform subsequent tuning. Balance reports are kept alongside this document.

The existing main and offline working copies receive a three-way merge of this feature, preserving other local work. Source backups are in `/home/dre/Code/.pet-arena-before-sync-20260926`. Classroom exports and synthetic test credentials remain private.

## Release verification

Released to the installed offline game and live classroom site on September 26, 2026. Cloudflare version: `2ef38feb-8292-4817-a4a3-ca2b656e285f`. Additive migration 0017 applied successfully.

- 1,430 unit tests across 102 files passed. Fixed an existing dungeon test that accidentally started a second randomized run before comparing instability.
- Three standalone browser scenarios and three local-worker classroom scenarios passed. Frontend/worker TypeScript checks and changed battle-code lint passed.
- Live synthetic classroom: duplicate purchase charged MP once; six-point build saved; turn survived reload; guide video played; classmate duel resolved; teacher paused/ended it. No browser runtime errors. Synthetic classroom removed afterward.
- Installed offline game: Captain Waffles retained, Pet Battle opened from Games & care, guide video played, no browser runtime errors. Wrapper and real browser storage preserved.
- Local installation rollback: `/home/dre/Games/V-Pet-Local/site-before-pet-arena-20260926`. Screenshot gallery: `/home/dre/Pictures/V-Pet-Battle-2026-09-26/index.html`.

Balance samples cover 300 campaign simulations and 72 fair duels; fixed bot policies do not establish human win rates. Guardian/Tactician had equal wins against one another, Striker beat Guardian, and Tactician beat Striker in the sampled matchups. No build beat every other build.
