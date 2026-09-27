import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const preferenceKey = 'vpet-reduce-motion';
export const reducedMotionPreference = () => {
  try { return localStorage.getItem(preferenceKey) === 'true'; } catch { return false; }
};
export function setReducedMotionPreference(value: boolean) {
  try { localStorage.setItem(preferenceKey, String(value)); } catch { /* Device storage may be unavailable. */ }
  window.dispatchEvent(new Event('vpet-motion-preference'));
}
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  window.addEventListener('vpet-motion-preference', listener);
  window.addEventListener('storage', listener);
  return () => {
    media.removeEventListener('change', listener);
    window.removeEventListener('vpet-motion-preference', listener);
    window.removeEventListener('storage', listener);
  };
};
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => reducedMotionPreference() || window.matchMedia(query).matches, () => false);
