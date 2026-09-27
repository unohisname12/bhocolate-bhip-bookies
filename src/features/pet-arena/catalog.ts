export type Branch = 'guardian'|'striker'|'tactician';
export type Slot = 'charm'|'badge'|'tool';
export const BRANCHES:Branch[]=['guardian','striker','tactician'];
export const MILESTONES=[2,3,5,8,12,16];
export const pointsAt=(level:number)=>MILESTONES.filter(n=>n<=level).length;
export const slotsAt=(level:number)=>level>=16?3:level>=12?2:1;
export const TALENTS:Record<Branch,{name:string;nodes:{name:string;text:string}[]}>= {
 guardian:{name:'Guardian',nodes:[{name:'Bubble Guard',text:'Guard adds 6 shield.'},{name:'Steady Heart',text:'Blocking a hit restores 5 energy.'},{name:'Shake It Off',text:'Guard removes Weaken.'},{name:'Counter Ready',text:'After blocking a direct attack, your next Strike deals 50% more damage.'}]},
 striker:{name:'Striker',nodes:[{name:'Rhythm',text:'Alternating Strike and Signature builds Combo: +5% damage per stack, up to 3.'},{name:'Quick Recovery',text:'A Strike with Combo restores 3 extra energy.'},{name:'Breakthrough',text:'At 3 Combo, Signature gains 30% damage, bypasses Guard and spends Combo.'},{name:'Victory Step',text:'A Breakthrough Signature adds 10 shield.'}]},
 tactician:{name:'Tactician',nodes:[{name:'Quiet Bubble',text:'Focus adds 8 shield.'},{name:'Efficient Spark',text:'The next Signature after Focus costs 5 less energy and deals 30% more damage.'},{name:'Soft Spot',text:'A focused Signature Weakens the next enemy attack by 25%.'},{name:'Master Plan',text:'Every third focused Signature deals 40% more damage.'}]},
};
export interface Gear {id:string;name:string;slot:Slot;price:number;icon:string;text:string}
export const GEAR:Gear[]=[
 {id:'mirror',name:'Mirror Charm',slot:'charm',price:10,icon:'◈',text:'A counter-ready Strike adds 6 shield.'},
 {id:'spark',name:'Spark Charm',slot:'charm',price:10,icon:'ϟ',text:'The first Signature with Combo restores 8 energy.'},
 {id:'lens',name:'Focus Lens',slot:'charm',price:10,icon:'◎',text:'Focus adds 5 shield.'},
 {id:'heart',name:'Heart Charm',slot:'charm',price:20,icon:'♥',text:'Start each battle with 12 extra HP.'},
 {id:'comet',name:'Comet Charm',slot:'charm',price:20,icon:'✦',text:'Your first Strike deals 25% more damage.'},
 {id:'moon',name:'Moon Charm',slot:'charm',price:30,icon:'☾',text:'Once per battle, a Signature below half HP heals 10 HP.'},
 {id:'thorn',name:'Thorn Badge',slot:'badge',price:20,icon:'✹',text:'Blocking a direct attack returns 3 damage. Cannot trigger another counter.'},
 {id:'rhythm',name:'Rhythm Badge',slot:'badge',price:20,icon:'♫',text:'The first time Combo reaches 3, gain 10 shield.'},
 {id:'battery',name:'Battery Badge',slot:'badge',price:20,icon:'▰',text:'Once per battle, falling below 10 energy restores 10.'},
 {id:'shell',name:'Shell Badge',slot:'badge',price:20,icon:'⬡',text:'Start with 10 shield.'},
 {id:'spring',name:'Spring Badge',slot:'badge',price:30,icon:'❀',text:'Once per battle, Guard below half HP heals 8 HP.'},
 {id:'star',name:'Star Badge',slot:'badge',price:30,icon:'★',text:'Every third Strike adds 5 shield.'},
 {id:'snack',name:'Healing Snack',slot:'tool',price:0,icon:'●',text:'Restore 25% maximum battle HP. One use per battle; spends your turn.'},
 {id:'bubble',name:'Bubble Bottle',slot:'tool',price:10,icon:'◌',text:'Add 28 shield. One use per battle; spends your turn.'},
 {id:'berry',name:'Energy Berry',slot:'tool',price:10,icon:'◆',text:'Restore 25 energy. One use per battle; spends your turn.'},
 {id:'leaf',name:'Cleansing Leaf',slot:'tool',price:10,icon:'❧',text:'Remove Weaken and gain 18 shield. One use per battle; spends your turn.'},
];
export const gear=(id:string|null|undefined)=>GEAR.find(g=>g.id===id);
export type Style='attacker'|'defender'|'healer'|'combo'|'disruptor';
export interface Encounter{id:number;name:string;area:number;level:number;style:Style;species:string;boss:boolean;hint:string}
const names=['Bramble Scout','Moss Sentry','Dew Mender','Briar Dancer','The Old Oak','Copper Scout','Clockwork Keeper','Steam Medic','Coil Trickster','The Brass Warden','Moon Prowler','Crystal Guard','Star Tender','Eclipse Dancer','The Night Crown'];
const styles:Style[]=['attacker','defender','healer','combo','disruptor'];
export const AREAS=[{name:'Bramblewood',text:'Learn to read attacks and choose your opening.',color:'#34674e'},{name:'Clockwork Hollow',text:'Break shields and manage your energy.',color:'#7e573b'},{name:'Moonlit Summit',text:'Master your build against changing boss phases.',color:'#555184'}];
export const ENCOUNTERS:Encounter[]=names.map((name,id)=>({id,name,area:Math.floor(id/5),level:1+Math.floor(id*1.1),style:styles[id%5],species:['slime_baby','mech_bot','koala_sprite','subtrak','mech_bot'][id%5],boss:id%5===4,hint:['Guard the announced heavy attack.','Focus while it guards, then strike.','Save a Signature to outpace healing.','Watch the combo wind-up.','Cleanse Weaken or wait before your burst.'][id%5]}));
export const PERKS=[{id:'vigor',name:'Vigor',text:'+12 maximum HP for this expedition.'},{id:'edge',name:'Keen Edge',text:'+2 attack for this expedition.'},{id:'reserve',name:'Reserve',text:'+8 starting energy for this expedition.'}] as const;
export type Perk=typeof PERKS[number]['id'];
export const ACTIONS=['strike','guard','focus','signature','item'] as const;
export type Move=typeof ACTIONS[number];
export const PRESETS:Record<Branch,{charm:string;badge:string;tool:string;secondary:Branch}>={guardian:{charm:'mirror',badge:'thorn',tool:'bubble',secondary:'tactician'},striker:{charm:'spark',badge:'rhythm',tool:'berry',secondary:'guardian'},tactician:{charm:'lens',badge:'battery',tool:'leaf',secondary:'guardian'}};
