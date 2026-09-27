import type { PartyState } from '../classroom-party/model';
import { teacherPrize } from './prizeCatalog';
/** One selected gift per joined learner, applied only by the server at game start. */
export function applyPartyPrize(state:PartyState,studentId:string,prizeId:string):PartyState {
 const prize=teacherPrize(prizeId);
 if(!prize||prize.effect!=='party'||prize.target!==state.game||state.phase!=='playing'||!state.members.some(m=>m.id===studentId&&m.status==='joined'))return state;
 if(state.game==='dash')return {...state,members:state.members.map(m=>m.id===studentId&&m.racer?{...m,racer:{...m.racer,health:m.racer.health+(prizeId.endsWith('heart')?prize.amount:0),score:m.racer.score+(prizeId.endsWith('stars')?prize.amount:0)}}:m)};
 const run={...state.run};
 if(prizeId==='gift_party_guard_energy')run.energy+=prize.amount;
 if(prizeId==='gift_party_guard_heart')run.health+=prize.amount;
 if(prizeId==='gift_party_cafe_stock')run.stock=run.stock.map(n=>n+prize.amount);
 if(prizeId==='gift_party_cafe_score')run.score+=prize.amount;
 return {...state,run};
}
