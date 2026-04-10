/**
 * Runtime feature flags.
 *
 * Why: previously everything used `import.meta.env.DEV`, which is a Vite
 * *build-time* constant. When Vercel builds for production that constant is
 * `false`, so dev tools, the combat picker, asset review, etc. were all
 * tree-shaken out of the deployed beta site. Beta testers could not access
 * any of those features.
 *
 * This module exposes a single runtime flag that can be flipped *without*
 * rebuilding:
 *
 *   - `?dev=1` (or `?dev=0`) URL param  — overrides and persists
 *   - `localStorage['vpet_dev_mode'] === '1'` — persistent opt-in
 *   - `import.meta.env.DEV` — always on during `vite dev`
 *
 * The flag value is captured once on first read so React renders stay
 * consistent within a session; call `setDevModeEnabled` + page reload (or
 * let the setter do it) to flip it.
 */

const STORAGE_KEY = 'vpet_dev_mode';

const safeLocalStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const readUrlOverride = (): boolean | null => {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('dev')) return null;
    const val = params.get('dev');
    return val === '1' || val === 'true';
  } catch {
    return null;
  }
};

let cached: boolean | null = null;

const computeEnabled = (): boolean => {
  // Vite dev server is always dev-enabled.
  if (import.meta.env.DEV) return true;

  // URL override wins over persisted state and is sticky: reading it also
  // persists to localStorage so refreshing without the param keeps it on.
  const urlOverride = readUrlOverride();
  if (urlOverride !== null) {
    const ls = safeLocalStorage();
    if (ls) {
      try {
        ls.setItem(STORAGE_KEY, urlOverride ? '1' : '0');
      } catch {
        // ignore quota / privacy-mode errors
      }
    }
    return urlOverride;
  }

  const ls = safeLocalStorage();
  if (!ls) return false;
  try {
    return ls.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/** Returns true if dev features should be visible in the UI. */
export const isDevModeEnabled = (): boolean => {
  if (cached === null) cached = computeEnabled();
  return cached;
};

/** Flip the flag persistently. Reloads the page so React trees rebuild. */
export const setDevModeEnabled = (enabled: boolean, reload = true): void => {
  const ls = safeLocalStorage();
  if (ls) {
    try {
      ls.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // ignore
    }
  }
  cached = enabled;
  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
};

/** For tests: reset the cached value so the next read recomputes. */
export const __resetDevModeCache = (): void => {
  cached = null;
};
