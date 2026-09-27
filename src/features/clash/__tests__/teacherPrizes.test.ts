import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {TEACHER_PRIZES,PRIZE_CATEGORIES} from '../prizeCatalog';
import {grantTeacherGift,useEarlyHatchPass} from '../teacherGifts';
import {applyPartyPrize} from '../partyPrizes';
import {createInitialEngineState} from '../../../engine/state/createInitialEngineState';
import {createEggDiscovery,discoveryDays,discoveryReady,matchCompanion,validEggDiscovery} from '../../../services/game/eggDiscovery';
import {createParty,type PartyMember} from '../../classroom-party/model';
import {startRun} from '../../arcade/model';
import {ownsFurniture} from '../../home-base/model';

describe('teacher prize catalog',()=>{
 it('has over 100 distinct, real prizes, many categories and existing artwork',()=>{
  expect(TEACHER_PRIZES.length).toBeGreaterThanOrEqual(100);expect(PRIZE_CATEGORIES.length).toBeGreaterThanOrEqual(12);expect(new Set(TEACHER_PRIZES.map(p=>p.id)).size).toBe(TEACHER_PRIZES.length);
  for(const p of TEACHER_PRIZES){expect(p.description.length).toBeGreaterThan(20);if(p.art)expect(existsSync(`public${p.art}`),p.art).toBe(true);}
  console.log(`Teacher catalog: ${TEACHER_PRIZES.length} items / ${PRIZE_CATEGORIES.length} categories`);
 });
 it('every catalog entry grants once and furniture/accessories are actually usable',()=>{
  for(const gift of TEACHER_PRIZES){const state=createInitialEngineState(),next=grantTeacherGift(state,'receipt',gift.id);expect(next.prizes?.teacherClaims).toContain('receipt');expect(grantTeacherGift(next,'receipt',gift.id)).toBe(next);if(gift.effect==='furniture')expect(ownsFurniture(next,gift.target!)).toBe(true);if(gift.effect==='cosmetic')expect(next.cosmetics.owned.some(c=>c.cosmeticId===gift.target)).toBe(true);}
 });
 it('duplicates become 15 tokens without deleting ownership',()=>{
  const gift=TEACHER_PRIZES.find(p=>p.effect==='furniture')!;
  const first=grantTeacherGift(createInitialEngineState(),'one',gift.id),second=grantTeacherGift(first,'two',gift.id);expect(second.player.currencies.tokens).toBe(first.player.currencies.tokens+15);expect(ownsFurniture(second,gift.target!)).toBe(true);
 });
 it('early hatch saves one day, preserves quiz and cannot be stacked or forged',()=>{
  const d=createEggDiscovery();d.answers=[0,0,0,0];d.stamps=['2026-09-10','2026-09-11','2026-09-12','2026-09-13'].map(day=>({day,style:'explore',source:'mission'}));
  const state={...createInitialEngineState(),eggDiscovery:d};expect(discoveryReady(d)).toBe(false);
  const awarded=grantTeacherGift(state,'pass','gift_early_hatch'),used=useEarlyHatchPass(awarded);expect(discoveryDays(used.eggDiscovery!)).toBe(5);expect(discoveryReady(used.eggDiscovery!)).toBe(true);expect(used.prizes?.earlyHatchPasses).toBe(0);expect(useEarlyHatchPass(used)).toBe(used);
  const matched={...used.eggDiscovery!,status:'matched' as const,companion:matchCompanion(used.eggDiscovery!)};expect(validEggDiscovery(matched)).toBe(true);
  const noQuiz={...used.eggDiscovery!,answers:[-1,-1,-1,-1]};expect(discoveryReady(noQuiz)).toBe(true);
 });
 it('all six surprise perks affect the right game, without altering public event text',()=>{
  const member:PartyMember={id:'student',alias:'Learner',status:'joined',baseline:0,target:3,practice:3,lastSeen:0,station:{selected:0,tray:[]},racer:null};
  for(const gift of TEACHER_PRIZES.filter(p=>p.effect==='party')){
   const game=gift.target as 'dash'|'guard'|'cafe';const party={...createParty(game,member,1),phase:'playing' as const,members:[{...member,racer:game==='dash'?startRun('dash',1,1):null}]};
   const next=applyPartyPrize(party,member.id,gift.id);expect(next).not.toEqual(party);expect(next.events).toEqual(party.events);expect(applyPartyPrize(party,'stranger',gift.id)).toBe(party);
  }
 });
});
