import type { Pet } from '../../types/pet';
import { furniture, type HomeRoomId } from '../home-base/catalog';
import type { HomePlacement, HomeRoom } from '../home-base/model';
import { openSpots,roomPath,type Spot } from '../home-base/roomLife';
import { createMind,objectSignature,type MemoryKind } from './memory';
import { effectiveTraits,petMood,type LearnerFacts,type Mood } from './life';
import { speak } from './voice';
export interface PetDecision {ask?:import('./voice').TogetherKind;id:string;activity:string;bubble:string;animation:string;target:Spot;score:number;reason:string;objectId?:string}
const careLines:Partial<Record<MemoryKind,[string,string,string]>>={feed:['After a good meal','That meal was lovely. Time for a comfy little rest.','happy'],clean:['Feeling fresh','All fresh and clean! A little shake and I’m ready.','being_washed'],comfort:['Feeling safe','That was a lovely quiet moment together.','being_comforted'],play:['Remembering playtime','I enjoyed our playtime! Shall we find something fun?','happy'],train:['Feeling proud','We practiced together. I’m feeling pretty proud!','being_trained'],heal:['Feeling better','Thank you for helping me feel better.','idle'],victory:['Remembering our victory','We won that battle together!','happy']};
const dist=(a:Spot,b:Spot)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function reachableFurniture(room:HomeRoom,p:HomePlacement,from:Spot):Spot|undefined {
 const f=furniture(p.furnitureId);if(!f)return undefined;
 return openSpots(room).filter(s=>((s.x===p.x-1||s.x===p.x+f.width)&&s.y>=p.y&&s.y<p.y+f.height)||((s.y===p.y-1||s.y===p.y+f.height)&&s.x>=p.x&&s.x<p.x+f.width))
  .filter(s=>dist(roomPath(room,from,s).at(-1)??from,s)===0).sort((a,b)=>dist(from,a)-dist(from,b))[0];
}
export function scoreDecisions(pet:Pet,room:HomeRoom,roomId:HomeRoomId,from:Spot,now:number,cooldowns:Record<string,number>={},learner:LearnerFacts={}):PetDecision[] {
 const mind=pet.mind??createMind(pet),t=effectiveTraits(mind.traits,mind.life),open=openSpots(room),result:PetDecision[]=[];
 const add=(d:PetDecision)=>{if((cooldowns[d.id]??0)<=now)result.push(d);};
 if(pet.state==='dead')return [{id:'still',activity:'Resting',bubble:'',animation:'dead',target:from,score:200,reason:'Pet state takes priority.'}];
 if(pet.state==='sleeping')return [{id:'sleep',activity:'Sleeping peacefully',bubble:'A quiet little rest…',animation:'sleeping',target:from,score:200,reason:'Pet is sleeping.'}];
 if(pet.needs.health<30)return [{id:'quiet',activity:'Taking it easy',bubble:'Let’s have a quiet moment. Care time would feel nice.',animation:'sick',target:from,score:300,reason:'Health is low; choose gentle behavior.'}];
 if(pet.needs.hunger<30)return [{id:'snack',activity:'Thinking about a snack',bubble:'A snack would be lovely when you’re ready.',animation:'hungry',target:from,score:280,reason:'Hunger need is below 30.'}];
 const recent=mind.memories.find(m=>careLines[m.kind]&&now-m.at>=0&&now-m.at<120000);
 if(recent){const line=careLines[recent.kind]!;add({id:`care-${recent.kind}-${recent.at}`,activity:line[0],bubble:line[1],animation:line[2],target:from,score:130,reason:`A completed ${recent.kind} event was remembered recently.`});}
 for(const p of room.items){
  const f=furniture(p.furnitureId);if(!f)continue;
  const target=reachableFurniture(room,p,from);if(!target)continue;
  const known=mind.objects.find(o=>o.id===`${roomId}/${p.id}`),changed=known&&known.signature!==objectSignature(p);
  const favorite=(known?.visits??0)>=3;
  if(!known||changed)add({id:`notice-${roomId}-${p.id}-${objectSignature(p)}`,activity:changed?'Checking the new arrangement':'Investigating furniture',bubble:changed?`Our ${f.name.toLowerCase()} looks different! Let me take a look.`:`I haven’t explored this ${f.name.toLowerCase()} yet.`,animation:'idle',target,objectId:p.id,score:80+t.curiosity*25-dist(from,target),reason:changed?'The saved placement, orientation, or finish changed.':'This pet has not investigated this object yet.'});
  const kind=f.interaction;
  const seat=/chair|armchair|bench/.test(f.id);
  const detail=kind==='rest'?[seat?'Taking a seat':'Taking a nap',favorite?'My favorite little resting spot.':seat?'A little sit-down in our cozy home.':'A perfect spot for a little nap…',seat?'idle':'sleeping',32+t.comfort*24+t.quiet*10+(room.night?25:0)]:kind==='read'?['Story time','A cozy corner for one more chapter.','idle',25+t.quiet*50]:kind==='water'?[f.id.includes('aquarium')?'Watching the fish':'Tending the plants',f.id.includes('aquarium')?'Look at that tiny underwater world.':'Our leafy friends make this room feel lovely.','idle',25+t.nature*50]:kind==='play'?['Playing with toys',favorite?'One of my favorite things to play with!':'Look what we can play with together!','happy',25+t.playfulness*50+(100-pet.needs.happiness)*.2]:null;
  const preference=kind==='read'?'books':kind==='water'?'plants':kind==='play'?'toys':undefined;
  const sharedInterest=preference?Math.min(18,(mind.life?.tallies[`preference:${preference}`]??0)*6):0;
  if(detail)add({id:`use-${roomId}-${p.id}`,activity:String(detail[0]),bubble:String(detail[1]),animation:String(detail[2]),target,objectId:p.id,score:Number(detail[3])+sharedInterest+Math.min(15,known?.visits??0)-dist(from,target)*.6,reason:`Reachable ${kind} furniture; personality${favorite?' and repeated visits':''}${room.night?' and evening lighting':''} influence its score.`});
 }
 const line=speak(pet,learner,now,(now/1000%997)/997);
 if(line)add({id:`recall:${line.key}`,activity:line.ask?'Asking you something':'Remembering',bubble:line.text,animation:line.animation,target:from,score:line.score,reason:line.reason,...(line.ask?{ask:line.ask}:{})});
 const playMemory=mind.memories.find(m=>m.kind==='fetch'||m.kind==='dance');
 add({id:'company',activity:'Looking for company',bubble:playMemory?`I remember our ${playMemory.kind==='fetch'?'fetch game':'dance'}! Want to do that together again?`:'Want to spend a little time together?',animation:'happy',target:from,ask:playMemory?.kind==='dance'?'dance':playMemory?'fetch':t.comfort>t.playfulness?'cuddle':'talk',score:20+t.sociability*45+(playMemory?12:0),reason:playMemory?'Social preference and an actual shared-play memory.':'Social preference.'});
 const target=open.filter(s=>dist(roomPath(room,from,s).at(-1)??from,s)===0).sort((a,b)=>dist(from,b)-dist(from,a))[0]??from;
 add({id:'explore',activity:'Exploring the room',bubble:'Just checking on my favorite little corners.',animation:'idle',target,score:20+t.curiosity*20,reason:'A reachable part of the actual room.'});
 // Mood nudges which ordinary choices win; it never overrides needs, which score far higher.
 const mood=petMood(mind.life,now),boost:Partial<Record<Mood,(d:PetDecision)=>number>>={sleepy:d=>d.animation==='sleeping'?25:d.id==='explore'?-10:0,cuddly:d=>d.id==='company'?30:0,excited:d=>d.id==='company'?15:d.id==='explore'?10:0,proud:d=>d.id==='explore'?12:0};
 const nudge=boost[mood];if(nudge)for(const d of result)d.score+=nudge(d);
 return result.sort((a,b)=>b.score-a.score);
}
export function chooseDecision(options:PetDecision[],random:number):PetDecision|undefined {
 if(!options.length)return undefined;
 const eligible=options.filter(d=>d.score>=options[0].score-18),total=eligible.reduce((s,d)=>s+Math.max(1,d.score),0);
 let pick=Math.max(0,Math.min(.999999,random))*total;return eligible.find(d=>(pick-=Math.max(1,d.score))<0)??eligible[0];
}
