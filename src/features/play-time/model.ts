import type { ScreenName } from '../../types/session';

export type Mode = 'class' | 'home';
export interface PlayPolicy {
  enabled: boolean; questionsPerRound: number; minutesPerRound: number; classCapMinutes: number; homeCapMinutes: number;
  schoolDays: number[]; schoolStart: string; schoolEnd: string; timeZone: string;
  classOverride: 'auto' | 'on' | 'off'; overrideUntil: number; mathOnlyUntil: number; floorMinutes: number;
}
export interface Stuck { skillId: string; topic: string; at: number }
// floorDay/stuck are optional so wallets saved before them still load.
export interface Wallet { classMs: number; homeMs: number; day: string; progress: number; counted: string[]; lastEarnAt: number; lastSpendAt: number; mathOnlyUntil: number; floorDay?: string; stuck?: Stuck[] }
/** A solved question. Wrong answers are not sent: they earn nothing, so farming failures earns nothing. */
export interface Attempt { questionId: string; at: number; correct?: boolean; revealed?: boolean }

export const MINUTE = 60000;
export const MIN_ATTEMPT_GAP = 3000;
export const MAX_SYNC_SPEND = 150000;
export const DEFAULT_POLICY: PlayPolicy = {
  enabled: true, questionsPerRound: 5, minutesPerRound: 15, classCapMinutes: 15, homeCapMinutes: 45,
  schoolDays: [1, 2, 3, 4, 5], schoolStart: '08:00', schoolEnd: '14:45', timeZone: 'America/Los_Angeles',
  classOverride: 'auto', overrideUntil: 0, mathOnlyUntil: 0, floorMinutes: 5,
};
export const emptyWallet = (): Wallet => ({ classMs: 0, homeMs: 0, day: '', progress: 0, counted: [], lastEarnAt: 0, lastSpendAt: 0, mathOnlyUntil: 0 });

// Math screens earn minutes and never spend them; hub screens (home, pet care, shop) are free.
export const MATH_SCREENS: readonly ScreenName[] = ['math', 'catch_math', 'number_merge', 'discovery', 'growth', 'woodland'];
const GAME_SCREENS: readonly string[] = ['arcade', 'momentum', 'battle', 'first_adventure', 'match_result', 'class_roster'];
export const spendsTime = (screen: ScreenName) => GAME_SCREENS.includes(screen) || screen.startsWith('run_');

const clampInt = (v: unknown, lo: number, hi: number, fallback: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? v as number : fallback;
const clock = (v: unknown, fallback: string) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback;
export function normalizePolicy(value: Partial<PlayPolicy> | null | undefined): PlayPolicy {
  const v = value ?? {}, d = DEFAULT_POLICY;
  let zone = d.timeZone;
  try { if (typeof v.timeZone === 'string') { new Intl.DateTimeFormat('en-US', { timeZone: v.timeZone }); zone = v.timeZone; } } catch { /* keep default zone */ }
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : d.enabled,
    questionsPerRound: clampInt(v.questionsPerRound, 1, 20, d.questionsPerRound), minutesPerRound: clampInt(v.minutesPerRound, 1, 60, d.minutesPerRound),
    classCapMinutes: clampInt(v.classCapMinutes, 1, 120, d.classCapMinutes), homeCapMinutes: clampInt(v.homeCapMinutes, 1, 600, d.homeCapMinutes),
    schoolDays: Array.isArray(v.schoolDays) ? [...new Set(v.schoolDays.filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : d.schoolDays,
    schoolStart: clock(v.schoolStart, d.schoolStart), schoolEnd: clock(v.schoolEnd, d.schoolEnd), timeZone: zone,
    classOverride: v.classOverride === 'on' || v.classOverride === 'off' ? v.classOverride : 'auto',
    overrideUntil: clampInt(v.overrideUntil, 0, Number.MAX_SAFE_INTEGER, 0), mathOnlyUntil: clampInt(v.mathOnlyUntil, 0, Number.MAX_SAFE_INTEGER, 0),
    floorMinutes: clampInt(v.floorMinutes, 0, 30, d.floorMinutes),
  };
}

export function localTime(now: number, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(now).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export function modeAt(policy: PlayPolicy, now: number): Mode {
  if (policy.classOverride !== 'auto' && policy.overrideUntil > now) return policy.classOverride === 'on' ? 'class' : 'home';
  const t = localTime(now, policy.timeZone);
  return policy.schoolDays.includes(t.weekday) && t.minutes >= toMinutes(policy.schoolStart) && t.minutes < toMinutes(policy.schoolEnd) ? 'class' : 'home';
}

/** Class minutes only exist during class: they vanish outside class time and on a new day, so they can't be stockpiled. */
export function settle(wallet: Wallet, policy: PlayPolicy, now: number): Wallet {
  const day = localTime(now, policy.timeZone).day, mode = modeAt(policy, now);
  return { ...wallet, day, classMs: mode === 'home' || wallet.day !== day ? 0 : wallet.classMs };
}

/** Each distinct question counts once, and only when solved without the answer being revealed.
 * Solves closer than 3s apart are treated as guessing (multiple-choice mashing). */
export function earn(wallet: Wallet, policy: PlayPolicy, attempts: Attempt[], now: number): Wallet {
  let w = settle(wallet, policy, now);
  for (const a of attempts.filter(a => a && typeof a === 'object' && Number.isFinite(a.at)).sort((x, y) => x.at - y.at)) {
    if (typeof a.questionId !== 'string' || !a.questionId || a.questionId.length > 120 || !Number.isFinite(a.at)) continue;
    if (a.correct !== true || a.revealed === true) continue;
    if (a.at > now + 5000 || a.at < now - 15 * MINUTE || w.counted.includes(a.questionId)) continue;
    const counted = [...w.counted, a.questionId].slice(-60);
    // Absolute gap: a late batch from a second device has older timestamps but is not guessing.
    if (Math.abs(a.at - w.lastEarnAt) < MIN_ATTEMPT_GAP) { w = { ...w, counted, lastEarnAt: Math.max(w.lastEarnAt, a.at) }; continue; }
    const progress = w.progress + 1, lastEarnAt = Math.max(w.lastEarnAt, a.at);
    if (progress < policy.questionsPerRound) { w = { ...w, counted, progress, lastEarnAt }; continue; }
    w = credit({ ...w, counted, progress: 0, lastEarnAt }, policy, now, policy.minutesPerRound);
  }
  return w;
}

const credit = (w: Wallet, policy: PlayPolicy, now: number, minutes: number, cap = true): Wallet => {
  const mode = modeAt(policy, now), key = mode === 'class' ? 'classMs' : 'homeMs';
  const limit = (mode === 'class' ? policy.classCapMinutes : policy.homeCapMinutes) * MINUTE;
  const next = w[key] + minutes * MINUTE;
  return { ...w, [key]: cap ? Math.max(w[key], Math.min(limit, next)) : next };
};

/** Safety net for a stuck learner: studying a worked example and then really trying a fresh
 * question earns a small amount once per day, so being stuck never means being locked out. */
export function claimFloor(wallet: Wallet, policy: PlayPolicy, now: number): Wallet {
  const w = settle(wallet, policy, now);
  if (!policy.floorMinutes || w.floorDay === w.day) return w;
  return { ...credit(w, policy, now, policy.floorMinutes), floorDay: w.day };
}

/** Three first-try misses in a row on one skill; the teacher decides what help and time to give. */
export function reportStuck(wallet: Wallet, reports: { skillId: string; topic: string }[], now: number): Wallet {
  let stuck = wallet.stuck ?? [];
  for (const r of reports.slice(0, 5)) {
    if (typeof r?.skillId !== 'string' || !r.skillId || r.skillId.length > 80 || typeof r.topic !== 'string' || r.topic.length > 80) continue;
    if (stuck.some(x => x.skillId === r.skillId)) continue;
    stuck = [...stuck, { skillId: r.skillId, topic: r.topic, at: now }].slice(-10);
  }
  return { ...wallet, stuck };
}

/** Teacher grant may exceed the class cap: it is a deliberate human decision. It also clears stuck alerts. */
export function grant(wallet: Wallet, policy: PlayPolicy, minutes: number, now: number): Wallet {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) throw new Error('Grant between 1 and 60 minutes.');
  return { ...credit(settle(wallet, policy, now), policy, now, minutes, false), stuck: [] };
}

/** The server clock bounds what a client may claim, so a stale tab cannot report hours of play at once. */
export function spend(wallet: Wallet, policy: PlayPolicy, playedMs: number, now: number): Wallet {
  const w = settle(wallet, policy, now);
  if (!Number.isFinite(playedMs) || playedMs <= 0) return w;
  const window = w.lastSpendAt ? Math.max(0, now - w.lastSpendAt) + 5000 : MAX_SYNC_SPEND;
  const used = Math.min(playedMs, window, MAX_SYNC_SPEND), key = modeAt(policy, now) === 'class' ? 'classMs' : 'homeMs';
  return { ...w, [key]: Math.max(0, w[key] - used), lastSpendAt: now };
}

export function walletView(wallet: Wallet, policy: PlayPolicy, now: number, revision: number) {
  const w = settle(wallet, policy, now), mode = modeAt(policy, now);
  const mathOnly = policy.mathOnlyUntil > now || w.mathOnlyUntil > now;
  const balanceMs = mode === 'class' ? w.classMs : w.homeMs;
  return { revision, serverNow: now, enabled: policy.enabled, mode, balanceMs, progress: w.progress, questionsPerRound: policy.questionsPerRound,
    minutesPerRound: policy.minutesPerRound, capMinutes: mode === 'class' ? policy.classCapMinutes : policy.homeCapMinutes,
    mathOnly, canPlay: !policy.enabled || (!mathOnly && balanceMs > 0), floorAvailable: !!policy.floorMinutes && w.floorDay !== w.day, floorMinutes: policy.floorMinutes };
}
export type PlayView = ReturnType<typeof walletView>;
export interface TeacherPlayTime { policy: PlayPolicy; mode: Mode; serverNow: number; students: { id: string; alias: string; active: boolean; view: PlayView; mathOnlyUntil: number; stuck: Stuck[] }[] }
/** Game ids from the navigation gate (see checkActivity); math games and teacher-run class events stay free. */
export const gameSpendsTime = (game: string | undefined) => !!game && !['math', 'catch_math', 'number_merge', 'woodland', 'classroom'].includes(game);
