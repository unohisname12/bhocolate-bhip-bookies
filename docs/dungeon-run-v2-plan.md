# Dungeon Run V2 — Design & Execution Plan

> **Status:** Planning — not yet approved for implementation
> **Date:** 2026-04-05
> **Depends on:** V1 Dungeon Run (complete), Battle System, Trace Events, Momentum Board, Lore

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Core Experience Vision](#2-core-experience-vision)
3. [Design Pillars](#3-design-pillars)
4. [System-by-System V2 Design](#4-system-by-system-v2-design)
5. [Math Integration Guardrails](#5-math-integration-guardrails)
6. [Recommended Gameplay Loop](#6-recommended-gameplay-loop)
7. [Architecture & Implementation Strategy](#7-architecture--implementation-strategy)
8. [Step-by-Step Execution Plan](#8-step-by-step-execution-plan)
9. [MVP vs Full V2](#9-mvp-vs-full-v2)
10. [Final Recommendation](#10-final-recommendation)
11. [Open Questions](#11-open-questions)
12. [Recommended Build Order](#12-recommended-build-order)
13. [Do Not Build Yet](#13-do-not-build-yet)

---

## 1. Current State Audit

### What V1 Built

V1 delivered a minimal but complete roguelike loop. Here's exactly what exists in the repo:

**State Machine** (`src/types/run.ts`):
- `RunPhase`: 6 phases — `not_started`, `encounter_preview`, `in_battle`, `reward_pick`, `run_victory`, `run_defeat`
- `RunState`: discriminated union (`ActiveRunState | InactiveRunState`)
- `RunBonuses`: `maxEnergyBonus`, `statBonus`, `utilityEffects[]`
- `ActiveRunState` tracks: `currentEncounter` (0–3), `playerHPPercent` (0–1), `bonuses`, `rewardsChosen[]`, `encountersWon`

**Run Logic** (`src/engine/systems/RunSystem.ts`):
- 6 pure functions: `startRun`, `startRunBattle`, `handleRunVictory`, `handleRunDefeat`, `selectRunReward`, `endRun`
- HP carries between encounters via `playerHPPercent`
- Lifesteal heals 15% of enemy maxHP post-victory
- End-of-run rewards: `encountersWon × playerLevel × 5` tokens, `× 8` XP

**Battle Adapter** (`src/engine/systems/RunBattleAdapter.ts`):
- `buildRunPlayerPet()`: applies energy/stat bonuses, sets HP from percent, adds shield_start buff
- `buildRunEnemy()`: applies template statScale/hpScale, behavior stat tweaks (aggressive: +15% STR/−10% DEF, defensive: +15% DEF/−10% STR)
- Does NOT modify BattleSystem.ts — adapter pattern keeps battle core untouched

**Enemy Config** (`src/config/runConfig.ts`):
- 4 fixed enemies: Wild Slime (aggressive), Guardian Koala (defensive), Rogue Mech (aggressive), Void Subtrak (boss)
- Hardcoded encounter order: enemies[0], enemies[1], enemies[2], enemies[3] (boss)
- Fixed reward pools per encounter (2 choices each): energy+stat, energy+utility, stat+utility

**Reducer Integration** (`src/engine/state/engineReducer.ts`):
- 7 new action types in `ActionTypes.ts`
- `END_BATTLE` routes through `handleRunVictory`/`handleRunDefeat` when run is active
- `FLEE_BATTLE` and `PLAYER_FLEE_ATTEMPT` treat flee-in-run as defeat

**4 Screens:**
- `RunStartScreen.tsx`: entry with pet preview, run structure dots, boss teaser
- `RunEncounterScreen.tsx`: pre-battle preview with retreat, HP bar, enemy sprite, progress dots
- `RunRewardScreen.tsx`: 2-card reward picker
- `RunOverScreen.tsx`: victory/defeat summary with token/XP breakdown

**Entry Point:** `dungeon` action in `roomConfig.ts` (both inside and outside rooms), wired through `RightSidePanel`, `BottomActionBar`, and `GameSceneShell`.

### What V1 Lacks

| Gap | Impact |
|-----|--------|
| Linear path only (always encounter 0→1→2→boss) | No replayability, no decisions between fights |
| 4 hardcoded enemies, fixed order | Predictable, solved after 2 runs |
| 3 fixed reward pools (6 total rewards) | Shallow build diversity |
| No non-combat nodes | Run is just 4 fights in a row |
| No math integration in the run itself | Math only appears through normal battle trace events |
| No environmental/dungeon flavor | Fights feel identical to arena/practice battles |
| No run-specific mechanics | HP carryover is the only persistent pressure |
| No meta progression | Repeated runs don't unlock anything new |
| No difficulty scaling | Same difficulty regardless of player level or run count |
| Enemy AI is identical to normal battles | Behavior expressed only through stat distribution |

### Adjacent Systems Available for V2

**Trace Events** (`src/types/trace.ts`, `src/config/traceConfig.ts`):
- 4 event types: `trace_answer` (digit tracing for math answers), `trace_missing_digit` (fill in blanks), `trace_shield` (reactive defense), `trace_rune` (offensive boost)
- Accuracy tiers: miss/basic/good/perfect with multipliers 1.0/1.3/1.5/2.0
- Shield auto-triggers on heavy hits (≥25% maxHP) via `TraceEventController.tsx`
- Rune requires ≥60 energy to activate
- Timing: shield 3s, rune 5s, missing_digit 6s, answer 8s

**Momentum Board** (`src/types/momentum.ts`, `src/engine/systems/MomentumSystem.ts`):
- 5×5 tactical grid, piece ranks 1–4, BFS pathfinding
- Flash Moments (exact_energy_kill, underdog_win) → upgrade or fusion
- Clutch tile mechanic, 3 difficulty levels
- Complete standalone mini-game with its own victory/defeat

**Lore** (`docs/LORE.md`):
- Equation Layer: parallel dimension where math is structural energy
- Auraliths: living mathematical constructs (the pets)
- Fractured Forms: unstable Auraliths that corrupt surrounding space — perfect enemy framing
- Cognitive Linking: human guides Auralith via shared consciousness
- Combat is "structural conflict" — attacks are weaponized patterns, defense is stabilized logic

**Pet Care** (`src/engine/systems/PetNeedSystem.ts`):
- 4 needs: hunger, happiness, cleanliness, health
- Cross-need multipliers (low hunger accelerates health decay, etc.)
- Species-specific decay modifiers and care preferences

**Species** (`src/config/speciesConfig.ts`):
- 4 species: koala_sprite (balanced), slime_baby (speed/play), mech_bot (str+def/tank), subtrak (precision/drain)
- Base stats, decay modifiers, evolution stages with stat multipliers

**Currencies** (`src/types/player.ts`):
- tokens, coins, mp (Math Points), mpLifetime
- mathMastery: arithmetic/geometry/fractions (placeholder)

---

## 2. Core Experience Vision

### The Fantasy

You are a Cognitive Linker. Your Auralith — your bonded creature — enters a Fracture Zone: a region of the Equation Layer where reality is breaking down. Fractured Forms roam freely. The deeper you go, the more unstable the space becomes.

Your goal: reach the core of the fracture and stabilize it. Every encounter drains your Auralith's structural integrity. Every choice you make — fight, rest, explore — shapes whether you survive. Math is the fabric of this world. When you solve equations, you're not answering quiz questions — you're literally restoring the structure that holds your Auralith together.

### The Feeling

A V2 run should feel like:

- **Tense, not stressful.** You're always one bad fight from losing, but you have tools to manage risk. HP carryover creates persistent dread. Rest nodes offer relief, not safety.
- **Different every time.** Branching paths, randomized encounters, and varied rewards mean each run teaches you something new about your pet's capabilities.
- **Building toward something.** By encounter 4, you've accumulated bonuses that change how you fight. Your trace accuracy matters more. Your choices compound.
- **Part of the world.** Enemies are Fractured Forms, not random monsters. Rest is structural repair. Rewards are reclaimed equation fragments. The dungeon *is* the Equation Layer.

### What Success Looks Like

1. A player who's completed 5 runs has had meaningfully different experiences in at least 3 of them
2. Math interactions feel like survival tools, not interruptions
3. Losing a run teaches you something (I should have rested, I should have taken the energy reward, I need to trace more accurately)
4. A run takes 12–20 minutes start to finish
5. The player cares about their HP bar between fights

---

## 3. Design Pillars

### Pillar 1: Persistent Pressure

Every decision has a cost that carries forward. HP persists. Resources are scarce. There are no full resets mid-run. The player should always feel the weight of previous encounters.

**In practice:**
- HP carryover (already in V1)
- Limited rest opportunities that don't fully heal
- Rewards are meaningful but force trade-offs
- Boss difficulty assumes you're already weakened

### Pillar 2: Meaningful Choice

The player makes real decisions, not cosmetic ones. "Do I fight the harder enemy for a better reward, or take the safe path?" "Do I rest now or push through with 40% HP?" "Energy bonus or stat bonus?"

**In practice:**
- Branching map with visible risk/reward trade-offs
- At least 2 paths at each fork
- Reward pools with real trade-offs (offensive vs defensive vs recovery)
- Non-combat nodes that compete for map slots with combat nodes

### Pillar 3: Math as Survival

Math is woven into the dungeon as the fabric of reality, not layered on top as a test. When the player traces a rune, they're channeling equation energy. When they solve during a rest node, they're stabilizing their Auralith's form. Missing a trace under pressure should feel like fumbling a weapon, not failing an exam.

**In practice:**
- Trace events appear in combat as they already do — no change needed
- Non-combat math is environmental: stabilizing a fracture, decoding a barrier, channeling a rest
- Math accuracy affects *magnitude*, not *access* — you always get something, accuracy determines how much
- No "answer this or you can't proceed" gates
- MP (Math Points) earned during runs feed into meta progression

### Pillar 4: World-Grounded Identity

The dungeon run isn't a game mode — it's an expedition into the Equation Layer. Every element should reinforce the lore. Enemies are Fractured Forms. The environment is mathematical instability. Rest is structural repair. Victory is stabilizing a fracture zone.

**In practice:**
- Enemy names and descriptions reference fracture/instability
- Environmental descriptions use Equation Layer vocabulary
- Rewards framed as reclaimed equation fragments
- Run failure framed as retreat from instability, not "game over"

### Pillar 5: Respect the Player's Time

A run should be completable in a single session (12–20 minutes). No mandatory grinding between runs. Losing doesn't waste the player's time — partial rewards are always granted. No artificial padding.

**In practice:**
- 5–7 total map nodes per run (not all combat)
- Individual battles stay 5–8 turns per existing balance
- Clear progress indicator at all times
- Partial rewards scale with progress

---

## 4. System-by-System V2 Design

### 4.1 Map Generation

**Current state:** Linear path of 4 encounters (hardcoded in `runConfig.ts`).

**V2 design:** Simple branching map with 3 tiers + a boss node.

```
START
  ├── Tier 1: [Combat A] or [Combat B]
  ├── Tier 2: [Combat C] or [Rest Node] or [Event Node]
  ├── Tier 3: [Elite Combat] or [Combat D] or [Event Node]
  └── BOSS
```

**Map structure:**
- 3 tiers of 2–3 nodes each, plus a fixed boss at the end
- Each tier offers a choice of node types
- Paths converge at the boss — everyone fights the same boss regardless of path
- Map is generated at run start and stored in state
- Nodes are revealed one tier at a time (fog of war on later tiers is optional V2+)

**Node types:**
- **Combat:** standard enemy encounter (uses existing battle system via adapter)
- **Elite Combat:** harder enemy with better reward (scaled stats, guaranteed rare reward)
- **Rest Node:** partial HP recovery + optional math interaction for bonus healing
- **Event Node:** narrative choice with mechanical consequence (see 4.5)
- **Boss:** final encounter, always the last node

**State addition to `ActiveRunState`:**
```
map: RunMap           // generated node graph
currentNodeId: string // which node the player is at
```

**`RunMap` type (new in `src/types/run.ts`):**
```
interface RunMapNode {
  id: string;
  tier: number;           // 0-3 (0=start, 3=boss)
  type: 'combat' | 'elite' | 'rest' | 'event' | 'boss';
  enemyId?: string;       // for combat/elite/boss nodes
  eventId?: string;       // for event nodes
  rewardTier: 'common' | 'rare' | 'elite';
  connections: string[];  // node IDs this connects to
  visited: boolean;
}

interface RunMap {
  nodes: RunMapNode[];
  currentPath: string[];  // visited node IDs in order
}
```

**Generation algorithm:**
- Deterministic from a seed (for reproducibility, future seeded runs)
- Tier 1: always 2 combat nodes (one easier, one harder)
- Tier 2: 2–3 nodes, at least 1 combat + 1 non-combat (rest or event)
- Tier 3: 2–3 nodes, at least 1 elite combat
- Boss: always 1 node
- Each tier node connects to 1–2 nodes in the next tier
- Total path length: 4 nodes (1 per tier + boss), but player chooses which 4

### 4.2 Enemy System

**Current state:** 4 hardcoded enemies in `RUN_ENEMIES[]`. Fixed encounter order. 3 behavior types (`aggressive`, `defensive`, `boss`) expressed only through stat tweaks.

**V2 design:** Enemy template pool with procedural variation, expanded behavior archetypes, and Fractured Form theming.

**Expanded enemy pool (12–16 templates across tiers):**

Tier 1 (weak, introductory):
- Shard Slime (aggressive, low HP, hits hard but fragile)
- Fractured Sprout (defensive, regenerates small HP each turn)
- Glitch Wisp (erratic, random stat variation per fight)

Tier 2 (standard):
- Cracked Guardian (defensive, uses defend + heal cycle)
- Voltage Remnant (aggressive, energy drain on hit — reduces player energy by 2)
- Null Fragment (balanced, reflects a portion of damage back)

Tier 3 / Elite:
- Recursion Knight (scaling, gains +5% STR per turn survived)
- Entropy Shade (punisher, deals bonus damage when player misses trace events)
- Structural Anomaly (tank, high HP + defense, low attack)

Boss pool (2–3 rotating bosses):
- Void Subtrak (existing, all-around threat)
- Fracture Core (high HP, periodic "instability pulse" that damages player each turn)
- The Unsolved (math-themed, trace events appear more frequently during this fight)

**Behavior system changes:**

Rather than expanding `BattleAI.ts` (complex, risky), V2 expresses behavior through:
1. **Stat distribution** (already in V1 — aggressive, defensive)
2. **Move pool variation** per template: some enemies get heal moves, some don't; some have high-cost burst moves
3. **Passive effects** baked into the adapter: energy drain on hit, damage reflection, scaling stats — applied as post-battle-action hooks, not AI changes

**Implementation approach:**
- Expand `RunEnemyTemplate` with optional `passiveEffect` field
- Passive effects are applied in the reducer when processing battle turn results
- This keeps `BattleAI.ts` and `BattleSystem.ts` untouched

```
// Pseudocode for template extension
interface RunEnemyTemplate {
  // ... existing fields
  passiveEffect?: 'energy_drain' | 'damage_reflect' | 'scaling' | 'regen' | 'instability_pulse';
  passiveValue?: number;       // e.g., 2 for energy_drain, 0.05 for scaling
  movePoolOverride?: string[]; // override default species moves
}
```

### 4.3 Reward System

**Current state:** 3 fixed reward pools (6 total rewards), 2 choices per encounter. Categories: energy, stat, utility.

**V2 design:** Expanded reward pool with tier-based selection, new reward categories, and "equation fragment" framing.

**Reward categories:**
- **Energy:** max energy bonuses (+5, +8, +12)
- **Stat:** STR/DEF bonuses (+3, +5, +8)
- **Utility:** special effects (lifesteal, shield_start, regen, thorns, combo_boost)
- **Trace:** trace-related bonuses (wider hit radius, longer time limit, bonus multiplier)
- **Recovery:** immediate HP restoration (15%, 25%)

**New utility rewards:**
- `regen`: heal 3% max HP at the start of each battle turn
- `thorns`: reflect 10% of damage taken back to attacker
- `combo_boost`: combo multiplier stacks 50% faster (1.5× combo growth rate)
- `trace_focus`: trace event hit radius +20% for rest of run
- `energy_regen`: +1 energy per turn (in addition to base +4)

**Reward tier system:**
- Common rewards: energy_5, stat_3, recovery_15
- Rare rewards: energy_8, stat_5, lifesteal, shield_start, trace_focus
- Elite rewards: energy_12, stat_8, regen, thorns, combo_boost, energy_regen, recovery_25

**Selection rules:**
- Combat nodes: 2 common/rare rewards
- Elite combat nodes: 2 rare/elite rewards (guaranteed 1 elite)
- Boss victory: 1 elite reward + flat token/XP bonus
- Rest nodes: no reward pick (the rest IS the reward)
- Event nodes: reward determined by event outcome

**Implementation:**
- Replace fixed `RUN_REWARD_POOL` with a `generateRewardChoices(tier, encounterIndex, existingBonuses)` function
- Weighted random selection from pool, avoiding duplicates of already-chosen rewards
- New reward effects added to `REWARD_EFFECTS` map in `RunSystem.ts`
- New `RunBonuses` fields for new utility effects

### 4.4 Rest Nodes

**Current state:** No rest mechanic exists.

**V2 design:** Rest nodes as structural repair — the player's Auralith stabilizes itself in a calm pocket of the Equation Layer.

**Core mechanic:**
- Base healing: restore 20% of max HP (always granted, no conditions)
- Bonus healing: an optional "stabilization" interaction (trace-based) that can boost healing to 35%
- The stabilization is a single trace event — trace a rune shape to channel repair energy
- Accuracy tier determines bonus: miss = +0%, basic = +5%, good = +10%, perfect = +15%
- This is NOT mandatory — the player can skip and take their 20%

**Why this works:**
- Rest is valuable even without math (20% HP is significant)
- The trace interaction feels like part of the world (stabilizing your Auralith's form)
- Accuracy rewards skill without punishing avoidance
- Takes 5–10 seconds, doesn't break pacing

**UI concept:**
- Calm visual: dark blue/purple ambient, Auralith sprite centered, gentle pulse animation
- "Stabilize" button triggers trace event, "Rest" button takes base healing and moves on
- After interaction, show HP bar filling with amount healed

**Lore framing:**
- "You find a stable pocket in the fracture. Your Auralith's form begins to mend."
- Stabilization: "Channel equation energy to accelerate the repair."
- Result: "Structural integrity restored." (not "Correct!" or "Good job!")

### 4.5 Event Nodes

**Current state:** No event system exists.

**V2 design:** Short narrative encounters with mechanical consequences. Think Slay the Spire events, but grounded in Equation Layer lore.

**Event pool (6–8 events for V2):**

1. **Equation Fragment Cache**
   - "You discover a cluster of dormant equation fragments."
   - Choice A: "Absorb them" → gain 1 random common reward, lose 10% HP (structural strain)
   - Choice B: "Leave them" → gain 5% HP (the fragments stabilize the area)

2. **Fractured Mirror**
   - "A reflective surface shows your Auralith's structural weaknesses."
   - Choice A: "Study the reflection" → trace event (trace_answer). Perfect = +5 to strongest stat. Miss = −3 to weakest stat.
   - Choice B: "Shatter it" → nothing happens (safe option)

3. **Wandering Merchant** (if shop system exists, otherwise skip for MVP)
   - "A fellow Linker offers supplies."
   - Spend tokens for a rare reward pick from 3 options
   - Or decline and move on

4. **Unstable Ground**
   - "The path ahead crackles with raw equation energy."
   - Choice A: "Push through" → lose 15% HP, gain +3 to all stats for rest of run
   - Choice B: "Find another way" → no cost, no reward

5. **Resonance Well**
   - "Your Auralith feels a deep harmonic pull."
   - A trace_rune event appears. Tier determines outcome:
   - Perfect: full energy restoration in next battle + 10% HP heal
   - Good: 10% HP heal
   - Basic: 5% HP heal
   - Miss: nothing (no penalty)

6. **Structural Echo**
   - "An echo of a previous Linker's journey lingers here."
   - Reveals the boss's passive effect (if boss has one)
   - Also grants +5% HP

**Event implementation:**
- Events stored as data in `src/config/runEventConfig.ts`
- Each event has: `id`, `title`, `description`, `choices[]`
- Each choice has: `label`, `description`, `effect` (function or effect ID)
- Effects modify run state through existing patterns (HP%, bonuses, etc.)
- New `RunPhase`: `event_choice`
- New screen: `RunEventScreen.tsx`

### 4.6 Combat — What Changes in V2

**Critical principle:** The battle system (`BattleSystem.ts`, `BattleAI.ts`) remains untouched. All dungeon-specific combat behavior is expressed through the adapter layer and post-turn hooks.

**What stays the same:**
- Energy economy (30 base, +4/turn, Focus +12)
- Combo system (0–8 stacks)
- Trace events (shield on heavy hit, rune on 60+ energy, answer/missing_digit for math buff)
- Move execution, damage calculation, buff/debuff application
- AI decision making (stays in `BattleAI.ts`)

**What V2 adds via adapter/hooks:**

1. **Enemy passive effects** (applied in reducer, not in battle core):
   - `energy_drain`: after enemy attacks, reduce player energy by N
   - `damage_reflect`: after player attacks, player takes N% of dealt damage
   - `scaling`: at start of each enemy turn, increase enemy STR by N%
   - `regen`: at start of each enemy turn, heal enemy by N HP
   - `instability_pulse`: at start of each turn, both sides take small damage

2. **Run-modified trace behavior:**
   - `trace_focus` reward: widen hit radius by 20% (modify `hitRadiusMultiplier` in adapter)
   - Elite enemies could have "distortion" — trace paths wobble slightly (visual only, via CSS animation on the trace canvas)
   - Boss fights: trace events trigger more frequently (lower the shield threshold from 25% to 15% of maxHP)

3. **Dungeon-specific battle framing:**
   - Battle log messages use Equation Layer vocabulary ("structural damage" not "damage")
   - Enemy defeat: "The fracture destabilizes and collapses" not "Enemy defeated"
   - These are string changes in the adapter-built battle state, not logic changes

**How enemy passives work (pseudocode):**
```
// In engineReducer, within EXECUTE_MOVE or END_TURN handling:
if (state.run.active && state.run.phase === 'in_battle') {
  const template = getEnemyForEncounter(state.run.currentEncounter);
  if (template.passiveEffect === 'energy_drain' && lastAction === 'enemy_attack') {
    // reduce player energy by passiveValue
  }
}
```

This is a thin post-processing layer in the existing reducer, not a modification to battle logic.

### 4.7 Meta Progression

**Current state:** No meta progression. Runs are isolated. End-of-run rewards are tokens + XP.

**V2 design:** Lightweight meta layer that rewards repeated play without gating content.

**Fracture Journal:**
- A persistent record of run attempts and achievements
- Tracks: total runs completed, best encounters won, total fractures stabilized (wins), enemies defeated by type
- Unlocks cosmetic titles at milestones (e.g., "Fracture Walker" at 5 wins, "Void Delver" at 15 wins)
- Stored in `PlayerProfile` as `runStats: RunMetaStats`

**MP (Math Points) integration:**
- Trace events during dungeon runs award MP in addition to their battle effects
- Perfect trace during a run: +3 MP. Good: +2 MP. Basic: +1 MP.
- Rest node stabilization also awards MP (perfect: +5 MP, good: +3 MP, basic: +1 MP)
- This feeds the existing MP/mpLifetime system in `PlayerProfile.currencies`

**Difficulty scaling (soft):**
- After 3 completed runs, enemy statScale increases by 5% per subsequent run (stored in `runStats`)
- Cap at +30% (after 9 runs)
- Reward scaling matches: token/XP multiplier increases proportionally
- This provides gentle curve without hard gating

**What V2 does NOT add:**
- No permanent stat unlocks from runs (too complex, balance risk)
- No run-exclusive currencies
- No mandatory "beat run X to unlock run Y" progression
- No lockouts after defeat

### 4.8 Difficulty & Balance

**Current V1 balance reference points:**
- HP range: 150–300 (from battle balance preferences)
- Fights target 5–8 turns
- Energy: 30 start, +4/turn, Focus +12
- Base stats: STR 8–16, SPD 9–15, DEF 8–16 across species
- V1 enemy scaling: 0.85–1.3 statScale, 0.9–1.4 hpScale

**V2 balance targets:**

| Node Type | Enemy statScale | Enemy hpScale | Expected Fight Length |
|-----------|----------------|---------------|---------------------|
| Tier 1 Combat | 0.75–0.90 | 0.85–0.95 | 4–6 turns |
| Tier 2 Combat | 0.85–1.00 | 0.90–1.05 | 5–7 turns |
| Tier 3 Combat | 0.95–1.10 | 1.00–1.15 | 6–8 turns |
| Elite Combat | 1.05–1.20 | 1.10–1.25 | 7–9 turns |
| Boss | 1.25–1.40 | 1.30–1.50 | 8–12 turns |

**HP economy across a full run (no rest):**
- Tier 1 fight: expect to lose 15–25% HP
- Tier 2 fight: expect to lose 20–30% HP
- Tier 3 fight: expect to lose 25–40% HP
- Boss fight: expect to lose 40–60% HP
- Total without healing: ~100–155% HP lost = you MUST rest or gain recovery rewards to beat the boss
- With 1 rest node (20–35% heal) + 1 recovery reward (15–25%): survivable but tight

This creates the intended tension: you can't just brute-force every combat node. Rest and recovery matter.

**Reward balance:**
- Energy rewards (+5/+8/+12) are equivalent to 1.25/2.0/3.0 extra turns of energy budget
- Stat rewards (+3/+5/+8) are ~10%/15%/25% increase to base stats
- Recovery (15%/25%) is directly tradeable against a rest node
- Utility effects (lifesteal, regen, thorns) provide ~5–10% effective HP over a full fight

### 4.9 Defeat & Emotional Weight

**Current state:** Defeat shows "Defeated" text, partial rewards, "Return Home" button. Functional but flat.

**V2 design:** Defeat should feel consequential without being punishing.

**Mechanical consequences:**
- Partial rewards always granted (existing V1 behavior, keep it)
- Formula: `encountersWon × playerLevel × 5` tokens, `× 8` XP (unchanged)
- MP earned during the run is always kept (math effort is never wasted)
- No lockout, no cooldown, no penalty — you can immediately start a new run

**Emotional weight (UI/narrative):**
- Defeat screen shows your Auralith's structural integrity collapsing — sprite dims, fracture visual effect
- Text: "The fracture overwhelms your Auralith. You retreat to stable ground."
- Show a brief run recap: which nodes you visited, how far you got, what rewards you collected
- Show what you WOULD have faced next (the unrevealed path) — creates "I was so close" feeling
- Recovery message: "Your bond remains strong. The fractures will wait."

**Victory celebration:**
- Sprite glows, fracture visual heals/closes
- "Fracture stabilized. The Equation Layer grows calmer."
- Show full reward breakdown + any meta milestones unlocked
- If it's the player's first boss kill: special "Fracture Walker" title unlock moment

---

## 5. Math Integration Guardrails

### The Core Rule

> **Math must feel like part of the world and survival — never like gatekeeping.**

Every math interaction in the dungeon run must pass this test:

1. **Can the player proceed without it?** → YES, always. No math gates.
2. **Does accuracy affect magnitude, not access?** → YES. Miss a trace = weaker effect, not blocked path.
3. **Does it feel like a survival action?** → YES. Tracing a shield under pressure = fumbling a weapon. Stabilizing at rest = channeling repair energy.
4. **Would removing it make the run feel emptier?** → YES. It should add texture, not obligation.

### Where Math Appears

| Context | Trigger | Mandatory? | Miss Consequence | Perfect Reward |
|---------|---------|-----------|-----------------|----------------|
| Battle: Shield | Enemy deals ≥25% HP | Auto-trigger, can skip | Full damage taken | 80% damage reduction |
| Battle: Rune | Player has ≥60 energy | Player-initiated | Wasted energy, no boost | 2.0× next attack |
| Battle: Math Buff | Turn start prompt | Player-initiated | No buff | 1.5× next attack |
| Rest: Stabilize | At rest node | Optional button | Just get base 20% heal | Up to +15% bonus heal |
| Event: Fractured Mirror | Event choice | Only if chosen | −3 weakest stat | +5 strongest stat |
| Event: Resonance Well | Event choice | Always (but no penalty) | Nothing | Full energy + 10% heal |

### What Math Is NOT

- **Not a pop quiz.** No "solve this problem to open the door."
- **Not a checkpoint.** No "your math accuracy must be X% to enter tier 3."
- **Not a worksheet.** No sequence of 10 problems in a row.
- **Not separate from gameplay.** Math interactions happen WITHIN existing game moments (battles, rest, events), not as standalone screens.

### Math Difficulty in Runs

- Uses the same difficulty system as normal battles (scales with player level via `mathMastery`)
- Run-specific modifier: trace events in tier 3 and boss fights have 10% tighter timing (multiply `timeLimitMs` by 0.9)
- This makes later fights feel more intense without being unfair (the base timing is generous)
- `trace_focus` reward counteracts this by widening hit radius

### MP Earning

Math effort during runs always generates MP, creating a secondary reward loop:

- Trace events (any type, any context): perfect=3, good=2, basic=1, miss=0
- Rest stabilization: perfect=5, good=3, basic=1, miss=0
- MP is added to player state immediately (not held until run end)
- This means even failed runs where you traced well reward mathematical engagement

---

## 6. Recommended Gameplay Loop

### Full Run Sequence (Player Perspective)

```
1. ENTRY
   Player taps "Dungeon" from home → RunStartScreen
   Shows: map preview (3 tiers + boss), pet status, "Enter Fracture" button
   Lore: "A fracture has opened in the Equation Layer. Your Auralith senses instability."

2. MAP CHOICE (Tier 1)
   Player sees 2 nodes: [Combat: Shard Slime] or [Combat: Cracked Guardian]
   Taps a node → RunEncounterScreen (pre-battle preview)
   Shows: enemy sprite, name, description, passive effect (if any), player HP bar

3. COMBAT (existing battle flow)
   Taps "Fight" → BattleScreen (unchanged from normal battles)
   Trace events fire as normal (shield on heavy hits, rune on 60+ energy)
   Each trace awards MP in real-time
   Victory → run continues. Defeat → run ends.

4. REWARD
   RunRewardScreen shows 2 choices (common/rare tier)
   Player picks one → bonus applied to RunBonuses

5. MAP CHOICE (Tier 2)
   Player sees 2-3 nodes: [Combat: Voltage Remnant] or [Rest Node] or [Event: Equation Cache]
   Risk/reward: fight for a reward, or rest to recover HP?

6. REST (if chosen)
   RunRestScreen: calm visual, Auralith pulsing
   Base: +20% HP. Optional: tap "Stabilize" → trace event → up to +15% bonus
   No reward pick (the healing IS the reward)

7. MAP CHOICE (Tier 3)
   Player sees 2-3 nodes: [Elite: Recursion Knight] or [Combat: Null Fragment] or [Event: Unstable Ground]
   Elite has better rewards but is harder. Events are wildcards.

8. BOSS
   All paths converge. RunEncounterScreen with boss-specific styling.
   Boss has passive effect previewed.
   Fight is longer and harder. Trace events feel more urgent (tighter timing).

9. OUTCOME
   Victory: RunOverScreen → "Fracture Stabilized!" + full rewards + meta milestone check
   Defeat: RunOverScreen → "Retreat" + partial rewards + path recap
   Both: "Return Home" → endRun() → tokens + XP + MP applied
```

### Timing Budget

| Phase | Expected Duration |
|-------|------------------|
| Entry + map | 15–30 seconds |
| Tier 1 combat + reward | 2–3 minutes |
| Tier 2 (combat/rest/event) | 1.5–3 minutes |
| Tier 3 (combat/elite/event) | 2–4 minutes |
| Boss | 3–5 minutes |
| Outcome screen | 15–30 seconds |
| **Total** | **10–18 minutes** |

This fits the 12–20 minute target comfortably.

---

## 7. Architecture & Implementation Strategy

### Guiding Principles

1. **Extend, don't modify.** BattleSystem.ts, BattleAI.ts, and the trace engine stay untouched. All run-specific behavior goes through the adapter layer and reducer hooks.
2. **Pure functions.** RunSystem.ts remains a collection of pure state transformers. No side effects, no async.
3. **Data-driven.** Enemies, rewards, events, and map templates defined as config data. Logic interprets data, doesn't hardcode behavior.
4. **Discriminated unions.** Continue the `ActiveRunState | InactiveRunState` pattern. Extend `RunPhase` for new phases.
5. **Incremental delivery.** Each phase delivers testable, playable functionality. No big-bang integration.

### State Changes

**Extended `ActiveRunState`:**
```
interface ActiveRunState {
  active: true;
  // Existing V1 fields
  currentEncounter: number;
  phase: RunPhase;
  playerHPPercent: number;
  bonuses: RunBonuses;
  rewardsChosen: string[];
  currentEnemyId: string | null;
  encountersWon: number;

  // V2 additions
  map: RunMap;
  currentNodeId: string;
  seed: number;               // for deterministic generation
  runIndex: number;            // how many runs this player has completed (for scaling)
  mpEarnedThisRun: number;    // track MP for display
  eventHistory: string[];     // event IDs encountered this run
}
```

**Extended `RunPhase`:**
```
type RunPhase =
  | 'not_started'
  | 'map_select'          // NEW: choosing next node
  | 'encounter_preview'
  | 'in_battle'
  | 'reward_pick'
  | 'rest_node'           // NEW: at a rest node
  | 'event_choice'        // NEW: at an event node
  | 'event_result'        // NEW: event outcome display
  | 'run_victory'
  | 'run_defeat';
```

**Extended `RunBonuses`:**
```
interface RunBonuses {
  maxEnergyBonus: number;
  statBonus: number;
  utilityEffects: string[];
  // V2 additions
  energyRegenBonus: number;    // +N energy per turn
  traceRadiusBonus: number;    // multiplier on hit radius (1.0 = normal)
  comboGrowthBonus: number;    // multiplier on combo stack rate (1.0 = normal)
  regenPerTurn: number;        // HP regen at start of each turn (fraction of maxHP)
  thornsFraction: number;      // damage reflection fraction (0 = none)
}
```

**New `ScreenName` additions:**
```
| 'run_map' | 'run_rest' | 'run_event'
```

**New action types:**
```
| { type: 'SELECT_MAP_NODE'; nodeId: string }
| { type: 'REST_STABILIZE' }          // trigger stabilization trace
| { type: 'REST_SKIP' }               // take base heal only
| { type: 'EVENT_CHOOSE'; choiceId: string }
```

### New Files

```
src/types/run.ts                          — extended (RunMap, RunMapNode, etc.)
src/config/runMapConfig.ts                — map generation templates
src/config/runEnemyConfig.ts              — expanded enemy pool (split from runConfig.ts)
src/config/runRewardConfig.ts             — expanded reward pool (split from runConfig.ts)
src/config/runEventConfig.ts              — event definitions
src/engine/systems/RunMapGenerator.ts     — map generation from seed
src/engine/systems/RunPassiveEffects.ts   — enemy passive effect processing
src/screens/RunMapScreen.tsx              — map selection UI
src/screens/RunRestScreen.tsx             — rest node UI
src/screens/RunEventScreen.tsx            — event node UI
```

### Modified Files

```
src/types/run.ts                          — extend ActiveRunState, RunPhase, RunBonuses
src/types/session.ts                      — add 3 screen names
src/engine/core/ActionTypes.ts            — add 4 action types
src/engine/systems/RunSystem.ts           — add map navigation, rest, event handlers
src/engine/systems/RunBattleAdapter.ts    — apply V2 bonuses (energy regen, trace radius, etc.)
src/engine/state/engineReducer.ts         — add new case handlers, add passive effect hooks
src/config/runConfig.ts                   — refactor into split config files
src/screens/RunStartScreen.tsx            — show map preview instead of linear dots
src/screens/RunEncounterScreen.tsx        — show map position, enemy passive preview
src/screens/RunRewardScreen.tsx           — support tier-based reward display
src/screens/RunOverScreen.tsx             — add path recap, meta milestones
src/App.tsx                               — add 3 screen routes
src/services/persistence/saveMigrations.ts — migration for extended run state + meta stats
```

### What Stays Untouched

- `src/engine/systems/BattleSystem.ts` — no changes
- `src/engine/systems/BattleAI.ts` — no changes
- `src/services/game/traceEngine.ts` — no changes
- `src/components/battle/TraceEventController.tsx` — no changes (trace_focus applied via adapter)
- `src/engine/systems/MomentumSystem.ts` — not integrated in V2 (see "Do Not Build Yet")
- `src/engine/systems/PetNeedSystem.ts` — no changes (runs don't affect needs decay)

---

## 8. Step-by-Step Execution Plan

### Phase A: Config Refactor + Extended Types (Foundation)

**Goal:** Split monolithic `runConfig.ts`, extend types, add migration. No new gameplay yet — everything still works as V1.

1. Split `src/config/runConfig.ts` into `runEnemyConfig.ts` and `runRewardConfig.ts`
2. Extend `RunPhase` with new phases (`map_select`, `rest_node`, `event_choice`, `event_result`)
3. Extend `RunBonuses` with V2 fields (all default to 0/1.0)
4. Add `RunMap` and `RunMapNode` types to `src/types/run.ts`
5. Add new `ScreenName` entries
6. Add new action types to `ActionTypes.ts`
7. Add save migration for extended state
8. Update all existing imports to point at new config locations
9. **Verify:** `tsc --noEmit`, `vitest run`, `vite build` all pass. V1 run still works identically.

### Phase B: Map Generation + Map Screen

**Goal:** Runs now generate a branching map and the player can see it. Combat still works as before, but you choose which node to fight.

1. Create `RunMapGenerator.ts` with seeded generation
2. Create `RunMapScreen.tsx` — visual map with clickable nodes, tier labels, node type icons
3. Modify `startRun()` to generate map and set phase to `map_select`
4. Add `SELECT_MAP_NODE` handler — validates selection, transitions to appropriate phase
5. Modify `RunStartScreen.tsx` to show map preview
6. Modify reward/victory flow to return to `map_select` (not hardcoded next encounter)
7. Wire map screen in `App.tsx`
8. Update existing tests, add map generation tests
9. **Verify:** player can navigate a branching map. Combat nodes work. Non-combat nodes show placeholder. V1 tests still pass.

### Phase C: Expanded Enemy Pool

**Goal:** Replace 4 hardcoded enemies with the full pool. Procedural selection from pool per map node.

1. Create expanded enemy templates in `runEnemyConfig.ts` (12–16 templates)
2. Add `passiveEffect` and `passiveValue` to `RunEnemyTemplate`
3. Update `RunMapGenerator` to assign enemies from pool based on tier
4. Create `RunPassiveEffects.ts` for post-turn passive processing
5. Hook passive effects into reducer (thin layer in `EXECUTE_MOVE` / turn-end handling)
6. Update `RunBattleAdapter` to pass passive info
7. Update encounter screen to display passive effect preview
8. Add tests for passive effects and enemy pool selection
9. **Verify:** different enemies appear per run. Passives fire correctly. Existing battle balance unaffected.

### Phase D: Expanded Rewards

**Goal:** Replace fixed reward pools with tier-based procedural selection.

1. Create expanded reward pool in `runRewardConfig.ts`
2. Implement `generateRewardChoices(tier, encounterIndex, existingBonuses)` with weighted selection
3. Add new reward effects to `REWARD_EFFECTS` and `RunBonuses` processing
4. Update `RunBattleAdapter` to apply V2 bonuses (energy_regen, trace_radius, thorns, etc.)
5. Update `RunRewardScreen` to handle variable reward counts and tiers
6. Add tests for reward generation and application
7. **Verify:** rewards vary per run. New bonuses apply correctly in battle.

### Phase E: Rest Nodes

**Goal:** Implement rest node as a functional map option with optional trace interaction.

1. Create `RunRestScreen.tsx` with calm visual, HP display, "Stabilize" and "Rest" buttons
2. Add `REST_STABILIZE` and `REST_SKIP` handlers to `RunSystem.ts`
3. Wire stabilization to trigger a trace_rune event (reuse existing trace infrastructure)
4. Process trace result to determine bonus healing
5. After rest, return to `map_select` for next tier
6. Wire screen in `App.tsx`
7. Add tests for rest healing + stabilization bonus
8. **Verify:** rest nodes work end-to-end. Base heal always applies. Trace interaction is optional and functional.

### Phase F: Event Nodes

**Goal:** Implement event system with 4–6 events as meaningful map alternatives.

1. Create `runEventConfig.ts` with event definitions (start with 4 events)
2. Create `RunEventScreen.tsx` — event text, choice buttons, outcome display
3. Add `EVENT_CHOOSE` handler to `RunSystem.ts`
4. Implement event effects (HP changes, stat bonuses, reward grants, trace triggers)
5. Wire screen in `App.tsx`
6. Add tests for each event's outcomes
7. **Verify:** events appear in map. Choices produce correct outcomes. Events with trace interactions work.

### Phase G: Meta Progression + MP Integration

**Goal:** Track run statistics, award MP for math interactions, implement soft difficulty scaling.

1. Add `RunMetaStats` type to `PlayerProfile`
2. Add `runStats` field with save migration
3. Track: runsCompleted, runsWon, encountersWon, enemiesDefeated (by type)
4. Award MP during trace events within runs (hook into trace result processing)
5. Award MP during rest stabilization
6. Implement soft difficulty scaling based on `runsCompleted`
7. Update `RunOverScreen` to show MP earned and meta milestones
8. Add tests for MP accumulation and difficulty scaling
9. **Verify:** stats persist across runs. MP accumulates. Difficulty increases gently.

### Phase H: UI Polish + Lore Integration

**Goal:** Dark dungeon aesthetic, Equation Layer vocabulary, defeat/victory emotional weight.

1. Apply dark fracture zone aesthetic to all run screens (extend V1's dark purple/black palette)
2. Replace generic text with Equation Layer vocabulary throughout all screens
3. Enhance defeat screen: Auralith dimming, fracture visual, path recap, "what's next" reveal
4. Enhance victory screen: fracture closing visual, milestone unlocks, full reward breakdown
5. Add enemy passive effect indicators in battle UI (small icon/label, not battle core change)
6. Map screen visual polish: node type icons, path lines, tier labels, visited state
7. Playtest full loop 5+ times, adjust pacing and balance
8. **Verify:** full run feels cohesive. Lore language consistent. Visual identity distinct from normal battles.

---

## 9. MVP vs Full V2

### MVP (Phases A–E): "Branching Dungeon with Rest"

**Delivers:**
- Branching map (3 tiers + boss, 2–3 nodes per tier)
- Expanded enemy pool (8–12 enemies with passive effects)
- Tier-based reward system (12+ rewards across 3 tiers)
- Rest nodes with optional trace stabilization
- HP economy that forces strategic path choices

**Skips for later:**
- Event nodes (Phase F)
- Meta progression / MP integration (Phase G)
- Full UI polish / lore integration (Phase H)

**Why this is a good cut:**
- The map + rest nodes deliver on Pillar 2 (Meaningful Choice) and Pillar 1 (Persistent Pressure)
- Expanded enemies + rewards deliver replayability
- Rest nodes deliver the first "math as survival" moment outside combat
- Event nodes and meta progression are additive — they make a good run better, but the core loop works without them

### Full V2 (Phases A–H): "Complete Fracture Expedition"

**Adds on top of MVP:**
- 4–6 event nodes for narrative variety
- MP earning during runs
- Soft difficulty scaling
- Meta stat tracking
- Full lore integration and UI polish
- Defeat/victory emotional arcs

**When to build Full V2:**
- After MVP is playtested and the core map/combat/rest loop feels good
- After confirming rest node trace interaction feels natural (not forced)
- After gathering feedback on pacing (12–20 minute target)

---

## 10. Final Recommendation

**Build MVP first (Phases A–E), then evaluate.**

The biggest risk in V2 is scope creep — there are dozens of interesting features that could go into a dungeon run, and building them all at once guarantees integration pain and balance nightmares.

The MVP delivers the two most impactful changes: **branching choice** and **non-combat nodes**. These transform the run from "4 fights in a row" to "a journey with decisions." That's the core upgrade. Everything else is seasoning.

**Implementation order recommendation:**
1. Phase A (foundation) — half a day, no gameplay change, derisks everything
2. Phase B (map) — the biggest single lift, most value delivered
3. Phase C (enemies) — easy to parallelize with B, high variety payoff
4. Phase D (rewards) — depends on C for elite rewards, otherwise independent
5. Phase E (rest) — small scope, high emotional impact
6. Pause. Playtest. Adjust balance.
7. Phase F (events) — only if the core loop is solid
8. Phase G (meta) — only if players want long-term progression hooks
9. Phase H (polish) — last, because it's iterative and taste-dependent

**Total estimated scope:** MVP is ~8 new/modified files, ~600–900 lines of new code. Full V2 is ~14 new/modified files, ~1200–1800 lines. Neither is unreasonably large because V1 already established all the patterns.

---

## 11. Open Questions

1. **Map visibility:** Should the full map be visible at run start, or should tiers 2–3 be hidden until you reach them? Visible map = more strategic planning. Hidden map = more tension and surprise. Recommendation: visible, because informed choice is a design pillar.

2. **Run frequency:** Should there be any cooldown between runs? Current design says no. But unlimited back-to-back runs might make the mode feel grind-y. Consider: first 3 runs per day are "fresh" (base difficulty), subsequent runs get a small fatigue penalty? Or just leave it open. Recommendation: no cooldown for V2.

3. **Pet needs during runs:** Do needs decay while in a run? Currently runs don't interact with PetNeedSystem at all. If a run takes 15 minutes, that's 15 minutes of no feeding/cleaning. Recommendation: pause needs decay during active runs. Simple to implement (check `run.active` in need tick).

4. **Boss pool size:** V1 has 1 boss (Void Subtrak). V2 plans 2–3. Is this enough variety? Could rotate bosses weekly for a "weekly fracture" feel. Recommendation: start with 2, add more as content.

5. **Event node math interactions:** The Fractured Mirror and Resonance Well events include trace events. Is this too much math density if the player also just fought a combat with trace events? Recommendation: fine, because events are optional and the player chose to go to the event node.

6. **Momentum Board integration:** Should the Momentum Board appear anywhere in dungeon runs? It's a complete mini-game with its own pacing. Recommendation: not in V2. It's too self-contained to embed naturally. V3 could explore Momentum as a "tactical encounter" node type alongside regular combat.

---

## 12. Recommended Build Order

```
Phase A: Foundation         ←── START HERE (no gameplay change, pure refactor)
   ↓
Phase B: Map Generation     ←── biggest feature, unlock branching
   ↓
Phase C: Enemy Pool         ←── can start in parallel with B
   ↓
Phase D: Rewards            ←── depends on C for elite tiers
   ↓
Phase E: Rest Nodes         ←── first non-combat content
   ↓
   ══════ MVP CHECKPOINT ══════
   ↓
Phase F: Events             ←── narrative variety
   ↓
Phase G: Meta Progression   ←── long-term hooks
   ↓
Phase H: Polish             ←── iterative, last
```

**Parallelization opportunities:**
- Phases B and C can be developed in parallel (map structure is independent of enemy content)
- Phase D reward config can be drafted alongside C
- Phase H polish work can be done incrementally after any phase

**Dependencies:**
- B → E (rest nodes are map nodes, need map system)
- B → F (event nodes are map nodes, need map system)
- C → D (elite rewards reference elite enemies)
- G depends on trace event hooks, which exist but need MP integration points

---

## 13. Do Not Build Yet

These features are interesting but should NOT be in V2. They are either too complex, insufficiently tested in concept, or dependent on systems that don't exist yet.

### Branching Path Maps (Complex)
V2 uses a simple "choose one node per tier" structure. True branching (where choosing node A opens paths X/Y but choosing node B opens paths Y/Z) adds combinatorial complexity to generation, testing, and balance. Wait until the simple map proves the concept.

### Run-Specific Currency
A "fracture shards" or "void crystals" currency spent within a run. This adds inventory management and a new economy that needs balancing independently. The reward-pick system already serves this purpose more simply.

### Momentum Board Integration
The Momentum Board (`MomentumSystem.ts`) is a complete standalone mini-game with its own 5×5 grid, piece movement, combat resolution, Flash Moments, and Clutch mechanics. Embedding it as a dungeon encounter type requires solving: how does Momentum victory/defeat map to run HP changes? How do run bonuses affect Momentum pieces? These are non-trivial design problems that need their own spec.

### Full Enemy AI Archetypes
True AI behavior variation (enemies that prioritize healing when low, that save energy for burst turns, that target the player's weakest stat) requires modifying `BattleAI.ts`, which is the riskiest change in the codebase. V2's approach of stat distribution + passive effects achieves ~80% of the gameplay variety at ~20% of the risk.

### Seeded Daily Runs
A fixed daily run seed where all players face the same map + enemies. Cool feature, but requires: deterministic PRNG (not hard), shared leaderboard (hard), and anti-cheat considerations. Not V2 scope.

### Run Modifiers / Mutators
"This run: all enemies have +20% HP" or "This run: trace events have half the time limit." These add variety but need a UI for displaying active modifiers, balance testing per modifier, and modifier generation logic. Better suited for V3 when the base loop is proven.

### Permanent Stat Unlocks
"Complete 10 runs to permanently unlock +5 base energy." This creates a progression treadmill that warps balance — veteran players become trivially strong in runs, new players feel underpowered. The soft difficulty scaling (Phase G) handles the "runs get too easy" problem without introducing permanent power inflation.

### Multi-Pet Runs
Bringing multiple pets into a run and swapping between encounters. Requires: team management UI, per-pet HP tracking, team-based reward distribution. This is a full feature spec on its own.

---

*End of plan. This document should be reviewed and approved before any implementation begins.*
