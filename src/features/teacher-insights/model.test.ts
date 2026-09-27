import {describe,it,expect} from 'vitest';
import {recommend,independent,validEvidenceRows,DAY,csvValue,type EvidenceRecord} from './model';
import {DEFAULT_LEARNING} from '../../services/game/curriculum';
const now=Date.now(),settings={...DEFAULT_LEARNING,topic:'Two-digit subtraction'};
function row(n:number,patch:Partial<EvidenceRecord>={}):EvidenceRecord{return {questionId:`q${n}`,skillId:'2:Two-digit subtraction',topic:settings.topic,grade:2,source:'practice',templateId:n%2?'template-a':'template-b',attempts:1,support:'none',correct:true,firstAttemptCorrect:true,updatedAt:now-10000+n,practiceSettings:settings,eventAt:now-10000+n,receivedAt:now-10000+n,settingsVersion:2,imported:false,...patch};}
describe('teacher insight evidence rules',()=>{
 it('requires enough varied practice across sessions before suggesting challenge',()=>{
  const rows=Array.from({length:12},(_,i)=>row(i,i<6?{eventAt:now-40*60000+i,receivedAt:now-40*60000+i,updatedAt:now-40*60000+i}:{}));
  const alert=recommend(rows,settings,2,now)[0];expect(alert.rule).toBe('stretch');expect(alert.patch).toEqual({challenge:'stretch'});expect(alert.patch).not.toHaveProperty('grade');
  expect(recommend(rows.slice(0,6),settings,2,now)).toEqual([]);
  expect(recommend(rows.map(r=>({...r,templateId:'one'})),settings,2,now)[0].rule).toBe('fresh-check');
 });
 it('separates supported completion from independent success',()=>{
  const rows=Array.from({length:8},(_,i)=>row(i,{attempts:3,support:'hint',firstAttemptCorrect:false}));
  expect(rows.every(r=>!independent(r))).toBe(true);expect(recommend(rows,settings,2,now)[0].patch).toEqual({challenge:'support'});
  expect(independent(row(0,{answerRevealed:true}))).toBe(false);
 });
 it('offers check-in on three unresolved questions, without a setting change',()=>{
  const rows=Array.from({length:3},(_,i)=>row(i,{attempts:2,correct:false,firstAttemptCorrect:false}));expect(recommend(rows,settings,2,now)[0]).toMatchObject({rule:'check-in',patch:null});
 });
 it('excludes imported, unknown-setting, old-setting, delayed, future, and help-only evidence',()=>{
  for(const patch of [{imported:true},{settingsVersion:1},{practiceSettings:undefined},{attempts:0},{eventAt:now-10*DAY},{receivedAt:now+10*60000},{updatedAt:now+10*60000},{eventAt:now+10000}])expect(recommend(Array.from({length:15},(_,i)=>row(i,{attempts:3,support:'hint',firstAttemptCorrect:false,...patch})),settings,2,now)).toEqual([]);
 });
 it('does not count replays twice or mix skill/grade/challenge windows',()=>{
  const small=Array.from({length:4},(_,i)=>row(i,{attempts:3,support:'hint',firstAttemptCorrect:false}));expect(recommend([...small,...small,...small],settings,2,now)).toEqual([]);
  expect(recommend([...small,...small.map((r,i)=>({...r,questionId:`other${i}`,grade:3}))],settings,2,now)).toEqual([]);
 });
 it('keeps review separate from challenge, and retains help when suggesting support',()=>{
  const review=row(1,{eventAt:now-2*DAY,receivedAt:now-2*DAY,updatedAt:now-2*DAY});expect(recommend([review],settings,2,now)[0].rule).toBe('review');
  const rows=Array.from({length:8},(_,i)=>row(i,{attempts:3,support:'explanation',firstAttemptCorrect:false}));expect(recommend(rows,settings,2,now)[0].patch).not.toHaveProperty('learningHelp');
 });
 it('rejects impossible counters and inconsistent independent outcomes',()=>{expect(validEvidenceRows([row(0)])).toBe(true);for(const patch of [{attempts:-1},{attempts:0},{attempts:1.5},{support:'hint' as const},{answerRevealed:true},{grade:99}])expect(validEvidenceRows([row(0,patch)])).toBe(false);expect(validEvidenceRows([row(0),row(0)])).toBe(false);});
 it('escapes spreadsheet formulas and quotes',()=>{expect(csvValue('=1+1')).toBe('"\'=1+1"');expect(csvValue('hello"')).toBe('"hello"""');});
});
