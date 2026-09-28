import {arenaOf,type Match,type Player,type Role} from '../model';
import {expandedArena,freePoint,stationPoint} from './world';
import {MILESTONES,PACKAGES,eligiblePowers} from './catalog';
import type {EvoActor,Mutation} from './types';
export const has=(p:Player,id:string)=>!!p.evo?.powers.includes(id);
export const maxHp=(p:Player)=>has(p,'vital')?120:100;
export function random(m:Match){const e=m.evolution!;let x=e.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;e.rng=x>>>0;return (e.rng>>>0)/4294967296;}
export function shuffled<T>(m:Match,list:T[]):T[]{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(m)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function initEvolution(m:Match){
 if(m.evolution)return;
 const a=expandedArena(arenaOf(m)),point=(v:{x:number;y:number})=>freePoint(a,v);
 m.evolution={version:1,width:2800,height:1800,revision:0,terrain:(a.pieces??a.walls).map((p,id)=>({id,hp:'kind'in p&&['pond','fountain','flowerbed'].includes(String(p.kind))?0:('kind'in p&&String(p.kind).startsWith('wall')?160:80),max:('kind'in p&&String(p.kind).startsWith('wall')?160:80)})).filter(t=>t.hp>0),loot:[],drones:[],core:{hp:360,parts:a.beacons.slice(0,3).map(p=>({...point({x:p.x+80,y:p.y+55}),carrier:null,installed:false})),stations:[stationPoint(a,{x:1400,y:800}),stationPoint(a,{x:2150,y:1250})],installed:0,exposed:0,cooldown:0,plates:[0,0],plateUsers:['',''],activeStation:0,windowDamage:0},exits:[a.portal,point({x:2500,y:100})],exitProgress:[0,0],echoStations:a.beacons.slice(3,6).map(point),xp:{hunter:0,runner:0},paid:{},rng:((m.seed??7391)^0x9e3779b9)>>>0||1,surge:{next:70,at:point({x:1400,y:1300}),left:0,owner:null,work:0,working:null},lastChance:-1,reason:null,returnsOpen:true};
 m.evolution.loot=[...a.beacons.map((b,i)=>({...point({x:b.x-70,y:b.y+55}),id:i,opened:false,progress:0,kind:'crate' as const})),...(a.lockers??[]).map((p,i)=>({...p,id:i+7,opened:false,progress:0,kind:'locker' as const}))];
 m.beacons=a.beacons.map(b=>({...b,progress:0}));m.doorOpen=true;m.key=null;
 m.duration=540;m.time=540;m.message='RIFT HUNT · Draft your build. Complete four rifts, extract together—or defeat the monster.';
}
export function initActor(m:Match,p:Player){
 if(p.evo)return;const options=shuffled(m,(Object.keys(PACKAGES) as Mutation[]).filter(k=>PACKAGES[k].role===p.role)).slice(0,3);
 const a=arenaOf(m);p.x*=1.25;p.y*=1.25;Object.assign(p,freePoint(a,p));p.hp=100;
 p.evo={mutation:options[0],starting:options,powers:[],offers:[],draft:0,hp:100,guard:100,secondary:0,itemCooldown:0,items:p.role==='runner'?['medkit','emp']:[],underground:0,emerge:0,dig:0,safe:{x:p.x,y:p.y},grabbedBy:null,grab:null,grabTime:0,struggle:0,struggleEdge:false,grabImmune:0,echo:false,returns:0,sparks:0,echoStation:-1,echoWork:0,echoCooldown:0,stealth:0,parry:0,attack:0,attackAim:0,charge:0,lastPrimary:false,lastSecondary:false,lastItem:false,work:'',workTime:0,component:-1,lastAward:{},botThink:0,botTarget:null};
}
export function award(m:Match,role:Role,amount:number,key:string){const e=m.evolution!;if(e.paid[key])return;e.paid[key]=true;const other=role==='hunter'?'runner':'hunter';const catchup=e.xp[other]-e.xp[role]>=60?1.25:1;e.xp[role]+=Math.round(amount*catchup);}
export function drafts(m:Match){for(const p of m.players){const a=p.evo!;if(a.starting.length&&(p.bot||m.duration-m.time>12))a.starting=[];if(!a.starting.length&&!a.offers.length&&a.draft<MILESTONES.length&&m.evolution!.xp[p.role]>=MILESTONES[a.draft]){const pool=eligiblePowers(p),evolved=shuffled(m,pool.filter(v=>v.requires?.length)),base=shuffled(m,pool.filter(v=>!v.requires?.length));a.offers=[...evolved.slice(0,1),...base,...evolved.slice(1)].slice(0,3).map(v=>v.id);}if(p.bot&&a.offers.length)chooseEvolution(m,p.id,a.offers[0]);}}
export function chooseEvolution(m:Match,id:string,choice:string):boolean {
 if(!m.evolution||m.phase!=='playing'||m.paused)return false;const p=m.players.find(p=>p.id===id),a=p?.evo;if(!p||!a)return false;
 if(a.echo&&choice==='echo-support'){a.echoChoice=false;a.echoSupport=true;p.check=null;return true;}
 if(a.echo&&choice==='echo-return'&&a.returns===0&&(m.evolution.returnsOpen||!!a.returnMath)){a.echoChoice=false;a.echoSupport=false;a.returnMath??={correct:0,misses:0,tier:0,feedback:'Five correct answers earn your return. Mistakes keep progress.',wait:0};return true;}
 if(a.starting.includes(choice as Mutation)&&m.duration-m.time<=12){a.mutation=choice as Mutation;a.starting=[];return true;}
 if(!a.offers.includes(choice))return false;a.powers.push(choice);a.offers=[];a.draft++;if(choice==='vital'){a.hp=Math.min(maxHp(p),a.hp+20);p.hp=a.hp;}return true;
}
export function sanitizeActor(a:EvoActor,own:boolean):EvoActor{return {...a,returnMath:own?a.returnMath:undefined,starting:own?a.starting:[],offers:own?a.offers:[],items:own?a.items:[],lastAward:{},botTarget:null,safe:own?a.safe:{x:0,y:0}};}
