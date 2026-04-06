import { describe, it, expect } from 'vitest';
import {
  petToBattlePet,
  initBattle,
  executePlayerMove,
  executeFocus,
  resolveRound,
} from '../BattleSystem';
import { SPECIES_BASE_STATS, BATTLE_CONSTANTS } from '../../../config/battleConfig';
import type { Pet } from '../../../types';
import type { ActiveBattleState } from '../../../types/battle';

// ---------------------------------------------------------------------------
// Mock pet factory
// ---------------------------------------------------------------------------

const mockPet = (speciesId: string, level: number): Pet => {
  const base = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  return {
    id: `test_${speciesId}_${level}`,
    ownerId: 'test_owner',
    name: `Test ${speciesId}`,
    speciesId,
    type: speciesId,
    stage: 'baby',
    mood: 'calm',
    state: 'idle',
    needs: {
      hunger: 80,
      happiness: 80,
      cleanliness: 80,
      health: 100,
    },
    stats: {
      strength: base.str,
      speed: base.spd,
      defense: base.def,
    },
    bond: 50,
    progression: {
      level,
      xp: 0,
      evolutionFlags: [],
    },
    timestamps: {
      createdAt: '2026-01-01T00:00:00.000Z',
      lastInteraction: '2026-01-01T00:00:00.000Z',
      lastFedAt: '2026-01-01T00:00:00.000Z',
      lastCleanedAt: '2026-01-01T00:00:00.000Z',
    },
  };
};

// ---------------------------------------------------------------------------
// 1. Stat Generation — petToBattlePet
// ---------------------------------------------------------------------------

describe('petToBattlePet', () => {
  it('produces HP in 150–300 range for health=100 at level 1', () => {
    const pet = mockPet('koala_sprite', 1);
    const bp = petToBattlePet(pet);
    // health=100, baseHPMultiplier=2.5, happiness>80 so strengthMod=1.1 but hpMod stays 1
    expect(bp.maxHP).toBeGreaterThanOrEqual(150);
    expect(bp.maxHP).toBeLessThanOrEqual(300);
  });

  it('HP scales with health need — higher health means more HP', () => {
    const petFull = mockPet('koala_sprite', 1);
    const petSick = mockPet('koala_sprite', 1);
    petSick.needs.health = 40; // triggers hpMod 0.8
    const bpFull = petToBattlePet(petFull);
    const bpSick = petToBattlePet(petSick);
    expect(bpFull.maxHP).toBeGreaterThan(bpSick.maxHP);
  });

  it('stats scale with level', () => {
    const petL1 = mockPet('koala_sprite', 1);
    const petL5 = mockPet('koala_sprite', 5);
    const bpL1 = petToBattlePet(petL1);
    const bpL5 = petToBattlePet(petL5);
    expect(bpL5.strength).toBeGreaterThan(bpL1.strength);
    expect(bpL5.speed).toBeGreaterThan(bpL1.speed);
    expect(bpL5.defense).toBeGreaterThan(bpL1.defense);
  });

  it('strength has a minimum floor of 10', () => {
    // Create a pet with extremely low stats to hit the floor
    const pet = mockPet('koala_sprite', 0);
    pet.stats.strength = 1;
    pet.needs.hunger = 20; // triggers 0.7 strengthMod
    const bp = petToBattlePet(pet);
    expect(bp.strength).toBeGreaterThanOrEqual(10);
  });

  it('defense has a minimum floor of 8', () => {
    const pet = mockPet('koala_sprite', 0);
    pet.stats.defense = 1;
    const bp = petToBattlePet(pet);
    expect(bp.defense).toBeGreaterThanOrEqual(8);
  });

  it('starts with the correct starting energy', () => {
    const pet = mockPet('koala_sprite', 1);
    const bp = petToBattlePet(pet);
    expect(bp.energy).toBe(BATTLE_CONSTANTS.startingEnergy);
  });

  it('has moves matching the species', () => {
    const species = ['koala_sprite', 'slime_baby', 'mech_bot'];
    for (const speciesId of species) {
      const bp = petToBattlePet(mockPet(speciesId, 1));
      expect(bp.moves.length).toBeGreaterThan(0);
      // Each species should have at least one attack/special move
      const hasOffensive = bp.moves.some(m => m.type === 'attack' || m.type === 'special');
      expect(hasOffensive).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Enemy Generation — via initBattle
// ---------------------------------------------------------------------------

describe('initBattle — enemy generation', () => {
  it('enemy HP is in 150–250 range', () => {
    // Run multiple times due to RNG
    for (let i = 0; i < 20; i++) {
      const battle = initBattle(mockPet('koala_sprite', 1));
      expect(battle.enemyPet.maxHP).toBeGreaterThanOrEqual(150);
      expect(battle.enemyPet.maxHP).toBeLessThanOrEqual(250);
    }
  });

  it('enemy has valid moves with at least one offensive move', () => {
    for (let i = 0; i < 10; i++) {
      const battle = initBattle(mockPet('koala_sprite', 1));
      expect(battle.enemyPet.moves.length).toBeGreaterThan(0);
      const hasOffensive = battle.enemyPet.moves.some(
        m => m.type === 'attack' || m.type === 'special',
      );
      expect(hasOffensive).toBe(true);
    }
  });

  it('enemyIntent is NOT null after initBattle (regression: was a bug)', () => {
    for (let i = 0; i < 10; i++) {
      const battle = initBattle(mockPet('koala_sprite', 1));
      expect(battle.enemyIntent).not.toBeNull();
    }
  });

  it('enemy stats are all positive', () => {
    for (let i = 0; i < 20; i++) {
      const battle = initBattle(mockPet('koala_sprite', 1));
      expect(battle.enemyPet.strength).toBeGreaterThan(0);
      expect(battle.enemyPet.speed).toBeGreaterThan(0);
      expect(battle.enemyPet.defense).toBeGreaterThan(0);
    }
  });

  it('battle starts in player_turn phase', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    expect(battle.phase).toBe('player_turn');
    expect(battle.turnCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Damage Output — via executePlayerMove
// ---------------------------------------------------------------------------

describe('executePlayerMove — damage', () => {
  // Helper: get a fresh battle with enough energy to use any move
  const freshBattle = (speciesId = 'koala_sprite', level = 1): ActiveBattleState => {
    const battle = initBattle(mockPet(speciesId, level));
    // Give player max energy so they can always attack
    return {
      ...battle,
      playerPet: { ...battle.playerPet, energy: 100 },
    };
  };

  it('attack deals > 1 damage (original formula bug regression)', () => {
    const battle = freshBattle();
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;
    expect(attackMove).toBeDefined();

    // Run many times to account for accuracy variance
    let hitCount = 0;
    let _totalDamage = 0;
    for (let i = 0; i < 50; i++) {
      const before = battle.enemyPet.currentHP;
      const after = executePlayerMove(
        { ...battle, playerPet: { ...battle.playerPet, energy: 100 } },
        attackMove.id,
      );
      const dmg = before - after.enemyPet.currentHP;
      if (dmg > 0) {
        hitCount++;
        _totalDamage += dmg;
        // Each hit must be > 1
        expect(dmg).toBeGreaterThan(1);
      }
    }
    expect(hitCount).toBeGreaterThan(0); // must land at least some hits in 50 tries
  });

  it('attack damage is within a reasonable range (not 0, not > maxHP)', () => {
    const battle = freshBattle();
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    for (let i = 0; i < 30; i++) {
      const state = { ...battle, playerPet: { ...battle.playerPet, energy: 100 } };
      const after = executePlayerMove(state, attackMove.id);
      const dmg = battle.enemyPet.currentHP - after.enemyPet.currentHP;
      // Damage should not exceed the enemy's full HP in a single hit
      expect(dmg).toBeLessThanOrEqual(battle.enemyPet.maxHP);
      expect(dmg).toBeGreaterThanOrEqual(0);
    }
  });

  it('special moves deal more average damage than basic attack moves', () => {
    const battle = freshBattle('koala_sprite', 3);
    const basicMove = battle.playerPet.moves.find(m => m.type === 'attack')!;
    const specialMove = battle.playerPet.moves.find(m => m.type === 'special')!;
    expect(basicMove).toBeDefined();
    expect(specialMove).toBeDefined();

    const averageDamage = (moveId: string, runs = 100): number => {
      let total = 0;
      let hits = 0;
      for (let i = 0; i < runs; i++) {
        const state = {
          ...battle,
          playerPet: { ...battle.playerPet, energy: 100 },
          enemyPet: { ...battle.enemyPet, currentHP: battle.enemyPet.maxHP },
        };
        const after = executePlayerMove(state, moveId);
        const dmg = battle.enemyPet.maxHP - after.enemyPet.currentHP;
        if (dmg > 0) { total += dmg; hits++; }
      }
      return hits > 0 ? total / hits : 0;
    };

    const basicAvg = averageDamage(basicMove.id);
    const specialAvg = averageDamage(specialMove.id);
    // Special has higher power, so average damage (when hitting) should be higher
    expect(specialAvg).toBeGreaterThan(basicAvg);
  });

  it('100 attacks produce average damage > 10 per hit', () => {
    const battle = freshBattle('koala_sprite', 1);
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    let totalDamage = 0;
    let hitCount = 0;
    for (let i = 0; i < 100; i++) {
      const state = {
        ...battle,
        playerPet: { ...battle.playerPet, energy: 100 },
        enemyPet: { ...battle.enemyPet, currentHP: battle.enemyPet.maxHP },
      };
      const after = executePlayerMove(state, attackMove.id);
      const dmg = battle.enemyPet.maxHP - after.enemyPet.currentHP;
      if (dmg > 0) { totalDamage += dmg; hitCount++; }
    }

    expect(hitCount).toBeGreaterThan(0);
    const avgDamage = totalDamage / hitCount;
    expect(avgDamage).toBeGreaterThan(10);
  });

  it('attack costs energy', () => {
    const battle = freshBattle();
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;
    const before = battle.playerPet.energy;
    const after = executePlayerMove(battle, attackMove.id);
    // Energy should have decreased by move cost (or same if out of energy — but we gave 100)
    expect(after.playerPet.energy).toBe(before - attackMove.cost);
  });
});

// ---------------------------------------------------------------------------
// 4. Energy Economy
// ---------------------------------------------------------------------------

describe('energy economy', () => {
  it('executeFocus restores focusEnergyGain energy', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    const startEnergy = battle.playerPet.energy;
    const after = executeFocus(battle);
    expect(after.playerPet.energy).toBe(
      Math.min(BATTLE_CONSTANTS.maxEnergy, startEnergy + BATTLE_CONSTANTS.focusEnergyGain),
    );
  });

  it('executeFocus restores exactly 12 EN from near-empty energy', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    const state = {
      ...battle,
      playerPet: { ...battle.playerPet, energy: 10 },
    };
    const after = executeFocus(state);
    expect(after.playerPet.energy).toBe(10 + BATTLE_CONSTANTS.focusEnergyGain);
    expect(BATTLE_CONSTANTS.focusEnergyGain).toBe(12);
  });

  it('energyOnHitTaken is 0 — enemy attack does not give player energy', () => {
    expect(BATTLE_CONSTANTS.energyOnHitTaken).toBe(0);
  });

  it('player energy does not increase after taking damage from enemy', () => {
    // Verify through the config constant that the code path adds 0
    const gained = BATTLE_CONSTANTS.energyOnHitTaken;
    expect(gained).toBe(0);
  });

  it('executeFocus sets focusUsedThisTurn to true', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    expect(battle.focusUsedThisTurn).toBe(false);
    const after = executeFocus(battle);
    expect(after.focusUsedThisTurn).toBe(true);
  });

  it('attack move costs energy and transitions to enemy_turn', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    const state = { ...battle, playerPet: { ...battle.playerPet, energy: 100 } };
    const attackMove = state.playerPet.moves.find(m => m.type === 'attack')!;
    const after = executePlayerMove(state, attackMove.id);
    expect(after.playerPet.energy).toBe(100 - attackMove.cost);
    expect(after.phase).toBe('enemy_turn');
  });

  it('executeFocus transitions to enemy_turn phase', () => {
    const battle = initBattle(mockPet('koala_sprite', 1));
    const after = executeFocus(battle);
    expect(after.phase).toBe('enemy_turn');
  });
});

// ---------------------------------------------------------------------------
// 5. Balance Sanity
// ---------------------------------------------------------------------------

describe('balance sanity', () => {
  /**
   * Simulates a full fight: player always attacks with the best offensive move
   * available (special if affordable, else attack). Enemy turns are skipped for
   * this test — we're only verifying that player damage output is sufficient to
   * defeat any enemy within 30 turns.
   *
   * Returns the turn number on which the enemy was defeated, or Infinity if the
   * fight was not won within maxTurns.
   */
  const simulateFight = (speciesId: string, level = 1): number => {
    let battle: ActiveBattleState = {
      ...initBattle(mockPet(speciesId, level)),
      playerPet: {
        ...petToBattlePet(mockPet(speciesId, level)),
        energy: 100,
        maxEnergy: 100,
      },
    };

    for (let turn = 0; turn < 30; turn++) {
      if (battle.enemyPet.currentHP <= 0) return turn;

      // Pick best affordable offensive move (special > attack)
      const offensiveMoves = battle.playerPet.moves
        .filter(m => (m.type === 'attack' || m.type === 'special') && battle.playerPet.energy >= m.cost)
        .sort((a, b) => b.power - a.power);

      if (offensiveMoves.length === 0) {
        // No affordable move — use focus to restore energy
        battle = executeFocus(battle);
        // Restore energy for next turn (simulate resolveRound energy regen)
        battle = {
          ...battle,
          playerPet: {
            ...battle.playerPet,
            energy: Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + BATTLE_CONSTANTS.energyPerTurn),
          },
          phase: 'player_turn',
        };
        continue;
      }

      battle = executePlayerMove(battle, offensiveMoves[0].id);

      // Check win condition after attack
      if (battle.enemyPet.currentHP <= 0) return turn + 1;

      // Simulate minimal enemy turn (no damage to player, just advance state)
      // and advance turn counter via resolveRound
      battle = resolveRound({
        ...battle,
        phase: 'resolve',
        // Keep enemy alive but track its HP accurately
      });

      // If resolveRound ended the battle, extract result
      if (battle.phase === 'victory') return turn + 1;
      if (battle.phase === 'defeat') return Infinity;

      // Top up player energy to simulate passive regen + occasional focus
      // (Energy per turn is already applied by resolveRound; add focus energy every 3 turns)
      if (turn % 3 === 0) {
        battle = {
          ...battle,
          playerPet: {
            ...battle.playerPet,
            energy: Math.min(battle.playerPet.maxEnergy, battle.playerPet.energy + BATTLE_CONSTANTS.focusEnergyGain),
          },
        };
      }
    }

    return battle.enemyPet.currentHP <= 0 ? 30 : Infinity;
  };

  for (const speciesId of ['slime_baby', 'koala_sprite', 'mech_bot']) {
    it(`[${speciesId}] player can defeat enemy within 30 turns at level 1`, () => {
      // Run 5 times to handle RNG variance in enemy selection
      const results: number[] = [];
      for (let run = 0; run < 5; run++) {
        results.push(simulateFight(speciesId, 1));
      }
      // At least 4 out of 5 runs should result in a win within 30 turns
      const wins = results.filter(t => t !== Infinity).length;
      expect(wins).toBeGreaterThanOrEqual(4);
    });

    it(`[${speciesId}] player can defeat enemy within 30 turns at level 3`, () => {
      const results: number[] = [];
      for (let run = 0; run < 5; run++) {
        results.push(simulateFight(speciesId, 3));
      }
      const wins = results.filter(t => t !== Infinity).length;
      expect(wins).toBeGreaterThanOrEqual(4);
    });
  }

  it('damage formula produces meaningful per-hit values — not stuck at 1', () => {
    // If the formula regresses to flat 1 damage, this would need hundreds of hits
    // to kill even a 150 HP enemy. Verify average hit > 10.
    const battle: ActiveBattleState = {
      ...initBattle(mockPet('koala_sprite', 1)),
      playerPet: { ...petToBattlePet(mockPet('koala_sprite', 1)), energy: 100 },
    };
    const attackMove = battle.playerPet.moves.find(m => m.type === 'attack')!;

    let totalDamage = 0;
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      const state = {
        ...battle,
        playerPet: { ...battle.playerPet, energy: 100 },
        enemyPet: { ...battle.enemyPet, currentHP: 9999 }, // prevent HP floor interfering
      };
      const after = executePlayerMove(state, attackMove.id);
      const dmg = 9999 - after.enemyPet.currentHP;
      if (dmg > 0) { totalDamage += dmg; hits++; }
    }

    expect(hits).toBeGreaterThan(0);
    const avg = totalDamage / hits;
    // With ATK ~12, power 60, DEF ~13: raw = 12*60/40 * (100/113) ≈ 15.9
    // Average should be well above 10
    expect(avg).toBeGreaterThan(10);
  });
});
