import {describe,it,expect} from 'vitest';
import {signInLink,readSignInLink,bookmarkFile} from './signInLinks';
describe('private Chromebook sign-in links',()=>{
 it('keeps credentials out of paths and queries and preserves both roles',()=>{
  for(const role of ['student','teacher'] as const){const card={role,code:'ABCD-EFGH-JKLM-NPQR',classCode:role==='student'?'ABCD2345':''};const url=new URL(signInLink('https://class.example/private',card));expect(url.pathname).toBe('/');expect(url.search).toBe('');expect(readSignInLink(url.hash)).toEqual({...card,code:'ABCDEFGHJKLMNPQR'});}
 });
 it('rejects missing or malformed login links',()=>{for(const hash of ['#signin=admin&code=ABCDEFGHJKLMNPQR','#signin=student&code=ABCDEFGHJKLMNPQR','#signin=teacher&code=<script>','#signin=teacher&code=short'])expect(readSignInLink(hash)).toBeNull();});
 it('escapes bookmark labels and excludes executable URLs',()=>{const file=bookmarkFile(signInLink('https://class.example',{role:'teacher',code:'ABCDEFGHJKLMNPQR',classCode:''}),'<script>"hello"</script>');expect(file).not.toContain('<script>');expect(file).toContain('&lt;script&gt;');expect(()=>bookmarkFile('javascript:alert(1)','x')).toThrow();});
});
