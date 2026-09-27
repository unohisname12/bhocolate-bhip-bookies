import {it,expect} from 'vitest';
import {validateNickname} from './metadata';
it('accepts existing teacher nicknames including dots and normalizes spacing',()=>{expect(validateNickname('D.Va')).toBe('D.Va');expect(validateNickname('  Soldier   76 ')).toBe('Soldier 76');});
it('rejects empty, oversized, impersonating and markup nicknames',()=>{for(const n of ['', 'A'.repeat(25),'<script>', 'Teacher','a@b.com'])expect(()=>validateNickname(n)).toThrow();});
