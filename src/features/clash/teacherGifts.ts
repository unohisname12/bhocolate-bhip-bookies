import { addTokens, TOKENS_PER_CHARGE, TOKENS_PER_MEDAL, TOKENS_PER_STAR } from '../../services/game/wallet';
import { discoveryDays } from '../../services/game/eggDiscovery';
import type { EngineState } from '../../types/engine';
import { teacherPrize } from './prizeCatalog';
import { prizeProgress, grantCollectible } from './rewards';
import { createHomeBase, ownsFurniture } from '../home-base/model';
import { furniture } from '../home-base/catalog';
export function grantTeacherGift(state:EngineState, grantId:string, prizeId:string):EngineState {
 const gift=teacherPrize(prizeId),p=prizeProgress(state);
 if(!gift||p.teacherClaims?.includes(grantId))return state;
 let next:EngineState={...state,prizes:{...p,teacherClaims:[...(p.teacherClaims??[]),grantId]}};
 if(gift.effect==='furniture'){
  if(ownsFurniture(next,gift.target!))next=grantCollectible(next);
  else if(furniture(gift.target!)?.prize)next=grantCollectible(next,gift.target);
  else {const home=next.homeBase??createHomeBase(next);next={...next,homeBase:{...home,owned:[...home.owned,gift.target!]}};}
 }else if(gift.effect==='cosmetic')next=grantCollectible(next,undefined,gift.target);
 else if(gift.effect==='tokens'||gift.effect==='shards')next={...next,player:{...next.player,currencies:{...next.player.currencies,[gift.effect]:next.player.currencies[gift.effect]+gift.amount}}};
 // Retired currencies: gifts already waiting in an inbox pay out their token value.
 else if(gift.effect==='stars')next=addTokens(next,gift.amount*TOKENS_PER_STAR);
 else if(gift.effect==='charges')next=addTokens(next,gift.amount*TOKENS_PER_CHARGE);
 else if(gift.effect==='medals')next=addTokens(next,gift.amount*TOKENS_PER_MEDAL);
 else if(gift.effect==='attack'||gift.effect==='defense')next={...next,prizes:{...prizeProgress(next),boosts:{...p.boosts,[gift.effect]:p.boosts[gift.effect]+gift.amount}}};
 else if(gift.effect==='hatch')next={...next,prizes:{...prizeProgress(next),earlyHatchPasses:(p.earlyHatchPasses??0)+1}};
 return {...next,notifications:[...next.notifications,{id:`teacher-${grantId}`,timestamp:Date.now(),icon:'/assets/generated/final/reward_trophy_gold.png',message:`Teacher prize: ${gift.name}! ${gift.description}`}].slice(-30)};
}
export function useEarlyHatchPass(state:EngineState):EngineState {
 const d=state.eggDiscovery,p=prizeProgress(state);
 if(!d||d.status!=='collecting'||discoveryDays(d)>=5||d.bonusDays||!(p.earlyHatchPasses??0)||state.battle.active||state.run.active||state.momentum.active)return state;
 return {...state,eggDiscovery:{...d,bonusDays:1},prizes:{...p,earlyHatchPasses:p.earlyHatchPasses!-1}};
}
