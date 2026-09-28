import {arenaOf,distance,idleInput,inside,lineClear,playArena,sanitizeInput,visible,waypoint,type Input,type Match,type Player} from '../model';
import {ensureRun,interactRift,runComplete} from './run';
import {advance,freePoint} from './world';
import {award,drafts,has,maxHp,random} from './state';
import {active,dash,emp,fx,hurt,projectiles,eliminate,reviveFromMath,nova,shoot,strike,summon,ungrab} from './combat';
import {evolutionBot} from './bots';
import {makeReturnCheck} from './returnMath';
const cooldown=(p:Player,n:number)=>n*(has(p,'deep')?.9:1);
function returnStep(m:Match,p:Player,i:Input,dt:number){const a=p.evo!,r=a.returnMath!;p.action='return-math';if(r.wait>0){r.wait-=dt;return;}
 if(!p.check)p.check=makeReturnCheck(m.nextId++,p.returnProfile,()=>random(m),r.misses,m.relaxed);
 const c=p.check;c.left-=dt;
 if(i.answerFor===c.id&&i.answer>=0||c.left<=0){const right=i.answerFor===c.id&&i.answer===c.answer&&c.left>0;if(right){r.correct++;r.feedback='Correct! Keep going.';}else{r.misses++;r.feedback=`${c.prompt} = ${c.choices[c.answer]}. Your progress is safe.`;}p.check=null;r.wait=right?.25:1.8;
  if(r.correct>=5){a.returnMath=undefined;a.echo=false;a.returns++;a.sparks=0;p.out=false;reviveFromMath(m,p);const h=m.players.find(v=>v.role==='hunter')!;const safe=[...m.evolution!.echoStations].sort((x,y)=>distance(h,y)-distance(h,x))[0];Object.assign(p,freePoint(playArena(m),safe));p.immune=6;m.message=`${p.name} earned a second life!`;award(m,'runner',20,`return:${p.id}`);}
 }
}
function ability(m:Match,p:Player,i:Input){const a=p.evo!;
 if(i.gadget&&p.gadgetCooldown<=0){let used=true;switch(a.mutation){
 case 'burrower':if(m.evolution!.core.exposed>0||a.grab||p.carrying)used=false;else{a.dig=.9;a.safe={x:p.x,y:p.y};fx(m,'pulse',p,.9);}break;
 case 'grappler':a.attack=.55;a.attackAim=p.aim;a.grabTime=-.45;p.action='grab-windup';break;
 case 'broodkeeper':used=summon(m,p,'bite');if(used&&has(p,'command'))summon(m,p,'bite');break;
 case 'blaster':a.charge=.65;fx(m,'pulse',p,.65);break;
 case 'breaker':a.charge=.85;break;
 case 'scout':a.stealth=5+(has(p,'veil')?2:0);break;
 case 'medic':for(const v of m.players)if(v.role===p.role&&distance(v,p)<180)v.shield=4;fx(m,'rescue',p);break;
 case 'engineer':emp(m,p);break;
 case 'duelist':p.shield=1.5;a.parry=1.5;break;
 }if(used){p.gadgetCooldown=cooldown(p,12);if(has(p,'veil'))fx(m,'smoke',p,3);}}
 if(i.trap&&a.secondary<=0){a.secondary=cooldown(p,16);switch(a.mutation){
 case 'broodkeeper':summon(m,p,'scout');break;
 case 'blaster':p.shield=3;break;
 case 'burrower':case 'grappler':case 'breaker':strike(m,p,130+(has(p,'quake')?30:0),25,true);fx(m,'pulse',p);if(has(p,'quake'))shoot(m,p);if(has(p,'cataclysm'))nova(m,p);break;
 case 'scout':fx(m,'decoy',freePoint(playArena(m),{x:p.x+Math.cos(p.aim)*200,y:p.y+Math.sin(p.aim)*200}),5);break;
 case 'medic':for(const v of m.players)if(v.role===p.role&&active(v)&&distance(v,p)<200&&lineClear(playArena(m),p,v)){v.evo!.hp=Math.min(maxHp(v),v.evo!.hp+25);v.hp=v.evo!.hp;v.shield=Math.max(v.shield,has(p,'guardian')?3:1);}fx(m,'rescue',p);break;
 case 'engineer':summon(m,p,'medic');break;
 case 'duelist':advance(m,p,{x:p.x+Math.cos(p.aim)*160,y:p.y+Math.sin(p.aim)*160},800,.12);p.immune=.6;if(has(p,'tempest'))nova(m,p);break;
 }if(has(p,'hive'))summon(m,p,'bite');if(has(p,'hive-r'))summon(m,p,'medic');if(has(p,'prism'))nova(m,p);if(has(p,'guardian'))for(const v of m.players)if(v.role===p.role&&active(v)&&distance(v,p)<170)v.shield=Math.max(v.shield,2);}
 if(i.sensor&&a.itemCooldown<=0&&a.items.length){const item=a.items.shift()!;a.itemCooldown=2;if(item==='medkit'&&p.role==='hunter')a.guard=Math.min(100,a.guard+45);if(item==='medkit'&&p.role==='runner'){a.hp=Math.min(maxHp(p),a.hp+45+(has(p,'medic')?25:0));p.hp=a.hp;}if(item==='emp')emp(m,p);if(item==='smoke')fx(m,'smoke',p,5+(has(p,'veil')?2:0));if(item==='flare'){fx(m,'pulse',p,3);for(const v of m.players)if(v.role!==p.role&&distance(v,p)<240){v.noise=3;v.evo!.stealth=0;}}}
}
function interact(m:Match,p:Player,i:Input,dt:number){const e=m.evolution!,a=p.evo!,arena=arenaOf(m),near=(v:{x:number;y:number},r=75)=>distance(p,v)<r&&lineClear(playArena(m),p,v);
 const work=(key:string,time:number)=>{if(a.work!==key){a.work=key;a.workTime=0;}a.workTime+=dt;p.action='interact';return a.workTime>=time;};
 if(!i.interact){a.work='';a.workTime=0;return;}
 if(p.role==='hunter'){
  const hidden=m.players.find(v=>v.locker>=0&&near(v));if(hidden){hidden.locker=-1;hidden.hidden=false;hurt(m,hidden,30,p);return;}
 }else{
  if(m.gate.state==='open'&&e.exits.some(v=>near(v,90))){if(a.component>=0){const part=e.core.parts[a.component];part.carrier=null;part.x=p.x;part.y=p.y;a.component=-1;}for(const s of e.run?.sites??[])for(const n of s.nodes)if(n.carrier===p.id){n.carrier=null;Object.assign(n,{x:p.x,y:p.y});}p.escaped=true;p.check=null;fx(m,'escape',p,2);m.message=`${p.name} escaped!`;return;}
  if(a.component>=0&&near(e.core.stations[0],90)){if(work('install',2)){const part=e.core.parts[a.component];part.installed=true;part.carrier=null;e.core.installed++;a.component=-1;award(m,'runner',25,`component:${e.core.installed}`);m.message=`Core trap: ${e.core.installed}/3 components installed.`;}return;}
  const part=e.core.parts.find(v=>!v.installed&&!v.carrier&&near(v,60));if(part&&a.component<0){a.component=e.core.parts.indexOf(part);part.carrier=p.id;return;}
  if(e.core.installed===3&&e.core.cooldown<=0&&e.core.exposed<=0){const s=e.core.stations[e.core.activeStation];for(let k=0;k<2;k++){if(near({x:s.x+(k?95:-95),y:s.y},48)){e.core.plates[k]=Math.min(12,e.core.plates[k]+dt/6);e.core.plateUsers[k]=p.id;p.action='arming';return;}}}
  const locker=arena.lockers?.findIndex(v=>near(v,50))??-1;if(i.quiet&&locker>=0&&!m.players.some(v=>v.locker===locker)){p.locker=locker;Object.assign(p,arena.lockers![locker]);p.hidden=true;return;}
  if(p.ventCooldown<=0){const other=arena.vents?.map(([x,y])=>near(x,50)?y:near(y,50)?x:null).find(Boolean);if(other){p.vent=1.2;p.ventTo={x:other.x,y:other.y};p.charging=-1;p.check=null;return;}}

 }
 if(interactRift(m,p,dt))return;
 if(e.surge.next<=0&&near(e.surge.at,90)){if(e.surge.working!==p.role){e.surge.working=p.role;e.surge.work=0;}e.surge.work+=dt;if(e.surge.work>=4){e.surge.owner=p.role;e.surge.left=20;e.surge.next=85;e.surge.work=0;award(m,p.role,25,`surge:${Math.floor((m.duration-m.time)/60)}`);m.message=`${p.role==='hunter'?'Monster':'Runner team'} claimed the surge: faster skill recovery for 20 seconds!`;}return;}
 const loot=e.loot.find(v=>!v.opened&&near(v,65));if(loot&&a.items.length<2&&work(`loot:${loot.id}`,2/(has(p,'scavenge')?1.35:1))){loot.opened=true;if(has(p,'scavenge')){a.hp=Math.min(maxHp(p),a.hp+15);p.hp=a.hp;}a.items.push((['medkit','emp','smoke','flare'] as const)[Math.floor(random(m)*4)]);award(m,p.role,8,`loot:${loot.id}`);m.message='Supplies found. Press R to use your first item.';}
}
export function evolutionStep(m:Match,inputs:Record<string,Input>,elapsed:number){const dt=Math.max(0,Math.min(.05,elapsed));if(!dt)return;const e=m.evolution!;ensureRun(m);m.time=Math.max(0,m.time-dt);m.tick++;e.core.plateUsers=['',''];drafts(m);const hunter=m.players.find(p=>p.role==='hunter')!;
 for(const f of m.effects)f.life-=dt;m.effects=m.effects.filter(f=>f.life>0);e.core.cooldown=Math.max(0,e.core.cooldown-dt);e.core.exposed=Math.max(0,e.core.exposed-dt);e.surge.next-=dt;e.surge.left=Math.max(0,e.surge.left-dt);e.returnsOpen=m.time>30;
 for(const p of m.players){const a=p.evo!;for(const k of ['stun','immune','shot','cooldown','gadgetCooldown','shield','noise'] as const)p[k]=Math.max(0,p[k]-dt*(k==='gadgetCooldown'&&e.surge.owner===p.role&&e.surge.left>0?1.5:1));for(const k of ['secondary','itemCooldown','grabImmune','echoCooldown','stealth','parry','attack','botThink'] as const)a[k]=Math.max(0,a[k]-dt);p.moving=false;p.action='idle';const i=sanitizeInput(p.bot?evolutionBot(m,p):inputs[p.id]??idleInput())??idleInput();p.aim=i.aim;p.quiet=i.quiet;
  if(p.escaped)continue;
  if(p.vent>0){p.vent=Math.max(0,p.vent-dt);p.action='vent';if(!p.vent&&p.ventTo){Object.assign(p,p.ventTo);p.ventTo=null;p.ventCooldown=6;}continue;}p.ventCooldown=Math.max(0,p.ventCooldown-dt);
  if(a.echo){p.action='echo';if(a.returnMath&&!a.echoSupport){returnStep(m,p,i,dt);continue;}advance(m,p,{x:p.x+i.x*100,y:p.y+i.y*100},190,dt,true);p.moving=Math.hypot(i.x,i.y)>.1;if(i.interact&&a.returns===0&&(e.returnsOpen||!!a.returnMath)){a.echoChoice=false;a.echoSupport=false;a.returnMath??={correct:0,misses:0,tier:0,feedback:'Five correct answers earn your second life. Progress stays after a mistake.',wait:0};p.check=null;continue;}if(i.gadget&&a.echoCooldown<=0){const friend=m.players.find(v=>v.role==='runner'&&active(v)&&distance(v,p)<160);if(friend){friend.shield=2;a.echoCooldown=18;fx(m,'rescue',friend);}}continue;}
  if(p.captured){eliminate(m,p);continue;}
  if(a.grabbedBy){p.action='grabbed';const h=m.players.find(v=>v.id===a.grabbedBy);if(!h?.evo?.grab){a.grabbedBy=null;continue;}p.x=h.x+Math.cos(h.aim)*42;p.y=h.y-22+Math.sin(h.aim)*24;if(i.interact)a.struggle+=dt;if(a.struggle>=1.5)ungrab(m,h);continue;}
  if(a.grab){a.grabTime-=dt;if(a.grabTime<=0){const v=m.players.find(v=>v.id===a.grab);ungrab(m,p);if(v){v.immune=0;hurt(m,v,30,p);}}}
  if(a.grabTime<0){a.grabTime=Math.min(0,a.grabTime+dt);if(a.grabTime===0){const v=m.players.find(v=>v.role==='runner'&&active(v)&&!v.evo!.grabImmune&&distance(p,v)<90+(has(p,'reach')?16:0)&&Math.cos(Math.atan2(v.y-p.y,v.x-p.x)-a.attackAim)>.5&&lineClear(playArena(m),p,v));if(v){a.grab=v.id;a.grabTime=2;v.evo!.grabbedBy=p.id;v.evo!.struggle=0;v.charging=-1;v.check=null;}else p.stun=.5;}}
  if(p.stun>0){p.action='stunned';if(p.carrying)p.carrying=null;if(a.grab)ungrab(m,p);continue;}if(p.role==='hunter'&&m.duration-m.time<5){p.action='waiting';continue;}
  if(a.dig>0){a.dig=Math.max(0,a.dig-dt);p.action='digging';if(!a.dig)a.underground=5+(has(p,'deep')?2:0);continue;}
  if(a.underground>0){a.underground=Math.max(0,a.underground-dt);advance(m,p,{x:p.x+i.x*100,y:p.y+i.y*100},235,dt,true);p.action='burrow';if(m.tick%12===0)fx(m,'hit',p,.5);if(!a.underground){Object.assign(p,freePoint(playArena(m),p));a.emerge=.8;fx(m,'pulse',p,.8);}continue;}
  if(a.emerge>0){a.emerge=Math.max(0,a.emerge-dt);p.action='emerging';if(!a.emerge){strike(m,p,115,30,true);if(has(p,'deep'))p.shield=2;if(has(p,'cataclysm'))nova(m,p);}continue;}
  if(a.charge>0){a.charge=Math.max(0,a.charge-dt);if(a.mutation==='breaker')dash(m,p,dt);else if(!a.charge){shoot(m,p,true);if(has(p,'nova'))nova(m,p);}continue;}
  if(p.locker>=0){p.action='hiding';if(Math.hypot(i.x,i.y)>.1||i.fire){p.locker=-1;p.hidden=false;}else continue;}
  const speed=(p.role==='hunter'?178:157)*(p.role==='hunter'&&p.bot?(m.difficulty==='gentle'?.9:m.difficulty==='tricky'?1.03:1):1)*(has(p,p.role==='hunter'?'haste':'haste-r')?1.06:1)*(i.quiet?(has(p,'quiet')?.8:.57):1)*((p.carrying||a.grab)?.7:e.run?.sites.some(s=>s.nodes.some(n=>n.carrier===p.id))?.85:1);const before={x:p.x,y:p.y};advance(m,p,{x:p.x+i.x*100,y:p.y+i.y*100},speed,dt);p.moving=distance(p,before)>.01;p.action=p.moving?'run':'idle';if(p.moving&&!i.quiet)p.noise=.25;
  p.reload+=dt*(has(p,p.role==='hunter'?'battery':'battery-r')?1.25:1);if(p.reload>=2){p.ammo=Math.min(3,p.ammo+1);p.reload=0;}
  if(i.fire&&p.cooldown<=0&&!p.carrying&&!a.grab){a.stealth=0;const melee=['burrower','grappler','breaker','duelist'].includes(a.mutation);if(melee||p.ammo>0){p.cooldown=(melee?(has(p,'cleave')?1.1:.85):.65)*(has(p,p.role==='hunter'?'recovery':'recovery-r')?.85:1);if(melee)strike(m,p,(p.role==='hunter'?95:80)+(has(p,'reach')?16:0),(p.role==='hunter'?35:30)+(has(p,'keen')?6:0));else{p.ammo--;shoot(m,p);}if(melee&&has(p,'wave-r'))shoot(m,p,false,p.aim,true);}}
  if(!p.carrying&&!a.grab)ability(m,p,i);interact(m,p,i,dt);
  p.hidden=p.role==='runner'&&p.noise<=0&&(a.stealth>0||(!p.moving||p.quiet)&&arenaOf(m).bushes.some(r=>inside(p,r))||m.effects.some(f=>f.kind==='smoke'&&distance(p,f)<90));
 }
 for(const h of m.players)if(h.carrying){const v=m.players.find(v=>v.id===h.carrying);if(v){v.x=h.x+Math.cos(h.aim)*35;v.y=h.y-18;v.action='carried';}else h.carrying=null;}
 for(const part of e.core.parts)if(part.carrier){const p=m.players.find(p=>p.id===part.carrier);if(p){part.x=p.x;part.y=p.y;}}
 projectiles(m,dt);
 for(const d of e.drones){d.life-=dt;d.cooldown-=dt;d.think-=dt;const owner=m.players.find(p=>p.id===d.owner);if(!owner){d.life=0;continue;}if(d.think<=0){const seen=m.players.filter(p=>active(p)&&!p.evo!.underground&&(d.kind==='medic'?p.role===d.role&&p.evo!.hp<maxHp(p):p.role!==d.role&&visible(m,{...owner,x:d.x,y:d.y},p))).sort((a,b)=>distance(d,a)-distance(d,b));const v=seen[0];d.target=v?waypoint(m,d,v):{x:owner.x,y:owner.y};d.think=.5;if(v&&distance(d,v)<(d.kind==='scout'||d.kind==='bite'&&has(owner,'queen')?200:55)&&d.cooldown<=0){d.cooldown=d.kind==='bite'?1.4:3;if(d.kind==='bite'){if(has(owner,'queen')){d.cooldown=3;const old={x:owner.x,y:owner.y};Object.assign(owner,{x:d.x,y:d.y});shoot(m,owner,false,Math.atan2(v.y-d.y,v.x-d.x),true);m.bullets[m.bullets.length-1].damage=10;Object.assign(owner,old);}else hurt(m,v,12,owner);}else if(d.kind==='medic'){v.evo!.hp=Math.min(maxHp(v),v.evo!.hp+8);v.hp=v.evo!.hp;}else{v.noise=1.5;fx(m,'ping',{x:Math.round(v.x/100)*100,y:Math.round(v.y/100)*100},1);}}}if(d.target){d.aim=Math.atan2(d.target.y-d.y,d.target.x-d.x);advance(m,d,d.target,135,dt);}}
 e.drones=e.drones.filter(d=>d.hp>0&&d.life>0);
 if(runComplete(m)){if(m.gate.state==='closed'){m.gate={state:'opening',left:12};m.message='Rift route complete! Both extraction gates are powering up!';}else if(m.gate.state==='opening'){m.gate.left-=dt;if(m.gate.left<=0){m.gate={state:'open',left:0};m.message='Both exits are open! Get three runners out—or defeat the core.';}}}
 const core=e.core;if(core.plateUsers.every(Boolean)&&core.plateUsers[0]!==core.plateUsers[1])core.plates=core.plates.map(n=>Math.min(12,n+dt*5/6));const s=core.stations[core.activeStation];if(core.installed===3&&core.exposed<=0&&core.cooldown<=0&&core.plates.every(n=>n>=2)&&distance(hunter,s)<240&&!hunter.evo!.underground){core.exposed=8;hunter.evo!.dig=0;hunter.evo!.charge=0;core.cooldown=35;core.windowDamage=0;core.plates=[0,0];core.activeStation=1-core.activeStation;m.message='CORE EXPOSED! Attack the monster together!';fx(m,'pulse',hunter,2);}else if(core.cooldown>0)core.plates=[0,0];
 const runners=m.players.filter(p=>p.role==='runner'),escaped=runners.filter(p=>p.escaped).length;
 if(core.hp<=0){m.phase='finished';m.winner='runners';e.reason='core';m.message='The team defeated the monster! Immediate runner victory.';}
 else if(escaped>=3){m.phase='finished';m.winner='runners';e.reason='escape';m.message='Three runners escaped. Team victory!';}
 else {const alive=runners.some(p=>active(p));if(alive)e.lastChance=-1;else{if(e.lastChance<0)e.lastChance=120;e.lastChance-=dt;}if(m.time<=0||e.lastChance===0||e.lastChance<0&&!alive||!alive&&!runners.some(p=>!p.escaped&&(p.evo!.returns===0&&(e.returnsOpen||!!p.evo!.returnMath)))){m.phase='finished';m.winner='hunter';e.reason=m.time<=0?'timeout':'wipe';m.message='The monster held the arena. New mutations await next round.';}}
}
