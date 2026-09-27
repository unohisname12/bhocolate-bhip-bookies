import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { ScreenName } from '../../types/session';
import { discoveryDays } from '../../services/game/eggDiscovery';
import { careDate } from '../../services/game/petGrowth';
export type Destination = 'today'|'pet'|'games'|'together'|'rewards'|'activity';
export interface Intent { label:string; action?:GameEngineAction; hash?:string; view?:Destination; resume?:boolean; callback?:()=>void; purpose?:'play'|'learning'; history?:boolean }
export const activityNames:Partial<Record<ScreenName,string>>={pet_arena:'Pet battle',math:'Math Practice',catch_math:'Catch Math',discovery:'Egg questions',incubation:'Egg nursery',momentum:'Momentum',battle:'Pet battle',number_merge:'Number Merge',pet_care:'Pet care',feeding:'Feeding',home_builder:'Home Base',growth:'Companion growth',woodland:'Woodland Bridge',first_adventure:'First Adventure',arcade:'Arcade',home:'My companion',shop:'Shop',quest_log:'Quests',season_pass:'Season rewards',gacha:'Cosmetics',power_forge:'Power Forge',class_roster:'Practice rivals',match_result:'Battle results',run_start:'Dungeon adventure'};
export function runScreen(state:EngineState):ScreenName {
 if(!state.run.active)return 'run_start';
 return ({map_select:'run_map',encounter_preview:'run_encounter',in_battle:'battle',reward_pick:'run_reward',rest_node:'run_rest',event_choice:'run_event',run_victory:'run_over',run_defeat:'run_over',not_started:'run_start'} as const)[state.run.phase];
}
export function exclusiveActivity(s:EngineState){
 const open:{label:string;screen:ScreenName;ends:GameEngineAction[];consequence:string}[]=[];
 if(s.pendingBattleWarmup)open.push({label:'Battle preparation',screen:'home',ends:[{type:'CANCEL_BATTLE_WARMUP'}],consequence:'This cancels the unstarted battle. Your recorded practice and possessions are kept.'});
 if(s.run.active)open.push({label:'Dungeon adventure',screen:runScreen(s),ends:[{type:'END_RUN'}],consequence:'This ends your current dungeon run. Rewards for completed encounters follow the normal end-run rules; possessions already earned stay yours.'});
 else if(s.battle.active)open.push({label:'Pet battle',screen:'battle',ends:[{type:['victory','defeat'].includes(s.battle.phase)?'END_BATTLE':'FLEE_BATTLE'}],consequence:s.battle.pvpMeta?'Leaving uses the normal retreat rule and may cost staked tokens. Existing pets and possessions are kept.':['victory','defeat'].includes(s.battle.phase)?'Your finished battle will be settled once before switching.':'This ends the current fight without a win prize. Existing pets and possessions are kept.'});
 if(s.momentum.active)open.push({label:'Momentum',screen:'momentum',ends:[{type:'END_MOMENTUM'}],consequence:s.momentum.rewards?'Your finished board rewards will be settled once.':'This ends the current board without a win prize. Existing rewards stay yours.'});
 if(open.length<2)return open[0]??null;
 // Older menu paths could leave more than one exclusive activity open. End only
 // these named activities, with normal settlement, after the child's confirmation.
 return {label:open.map(x=>x.label).join(' + '),screen:open[0].screen,ends:open.flatMap(x=>x.ends),consequence:open.map(x=>`${x.label}: ${x.consequence}`).join(' ')};
}
export function nextEgg(s:EngineState,now=Date.now()):{title:string;detail:string;button:string;intent:Intent}|null{
 if(s.pet&&!s.egg)return null; // The active companion takes priority; new discovery stays in the nursery.
 const d=s.eggDiscovery;
 if(s.egg)return {title:s.egg.state==='ready'?'Your egg is ready to hatch!':'Your egg is in the nursery.',detail:s.egg.state==='ready'?'Open the nursery and press Hatch my pet.':'Open the nursery. Tap the egg until warmth reaches 100%, then press Hatch my pet.',button:s.egg.state==='ready'?'Hatch my pet':'Warm my egg',intent:{label:'Egg nursery',action:{type:'SET_SCREEN',screen:'incubation'}}};
 if(!d||d.status==='claimed')return null;
 const days=discoveryDays(d,now);
 if(d.status==='matched')return {title:'Meet your new companion.',detail:'Your match is saved. Bring the egg to the nursery next.',button:'Bring my egg to the nursery',intent:{label:'Egg nursery',action:{type:'CLAIM_DISCOVERY_EGG'}}};
 if(days>=5)return {title:'Your egg is ready!',detail:'Five activity days are complete. Reveal your companion.',button:'Reveal my companion',intent:{label:'Reveal my companion',action:{type:'REVEAL_DISCOVERY_EGG'}}};
 if(d.stamps.some(x=>x.day===careDate(now)))return {title:'Today is complete!',detail:`${days} of 5 days earned. Your next stamp is available on another activity date.`,button:'View my egg',intent:{label:'My egg',action:{type:'SET_SCREEN',screen:'discovery'}}};
 const mission=d.mission?.day===careDate(now)?d.mission:null;
 return {title:`Help your egg grow · Day ${days+1} of 5`,detail:mission?`Continue question ${mission.index+1} of 3. Your earlier answers are saved.`:'Answer 3 questions. Take your time, use help, and try again.',button:mission?'Continue today’s questions':'Start today’s questions',intent:{label:'Today’s egg questions',action:{type:'START_DISCOVERY_MISSION',style:mission?.style??(['explore','build','help','wonder'] as const)[days%4]}}};
}
export function isNavigation(a:GameEngineAction){return a.type==='SET_SCREEN'||['START_BATTLE','START_BATTLE_WITH_CHARACTER','START_PVP_BATTLE','START_MOMENTUM','START_RUN','START_DISCOVERY_MISSION','REVEAL_DISCOVERY_EGG','CLAIM_DISCOVERY_EGG','START_EGG_DISCOVERY','OPEN_WOODLAND','HOME_OPEN','START_FIRST_ADVENTURE'].includes(a.type);}
export function navLabel(a:GameEngineAction){return a.type==='SET_SCREEN'?(activityNames[a.screen]??'Your activity'):({START_MOMENTUM:'Momentum',START_BATTLE:'Pet battle',START_RUN:'Dungeon adventure',START_DISCOVERY_MISSION:'Today’s egg questions',REVEAL_DISCOVERY_EGG:'Reveal my companion',CLAIM_DISCOVERY_EGG:'Egg nursery',OPEN_WOODLAND:'Woodland Bridge',HOME_OPEN:'Home Base'} as Record<string,string>)[a.type]??'Your next activity';}

/** Stable activity identity: opening a lobby and starting its round share one check. */
export function checkActivity(i: Intent, state: EngineState): string | undefined {
 if(i.callback)return i.purpose==='learning'?undefined:'classroom';
 const a=i.action;if(!a)return;
 if(a.type==='ARCADE_START')return a.game;
 if(a.type==='ARCADE_RETRY')return state.arcade?.run?.game;
 if(['START_BATTLE','START_BATTLE_WITH_CHARACTER','START_PVP_BATTLE'].includes(a.type))return state.run.active?'dungeon':'battle';
 if(a.type==='START_MOMENTUM')return 'momentum';
 if(a.type==='START_RUN')return 'dungeon';
 if(a.type==='OPEN_WOODLAND')return 'woodland';
 if(a.type==='START_FIRST_ADVENTURE')return 'first_adventure';
 if(a.type!=='SET_SCREEN')return;
 if(a.screen==='arcade'){
  const route=i.hash??(i.resume?state.activityRoute:undefined);
  if(route==='arcade-shop')return;
  if(route==='delivery')return 'delivery';
  if(route?.startsWith('arcade-'))return route.slice(7);
  return state.arcade?.run?.game; // Generic arcade browsing is not a game start.
 }
 if(a.screen.startsWith('run_'))return 'dungeon';
 if(a.screen==='battle'&&state.run.active)return 'dungeon';
 if(a.screen==='pet_arena')return 'battle';
 if(['math','catch_math','number_merge','momentum','battle','woodland','first_adventure'].includes(a.screen))return a.screen;
}
