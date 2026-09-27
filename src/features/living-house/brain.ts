import {weatherInterest,type Environment} from '../house-weather/model';
import type {Pet} from '../../types/pet';
import {furniture} from '../home-base/catalog';
import {createMind} from '../pet-mind/memory';
import {effectiveTraits,petMood} from '../pet-mind/life';
import {distance,type Point,type World,type WorldObject} from './world';

/** House coordinates differ from the decorator's grid; both use the same persistent mind. */
export function houseChoices(pet:Pet,world:World,position:Point,visits:Record<string,number>,cooldowns:Record<string,number>,now:number,random:()=>number=Math.random,environment?:Environment){
 const mind=pet.mind??createMind(pet),traits=effectiveTraits(mind.traits,mind.life),mood=petMood(mind.life,now);
 return world.objects.map(object=>{
  const kind=furniture(object.placement.furnitureId)?.interaction;
  const count=visits[object.key]??0;
  const preference=kind==='play'?'toys':kind==='read'?'books':kind==='water'?'plants':undefined;
  const interest=preference?Math.min(18,(mind.life?.tallies[`preference:${preference}`]??0)*6):0;
  const trait=kind==='rest'?traits.comfort:kind==='read'?traits.quiet:kind==='water'?traits.nature:kind==='play'?traits.playfulness:0;
  const need=kind==='feed'?(100-pet.needs.hunger)*.7:kind==='wash'?(100-pet.needs.cleanliness)*.6:kind==='play'?(100-pet.needs.happiness)*.2:0;
  const urgent=kind==='feed'&&pet.needs.hunger<30||kind==='wash'&&pet.needs.cleanliness<20;
  const favorite=count>=3;
  const score=20+weatherInterest(kind,environment)+trait*50+need+interest+(favorite?Math.min(18,count*2):0)+(count===0?traits.curiosity*18:0)+(mood==='sleepy'&&kind==='rest'?25:0)+(urgent?200:0)-Math.min(20,distance(position,object)*.25)+random()*8;
  return {object,score,favorite,urgent};
 }).filter(c=>c.urgent||(cooldowns[c.object.key]??0)<=now).sort((a,b)=>b.score-a.score);
}

export function favoriteLine(object:WorldObject,visits:number):string|undefined{
 if(visits<3)return;
 const definition=furniture(object.placement.furnitureId);
 if(!definition)return;
 const name=definition.name.toLowerCase();
 return definition.interaction==='rest'?`Back to my favorite ${name}. A little quiet time feels lovely.`:
  definition.interaction==='play'?`I came back to our ${name}. We always find something fun here!`:
  `I know this ${name}. It's one of my favorite little corners.`;
}
