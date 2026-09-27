import React,{useState} from 'react';
import{createRoot}from'react-dom/client';
import{Arena}from'../src/features/pet-arena/Arena';
import{DisplaySize}from'../src/components/ui/DisplaySize';
import{createInitialEngineState}from'../src/engine/state/createInitialEngineState';
import{hatchEgg}from'../src/services/game/evolutionEngine';
import{engineReducer}from'../src/engine/state/engineReducer';
import{command}from'../src/features/pet-arena/model';
import{GEAR}from'../src/features/pet-arena/catalog';
import '../src/index.css';
function Fixture(){const[state,setState]=useState(()=>{const saved=localStorage.getItem('arena-fixture');if(saved)return JSON.parse(saved);let s=createInitialEngineState();s.pet=hatchEgg({id:'fixture',type:'koala',progress:100,state:'ready',createdAt:new Date().toISOString()})!;s.pet.id='guide1';s.pet.name='Captain Waffles';s.pet.progression.level=16;s.player.currencies.mp=500;s.screen='pet_arena';s=command(s,{kind:'init'});for(const item of GEAR.filter(g=>g.price))s=command(s,{kind:'buy',id:item.id});return s;});return <><DisplaySize/><Arena state={state} dispatch={a=>setState((s:typeof state)=>{const n=engineReducer(s,a);localStorage.setItem('arena-fixture',JSON.stringify(n));return n;})}/></>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
