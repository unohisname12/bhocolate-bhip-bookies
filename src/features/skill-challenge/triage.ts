import { lesson } from './lessons';
import type { Event, Policy, Progress, Target } from './model';

/** Evidence from outside the challenge (weekly skill checks, "I don't know this yet" gaps). */
export interface OutsideEvidence { skillId: string; outcome: 'correct' | 'needs-practice' | 'not-learned'; at: number }
export type TriageGroup = 'auto-confirmed' | 'needs-you' | 'ready' | 'in-progress' | 'confirmed';
export interface Triage { group: TriageGroup; reasons: string[]; prompt: string }

const DAY = 86400000;
const day = (at: number) => new Date(at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const show = (n: number) => String(Number(n.toPrecision(6)));
const autoOn = (p: Pick<Progress, 'version'>, policy: Policy) => p.version === 2 && policy.autoConfirm !== false;

/** Contradictions a teacher should look at. An empty list plus a finished run means the record is clean. */
export function concerns(p: Progress, t: Target, policy: Policy, outside: OutsideEvidence[] = []): string[] {
  const rows = p.events.filter(e => e.skill === t.id), reasons: string[] = [];
  if (/^\s*I will explain to my teacher[.!]?\s*$/i.test(t.reflection ?? '')) reasons.push('The learner chose an oral explanation. Hear and record their reasoning before confirming.');
  const missed = (stage: Event['stage']) => rows.filter(e => e.stage === stage && !e.correct);
  const follow = missed('follow')[0], transfer = missed('transfer')[0], retention = missed('retention')[0];
  if (follow && t.passedAt !== null) reasons.push(`Passed the independent check, then missed the follow-up on ${day(follow.at)}. Possible short-term memorizing.`);
  else if (follow) reasons.push(`Missed the follow-up on ${day(follow.at)} and went back to practice.`);
  if (transfer) reasons.push(`Missed a different-use question on ${day(transfer.at)}: the skill may not carry over to new situations yet.`);
  if (t.set > 1) reasons.push(`Needed ${t.set} tries at the independent check.`);
  const practice = rows.filter(e => e.stage === 'practice'), revealed = practice.filter(e => e.answerRevealed).length;
  if (practice.length >= 3 && revealed * 2 > practice.length) reasons.push(`Opened the worked answer on ${revealed} of ${practice.length} practice questions.`);
  if (policy.delayHours < 24 && t.followAt) reasons.push('Follow-up was same-class, not next-day, so retention is untested.');
  if (retention) reasons.push(`Missed the one-week check on ${day(retention.at)} after being confirmed.`);
  const since = t.baseline === null ? Infinity : Math.min(...rows.filter(e => e.stage === 'baseline').map(e => e.at));
  for (const o of outside.filter(o => o.skillId === t.id && o.at >= since && o.outcome !== 'correct'))
    reasons.push(o.outcome === 'not-learned' ? `Said “I don’t know this yet” on a skill check ${day(o.at)}.` : `Missed this skill on a skill check ${day(o.at)}.`);
  return reasons;
}

/** A 30-second oral check built from the exact question the learner missed, not a generic prompt. */
export function oralPrompt(p: Progress, t: Target): string {
  const rows = p.events.filter(e => e.skill === t.id);
  const order: Event['stage'][] = ['retention', 'follow', 'transfer', 'check', 'practice'];
  const miss = order.map(stage => rows.filter(e => e.stage === stage && !e.correct).at(-1)).find(Boolean);
  let guide: { steps: string[]; oralPrompt: string } | null = null;
  try { guide = lesson(t.id, p.learning.challenge); } catch { /* unknown skill id: fall back to the missed question alone */ }
  if (miss) return `Ask them to solve this out loud: “${miss.text}” They answered ${miss.answer}; the answer is ${show(miss.expected)}.${guide ? ` Listen for: ${guide.steps[0]}` : ''}`;
  const last = rows.filter(e => e.correct && e.stage !== 'practice').at(-1);
  if (guide) return `Ask: ${guide.oralPrompt}${last ? ` Then have them explain how they solved “${last.text}”.` : ''}`;
  return last ? `Have them explain how they solved “${last.text}”.` : 'Ask them to explain one question in their own words.';
}

export function triage(p: Progress, t: Target, policy: Policy, outside: OutsideEvidence[] = []): Triage {
  const reasons = concerns(p, t, policy, outside), prompt = oralPrompt(p, t);
  if (t.confirmedAt) return { group: t.autoConfirmed && reasons.length || reasons.some(r => r.includes('one-week') || r.includes('skill check')) ? 'needs-you' : t.autoConfirmed ? 'auto-confirmed' : 'confirmed', reasons, prompt };
  if (!t.followAt) return { group: 'in-progress', reasons, prompt };
  if (autoOn(p, policy) && !reasons.length && !t.reflection?.trim()) return { group: 'in-progress', reasons: ['Waiting for the learner’s written explanation; a clean record then confirms itself.'], prompt };
  return { group: reasons.length || !autoOn(p, policy) ? 'needs-you' : 'ready', reasons, prompt };
}

/** Clean, next-day-verified runs confirm themselves; the teacher can undo. Anything contradictory waits for a human. */
export function autoConfirm(p: Progress, policy: Policy, now: number, outside: OutsideEvidence[] = []): Progress {
  if (!autoOn(p, policy)) return p;
  let changed = false;
  const targets = p.targets.map(t => {
    // The learner's own explanation stays required, so every confirmed record has something a person can read.
    if (t.confirmedAt || t.autoDeclined || !t.followAt || !t.transferAt || !t.reflection?.trim() || t.baseline === null || t.baseline >= 3) return t;
    const check = p.events.filter(e => t.checkIds.includes(e.id) && e.correct && !e.supported).length;
    if (check < t.checkIds.length || t.checkIds.length < 5 || concerns(p, t, policy, outside).length) return t;
    if (t.followAt - Math.max(t.passedAt ?? 0, t.transferAt) < DAY) return t;
    changed = true;
    return { ...t, confirmedAt: now, autoConfirmed: true, teacherNote: 'Auto-confirmed: perfect independent check, different-use check, next-day follow-up with no hints, and a written explanation.' };
  });
  return changed ? { ...p, targets } : p;
}

export function undoConfirm(p: Progress, id: string): Progress {
  const t = p.targets.find(t => t.id === id);
  if (!t?.confirmedAt) throw Error('That target is not confirmed.');
  return { ...p, targets: p.targets.map(x => x.id === id ? { ...x, confirmedAt: null, autoConfirmed: false, autoDeclined: true, teacherNote: '' } : x) };
}
