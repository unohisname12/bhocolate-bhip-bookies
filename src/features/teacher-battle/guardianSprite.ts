import type { Result } from './model';

export const GUARDIAN_ANIMS = ['idle','attack','special','defend','hurt','heal','math','victory','defeat'] as const;
export type GuardianAnim = typeof GUARDIAN_ANIMS[number];
export const GUARDIAN_FRAME = 256;
export const GUARDIAN_FRAMES = 8;
export const guardianSheet = (anim: GuardianAnim) => `/assets/teacher-guardians/chalkstone-griffin-${anim}.png`;
export const GUARDIAN_STILL = '/assets/teacher-guardians/chalkstone-griffin-sprite.png';
export const FRAME_MS: Record<GuardianAnim, number> = { idle: 180, attack: 110, special: 130, defend: 120, hurt: 100, heal: 140, math: 160, victory: 150, defeat: 170 };

/** What the guardian plays: `once` animations run in order, then `rest` loops (or holds its last frame). */
export interface GuardianPlan { once: GuardianAnim[]; rest: GuardianAnim; holdLast: boolean }

// A full teacher team striking deals 30; half of that reads as a "big" hit worth the special.
const SPECIAL_DAMAGE = 15;

export function guardianPlan(phase: string, health: { teachers: number; students: number }, result?: Result): GuardianPlan {
  if (phase === 'finished') {
    const won = health.teachers >= health.students;
    return { once: [], rest: won ? 'victory' : 'defeat', holdLast: true };
  }
  if (phase === 'question') return { once: [], rest: 'math', holdLast: false };
  if (phase === 'result' && result) {
    const once: GuardianAnim[] = [];
    if (result.damage.students >= SPECIAL_DAMAGE) once.push('special');
    else if (result.damage.students > 0) once.push('attack');
    if (result.shield.teachers > 0) once.push('defend');
    if (result.healing.teachers > 0) once.push('heal');
    if (result.damage.teachers > 0) once.push('hurt');
    return { once, rest: 'idle', holdLast: false };
  }
  return { once: [], rest: 'idle', holdLast: false };
}
