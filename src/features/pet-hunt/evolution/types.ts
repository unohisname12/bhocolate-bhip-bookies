import type {Vec,Role} from '../model';
export type Mutation='burrower'|'grappler'|'broodkeeper'|'blaster'|'breaker'|'scout'|'medic'|'engineer'|'duelist';
export type Item='medkit'|'emp'|'smoke'|'flare';
export interface EvoActor {
 mutation:Mutation; starting:Mutation[]; powers:string[]; offers:string[]; draft:number; hp:number; guard:number;
 secondary:number; itemCooldown:number; items:Item[]; underground:number; emerge:number; dig:number; safe:Vec;
 grabbedBy:string|null; grab:string|null; grabTime:number; struggle:number; struggleEdge:boolean; grabImmune:number;
 echoChoice?:boolean; echoSupport?:boolean;
 returnMath?:{correct:number;misses:number;tier:number;feedback:string;wait:number}; echo:boolean; returns:number; sparks:number; echoStation:number; echoWork:number; echoCooldown:number;
 stealth:number; parry:number; attack:number; attackAim:number; charge:number; lastPrimary:boolean; lastSecondary:boolean; lastItem:boolean;
 work:string; workTime:number; component:number; lastAward:Record<string,number>; botThink:number; botTarget:Vec|null;
}
export interface Drone extends Vec {id:number;owner:string;role:Role;kind:'bite'|'scout'|'medic';hp:number;life:number;cooldown:number;aim:number;target:Vec|null;think:number}
export interface Loot extends Vec {id:number;opened:boolean;progress:number;kind:'crate'|'locker'}
export interface Terrain {id:number;hp:number;max:number}
export interface Core {hp:number;parts:(Vec&{carrier:string|null;installed:boolean})[];stations:Vec[];installed:number;exposed:number;cooldown:number;plates:number[];plateUsers:string[];activeStation:number;windowDamage:number}
export interface Evolution {
 version:1; run?:{sites:Rift[];needed:number}; width:number;height:number;revision:number;terrain:Terrain[];loot:Loot[];drones:Drone[];
 core:Core;exits:Vec[];exitProgress:number[];echoStations:Vec[];xp:{hunter:number;runner:number};
 paid:Record<string,boolean>;rng:number;surge:{next:number;at:Vec;left:number;owner:Role|null;work:number;working:Role|null};
 lastChance:number;reason:'escape'|'core'|'timeout'|'wipe'|null;returnsOpen:boolean;
}

export interface Rift extends Vec {id:number;kind:"breach"|"circuit"|"salvage";hp:number;work:number;done:boolean;nodes:(Vec&{done:boolean;work:number;carrier?:string|null})[];}
