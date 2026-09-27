import {it,expect} from 'vitest';
import {freshGame,validateGame,studentCheckpoint,packGame,parseStored} from './game-state';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {command,parseCommand} from '../src/features/pet-arena/model';
function save(){const s=freshGame('p','Learner');s.pet=hatchEgg({id:'e',type:'koala',state:'ready',progress:100,createdAt:new Date().toISOString()})!;s.player.currencies.mp=100;s.pet.progression.level=16;return s;}
it('old saves still round trip without arena fields',()=>{const s=save();expect(parseStored(packGame(s)).pet!.id).toBe(s.pet!.id);});
it('valid battle snapshots survive strict schema and server round trip',()=>{const s=command(save(),{kind:'start',mode:'campaign',encounter:0});expect(validateGame(s)).toBe(s);expect(parseStored(packGame(s)).petArena!.fight!.id).toBe(s.petArena!.fight!.id);});
it('checkpoints cannot grant gear, alter active battle HP or erase battle progress',()=>{const s=command(save(),{kind:'init'}),next=command(s,{kind:'buy',id:'mirror'});expect(()=>studentCheckpoint(next,s,'p','Learner')).toThrow(/battle service/);const active=command(s,{kind:'start',mode:'campaign',encounter:0});const forged=structuredClone(active);forged.petArena!.fight!.fighters[1].hp=0;expect(()=>studentCheckpoint(forged,active,'p','Learner')).toThrow(/battle service/);expect(()=>studentCheckpoint({...s,petArena:undefined},s,'p','Learner')).toThrow();});
it('parser rejects client-authored state and invalid actions',()=>{for(const c of [null,{}, {kind:'win'}, {kind:'start',mode:'cheat',encounter:0},{kind:'move',move:'kill',round:1,fightId:'f'}])expect(()=>parseCommand(c)).toThrow();expect(parseCommand({kind:'move',move:'strike',round:1,fightId:'f',hp:0})).toEqual({kind:'move',move:'strike',round:1,fightId:'f'});});

it('third saved loadout round trips with empty earlier slots',()=>{let s=command(save(),{kind:'preset',branch:'guardian'});s=command(s,{kind:'saveBuild',slot:2});expect(parseStored(packGame(s)).petArena!.pets[s.pet!.id].presets[2]).toBeTruthy();});
