import type { Pet } from '../../types/pet';
import type { CareTask, PetGrowth } from '../../types/growth';
import { DAY_MS } from '../../config/companionConfig';

export const careDate = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export function getGrowth(pet: Pet, now = Date.now()): PetGrowth {
  const born = Date.parse(pet.timestamps.createdAt);
  return pet.growth ?? { startedAt: Number.isFinite(born) ? Math.min(born, now) : now, stageStartedAt: now, careDays: [] };
}
export function recordCare(pet: Pet, task: CareTask, now = Date.now()): Pet {
  if (pet.state === 'dead') return pet;
  const growth = getGrowth(pet, now), day = careDate(now);
  const existing = growth.careDays.find(d => d.day === day);
  if (existing?.tasks.includes(task)) return pet.growth ? pet : { ...pet, growth };
  const careDays = existing
    ? growth.careDays.map(d => d.day === day ? { ...d, tasks: [...d.tasks, task] } : d)
    : [...growth.careDays, { day, tasks: [task] }];
  return { ...pet, growth: { ...growth, careDays } };
}
export function careProgress(pet: Pet, now = Date.now()) {
  const growth = getGrowth(pet, now);
  const valid = growth.careDays.filter(d => d.day <= careDate(now) && ['feed', 'clean', 'play'].every(task => d.tasks.includes(task as CareTask)));
  return { days: new Set(valid.map(d => d.day)).size, ageDays: Math.max(0, (now - growth.startedAt) / DAY_MS),
    stageDays: Math.max(0, (now - growth.stageStartedAt) / DAY_MS),
    today: growth.careDays.find(d => d.day === careDate(now))?.tasks ?? [] };
}
