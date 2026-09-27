export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'request_failed') { super(message); }
}

export const randomCode = (bytes = 12) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Alphabet has exactly 32 symbols; five independent bits per character.
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => alphabet[byte & 31]).join('');
};
export const cleanCode = (value: unknown) => typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '';
export async function digest(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Expected a JSON object.');
  return value as Record<string, unknown>;
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'Use JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2 * 1024 * 1024) { await reader.cancel(); throw new ApiError(413, 'This save is too large. Ask the teacher for help.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return object(JSON.parse(new TextDecoder().decode(bytes))); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, 'Invalid JSON.'); }
}

export function checkOrigin(request: Request) {
  sessionScope(request);
  const url = new URL(request.url);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new ApiError(403, 'HTTPS is required.');
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Cross-site requests are not allowed.');
  if (request.method !== 'GET') {
    if (request.headers.get('x-pilot-request') !== '1') throw new ApiError(403, 'Missing request protection.');
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) throw new ApiError(403, 'Cross-site requests are not allowed.');
  }
}

export function sessionScope(request: Request) {
  const scope = request.headers.get('X-Pilot-Tab');
  if (scope !== null && !/^[a-f0-9]{32}$/.test(scope)) throw new ApiError(400, 'Invalid tab session. Reload this page.');
  return scope;
}
export const cookieName = (request: Request) => {
  const base = new URL(request.url).protocol === 'https:' ? '__Host-auralith-session' : 'auralith-local-session';
  const scope = sessionScope(request);
  return scope ? `${base}-${scope}` : base;
};
export function sessionCookie(request: Request, token: string, maxAge = 12 * 60 * 60) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function readCookie(request: Request) {
  const prefix = `${cookieName(request)}=`;
  return (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length) ?? '';
}

export async function limit(db: D1Database, key: string, maximum: number, duration = 600_000) {
  const expires = Date.now() + duration;
  const row = await db.prepare(`INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<? THEN 1 ELSE hits+1 END,
    expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING hits`)
    .bind(key, expires, Date.now(), Date.now()).first<{ hits: number }>();
  if (!row || row.hits > maximum) throw new ApiError(429, 'Too many attempts. Wait a few minutes and try again.', 'rate_limited');
}
