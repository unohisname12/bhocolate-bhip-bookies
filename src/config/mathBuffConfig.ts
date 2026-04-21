import type { MathBuffs } from '../types/player';

/**
 * Math prep → battle buffs.
 *
 * Each correct answer adds these amounts to the player's math-buff pool.
 * On battle start, the whole pool is applied to the player's battle pet
 * (ATK/DEF boosts + bonus max/current HP) and then reset to zero.
 */
export const MATH_BUFF_PER_CORRECT: MathBuffs = {
  atk: 1,
  def: 1,
  hp: 2,
};

/** Caps so the pool can't snowball across many sessions. */
export const MATH_BUFF_CAP: MathBuffs = {
  atk: 30,
  def: 30,
  hp: 60,
};

/** Zero pool — used on battle start to reset and in initial state. */
export const EMPTY_MATH_BUFFS: MathBuffs = { atk: 0, def: 0, hp: 0 };

export function addMathBuffs(a: MathBuffs, b: MathBuffs): MathBuffs {
  return {
    atk: Math.min(MATH_BUFF_CAP.atk, a.atk + b.atk),
    def: Math.min(MATH_BUFF_CAP.def, a.def + b.def),
    hp: Math.min(MATH_BUFF_CAP.hp, a.hp + b.hp),
  };
}

export function hasAnyMathBuffs(b: MathBuffs): boolean {
  return b.atk > 0 || b.def > 0 || b.hp > 0;
}
