import type { LearningEvidence } from '../../types/woodland';
import type { Attempt } from './model';

export interface ScanMemo { misses: { key: string; count: number }; exampleSeen: boolean; stuckSent: Set<string> }
export const newScanMemo = (): ScanMemo => ({ misses: { key: '', count: 0 }, exampleSeen: false, stuckSent: new Set() });

/** Turns local evidence changes into wallet events: solved questions, a stuck skill (three first-try
 * misses in a row), and the daily floor (a real try on a fresh question after studying a worked example). */
export function scanEvidence(prev: LearningEvidence[] | undefined, next: LearningEvidence[] | undefined, memo: ScanMemo, floorAvailable: boolean, now: number) {
  const before = new Map((prev ?? []).map(r => [r.questionId, r]));
  const attempts: Attempt[] = [], stuck: { skillId: string; topic: string }[] = [];
  let floor = false;
  for (const row of next ?? []) {
    const old = before.get(row.questionId);
    if (old === row) continue;
    if (row.source === 'mini-lesson') {
      // A finished guided path can claim the existing teacher-set daily safety net.
      // It never counts as five independent solves or earns repeatable play time.
      if (old?.context !== 'mini-lesson-complete' && row.context === 'mini-lesson-complete' && row.attempts > 0) floor ||= floorAvailable;
      continue;
    }
    if (row.answerRevealed && !old?.answerRevealed) memo.exampleSeen = true;
    if (row.attempts >= 1 && (old?.attempts ?? 0) === 0) {
      if (memo.exampleSeen && !row.answerRevealed) { memo.exampleSeen = false; floor ||= floorAvailable; }
      const key = row.skillId ?? row.topic;
      memo.misses = row.correct ? { key, count: 0 } : { key, count: memo.misses.key === key ? memo.misses.count + 1 : 1 };
      if (memo.misses.count >= 3 && !memo.stuckSent.has(key)) { memo.stuckSent.add(key); stuck.push({ skillId: key, topic: row.topic }); }
    }
    if (row.correct && !old?.correct) attempts.push({ questionId: row.questionId, at: now, correct: true, revealed: row.answerRevealed === true });
  }
  return { attempts, stuck, floor };
}
