import {perform,canMove,type Fighter,type Build,type CombatEvent} from './combat';
import {BRANCHES,gear,type Move} from './catalog';
export interface ArenaMember{id:string;alias:string;fighter:Fighter;ready:boolean}
export interface ArenaRoom{id:string;mode:'duel'|'raid';host:string;members:ArenaMember[];boss:Fighter|null;phase:'lobby'|'active'|'finished';round:number;paused:boolean;choices:Record<string,Move>;events:CombatEvent[];winner:string|null;revision:number;message:string}
export type RoomCommand={kind:'ready';build:Build}|{kind:'move';move:Move;round:number}|{kind:'start'|'resolve'|'pause'|'end'};
export function validLoan(b:Build):boolean{return !!b&&!!b.talents&&Object.keys(b.talents).length===3&&BRANCHES.every(k=>Number.isInteger(b.talents[k])&&b.talents[k]>=0&&b.talents[k]<=4)&&BRANCHES.reduce((n,k)=>n+b.talents[k],0)<=6&&(!b.charm||gear(b.charm)?.slot==='charm')&&(!b.badge||gear(b.badge)?.slot==='badge')&&gear(b.tool)?.slot==='tool';}
export function resolveRoom(old:ArenaRoom):ArenaRoom{
 const r=structuredClone(old);r.events=[];
 if(r.mode==='duel'){
  const fs=r.members.map(m=>m.fighter) as [Fighter,Fighter],moves=r.members.map(m=>r.choices[m.id]??'guard');
  // Defensive/preparation actions resolve before hits; attack priority alternates each round.
  const order: (0|1)[]=r.round%2?[0,1]:[1,0];order.sort((i,j)=>Number(['strike','signature'].includes(moves[i]))-Number(['strike','signature'].includes(moves[j])));
  for(const i of order)if(fs[i].hp>0&&fs[1-i].hp>0)perform(fs,i,moves[i],r.events);
  r.members.forEach((m,i)=>m.fighter=fs[i]);
  if(fs.some(f=>f.hp<=0)||r.round>=20){r.phase='finished';const diff=fs[0].hp/fs[0].maxHP-fs[1].hp/fs[1].maxHP;r.winner=Math.abs(diff)<.00001?null:r.members[diff>0?0:1].id;}
 }else{
  const boss=r.boss!,bossMove=r.choices[r.host]??'strike';let totalDamage=0,totalHeal=0,totalEnergy=0;let resolvedBoss:Fighter|null=null;
  const active=r.members.filter(m=>m.fighter.hp>0);
  for(const member of active){
   const pair:[Fighter,Fighter]=[member.fighter,structuredClone(boss)],events:CombatEvent[]=[];const chosen=r.choices[member.id]??'guard';
   if(bossMove==='guard')perform(pair,1,'guard',events);
   perform(pair,0,chosen,events);
   if(pair[1].hp>0&&bossMove!=='guard')perform(pair,1,canMove(pair[1],bossMove)?bossMove:'strike',events);
   totalDamage+=Math.max(0,boss.hp-pair[1].hp);totalHeal+=Math.max(0,pair[1].hp-boss.hp);totalEnergy+=pair[1].energy;
   resolvedBoss??=pair[1];member.fighter=pair[0];r.events.push(...events.map(e=>({...e,text:`${member.alias} · ${e.text}`})));
  }
  const n=Math.max(1,active.length);if(resolvedBoss){boss.used=resolvedBoss.used;boss.plans=resolvedBoss.plans;boss.focused=resolvedBoss.focused;boss.combo=resolvedBoss.combo;boss.strikes=resolvedBoss.strikes;boss.shield=resolvedBoss.shield;boss.weaken=resolvedBoss.weaken;boss.counter=resolvedBoss.counter;}boss.hp=Math.max(0,Math.min(boss.maxHP,boss.hp-Math.round(totalDamage/n)+Math.round(totalHeal/n)));boss.energy=Math.round(totalEnergy/n);if(bossMove==='item'&&!boss.used.includes('tool'))boss.used.push('tool');
  r.events.push({actor:1,kind:'status',text:'Team damage is averaged across active pets, so class size does not multiply item power.'});
  if(boss.hp===0||r.members.every(m=>m.fighter.hp<=0)||r.round>=20){r.phase='finished';r.winner=boss.hp===0?'class':r.members.every(m=>m.fighter.hp<=0)?r.host:null;}
 }
 r.events=r.events.slice(-100);r.choices={};if(r.phase==='active')r.round++;else r.message=r.winner?'Match complete. Well played!':'Match drawn. Your pets and equipment are kept.';return r;
}
export function roomAction(old:ArenaRoom,c:RoomCommand,actor:string,teacher:boolean):ArenaRoom{
 const r=structuredClone(old),member=r.members.find(m=>m.id===actor);if(!member&&!(teacher&&(actor===r.host||['pause','end'].includes(c.kind))))throw Error('This is not your battle.');
 if(c.kind==='end'){r.phase='finished';r.winner=null;r.message=teacher?'Teacher ended this match.':'A player left. Progress and equipment are kept.';return r;}
 if(r.phase==='finished')throw Error('This match is finished.');
 if(c.kind==='pause'){if(!teacher)throw Error('Only the teacher can pause.');r.paused=!r.paused;return r;}
 if(r.paused)throw Error('The teacher paused this match.');
 if(c.kind==='ready'){if(!member||r.phase!=='lobby'||!validLoan(c.build))throw Error('Choose a valid build before the match starts.');member.fighter.build=structuredClone(c.build);member.ready=true;return r;}
 if(c.kind==='start'){
  if(r.phase!=='lobby'||!r.members.length||r.members.some(m=>!m.ready)||r.mode==='duel'&&r.members.length!==2)throw Error('Wait until every player is ready.');
  if(r.mode==='raid'&&!teacher)throw Error('Your teacher starts the team challenge.');r.phase='active';r.round=1;return r;
 }
 if(c.kind==='resolve'){if(!teacher||r.mode!=='raid'||r.phase!=='active')throw Error('Only the teacher resolves team turns.');return resolveRoom(r);}
 if(c.kind!=='move'||r.phase!=='active'||c.round!==r.round||!['strike','guard','focus','signature','item'].includes(c.move))throw Error('The turn changed. Review the board.');
 const f=member?.fighter??r.boss;if(!f||f.hp<=0||!canMove(f,c.move))throw Error('That move is unavailable.');
 if(r.choices[actor])return r;r.choices[actor]=c.move;
 return r.mode==='duel'&&r.members.every(m=>r.choices[m.id])?resolveRoom(r):r;
}
/** Opponents can see readiness, never the pending move. */
export function roomView(r:ArenaRoom,actor:string){return {...r,choices:Object.fromEntries(Object.keys(r.choices).map(id=>[id,id===actor?r.choices[id]:'locked']))};}
export type ArenaRoomView=Omit<ArenaRoom,'choices'>&{choices:Record<string,string>};
export interface ClassroomArenaData{you:string;teacher:boolean;rooms:ArenaRoomView[];learners:{id:string;alias:string;pet:string}[]}
