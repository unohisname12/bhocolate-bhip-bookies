import {describe,it,expect} from 'vitest';
import {cookieName,readCookie,sessionCookie} from './security';
const scope='a'.repeat(32);
describe('tab session cookies',()=>{
 it('isolates each selector and never falls back to the shared cookie',()=>{
  const request=new Request('https://class.example/api/pilot/session',{headers:{'X-Pilot-Tab':scope,Cookie:'__Host-auralith-session=legacy; __Host-auralith-session-'+scope+'=specific'}});
  expect(readCookie(request)).toBe('specific');
  const missing=new Request(request,{headers:{'X-Pilot-Tab':'b'.repeat(32),Cookie:request.headers.get('Cookie')!}});expect(readCookie(missing)).toBe('');
 });
 it('preserves HttpOnly, Secure and strict same-site flags including logout',()=>{
  const request=new Request('https://class.example',{headers:{'X-Pilot-Tab':scope}});
  expect(cookieName(request)).toBe('__Host-auralith-session-'+scope);
  expect(sessionCookie(request,'token')).toContain('Path=/; HttpOnly; SameSite=Strict;');expect(sessionCookie(request,'token')).toContain('; Secure');expect(sessionCookie(request,'',0)).toContain('Max-Age=0');
 });
 it('rejects malformed selectors and supports existing code clients',()=>{
  expect(()=>cookieName(new Request('https://class.example',{headers:{'X-Pilot-Tab':'../bad'}}))).toThrow();
  expect(cookieName(new Request('http://localhost'))).toBe('auralith-local-session');
 });
});
