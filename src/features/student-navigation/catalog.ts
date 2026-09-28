import type {Intent} from './model';
export interface ActivityCard extends Intent {id:string;description:string;icon:string;group:'Quick'|'Puzzles'|'Action'|'Adventures';needsPet?:boolean}
export const activities:ActivityCard[]=[
 {id:'math',label:'Math Practice',description:'Five questions. No timer. Help when you need it.',icon:'✦',group:'Quick',action:{type:'SET_SCREEN',screen:'math'}},
 {id:'catch',label:'Catch Math',description:'Choose an answer, throw, and make a catch.',icon:'◎',group:'Quick',action:{type:'SET_SCREEN',screen:'catch_math'}},
 {id:'stack',label:'Math Pop',description:'Connect numbers, pop chains, crack ice, and collect stars. K–Grade 9.',icon:'▥',group:'Puzzles',action:{type:'SET_SCREEN',screen:'math_pop'}},
 {id:'merge',label:'Number Merge',description:'Join nearby numbers. Easy mode has no timer.',icon:'▦',group:'Puzzles',action:{type:'SET_SCREEN',screen:'number_merge'}},
 {id:'dash',label:'Egg Dash',description:'Pick a lane, dodge obstacles, and collect stars.',icon:'➜',group:'Action',action:{type:'SET_SCREEN',screen:'arcade'},hash:'arcade-dash'},
 {id:'guard',label:'Shellguard',description:'Build defenses and plan how to spend your energy.',icon:'♜',group:'Action',action:{type:'SET_SCREEN',screen:'arcade'},hash:'arcade-guard'},
 {id:'cafe',label:'Nest Café',description:'Serve recipes and manage your supplies. No rush.',icon:'☕',group:'Puzzles',action:{type:'SET_SCREEN',screen:'arcade'},hash:'arcade-cafe'},
 {id:'momentum',label:'Momentum',description:'Move, recharge, and capture on a strategy board.',icon:'◇',group:'Puzzles',action:{type:'START_MOMENTUM'}},
 {id:'battle',label:'Pet battle',description:'Build your pet’s talents, earn gear through math, and conquer adventures.',icon:'⚔',group:'Action',needsPet:true,action:{type:'SET_SCREEN',screen:'pet_arena'}},
 {id:'dungeon',label:'Dungeon adventure',description:'Choose paths, battles, and rest stops.',icon:'⌘',group:'Adventures',needsPet:true,action:{type:'SET_SCREEN',screen:'run_start'}},
 {id:'delivery',label:'Delivery Districts',description:'Plan a route, run a crew, and make deals.',icon:'▱',group:'Adventures',action:{type:'SET_SCREEN',screen:'arcade'},hash:'delivery'},
 {id:'bridge',label:'Woodland Bridge',description:'Questions, supplies, and a bridge you help repair.',icon:'⌒',group:'Adventures',action:{type:'OPEN_WOODLAND'}},
 {id:'first',label:'First Adventure',description:'Earn a shelf, care for your pet, and finish a battle.',icon:'⚑',group:'Adventures',needsPet:true,action:{type:'SET_SCREEN',screen:'first_adventure'}},
];
