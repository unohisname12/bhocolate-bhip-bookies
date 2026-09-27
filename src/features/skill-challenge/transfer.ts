import {getSkill} from './catalog';
import type {Challenge} from '../../services/game/curriculum';
import type {LearningProblem} from './lessons';

/** Reviewed different-use families for the three initial deep paths.
 * These change the mathematical presentation/unknown, not just nouns.
 * They remain selected objectives, not a claim of complete K–12 coverage. */
export function deepTransfer(id:string,level:Challenge,index:number,r:()=>number):LearningProblem|null {
 const skill=getSkill(id);if(!skill)return null;
 const {grade:g,variant:v}=skill,limit=level==='support'?5:level==='stretch'?12:9;
 const int=(lo:number,hi:number)=>lo+Math.floor(r()*(hi-lo+1));
 const a=int(2,limit),b=int(3,limit+1),c=int(1,4),alternate=index%2===1;
 const make=(form:string,text:string,answer:number,explanation:string,reasonPrompt:string):LearningProblem=>({text,answer,explanation,hint:'Describe the relationship between the known quantities and the unknown.',hints:[],guided:false,templateId:`${id}:transfer-v3:${form}`,representation:form,reasonPrompt,outcome:'Your teacher reviews the calculation and your explanation separately.'});
 if(g===5&&v===3)return alternate
  ?make('error-analysis',`A ribbon is ${a*b} cm long. Mina says 1/${b} of it is ${a*b*b} cm because she multiplied by ${b}. What is the correct length of 1/${b} of the ribbon?`,a,`${a*b} ÷ ${b} = ${a} cm. One share of a positive whole must be smaller than the whole.`,'Why must one share be smaller than the original ribbon?')
  :make('bar-model',`A bar represents ${a*b} minutes. It is split into ${b} equal sections, with one section shaded. How many minutes does the shaded section represent?`,a,`${a*b} ÷ ${b} = ${a} minutes.`,'How do equal sections connect to the denominator?');
 if(g===5&&v===4)return alternate
  ?make('complement-model',`A tank holds ${a*b} liters when full. After a trip, 1/${b} of the full amount remains. How many liters were used?`,a*(b-1),`The used fraction is ${b-1}/${b}. ${a*b} ÷ ${b} × ${b-1} = ${a*(b-1)} liters.`,'Which fraction represents the amount used, and why?')
  :make('bar-model',`A timeline covers ${a*b} minutes in ${b} equal sections. The first ${b-1} sections are shaded for reading. How many minutes are spent reading?`,a*(b-1),`Each section is ${a} minutes; ${b-1} sections take ${a*(b-1)} minutes.`,'How could you find the shaded amount using the unshaded section?');
 if(g===5&&v===5)return alternate
  ?make('changed-representation',`A trip meter shows ${a} km completed and says that is 1/${b} of the whole route. How long is the whole route?`,a*b,`${a} × ${b} = ${a*b} km.`,'Why would dividing the completed distance by the denominator give the wrong whole?')
  :make('bar-model',`A strip is divided into ${b} equal sections. One section is labeled ${a} cm. What length does the whole strip represent?`,a*b,`${b} equal sections × ${a} cm = ${a*b} cm.`,'What is known: one share or the whole?');
 if(g===6&&v===0)return alternate
  ?make('rate-comparison',`Machine A prints ${a*b} pages in ${b} minutes. Machine B prints ${(a+c)*(b+1)} pages in ${b+1} minutes. Both have constant speeds. How many more pages per minute does B print than A?`,c,`A: ${a*b} ÷ ${b} = ${a}. B: ${(a+c)*(b+1)} ÷ ${b+1} = ${a+c}. Difference: ${c} pages per minute.`,'Why compare pages per minute instead of the total pages?')
  :make('changed-representation',`On a distance–time graph, a straight line from the origin passes through (${b} hours, ${a*b} km). What distance does the line show at 1 hour?`,a,`${a*b} ÷ ${b} = ${a} km in one hour.`,'Why does passing through the origin matter for this constant rate?');
 if(g===6&&v===1)return alternate
  ?make('error-analysis',`A paint mix has red:white = ${a}:${b}. A larger mix has ${a*3} cups of red. Sam adds ${a*2} to both original amounts. How many cups of white are actually needed to keep the same color?`,b*3,`Red was multiplied by 3; white must also be multiplied by 3: ${b*3} cups.`,'Why does adding the same amount usually change the ratio?')
  :make('ratio-model',`Every group in a tile pattern has ${a} dark tiles and ${b} light tiles. A display has ${a*(c+1)} dark tiles. How many light tiles complete the same pattern?`,b*(c+1),`There are ${c+1} groups, so ${b} × ${c+1} = ${b*(c+1)} light tiles.`,'Which quantity tells you how many equal groups there are?');
 if(g===6&&v===2)return alternate
  ?make('changed-context',`A pump fills ${a*b} liters in ${b} minutes at a constant rate. How many liters will it fill in ${b+c} minutes?`,a*(b+c),`${a*b} ÷ ${b} = ${a} liters per minute; ${a} × ${b+c} = ${a*(b+c)} liters.`,'What stays constant when the duration changes?')
  :make('error-analysis',`A printer uses ${a*b} grams of material for ${b} identical parts. Jo says ${b+2} parts need only 2 grams more. What is the correct total material for ${b+2} parts?`,a*(b+2),`Each part uses ${a} grams; ${b+2} parts use ${a*(b+2)} grams.`,'Why do two extra parts require more than two extra grams?');
 if(g===8&&v===0)return alternate
  ?make('changed-unknown',`A receipt totals ${a*b+c} dollars for ${b} identical tickets plus a ${c}-dollar booking fee. What is the price of one ticket? Write an equation with the unknown ticket price.`,a,`${b}x + ${c} = ${a*b+c}; x = (${a*b+c} − ${c}) / ${b} = ${a}.`,'What does the unknown represent on this receipt?')
  :make('changed-operation',`A group buys ${b} identical notebooks and uses a ${c}-dollar discount on the total. They pay ${a*b-c} dollars. What was the price of one notebook before the discount?`,a,`${b}x − ${c} = ${a*b-c}; add ${c}, then divide by ${b}: x = ${a}.`,'Why do you add the discount back before dividing?');
 if(g===8&&v===1)return alternate
  ?make('changed-representation',`A rectangle is ${b} meters wide. Its length is x + ${c} meters and its area is ${b*(a+c)} square meters. What is x?`,a,`${b}(x + ${c}) = ${b*(a+c)}; x = ${a}.`,'Why is the extra length inside the parentheses?')
  :make('changed-operation',`${b} tickets each cost x dollars before a ${c}-dollar discount on EACH ticket. The total paid is ${a*b} dollars. What was the original price x?`,a+c,`${b}(x − ${c}) = ${a*b}; x − ${c} = ${a}; x = ${a+c}.`,'How would the equation change if the discount applied once to the whole order?');
 if(g===8&&v===2)return make(alternate?'balance-model':'plan-comparison',alternate
  ?`A balanced scale has ${b+c} identical packets and ${c} grams on the left. The right has ${b} of the same packets and ${a*c+c} grams. How many grams does one packet weigh?`
  :`Plan A costs ${b+c} dollars per hour plus a ${c}-dollar fee. Plan B costs ${b} dollars per hour plus a ${a*c+c}-dollar fee. After how many hours are the costs equal?`,a,`${b+c}x + ${c} = ${b}x + ${a*c+c}; ${c}x = ${a*c}; x = ${a}.`,'Which terms can you remove from both sides while keeping the relationship equal?');
 return null;
}
