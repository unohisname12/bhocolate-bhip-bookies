import {it,expect} from 'vitest';
import {road,startRun,reduceArcade,freshArcade} from './model';
import {arcadeStars,cafeTarget} from './catalog';
import {createInitialEngineState} from '../../engine/state/createInitialEngineState';
it('challenge barriers always leave an accessible star lane',()=>{for(let seed=0;seed<100;seed++)for(let step=0;step<60;step++){const r=road(seed,step,3);expect(r.coin).not.toBe(r.rock);expect(r.coin).not.toBe(r.secondRock);expect(r.secondRock>=0).toBe(step%4===3);}});
it('challenge cafe has a finite restock budget and standard has a longer shift',()=>{let s=createInitialEngineState();s.screen='arcade';s.arcade={...freshArcade(),run:startRun('cafe',3,12)};for(let n=0;n<4;n++)s=reduceArcade(s,{type:'ARCADE_RESTOCK',ingredient:0})!;expect(s.arcade!.run!.energy).toBe(0);const before=s.arcade!.run!.stock[0];s=reduceArcade(s,{type:'ARCADE_RESTOCK',ingredient:0})!;expect(s.arcade!.run!.stock[0]).toBe(before);expect(cafeTarget(1)).toBe(9);expect(cafeTarget(2)).toBe(12);});
it('reward previews match boundaries, including early finish and caps',()=>{expect(arcadeStars('dash',0)).toBe(0);expect(arcadeStars('dash',59)).toBe(1);expect(arcadeStars('dash',60)).toBe(2);expect(arcadeStars('cafe',20)).toBe(2);expect(arcadeStars('guard',999)).toBe(8);});
