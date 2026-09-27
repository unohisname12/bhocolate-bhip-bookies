import { entrySpot, exitSpot } from './house';
import { initialMotion,motionForStep } from './roomMotion';
import type { LearnerFacts } from '../pet-mind/life';
import { changedFurniture, furnitureWork, furniturePose, type FurnitureWork } from './petFurniture';
import { objectSignature } from '../pet-mind/memory';
import type { Pet } from '../../types/pet';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { HomeRoomId } from './catalog';
import { chooseDecision, reachableFurniture, scoreDecisions, type PetDecision } from '../pet-mind/decisions';
import { useEffect, useState, useRef } from 'react';
import { furniture } from './catalog';
import type { HomePlacement, HomeRoom } from './model';
import { initialLife, roomPath, startActivity, tickLife, type Spot } from './roomLife';
export function useRoomLife(room: HomeRoom, editing: boolean, companion?: Pet, dispatch?: (a: GameEngineAction) => void, roomId: HomeRoomId = 'den', timing={x:340,y:220}, learner: LearnerFacts = {}, arriveAtDoor = false) {
  const [pet,setPet] = useState(() => ({...initialLife(room),...(arriveAtDoor?entrySpot(room):{})}));
  const [motion,setMotion]=useState(initialMotion);
  const motionRef=useRef(initialMotion);
  const current=useRef(pet),cooldowns=useRef<Record<string,number>>({}),notice=useRef<string|null>(null);
  const leaving=useRef<(() => void) | null>(null);
  const fetching=useRef(false),identity=useRef(companion?.id);
  const previousItems=useRef(room.items),workRef=useRef<FurnitureWork|undefined>(undefined);
  const [work,setWork]=useState<FurnitureWork|undefined>();
  const [decision,setDecision]=useState<PetDecision|undefined>();
  useEffect(()=>{current.current=pet;},[pet]);
  // A tap is the learner's newest intent: update the timer's copy immediately (a tick before React commits would republish the stale pet),
  // and end any leftover decorating-helper job, whose cleanup on the next tick would otherwise wipe the walk the tap just started.
  const act=(update:(p:typeof current.current)=>typeof current.current)=>{if(workRef.current){workRef.current=undefined;setWork(undefined);}const next=update(current.current);current.current=next;setPet(next);};
  const [roaming,setRoamingState] = useState(true), [throwing,setThrowing] = useState(false);
  const inputs=useRef({room,editing,roaming,companion,dispatch,roomId,timing,learner});
  useEffect(()=>{inputs.current={room,editing,roaming,companion,dispatch,roomId,timing,learner};},[room,editing,roaming,companion,dispatch,roomId,timing,learner]);
  const setRoaming = (next: boolean) => {
    setRoamingState(next); setThrowing(false); notice.current=null; fetching.current=false;
    act(p=>({...p,path:[],ticks:0,book:undefined,ball:undefined,returning:undefined,animation:'idle',hearts:false,activity:next?'Ready to explore':'Relaxing with you'}));
  };
  useEffect(() => {

    let nextTick=0;
    const timer = window.setInterval(() => {
      const now=performance.now();
      if(document.hidden){nextTick=now+80;return;}
      if(now<nextTick)return;
      nextTick=now+450;
      const {room,editing,roaming,companion,dispatch,roomId,timing,learner}=inputs.current;
      const publish=(next:typeof current.current)=>{
        const m=motionForStep(current.current,next,motionRef.current,timing);
        if(m.moving)nextTick=now+m.duration;
        else if(next.path.length)nextTick=now+90;
        motionRef.current=m;setMotion(m);current.current=next;setPet(next);
      };
      if(identity.current!==companion?.id){
        leaving.current=null;identity.current=companion?.id;current.current=initialLife(room);cooldowns.current={};notice.current=null;fetching.current=false;setDecision(undefined);
      }
      const changed=changedFurniture(previousItems.current,room);previousItems.current=room.items;
      const canHelp=editing && companion && !['sleeping','dead'].includes(companion.state) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!canHelp && workRef.current){workRef.current=undefined;setWork(undefined);current.current={...current.current,path:[],ticks:0,activity:'Settling in',animation:'idle',hearts:false};}
      if(canHelp && changed){
        const job=furnitureWork(room,changed,current.current);
        workRef.current=job;setWork(job);notice.current=null;fetching.current=false;
        if(job)current.current={...startActivity({...current.current,...job.origin},room,job.origin,'Getting the delivery ready','It’s here beside me! I’ll bring it over.'),path:[]};
        else {current.current={...current.current,path:[],ticks:0,activity:'Looking for a path',bubble:'Leave a little space so I can help over there.'};setPet(current.current);}
      }
      const job=workRef.current;
      if(job){
        const item=room.items.find(p=>p.id===job.id);
        if(!item || objectSignature(item)!==job.signature){workRef.current=undefined;setWork(undefined);current.current={...current.current,path:[],ticks:0,activity:'Ready to help',bubble:'Ready for your next idea.'};setPet(current.current);return;}
        let next=current.current;
        if(job.phase==='approach'){
          if(--job.ticks<=0){
            job.phase='carry';job.ticks=4;
            next=startActivity(next,{...room,items:room.items.filter(p=>p.id!==job.id)},job.target,'Delivering furniture','Coming through! I’ve got your delivery.','walking');
          }
        }else if(job.phase==='carry'){
          next=tickLife(next,{...room,items:room.items.filter(p=>p.id!==job.id)},false,0);
          if(!next.path.length && !current.current.path.length){
            if(next.x!==job.target.x||next.y!==job.target.y){workRef.current=undefined;setWork(undefined);return;}
            job.phase='push';next={...next,activity:job.label,bubble:job.label==='Pushing into place'?'One little push… there!':'Just getting it neat and tidy.',animation:'happy'};
          }
        }else if(--job.ticks<=0){
          if(job.phase==='push'){job.phase='celebrate';job.ticks=4;next={...next,activity:'Decorating done',bubble:'We made this corner lovely!',animation:'happy',hearts:true};}
          else {workRef.current=undefined;setWork(undefined);next={...next,activity:'Ready to help',bubble:'Pick another spot. I’ll lend a paw!',path:[],ticks:0};}
        }
        if(workRef.current)setWork({...job});publish(next);return;
      }
      if(leaving.current){
        const next=tickLife(current.current,room,false,0);
        publish(next);
        if(!next.path.length && !current.current.path.length && !motionRef.current.moving){const done=leaving.current;leaving.current=null;done();}
        return;
      }
      if(editing){if(motionRef.current.moving){motionRef.current={...motionRef.current,moving:false};setMotion(motionRef.current);}return;}
      let previous=current.current;
      if(companion?.state==='sleeping'||companion?.state==='dead'){
        previous={...previous,path:[],book:undefined,ball:undefined,returning:undefined,ticks:0};notice.current=null;fetching.current=false;
      }
      let next=tickLife(previous,room,companion?false:roaming,Math.random());
      if(companion && (roaming||companion.state==='sleeping'||companion.state==='dead') && !previous.path.length && !previous.ball && !previous.book && previous.ticks<=0) {
        const now=Date.now(),choice=chooseDecision(scoreDecisions(companion,room,roomId,next,now,cooldowns.current,learner),Math.random());
        if(choice){
          next={...startActivity(next,room,choice.target,choice.activity,choice.bubble,choice.animation),objectId:choice.objectId,ticks:choice.animation==='sleeping'?18:12,visits:previous.visits+1};
          cooldowns.current=Object.fromEntries([...Object.entries(cooldowns.current).filter(([,until])=>until>now).slice(-99),[choice.id,now+(choice.id.startsWith('care-')?300000:45000)]]);
          notice.current=choice.objectId??null;setDecision(choice);
          if(choice.id.startsWith('recall:'))dispatch?.({type:'PET_SAID',key:choice.id.slice(7)});
        }
      }
      if(fetching.current && next.activity==='Bringing the ball back' && !next.path.length){
        fetching.current=false;dispatch?.({type:'PET_HOME_MEMORY',kind:'fetch'});
      }
      publish(next);
      if(notice.current && !next.path.length){
        const id=notice.current,item=room.items.find(p=>p.id===id),at=item&&reachableFurniture(room,item,next);
        notice.current=null;fetching.current=false;
        if(at?.x===next.x&&at.y===next.y)dispatch?.({type:'PET_NOTICE_OBJECT',roomId,id});
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, []);
  const remember = (text: string) => act(p => ({...p,memories:[text,...p.memories].slice(0,3)}));
  const together = (kind: 'cuddle'|'talk'|'dance'|'fetch'|'call') => {
    notice.current=null; fetching.current=false;
    if (kind==='fetch') { setThrowing(true); act(p=>({...p,path:[],book:undefined,ticks:999,activity:'Ready to fetch',bubble:'Tap an open floor tile to throw my ball!'})); return; }
    setThrowing(false);
    const info = {cuddle:['Cuddle time','My favorite place is right here with you.','happy'],talk:['Having a chat','If we could add one thing to our home, what would you choose?','idle'],dance:['Dance party','One, two, wiggle! Your turn!','happy'],call:['Coming to you','Coming! Save a spot for me.','happy']}[kind];
    act(p=>({...startActivity(p,room,kind==='call'?{x:3,y:5}:p,...info as [string,string,string]),ticks:kind==='talk'?60:10}));
    if(kind!=='call')dispatch?.({type:'PET_HOME_MEMORY',kind:kind==='talk'?'chat':kind});
    remember({cuddle:'Shared a cozy cuddle',talk:'Had a little heart-to-heart',dance:'Danced around the room',call:'Came over to say hello'}[kind]);
  };
  const move = (target: Spot) => {
    notice.current=null; fetching.current=false;
    if (throwing) {
      act(p=>{const path=roomPath(room,p,target);return {...startActivity(p,room,target,'Chasing the ball','Here I go!','happy'),ball:path.at(-1)??{x:p.x,y:p.y},returning:{x:p.x,y:p.y}};});
      setThrowing(false); fetching.current=true; remember('Threw a ball together');
    } else act(p=>startActivity(p,room,target,'On my way','Let’s explore this little corner.'));
  };
  const interact = (placed: HomePlacement) => {
    setThrowing(false);fetching.current=false;
    const target=reachableFurniture(room,placed,current.current);
    if(!target){notice.current=null;act(p=>({...p,path:[],ball:undefined,returning:undefined,bubble:'I need a clear path to get over there.',activity:'Looking for a path'}));return;}
    notice.current=placed.id;
    const item=furniture(placed.furnitureId)!;
    const seating=/chair|armchair|bench/.test(item.id);
    const info = {rest:seating?['Taking a seat','A little sit-down in our cozy home.','idle']:['Taking a nap','A perfect spot for a little nap…','sleeping'],read:['Story time','Let’s read a story together. One more chapter?','idle'],water:['Tending the plants','A little water. A lot of love.','happy'],play:['Playing with toys','Playtime is the best time!','happy']}[item.interaction as 'rest'|'read'|'water'|'play'] ?? ['Admiring our home',`I like our ${item.name.toLowerCase()}.`,'idle'];
    act(p=>({...startActivity(p,room,target,...info as [string,string,string]),objectId:placed.id}));
    remember(`Spent time together by the ${item.name.toLowerCase()}`);
  };
  // Turning down an invitation is always fine; the pet just says so and carries on.
  const later = () => { setDecision(undefined); act(p=>({...p,bubble:'Okay! Maybe later.',animation:'idle',ticks:6,activity:'Waiting for you'})); };
  useEffect(()=>{if(companion?.id)dispatch?.({type:'PET_VISIT'});},[companion?.id,dispatch]);
  const reply = (choice: 'plants'|'books'|'toys') => {
    const response = { plants: 'Yes! A little jungle with a sunny spot for us.', books: 'A reading nook! I’ll pick a story and you pick the cushions.', toys: 'A whole play room? Let’s leave lots of space for fetch!' }[choice];
    act(p=>({...p,bubble:response,animation:'happy',hearts:true,ticks:16,activity:'Dreaming up our home'}));
    remember('Made plans for our home together');
    dispatch?.({type:'PET_PREFERENCE',choice});
  };
  const leave = (done: () => void) => {
    notice.current=null;fetching.current=false;setThrowing(false);leaving.current=done;
    act(p=>({...startActivity(p,room,exitSpot(room,p),'Heading to the door','Come with me!','walking'),book:undefined,ball:undefined,returning:undefined,ticks:999}));
  };
  const cancelLeave = () => { leaving.current=null;act(p=>({...p,path:[],ticks:2,animation:'idle',activity:'Staying here',bubble:'A little more time in this room.'})); };
  return {leave,cancelLeave,pet,work,motion,anchor:furniturePose(room,pet),roaming,setRoaming,throwing,together,move,interact,reply,decision,later};
}
