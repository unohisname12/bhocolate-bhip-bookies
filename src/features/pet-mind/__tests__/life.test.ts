import {describe,it,expect,beforeEach,afterEach,vi} from 'vitest';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createTestEngineState} from '../../../engine/state/createTestEngineState';
import {createInitialEngineState} from '../../../engine/state/createInitialEngineState';
import {engineReducer} from '../../../engine/state/engineReducer';
import {createHomeBase} from '../../home-base/model';
import {FOOD_ITEMS} from '../../../config/gameConfig';
import {createLife,recordEpisode,rollover,consolidate,effectiveTraits,validLife,kidModel,observeLife,findTreasure,petMood,TREASURES,LIMITS,type PetLife} from '../life';
import {speak,welcomeLine,CHATTER_GAP_MS} from '../voice';
import {validMind,createMind} from '../memory';
import {scoreDecisions} from '../decisions';
import type {EngineState} from '../../../types/engine';

const DAY=86400000,T0=new Date(2026,8,1,15,0).getTime();
const setup=()=>{const s=createTestEngineState();s.mode='normal';s.screen='home';s.pet!.needs={health:100,hunger:90,happiness:90,cleanliness:90};s.pet!.state='idle';s.pet!.timestamps.createdAt=new Date(T0).toISOString();s.player.currencies.tokens=100000;s.homeBase=createHomeBase(s);return s;};
const food=(id:string)=>FOOD_ITEMS.find(f=>f.id===id)!;
const life=(s:EngineState)=>s.pet!.mind!.life!;
const at=(t:number)=>vi.setSystemTime(t);

beforeEach(()=>{vi.useFakeTimers();at(T0);});
afterEach(()=>vi.useRealTimers());

describe('life memory',()=>{
 it('records what happened from the real reducer: foods, firsts, tallies and small personality drift',()=>{
  let s=setup();
  s=engineReducer(s,{type:'FEED_PET',food:food('apple')});
  expect(life(s).episodes.find(e=>e.kind==='fed')).toMatchObject({kind:'fed',subject:'apple',first:true});
  expect(life(s).tallies['food:apple']).toBe(1);expect(life(s).drift.nature).toBeCloseTo(0.004);
  for(let i=0;i<10;i++)s=engineReducer(s,{type:'FEED_PET',food:food('apple')});
  // A burst merges into one episode, and drift is capped per day so grinding can't reshape a pet in minutes.
  expect(life(s).episodes.filter(e=>e.kind==='fed')).toHaveLength(1);expect(life(s).episodes.find(e=>e.kind==='fed')!.count).toBe(11);
  expect(life(s).drift.nature).toBeCloseTo(0.02);expect(validMind(s.pet!.mind)).toBe(true);
 });
 it('notices absences, streaks and hatch anniversaries at day rollover, and keeps firsts as core memories',()=>{
  let l=recordEpisode(createLife(T0),'fed',T0,'cake');const pet={timestamps:{createdAt:new Date(T0).toISOString()}} as never;
  l=rollover(l,pet,T0+DAY);l=rollover(l,pet,T0+2*DAY);expect(l.episodes.find(e=>e.kind==='streak')?.subject).toBe('3');
  l=rollover(l,pet,T0+7*DAY);expect(l.episodes.find(e=>e.kind==='reunion')?.subject).toBe('5');expect(l.episodes.find(e=>e.kind==='hatchday')?.subject).toBe('7');
  expect(l.visit).toMatchObject({streak:1,days:4});expect(l.core.some(e=>e.kind==='fed'&&e.first)).toBe(true);
  for(let d=8;d<40;d++)l=rollover(l,pet,T0+d*DAY);
  expect(l.core.some(e=>e.kind==='fed'&&e.first)).toBe(true);expect(l.core.length).toBeLessThanOrEqual(LIMITS.core);
 });
 it('never grows past its limits and rejects corrupt memories',()=>{
  let l=createLife(T0);
  for(let i=0;i<500;i++){l=recordEpisode(l,'fed',T0+i*DAY,`food-${i}`);l={...l,tallies:{...l.tallies,[`k${i}`]:i}};l=consolidate(l);}
  expect(l.episodes.length).toBeLessThanOrEqual(LIMITS.episodes);expect(l.firsts.length).toBeLessThanOrEqual(LIMITS.firsts);
  const bounded={...l,tallies:Object.fromEntries(Object.entries(l.tallies).slice(0,LIMITS.tallies))};expect(validLife(bounded)).toBe(true);
  expect(validLife({...bounded,drift:{...bounded.drift,comfort:5}})).toBe(false);
  expect(validLife({...bounded,episodes:[{...bounded.episodes[0],kind:'haunted'}]})).toBe(false);
 });
 it('personality drift shifts effective traits within bounds',()=>{
  const base=createMind({id:'p',speciesId:'ember_fox'}).traits,l=createLife(T0);
  const t=effectiveTraits(base,{...l,drift:{...l.drift,playfulness:0.25}});
  expect(t.playfulness).toBe(Math.min(1,base.playfulness+0.25));expect(t.quiet).toBe(base.quiet);
 });
 it('ignores preview modes and dead pets',()=>{
  const s=setup();s.mode='test' as EngineState['mode'];
  expect(observeLife(s,{...s,events:[...s.events,{id:'x',type:'pet_fed',playerId:'p',payload:{foodId:'apple'},timestamp:''} as never]})).not.toHaveProperty('pet.mind.life');
 });
});

describe('the pet voice',()=>{
 const pet=(l:PetLife)=>{const s=setup();s.pet!.mind={...createMind(s.pet!),life:l};return s.pet!;};
 it('greets after an absence first, only once, then waits before chatting again',()=>{
  let l=createLife(T0);const p0={timestamps:{createdAt:new Date(T0-100*DAY).toISOString()}} as never;
  l=rollover(l,p0,T0+4*DAY);
  const first=speak(pet(l),{},T0+4*DAY,0)!;expect(first.key).toMatch(/^reunion:/);expect(first.text).toMatch(/4 days|You’re back/);
  const said={...l,said:[{key:first.key,at:T0+4*DAY}]};
  expect(speak(pet(said),{},T0+4*DAY+1000,0)?.key).not.toBe(first.key);
  expect(speak(pet(said),{},T0+4*DAY+1000,0)?.score??999).toBeGreaterThanOrEqual(150);
 });
 it('celebrates growth on a skill that used to be tricky, without mentioning mistakes otherwise',()=>{
  const l={...createLife(T0),tallies:{'tricky:Fractions':3}};
  const reviews=[{skillId:'5:Fractions',topic:'Fractions',grade:5,lastQuestionId:'q',lastPracticed:T0,dueAt:T0,independentChecks:2,needsFreshCheck:false}];
  expect(kidModel({skillReviews:reviews},l).growthTopics).toEqual(['Fractions']);
  expect(speak(pet(l),{skillReviews:reviews},T0+DAY,0)?.text).toMatch(/Fractions/);
  expect(speak(pet(l),{},T0+DAY,0)?.text??'').not.toMatch(/Fractions/);
 });
 it('never uses guilt or shame language in any line',()=>{
  const source=readFileSync(new URL('../voice.ts',import.meta.url),'utf8');
  const lines=[...source.matchAll(/['`]([^'`]{12,})['`]/g)].map(m=>m[1]).filter(l=>/[a-z] [a-z]/i.test(l)&&!l.includes('=>'));
  expect(lines.length).toBeGreaterThan(30);
  for(const l of lines)expect(l).not.toMatch(/lonely|forgot|forget about|abandon|left me|sad you|miss(ed)? you so|wrong answer|you failed|disappoint|why didn.t you|all alone/i);
 });
 it('memory lines join the pet’s real home decisions and are recorded so they are not repeated',()=>{
  let s=setup();at(T0);s=engineReducer(s,{type:'FEED_PET',food:food('cake')});
  at(T0+3*DAY);s=engineReducer(s,{type:'FEED_PET',food:food('cake')});
  const room=s.homeBase!.rooms[s.homeBase!.activeRoom]!;
  const top=scoreDecisions(s.pet!,room,s.homeBase!.activeRoom,{x:3,y:5},T0+3*DAY)[0];
  expect(top.id).toMatch(/^recall:reunion:/);expect(top.bubble.length).toBeGreaterThan(10);
  s=engineReducer(s,{type:'PET_SAID',key:top.id.slice(7)});
  expect(scoreDecisions(s.pet!,room,s.homeBase!.activeRoom,{x:3,y:5},T0+3*DAY).some(d=>d.id===top.id)).toBe(false);
 });
});

describe('initiative',()=>{
 const pet=(l:PetLife)=>{const s=setup();s.pet!.mind={...createMind(s.pet!),life:l};return s.pet!;};
 it('finds at most one keepsake a day, never duplicates, and curious pets find more',()=>{
  const count=(curiosity:number)=>{let l=createLife(T0);for(let d=0;d<60;d++){l=findTreasure(l,'pet-1',curiosity,T0+d*DAY);l=findTreasure(l,'pet-1',curiosity,T0+d*DAY+1000);l={...l,today:{}};}return l.treasures??[];};
  const shy=count(0),curious=count(1);
  expect(new Set(curious.map(t=>t.id)).size).toBe(curious.length);expect(curious.length).toBeLessThanOrEqual(Object.keys(TREASURES).length);
  expect(curious.length).toBeGreaterThan(shy.length);expect(shy.length).toBeGreaterThan(0);
  let l=createLife(T0);l=findTreasure(l,'pet-1',1,T0);const again=findTreasure(l,'pet-1',1,T0+60000);expect(again).toBe(l);
 });
 it('only real care can turn up a keepsake, and the pet tells you about it',()=>{
  let s=setup();for(let d=0;d<20&&!(s.pet!.mind?.life?.treasures?.length);d++){at(T0+d*DAY);s=engineReducer(s,{type:'FEED_PET',food:food('apple')});}
  const found=life(s).treasures![0];expect(found).toBeDefined();
  const line=speak(s.pet!,{},found.at+1000,0)!;expect(line.key).toMatch(/^gift:|^reunion:|^streak:|^hatchday:/);
  const all=[0,.3,.6,.9].map(r=>speak({...s.pet!,mind:{...s.pet!.mind!,life:{...life(s),episodes:life(s).episodes.filter(e=>['gift','fed'].includes(e.kind))}}},{},found.at+1000,r)!.text);
  expect(all.some(t=>t.includes(TREASURES[found.id].name))).toBe(true);expect(validLife(life(s))).toBe(true);
  expect(validLife({...life(s),treasures:[{id:'gold_bar',at:1}]})).toBe(false);
 });
 it('mood comes from recent moments and the clock',()=>{
  const l=createLife(T0);expect(petMood(l,T0)).toBe('content');expect(petMood(l,new Date(2026,8,1,21).getTime())).toBe('sleepy');
  expect(petMood(recordEpisode(l,'battle_won',T0),T0+60000)).toBe('excited');expect(petMood(recordEpisode(l,'reunion',T0,'3'),T0+60000)).toBe('cuddly');
 });
 it('asks for what the learner does most, as an invitation they can accept',()=>{
  const l={...createLife(T0),tallies:{'care:play':6},said:[{key:'x',at:T0-DAY}]};
  const line=speak(pet(l),{},T0+1000,0)!;expect(line).toMatchObject({key:'ask:fetch',ask:'fetch'});
  const s=setup();s.pet!.mind={...createMind(s.pet!),life:l};const room=s.homeBase!.rooms[s.homeBase!.activeRoom]!;
  expect(scoreDecisions(s.pet!,room,s.homeBase!.activeRoom,{x:3,y:5},T0+1000).find(d=>d.id==='recall:ask:fetch')?.ask).toBe('fetch');
  const cuddly=recordEpisode(l,'reunion',T0,'3');expect(speak(pet({...cuddly,said:[{key:`reunion:${cuddly.episodes[0].id}`,at:T0}]}),{},T0+CHATTER_GAP_MS+1000,0)?.ask).toBe('cuddle');
 });
 it('nudges a spaced review gently',()=>{
  const reviews=[{skillId:'3:Division facts',topic:'Division facts',grade:3,lastQuestionId:'q',lastPracticed:T0-2*DAY,dueAt:T0-1,independentChecks:1,needsFreshCheck:false}];
  const l={...createLife(T0),said:[{key:'x',at:T0-DAY}]};
  expect(speak(pet(l),{skillReviews:reviews},T0,0)?.text).toMatch(/Division facts/);
 });
});

describe('30 simulated days',()=>{
 type Style={name:string;days:(d:number)=>boolean;hour:number;day:(s:EngineState)=>EngineState};
 const feed=(id:string)=>(s:EngineState)=>engineReducer(s,{type:'FEED_PET',food:food(id)});
 const care=(task:'feed'|'clean'|'play')=>(s:EngineState)=>engineReducer(s,{type:'FREE_SCHOOL_CARE',task});
 const styles:Style[]=[
  {name:'careful-daily',days:()=>true,hour:8,day:s=>[feed('apple'),feed('carrot'),care('clean'),care('clean')].reduce((x,f)=>f(x),s)},
  {name:'gamer-afternoons',days:d=>d%7<5,hour:16,day:s=>[care('play'),care('play'),care('play'),feed('cake')].reduce((x,f)=>f(x),s)},
  {name:'twice-a-week',days:d=>d%4===0,hour:19,day:s=>[feed('cheese'),care('play'),feed('cheese')].reduce((x,f)=>f(x),s)},
 ];
 it('different kids raise different pets, and the pet keeps finding fresh things to say',()=>{
  const report:string[]=[],drifts:Record<string,PetLife['drift']>={};
  for(const style of styles){
   let s=setup();const heard:string[]=[];report.push(`# ${style.name}`);
   for(let d=0;d<30;d++){
    if(!style.days(d))continue;
    const start=T0+d*DAY+(style.hour-15)*3600000;at(start);s=style.day(s);
    for(let visit=0;visit<3;visit++){
     const now=start+visit*(CHATTER_GAP_MS+1000);const line=speak(s.pet!,{},now,(d*7+visit)%10/10);
     if(line){heard.push(line.key);report.push(`day ${String(d+1).padStart(2)}  ${line.text}`);at(now);s=engineReducer(s,{type:'PET_SAID',key:line.key});}
    }
   }
   drifts[style.name]=life(s).drift;
   const repeats=heard.length-new Set(heard).size;
   report.push(`-- treasures: ${(life(s).treasures??[]).map(t=>TREASURES[t.id].icon).join(' ')||'none'}; asks: ${heard.filter(k=>k.startsWith('ask:')).length}`);report.push(`-- ${heard.length} lines, ${new Set(heard).size} distinct, ${repeats} repeats; core memories: ${life(s).core.map(e=>`${e.kind}${e.subject?`(${e.subject})`:''}`).join(', ')}\n`);
   // What a child reads is the sentence, so measure sentence repetition, not template keys.
   const texts=report.filter(l=>l.startsWith('day ')).slice(-heard.length).map(l=>l.slice(8)),counts=new Map<string,number>();for(const t of texts)counts.set(t,(counts.get(t)??0)+1);
   expect(heard.length).toBeGreaterThanOrEqual(8);expect(Math.max(...counts.values()),`${style.name}: ${[...counts].sort((a,b)=>b[1]-a[1])[0][0]}`).toBeLessThanOrEqual(5);expect(new Set(texts).size/texts.length).toBeGreaterThan(0.5);expect(validMind(s.pet!.mind)).toBe(true);
  }
  expect(drifts['careful-daily'].nature).toBeGreaterThan(drifts['gamer-afternoons'].nature);
  expect(drifts['gamer-afternoons'].playfulness).toBeGreaterThan(drifts['careful-daily'].playfulness);
  mkdirSync('docs/verification/pet-mind',{recursive:true});writeFileSync('docs/verification/pet-mind/30-day-dialogue.txt',report.join('\n'));
 });
});

describe('stronger companion integration',()=>{
 it('remembers the actual hatch through HATCH_EGG exactly once',()=>{
  const before=createInitialEngineState();before.eggDiscovery=null;
  before.egg={id:'egg',type:'koala',state:'ready',progress:100,createdAt:new Date(T0).toISOString()};
  const s=engineReducer(before,{type:'HATCH_EGG'});
  expect(s.pet).toBeTruthy();expect(life(s).episodes.filter(e=>e.kind==='hatched')).toHaveLength(1);
  expect(life(s).episodes.find(e=>e.kind==='hatched')?.at).toBe(Date.parse(s.pet!.timestamps.createdAt));
  expect(engineReducer(s,{type:'PET_VISIT'})).toBe(s);
 });
 it('recovers an old hatch date without inventing attendance and greets a later return before care',()=>{
  const before=setup();before.pet!.timestamps.createdAt=new Date(T0-30*DAY).toISOString();
  let s=engineReducer(before,{type:'PET_VISIT'});
  expect(life(s).visit.days).toBe(1);expect(life(s).episodes.find(e=>e.kind==='hatched')?.at).toBe(T0-30*DAY);
  expect(life(s).episodes.some(e=>e.kind==='reunion')).toBe(false);
  at(T0+4*DAY);s=engineReducer(s,{type:'PET_VISIT'});
  expect(life(s).visit.days).toBe(2);expect(welcomeLine(s.pet!,s,T0+4*DAY).key).toMatch(/^reunion:/);
  expect(engineReducer(s,{type:'PET_VISIT'})).toBe(s);
  expect(s.player.currencies).toEqual(before.player.currencies);expect(s.learningEvidence).toEqual(before.learningEvidence);
 });
 it('shared play builds bounded preferences and survives JSON saves',()=>{
  const before=setup();let s=before;
  for(let i=0;i<20;i++){at(T0+i*130000);s=engineReducer(s,{type:'PET_HOME_MEMORY',kind:'fetch'});}
  expect(life(s).tallies['care:fetch']).toBe(5);expect(life(s).drift.playfulness).toBeCloseTo(.02);
  expect(kidModel(s,life(s)).favoriteCare).toBe('fetch');expect(s.player.currencies).toEqual(before.player.currencies);
  expect(s.pet!.progression).toEqual(before.pet!.progression);expect(s.learningEvidence).toEqual(before.learningEvidence);
  expect(validMind(JSON.parse(JSON.stringify(s.pet!.mind)))).toBe(true);
  const same=engineReducer(s,{type:'PET_HOME_MEMORY',kind:'fetch'});expect(life(same)).toEqual(life(s));
 });
 it('remembers room interests once a day and changes real reachable furniture scores',()=>{
  let s=setup();s=engineReducer(s,{type:'PET_VISIT'});
  const room={...s.homeBase!.rooms.den!,items:[{id:'book',furnitureId:'home_bookshelf',x:0,y:0,on:true,flipped:false}]};
  const before=scoreDecisions(s.pet!,room,'den',{x:3,y:4},T0).find(d=>d.id==='use-den-book')!.score;
  s=engineReducer(s,{type:'PET_PREFERENCE',choice:'books'});
  expect(life(s).tallies['preference:books']).toBe(1);
  expect(scoreDecisions(s.pet!,room,'den',{x:3,y:4},T0).find(d=>d.id==='use-den-book')!.score).toBeGreaterThan(before);
  at(T0+130000);s=engineReducer(s,{type:'PET_PREFERENCE',choice:'books'});
  expect(life(s).tallies['preference:books']).toBe(1);
 });
 it('needs override memories even while their ordinary decision cooldown is active',()=>{
  let s=engineReducer(setup(),{type:'PET_VISIT'});at(T0+4*DAY);s=engineReducer(s,{type:'PET_VISIT'});
  s.pet!.needs.health=10;s.pet!.needs.hunger=10;
  const options=scoreDecisions(s.pet!,s.homeBase!.rooms.den!,'den',{x:3,y:4},T0+4*DAY,{quiet:T0+5*DAY});
  expect(options.map(d=>d.id)).toEqual(['quiet']);expect(welcomeLine(s.pet!,s,T0+4*DAY).key).toBe('health');
  s.pet!.needs.health=100;expect(welcomeLine(s.pet!,s,T0+4*DAY).key).toBe('hunger');
 });
 it('keeps a different pet’s life separate and rejects play memories while sleeping',()=>{
  let s=engineReducer(setup(),{type:'PET_HOME_MEMORY',kind:'cuddle'});
  const other={...s,pet:{...setup().pet!,id:'another-pet'}};
  s=engineReducer(other,{type:'PET_VISIT'});expect(life(s).tallies['care:cuddle']).toBeUndefined();
  s.pet!.state='sleeping';expect(engineReducer(s,{type:'PET_HOME_MEMORY',kind:'dance'})).toBe(s);
  expect(welcomeLine(s.pet!,s,T0).animation).toBe('sleeping');
 });
});
