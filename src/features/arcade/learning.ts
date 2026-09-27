import type { MathProblem } from '../../types';
import type { LearningSettings } from '../../services/game/curriculum';
import { quantityDecision, hasQuantitySkill } from '../learning/decisions';
import { cafeTarget } from './catalog';
import { buildCost, RECIPES, type ArcadeRun, type Tower, type ArcadeGame } from './model';
export type ArcadePlan = {kind:'serve'} | {kind:'batch'} | {kind:'recipe-batch';servings:number} | {kind:'build-row';tower:Tower;reserve:number} | {kind:'build'; slot:number; tower:Tower};
export interface PendingArcadePlan { problem:MathProblem; move:ArcadePlan }
const assigned=(settings:LearningSettings,grade:number,topic:string)=>settings.grade===grade&&(settings.topic==='mixed'||settings.topic===topic);
export const supportsLearningRun = (game:ArcadeGame, settings:LearningSettings) => game!=='dash' && (hasQuantitySkill(settings) || game==='cafe'&&(assigned(settings,5,'Fraction of a quantity')||assigned(settings,6,'Ratios')||assigned(settings,6,'Fraction division')||assigned(settings,7,'Percentages')||assigned(settings,7,'Proportional relationships')) || game==='guard'&&(assigned(settings,8,'Linear equations')||assigned(settings,8,'Linear functions')));
export function arcadeDecision(r:ArcadeRun, settings:LearningSettings, move:ArcadePlan): PendingArcadePlan | null {
  const id = `arc-plan:${r.learningRunId ?? r.seed}:${r.step}:${r.learningSolved ?? 0}:${JSON.stringify(move)}:${r.selected}:${r.stock.join(',')}:${r.energy}`;
  const task=(topic:string,templateId:string,question:string,answer:number,hint:string,explanation:string[]):PendingArcadePlan=>({move,problem:{id,practiceSettings:settings,grade:settings.grade,topic,type:topic,skillId:`${settings.grade}:${topic}`,context:r.game==='cafe'?'nest-cafe':'shellguard',templateId,difficulty:1,reward:0,question,answer,hint,explanation}});
  const percentage=(used:number,total:number,unit:string,action:string)=>{
    const answer=Math.round(1000*used/total)/10;
    return task('Percentages','recipe-stock-percent-v1',`${action} This uses ${used} of your ${total} ${unit}. What percentage of that stock will you use? Round to the nearest tenth of a percent; enter the number without the % sign.`,answer,'Divide the amount used by the starting stock, then multiply by 100.',[`${used} ÷ ${total} × 100 ≈ ${answer}%.`,`${total-used} ${unit} will remain after the planned serving. The percentage describes this actual stock change.`]);
  };
  if(move.kind==='build-row') {
    if(r.game!=='guard'||!assigned(settings,8,'Linear equations')||r.step%16!==0||r.enemies.length||!['rapid','frost','shield'].includes(move.tower)||!Number.isSafeInteger(move.reserve)||move.reserve<=0)return null;
    const count=(r.energy-move.reserve)/4;
    if(!Number.isInteger(count)||count<1||count>r.towers.filter(t=>t===null).length)return null;
    return task('Linear equations','defense-reserve-v1',`Keep ${move.reserve} energy in reserve and spend the rest on new ${move.tower} towers at 4 energy each. Your budget is ${r.energy}. How many towers can you build? Model: 4x + ${move.reserve} = ${r.energy}.`,count,'Remove the reserve before dividing the building budget by the cost of one tower.',[`${r.energy} − ${move.reserve} = ${r.energy-move.reserve}; divide by 4 to build ${count} towers.`,`${count} × 4 + ${move.reserve} = ${r.energy}. Your reserve stays available for later upgrades.`]);
  }
  if(move.kind==='recipe-batch') {
    if(r.game!=='cafe'||!Number.isInteger(move.servings)||move.servings<2||move.servings>3||r.step+move.servings>cafeTarget(r.level))return null;
    const recipe=RECIPES[r.orders[r.selected]],counts=[0,1,2].map(i=>recipe.parts.filter(p=>p===i).length);
    if(counts.some((n,i)=>n*move.servings>r.stock[i]))return null;
    const ingredient=counts.findIndex(n=>n>0),per=counts[ingredient],used=per*move.servings,total=r.stock[ingredient],unit=['berries','bread portions','honey portions'][ingredient];
    if(settings.grade===6&&settings.topic==='Fraction division')return task('Fraction division','recipe-capacity-v1',`You chose ${move.servings} servings of ${recipe.name}. Each serving uses ${per}/${total} of your ${unit} stock. How many servings could that stock alone support, including a fractional serving? Calculate 1 ÷ (${per}/${total}).`,total/per,'Divide one whole stock by the fraction needed for one serving.',[`1 ÷ (${per}/${total}) = ${total}/${per} servings.`,`This chosen batch uses ${used} ${unit}, leaving ${total-used}. Other ingredients may limit total capacity.`]);
    if(settings.grade===7&&settings.topic==='Proportional relationships')return task('Proportional relationships','recipe-proportion-v1',`For ${recipe.name}, ingredient use is proportional to servings: y = ${per}x ${unit}. Predict y for your chosen ${move.servings} servings.`,used,'Multiply the constant of proportionality by the number of servings.',[`y = ${per} × ${move.servings} = ${used} ${unit}.`,`${total-used} ${unit} remain after the batch.`]);
    if(assigned(settings,7,'Percentages'))return percentage(used,total,unit,`Prepare ${move.servings} servings of ${recipe.name}.`);
    if(assigned(settings,5,'Fraction of a quantity')) {
      let a=used,b=total;while(b){const next=a%b;a=b;b=next;}
      const n=used/a,d=total/a;if(d===1)return null;
      return task('Fraction of a quantity','recipe-stock-fraction-v1',`Prepare ${move.servings} servings of ${recipe.name}. This batch uses ${n}/${d} of your ${total} ${unit}. How many ${unit} should go into the batch?`,used,'Split the whole stock into equal shares using the denominator, then take the numerator’s number of shares.',[`${total} ÷ ${d} × ${n} = ${used} ${unit} for the batch.`,`${move.servings} servings × ${per} ${unit} per serving = ${used}; ${total-used} ${unit} remain.`]);
    }
    if(assigned(settings,6,'Ratios')||assigned(settings,6,'Fraction division')||assigned(settings,7,'Percentages')||assigned(settings,7,'Proportional relationships'))return task('Ratios','recipe-scaling-v1',`One serving of ${recipe.name} uses ${per} ${unit}. You chose a batch of ${move.servings} servings. How many ${unit} should you prepare at the same recipe ratio?`,used,'Scale both the number of servings and the ingredient amount by the same factor.',[`${per} ${unit} per serving × ${move.servings} servings = ${used} ${unit}.`,`${total} − ${used} = ${total-used} ${unit} left in stock.`]);
    return null;
  }
  if(move.kind==='build') {
    if(r.game!=='guard' || r.step%16!==0 || r.enemies.length || !Number.isInteger(move.slot) || move.slot<0 || move.slot>2 || !['rapid','frost','shield'].includes(move.tower)) return null;
    const cost=buildCost(r,move.slot,move.tower);
    if(r.energy<cost || r.towers[move.slot]===move.tower && (r.towerLevels?.[move.slot]??1)>=3)return null;
    if(settings.grade===8&&settings.topic==='Linear functions')return task('Linear functions','defense-function-v1',`Your energy after this build follows E(x) = ${r.energy} − ${cost}x, where x counts this ${move.tower} build or upgrade. Evaluate E(1) to predict the remaining energy.`,r.energy-cost,'Substitute x = 1 into the energy function.',[`E(1) = ${r.energy} − ${cost} × 1 = ${r.energy-cost}.`,`This move costs ${cost}; ${r.energy-cost} energy remains for later decisions.`]);
    const problem=quantityDecision(settings,id,'shellguard',r.energy,cost,'energy',`Prepare ${move.tower} on plot ${move.slot+1}.`);
    return problem?{problem,move}:null;
  }
  if(r.game!=='cafe')return null;
  const recipe=RECIPES[r.orders[r.selected]];
  const batch=move.kind==='batch';
  if(batch && r.step+3>cafeTarget(r.level))return null;
  if(!batch && recipe.parts.join()!==r.tray.join())return null;
  const parts=batch?r.orders.flatMap(i=>RECIPES[i].parts):recipe.parts;
  const counts=[0,1,2].map(i=>parts.filter(p=>p===i).length);
  if(counts.some((n,i)=>n>r.stock[i]))return null;
  const single=settings.grade===1;
  const ingredient=counts.findIndex(n=>n>0);
  const total=single?r.stock[ingredient]:r.stock.reduce((a,b)=>a+b,0), used=single?counts[ingredient]:parts.length;
  const unit=single?['berries','bread portions','honey portions'][ingredient]:'ingredient portions';
  if(assigned(settings,7,'Percentages'))return percentage(used,total,unit,batch?'Prepare the three current orders.':`Serve ${recipe.name}.`);
  const problem=quantityDecision(settings,id,'nest-cafe',total,used,unit,batch?'Prepare the three current orders as one batch.':`Serve ${recipe.name} to customer ${r.selected+1}.`);
  return problem?{problem,move}:null;
}

export function validPendingPlan(r:ArcadeRun): boolean {
  const p=r.pendingPlan;if(!p)return true;
  const grade=p.problem?.grade,topic=p.problem?.topic;
  if(typeof grade!=='number'||!Number.isInteger(grade)||grade<0||grade>12||typeof topic!=='string')return false;
  try {
    const expected=arcadeDecision(r,{grade:grade!,topic,challenge:'standard',timedWarmup:false},p.move);
    return !!expected && expected.problem.id===p.problem.id && expected.problem.question===p.problem.question && expected.problem.answer===p.problem.answer;
  } catch {return false;}
}
