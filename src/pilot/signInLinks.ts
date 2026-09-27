export interface SignInCard { role: 'student' | 'teacher'; code: string; classCode: string }
const clean = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
export function signInLink(origin: string, card: SignInCard) {
  const url = new URL('/', origin);
  url.hash = new URLSearchParams({ signin: card.role, code: clean(card.code), ...(card.role === 'student' ? { class: clean(card.classCode) } : {}) }).toString();
  return url.href;
}
export function readSignInLink(hash: string): SignInCard | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const role = params.get('signin'), code = clean(params.get('code') ?? ''), classCode = clean(params.get('class') ?? '');
  if (role !== 'teacher' && role !== 'student') return null;
  if (!/^[A-Z2-9]{16,80}$/.test(code) || (role === 'student' && !/^[A-Z2-9]{8}$/.test(classCode))) return null;
  return { role, code, classCode };
}
const escapeHTML = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function bookmarkFile(link: string, label: string) {
  const url = new URL(link);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid sign-in address.');
  const card = readSignInLink(url.hash);
  const backup = card ? `<h2>Backup login details</h2><p>Website: ${escapeHTML(url.origin)}</p><p>Sign in as: ${card.role}</p>${card.role === 'student' ? `<p>Class code: <code>${escapeHTML(card.classCode)}</code></p>` : ''}<p>${card.role === 'teacher' ? 'Private teacher key' : 'Secret pet code'}: <code>${escapeHTML(card.code)}</code></p>` : '';
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Private V-Pet bookmark</TITLE>\n<H1>Private V-Pet bookmark</H1>\n<DL><p><DT><A HREF="${escapeHTML(url.href)}" TARGET="_blank" REL="noreferrer">V-Pet · ${escapeHTML(label)}</A></DL>${backup}<p>Keep this file private. Import into Chrome Bookmarks, or click your link above.</p>`;
}
