import { describe, it, expect } from 'vitest';
import { buildRunPlayerPet, buildRunEnemy } from '../RunBattleAdapter';
import { SPECIES_BASE_STATS } from '../../../config/battleConfig';
import { RUN_ENEMIES } from '../../../config/runConfig';
import type { Pet } from '../../../types';
import { createEmptyBonuses, type RunBonuses } from '../../../types/run';

const mockPet = (speciesId = 'koala_sprite', level = 5): Pet => {
  const base = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  return {
    id: `test_${speciesId}`,
    ownerId: 'test_owner',
    name: `Test ${speciesId}`,
    speciesId,
    type: speciesId,
    stage: 'baby',
    mood: 'calm',
    state: 'idle',
    needs: { hunger: 80, happiness: 80, cleanliness: 80, health: 100 },
    stats: { strength: base.str, speed: base.spd, defense: base.def },
    bond: 50,
    progression: { level, xp: 0, evolutionFlags: [] },
    timestamps: {
      createdAt: '2026-01-01T00:00:00.000Z',
      lastInteraction: '2026-01-01T00:00:00.000Z',
      lastFedAt: '2026-01-01T00:00:00.000Z',
      lastCleanedAt: '2026-01-01T00:00:00.000Z',
    },
  } as Pet;
};

const emptyBonuses: RunBonuses = createEmptyBonuses();

describe('buildRunPlayerPet', () => {
  it('applies maxEnergyBonus', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, maxEnergyBonus: 10 };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.maxEnergy).toBe(base.maxEnergy + 10);
  });

  it('applies statBonus to strength and defense', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, statBonus: 5 };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.strength).toBe(base.strength + 5);
    expect(result.defense).toBe(base.defense + 5);
  });

  it('sets HP from hpPercent', () => {
    const pet = mockPet();
    const full = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    const half = buildRunPlayerPet(pet, emptyBonuses, 0.5);
    expect(half.currentHP).toBe(Math.floor(full.maxHP * 0.5));
  });

  it('clamps HP to at least 1', () => {
    const pet = mockPet();
    const result = buildRunPlayerPet(pet, emptyBonuses, 0.001);
    expect(result.currentHP).toBeGreaterThanOrEqual(1);
  });

  it('adds defense buff for shield_start utility', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, utilityEffects: ['shield_start'] };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].stat).toBe('defense');
  });

  it('has no buffs without shield_start', () => {
    const pet = mockPet();
    const result = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.buffs).toHaveLength(0);
  });
});

describe('buildRunEnemy', () => {
  it('applies template stat scaling', () => {
    const template = RUN_ENEMIES[0]; // wild_slime, statScale 0.85
    const enemy = buildRunEnemy(template, 5);
    expect(enemy.name).toBe('Wild Slime');
    expect(enemy.strength).toBeGreaterThan(0);
    expect(enemy.defense).toBeGreaterThan(0);
  });

  it('applies HP scaling', () => {
    const normal = RUN_ENEMIES[1]; // guard_koala, hpScale 1.0
    const boss = RUN_ENEMIES[3]; // void_subtrak, hpScale 1.4
    const normalEnemy = buildRunEnemy(normal, 5);
    const bossEnemy = buildRunEnemy(boss, 5);
    // Boss should have notably more HP than normal
    expect(bossEnemy.maxHP).toBeGreaterThan(normalEnemy.maxHP);
  });

  it('aggressive enemies have higher strength, lower defense', () => {
    // Compare aggressive vs defensive at same base level
    const aggressive = RUN_ENEMIES[0]; // aggressive
    const defensive = RUN_ENEMIES[1]; // defensive
    const aggEnemy = buildRunEnemy(aggressive, 5);
    const defEnemy = buildRunEnemy(defensive, 5);
    // Aggressive should lean toward higher strength relative to defense
    const aggRatio = aggEnemy.strength / aggEnemy.defense;
    const defRatio = defEnemy.strength / defEnemy.defense;
    expect(aggRatio).toBeGreaterThan(defRatio);
  });

  it('volatile fracture boosts STR and lowers HP', () => {
    const template = RUN_ENEMIES[0];
    const normal = buildRunEnemy(template, 5);
    const volatile = buildRunEnemy(template, 5, 'volatile');
    expect(volatile.strength).toBeGreaterThan(normal.strength);
    expect(volatile.maxHP).toBeLessThan(normal.maxHP);
  });

  it('resilient fracture boosts HP and lowers STR', () => {
    const template = RUN_ENEMIES[0];
    const normal = buildRunEnemy(template, 5);
    const resilient = buildRunEnemy(template, 5, 'resilient');
    expect(resilient.maxHP).toBeGreaterThan(normal.maxHP);
    expect(resilient.strength).toBeLessThan(normal.strength);
  });

  it('instability boosts enemy STR at threshold', () => {
    const template = RUN_ENEMIES[0];
    // Use higher level so 5%/10% multipliers survive floor rounding
    const calm = buildRunEnemy(template, 20, 'volatile', 0);
    const mild = buildRunEnemy(template, 20, 'volatile', 3);
    const severe = buildRunEnemy(template, 20, 'volatile', 5);
    expect(mild.strength).toBeGreaterThanOrEqual(calm.strength);
    expect(severe.strength).toBeGreaterThan(calm.strength);
  });
});

describe('buildRunPlayerPet (V2 bonuses)', () => {
  it('applies glass cannon STR boost', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, glassCannon: true };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.strength).toBeGreaterThan(base.strength);
  });

  it('applies desperate power STR based on missing HP', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, desperatePower: true };
    const full = buildRunPlayerPet(pet, bonuses, 1.0);
    const half = buildRunPlayerPet(pet, bonuses, 0.5);
    // At 50% HP, missing = 50% → bonus = floor(50/5) = 10 STR
    expect(half.strength).toBeGreaterThan(full.strength);
  });

  it('applies fortify rest DEF buff', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, nextFightDefenseBuff: 2 };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.buffs.length).toBe(base.buffs.length + 1);
    expect(result.buffs.some(b => b.stat === 'defense' && b.turnsRemaining === 2)).toBe(true);
  });

  it('applies energy bonus from fortify rest', () => {
    const pet = mockPet();
    const bonuses: RunBonuses = { ...emptyBonuses, nextFightEnergyBonus: 10 };
    const result = buildRunPlayerPet(pet, bonuses, 1.0);
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.energy).toBe(base.energy + 10);
  });

  it('draining fracture reduces starting energy', () => {
    const pet = mockPet();
    const result = buildRunPlayerPet(pet, emptyBonuses, 1.0, 'draining');
    const base = buildRunPlayerPet(pet, emptyBonuses, 1.0);
    expect(result.energy).toBeLessThan(base.energy);
  });
});
