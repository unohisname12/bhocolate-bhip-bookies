import type {Pet} from '../../types';
import {petVisualKey} from '../../config/companionConfig';
import {moveName} from '../pet-identity/model';
import {type Branch,type Move,type Style,type Encounter,type Perk,PRESETS} from './catalog';
export interface Build {talents:Record<Branch,number>;charm:string|null;badge:string|null;tool:string}
export const emptyBuild=():Build=>({talents:{guardian:0,striker:0,tactician:0},charm:null,badge:null,tool:'snack'});
export function preset(branch:Branch,points=6):Build{const p=PRESETS[branch],b=emptyBuild();b.talents[branch]=Math.min(4,points);b.talents[p.secondary]=Math.max(0,points-4);return {...b,charm:p.charm,badge:p.badge,tool:p.tool};}
export interface Fighter {id:string;name:string;species:string;signature:string;trait:'resilient'|'spirited'|'nimble';level:number;maxHP:number;hp:number;attack:number;energy:number;shield:number;guard:boolean;weaken:boolean;focused:boolean;counter:boolean;combo:number;lastAttack:string;plans:number;strikes:number;used:string[];build:Build;blocked:number;dealt:number;healed:number}
export interface CombatEvent {actor:0|1;kind:'damage'|'shield'|'heal'|'energy'|'status';amount?:number;text:string}
export interface Fight {version:1;id:string;round:number;phase:'active'|'won'|'lost'|'draw'|'retreated';fighters:[Fighter,Fighter];intent:Move;style:Style;boss:boolean;seed:number;events:CombatEvent[];history:CombatEvent[];rewarded:boolean;mode:'campaign'|'practice'|'expedition'|'challenge';encounter:number;startLevel:number;challenge?:number;result?:{xp:number;mp:number;levelBefore:number;levelAfter:number;first:boolean}}
export function traitFor(species:string):Fighter['trait']{let n=0;for(const c of species)n+=c.charCodeAt(0);return (['resilient','spirited','nimble'] as const)[n%3];}
export const TRAITS={resilient:'Resilient · start with 5 shield',spirited:'Spirited · start with 5 extra energy',nimble:'Nimble · your first Strike gains 10% damage'};
export function fighter(pet:Pet,build:Build,options:{fair?:boolean;perks?:Perk[];training?:number}={}):Fighter{
 const level=options.fair?10:Math.min(20,Math.max(1,pet.progression.level)),trait=traitFor(pet.speciesId),perks=options.perks??[];
 const maxHP=100+level*5+(build.charm==='heart'?12:0)+perks.filter(p=>p==='vigor').length*12;
 return {id:pet.id,name:pet.name,species:petVisualKey(pet),signature:moveName(pet.identity)??'Signature Burst',trait,level,maxHP,hp:maxHP,attack:16+Math.floor(level*.9)+Math.min(3,options.training??0)+perks.filter(p=>p==='edge').length*2,energy:Math.min(60,30+(trait==='spirited'?5:0)+perks.filter(p=>p==='reserve').length*8),shield:(trait==='resilient'?5:0)+(build.badge==='shell'?10:0),guard:false,weaken:false,focused:false,counter:false,combo:0,lastAttack:'',plans:0,strikes:0,used:[],build:structuredClone(build),blocked:0,dealt:0,healed:0};
}
function enemy(e:Encounter):Fighter{const p={id:`enemy-${e.id}`,name:e.name,speciesId:e.species,stage:'baby',progression:{level:e.level},identity:undefined} as Pet;const f=fighter(p,emptyBuild());f.maxHP=Math.round(f.maxHP*(e.boss?1.4:e.id===0?.85:1.05));f.hp=f.maxHP;f.attack=Math.round(f.attack*(e.boss?1.2:e.id===0?.85:1.05));return f;}
export function intentFor(f:Fight):Move{
 const enemy=f.fighters[1];if(enemy.energy<20)return f.round%2?'strike':'focus';
 if(f.boss&&enemy.hp<enemy.maxHP/2)return f.round%3===0?'signature':f.round%3===1?'focus':'strike';
 const patterns:Record<Style,Move[]>={attacker:['strike','focus','signature'],defender:['guard','strike','signature'],healer:['strike','item','focus','signature'],combo:['strike','signature','focus'],disruptor:['signature','guard','strike','focus']};
 let m=patterns[f.style][(f.round-1+f.seed%2)%patterns[f.style].length];if(m==='item'&&(enemy.used.includes('tool')||enemy.hp>enemy.maxHP*.75))m='strike';return m;
}
export function createFight(pet:Pet,build:Build,e:Encounter,id:string,mode:Fight['mode'],perks:Perk[]=[],training=0):Fight{
 let seed=0;for(const c of id)seed=(seed*31+c.charCodeAt(0))>>>0;
 const f:Fight={version:1,id,round:1,phase:'active',fighters:[fighter(pet,build,{fair:mode==='practice',perks,training}),enemy(e)],intent:'strike',style:e.style,boss:e.boss,seed,events:[],history:[],rewarded:false,mode,encounter:e.id,startLevel:pet.progression.level};f.intent=intentFor(f);return f;
}
export const signatureCost=(f:Fighter)=>f.focused&&f.build.talents.tactician>=2?15:20;
export function canMove(f:Fighter,m:Move){return m==='signature'?f.energy>=signatureCost(f):m==='item'?!f.used.includes('tool'):true;}
/** Bounded effects. Retaliation is direct HP damage and never re-enters hit resolution. */
export function perform(fighters:[Fighter,Fighter],actor:0|1,move:Move,events:CombatEvent[]){
 const a=fighters[actor],b=fighters[actor===0?1:0];if(!canMove(a,move))throw Error(move==='item'?'Your item has already been used.':'Not enough energy for Signature.');
 const emit=(kind:CombatEvent['kind'],text:string,amount?:number)=>events.push({actor,kind,text:`${a.name}: ${text}`,...(amount===undefined?{}:{amount})});
 const shield=(n:number)=>{const gain=Math.max(0,Math.min(Math.floor(a.maxHP*.4),a.shield+n)-a.shield);a.shield+=gain;emit('shield',`+${gain} shield`,gain);};
 const heal=(n:number)=>{const gain=Math.min(a.maxHP-a.hp,Math.round(n));a.hp+=gain;a.healed+=gain;emit('heal',`restored ${gain} HP`,gain);};
 const energy=(n:number)=>{const gain=Math.min(60-a.energy,n);a.energy+=gain;emit('energy',`+${gain} energy`,gain);};
 const once=(id:string)=>{if(a.used.includes(id))return false;a.used.push(id);return true;};
 a.guard=false;
 const {guardian:g,striker:s,tactician:t}=a.build.talents;
 if(move==='guard'){a.guard=true;emit('status','Guard will halve the next direct hit');if(g>=1)shield(6);if(g>=3&&a.weaken){a.weaken=false;emit('status','Weaken removed');}energy(4);if(a.build.badge==='spring'&&a.hp<a.maxHP/2&&once('spring'))heal(8);}
 if(move==='focus'){energy(18);a.focused=true;emit('status','Ready for a focused Signature');if(t>=1)shield(8);if(a.build.charm==='lens')shield(5);}
 if(move==='item'){a.used.push('tool');emit('status',`used ${a.build.tool}`);if(a.build.tool==='snack')heal(a.maxHP*.25);if(a.build.tool==='bubble')shield(28);if(a.build.tool==='berry')energy(25);if(a.build.tool==='leaf'){a.weaken=false;shield(18);}}
 if(move==='strike'||move==='signature'){
  const focused=a.focused,counter=a.counter,breakthrough=move==='signature'&&s>=3&&a.combo===3;
  if(move==='signature')a.energy-=signatureCost(a);else{a.strikes++;energy(7+(s>=2&&a.combo>0?3:0));}
  let damage=a.attack*(move==='signature'?1.65:1)*(a.weaken?.75:1)*(s>=1?1+a.combo*.05:1);
  if(move==='strike'&&a.trait==='nimble'&&a.strikes===1)damage*=1.1;
  if(move==='strike'&&a.build.charm==='comet'&&a.strikes===1)damage*=1.25;
  if(move==='strike'&&counter){damage*=1.5;a.counter=false;emit('status','Counter Ready activated');if(a.build.charm==='mirror')shield(6);}
  if(move==='signature'&&focused){if(t>=2)damage*=1.3;a.plans++;if(t>=4&&a.plans%3===0){damage*=1.4;emit('status','Master Plan activated');}if(t>=3){b.weaken=true;emit('status',`${b.name} is Weakened for its next attack`);}a.focused=false;}
  if(breakthrough){damage*=1.3;a.combo=0;emit('status','Breakthrough bypasses Guard');if(s>=4)shield(10);}
  if(move==='signature'&&a.build.charm==='spark'&&(a.combo>0||breakthrough)&&once('spark'))energy(8);
  if(move==='signature'&&a.build.charm==='moon'&&a.hp<a.maxHP/2&&once('moon'))heal(10);
  if(s>=1&&a.lastAttack&&a.lastAttack!==move&&!breakthrough){a.combo=Math.min(3,a.combo+1);emit('status',`Combo ${a.combo}/3`);if(a.combo===3&&a.build.badge==='rhythm'&&once('rhythm'))shield(10);}
  a.lastAttack=move;a.weaken=false;
  const raw=Math.max(1,Math.round(damage)),guarded=b.guard&&!breakthrough;let hit=guarded?Math.ceil(raw/2):raw;const absorbed=Math.min(b.shield,hit);b.shield-=absorbed;hit-=absorbed;b.blocked+=raw-hit;
  hit=Math.min(b.hp,hit);b.hp-=hit;a.dealt+=hit;emit('damage',`${move==='signature'?a.signature:'Strike'} dealt ${hit}${raw-hit>0?` (${raw-hit} blocked)`:''}`,hit);
  if(guarded){if(b.build.talents.guardian>=2)b.energy=Math.min(60,b.energy+5);if(b.build.talents.guardian>=4)b.counter=true;if(b.build.badge==='thorn'){const reflected=Math.min(3,a.hp);a.hp-=reflected;b.dealt+=reflected;events.push({actor:actor===0?1:0,kind:'damage',amount:reflected,text:`${b.name}: Thorn Badge returned ${reflected} damage`});}}
  b.guard=false;if(move==='strike'&&a.build.badge==='star'&&a.strikes%3===0)shield(5);
 }
 if(a.energy<10&&a.build.badge==='battery'&&once('battery'))energy(10);
}
export function turn(old:Fight,move:Move):Fight{
 if(old.phase!=='active')throw Error('This battle has finished.');const f=structuredClone(old);f.events=[];
 perform(f.fighters,0,move,f.events);
 if(f.fighters.every(p=>p.hp>0)){
  const m=canMove(f.fighters[1],f.intent)?f.intent:'strike';perform(f.fighters,1,m,f.events);
  if(f.style==='disruptor'&&m==='signature'&&f.fighters[0].hp>0){f.fighters[0].weaken=true;f.events.push({actor:1,kind:'status',text:'The disruptor applied Weaken to your next attack.'});}
 }
 f.phase=f.fighters.every(p=>p.hp<=0)?'draw':f.fighters[1].hp<=0?'won':f.fighters[0].hp<=0?'lost':f.round>=20?'draw':'active';
 f.history=[...f.history,...f.events].slice(-100);if(f.phase==='active'){f.round++;f.intent=intentFor(f);}return f;
}
