// Only a cookie selector lives in tab storage. The session token remains HttpOnly.
const key = 'vpet-classroom-tab';
let current = '';
export function tabSession(fresh = false): string {
  if (typeof window === 'undefined') return '';
  if (!fresh && current) return current;
  let saved = '';
  try { saved = sessionStorage.getItem(key) ?? ''; } catch { /* Memory-only works until reload. */ }
  current = !fresh && /^[a-f0-9]{32}$/.test(saved) ? saved : crypto.randomUUID().replaceAll('-', '');
  try { sessionStorage.setItem(key, current); } catch { /* Never fall back to a shared account. */ }
  return current;
}
