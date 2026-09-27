import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import MathStack from '../src/features/math-stack/MathStack';
import {DisplaySize} from '../src/components/ui/DisplaySize';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import type {EngineState} from '../src/types/engine';
import '../src/index.css';
function Fixture(){const[state,setState]=useState<EngineState>(()=>{const saved=localStorage.getItem('stack-fixture');if(saved)return JSON.parse(saved);const s=createInitialEngineState();s.pet=hatchEgg({id:'fixture',type:'koala',progress:100,state:'ready',createdAt:new Date().toISOString()})!;s.pet.name='Captain Waffles';s.screen='math_stack';return s;});return <><DisplaySize/><MathStack state={state} dispatch={a=>setState(s=>{const n=engineReducer(s,a);localStorage.setItem('stack-fixture',JSON.stringify(n));return n;})}/></>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
