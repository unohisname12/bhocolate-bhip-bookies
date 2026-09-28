import type {Mutation} from './types';
import type {Player,Role} from '../model';
export const PACKAGES:Record<Mutation,{name:string;role:Role;color:string;primary:string;skill:string;secondary:string;description:string}>={
 burrower:{name:'Burrower',role:'hunter',color:'#e8b56b',primary:'Claw swipe',skill:'Burrow / emerge',secondary:'Seismic slam',description:'Slip beneath weak barriers. Erupt with a warning ring. Quiet runners leave fewer clues.'},
 grappler:{name:'Grappler',role:'hunter',color:'#ed8c91',primary:'Claw swipe',skill:'Grab & lift',secondary:'Seismic slam',description:'Catch one runner in your claws. Friends can break your grip; a miss leaves you exposed.'},
 broodkeeper:{name:'Broodkeeper',role:'hunter',color:'#bda5f5',primary:'Spore blaster',skill:'Send bite drone',secondary:'Send scout drone',description:'Command a small swarm. Deploy drones to pressure objectives and eliminate isolated runners.'},
 blaster:{name:'Blaster',role:'hunter',color:'#fbac68',primary:'Spore blaster',skill:'Charged bolt',secondary:'Carapace shield',description:'Aim through cover gaps. A charged bolt hits hard but announces your position.'},
 breaker:{name:'Breaker',role:'hunter',color:'#f2c46d',primary:'Claw swipe',skill:'Breach rush',secondary:'Seismic slam',description:'Break weak walls and crates. Powerful close up, vulnerable after a missed rush.'},
 scout:{name:'Scout',role:'runner',color:'#8edab4',primary:'Spark pistol',skill:'Camouflage',secondary:'Noise decoy',description:'Move quietly, hide, scout and bait the monster into the core trap.'},
 medic:{name:'Warden',role:'runner',color:'#8cdbe8',primary:'Spark pistol',skill:'Team barrier',secondary:'Healing wave',description:'Protect living teammates with shields and healing waves. Defeated pets must earn their own return.'},
 engineer:{name:'Engineer',role:'runner',color:'#f1d898',primary:'Spark pistol',skill:'EMP pulse',secondary:'Medic drone',description:'Counter enemy drones and support your team with a small healing companion.'},
 duelist:{name:'Skirmisher',role:'runner',color:'#eab6e3',primary:'Melee baton',skill:'Parry shield',secondary:'Quick dash',description:'Fight close, time your shield and strike the monster’s exposed core.'},
};
export interface Power {id:string;name:string;role:Role;description:string;tag:string;icon:string;requires?:string[];mutations?:Mutation[]}
export const POWERS:Power[]=[
 {id:'fan',name:'Spore fan',role:'hunter',tag:'Volley',icon:'⋔',description:'Fire three spread shots. Each spore deals less damage; spread pressure across a group.',mutations:['broodkeeper','blaster']},
 {id:'pierce',name:'Rail spores',role:'hunter',tag:'Volley',icon:'↠',description:'Shots pierce one target. Line up runners or drones for a double hit.',mutations:['broodkeeper','blaster']},
 {id:'nova',name:'Spore supernova',role:'hunter',tag:'Evolution',icon:'✺',description:'Charged attacks erupt into an eight-shot nova. Requires Spore fan + Rail spores.',requires:['fan','pierce'],mutations:['blaster']},
 {id:'cleave',name:'Cyclone claws',role:'hunter',tag:'Melee',icon:'◉',description:'Primary swipes become a complete circle. Slower recovery keeps openings for runners.',mutations:['burrower','grappler','breaker']},
 {id:'quake',name:'Fault line',role:'hunter',tag:'Melee',icon:'ϟ',description:'Slams reach farther and launch a forward seismic projectile.',mutations:['burrower','grappler','breaker']},
 {id:'cataclysm',name:'Cataclysm',role:'hunter',tag:'Evolution',icon:'✹',description:'Your eruption or slam releases a ring of seismic shots. Requires Cyclone claws + Fault line.',requires:['cleave','quake'],mutations:['burrower','grappler','breaker']},
 {id:'command',name:'Twin brood',role:'hunter',tag:'Drones',icon:'♧',description:'Each bite-drone cast sends twins. Maintain up to four drones; each has 25 vitality.',mutations:['broodkeeper']},
 {id:'hive',name:'Brood engines',role:'hunter',tag:'Drones',icon:'⌘',description:'Using your secondary skill also launches a bite drone.'},
 {id:'queen',name:'Hive monarch',role:'hunter',tag:'Evolution',icon:'♛',description:'Bite drones fire spores at nearby prey, on a three-second cadence. Requires Twin brood + Brood engines.',requires:['command','hive'],mutations:['broodkeeper']},
 {id:'demolish',name:'Rubble feast',role:'hunter',tag:'Environment',icon:'◆',description:'Double cover damage. Breaking cover restores 8 guard.'},
 {id:'shell',name:'Reactive carapace',role:'hunter',tag:'Defense',icon:'⬡',description:'Guard breaks release smoke and grant a two-second shield.'},
 {id:'deep',name:'Tunnel stalker',role:'hunter',tag:'Movement',icon:'≋',description:'Burrow lasts two seconds longer. Emerging grants a two-second shield; other skills recharge faster.'},
 {id:'reach',name:'Hooked claws',role:'hunter',tag:'Melee',icon:'⌁',description:'Extended melee and grab reach. Breaking cover recharges your signature by one second.'},
 {id:'fan-r',name:'Prism scatter',role:'runner',tag:'Volley',icon:'⋔',description:'Your pistol fires three lighter shots in a fan. Cover a wider area at the cost of single-hit damage.',mutations:['scout','medic','engineer']},
 {id:'bounce-r',name:'Bank shot',role:'runner',tag:'Volley',icon:'↱',description:'Pistol shots bounce once off cover. Shoot around an obstacle.',mutations:['scout','medic','engineer']},
 {id:'prism',name:'Prism storm',role:'runner',tag:'Evolution',icon:'✺',description:'Your secondary skill fires an eight-shot ring. Requires Prism scatter + Bank shot.',requires:['fan-r','bounce-r'],mutations:['scout','medic','engineer']},
 {id:'cleave-r',name:'Orbit blade',role:'runner',tag:'Melee',icon:'◉',description:'Baton attacks sweep all around you and smash nearby hostile drones.',mutations:['duelist']},
 {id:'wave-r',name:'Arc blade',role:'runner',tag:'Melee',icon:'ϟ',description:'Every baton swing also fires a short arc projectile.',mutations:['duelist']},
 {id:'tempest',name:'Blade tempest',role:'runner',tag:'Evolution',icon:'✹',description:'Your dash releases a ring of arc projectiles. Requires Orbit blade + Arc blade.',requires:['cleave-r','wave-r'],mutations:['duelist']},
 {id:'veil',name:'Ghost trail',role:'runner',tag:'Stealth',icon:'◌',description:'Signature skills leave a smoke cloud. Camouflage lasts two seconds longer.'},
 {id:'guardian',name:'Barrier pulse',role:'runner',tag:'Support',icon:'⬡',description:'Your secondary skill gives nearby living allies a two-second shield.'},
 {id:'hive-r',name:'Pocket companion',role:'runner',tag:'Drones',icon:'♧',description:'Your secondary skill also deploys a healing drone. One companion at a time.'},
 {id:'vital',name:'Second wind',role:'runner',tag:'Defense',icon:'♥',description:'Gain 20 maximum vitality and heal 20 immediately.'},
 {id:'focus',name:'Core hunter',role:'runner',tag:'Team attack',icon:'◇',description:'Deal 15% more damage during exposure. Your hit also restores 2 vitality.'},
 {id:'scavenge',name:'Field crafter',role:'runner',tag:'Loot',icon:'▣',description:'Search supplies faster. Opening a cache also restores 15 vitality.'},
];
export const MILESTONES=[0,45,100,175,270,380];
export const power=(id:string)=>POWERS.find(p=>p.id===id);
export const eligiblePowers=(p:Player)=>POWERS.filter(v=>v.role===p.role&&!p.evo!.powers.includes(v.id)&&(!v.mutations||v.mutations.includes(p.evo!.mutation))&&(!v.requires||v.requires.every(id=>p.evo!.powers.includes(id))));
