import { COMPANIONS, isCompanion, type CompanionId } from '../../config/companionConfig';
import { ADVENTURE_STYLES, DISCOVERY_DAYS, DISCOVERY_QUIZ, STYLE_KEYS } from '../../config/discoveryConfig';
import type { EggDiscovery } from '../../types/discovery';
import { careDate } from './petGrowth';

export function createEggDiscovery(candidates = Object.keys(COMPANIONS) as CompanionId[], now = Date.now()): EggDiscovery {
  return { matchingVersion: 2, status: 'collecting', startedAt: now, answers: DISCOVERY_QUIZ.map(() => -1), stamps: [], candidates,
    tieBreak: Math.random(), companion: null, mission: null };
}
export const quizComplete = (d: EggDiscovery) => d.answers.length === DISCOVERY_QUIZ.length && d.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 4);
export const discoveryDays = (d: EggDiscovery, now = Date.now()) => new Set(d.stamps.filter(s => s.day <= careDate(now)).map(s => s.day)).size + (d.bonusDays ?? 0);
export const discoveryReady = (d: EggDiscovery, now = Date.now()) => d.status === 'collecting' && discoveryDays(d, now) >= DISCOVERY_DAYS;
export function discoveryScores(d: EggDiscovery) {
  const scores = Object.fromEntries(Object.keys(COMPANIONS).map(id => [id, 0])) as Record<CompanionId, number>;
  const styles = [0, 0, 0, 0];
  for (const answer of d.answers) if (answer >= 0 && answer < 4) styles[answer] += 1;
  for (const stamp of d.stamps) styles[STYLE_KEYS.indexOf(stamp.style)] += 2;
  if (d.matchingVersion !== 2) {
    STYLE_KEYS.forEach((style, i) => { scores[ADVENTURE_STYLES[style].companion] = styles[i]; });
  } else {
    // Pure interests and mixed interests are equally valid. No grades or speed.
    const affinity: Record<CompanionId, number[]> = {
      ember_fox: [5,0,0,0], moss_turtle: [0,5,0,0], koala_sprite: [0,0,5,0], luna_owl: [0,0,0,5],
      clover_rabbit: [3,0,3,0], ripple_otter: [0,3,3,0], nova_axolotl: [0,0,3,3],
      bramble_hedgehog: [0,3,0,3], zephyr_dragon: [3,0,0,3], subtrak: [3,3,0,0],
    };
    for (const id of Object.keys(COMPANIONS) as CompanionId[]) scores[id] = affinity[id].reduce((sum, weight, i) => sum + weight * styles[i], 0);
  }
  return scores;
}
export function matchCompanion(d: EggDiscovery): CompanionId | null {
  if (!d.candidates.length) return null;
  if (d.teacherChoice && d.candidates.includes(d.teacherChoice)) return d.teacherChoice;
  const scores = discoveryScores(d), best = Math.max(...d.candidates.map(id => scores[id]));
  const tied = d.candidates.filter(id => scores[id] === best);
  return tied[Math.min(tied.length - 1, Math.floor(d.tieBreak * tied.length))];
}

/** Validate the saved shape before any UI indexes quiz, stamp or problem data. */
export function validEggDiscovery(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const d = value as EggDiscovery;
  const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (d.matchingVersion !== undefined && d.matchingVersion !== 2) return false;
  if (d.bonusDays !== undefined && d.bonusDays !== 0 && d.bonusDays !== 1) return false;
  if (!['collecting', 'matched', 'claimed'].includes(d.status) || !Number.isFinite(d.startedAt)
    || !Array.isArray(d.answers) || d.answers.length !== 4 || d.answers.some(a => !Number.isInteger(a) || a < -1 || a > 4)
    || !Array.isArray(d.candidates) || d.candidates.length < 1 || d.candidates.length > Object.keys(COMPANIONS).length || d.candidates.some(id => !isCompanion(id))
    || new Set(d.candidates).size !== d.candidates.length || !Number.isFinite(d.tieBreak) || d.tieBreak < 0 || d.tieBreak >= 1
    || !Array.isArray(d.stamps) || d.stamps.length > DISCOVERY_DAYS
    || d.stamps.some(s => !s || !date(s.day) || !STYLE_KEYS.includes(s.style) || !['mission', 'classroom', 'activity'].includes(s.source))
    || new Set(d.stamps.map(s => s.day)).size !== d.stamps.length) return false;
  if (d.status === 'collecting' ? d.companion !== null : !d.companion || !d.candidates.includes(d.companion) || d.stamps.length + (d.bonusDays ?? 0) !== DISCOVERY_DAYS) return false;
  if (d.teacherChoice != null && (!isCompanion(d.teacherChoice) || !d.candidates.includes(d.teacherChoice))) return false;
  if (d.mission) {
    const m = d.mission;
    if (d.status !== 'collecting' || !date(m.day) || !STYLE_KEYS.includes(m.style) || typeof m.feedback !== 'string'
      || !Array.isArray(m.problems) || m.problems.length !== 3 || !Number.isInteger(m.index) || m.index < 0 || m.index >= 3
      || m.problems.some(p => !p || typeof p.id !== 'string' || typeof p.question !== 'string' || !Number.isFinite(p.answer) || typeof p.hint !== 'string')) return false;
  } else if (d.mission !== null) return false;
  return true;
}
