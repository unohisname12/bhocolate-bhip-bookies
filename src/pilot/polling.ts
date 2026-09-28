import { useEffect, useRef } from 'react';

/**
 * One polling rule for the whole app, because every request counts against the Cloudflare plan:
 * - a hidden tab makes no requests at all;
 * - a visible tab nobody has touched for 5 minutes (a Chromebook or projector left open) checks once a minute;
 * - after 30 untouched minutes it stops asking entirely, so a tab forgotten overnight costs nothing;
 * - coming back to the tab, or touching it after being idle, refreshes right away.
 */
export const IDLE_AFTER = 5 * 60_000, IDLE_EVERY = 60_000, SLEEP_AFTER = 30 * 60_000;
let lastActive = Date.now();
const wakers = new Set<() => void>();
/** Someone touched the page: note it, and if the page had gone idle, refresh everything right away. */
export function noteActivity() { const wasIdle = isIdle(); lastActive = Date.now(); if (wasIdle) for (const wake of wakers) wake(); }
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function')
  for (const event of ['pointerdown', 'keydown', 'touchstart', 'wheel']) window.addEventListener(event, noteActivity, { passive: true, capture: true });
export function isIdle(now = Date.now()) { return now - lastActive > IDLE_AFTER; }
export function isAsleep(now = Date.now()) { return now - lastActive > SLEEP_AFTER; }
export function pageVisible() { return typeof document === 'undefined' || document.visibilityState === 'visible'; }
/** Test hook: pretend the learner was last active at `at`. */
export function setLastActive(at: number) { lastActive = at; }

/** Run `run` about every `ms` under the rules above. Returns a function that stops polling. */
/** `awake` keeps full speed while it returns true, for screens nobody touches on purpose (a classroom projector mid-match). */
export function startPolling(run: () => unknown, ms: number, { immediate = true, awake = () => false }: { immediate?: boolean; awake?: () => boolean } = {}): () => void {
  let stopped = false, busy = false, last = immediate ? 0 : Date.now(), timer: ReturnType<typeof setTimeout> | undefined;
  const events = typeof document !== 'undefined' && typeof document.addEventListener === 'function' ? document : null;
  const due = () => !(isAsleep() && !awake()) && Date.now() - last >= (isIdle() && !awake() ? Math.max(ms, IDLE_EVERY) : ms);
  const tick = async (force = false) => {
    clearTimeout(timer);
    if (stopped) return;
    if (pageVisible() && !busy && (force || due())) {
      busy = true; last = Date.now();
      try { await run(); } catch { /* callers show their own connection state */ } finally { busy = false; }
    }
    // Wait until the next check is due (at most a second, so an idle page notices when it should slow down). Waiting costs no requests.
    const every = isIdle() && !awake() ? Math.max(ms, IDLE_EVERY) : ms;
    // A hidden page sleeps entirely until the visibility event wakes it (when the browser can tell us).
    // Asleep, nothing is due until a touch (which wakes it directly), so only look again once a minute.
    const wait = isAsleep() && !awake() ? IDLE_EVERY : Math.max(20, Math.min(1000, last + every - Date.now()));
    if (!stopped && (pageVisible() || !events)) timer = setTimeout(() => void tick(), wait);
  };
  const wake = () => void tick(true);
  const onVisible = () => { if (pageVisible()) { lastActive = Date.now(); wake(); } };
  wakers.add(wake);
  events?.addEventListener('visibilitychange', onVisible);
  void tick();
  return () => { stopped = true; clearTimeout(timer); wakers.delete(wake); events?.removeEventListener('visibilitychange', onVisible); };
}

/** React form of startPolling; the latest `run` is always used without restarting the loop. */
export function usePolling(run: () => unknown, ms: number, enabled = true) {
  const latest = useRef(run);
  useEffect(() => { latest.current = run; });
  useEffect(() => enabled ? startPolling(() => latest.current(), ms) : undefined, [ms, enabled]);
}
