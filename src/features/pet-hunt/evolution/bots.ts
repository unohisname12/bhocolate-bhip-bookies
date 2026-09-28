import {distance,idleInput,visible,waypoint,type Match,type Player,type Vec} from '../model';
import {active} from './combat';
import {has} from './state';
import {riftTarget} from './run';
export function evolutionBot(m:Match,p:Player){const i=idleInput(),a=p.evo!,e=m.evolution!,h=m.players.find(v=>v.role==='hunter')!;
 if(p.check){if(p.check.total-p.check.left>1.8){i.answer=p.check.answer;i.answerFor=p.check.id;}return i;}
 if(a.grabbedBy){i.interact=true;return i;}
 const nearest=<T extends Vec>(list:T[])=>[...list].sort((x,y)=>distance(p,x)-distance(p,y))[0];let target:Vec|undefined;
 if(a.echo){i.interact=a.returns===0;if(a.returns){target=nearest(m.players.filter(v=>v.role==='runner'&&active(v)));i.gadget=!!target&&distance(p,target)<150;}}
 else if(p.escaped)return i;
 else if(p.role==='hunter'){
  const prey=nearest(m.players.filter(v=>v.role==='runner'&&active(v)&&visible(m,p,v)));
  if(prey){target=prey;i.aim=Math.atan2(prey.y-p.y,prey.x-p.x);i.fire=distance(p,prey)<(['blaster','broodkeeper'].includes(a.mutation)?380:95);i.gadget=distance(p,prey)<(a.mutation==='grappler'?90:420);i.trap=distance(p,prey)<170;}
  else {const noise=m.players.find(v=>active(v)&&v.role==='runner'&&v.noise>0&&distance(p,v)<(has(p,'scent')?650:380));const working=nearest(e.run?.sites.filter(s=>!s.done&&s.work>0&&!e.paid[`disrupt:${s.id}`])??[]);target=noise?{x:Math.round(noise.x/120)*120,y:Math.round(noise.y/120)*120}:working??m.beacons[Math.floor((m.duration-m.time)/12)%m.beacons.length];i.interact=!!working&&target===working&&distance(p,working)<70;}
 }else{
  const danger=visible(m,p,h)&&distance(p,h)<240;
  if(e.core.exposed>0&&visible(m,p,h)){target=h;i.fire=true;i.aim=Math.atan2(h.y-p.y,h.x-p.x);if(distance(p,h)<(a.mutation==='duelist'?65:240))target=p;}
  else if(danger){target={x:Math.max(40,Math.min(2760,p.x+(p.x-h.x)*2)),y:Math.max(40,Math.min(1760,p.y+(p.y-h.y)*2))};i.aim=Math.atan2(h.y-p.y,h.x-p.x);i.fire=true;i.gadget=true;i.trap=true;i.sensor=a.hp<45;}
  else if(m.gate.state==='open'){target=nearest(e.exits);i.interact=distance(p,target)<75;}
  else if(a.component>=0){target=e.core.stations[0];i.interact=distance(p,target)<80;}
  else if(e.core.installed===3&&e.core.cooldown<=0){const index=m.players.filter(v=>v.role==='runner').indexOf(p)%2;const s=e.core.stations[e.core.activeStation];target={x:s.x+(index?95:-95),y:s.y};i.interact=distance(p,target)<48;}
  else {const part=nearest(e.core.parts.filter(v=>!v.installed&&!v.carrier)),cargo=e.run?.sites.find(s=>s.nodes.some(n=>n.carrier===p.id));const busy=(s:Vec)=>m.players.filter(v=>v.id!==p.id&&v.role==='runner'&&active(v)&&distance(v,s)<150).length;const sites=e.run?.sites.filter(s=>!s.done)??[];const site=cargo??[...sites].sort((x,y)=>distance(p,riftTarget(x,p))+busy(x)*400-distance(p,riftTarget(y,p))-busy(y)*400)[0];target=cargo?cargo:part&&distance(p,part)<180?part:site?riftTarget(site,p):undefined;i.interact=!!target&&distance(p,target)<55;if(site&&target===site&&site.kind==='breach'&&site.hp>0){i.aim=Math.atan2(site.y-p.y,site.x-p.x);i.fire=distance(p,site)<(a.mutation==='duelist'?75:280);if(i.fire)target=p;}}
 }
 if(target&&!i.interact){if(a.botThink<=0||!a.botTarget){a.botTarget=a.echo?target:waypoint(m,p,target);a.botThink=.35;}const to=a.botTarget,n=Math.max(1,distance(p,to));i.x=(to.x-p.x)/n;i.y=(to.y-p.y)/n;if(!i.fire)i.aim=Math.atan2(i.y,i.x);}return i;
}
