/**
 * Power Forge — persistent pet buffs bought with MP (math points).
 * Every upgrade has tiered levels; higher tiers cost more MP.
 *
 * Applied in BattleSystem via `applyPowerForgeToBattle`.
 */

export type PowerForgeUpgradeId =
  | 'forge_atk'
  | 'forge_def'
  | 'forge_hp'
  | 'forge_math_reward';

export interface PowerForgeUpgrade {
  id: PowerForgeUpgradeId;
  label: string;
  description: string;
  icon: string;
  /** MP cost per level, indexed by current level. `costs[0]` = price of level 1. */
  costs: number[];
  /** Bonus granted at level N (indexed from 1). `effectPerLevel * level`. */
  effectPerLevel: number;
}

export const POWER_FORGE_UPGRADES: PowerForgeUpgrade[] = [
  {
    id: 'forge_atk',
    label: 'Honed Claws',
    description: '+1 ATK per level in battle.',
    icon: '⚔️',
    costs: [10, 30, 80, 200, 500],
    effectPerLevel: 1,
  },
  {
    id: 'forge_def',
    label: 'Iron Hide',
    description: '+1 DEF per level in battle.',
    icon: '🛡️',
    costs: [10, 30, 80, 200, 500],
    effectPerLevel: 1,
  },
  {
    id: 'forge_hp',
    label: 'Hearty Spirit',
    description: '+5 max HP per level in battle.',
    icon: '❤️',
    costs: [15, 40, 100, 250, 600],
    effectPerLevel: 5,
  },
  {
    id: 'forge_math_reward',
    label: 'Sharp Focus',
    description: '+10% math reward per level.',
    icon: '🧠',
    costs: [20, 60, 150],
    effectPerLevel: 10,
  },
];

export const getForgeUpgrade = (id: PowerForgeUpgradeId): PowerForgeUpgrade | undefined =>
  POWER_FORGE_UPGRADES.find((u) => u.id === id);

/** Current level N → next-level cost, or null if maxed. */
export const nextForgeCost = (upgrade: PowerForgeUpgrade, currentLevel: number): number | null =>
  currentLevel < upgrade.costs.length ? upgrade.costs[currentLevel] : null;

export const forgeBonus = (upgrade: PowerForgeUpgrade, currentLevel: number): number =>
  upgrade.effectPerLevel * currentLevel;

export type PowerForgeState = Partial<Record<PowerForgeUpgradeId, number>>;

export const computeForgeBonuses = (forge: PowerForgeState | undefined): {
  atk: number;
  def: number;
  hp: number;
  mathRewardMult: number;
} => {
  const lvl = (id: PowerForgeUpgradeId) => forge?.[id] ?? 0;
  return {
    atk: forgeBonus(POWER_FORGE_UPGRADES[0], lvl('forge_atk')),
    def: forgeBonus(POWER_FORGE_UPGRADES[1], lvl('forge_def')),
    hp: forgeBonus(POWER_FORGE_UPGRADES[2], lvl('forge_hp')),
    mathRewardMult: 1 + forgeBonus(POWER_FORGE_UPGRADES[3], lvl('forge_math_reward')) / 100,
  };
};
