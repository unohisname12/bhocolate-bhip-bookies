import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import MathPop from '../src/features/math-pop/MathPop';
import {DisplaySize} from '../src/components/ui/DisplaySize';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import type {EngineState} from '../src/types/engine';
import '../src/index.css';
function Fixture(){const[state,setState]=useState<EngineState>(()=>{const saved=localStorage.getItem('pop-fixture');if(saved)return JSON.parse(saved);const s=createInitialEngineState();s.pet=hatchEgg({id:'fixture',type:'koala',progress:100,state:'ready',createdAt:new Date().toISOString()})!;s.pet.name='Captain Waffles';s.screen='math_pop';return s;});return <><DisplaySize/><MathPop state={state} dispatch={a=>setState(s=>{const n=engineReducer(s,a);localStorage.setItem('pop-fixture',JSON.stringify(n));return n;})}/></>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
