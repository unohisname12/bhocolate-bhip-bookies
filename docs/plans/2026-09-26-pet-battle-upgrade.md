# Pet Battle upgrade: progression, equipment and builds

Research and repository review: September 26, 2026. This is a proposed design and implementation plan, not an implemented update. All new balance values below are starting hypotheses for playtests.

The aim is for a child to say: “This is my pet. I taught it to block big attacks and hit back. I earned this shield by practising math.” Keep the actual earned pet, its name, appearance, growth and history. Build choices should change how it fights and make another battle worth playing.

## Research and the design lesson

| Reference | Verified feature | Application to V-Pet (our recommendation) |
| --- | --- | --- |
| [Monster Sanctuary, official publisher](https://www.team17.com/games/monster-sanctuary) | Individual monster skill trees and tactical combinations. | A compact tree that changes the same pet's fighting style. Every earned species can use every branch. |
| [Pokémon UNITE, official overview](https://unite.pokemon.com/en-us/overview/) | Held items complement moves; battle items provide active support. | Separate always-equipped effects from one clearly visible item the child chooses when to use. |
| [Slay the Spire, developer-published description](https://store.steampowered.com/app/646570/Slay_the_Spire/) | Cards and relics interact; routes, encounters and rewards vary between runs. | Equipment combinations and short branching challenges create replayability with manageable content. |
| [Hades, developer FAQ](https://www.supergiantgames.com/blog/hades-faq/) | Permanent progression coexists with varied runs and adjustable challenge. | Preserve the pet's progress, add optional challenge modifiers, and make losing useful without taking possessions away. |

These sources establish the features, not proof that a particular V-Pet balance will work. The rules and numbers below are our design proposals. Use original art, names and rules tailored to V-Pet.

## What the current code already does

- `src/services/game/evolutionEngine.ts`: real XP and level increases already exist; the next level costs `150 × current level`. Evolution also uses age, care, bond and math milestones. Keep one pet level and preserve existing growth requirements.
- `src/services/game/economy.ts`: validated question receipts prevent duplicate rewards. A correct completion normally grants 2 MP total, including an earlier effort credit if applicable, plus XP and tokens. School-safe daily bonuses significantly accelerate early levels; pacing must be measured against these existing rewards.
- `src/engine/systems/BattleSystem.ts`: level affects stats; battles already have energy, moves, guard, focus, combos and enemy intent. HP currently derives from care health; many species share the default move set. Generic opponents scale around the pet's level, which can hide the feeling of getting stronger.
- `src/config/powerForgeConfig.ts`: permanent MP-funded ATK/DEF/HP and math-reward upgrades exist. `src/config/mathBuffConfig.ts` also defines temporary math-prep bonuses. `src/features/clash/rewards.ts` grants battle boosts and level rewards. New gear cannot simply stack on all of these unchecked.
- `src/features/pet-duel/model.ts`: classmate duels use a separate five-round strike/guard/feint model with math questions, bounded level bonuses and opponent matching.
- `src/features/teacher-battle/model.ts`: teacher battles use a separate team strike/guard/rally model. A solo engine change will not automatically update either multiplayer mode.

The largest gap is understandable, persistent build choices and consistent application across modes. This is more than a reskin, but does not require replacing the whole app.

## Core loop and battle rules

Math practice → visible MP and pet XP → choose an item or talent → equip a build → fight a readable opponent → see exactly what worked → try a new challenge or adjust the build.

Keep short, turn-based solo battles. Target 6–10 player turns and about 2–4 minutes, subject to testing with children. Use the current enemy-intent display: “Big attack next turn” must be actionable.

The main actions are Strike, Guard, Focus, the pet's Signature Move, and Item. Talents modify these actions rather than adding a new button for every unlock. Audit the existing math/trace/combo/glitch controls during the prototype; essential actions must stay on one screen. Basic Strike always works and restores a little energy. Signature Move spends energy; Focus trades a turn for a larger energy refill; Guard trades damage for protection. Item use also spends the turn. Show exact costs and expected effects before selection.

Solo battles should not require answering a fresh problem before every attack. Math practice funds preparation and progression. Keep existing question-based classroom modes available; a new tactical duel should be a clearly named separate mode, not a silent change to a teacher's activity.

Win at enemy HP zero; lose at your HP zero. Show a visible turn limit and treat a timeout as a draw with no win bonus. No pet death, lost levels, or stolen equipment from a battle defeat. Partial XP requires meaningful completed play; surrender/reload is not a reward loop.

## Real level-up moments

Use the existing pet level. Every level-up shows the XP bar filling, old/new combat stats, what unlocked, and what comes next. Support multiple levels from one reward and a later acknowledgement when the child is busy.

Proposed unlock schedule:

| Pet level | Unlock |
| --- | --- |
| 1 | Basic actions, species signature, free starter kit, practice opponent |
| 2 | First talent point and charm slot |
| 3 | Second talent point and usable item slot |
| 5 | Third talent point and badge slot |
| 8 | Fourth talent point; a full branch can now be completed |
| 12 | Fifth talent point and second saved build |
| 16 | Sixth talent point and third saved build |
| 20 | Champion challenge and mastery cosmetics |

Cap the first combat progression curve at an effective level of 20. Preserve displayed historical levels above 20 and all XP; subsequent levels can earn cosmetic mastery rewards. Do not reduce saved levels. Revisit the existing XP curve only after measuring school-safe bonuses, battle rewards and care XP together. First meaningful choice should arrive within one short session; a complete build should take several sessions, not an entire term.

Base battle HP should come from combat level/species, with a small bounded care benefit. Avoid multiplying large level, evolution, gear, prep and forge bonuses together. Fixed-tier adventure opponents let players feel stronger when returning to earlier areas; optional scaled challenges provide continued difficulty.

## A small skill tree with real decisions

Three branches, four one-point nodes each; six total points earned at the levels above. Nodes in a branch require the previous node. Six points allow 4+2, 3+3 or 2+2+2, so two full-branch finishers cannot coexist. Free resets outside battle; a reset clears the whole allocation atomically, returns all points and preserves equipped possessions. Save up to three loadouts as they unlock. Offer a one-click recommended build.

| Branch | Node 1 | Node 2 | Node 3 | Node 4: defining talent |
| --- | --- | --- | --- | --- |
| Guardian | Guard gains a small shield | Blocking a hit restores a little energy | Guard also removes one weakening effect | After blocking a direct attack, the next Strike gains a capped counter bonus |
| Striker | Alternating Strike and Signature adds one combo stack | A combo-enhanced Strike refunds a little energy | At three stacks, the next Signature partly bypasses Guard and consumes stacks | That enhanced Signature leaves a small shield, helping survive the opponent's reply |
| Tactician | Focus grants a small shield | First Signature after Focus costs less | That Signature applies a one-turn Weaken | Triggering this sequence twice readies an empowered Signature; spending it resets the sequence |

Names/effects are drafts. Initial status vocabulary is Shield, Combo, Weaken and Ready. Weaken reduces outgoing damage; it never removes a turn. Cap shields, energy refunds and combo stacks, and document exactly when each expires. Items and counters cannot trigger themselves or each other indefinitely. Display every trigger in the combat log and briefly beside the pet.

Every species can play all three branches. Give each species one modest thematic trait and a signature animation; a species should suggest a style without locking a child into it. Preserve custom signature names already earned in Pet Identity.

## Items earned through math

Launch scope: six charms, six badges and four reusable tools. Equip one charm, one badge and one tool. Permanent equipment unlocks once. Tools unlock permanently and recharge to one use at the start of each ordinary battle; no need to buy a potion after every defeat. Practice battles lend every build for testing without granting ownership.

Example catalog, with values to tune:

| Item | Slot | Combat purpose |
| --- | --- | --- |
| Mirror Charm | Charm | Adds a small shield after a counter-ready Strike; once per player turn |
| Spark Charm | Charm | The first combo-enhanced Signature each battle refunds energy |
| Focus Lens | Charm | Adds a small shield when Focus readies the next Signature |
| Thorn Badge | Badge | On blocking a direct hit, deals capped chip damage; cannot trigger retaliation chains |
| Rhythm Badge | Badge | The first time Combo reaches three, gain a one-use shield |
| Battery Badge | Badge | One small energy reserve, automatically released below an energy threshold |
| Healing Snack | Tool | Restore a capped percentage of battle HP; does not alter the home hunger meter |
| Bubble Bottle | Tool | Add a shield for the next incoming attack |
| Energy Berry | Tool | Refill a bounded amount of battle energy |
| Cleansing Leaf | Tool | Remove Weaken and add a small shield |

Complete the remaining six equipment designs after the three sample builds work. Avoid launch filler that differs only by +1 power. Broadly equal power budgets; advanced items add alternatives and combinations.

Reuse MP and the existing question-receipt pipeline. Proposed prices: first choice 10 MP (about five completed answers from zero), most gear 20 MP, specialised gear 30 MP. Make the reward track explicit: “Spark Charm: 6 / 10 MP — 2 more completed questions.” Existing balances count. The first guided set offers a choice of three starter charms rather than a random roll; claiming either path must prevent duplicate purchases.

Corrections receive the same total completion reward; hints do not remove item access. Grade/topic changes do not lock a child out of a combat style. No speed requirement or streak reset for equipment. Number Merge and other puzzle games must use their own legitimate completion criteria; moving a numbered tile is not evidence of a correct curriculum answer. Add per-run receipts for game completions separately, with modest rewards and no fake learning records.

Fold Power Forge into the battle preparation screen. For v2 combat, migrate ATK/DEF/HP upgrades into a documented, capped legacy training contribution and refund the recorded MP purchase costs once if those upgrades are retired. Keep Sharp Focus's existing math-reward value unless separately rebalanced. Inventory battle boosts and math prep get a deliberate conversion/use rule before rollout, rather than disappearing or multiplying new gear strength. Produce a before/after migration preview for test saves. Preserve all owned decorations and care items.

## Three example builds

- **Counter Guardian:** four Guardian points + two Tactician points; Mirror Charm, Thorn Badge, Bubble Bottle. Read the big attack, Guard, then counter. Weakness: an opponent that prepares or weakens instead of striking wastes the guard turn.
- **Combo Striker:** four Striker points + two Guardian points; Spark Charm, Rhythm Badge, Energy Berry. Alternate attacks, build three stacks, choose the opening for an enhanced Signature. Weakness: spending the burst into the wrong intent leaves fewer resources for defence.
- **Focus Specialist:** four Tactician points + two Guardian points; Focus Lens, Battery Badge, Cleansing Leaf. Spend a turn preparing, weaken the opponent, then use an efficient Signature sequence. Weakness: aggressive pressure during preparation.

Show the build's benefit, tradeoff, and suggested first two turns. These are hypotheses to validate, not a promised perfect rock-paper-scissors balance.

## Replayability and classroom modes

Start with a small campaign: three themed areas, each with four regular encounters and a boss. Five enemy behaviours are sufficient initially: attacker, defender, healer, combo fighter and disruptor. Bosses need recognisable phases and announced attacks. Rewards can be gear access, backgrounds and titles; advanced gear must also be reachable through math progression.

Then add a five-fight expedition: choose between two routes, choose one of three temporary perks after encounters, keep permanent XP and equipment at the end. Temporary perks reset between expeditions; the pet never resets. A changing weekly challenge can offer cosmetic goals, with prior challenges available later. No missing-day penalties.

For a new classmate tactical duel, normalise effective levels, talent budget and item strength. Offer the same loan catalog to both players for that match; earned items remain meaningful in adventure and ownership displays. Lock loadouts at ready, reveal them consistently, and resolve using server-owned snapshots. No token stakes. Keep existing question duels separately available until their replacement is explicitly designed and tested.

Teacher-team battles need separately budgeted equivalents of these effects; never multiply a solo item's benefit by class size. Preserve equal team contribution and teacher pause/end controls. Treat this adaptation as a later milestone, not an automatic consequence of the solo upgrade.

## Presentation and teaching

Battle preparation: the actual earned pet in the centre, level/XP and next unlock, three visible equipment sockets, tabs for Talents and Challenges. Show the final stat/effect change before equipping. Preserve the app-wide 100–150% interface sizing.

Combat: clear HP/energy, plain-language enemy intent, five large actions, readable status duration, and an item-use animation. Species-specific idle, anticipation, strike, hit, block, heal, victory and tired defeat animations; consistent pixel scale and reduced-motion support. Damage/shield/heal numbers must correspond to actual resolution.

Results explain the build: “Your shield blocked 12. Your badge dealt 3. Level 5 reached — badge slot unlocked.” Show equipment source and a next-goal button. Include three short, captioned, replayable demonstrations (roughly 30–45 seconds each), one for each build, plus a playable tutorial and transcript. Use actual game captures once mechanics stabilise so the videos match the game.

## Implementation order and release checks

1. **Inventory and save design.** Compare the live release and dirty local work, identify shared mechanics/reward paths, collect representative saves without exposing student data, and document migration. Store owned equipment at account level, points/loadouts per pet ID, with a versioned battle snapshot. Define the refund and overflow rules before changing economy values.
2. **Playable slice.** One real pet, three branch prototypes, six equipment pieces, two tools and three opponents. Implement pure, seeded combat resolution with structured events. Validate that Guardian, Striker and Tactician feel different before producing all art/content. Do not deploy this slice as the finished upgrade.
3. **Progression and rewards.** Level-up feedback, all species compatibility, final twelve-node tree, math-earned catalog, save/reload, free resets, recommended builds, MP receipts and a non-destructive migration. Extend worker save validation/schema and authorised reward routes along with client types.
4. **Campaign and visual finish.** Three areas, encounter AI, usable-item animation, accessible controls, results, guides and captured tutorials. Local acceptance and screenshots before live rollout.
5. **Replay modes and multiplayer.** Expedition, balanced tactical duel, then teacher-team adaptation. Share effect definitions where appropriate while keeping different turn/team rules explicit. Existing classroom math modes remain functional throughout.

Server checks must validate ownership, point prerequisites, item charges, turn/revision and one-time rewards. Concurrent tabs, retries and reconnects must not spend twice or duplicate XP/refunds. Online multiplayer and owned online rewards use server authority; offline local play keeps local saves without silently importing unverified rewards into a classroom account. Snapshot rules versions so an update cannot change an in-progress match underneath players.

Balance tests: a seeded matchup matrix across species, three recommended builds, hybrids and representative gear; compare good decisions against attack-only, guard-only and focus-only policies. Investigate persistent equal-budget build advantages above roughly 60% across varied opponents, rather than forcing every individual counter matchup to 50%. Check one-turn defeats, healing stalls, endless energy/shield loops and the turn limit. These are investigation thresholds, not evidence until tests run.

Acceptance: new and established pets retain ownership/XP/evolution; awarded points match milestones; rewards and refunds occur once; all four tools visibly affect real combat; a child can explain why their build works; progression appears in results immediately; 1366×768 Chromebooks at 150%, touch, keyboard and reduced motion remain usable. Existing solo battles, dungeon adapters, math learning records, classmate duels and teacher sessions need regression coverage. Use a small teacher pilot with rollback before broad rollout.

Recommended first delivery is the playable slice followed by a complete solo progression release. Multiplayer and expeditions follow once the core builds are fun and balanced. No product code or live settings were changed while preparing this plan.
